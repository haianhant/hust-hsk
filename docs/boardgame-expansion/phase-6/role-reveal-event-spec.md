# Bóng Đêm KTX — Authoritative Role Reveal Event Specification

- **Module:** [`features/boardgame/domain/reveal-events.ts`](../../../features/boardgame/domain/reveal-events.ts)
- **Consumers:** `Cassie` (first other Neutral), `Diana` (first other Neutral pending customer), `Aaron` (first other living female), `April & Skipps` (forced reveal at wound 7), `Umibozu` (existing Phase 5B AoE on voluntary/forced reveal).

---

## 1. Authoritative Event Record (`AuthoritativeRoleRevealRecord`)

Every role reveal in expanded mode records an immutable entry in `state.expansionState.revealHistory` (bounded to last 128 records, JSON-serializable for SQLite DO persistence):

```ts
export type AuthoritativeRevealTriggerReason =
  | 'voluntary'         // REVEAL_ROLE action or active reveal-to-cast skill (e.g. Anathema)
  | 'card-forced'       // Mystic Mirror (eq-12), Advent (eq-13), Chocolate (eq-14), Diabolic Ritual (ev-13)
  | 'skill-forced'      // Daniel Scream, Dalton 12th Round, April & Skipps wound 7, Diana customer activation, Aaron spouse sight
  | 'reaction'          // Hidden reaction reveal (Wendigo, Undying, Cindy, Urban Legend, Usurper, Arnold)
  | 'eliminated'        // Death-only reveal on HP <= 0
  | 'final-disclosure'; // End-of-match finalReveal disclosure
```

Each record captures:
- `revealEventId` — Unique monotonic event ID (`rev-ev-<turn>-<seq>`), deduplicated against `revealHistory`.
- `revealSeq` — Strictly monotonically increasing integer (`1, 2, 3, ...`) providing total deterministic ordering across simultaneous multi-reveal batches.
- `revealedPlayerId` — Stable player ID.
- `triggerReason` — One of the 6 authoritative reasons above.
- `sourceActorId` — Player ID that caused the reveal (or `null` for environmental/system).
- `turnNumber` & `round` & `atMs` — Server-authoritative timestamp & turn context.
- `wasAliveBeforeReveal` — `true` iff the player was alive when revealed.
- `isDeathReveal` — `true` iff `triggerReason === 'eliminated'`.
- `isFinalMatchDisclosure` — `true` iff `triggerReason === 'final-disclosure'`.
- `roleIdAtReveal` & `factionAtReveal` — Immutable role/faction provenance at reveal moment.

---

## 2. Normal Gameplay Reveal Predicate

```ts
export function isNormalGameplayReveal(record: AuthoritativeRoleRevealRecord): boolean {
  return (
    record.wasAliveBeforeReveal &&
    !record.isDeathReveal &&
    !record.isFinalMatchDisclosure &&
    record.triggerReason !== 'eliminated' &&
    record.triggerReason !== 'final-disclosure'
  );
}
```

### Binding Semantics for Phase 6 Characters
1. **Cassie (`exp1_cassie`):** Binds once to the earliest `revealSeq` record satisfying `isNormalGameplayReveal(r) && r.revealedPlayerId !== cassieId && r.factionAtReveal === 'wanderer'`. Never rebinds.
2. **Diana (`exp2_diana`):** Binds once (`status: 'pending'`) to the earliest `revealSeq` record satisfying `isNormalGameplayReveal(r) && r.revealedPlayerId !== dianaId && r.factionAtReveal === 'wanderer'`. Activates & reveals Diana (`triggerReason: 'skill-forced'`) at the start of that customer's next own turn.
3. **Aaron (`exp2_aaron`):** Binds once to the earliest `revealSeq` record satisfying `isNormalGameplayReveal(r) && r.revealedPlayerId !== aaronId && isEligibleFemaleRole(r.roleIdAtReveal)` while Aaron is alive & unmatched. Immediately forces Aaron reveal (`triggerReason: 'skill-forced'`).
4. **Simultaneous Multi-Reveal Batches:** When an AoE or chained reveal uncovers multiple players in the same resolution wave (e.g. `Flare` triggers both `Dalton` and `April & Skipps` to reveal), records are appended in deterministic `turnOrder` / resolution order with strictly increasing `revealSeq`, ensuring identical bindings on every replay and reconnect.
5. **Final-Match Disclosure Exclusion:** `finalizeIfFinished()` populates `state.finalReveal` directly without emitting `ROLE_REVEALED_TRIGGERS`, guaranteeing `Cassie`, `Diana`, `Aaron`, `Umibozu`, and `Gideon` NEVER spuriously fire during end-of-match cleanup.

---

## 3. Privacy Isolation Invariants

- `revealHistory` is **internal server state only** (`AuthoritativeGameState.expansionState`) and is NEVER sent in `publicGame` or `privateView`.
- When a normal reveal binds a hidden `Cassie` or pending hidden `Diana`, **zero public logs, zero public badges, and zero candidate lists** are emitted — opponents and Spectators receive zero indication that `Cassie` or `Diana` is in the match!
- Fictional gender eligibility (`character-metadata.ts`) is evaluated strictly server-side only after the target player is publicly revealed (`revealed === true`). Hidden players' gender metadata is never sent to any client.
