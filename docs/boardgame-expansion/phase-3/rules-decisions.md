# Phase 3A — Rules Ratification & Experimental House Rules (Wave 2)

> **Provenance Guarantee:**
> - All 8 Wave 2 characters preserve their **exact `sourceName`, `faction`, `maxHp`, `skillDescription`, `victoryCondition`, and `sourceUrl`** from [`character-catalog.json`](../character-catalog.json).
> - Because every Wave 2 character had at least one ambiguity in [`rules-clarifications.md`](../rules-clarifications.md) (`RC-10`, `RC-12`, `RC-16`, `RC-17`, `RC-18`), their ratified catalog `rulesStatus` is set to **`house-rule-approved`** — **NEVER** promoted to `verified`.
> - These rulings apply **only** to experimental rulesets (`starter-sixteen`, server-controlled) and have **0% impact** on Classic production gameplay.

---

## 1. Global Wave 2 Rules

### 1.1. Location Alias Mapping (Single Source of Truth)
- **`SOURCE_RULE`:** Expansion 1/2 source texts reference Shadow Hunters location names (`"Church"` / #6, `"Weird Woods"` / #9, `"Erstwhile Altar"` / #10).
- **`HUSTVERSE_HOUSE_RULE`:** Canonical 1-to-1 semantic mapping to Bóng Đêm KTX locations:
  - `church` (Church, dice 6) → **`lobby`** (`Sảnh Tầng 1`)
  - `weird_woods` (Weird Woods, dice 9) → **`corridor`** (`Hành Lang Tầng 4`)
  - `erstwhile_altar` (Erstwhile Altar, dice 10) → **`court`** (`Sân Bóng Rổ Đêm`)
- **`OPEN_QUESTION`:** Generic *"same area"* (*"cùng khu vực"*) for future AoE/proximity roles (`Wrath`, `Udi`, `Elise`, `Umibozu`, `Warlord`, `Bryon`) remains deferred to future waves; Wave 2 location roles (`Warlock`, `Witch`, `Father Harrison`, `Gloria`) all specify a **named single location**.
- **`IMPLEMENTATION_DECISION`:** Defined once in [`features/boardgame/domain/rules.ts`](../../../features/boardgame/domain/rules.ts) as `EXPANSION_LOCATION_ALIASES`, `resolveLocationAlias(alias)`, and `isPlayerAtExactLocationAlias(player, alias)`. Named-location handlers strictly check `exact location` (`player.location === resolveLocationAlias(alias)`), NEVER `areInSameCluster(...)`. Classic locations and cluster shuffling are completely untouched.

### 1.2. Reveal Requirement (Global Rule #0)
- **`SOURCE_RULE`:** Classic Shadow Hunters requires characters to be revealed to use special abilities unless the card explicitly allows hidden activation or reveal-on-trigger.
- **`HUSTVERSE_HOUSE_RULE`:** All Wave 2 abilities require `revealed === true`, **except** `exp1_cindy` (`reveal_on_trigger` — hidden Cindy receives a private `isSecret: true` choice to reveal and retaliate when damaged, never auto-revealed).
- **`IMPLEMENTATION_DECISION`:** Enforced via `SkillHandlerDefinition.requiresRevealed` and explicit validation in `USE_SKILL` / `ON_TURN_START` / `ON_MOVE` / `ON_DRAW_CARD`.

### 1.3. Standardized 9-Step Damage Pipeline & Source Taxonomy
- **`SOURCE_RULE`:** Shadow Hunters cards and character abilities interact at distinct points during attacks, equipment modifiers, damage reduction, elimination, and post-damage triggers.
- **`HUSTVERSE_HOUSE_RULE`:** Canonical deterministic damage pipeline for expanded rulesets:
  1. **Server roll** (`d6`/`d4` or `1d4` Masamune; `Fiona` / `Gayle` attack roll choices resolve here).
  2. **Hit / Miss check** (`baseDmg > 0`; a miss of `0` never triggers on-hit attack modifiers like `Unchained`, `Warlock`, `Elysia`, `Victor`).
  3. **Offensive equipment modifiers** (`eq-04` Spear `+2` for revealed Hunter, `ev-02`/`ev-03`/`ev-04` `+1`, attacker's own `eq-01` Holy Robe `-1` → `offensiveDmg`).
  4. **Attacker skill modifiers** (`Unchained` `+2`, `Warlock` `+3` at exact `court`, `Elysia` optional `+2` if `offensiveDmg ∈ {1, 2}` BEFORE defender reduction, `Victor` optional `-1 HP` cost for `+2` on 1 target).
  5. **Defender damage prevention** (`eq-10` Guardian Angel → `eq-02` Fortune Brooch → `eq-03` Talisman → `Witch` immunity at exact `corridor` → defender `eq-01` Holy Robe `-1` → `G43` `-2` on `attack` → `Undying` `-1` if `dmg >= 2` on eligible sources).
  6. **Final HP damage commit** (`actual = min(target.hp, dmg)`), marking `damageEventId` processed.
  7. **Elimination processing** (if `actual > 0 && target.hp <= 0`: reveal, `firstDeadPlayerId`, Daniel Scream, Charles flag, loot, discard, enqueue `ELIMINATION_TRIGGERS` for `Wyvern` & `Wendigo`).
  8. **Post-damage reactions** (`AFTER_DAMAGE`: `Cindy` retaliation if `actual >= 1`, `target.alive`, valid `attackerPlayerId`, non-retaliation & non-hp-cost source; followed by `POST_ATTACK_EFFECTS` for `Vampire` heal & `Werewolf` counterattack).
  9. **Victory evaluation** (`evaluateVictoryWithEngine` including Neutral instant & end-of-match evaluators).
- **Damage Source Taxonomy (`DamageSourceKind`):**
  - `'attack'`: direct attack & Werewolf counterattack.
  - `'skill'`: active character skill damage (George 1d4, Franklin 1d6).
  - `'card'` / `'event'` / `'investigation'`: card-sourced damage (`event` & `investigation` retained for Phase 2 compatibility; `'card'` supported equivalently).
  - `'location'`: Weird Woods / `corridor` (9) location damage.
  - `'retaliation'`: Cindy's Nightmare 1-damage reflection (`isRetaliation: true`, carries `causationId: sourceDamageEventId`, never chains into further retaliation or Werewolf counterattack).
  - `'hp-cost'`: unavoidable HP sacrifice/self-damage (Charles `-2 HP`, Victor `-1 HP`, Bipolar `damage_self` `d4+2`; `isHpCost: true`, `unpreventable: true`, bypasses all shields/armor/Witch/G43/Undying/Cindy).
- **`IMPLEMENTATION_DECISION`:** Every `DAMAGE` step carries a unique monotonic `damageEventId` and optional `causationId`. `processedEventIds` prevents duplicate execution on resume/reconnect/replay.

### 1.4. Timing Side-Channel Audit for Secret Reactions (`Wendigo`, `Undying`, `Cindy`)
- **`OPEN_QUESTION`:** When an unrevealed reactive character (`Wendigo`, `Undying`, `Cindy`) receives a secret choice (`isSecret: true`), public projections scrub `ownerPlayerId = null`, `kind = null`, use generic neutral prompt text, and emit zero log on decline/timeout. However, the presence of a brief wait window itself can leak timing presence to attentive human observers.
- **`IMPLEMENTATION_DECISION`:** We keep the strict payload/log/error scrubbing in Phase 3 and share one neutral public prompt across damage reactions (`Undying` and `Cindy`) without inserting artificial 12-second dummy delays on every non-reactive damage event (which would severely degrade real-time UX). A future opt-in **Private Pre-Arm Auto-Reaction Toggle** is logged in [`remaining-risks.md`](./remaining-risks.md) for Phase 4.

---

## 2. Per-Character Ratification Decisions (8 Wave 2 Roles)

### 2.1. Elysia (`exp1_elysia`) — Hunter, 10 HP — *Phản Công*
- **`SOURCE_RULE`:** *"Nếu bạn tấn công thành công gây sát thương nhỏ hơn 3, bạn có thể tăng thêm 2 sát thương."* (`RC-18`)
- **`HUSTVERSE_HOUSE_RULE`:**
  - Must be revealed (`must_be_revealed`).
  - Only applies on a successful hit (`baseDmg > 0`).
  - Eligibility is evaluated on **offensive attack damage AFTER offensive equipment modifiers and BEFORE defender damage prevention** (`offensiveDmg === 1 || offensiveDmg === 2`).
  - Does NOT trigger on miss (`baseDmg === 0`) or when offensive damage is `0` (e.g. `baseDmg = 1` with attacker's own Holy Robe `-1` → `0`) or `>= 3` (e.g. `baseDmg = 1` + revealed Hunter Spear `+2` → `3`).
  - Player chooses whether to activate (`boost` → `+2` outgoing attack damage) or skip (`skip`, default on timeout).
  - At most once per attack; NEVER re-evaluated after defender reductions (`G43`, `Holy Robe`, `Undying`).
- **`OPEN_QUESTION`:** Whether physical tabletop printings intended `< 3` before or after offensive weapons. Resolved cleanly by house rule above.
- **`IMPLEMENTATION_DECISION`:** `BEFORE_DAMAGE` handler (`exp:exp1_elysia:counterattack`, priority 4) checked once in `enqueueAttackResolution` (`elysiaChecked` guard), opening non-secret `PendingChoice` (`kind: 'elysia_counter_boost'`, `defaultOptionId: 'skip'`).

### 2.2. Unchained (`exp2_unchained`) — Shadow, 11 HP — *Bạo Lực Vô Tận*
- **`SOURCE_RULE`:** *"Khi nhân vật này đã lộ diện, bạn gây thêm 2 sát thương khi tấn công."* (`RC-18`)
- **`HUSTVERSE_HOUSE_RULE`:**
  - Must be revealed (`must_be_revealed`).
  - Applies ONLY when attack hits (`baseDmg > 0`); does NOT turn a miss (`0`) into a 2-damage hit.
  - Adds passive `+2` to outgoing attack damage before defender prevention.
  - Does NOT apply to cards, skills, location effects, or non-attack damage.
  - Applied exactly once per damage instance; with multi-target (`Machine Gun`), adds `+2` once per valid attacked target (never doubled on a single target).
  - `G43` is NOT altered to boost Unchained.
- **`OPEN_QUESTION`:** Whether source text *"khi tấn công"* meant hits-only or including misses; hits-only adopted as standard Shadow Hunters combat convention.
- **`IMPLEMENTATION_DECISION`:** `BEFORE_DAMAGE` handler (`exp:exp2_unchained:endless-violence`, priority 3) invoked once in `enqueueAttackResolution` (`outgoingModifiersApplied` flag prevents re-application on pending-choice resume).

### 2.3. Warlock (`exp2_warlock`) — Shadow, 14 HP — *Nguồn Lực*
- **`SOURCE_RULE`:** *"Đòn tấn công thành công của bạn sẽ gây thêm 3 sát thương nếu bạn đang đứng ở 'Erstwhile Altar'."* (`RC-10`, `RC-17`)
- **`HUSTVERSE_HOUSE_RULE`:**
  - Must be revealed (`must_be_revealed`).
  - `Erstwhile Altar` maps to exact location `court` via `isPlayerAtExactLocationAlias(actor, 'erstwhile_altar')`. Standing at the paired location in the same cluster does NOT qualify.
  - Attack must hit (`baseDmg > 0`); adds passive `+3` outgoing attack damage before defender prevention.
  - Does NOT apply to cards, skills, or location effects; NEVER re-applied on pending-choice resume or reconnect.
- **`OPEN_QUESTION`:** None remaining under Location Alias house rule.
- **`IMPLEMENTATION_DECISION`:** `BEFORE_DAMAGE` handler (`exp:exp2_warlock:power-source`, priority 4) inside `enqueueAttackResolution` (`outgoingModifiersApplied` guard).

### 2.4. Witch (`exp2_witch`) — Shadow, 14 HP — *Không Nơi Đâu Bằng Nhà*
- **`SOURCE_RULE`:** *"Bạn không nhận sát thương khi đang ở trong 'Weird Woods'."* (`RC-10`, `RC-17`)
- **`HUSTVERSE_HOUSE_RULE`:**
  - Must be revealed (`must_be_revealed`).
  - `Weird Woods` maps to exact location `corridor` via `isPlayerAtExactLocationAlias(target, 'weird_woods')`.
  - Prevents all HP damage (`damageAmount = 0`) from `attack`, `skill`, `card`/`event`/`investigation`, `location` (including `corridor`'s own power-9 damage), and `retaliation` while Witch stands at `corridor`.
  - Does NOT prevent `hp-cost` or `unpreventable` damage.
  - Does NOT block non-HP effects (steal, clue reveal, etc.); leaving `corridor` immediately ends immunity; does NOT heal or alter max HP.
  - Position is evaluated against server-committed `target.location` at damage resolution time.
- **`OPEN_QUESTION`:** Whether self-damage from `hp-cost` effects would be blocked; explicitly excluded by house rule.
- **`IMPLEMENTATION_DECISION`:** `BEFORE_DAMAGE` handler (`exp:exp2_witch:no-place-like-home`, priority 15 — before Holy Robe/G43/Undying) inside `executeDamageStep`, setting `damageAmount = 0` and `stopPropagation = true`. Also mirrored in `predictExpectedAttackDealt` so Bob's `>= 2` expected-damage steal check respects 0 expected damage.

### 2.5. Father Harrison (`exp2_father_harrison`) — Hunter, 12 HP — *Lễ Ngày Chủ Nhật*
- **`SOURCE_RULE`:** *"Khi di chuyển, bạn có thể chọn di chuyển vào 'Church' (Nhà thờ) thay cho đổ xí ngầu."* (`RC-10`, `RC-17`)
- **`HUSTVERSE_HOUSE_RULE`:**
  - Must be revealed (`must_be_revealed`).
  - In `ROLL_MOVE` phase (before rolling move dice, `consecutiveSameZoneRolls === 0`), may choose either normal `ROLL_DICE` OR `USE_SKILL` to move directly to exact `lobby` (`resolveLocationAlias('church')`).
  - Prohibited if already standing at `lobby` (cannot stay in place to farm White cards infinitely).
  - Strictly one valid move per turn; transitions directly to `LOCATION_ACTION` so `lobby`'s White-card draw resolves at most once; respects all turn/hand/Masamune constraints.
  - On disconnect/turn timeout in `ROLL_MOVE`, neutral auto-turn rolls dice normally.
- **`OPEN_QUESTION`:** Whether tabletop allows staying at Church; explicitly disallowed to prevent infinite White-deck farming.
- **`IMPLEMENTATION_DECISION`:** `ON_MOVE` handler (`exp:exp2_father_harrison:sunday-service`, priority 10) invoked through `applyExpandedUseSkill` (mirroring Classic Lan `gac-truc-ban` ergonomics). `roles.ts` sets `targetMode: 'self'` for `exp2_father_harrison`.

### 2.6. Gloria (`exp2_gloria`) — Hunter, 14 HP — *Phước Lành Mạnh Mẽ*
- **`SOURCE_RULE`:** *"Lấy 2 thẻ trắng thay vì 1 khi đi vào khu vực 'Church' (Nhà thờ)."* (`RC-10`, `RC-17`)
- **`HUSTVERSE_HOUSE_RULE`:**
  - Must be revealed (`must_be_revealed`).
  - Triggers when Gloria is at exact `lobby` (`isPlayerAtExactLocationAlias(actor, 'church')`) and draws White (`equipment`) during `LOCATION_ACTION`.
  - Draws up to 2 White cards sequentially in deck order (handling 0, 1, or 2 cards remaining + discard reshuffle); **both** cards resolve normally (NOT pick-1-of-2 like Felicia).
  - Cannot re-trigger in the same movement event (`turnPhase` transitions immediately to `MAIN_ACTION` + per-movement `movementDrawEventId` idempotency guard + `isRecursiveDraw` block).
  - **Sequential Immediate Resolution:** If Card #1 is a consumable requiring target/effect resolution via `USE_CARD`, Card #2 is held in authoritative `expansionState.gloriaQueuedCards` (persisted in SQLite DO) and delivered automatically as soon as Card #1 resolves — preventing simultaneous immediate target prompts and preserving strict order across reconnects and hibernation!
- **`OPEN_QUESTION`:** Exact physical order if Card #1 reshuffles discard; drawing both cards from the deck at entry preserves standard tabletop "draw 2 then resolve one by one" while preventing Card #1 from being redrawn as Card #2.
- **`IMPLEMENTATION_DECISION`:** `ON_DRAW_CARD` handler (`exp:exp2_gloria:mighty-blessing`, priority 12) + `gloriaQueuedCards` authoritative queue drained after `USE_CARD` completion (and cleared/discarded on elimination or forced timeout auto-turn).

### 2.7. Cindy (`exp1_cindy`) — Neutral, 11 HP — *Con Ác Mộng* + Neutral Victory
- **`SOURCE_RULE`:**
  - Skill: *"Khi bạn nhận sát thương, bạn có thể tiết lộ nhân vật (hoặc đã lộ diện) gây lại người tấn công 1 sát thương."* (`RC-16`)
  - Victory: *"Tất cả Neutral chết và bạn còn sống."* (`RC-16`)
- **`HUSTVERSE_HOUSE_RULE`:**
  - **Skill (`AFTER_DAMAGE`):** Triggers ONLY when Cindy actually loses `>= 1` HP (`actual >= 1`) AND survives (`alive === true`), from a source with a valid non-self `attackerPlayerId`, excluding `retaliation` and `hp-cost`.
  - Hidden Cindy receives a private `isSecret: true` `cindy_reveal_retaliate` choice (`defaultOptionId: 'decline'`, zero leak on decline/timeout); revealed Cindy automatically retaliates `1` damage (`sourceType: 'retaliation'`, `isRetaliation: true`, `causationId: sourceDamageEventId`) to the attacker if alive.
  - Each `damageEventId` can be retaliated at most once; `retaliation` damage NEVER triggers Cindy again or Werewolf counterattack (zero infinite loops).
  - **Victory (5P Single-Neutral House Rule):**
    - When other Neutrals exist in the match (`otherNeutrals.length > 0`, e.g. 6P–8P): Cindy wins **immediately** (or co-wins if simultaneous) whenever all other Neutrals are eliminated and Cindy is alive.
    - **5P Single-Neutral Adjustment (explicitly a HUSTVerse house rule, NOT source rule):** When Cindy is the ONLY Neutral from match start (`otherNeutrals.length === 0`), she does **NOT** auto-win at match start; instead she **co-wins** if alive when the match legitimately ends.
- **`OPEN_QUESTION`:** Original physical card behavior in 5P (1-Neutral) tables is unspecified in source review; documented clearly as experimental house rule above.
- **`IMPLEMENTATION_DECISION`:** `AFTER_DAMAGE` handler (`exp:exp1_cindy:nightmare`, priority 10) queued via `AFTER_DAMAGE_TRIGGERS` continuation step + `VictoryEngine` evaluator `victory-engine.ts:neutral#cindy`.

### 2.8. Bipolar (`exp1_bipolar`) — Neutral, 10 HP — *Đồng Xu Định Mệnh* + Conditional Victory
- **`SOURCE_RULE`:**
  - Skill: *"Bắt đầu lượt của bạn, bạn có thể chọn hồi máu hoặc nhận sát thương với xúc xắc 4 mặt cộng thêm 2 (từ 3 đến 6). (Chỉ sử dụng 1 lần)"* (`RC-12`)
  - Victory: *"Còn sống khi phe Hunter thắng. Hoặc chết khi phe Shadow thắng."* (`RC-12`)
- **`HUSTVERSE_HOUSE_RULE`:**
  - **Skill (`ON_TURN_START`):** Must be revealed (`must_be_revealed`); `once_per_match` stored in authoritative `player.skillUsedOnce`.
  - Triggers at `ON_TURN_START` (entering Bipolar's turn while revealed, or via `USE_SKILL` strictly in `ROLL_MOVE` before rolling dice if just revealed at start of turn).
  - Player chooses `heal_self`, `damage_self`, or `skip` (`defaultOptionId: 'skip'` — timeout skips without consuming `oncePerMatch` and NEVER auto-damages Bipolar).
  - On `heal_self` or `damage_self`, server authoritatively commits `skillUsedOnce = true` and rolls `d4 + 2` (`3..6`) using Mulberry32 RNG (no roll-peeking exploit via skip!).
  - `heal_self` heals up to `maxHp = 10`; `damage_self` applies unpreventable self-damage (`sourceType: 'hp-cost'`, `isHpCost: true`, `unpreventable: true`, `attackerPlayerId: null`) which bypasses armor/shields/retaliation and **may legally eliminate Bipolar**.
  - **Victory (Conditional End-of-Match):**
    - Bipolar is Neutral (`wanderer`), never a Hunter or Shadow, and never triggers match end alone.
    - Evaluated strictly after primary match winner is resolved: wins iff `(winnerFaction === 'lantern-guard' && bipolar.alive)` OR `(winnerFaction === 'mist-order' && !bipolar.alive)`.
    - If another Neutral wins solo (without Hunter/Shadow victory), Bipolar does **NOT** win.
    - Future simultaneous dual-faction victory (e.g. `Cain` in Wave 4+) will require an explicit policy before enabling such roles.
- **`OPEN_QUESTION`:** Source review's *Ưu điểm* paragraph miswrote *"gây sát thương"* while the card skill text clearly reads *"nhận sát thương"* (`self-damage`), and *Tổng kết* inverted the win condition. Ratified strictly in favor of the character's primary skill & victory spec.
- **`IMPLEMENTATION_DECISION`:** `ON_TURN_START` handler (`exp:exp1_bipolar:fate-coin`, priority 10) + `PendingChoice` (`kind: 'bipolar_fate_coin'`) + `VictoryEngine` evaluator `victory-engine.ts:conditional#bipolar`.
