// ---------------------------------------------------------------------------
// features/boardgame/domain/skill-engine.ts — Nền tảng Skill Engine (Phase 1)
//
// Cung cấp hệ thống event/trigger có thứ tự xác định, ưu tiên (priority),
// RNG deterministic (Mulberry32), giới hạn once-per-match / cooldown,
// chống đệ quy vô hạn (maxDepth + loop signature), giao dịch nguyên tử
// (rollback khi lỗi) và idempotency theo eventKey.
//
// Ràng buộc Phase 1:
// - KHÔNG cài đặt 56 skill handlers mở rộng.
// - KHÔNG thay đổi thứ tự xử lý, kết quả hay RNG của 10 tướng Classic.
// ---------------------------------------------------------------------------

import type { ClassicBoardGameRoleId } from '../../../shared/contracts/boardgame';
import { nextDeterministicRandom } from './rules';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';

export const SKILL_TRIGGERS = [
  'ON_TURN_START',
  'ON_MOVE',
  'ON_DRAW_CARD',
  'BEFORE_ATTACK',
  'AFTER_ATTACK',
  'BEFORE_DAMAGE',
  'AFTER_DAMAGE',
  'ON_HEAL',
  'ON_ROLE_REVEAL',
  'ON_ELIMINATION',
  'ON_EQUIPMENT_CHANGE',
  'ON_INVESTIGATE',
  'ON_VICTORY_CHECK',
  'PASSIVE',
  'ACTIVE_SKILL',
  'REACTION_INTERRUPT',
] as const;

export type SkillTrigger = (typeof SKILL_TRIGGERS)[number];

export interface SkillDefinition {
  readonly skillId: string;
  readonly name: string;
  readonly description: string;
  readonly trigger: SkillTrigger | 'unknown';
  readonly usageLimit: string;
  readonly revealRequirement: string;
  readonly targetMode: string;
  readonly cooldownRounds: number;
  readonly oncePerMatch: boolean;
}

export interface DeterministicSkillRng {
  /** Trả về số nguyên trong đoạn [min, max] sử dụng state.rngState (Mulberry32). */
  nextInt(min: number, max: number): number;
  /** Trả về float trong [0, 1) sử dụng state.rngState (Mulberry32). */
  nextFloat(): number;
}

export interface SkillEngineEvent {
  readonly eventKey?: string;
  readonly trigger: SkillTrigger;
  readonly actorPlayerId: string;
  readonly targetPlayerId?: string | null;
  readonly nowMs: number;
  readonly payload?: Record<string, unknown>;
}

export interface SkillExecutionContext {
  readonly state: AuthoritativeGameState;
  readonly event: SkillEngineEvent;
  readonly owner: AuthoritativePlayerState;
  readonly rng: DeterministicSkillRng;
  readonly depth: number;
  /** Xếp hàng một sự kiện con trong cùng chuỗi dispatch (bị kiểm soát bởi recursion guard). */
  emit(childEvent: Omit<SkillEngineEvent, 'nowMs'> & { nowMs?: number }): void;
}

export interface SkillHandlerOutcome {
  /** True nếu kỹ năng thực sự kích hoạt và áp dụng hiệu ứng. */
  readonly applied: boolean;
  /** True nếu kỹ năng hủy tiếp tục lan truyền các handler ưu tiên thấp hơn cho sự kiện này. */
  readonly stopPropagation?: boolean;
  /** Ghi chú chuẩn đoán dùng cho audit/test (không lộ bí mật). */
  readonly note?: string;
}

export interface SkillHandlerDefinition {
  readonly id: string;
  readonly roleId: string;
  readonly trigger: SkillTrigger;
  /** Số nhỏ chạy trước. Khi bằng nhau: ưu tiên khoảng cách ghế từ activePlayer, rồi id tăng dần. */
  readonly priority: number;
  readonly oncePerMatch?: boolean;
  readonly cooldownRounds?: number;
  readonly requiresRevealed?: boolean;
  readonly requiresAlive?: boolean;
  /** Kiểm tra điều kiện bổ sung trước khi tiêu hao oncePerMatch / cooldown. */
  readonly canTrigger?: (ctx: SkillExecutionContext) => boolean;
  /** Thực thi kỹ năng đồng bộ và server-authoritative trên state. */
  readonly execute: (ctx: SkillExecutionContext) => SkillHandlerOutcome | void;
}

export interface SkillDispatchOptions {
  readonly maxDepth?: number;
  readonly maxDispatches?: number;
  /** Khi true (mặc định), rollback toàn bộ state về snapshot trước dispatch nếu có ngoại lệ. */
  readonly atomic?: boolean;
}

