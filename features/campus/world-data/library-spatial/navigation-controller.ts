// ---------------------------------------------------------------------------
// features/campus/world-data/library-spatial/navigation-controller.ts —
// Unified Library Navigation Controller & State Machine (PR10B).
//
// Centralizes all floor/preset transitions across Tạ Quang Bửu Library
// (Floors 1–7 and 10) using PR10A's canonical `resolveLibraryFloorTransition()`
// and `LIBRARY_NAV_PRESETS`.
// ---------------------------------------------------------------------------

import { AVATAR } from '../../../../shared/constants/world';
import {
  createLibraryLocation,
  getFloorBaseElevation,
  isValidLibraryFloor,
  LIBRARY_NAV_PRESETS,
} from './floors';
import {
  resolveLibraryFloorTransition,
  type FloorTransitionResolution,
} from './transitions';
import type {
  LibraryFloor,
  LibraryLocation,
  LibrarySpawnPoint,
} from './types';

export type LibraryNavigationPhase =
  | 'idle'
  | 'preparing'
  | 'transitioning'
  | 'completed'
  | 'failed';

export type LibraryNavigationFailureReason =
  | 'invalid-floor'
  | 'preset-not-found'
  | 'unsafe-destination'
  | 'transition-in-progress'
  | 'prepare-floor-failed'
  | 'executor-failed';

export interface LibraryNavigationExecutionPayload {
  transitionId: number;
  preset: LibrarySpawnPoint | null;
  previousFloor: LibraryFloor;
  previousLocation: LibraryLocation;
  targetFloor: LibraryFloor;
  location: LibraryLocation;
  yaw: number;
  pitch: number;
  usedFallbackSpawn: boolean;
  status: 'success' | 'corrected';
}

export interface LibraryNavigationOutcome {
  ok: boolean;
  transitionId: number;
  phase: LibraryNavigationPhase;
  phaseHistory: LibraryNavigationPhase[];
  status: 'success' | 'corrected' | 'failed';
  reason?: LibraryNavigationFailureReason;
  presetId: string | null;
  floor: LibraryFloor;
  location: LibraryLocation;
  yaw: number;
  pitch: number;
  usedFallbackSpawn: boolean;
  seatReleased: boolean;
}

export interface LibraryNavigationSnapshot {
  phase: LibraryNavigationPhase;
  phaseHistory: LibraryNavigationPhase[];
  transitionId: number;
  currentFloor: LibraryFloor;
  activePresetId: string;
  location: LibraryLocation;
  yaw: number;
  pitch: number;
  inputLocked: boolean;
  lastError: LibraryNavigationFailureReason | null;
  lastOutcome: LibraryNavigationOutcome | null;
}

export interface LibraryNavigationAdapterHooks {
  /** Returns the live player state before a transition begins. */
  getPlayerContext?: () => {
    floor: number;
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    seated?: boolean;
    seatId?: string | null;
  };
  /** Pre-warms target floor geometry during `'preparing'` before moving the player. */
  prepareFloor?: (floor: LibraryFloor) => boolean | void;
  /** Locks or unlocks player movement input during a transition. */
  setInputLocked?: (locked: boolean) => void;
  /** Applies the validated transition (releasing Floor 1 seat if needed, moving player & camera). */
  executeTransition?: (
    payload: LibraryNavigationExecutionPayload,
  ) => { ok?: boolean; seatReleased?: boolean } | boolean | void;
}

export type LibraryNavigationListener = (snapshot: LibraryNavigationSnapshot) => void;

const DEFAULT_INITIAL_PRESET = LIBRARY_NAV_PRESETS[0];

export function getLibraryNavPresetById(id: string): LibrarySpawnPoint | undefined {
  return LIBRARY_NAV_PRESETS.find((p) => p.id === id);
}

