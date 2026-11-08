// ---------------------------------------------------------------------------
// features/study/focus-mode/focus-mode.ts — Focus Mode policies & runtime
// configuration (`feature.study.focus-mode`).
//
// ARCHITECTURAL INVARIANT (PR6):
// Pomodoro Timer and HSK Study/Review can run completely without 3D WebGL
// rendering (`level === 'zen-2d'` -> `suspend3DRendering: true`).
// ---------------------------------------------------------------------------

import type { PomodoroPhase } from '../../../shared/contracts/study';

export type FocusModeLevel = 'off' | 'minimal-hud' | 'zen-2d';

export const VALID_FOCUS_MODE_LEVELS: readonly FocusModeLevel[] = [
  'off',
  'minimal-hud',
  'zen-2d',
] as const;

export type AmbientSoundTrack = 'none' | 'library-rain' | 'white-noise' | 'tien-lake-breeze';

export interface FocusModePreferences {
  level: FocusModeLevel;
  ambientTrack: AmbientSoundTrack;
  ambientVolume: number;
  autoHideHudOnFocus: boolean;
  muteMovementNotifications: boolean;
}

export interface FocusRuntimePolicy {
  /** Whether the 3D WebGL Canvas should be paused/unmounted to save GPU/battery. */
  suspend3DRendering: boolean;
  /** Whether the Minimap and Fast-Travel controls should be hidden. */
  hideNavigationHud: boolean;
  /** Whether the Joystick and Motorbike controls should be hidden. */
  hideMovementControls: boolean;
  /** Whether the HSK Handbook / Flashcard Review and Pomodoro Clock remain accessible. */
  allowLearningAndPomodoro: true;
  /** Effective focus level applied. */
  effectiveLevel: FocusModeLevel;
}

export const DEFAULT_FOCUS_PREFERENCES: FocusModePreferences = {
  level: 'off',
  ambientTrack: 'none',
  ambientVolume: 0.4,
  autoHideHudOnFocus: true,
  muteMovementNotifications: true,
};

export const FOCUS_MODE_STORAGE_KEY = 'bkhn_focus_mode_v1';

export interface FocusStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function saveFocusPreferences(
  storage: FocusStorageLike,
  prefs: FocusModePreferences,
): void {
  storage.setItem(FOCUS_MODE_STORAGE_KEY, JSON.stringify(sanitizeFocusPreferences(prefs)));
}

export function loadFocusPreferences(storage: FocusStorageLike): FocusModePreferences {
  const raw = storage.getItem(FOCUS_MODE_STORAGE_KEY);
  if (!raw) return { ...DEFAULT_FOCUS_PREFERENCES };
  try {
    const parsed = JSON.parse(raw) as Partial<FocusModePreferences>;
    return sanitizeFocusPreferences(parsed);
  } catch {
    return { ...DEFAULT_FOCUS_PREFERENCES };
  }
}

export function sanitizeFocusPreferences(
  raw?: Partial<FocusModePreferences> | null,
): FocusModePreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_FOCUS_PREFERENCES };
  const level: FocusModeLevel =
    raw.level === 'minimal-hud' || raw.level === 'zen-2d' || raw.level === 'off'
      ? raw.level
      : DEFAULT_FOCUS_PREFERENCES.level;
  const ambientTrack: AmbientSoundTrack =
    raw.ambientTrack === 'library-rain' ||
    raw.ambientTrack === 'white-noise' ||
    raw.ambientTrack === 'tien-lake-breeze' ||
    raw.ambientTrack === 'none'
      ? raw.ambientTrack
      : DEFAULT_FOCUS_PREFERENCES.ambientTrack;
  const ambientVolume =
    typeof raw.ambientVolume === 'number' && Number.isFinite(raw.ambientVolume)
      ? Math.min(1, Math.max(0, raw.ambientVolume))
      : DEFAULT_FOCUS_PREFERENCES.ambientVolume;

  return {
    level,
    ambientTrack,
    ambientVolume,
    autoHideHudOnFocus:
      typeof raw.autoHideHudOnFocus === 'boolean'
        ? raw.autoHideHudOnFocus
        : DEFAULT_FOCUS_PREFERENCES.autoHideHudOnFocus,
    muteMovementNotifications:
      typeof raw.muteMovementNotifications === 'boolean'
        ? raw.muteMovementNotifications
        : DEFAULT_FOCUS_PREFERENCES.muteMovementNotifications,
  };
}

/**
 * Computes the UI and WebGL rendering policy for the current Focus Mode
 * preference and Pomodoro phase. Guarantees that `allowLearningAndPomodoro`
 * is always `true` even when 3D rendering is suspended (`zen-2d`).
 */
export function computeFocusRuntimePolicy(
  prefs: FocusModePreferences,
  pomodoroPhase: PomodoroPhase,
): FocusRuntimePolicy {
  const effectiveLevel: FocusModeLevel =
    prefs.level === 'off' && prefs.autoHideHudOnFocus && pomodoroPhase === 'focus'
      ? 'minimal-hud'
      : prefs.level;

  if (effectiveLevel === 'zen-2d') {
    return {
      suspend3DRendering: true,
      hideNavigationHud: true,
      hideMovementControls: true,
      allowLearningAndPomodoro: true,
      effectiveLevel: 'zen-2d',
    };
  }

  if (effectiveLevel === 'minimal-hud') {
    return {
      suspend3DRendering: false,
      hideNavigationHud: true,
      hideMovementControls: true,
      allowLearningAndPomodoro: true,
      effectiveLevel: 'minimal-hud',
    };
  }

  return {
    suspend3DRendering: false,
    hideNavigationHud: false,
    hideMovementControls: false,
    allowLearningAndPomodoro: true,
    effectiveLevel: 'off',
  };
}
