'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/graphics-settings.ts
// Hệ thống Cấu hình Đồ họa 3 mức (High / Balanced / Low) & Trợ năng cho
// Bóng Đêm KTX:
// - Tự động nhận diện thiết bị mobile / phần cứng thấp / prefers-reduced-motion
// - Điều chỉnh tỷ lệ hạt VFX, DPR canvas, backdrop-blur, foil shimmer, sương KTX,
//   nghiêng thẻ 3D và bật/tắt hiệu ứng rung màn hình mạnh
// - Bền vững qua localStorage (`hustverse:bg-graphics-prefs:v1`) & SSR-safe
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react';

export type BoardGameQualitySetting = 'auto' | 'high' | 'balanced' | 'low';
export type BoardGameQualityTier = 'high' | 'balanced' | 'low';

export interface BoardGameEnvironmentCapabilities {
  viewportWidth: number;
  hardwareConcurrency: number;
  deviceMemory?: number | null;
  coarsePointer: boolean;
  prefersReducedMotion: boolean;
}

export interface BoardGameGraphicsPreferences {
  quality: BoardGameQualitySetting;
  reducedMotionOverride: boolean | null;
  shakeEnabled: boolean;
}

export interface ResolvedGraphicsProfile {
  setting: BoardGameQualitySetting;
  tier: BoardGameQualityTier;
  autoDetectedTier: BoardGameQualityTier;
  reducedMotion: boolean;
  shakeEnabled: boolean;
  dprCap: number;
  particleScale: number;
  enableBackdropBlur: boolean;
  enableFoil: boolean;
  enable3DTilt: boolean;
  enableMistDrift: boolean;
  enableScreenShake: boolean;
  enableScreenFlash: boolean;
  pawnGlideDurationMs: number;
}

export const GRAPHICS_PREFS_STORAGE_KEY = 'hustverse:bg-graphics-prefs:v1';
const GRAPHICS_SYNC_EVENT = 'hustverse:bg-graphics-change';

export const DEFAULT_GRAPHICS_PREFERENCES: BoardGameGraphicsPreferences = {
  quality: 'auto',
  reducedMotionOverride: null,
  shakeEnabled: true,
};

export const GRAPHICS_QUALITY_LABELS: Record<BoardGameQualitySetting, string> = {
  auto: 'Tự động',
  high: 'Cao (High)',
  balanced: 'Cân bằng (Balanced)',
  low: 'Nhẹ (Low)',
};

export const GRAPHICS_TIER_LABELS: Record<BoardGameQualityTier, string> = {
  high: 'High',
  balanced: 'Balanced',
  low: 'Low',
};

/**
 * Tự động đánh giá mức đồ họa phù hợp với phần cứng & màn hình hiện tại:
 * - `low`: bật Reduced Motion của OS, <= 2 luồng CPU hoặc RAM <= 2GB
 * - `balanced`: thiết bị cảm ứng / màn hình < 768px (mobile 390×844) hoặc <= 4 luồng CPU
 * - `high`: desktop phần cứng đầy đủ
 */
export function detectAutoQualityTier(
  env: BoardGameEnvironmentCapabilities,
): BoardGameQualityTier {
  if (
    env.prefersReducedMotion ||
    (env.hardwareConcurrency > 0 && env.hardwareConcurrency <= 2) ||
    (typeof env.deviceMemory === 'number' && env.deviceMemory > 0 && env.deviceMemory <= 2)
  ) {
    return 'low';
  }
  if (
    env.coarsePointer ||
    env.viewportWidth < 768 ||
    (env.hardwareConcurrency > 0 && env.hardwareConcurrency <= 4)
  ) {
    return 'balanced';
  }
  return 'high';
}

/**
 * Hợp nhất lựa chọn người dùng + năng lực thiết bị thành profile thực thi cụ thể
 * cho Canvas 2D VFX, backdrop-blur, foil, sương KTX, 3D tilt và rung màn hình.
 */
export function resolveGraphicsProfile(
  prefs: BoardGameGraphicsPreferences,
  env: BoardGameEnvironmentCapabilities,
): ResolvedGraphicsProfile {
  const autoDetectedTier = detectAutoQualityTier(env);
  const tier: BoardGameQualityTier =
    prefs.quality === 'auto' ? autoDetectedTier : prefs.quality;
  const reducedMotion = prefs.reducedMotionOverride ?? env.prefersReducedMotion;

  let dprCap = 2;
  let particleScale = 1;
  let enableBackdropBlur = true;
  let enableFoil = true;
  let enable3DTilt = !env.coarsePointer;
  let enableMistDrift = true;
  let enableScreenFlash = true;
  let pawnGlideDurationMs = 520;

  if (tier === 'balanced') {
    dprCap = 1.5;
    particleScale = 0.55;
    enableBackdropBlur = false;
    enableFoil = true;
    enable3DTilt = false;
    enableMistDrift = false;
    enableScreenFlash = true;
    pawnGlideDurationMs = 340;
  } else if (tier === 'low') {
    dprCap = 1;
    particleScale = 0;
    enableBackdropBlur = false;
    enableFoil = false;
    enable3DTilt = false;
    enableMistDrift = false;
    enableScreenFlash = false;
    pawnGlideDurationMs = 0;
  }

  if (reducedMotion) {
    particleScale = Math.min(particleScale, 0.25);
    enable3DTilt = false;
    enableMistDrift = false;
    enableScreenFlash = false;
    pawnGlideDurationMs = 0;
  }

  const enableScreenShake = Boolean(
    prefs.shakeEnabled && !reducedMotion && tier !== 'low',
  );

  return {
    setting: prefs.quality,
    tier,
    autoDetectedTier,
    reducedMotion,
    shakeEnabled: prefs.shakeEnabled,
    dprCap,
    particleScale,
    enableBackdropBlur,
    enableFoil,
    enable3DTilt,
    enableMistDrift,
    enableScreenShake,
    enableScreenFlash,
    pawnGlideDurationMs,
  };
}