function findMatchingPresetId(
  floor: LibraryFloor,
  x: number,
  z: number,
  fallbackId: string,
): string {
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const preset of LIBRARY_NAV_PRESETS) {
    if (preset.floor !== floor) continue;
    const d = Math.hypot(preset.x - x, preset.z - z);
    if (d < bestDist) {
      bestDist = d;
      bestId = preset.id;
    }
  }
  return bestId ?? fallbackId;
}

export class LibraryNavigationController {
  private snapshot: LibraryNavigationSnapshot;
  private listeners = new Set<LibraryNavigationListener>();
  private hooks: LibraryNavigationAdapterHooks = {};
  private inFlightTransitionId: number | null = null;

  constructor(initialHooks?: LibraryNavigationAdapterHooks) {
    if (initialHooks) {
      this.hooks = { ...initialHooks };
    }
    const initialLoc = createLibraryLocation(
      DEFAULT_INITIAL_PRESET.floor,
      DEFAULT_INITIAL_PRESET.x,
      DEFAULT_INITIAL_PRESET.z,
      DEFAULT_INITIAL_PRESET.y,
    );
    this.snapshot = {
      phase: 'idle',
      phaseHistory: ['idle'],
      transitionId: 0,
      currentFloor: DEFAULT_INITIAL_PRESET.floor,
      activePresetId: DEFAULT_INITIAL_PRESET.id,
      location: initialLoc,
      yaw: DEFAULT_INITIAL_PRESET.yaw,
      pitch: DEFAULT_INITIAL_PRESET.pitch,
      inputLocked: false,
      lastError: null,
      lastOutcome: null,
    };
  }

  /**
   * Cancels any in-flight transition (e.g., when exiting the library lobby)
   * and restores movement input without mutating floor/location state.
   */
  public cancelInFlightTransition(): void {
    if (this.inFlightTransitionId !== null) {
      this.inFlightTransitionId = null;
      this.snapshot.transitionId += 1;
      this.snapshot.phase = 'idle';
      this.snapshot.phaseHistory = ['idle'];
      this.setInputLockState(false);
      this.emit();
    }
  }

  public getSnapshot(): LibraryNavigationSnapshot {
    return {
      ...this.snapshot,
      phaseHistory: [...this.snapshot.phaseHistory],
      location: { ...this.snapshot.location },
    };
  }

  public getPresets(): readonly LibrarySpawnPoint[] {
    return LIBRARY_NAV_PRESETS;
  }

  public isBusy(): boolean {
    return (
      this.inFlightTransitionId !== null ||
      this.snapshot.phase === 'preparing' ||
      this.snapshot.phase === 'transitioning'
    );
  }

  public isInputLocked(): boolean {
    return this.snapshot.inputLocked;
  }

  public registerHooks(partialHooks: LibraryNavigationAdapterHooks): () => void {
    this.hooks = {
      ...this.hooks,
      ...partialHooks,
    };
    return () => {
      for (const key of Object.keys(partialHooks) as Array<keyof LibraryNavigationAdapterHooks>) {
        if (this.hooks[key] === partialHooks[key]) {
          delete this.hooks[key];
        }
      }
    };
  }

  public subscribe(listener: LibraryNavigationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach((listener) => {
      listener(snap);
    });
  }

  private setInputLockState(locked: boolean): void {
    this.snapshot.inputLocked = locked;
    try {
      this.hooks.setInputLocked?.(locked);
    } catch {
      // Ignore hook errors during lock toggle
    }
  }

