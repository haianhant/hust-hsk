# Bóng Đêm KTX — Phase 4A Shared Engine Foundations (`engine-changes.md`)

- **Date:** 2026-11-20
- **Scope:** Shared, zero-Classic-regression engine prerequisites implemented in Phase 4A before adding the 10 Wave 3 character handlers in Phase 4B.

---

## 1. Shared Engine Changes Summary

### 1.1. Unified Remaining-HP Helper & Cluster Area Scope ([`rules.ts`](../../../features/boardgame/domain/rules.ts))
- Added `getRemainingHp(player)` returning clamped remaining HP (`Math.max(0, Math.min(player.maxHp, player.hp))`), establishing a single consistent convention across all Phase 4 health-threshold characters (`Fallen >= 8`, `Fujiko <= 4`) without mixing wound tracks.
- Added `listLivingPlayersInSameCluster(state, anchorPlayer, { includeSelf })` backed by `areInSameCluster()` and the match's authoritative `state.clusterPairs` (supporting shuffled pairs per match and deterministic `state.turnOrder` ordering) for `Udi`, `Wrath`, and `Bryon`.

### 1.2. Canonical Shadow Hunters Card Metadata ([`cards.ts`](../../../features/boardgame/domain/cards.ts))
- Added `CANONICAL_SH_CARD_IDS` (1-to-1 typed mapping for all White & Black cards, including `masamune: 'ev-01'`, `vampire_bat: 'ev-07'`, `bloodthirsty_spider: 'ev-08'`, `dynamite: 'ev-09'`, `spiritual_doll: 'ev-10'`), plus reusable helpers:
  - `MASAMUNE_CARD_ID`
  - `CRUZ_QUALIFYING_CARD_IDS` (`['ev-07', 'ev-08', 'ev-09', 'ev-10']`)
  - `getCardIdByCanonicalShId()`, `isCardCanonicalShId()`, `isCruzQualifyingCardId()`
- Eliminates translated display-name matching inside skill or victory logic while preserving `CARDS_CATALOG` (48 cards) untouched.

### 1.3. Dynamic Expansion `eq_chocolate` A/E/U Eligibility ([`roles.ts`](../../../features/boardgame/domain/roles.ts), [`effects.ts`](../../../features/boardgame/domain/effects.ts))
- Added `getCharacterSourceName(roleId)` and `isEligibleForChocolateHeal(roleId, isExpandedMode)` in `roles.ts`, reading dynamically from `EXPANSION_CHARACTER_CATALOG` (1-to-1 with `CharacterRegistry.metadata.sourceName`).
- Refactored `case 'eq_chocolate'` in `effects.ts` to delegate to `isEligibleForChocolateHeal(actor.roleId, isExpandedMode)`:
  - **Classic (`!isExpandedMode`):** 100% bit-for-bit unchanged (`lang-quan-sat`, `gac-truc-ban`, `suong-tin-gia`).
  - **Expanded (`isExpandedMode`):** Automatically accepts any role whose canonical `sourceName` starts with `A`, `E`, or `U` (`Undying`, `Elysia`, `Unchained`, `Eleanor`, `Udi`, and all future waves) without maintaining a manual role-ID list.

### 1.4. Extended Event Attribution & Serializable Runtime State ([`types.ts`](../../../features/boardgame/domain/types.ts))
- Extended `DAMAGE` step with optional `sourceCardId`, `preAttackTargetHp`, `preAttackTargetRevealed`, and `isFujikoExecution`.
- Extended `ELIMINATION_TRIGGERS` step with optional `causationId`, `sourceCardId`, `turnNumberAtElimination`, and `vengeanceChecked`.
- Extended `ExpansionRuntimeState` with purely JSON-serializable optional fields (`visionsMarks`, `cruzQualifyingCardTurnByPlayer`, `cruzWinTriggeredIds`, `wrathPromptedTurnNumber`, `visionsPromptedTurnNumber`, `feaAdjustedTurnNumber`, `bryonGiftedTurnNumber`) — 100% backward compatible with existing SQLite DO snapshots and never initialized in `classic` mode.

### 1.5. Automated Statistics & Catalog Consistency Guards
- [`scripts/sim-starter-sixteen.cjs`](../../../scripts/sim-starter-sixteen.cjs) and [`scripts/sim-starter-eight.cjs`](../../../scripts/sim-starter-eight.cjs) now compute and emit `totalPendingChoicesResolved` directly from `stats.pendingChoicesResolved`.
- [`scripts/validate-character-catalog.cjs`](../../../scripts/validate-character-catalog.cjs) now computes, prints, and enforces per-faction `implemented + remaining === total` catalog invariants.
- [`test/boardgame-phase4a.test.cjs`](../../../test/boardgame-phase4a.test.cjs) enforces all Phase 4A invariants continuously in `npm run test:boardgame`.