export interface SkillDispatchTraceEntry {
  readonly depth: number;
  readonly trigger: SkillTrigger;
  readonly handlerId: string;
  readonly ownerPlayerId: string;
  readonly applied: boolean;
  readonly note?: string;
}

export interface SkillDispatchResult {
  readonly ok: boolean;
  readonly skippedIdempotent?: boolean;
  readonly rolledBack?: boolean;
  readonly abortedReason?: 'MAX_RECURSION_DEPTH' | 'LOOP_DETECTED' | 'MAX_DISPATCHES';
  readonly error?: string;
  readonly trace: readonly SkillDispatchTraceEntry[];
}

export const DEFAULT_SKILL_MAX_RECURSION_DEPTH = 8;
export const DEFAULT_SKILL_MAX_DISPATCHES = 32;
const MAX_IDEMPOTENCY_KEYS = 256;

function createStateDeterministicRng(state: AuthoritativeGameState): DeterministicSkillRng {
  return {
    nextFloat(): number {
      const r = nextDeterministicRandom(state.rngState);
      state.rngState = r.nextState;
      return r.value;
    },
    nextInt(min: number, max: number): number {
      const lo = Math.ceil(Math.min(min, max));
      const hi = Math.floor(Math.max(min, max));
      if (lo === hi) return lo;
      const r = nextDeterministicRandom(state.rngState);
      state.rngState = r.nextState;
      return lo + Math.floor(r.value * (hi - lo + 1));
    },
  };
}

function computeSeatDistanceFromActive(
  state: AuthoritativeGameState,
  playerId: string,
): number {
  const order = state.turnOrder;
  const total = order.length;
  if (total === 0) return Number.MAX_SAFE_INTEGER;
  const activeIdx = state.activePlayerId ? order.indexOf(state.activePlayerId) : 0;
  const startIdx = activeIdx >= 0 ? activeIdx : 0;
  const targetIdx = order.indexOf(playerId);
  if (targetIdx < 0) return total + 1;
  return (targetIdx - startIdx + total) % total;
}

function cloneGameStateForRollback(state: AuthoritativeGameState): AuthoritativeGameState {
  if (typeof structuredClone === 'function') {
    return structuredClone(state);
  }
  return JSON.parse(JSON.stringify(state)) as AuthoritativeGameState;
}

function restoreGameStateSnapshot(
  target: AuthoritativeGameState,
  snapshot: AuthoritativeGameState,
): void {
  const existingKeys = Object.keys(target) as (keyof AuthoritativeGameState)[];
  for (const key of existingKeys) {
    if (!(key in snapshot)) {
      delete (target as unknown as Record<string, unknown>)[key as string];
    }
  }
  Object.assign(target, snapshot);
}

/**
 * Bộ điều phối sự kiện kỹ năng có kiểm soát thứ tự, đệ quy, vòng lặp,
 * cooldown/once-per-match, nguyên tử hóa và idempotency.
 */
export class SkillEngine {
  private readonly handlersByTrigger = new Map<SkillTrigger, SkillHandlerDefinition[]>();
  private readonly handlersById = new Map<string, SkillHandlerDefinition>();
  private readonly processedEventKeys: string[] = [];
  private readonly processedEventKeySet = new Set<string>();

  registerHandler(handler: SkillHandlerDefinition): void {
    if (this.handlersById.has(handler.id)) {
      throw new Error(`Duplicate skill handler id "${handler.id}".`);
    }
    this.handlersById.set(handler.id, handler);
    const list = this.handlersByTrigger.get(handler.trigger) ?? [];
    list.push(handler);
    this.handlersByTrigger.set(handler.trigger, list);
  }

  hasHandler(handlerId: string): boolean {
    return this.handlersById.has(handlerId);
  }

  listHandlers(trigger?: SkillTrigger): readonly SkillHandlerDefinition[] {
    if (trigger) {
      return [...(this.handlersByTrigger.get(trigger) ?? [])];
    }
    return Array.from(this.handlersById.values());
  }

  hasProcessedEventKey(eventKey: string): boolean {
    return this.processedEventKeySet.has(eventKey);
  }

  resetIdempotencyCache(): void {
    this.processedEventKeys.length = 0;
    this.processedEventKeySet.clear();
  }

  private recordEventKey(eventKey: string): void {
    if (this.processedEventKeySet.has(eventKey)) return;
    this.processedEventKeySet.add(eventKey);
    this.processedEventKeys.push(eventKey);
    if (this.processedEventKeys.length > MAX_IDEMPOTENCY_KEYS) {
      const oldest = this.processedEventKeys.shift();
      if (oldest) this.processedEventKeySet.delete(oldest);
    }
  }

