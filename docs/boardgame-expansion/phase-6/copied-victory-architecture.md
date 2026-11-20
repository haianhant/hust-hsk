# Bóng Đêm KTX — CAP-07: `CopiedVictoryGraph` Architecture Specification

- **Module:** [`features/boardgame/domain/copied-victory-graph.ts`](../../../features/boardgame/domain/copied-victory-graph.ts)
- **Integration:** [`features/boardgame/domain/victory-engine.ts`](../../../features/boardgame/domain/victory-engine.ts) (`features/boardgame/domain/victory.ts` remains **100% untouched** for Classic production).

---

## 1. Core Architectural Principle: Separate Relationship Semantics

`CopiedVictoryGraph` models three strictly distinct victory dependency relations so that copying a condition is **never** conflated with sharing another player's outcome:

| Relation | Semantics | Evaluated State | Characters |
|---|---|---|---|
| **`COPY_GOAL`** | Copier adopts the **victory predicate** of `sourceRoleId`, then evaluates that predicate using **the copier's own identity & state** (copier's HP, alive flag, equipped weapons, kill flags, location, reveal status). Does NOT change copier's `faction` or `roleId`. | Copier's state (unless target's own goal is itself a transitive link, which recurses through `CopiedVictoryGraph` with cycle tracking). | **Cassie** (`exp1_cassie`), **Clairvoyant** (`exp1_clairvoyant`) |
| **`SHARE_OUTCOME`** | Link owner qualifies as a co-winner whenever `targetPlayerId` qualifies as a winner in the match evaluation (no additional survival requirement on owner unless explicitly flagged). | `targetPlayerId`'s final win outcome. | **Bethany** (`exp1_bethany`) |
| **`CONDITIONAL_SHARED`** | Link owner qualifies when additional survival/predicate constraints hold **together with** the linked target's outcome (Diana: `owner.alive && targetWins`) OR a paired survival bond (Aaron: `owner.alive && target.alive`). | Owner constraints + target outcome/state. | **Diana** (`exp2_diana`), **Aaron** (`exp2_aaron`) |

### Concrete Proof of Distinction (`COPY_GOAL` vs `SHARE_OUTCOME`)
- Suppose **Allie (`lang-quan-sat`)** has victory goal *"Be alive at match end"*.
  - If **Cassie** (`COPY_GOAL → Allie`) is **alive** while **Allie** is **dead**, Cassie **WINS** (Allie's goal evaluated against Cassie's state = `cassie.alive === true`), while Allie **LOSES**.
  - Conversely, if **Cassie** is **dead** while **Allie** is **alive**, Cassie **LOSES** even though Allie wins!
  - By contrast, if **Bethany** (`SHARE_OUTCOME → Allie`) is **dead** while **Allie** is **alive**, Bethany **WINS** because Bethany shares Allie's winner outcome!
- Suppose **Colt (`exp2_colt`)** has immediate victory goal *"Own ≥ 3 qualifying weapons (`ev-02..ev-05`)"*.
  - If **Clairvoyant** (`COPY_GOAL → Colt`) acquires 3 qualifying weapons, Clairvoyant triggers an **immediate** victory even if Colt has 0 weapons.
  - If Colt acquires 3 qualifying weapons while Clairvoyant has 0 weapons, Colt wins and Clairvoyant **does NOT** win.

---

## 2. Data Model (Immutable, JSON-Serializable, Pure Evaluation)

```ts
export type VictoryLinkRelation = 'COPY_GOAL' | 'SHARE_OUTCOME' | 'CONDITIONAL_SHARED';

export interface VictoryDependencyLink {
  readonly linkId: string;
  readonly ownerPlayerId: string;
  readonly targetPlayerId: string | null; // null when unresolved / no bound target
  readonly relation: VictoryLinkRelation;
  readonly sourceRoleId: string | null; // immutable provenance captured at binding time
  readonly sourceGoalRef: string;
  readonly boundEventId: string;
  readonly boundAtMs: number;
  readonly boundTurnNumber: number;
  readonly active: boolean;
  readonly requireOwnerAlive?: boolean;
  readonly requireTargetAlive?: boolean;
  readonly bondMode?: 'target-wins' | 'both-alive';
  readonly fallbackCondition?: 'diana_full_hp_survivor' | 'aaron_dead_before_end' | 'none';
  readonly unresolved?: boolean;
}
```

### Pure Evaluation Invariants
1. **Zero State Mutation:** `evaluateCopiedVictoryGraph()` never writes to `AuthoritativeGameState` or player objects.
2. **Deterministic Order:** Nodes are always traversed in `state.turnOrder` order; output `qualifiedPlayerIds` follows deterministic `state.turnOrder` order (deduplicated).
3. **Per-Evaluation Memoization:** Results for completed non-cyclic evaluations are memoized per `(evaluatorPlayerId, subjectPlayerId, asRoleId)` key within a single evaluation pass (note: cycle-tainted intermediate frames are not poisoned into unrelated paths).
4. **Explicit Cycle Detection (Fail Closed):** Maintains an active recursion stack `visitingStack: string[]` of node keys. On detecting any back-edge (`A → B → A` or `A → B → C → A`), immediately halts traversal of that dependency, records a structured `VictoryGraphCycleRecord` in the pure result's internal telemetry (`cycles[]`), and returns `{ won: false, via: 'cycle_blocked', cycleBlocked: true }`. **Cycles never cause infinite recursion and never award a victory.**
5. **Zero Public Secret Leakage:** Cycle telemetry is internal-only (used for server/simulation diagnostics and unit assertions) — never serialized to `publicGame`, `publicLog`, or Spectator payloads.
6. **Unresolved Goals Fail Closed:** A `COPY_GOAL` whose target has not yet bound a goal (e.g. Clairvoyant → unbound Cassie, or 5P Cassie with no other Neutral) or a `SHARE_OUTCOME` with `targetPlayerId === null` (0-Chosen Bethany) evaluates to `{ won: false, via: 'unresolved' }`.
7. **Missing / Dead Targets:**
   - Missing `targetPlayerId` fails closed (`won: false`).
   - Dead `targetPlayerId` on `SHARE_OUTCOME` / `CONDITIONAL_SHARED(bondMode='target-wins')` STILL evaluates target's actual victory status (e.g. dead Daniel first-death, dead Arlene killed by Hunter, dead Bipolar on Shadow win) so Bethany / alive Diana legitimately co-win!

---

## 3. Mandatory Graph Test Matrix (Verified in `test/boardgame-phase6a.test.cjs`)

1. `Bethany → Diana → Cassie` transitive chain (all 3 co-win when Cassie's copied goal succeeds & Diana is alive).
2. `Cassie → Clairvoyant → Bethany` transitive chain (`COPY_GOAL` resolving through `Clairvoyant`'s `COPY_GOAL` of `Bethany`'s `SHARE_OUTCOME`).
3. `Clairvoyant` copies a Neutral with a shared/conditional condition (`Bethany`, `Diana`, `Aaron`).
4. 2-node dependency cycle (`Bethany ↔ Diana`) fails closed with cycle telemetry.
5. 3-node dependency cycle (`A → B → C → A`) fails closed with cycle telemetry.
6. Missing target player ID fails closed cleanly without throwing.
7. Linked target is dead but legitimately qualifies for a death-based win (`Daniel` first death, `Arlene` Hunter kill, `Bipolar` Shadow win) → `Bethany` co-wins.
8. Target changes victory status later (e.g. `Cassie` initially unresolved → later binds `Allie`, or `Bethany` switches Chosen) → pure re-evaluation reflects new status accurately.
9. Multiple linked co-winners deterministically ordered by `turnOrder`.
10. Solo Neutral immediate victory (`Bob` / `Colt` / `Cindy`) with linked co-winners (`Bethany`, alive `Diana`).
11. Hunter/Shadow team victory with linked Neutral co-winners (`Clairvoyant` copying Hunter, `Bethany` choosing Hunter, `Diana` linked to `Allie`).
12. Explicit `COPY_GOAL` vs `SHARE_OUTCOME` divergence test (copier alive + target dead, and copier dead + target alive).
