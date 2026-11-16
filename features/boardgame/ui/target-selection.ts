import type { BoardGamePublicPlayerView } from '../../../shared/contracts/boardgame';

/**
 * Toggles selection when clicking a player chip/card on the board or player strip.
 * Allows selecting any alive player including self; clicking the already-selected
 * player clears selection back to `null`.
 */
export function toggleSelectedTargetId(
  currentSelectedId: string | null,
  clickedPlayerId: string,
  isAlive = true,
): string | null {
  if (!isAlive) return currentSelectedId;
  return currentSelectedId === clickedPlayerId ? null : clickedPlayerId;
}

export interface ResolvedActionTargets {
  validAttackTarget: BoardGamePublicPlayerView | null;
  validOtherTarget: BoardGamePublicPlayerView | null;
  validAnyTarget: BoardGamePublicPlayerView;
  validHealCardTarget: BoardGamePublicPlayerView;
  validStealTarget: BoardGamePublicPlayerView | null;
}

/**
 * Resolves effective targets for Phase 2 & Phase 3 actions:
 * - Hostile actions (`validAttackTarget`, `validOtherTarget`) never target `selfPlayer`.
 * - Location any-player actions (`validAnyTarget`, e.g. Ô 9 Hành Lang) use `selectedTargetId`
 *   if alive (including self), defaulting to `selfPlayer`.
 * - Single-player healing cards (`validHealCardTarget` for `eq-05`, `eq-06`) use `healTargetId`
 *   if alive, defaulting to `selfPlayer` so selecting an enemy to attack/investigate never
 *   hijacks healing cards onto an opponent.
 */
export function resolveActionTargets(params: {
  selfPlayer: BoardGamePublicPlayerView;
  alivePlayers: readonly BoardGamePublicPlayerView[];
  aliveOthers: readonly BoardGamePublicPlayerView[];
  attackableTargets: readonly BoardGamePublicPlayerView[];
  selectedTargetId: string | null;
  healTargetId: string | null;
}): ResolvedActionTargets {
  const {
    selfPlayer,
    alivePlayers,
    aliveOthers,
    attackableTargets,
    selectedTargetId,
    healTargetId,
  } = params;

  const validAttackTarget =
    attackableTargets.find((p) => p.playerId === selectedTargetId) ??
    attackableTargets[0] ??
    null;

  const validOtherTarget =
    aliveOthers.find((p) => p.playerId === selectedTargetId) ??
    validAttackTarget ??
    aliveOthers[0] ??
    null;

  const validAnyTarget =
    alivePlayers.find((p) => p.playerId === selectedTargetId) ?? selfPlayer;

  const validHealCardTarget =
    alivePlayers.find((p) => p.playerId === healTargetId) ?? selfPlayer;

  const equippedTargets = aliveOthers.filter((p) => p.equipped.length > 0);
  const validStealTarget =
    equippedTargets.find((p) => p.playerId === selectedTargetId) ??
    equippedTargets[0] ??
    null;

  return {
    validAttackTarget,
    validOtherTarget,
    validAnyTarget,
    validHealCardTarget,
    validStealTarget,
  };
}