  dispatch(
    state: AuthoritativeGameState,
    rootEvent: SkillEngineEvent,
    options?: SkillDispatchOptions,
  ): SkillDispatchResult {
    if (rootEvent.eventKey && this.processedEventKeySet.has(rootEvent.eventKey)) {
      return {
        ok: true,
        skippedIdempotent: true,
        trace: [],
      };
    }

    const maxDepth = Math.max(1, options?.maxDepth ?? DEFAULT_SKILL_MAX_RECURSION_DEPTH);
    const maxDispatches = Math.max(1, options?.maxDispatches ?? DEFAULT_SKILL_MAX_DISPATCHES);
    const atomic = options?.atomic !== false;
    let snapshot: AuthoritativeGameState | null = null;
    const rng = createStateDeterministicRng(state);

    const trace: SkillDispatchTraceEntry[] = [];
    const visitedSignatures = new Set<string>();
    const queue: Array<{ event: SkillEngineEvent; depth: number }> = [
      { event: rootEvent, depth: 0 },
    ];
    let totalDispatches = 0;
    let abortedReason: SkillDispatchResult['abortedReason'];

    try {
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.depth > maxDepth) {
          abortedReason = 'MAX_RECURSION_DEPTH';
          break;
        }

        const handlers = this.handlersByTrigger.get(current.event.trigger);
        if (!handlers || handlers.length === 0) continue;

        const candidates: Array<{
          handler: SkillHandlerDefinition;
          owner: AuthoritativePlayerState;
          seatDistance: number;
        }> = [];

        for (const owner of Object.values(state.players)) {
          for (const handler of handlers) {
            if (owner.roleId !== handler.roleId) continue;
            if ((handler.requiresAlive ?? true) && !owner.alive) continue;
            if ((handler.requiresRevealed ?? false) && !owner.revealed) continue;
            if (handler.oncePerMatch && owner.skillUsedOnce) continue;
            if (
              typeof handler.cooldownRounds === 'number' &&
              handler.cooldownRounds > 0 &&
              owner.skillCooldown > 0
            ) {
              continue;
            }
            candidates.push({
              handler,
              owner,
              seatDistance: computeSeatDistanceFromActive(state, owner.playerId),
            });
          }
        }

        // Thứ tự xác định tuyệt đối: priority ASC -> khoảng cách ghế từ chủ lượt ASC -> handler.id ASC
        candidates.sort((a, b) => {
          if (a.handler.priority !== b.handler.priority) {
            return a.handler.priority - b.handler.priority;
          }
          if (a.seatDistance !== b.seatDistance) {
            return a.seatDistance - b.seatDistance;
          }
          return a.handler.id.localeCompare(b.handler.id);
        });

        for (const item of candidates) {
          totalDispatches += 1;
          if (totalDispatches > maxDispatches) {
            abortedReason = 'MAX_DISPATCHES';
            break;
          }

          const signature = [
            current.event.trigger,
            item.handler.id,
            item.owner.playerId,
            current.event.actorPlayerId,
            current.event.targetPlayerId ?? '-',
          ].join('|');

          if (current.depth > 0 && visitedSignatures.has(signature)) {
            abortedReason = 'LOOP_DETECTED';
            break;
          }
          visitedSignatures.add(signature);

          const pendingChildren: Array<{ event: SkillEngineEvent; depth: number }> = [];
          const ctx: SkillExecutionContext = {
            state,
            event: current.event,
            owner: item.owner,
            rng,
            depth: current.depth,
            emit(child) {
              pendingChildren.push({
                event: {
                  ...child,
                  nowMs: child.nowMs ?? current.event.nowMs,
                },
                depth: current.depth + 1,
              });
            },
          };

          if (item.handler.canTrigger && !item.handler.canTrigger(ctx)) {
            continue;
          }

          if (atomic && snapshot === null) {
            snapshot = cloneGameStateForRollback(state);
          }

          const outcome = item.handler.execute(ctx);
          const applied = outcome ? outcome.applied : true;

          if (applied) {
            if (item.handler.oncePerMatch) {
              item.owner.skillUsedOnce = true;
            }
            if (
              typeof item.handler.cooldownRounds === 'number' &&
              item.handler.cooldownRounds > 0
            ) {
              item.owner.skillCooldown = item.handler.cooldownRounds;
            }
          }

          trace.push({
            depth: current.depth,
            trigger: current.event.trigger,
            handlerId: item.handler.id,
            ownerPlayerId: item.owner.playerId,
            applied,
            ...(outcome?.note ? { note: outcome.note } : {}),
          });

          if (pendingChildren.length > 0) {
            // Chèn sự kiện con vào đầu hàng đợi theo thứ tự phát sinh (depth-first deterministic)
            queue.unshift(...pendingChildren);
          }

          if (outcome?.stopPropagation) {
            break;
          }
        }

        if (abortedReason) break;
      }