function isQualitySetting(val: unknown): val is BoardGameQualitySetting {
  return val === 'auto' || val === 'high' || val === 'balanced' || val === 'low';
}

export function readGraphicsPreferencesFromStorage(): BoardGameGraphicsPreferences {
  if (typeof window === 'undefined') return DEFAULT_GRAPHICS_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(GRAPHICS_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_GRAPHICS_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<BoardGameGraphicsPreferences> | null;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_GRAPHICS_PREFERENCES;
    return {
      quality: isQualitySetting(parsed.quality) ? parsed.quality : 'auto',
      reducedMotionOverride:
        typeof parsed.reducedMotionOverride === 'boolean'
          ? parsed.reducedMotionOverride
          : null,
      shakeEnabled:
        typeof parsed.shakeEnabled === 'boolean' ? parsed.shakeEnabled : true,
    };
  } catch {
    return DEFAULT_GRAPHICS_PREFERENCES;
  }
}

export function writeGraphicsPreferencesToStorage(
  prefs: BoardGameGraphicsPreferences,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GRAPHICS_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent(GRAPHICS_SYNC_EVENT, { detail: prefs }));
  } catch {
    // Bỏ qua lỗi private mode / quota
  }
}

export function readEnvironmentCapabilities(): BoardGameEnvironmentCapabilities {
  if (typeof window === 'undefined') {
    return {
      viewportWidth: 1280,
      hardwareConcurrency: 8,
      deviceMemory: 8,
      coarsePointer: false,
      prefersReducedMotion: false,
    };
  }
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number }) : null;
  const coarsePointer = Boolean(window.matchMedia?.('(pointer: coarse)').matches);
  const prefersReducedMotion = Boolean(
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  return {
    viewportWidth: window.innerWidth || 1280,
    hardwareConcurrency:
      typeof nav?.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0
        ? nav.hardwareConcurrency
        : 4,
    deviceMemory: typeof nav?.deviceMemory === 'number' ? nav.deviceMemory : null,
    coarsePointer,
    prefersReducedMotion,
  };
}

export function useBoardGameGraphicsSettings() {
  const [prefs, setPrefs] = useState<BoardGameGraphicsPreferences>(() =>
    DEFAULT_GRAPHICS_PREFERENCES,
  );
  const [env, setEnv] = useState<BoardGameEnvironmentCapabilities>(() => ({
    viewportWidth: 1280,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    coarsePointer: false,
    prefersReducedMotion: false,
  }));

  useEffect(() => {
    setPrefs(readGraphicsPreferencesFromStorage());
    setEnv(readEnvironmentCapabilities());

    const syncEnv = () => setEnv(readEnvironmentCapabilities());
    const onStorageOrCustom = () => setPrefs(readGraphicsPreferencesFromStorage());

    const motionMq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const pointerMq = window.matchMedia?.('(pointer: coarse)');
    window.addEventListener('resize', syncEnv);
    window.addEventListener('storage', onStorageOrCustom);
    window.addEventListener(GRAPHICS_SYNC_EVENT, onStorageOrCustom);
    motionMq?.addEventListener?.('change', syncEnv);
    pointerMq?.addEventListener?.('change', syncEnv);

    return () => {
      window.removeEventListener('resize', syncEnv);
      window.removeEventListener('storage', onStorageOrCustom);
      window.removeEventListener(GRAPHICS_SYNC_EVENT, onStorageOrCustom);
      motionMq?.removeEventListener?.('change', syncEnv);
      pointerMq?.removeEventListener?.('change', syncEnv);
    };
  }, []);

  const updatePrefs = useCallback(
    (updater: (prev: BoardGameGraphicsPreferences) => BoardGameGraphicsPreferences) => {
      setPrefs((prev) => {
        const next = updater(prev);
        writeGraphicsPreferencesToStorage(next);
        return next;
      });
    },
    [],
  );

  const setQuality = useCallback(
    (quality: BoardGameQualitySetting) => {
      updatePrefs((prev) => ({ ...prev, quality }));
    },
    [updatePrefs],
  );

  const setShakeEnabled = useCallback(
    (shakeEnabled: boolean) => {
      updatePrefs((prev) => ({ ...prev, shakeEnabled }));
    },
    [updatePrefs],
  );

  const setReducedMotionOverride = useCallback(
    (reducedMotionOverride: boolean | null) => {
      updatePrefs((prev) => ({ ...prev, reducedMotionOverride }));
    },
    [updatePrefs],
  );

  const profile = useMemo(() => resolveGraphicsProfile(prefs, env), [prefs, env]);

  return {
    prefs,
    profile,
    setQuality,
    setShakeEnabled,
    setReducedMotionOverride,
  };
}
