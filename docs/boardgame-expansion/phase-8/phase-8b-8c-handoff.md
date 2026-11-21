# Phase 8B–8C Handoff — Production Beta Hardening & Character VFX Complete

> **Status:** Track A (Phase 8B) + Track B (Phase 8C) + Track C (Phase 8D local validation) COMPLETE.
> **Production Classification:** **Production Beta / Early Access** (Classic Stable default + `expansion-1`, `expansion-2`, `full-expansion` Beta; `0/100` human playtest matches completed — **not** `PUBLIC_RELEASE_APPROVED`).

---

## 1. Key Artifacts & Documentation Index

| Document | Purpose |
|---|---|
| [`phase-8b-audit-plan.md`](./phase-8b-audit-plan.md) | Systematic audit scope across 66 roles, multiplayer DO persistence & privacy |
| [`stateful-fuzzing-spec.md`](./stateful-fuzzing-spec.md) | 5 formal invariant categories + Valid / Targeted / Adversarial / Replay fuzzer design |
| [`phase-8b-bug-register.md`](./phase-8b-bug-register.md) | All 9 confirmed defects (`BUG-8B-01`..`BUG-8B-09`) with exact root cause & repro |
| [`phase-8b-audit-report.md`](./phase-8b-audit-report.md) | Detailed Phase 8B engineering report |
| [`phase-8b-regression-report.md`](./phase-8b-regression-report.md) | Before/after reproduction verification & 690-match fuzzer evidence |
| [`character-vfx-coverage-matrix.md`](./character-vfx-coverage-matrix.md) | Honest 66/66 VFX coverage matrix (`20` Signature, `32` Shared, `9` State Indicator, `3` Private-only, `2` Passive) |
| [`structured-visual-events-spec.md`](./structured-visual-events-spec.md) | Typed 21-kind `BoardGameStructuredVisualEvent` schema, P0 privacy gate & F5 dedupe |
| [`tier4-signature-vfx-report.md`](./tier4-signature-vfx-report.md) | All 8 Tier-4 signature Canvas 2D + DOM + WebAudio cues + Dual-Faction `MultiFactionVictory` |
| [`phase-8c-visual-qa-report.md`](./phase-8c-visual-qa-report.md) | Desktop `1440×900`, Mobile `390×844`, Low Tier & Reduced Motion Playwright visual QA |
| [`phase-8d-production-patch-report.md`](./phase-8d-production-patch-report.md) | Full gate results & production patch validation summary |
| [`known-beta-risks.md`](./known-beta-risks.md) | Live Beta risk register & Phase 8B–8C changelog |

---

## 2. Architecture Invariants to Preserve Going Forward

1. **Classic Zero-Drift Guarantee:** `features/boardgame/domain/victory.ts` remains 0-diff; `appendStructuredVisualEvent` NEVER consumes PRNG (`state.rngState`). Any future skill/VFX work must keep Classic 25/25 RNG fingerprints and 4,500-match balance metrics bit-identical.
2. **Centralized P0 Privacy Gate (`features/boardgame/domain/visual-events.ts`):** All new public visual events MUST flow through `appendStructuredVisualEvent` so unrevealed actors can never leak `publicRoleId`, `publicFaction`, or `publicCopiedRoleId`.
3. **Stateful Fuzzer as Permanent Safety Net:** Run `node scripts/fuzz-boardgame-stateful.cjs` whenever modifying `expansion-skills.ts`, `actions.ts`, `victory-engine.ts`, `effects.ts`, or `projections.ts`; `test/boardgame-phase8b-stateful-audit.test.cjs` already executes a fast 76-match fuzz pass inside `npm run test:boardgame`.
4. **Honest Beta Governance:** Do NOT rebalance characters (`Anathema`, `N.C. Soldier`, `Bonnie`, etc.) or promote Beta to GA until real human playtest telemetry (`npm run telemetry:beta`) crosses the planned threshold and human win-rate/duration data is reviewed.

---

## 3. Recommended Next Phase (Phase 9 — Human Beta Telemetry & Data-Driven Balance)

1. Collect human match telemetry from live Production Beta (`npm run telemetry:beta`) across `expansion-1`, `expansion-2`, and `full-expansion`.
2. Review real human win rates, `pendingChoiceTimeouts`, match duration, and abandon rates against bot-meta outliers listed in `known-beta-risks.md`.
3. Only after human data review, propose a versioned balance patch (`catalogVersion` bump) with explicit changelog notes.