      if (rootEvent.eventKey && !abortedReason) {
        this.recordEventKey(rootEvent.eventKey);
      }

      return {
        ok: !abortedReason,
        ...(abortedReason ? { abortedReason } : {}),
        trace,
      };
    } catch (err) {
      if (atomic && snapshot) {
        restoreGameStateSnapshot(state, snapshot);
      }
      return {
        ok: false,
        rolledBack: atomic && snapshot !== null,
        error: err instanceof Error ? err.message : String(err),
        trace,
      };
    }
  }
}

/**
 * Mô tả adapter nối 10 tướng Classic tới bộ giải quyết gốc trong `effects.ts`.
 * Ở Phase 1, adapter này CHỈ khai báo liên kết đã được triển khai (executable binding)
 * để Registry xác thực độ hoàn thiện của Classic, KHÔNG thay đổi bất kỳ đường chạy Classic nào.
 */
export interface ClassicSkillAdapterBinding {
  readonly roleId: ClassicBoardGameRoleId;
  readonly handlerId: string;
  readonly trigger: SkillTrigger;
  readonly resolverSymbol: string;
  readonly priority: number;
}

export const CLASSIC_SKILL_ADAPTER_BINDINGS: Readonly<
  Record<ClassicBoardGameRoleId, ClassicSkillAdapterBinding>
> = {
  'gac-ky-thuat': {
    roleId: 'gac-ky-thuat',
    handlerId: 'classic:gac-ky-thuat:demolish-1d4',
    trigger: 'ACTIVE_SKILL',
    resolverSymbol: 'effects.ts:resolveUseSkill',
    priority: 100,
  },
  'gac-truc-ban': {
    roleId: 'gac-truc-ban',
    handlerId: 'classic:gac-truc-ban:teleport-cluster',
    trigger: 'ON_MOVE',
    resolverSymbol: 'effects.ts:resolveUseSkill',
    priority: 100,
  },
  'gac-radio': {
    roleId: 'gac-radio',
    handlerId: 'classic:gac-radio:lightning-1d6',
    trigger: 'ACTIVE_SKILL',
    resolverSymbol: 'effects.ts:resolveUseSkill',
    priority: 100,
  },
  'suong-an-danh': {
    roleId: 'suong-an-danh',
    handlerId: 'classic:suong-an-danh:vampire-drain',
    trigger: 'AFTER_ATTACK',
    resolverSymbol: 'effects.ts:resolveAttack',
    priority: 100,
  },
  'suong-tin-gia': {
    roleId: 'suong-tin-gia',
    handlerId: 'classic:suong-tin-gia:unknown-deceit',
    trigger: 'ON_INVESTIGATE',
    resolverSymbol: 'effects.ts:resolveInvestigateCard',
    priority: 100,
  },
  'suong-gac-cong': {
    roleId: 'suong-gac-cong',
    handlerId: 'classic:suong-gac-cong:werewolf-counterattack',
    trigger: 'AFTER_ATTACK',
    resolverSymbol: 'effects.ts:resolveAttack',
    priority: 110,
  },
  'lang-anh-san': {
    roleId: 'lang-anh-san',
    handlerId: 'classic:lang-anh-san:bob-robbery',
    trigger: 'BEFORE_DAMAGE',
    resolverSymbol: 'effects.ts:resolveAttack+applyDamage',
    priority: 90,
  },
  'lang-quan-sat': {
    roleId: 'lang-quan-sat',
    handlerId: 'classic:lang-quan-sat:allie-full-heal',
    trigger: 'ACTIVE_SKILL',
    resolverSymbol: 'effects.ts:resolveUseSkill',
    priority: 100,
  },
  'lang-cuu-ho': {
    roleId: 'lang-cuu-ho',
    handlerId: 'classic:lang-cuu-ho:charles-bloody-feast',
    trigger: 'AFTER_ATTACK',
    resolverSymbol: 'effects.ts:resolveUseSkill+applyDamage',
    priority: 100,
  },
  'lang-tien-phong': {
    roleId: 'lang-tien-phong',
    handlerId: 'classic:lang-tien-phong:daniel-scream',
    trigger: 'ON_ELIMINATION',
    resolverSymbol: 'effects.ts:applyDamage',
    priority: 100,
  },
};

export function createSkillEngine(): SkillEngine {
  return new SkillEngine();
}
