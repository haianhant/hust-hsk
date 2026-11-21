# Phase 8F-4 — Extended CI & Local Verification Report

> **Workflow File:** [`.github/workflows/ci-extended.yml`](../../../../.github/workflows/ci-extended.yml)
> **Remote Extended CI Status:** **`UNVERIFIED`** *(local sandbox lacks `gh` CLI and `GH_TOKEN`/`GITHUB_TOKEN` credentials to trigger `workflow_dispatch` remotely — exact manual trigger procedure provided in Section 3 below).*
> **Local Extended CI Parity Status:** **PASS** *(every single step defined in `.github/workflows/ci-extended.yml` executed and passed locally at 100% parity).*

---

## 1. Workflow Updates Made in Phase 8F

Updated [`.github/workflows/ci-extended.yml`](../../../../.github/workflows/ci-extended.yml) so the nightly (`0 21 * * *`) and `workflow_dispatch` workflow now executes:
1. `node --test test/boardgame-phase8f-16-pairs.test.cjs` — 16 historical high-risk pairs, legal eligibility (`8F1-ELIG`), and real SQLite DO Voodoo reconnect (`8F2-C-DO`).
2. `node --test test/boardgame-phase8f-continuation-copy.test.cjs` — Card continuation (`BUG-8F-03`), copied-skill × card (`BUG-8F-01`, `BUG-8F-02`), and action-driven immediate victories.
3. `node scripts/fuzz-boardgame-stateful.cjs --valid=400 --targeted=120 --adversarial=150 --replay=60 --json > .ci-stability-artifacts/fuzz-report.json` — Deep stateful fuzzing with per-match `executedInteractionPairIds`.
4. `node scripts/phase8e-interaction-matrix.cjs --fuzz-json=.ci-stability-artifacts/fuzz-report.json --json > .ci-stability-artifacts/interaction-coverage-recalculated.json` — Machine-validates `phase8f-interaction-evidence.cjs`, computes legal eligibility, and outputs 4-tier evidence-based coverage.
5. `node scripts/phase8e-mutation-test.cjs --json > .ci-stability-artifacts/mutation-report.json` — 16 targeted mutants across 11 core predicates (`MUT-01..MUT-16`).
6. `node --test test/boardgame-phase8e-do-chaos.test.cjs` — Real SQLite DO chaos & persistence.
7. `node test/boardgame-sim.cjs` — Classic 25/25 RNG fingerprints + 4,500-match zero-regression simulation.
8. Artifact upload (`stability-extended-reports`, 14-day retention) with `if: always()`.

---

## 2. Local Execution Results (100% Step Parity with `ci-extended.yml`)

| Extended CI Step | Command | Measured Result |
|---|---|---|
| Phase 8F 16 High-Risk Pairs + Eligibility + DO Reconnect | `node --test test/boardgame-phase8f-16-pairs.test.cjs` | **PASS** (`18/18`, incl. `8F1-ELIG` & `8F2-C-DO` in 338ms) |
| Phase 8F Card Continuation, Copied Skill & Victory | `node --test test/boardgame-phase8f-continuation-copy.test.cjs` | **PASS** (`8/8`, covering `BUG-8F-01/02/03`) |
| Deep Stateful Fuzzing & Replay | `node scripts/fuzz-boardgame-stateful.cjs --valid=400 --targeted=120 --adversarial=150 --replay=60 --json` | **PASS** (`7.9s`; `97,302` valid+targeted steps, `0` violations, `76/76` byte-identical replays, `56,763/56,763` adversarial probes rejected, `66/66` dealt, `56/56` expansion activated, `1,232` co-activated pairs) |
| Evidence-Based Interaction Matrix & Eligibility | `node scripts/phase8e-interaction-matrix.cjs --fuzz-json=... --json` | **PASS** (evidence registry validated; `31/72` high-risk verified, `16/16` historical gaps closed, `1,025/2,145` eligibility corrected) |
| Targeted 16-Mutant Mutation Suite | `node scripts/phase8e-mutation-test.cjs --json` | **PASS** (`16/16 KILLED`, `0 SURVIVED`, 100% kill rate across 11 predicates including `MUT-13..MUT-16`) |
| Real SQLite DO Chaos & Persistence | `node --test test/boardgame-phase8e-do-chaos.test.cjs` | **PASS** (`5/5` groups) |
| Classic Zero-Regression Simulation | `node test/boardgame-sim.cjs` | **PASS** (`25/25` RNG fingerprints + `4,500` matches `0.00%` drift) |

---

## 3. Remote Extended CI Status & Exact Manual Trigger Procedure

- **Remote GitHub Actions Status (`ci-extended.yml`):** **`UNVERIFIED`** — This execution environment has neither the GitHub CLI (`gh`) installed nor a `GITHUB_TOKEN`/`GH_TOKEN` configured to invoke the `workflow_dispatch` API. Normal push CI (`.github/workflows/ci.yml`, 8/8 gates including Cloudflare Worker deploy) and Vercel Production deploy ARE triggered and verified on push to `main`.
- **How to Trigger & Verify `ci-extended.yml` Remotely:**
  - **Option A — GitHub CLI:**
    ```bash
    gh workflow run ci-extended.yml --ref main
    gh run list --workflow=ci-extended.yml --limit 1
    gh run watch <run-id>
    ```
  - **Option B — GitHub Web UI:**
    1. Open `https://github.com/haianhant/hust-hsk/actions/workflows/ci-extended.yml`.
    2. Click **Run workflow** → select branch **`main`** → click **Run workflow**.
    3. Confirm job `Extended Stability — Deep Fuzzing, Replay, Mutation, Phase 8F & DO Chaos` completes with `success` and uploads artifact `stability-extended-reports` containing `fuzz-report.json`, `interaction-coverage-recalculated.json`, and `mutation-report.json`.
  - **Option C — Scheduled Nightly Run:** Runs automatically at `21:00 UTC` (`04:00 Asia/Ho_Chi_Minh`) daily on `main`.
