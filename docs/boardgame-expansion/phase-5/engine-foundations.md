# Bóng Đêm KTX — Phase 5A Shared Engine Foundations (`CAP-04`, `CAP-05`, `CAP-06`, `CAP-07`, `CAP-10`)

- **Date:** 2026-11-20
- **Scope:** Zero-Classic-regression shared engine primitives built in Phase 5A before implementing the 4 Tier-2 characters (Phase 5B) and 8 Tier-3 characters (Phase 5C).

---

## 1. CAP-04 — Centralized `HealPipeline` (`features/boardgame/domain/heal-pipeline.ts`)

- **Classic Isolation:** `applyHeal()` in `effects.ts` remains 100% untouched for `rulesetId === 'classic'`.
- **Unified Expanded Routing:** Every heal source in expanded mode (`rulesetId !== 'classic'`) routes through `HealPipeline` (`PendingResolutionStep` kind `'HEAL'` or direct `executeHealStep`), classifying every heal by `HealSourceKind`:
  - `'skill'` — Character skills (`Allie`, `Vampire`, `Wendigo`, `Wyvern`, `Bipolar`, `Elise`)
  - `'white-card'` — White consumables (`eq-07` Holy Water, `eq-08` Blessing, `eq-09` First Aid *when reducing wounds*, `eq-13` Advent, `eq-14` Chocolate)
  - `'black-card'` — Black consumables & conversion (`ev-07` Vampire Bat self-heal, `ev-13` Diabolic Ritual, `Urban Legend` conversion)
  - `'location'` — `corridor` (Weird Woods Ô 9 heal)
  - `'investigation'` — Green Hermit heal cards (`inv-07`, `inv-08`, `inv-09`)
- **Deterministic Evaluation Order:**
  1. Event idempotency check (`processedEventIds.includes(healEventId)`) & target alive check.
  2. Self-heal restriction check (`Dalton`: blocks `actorPlayerId === targetPlayerId` once activated; allows external heals).
  3. Continuous heal-block aura check (`revealed Usurper` alive & `targetPlayerId !== usurperId` & source in `{'skill', 'white-card'}`).
  4. Hidden heal-block interception (`hidden Usurper` with effective potential heal `> 0`, respecting `CAP-05` `reactionPolicy`: `AUTO_DECLINE` skips in `< 1ms`, `AUTO_ACTIVATE_WHEN_ELIGIBLE` auto-reveals & blocks, `ASK` opens secret `PendingChoice`).
  5. Max HP clipping (`actual = Math.min(target.woundsTaken, rawAmount)`), authoritative mutation (`woundsTaken`, `hp`), event mark & deterministic log/telemetry recording.

---

## 2. CAP-05 — Out-of-Turn Reaction Queue & Private Reaction Policy

- **Private Server-Side Reaction Policy (`BoardGameReactionPolicy`):**
  - Values: `'ASK'` (default) | `'AUTO_DECLINE'` | `'AUTO_ACTIVATE_WHEN_ELIGIBLE'`.
  - Stored in `AuthoritativeGameState.expansionState.reactionPolicyByPlayer` (JSON-serializable, survives SQLite DO hibernation).
  - Exposed **exclusively** in `BoardGamePrivateGameView.reactionPolicy` (never in `publicGame`, never to Spectators, never logged publicly).
  - Updated via `{ type: 'SET_REACTION_PREF', policy }` (allowed out-of-turn for living players in expanded matches; in `worker/src/boardgame-room.ts`, persisted to SQLite and synced **unicast-only** to the owner socket with ZERO public broadcast and ZERO public revision bump!).
  - **`AUTO_ACTIVATE_WHEN_ELIGIBLE` Guard:** Permitted ONLY for safe binary single-decision secret reactions (`exp1_wendigo`, `exp1_undying`, `exp1_cindy`, `exp2_urban_legend`, `exp2_usurper`, `exp2_arlene`), never for multi-target or equipment-sacrifice choices (`Bianca`, `Gwendolen`, `Freyja`, `Elise`).
- **Out-of-Turn Queue Guarantees:**
  - Owner-only `RESOLVE_CHOICE` enforcement with neutral rejection message for non-owners.
  - Server-authoritative deadlines (`BOARD_GAME_CHOICE_TIMEOUT_MS` / `BOARD_GAME_DISCONNECTED_CHOICE_TIMEOUT_MS`), safe deterministic timeout defaults (`decline`/`skip`/`done`), `resolvedChoiceIds` duplicate-request protection, and `MAX_PENDING_STEPS_DRAIN = 96` + `MAX_REACTION_CHAIN_DEPTH = 6` finite termination bounds.

---

## 3. CAP-06 — Safe Effect/Reaction Chains

- Extended `PendingResolutionStep` with:
  - `HEAL` (deferred/queued centralized healing)
  - `ROLE_REVEALED_TRIGGERS` (voluntary & forced reveal reactions such as `Umibozu`, strictly excluding death/finalReveal and guarded against recursion)
  - `GWENDOLEN_COUNTER` (non-recursive retaliatory attack queue)
  - `FREYJA_EXTRA_ATTACK_CHECK` (sequential post-attack discard-and-attack queue)
- Extended `DAMAGE` step attribution with `isSingleTarget` (strict cardinality distinguishing single-target vs AoE even when only 1 player is hit), `isConsumableBlackCardDamage` (for `Urban Legend`), `isBonusAttack`, `isRetaliatoryAttack`, `biancaChecked`/`biancaPrevented`, `urbanLegendChecked`/`urbanLegendConverted`, and `chainDepth`.

---

## 4. CAP-07 — Extended Neutral Victory Evaluation (`features/boardgame/domain/victory-engine.ts`)

- Added reusable, pure VictoryEngine evaluation primitives supporting all Phase 5 Neutral archetypes without modifying `victory.ts`:
  - Immediate death-by-eligible-faction (`Arlene` killed by Hunter)
  - Immediate post-activation elimination (`Dalton` kill after 12-HP reveal)
  - End-of-match all-Neutrals-alive OR exact location (`Angel` at exact `lobby`/Church)
  - End-of-match lowest remaining HP among survivors with ties (`Bianca`)
  - End-of-match highest remaining HP among survivors with ties (`Dalton`)
- Strictly preserves `Cindy`, `Bipolar`, `Cruz`, and `Bryon` behavior and leaves copied victory graphs & dynamic allegiance out of Wave 4.

---

## 5. CAP-10 — Canonical Metadata (`features/boardgame/domain/cards.ts`)

- Added `CONSUMABLE_DAMAGING_BLACK_CARD_IDS` (`ev-07`, `ev-08`, `ev-09`, `ev-10`, `ev-12`) + `isConsumableDamagingBlackCardId()` and `WHITE_HEAL_CARD_IDS` (`eq-07`, `eq-08`, `eq-09`, `eq-13`, `eq-14`) + `isWhiteHealCardId()` backed by `CANONICAL_SH_CARD_IDS`.
- Zero translated display-name matching in engine logic; zero exposure of hidden identity/faction/private card metadata in public DTOs.
