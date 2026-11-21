# Phase 8E — Gameplay Stability & Reliability Certification Plan

> **Repository:** `haianhant/hust-hsk` (`main`)
> **Baseline HEAD:** `7ff5c257327e4aa4d16ba8f752df4a58e678fa09`
> **Goal:** Coverage-driven reliability certification across all 66 playable characters, 48 canonical cards, high-risk cross-character interactions, Cloudflare Durable Object chaos/persistence, controlled local concurrency/soak workloads, and targeted mutation testing — with zero unverified claims and zero Classic regression.

---

## Milestone Execution Plan

| Phase | Scope | Concrete Deliverables |
|---|---|---|
| **8E-0** | Baseline & Coverage Audit | Static scan of 24 behavioral suites + 80-match runtime activation probe → [`phase-8e-coverage-baseline.md`](../phase-8e-coverage-baseline.md) |
| **8E-1** | 66-Character, Independent Victory & 48-Card Behavioral Coverage | [`test/boardgame-phase8e-coverage.test.cjs`](../../../../test/boardgame-phase8e-coverage.test.cjs) + [`66-role-coverage-matrix.md`](./66-role-coverage-matrix.md) + [`48-card-coverage-matrix.md`](./48-card-coverage-matrix.md) |
| **8E-2** | Risk-Based Cross-Character Interaction Testing & Extended Fuzzer | Mechanic classifier & pairwise graph ([`scripts/phase8e-interaction-matrix.cjs`](../../../../scripts/phase8e-interaction-matrix.cjs)), Critical Families A–E + pairwise/3-way assertions ([`test/boardgame-phase8e-interactions.test.cjs`](../../../../test/boardgame-phase8e-interactions.test.cjs)), instrumented & extended [`scripts/fuzz-boardgame-stateful.cjs`](../../../../scripts/fuzz-boardgame-stateful.cjs) + [`interaction-risk-matrix.md`](./interaction-risk-matrix.md), [`pairwise-coverage-report.md`](./pairwise-coverage-report.md), [`stateful-fuzzing-extension-report.md`](./stateful-fuzzing-extension-report.md) |
| **8E-3** | Multiplayer Chaos, Persistence & Production Compatibility | Real SQLite DO/WS chaos suite ([`test/boardgame-phase8e-do-chaos.test.cjs`](../../../../test/boardgame-phase8e-do-chaos.test.cjs)) across 4P–8P + [`do-chaos-test-report.md`](./do-chaos-test-report.md) |
| **8E-4** | Controlled Local Load/Soak & Targeted Mutation Testing | Local isolated DO load (`5, 10, 25, 50` rooms) & soak harness ([`scripts/bench-phase8e-load-soak.cjs`](../../../../scripts/bench-phase8e-load-soak.cjs)), 8-predicate fault-seeding mutation runner ([`scripts/phase8e-mutation-test.cjs`](../../../../scripts/phase8e-mutation-test.cjs)) + [`load-soak-report.md`](./load-soak-report.md), [`mutation-testing-report.md`](./mutation-testing-report.md) |
| **8E-5** | Defect Triage, Minimal Fixes, CI Layering & Certification | Reproduce-first P0/P1 patches, Fast vs Extended CI split, [`bug-register.md`](./bug-register.md), [`classic-regression-report.md`](./classic-regression-report.md), [`reliability-scorecard.json`](./reliability-scorecard.json), [`phase-8e-handoff.md`](./phase-8e-handoff.md), CI/production verification |

---

## Guardrails & Non-Goals

- **No feature creep:** Zero new roles, zero balance changes, zero UI/VFX redesigns, zero changes to approved house rules.
- **No public production stress testing:** All concurrency and soak benchmarks run strictly on isolated local SQLite DO infrastructure.
- **Reproduce before fixing:** Every confirmed P0/P1 defect must have a deterministic failing regression test BEFORE applying the minimal patch.
- **Strict honesty:** Every number in `reliability-scorecard.json` and the matrices comes from actual executed test output; untested branches are explicitly listed as `PARTIAL` or `UNTESTED`.