  /**
   * Synchronizes the controller when the player naturally walks between floors
   * (e.g., via the T1 <-> T2 curved stairs) or enters/resets the library lobby.
   */
  public notifyNaturalFloorChange(
    floor: number,
    position?: { x: number; y?: number; z: number; yaw?: number; pitch?: number },
    presetIdOverride?: string,
  ): void {
    if (this.isBusy() || !isValidLibraryFloor(floor)) return;

    const x = position?.x ?? this.snapshot.location.x;
    const z = position?.z ?? this.snapshot.location.z;
    const y = position?.y ?? getFloorBaseElevation(floor);
    const nextLoc = createLibraryLocation(floor, x, z, y);
    const nextPresetId =
      presetIdOverride ?? findMatchingPresetId(floor, x, z, this.snapshot.activePresetId);

    const changed =
      this.snapshot.currentFloor !== floor ||
      this.snapshot.activePresetId !== nextPresetId ||
      Math.abs(this.snapshot.location.x - nextLoc.x) > 0.05 ||
      Math.abs(this.snapshot.location.y - nextLoc.y) > 0.05 ||
      Math.abs(this.snapshot.location.z - nextLoc.z) > 0.05;

    this.snapshot.currentFloor = floor;
    this.snapshot.activePresetId = nextPresetId;
    this.snapshot.location = nextLoc;
    if (position?.yaw !== undefined && Number.isFinite(position.yaw)) {
      this.snapshot.yaw = position.yaw;
    }
    if (position?.pitch !== undefined && Number.isFinite(position.pitch)) {
      this.snapshot.pitch = position.pitch;
    }
    if (changed) {
      this.emit();
    }
  }

  /**
   * Navigates to one of the 11 canonical `LIBRARY_NAV_PRESETS` by ID.
   */
  public navigateToPreset(presetId: string): LibraryNavigationOutcome {
    const preset = getLibraryNavPresetById(presetId);
    if (!preset) {
      return this.failWithoutMutatingState('preset-not-found', null);
    }
    return this.executeValidatedTransition({
      targetFloor: preset.floor,
      x: preset.x,
      z: preset.z,
      yaw: preset.yaw,
      pitch: preset.pitch,
      preset,
    });
  }

  /**
   * Navigates to an arbitrary library floor and optional coordinates/angles.
   * Used both internally and by the backwards-compatible `window.__bkhn.setLibraryFloor` adapter.
   */
  public navigateToFloor(
    floor: unknown,
    x?: number,
    z?: number,
    yaw?: number,
    pitch?: number,
    presetIdHint?: string,
  ): LibraryNavigationOutcome {
    const matchedPreset = presetIdHint ? getLibraryNavPresetById(presetIdHint) ?? null : null;
    return this.executeValidatedTransition({
      targetFloor: floor,
      x,
      z,
      yaw,
      pitch,
      preset: matchedPreset,
    });
  }

  private captureCurrentLocation(): {
    floor: LibraryFloor;
    location: LibraryLocation;
    yaw: number;
    pitch: number;
  } {
    const ctx = this.hooks.getPlayerContext?.();
    if (ctx && isValidLibraryFloor(ctx.floor)) {
      return {
        floor: ctx.floor,
        location: createLibraryLocation(ctx.floor, ctx.x, ctx.z, ctx.y),
        yaw: Number.isFinite(ctx.yaw) ? ctx.yaw : this.snapshot.yaw,
        pitch: Number.isFinite(ctx.pitch) ? ctx.pitch : this.snapshot.pitch,
      };
    }
    return {
      floor: this.snapshot.currentFloor,
      location: { ...this.snapshot.location },
      yaw: this.snapshot.yaw,
      pitch: this.snapshot.pitch,
    };
  }

  private failWithoutMutatingState(
    reason: LibraryNavigationFailureReason,
    presetId: string | null,
    existingHistory?: LibraryNavigationPhase[],
    transitionIdOverride?: number,
  ): LibraryNavigationOutcome {
    const current = this.captureCurrentLocation();
    const transitionId = transitionIdOverride ?? ++this.snapshot.transitionId;
    const phaseHistory: LibraryNavigationPhase[] = existingHistory
      ? [...existingHistory, 'failed']
      : ['failed'];

    const outcome: LibraryNavigationOutcome = {
      ok: false,
      transitionId,
      phase: 'failed',
      phaseHistory,
      status: 'failed',
      reason,
      presetId: presetId ?? this.snapshot.activePresetId,
      floor: current.floor,
      location: current.location,
      yaw: current.yaw,
      pitch: current.pitch,
      usedFallbackSpawn: false,
      seatReleased: false,
    };

    // Preserve currentFloor, activePresetId, and location untouched on failure
    this.snapshot.phase = 'failed';
    this.snapshot.phaseHistory = phaseHistory;
    this.snapshot.lastError = reason;
    this.snapshot.lastOutcome = outcome;
    this.emit();
    return outcome;
  }

