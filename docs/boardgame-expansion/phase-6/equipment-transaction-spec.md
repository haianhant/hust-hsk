# Bóng Đêm KTX — Authoritative Equipment Theft & Transfer Transaction Specification

- **Module:** [`features/boardgame/domain/equipment-transactions.ts`](../../../features/boardgame/domain/equipment-transactions.ts)
- **Consumers:** `Colt` (`exp2_colt` theft counterattack + atomic item recovery), `Bethany` (`exp1_bethany` turn-start designation & own-turn voluntary transfer), plus existing `court` (Ô 10), `ev-11` (Moody Goblin), `Bob` (robbery), `ev-12` (Banana Peel), `Bryon` (gift).

---

## 1. Transaction Schema (`EquipmentTransferTransaction`)

Every expanded equipment transfer/theft creates an immutable-provenance transaction record stored in `state.expansionState.equipmentTransactions` (bounded to last 64 records, JSON-serializable across SQLite DO hibernation):

```ts
export type EquipmentTransferReason =
  | 'theft-court'        // Genuine theft — Sân Bóng (Ô 10)
  | 'theft-moody-goblin' // Genuine theft — Thẻ Đột Kích ev-11
  | 'theft-bob'          // Genuine theft — Hải "Sưu Tầm" (Bob) robbery on >= 2 dmg
  | 'gift-banana'        // Voluntary/forced gift — ev-12 Banana Peel (NOT theft)
  | 'gift-bryon'         // Voluntary gift — Bryon (NOT theft)
  | 'gift-hermit'        // Hermit probe surrender — inv-01..03 (NOT theft)
  | 'bethany-designate'  // Voluntary gift — Bethany turn-start Chosen designation (NOT theft)
  | 'bethany-offer'      // Voluntary gift — Other player own-turn TRANSFER_TO_BETHANY (NOT theft)
  | 'elimination-loot'   // Post-death loot — victim already dead (NOT living Colt theft)
  | 'colt-reclaim';      // Atomic rollback recovery by Colt

export type EquipmentTransactionStatus =
  | 'pending-reaction'
  | 'committed'
  | 'rolled-back';
```

Each transaction tracks:
- `txId` — Monotonic unique ID (`eqtx-<turn>-<seq>`).
- `idempotencyKey` — Replay/duplicate protection key (`<reason>:<turn>:<from>:<to>:<cardId>:<eventId>`).
- `cardId` — Canonical equipment card ID (`eq-01..eq-06`, `ev-01..ev-06`).
- `fromPlayerId` & `toPlayerId` — Previous owner & intended new owner.
- `reason` & `sourceCardId` — Transfer classification & originating card ID (if any).
- `status` — `'pending-reaction' | 'committed' | 'rolled-back'`.
- `createdTurnNumber`, `createdAtMs`, `resolvedAtMs`, optional `parentTxId`.

---

## 2. Genuine Theft vs Voluntary Transfer Classification

- **`isGenuineTheftReason(reason)`** returns `true` **ONLY** for `'theft-court'`, `'theft-moody-goblin'`, and `'theft-bob'`.
- Voluntary gifts (`'bethany-designate'`, `'bethany-offer'`, `'gift-bryon'`, `'gift-banana'`, `'gift-hermit'`) and post-death `'elimination-loot'` **NEVER** trigger `Colt`'s theft counterattack!
- **Masamune (`ev-01`) Immutability Guard:** Voluntary gift reasons (`'bethany-designate'`, `'bethany-offer'`, `'gift-bryon'`) explicitly reject `cardId === 'ev-01'` server-side.

---

## 3. Atomic Conservation & Rollback Invariants (Colt Recovery)

1. **Exact Conservation (Zero Duplication / Zero Destruction):**
   - `executeEquipmentTransferTransaction()` verifies `fromPlayer.equipped.indexOf(cardId) !== -1`, splices **exactly 1 instance**, and appends that exact instance to `toPlayer.equipped`.
   - Total copies of `cardId` across `{fromPlayer.equipped, toPlayer.equipped}` before and after the transaction is strictly invariant.
2. **Idempotency / Replay Protection:**
   - Re-submitting an identical `idempotencyKey` returns `{ ok: false, reason: 'duplicate-transaction' }` without moving any card a second time.
3. **Colt Atomic Reclaim (`reclaimStolenEquipmentTransaction`):**
   - When a genuine theft hits a **revealed, alive Colt**, the transaction enters `status: 'pending-reaction'` and enqueues `COLT_THEFT_COUNTER`.
   - If Colt skips, misses, deals `< 2` dmg, or chooses `deal_damage`: `commitEquipmentTransaction(state, txId, nowMs)` transitions `status` to `'committed'`.
   - If Colt deals `>= 2` dmg and chooses `recover_item`: `reclaimStolenEquipmentTransaction(state, txId, nowMs)`:
     1. Verifies `tx.status === 'pending-reaction'` (prevents double rollback!).
     2. Re-validates live ownership (`toPlayer.equipped.includes(tx.cardId)`) and `fromPlayer.alive` (handles reconnects & competing effects safely!).
     3. Atomically splices **1 exact instance** of `tx.cardId` from `toPlayer.equipped` and restores it to `fromPlayer.equipped`.
     4. Marks `tx.status = 'rolled-back'`, records `resolvedAtMs`, and appends an audit `'colt-reclaim'` record linked via `parentTxId: tx.txId`.
     5. Deals **0 damage** to the thief (never grants both damage and recovery!).
4. **Privacy Guarantee:** Equipment transfers operate exclusively on public `equipped[]` slots and **never** read, mutate, or expose `hand[]` contents.