  private rejectConcurrentWhileBusy(presetId: string | null): LibraryNavigationOutcome {
    const current = this.captureCurrentLocation();
    const outcome: LibraryNavigationOutcome = {
      ok: false,
      transitionId: this.inFlightTransitionId ?? this.snapshot.transitionId,
      phase: 'failed',
      phaseHistory: ['failed'],
      status: 'failed',
      reason: 'transition-in-progress',
      presetId: presetId ?? this.snapshot.activePresetId,
      floor: current.floor,
      location: current.location,
      yaw: current.yaw,
      pitch: current.pitch,
      usedFallbackSpawn: false,
      seatReleased: false,
    };
    // Preserve active in-flight snapshot.phase, snapshot.phaseHistory, and transitionId
    this.snapshot.lastError = 'transition-in-progress';
    return outcome;
  }

  private executeValidatedTransition(request: {
    targetFloor: unknown;
    x?: number;
    z?: number;
    yaw?: number;
    pitch?: number;
    preset: LibrarySpawnPoint | null;
  }): LibraryNavigationOutcome {
    // 1. Concurrency guard: reject double-clicks or overlapping transitions
    // without clobbering the active in-flight transition's snapshot phase.
    if (this.isBusy()) {
      return this.rejectConcurrentWhileBusy(request.preset?.id ?? null);
    }

    const prev = this.captureCurrentLocation();

    // 2. Canonical spatial validation (floor validity, walkable surface, elevation, collision)
    const spatialResult: FloorTransitionResolution = resolveLibraryFloorTransition(
      request.targetFloor,
      request.x,
      request.z,
      request.yaw,
      request.pitch,
      AVATAR.radius,
      AVATAR.height,
      prev.location,
    );

    if (!spatialResult.ok || spatialResult.status === 'failed') {
      const reason: LibraryNavigationFailureReason =
        spatialResult.reason ?? 'invalid-floor';
      return this.failWithoutMutatingState(reason, request.preset?.id ?? null);
    }

    const targetFloor = spatialResult.location.floor;
    const transitionId = ++this.snapshot.transitionId;
    const phaseHistory: LibraryNavigationPhase[] = [];

    this.inFlightTransitionId = transitionId;
    this.setInputLockState(true);

    try {
      // 3. Phase: 'preparing' — pre-warm target floor geometry before switching state
      phaseHistory.push('preparing');
      this.snapshot.phase = 'preparing';
      this.snapshot.phaseHistory = [...phaseHistory];
      this.snapshot.lastError = null;
      this.emit();

      if (this.inFlightTransitionId !== transitionId) {
        return this.rejectConcurrentWhileBusy(request.preset?.id ?? null);
      }

      if (this.hooks.prepareFloor) {
        try {
          const prepOk = this.hooks.prepareFloor(targetFloor);
          if (prepOk === false) {
            this.inFlightTransitionId = null;
            this.setInputLockState(false);
            return this.failWithoutMutatingState(
              'prepare-floor-failed',
              request.preset?.id ?? null,
              phaseHistory,
              transitionId,
            );
          }
        } catch {
          this.inFlightTransitionId = null;
          this.setInputLockState(false);
          return this.failWithoutMutatingState(
            'prepare-floor-failed',
            request.preset?.id ?? null,
            phaseHistory,
            transitionId,
          );
        }
      }

      // Guard against stale completion if cancelled/superseded during preparation
      if (this.inFlightTransitionId !== transitionId) {
        return this.rejectConcurrentWhileBusy(request.preset?.id ?? null);
      }

      // 4. Phase: 'transitioning' — mandatory executor applies player/camera state & seat release
      phaseHistory.push('transitioning');
      this.snapshot.phase = 'transitioning';
      this.snapshot.phaseHistory = [...phaseHistory];
      this.emit();

      if (this.inFlightTransitionId !== transitionId) {
        return this.rejectConcurrentWhileBusy(request.preset?.id ?? null);
      }

      if (!this.hooks.executeTransition) {
        this.inFlightTransitionId = null;
        this.setInputLockState(false);
        return this.failWithoutMutatingState(
          'executor-failed',
          request.preset?.id ?? null,
          phaseHistory,
          transitionId,
        );
      }

      let seatReleased = false;
      try {
        const execRes = this.hooks.executeTransition({
          transitionId,
          preset: request.preset,
          previousFloor: prev.floor,
          previousLocation: prev.location,
          targetFloor,
          location: spatialResult.location,
          yaw: spatialResult.yaw,
          pitch: spatialResult.pitch,
          usedFallbackSpawn: spatialResult.usedFallbackSpawn,
          status: spatialResult.status === 'corrected' ? 'corrected' : 'success',
        });
        if (
          execRes === false ||
          (typeof execRes === 'object' && execRes !== null && execRes.ok === false)
        ) {
          this.inFlightTransitionId = null;
          this.setInputLockState(false);
          return this.failWithoutMutatingState(
            'executor-failed',
            request.preset?.id ?? null,
            phaseHistory,
            transitionId,
          );
        }
        if (typeof execRes === 'object' && execRes !== null && execRes.seatReleased) {
          seatReleased = true;
        }
      } catch {
        this.inFlightTransitionId = null;
        this.setInputLockState(false);
        return this.failWithoutMutatingState(
          'executor-failed',
          request.preset?.id ?? null,
          phaseHistory,
          transitionId,
        );
      }

      // Guard against stale completion if cancelled/superseded during execution
      if (this.inFlightTransitionId !== transitionId) {
        return this.rejectConcurrentWhileBusy(request.preset?.id ?? null);
      }

      // 5. Phase: 'completed' — commit canonical UI & spatial state and restore movement controls
      phaseHistory.push('completed');
      const resolvedPresetId =
        request.preset?.id ??
        findMatchingPresetId(
          targetFloor,
          spatialResult.location.x,
          spatialResult.location.z,
          this.snapshot.activePresetId,
        );

      const outcome: LibraryNavigationOutcome = {
        ok: true,
        transitionId,
        phase: 'completed',
        phaseHistory: [...phaseHistory],
        status: spatialResult.status === 'corrected' ? 'corrected' : 'success',
        presetId: resolvedPresetId,
        floor: targetFloor,
        location: { ...spatialResult.location },
        yaw: spatialResult.yaw,
        pitch: spatialResult.pitch,
        usedFallbackSpawn: spatialResult.usedFallbackSpawn,
        seatReleased,
      };

      this.inFlightTransitionId = null;
      this.setInputLockState(false);
      this.snapshot.phase = 'completed';
      this.snapshot.phaseHistory = [...phaseHistory];
      this.snapshot.currentFloor = targetFloor;
      this.snapshot.activePresetId = resolvedPresetId;
      this.snapshot.location = { ...spatialResult.location };
      this.snapshot.yaw = spatialResult.yaw;
      this.snapshot.pitch = spatialResult.pitch;
      this.snapshot.lastError = null;
      this.snapshot.lastOutcome = outcome;
      this.emit();

      return outcome;
    } finally {
      if (this.inFlightTransitionId === transitionId) {
        this.inFlightTransitionId = null;
        if (this.snapshot.inputLocked) {
          this.setInputLockState(false);
        }
      }
    }
  }
}

export function createLibraryNavigationController(
  initialHooks?: LibraryNavigationAdapterHooks,
): LibraryNavigationController {
  return new LibraryNavigationController(initialHooks);
}

export const libraryNavigationController = createLibraryNavigationController();
