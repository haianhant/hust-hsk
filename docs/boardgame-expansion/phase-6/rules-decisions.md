# Bóng Đêm KTX — Phase 6 Rules Decisions (`Wave 5 / 10 Tier-3 Characters`)

> **Provenance & Honesty Notice:** All ten target characters entered Phase 6 with `rulesStatus: "needs-clarification"` and unresolved ambiguities tracked in [`../rules-clarifications.md`](../rules-clarifications.md) (`RC-13`, `RC-14`, `RC-15`, `RC-16`, `RC-20`). Every decision below is an **internal experimental HUSTVerse house rule** recorded as `rulesStatus: "house-rule-approved"`. **None of these decisions are represented as verified official Shadow Hunters rules**, and all original source descriptions, source URLs, factions, and max HP values from [`../character-catalog.json`](../character-catalog.json) remain preserved verbatim.

---

## 1. Gideon — `exp2_gideon` (Hunter · 14 HP · Expansion 2)

1. **Original Source Text:**
   - **Skill Name:** `Phần Thưởng Nhiệm Vụ`
   - **Skill Description:** *"Bạn có thể lập tức rút và dùng 3 “Thẻ bài trắng” sau khi một Shadow bị hạ gục."*
   - **Victory Condition:** *"Tất cả Shadow bị tiêu diệt."*
2. **Original Source URL:** `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-hunter-cua-ban-mo-rong-thu-2-p`
3. **Relevant Unresolved Rule References:** `RC-16` (reaction timing, out-of-turn triggers, and per-event usage limit).
4. **Ambiguity & Gameplay Impact:** Source text does not specify whether Gideon must already be revealed, whether another player's Shadow kill qualifies, whether activation is once per match or per Shadow elimination, or how 3 simultaneous White draws handle targeting/choices/deck reshuffle.
5. **Experimental HUSTVerse Interpretation (`house-rule-approved`):**
   - Gideon must be **alive and revealed** when the `ELIMINATION_TRIGGERS` step for a Shadow victim (`victimFactionAtDeath === 'mist-order'`) is processed.
   - **Any** Shadow elimination qualifies (whether killed by Gideon or another player), including out-of-turn eliminations.
   - Activation is **optional** (`PendingChoice` `gideon_draw_white`: activate or skip; timeout defaults to skip).
   - Limit: **once per qualifying Shadow elimination event** (deduplicated by `eliminationEventId`), with **no global once-per-match cap**.
   - **Sequential 3-White-Card Resolution:** On confirmation, queues 3 sequential `GIDEON_DRAW_WHITE_CARD` steps through the existing authoritative card pipeline:
     - Equipment cards (`!card.isConsumable`) equip immediately to Gideon.
     - Consumable White cards resolve immediately one-by-one (opening an authoritative targeting/choice `PendingChoice` when a choice is needed — e.g. `eq-08` Blessing target, `eq-09` First Aid target, `eq-13` Advent reveal/heal, `eq-14` Chocolate, or direct resolution for `eq-07` Holy Water, `eq-10` Guardian Angel, `eq-11` Flare, `eq-12` Mystic Compass/Mirror, `eq-15` Concealed Knowledge).
     - Each card finishes its immediate effect (and any triggered sub-steps) before the next White card is drawn.
     - Empty White deck automatically reshuffles from `discards.equipment`; if both deck and discard are exhausted, remaining draws terminate cleanly.
   - **Never** triggers on replayed elimination events or end-of-match final disclosure.
   - Explicitly **NOT** implemented as a damage-redirection character.
6. **Server Event Ordering:** Runs inside `ELIMINATION_TRIGGERS` (after `Wyvern`, `Vengeance`, `Wendigo`) before victory evaluation, EXCEPT if all Shadows are already eliminated and match victory triggers immediately? Wait: check carefully! If a Shadow dies and another Shadow still lives, Gideon resolves 3 White cards immediately before play resumes; if the **last** Shadow just died, Hunter victory triggers after `ELIMINATION_TRIGGERS` finishes (or if Gideon opts to resolve before finalization, `ELIMINATION_TRIGGERS` always runs before `finalizeIfFinished` per Wave 1–4 invariant, while Gideon cannot change the fact that all Shadows are dead — still, if `allShadowsDead` already holds and no immediate Neutral overrides exist, resolving Gideon's draws before `finalizeIfFinished` lets White cards like Flare or First Aid potentially affect end-of-match Neutral states like Bianca/Dalton/Angel cleanly and consistently with `Wendigo`!).
7. **Victory Semantics:** Standard Hunter team victory (`faction#hunters`: all Shadows eliminated).
8. **Privacy Risks:** Low — Gideon must already be revealed before prompting (`isSecret: false`). No hidden role identity is exposed. Drawn consumable choices never expose other players' hidden roles.
9. **Edge Cases & Tests:** Gideon kills Shadow; another player kills Shadow (out of turn); multiple Shadows eliminated in one AoE (`Flare`/`Dynamite`/`Wrath`); Gideon dies in same batch (must NOT trigger); sequential healing/equipment/Flare resolution; Gloria/Felicia non-interference; reconnect mid-3-card sequence; empty White deck reshuffle & total deck exhaustion; duplicate `eliminationEventId` idempotency.
10. **Future Official-Rule Review Required:** **YES** — confirm whether official fan/localized rules restrict Gideon to own kills only or allow hidden reveal-on-trigger.

---

## 2. Anathema — `exp1_anathema` (Neutral · 8 HP · Expansion 1)

1. **Original Source Text:**
   - **Skill Name:** `Lời nguyền`
   - **Skill Description:** *"Vào đầu lượt của bạn, bạn có thể lộ diện và chọn một người khác để nhận sát thương thay cho mình đến hết trò chơi. (Chỉ sử dụng 1 lần). Khi bạn lộ diện, nhận 1 sát thương vào cuối lượt đó."*
   - **Victory Condition:** *"Bạn không chết khi trò chơi kết thúc."*
2. **Original Source URL:** `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-2-sha`
3. **Relevant Unresolved Rule References:** `RC-20` (turn-start reveal cost interaction with curse, cursed target elimination, AoE & redirection loops).
4. **Ambiguity & Gameplay Impact:** Unclear whether the 1 end-of-turn damage redirects to the cursed victim, whether Anathema can retarget after the victim dies, and how AoE or Arnold interacts with redirection.
5. **Experimental HUSTVerse Interpretation (`house-rule-approved`):**
   - **Once per match**, at the start of Anathema's own turn (`ON_TURN_START` while unrevealed OR via turn-start `USE_SKILL` before moving when unrevealed; also offered as an optional turn-start prompt if unrevealed? Wait: **Privacy check!** If we prompted an *unrevealed* Anathema at turn start automatically, that would open a secret turn-start prompt every turn and leak Anathema! Instead, an unrevealed Anathema activates `"Lời nguyền"` voluntarily via `USE_SKILL` during `ROLL_MOVE` at the start of their own turn — identical to how `Eleanor`/`Ernest`/`Angel` activate without leaking when hidden! And when clicked during `ROLL_MOVE`, opens `anathema_curse_target` choice to pick 1 other living player, immediately revealing Anathema and binding the curse! That eliminates turn-start timing side channels completely!).
   - Persists `anathemaCurses[anathemaId] = { targetPlayerId, activatedOnTurnNumber, active: true, endTurnSelfDamageApplied: false }`, sets `skillUsedOnce = true`.
   - While active and cursed target is alive, all **eligible incoming HP damage** targeting Anathema redirects via `CAP-06 DamageRedirection` to the cursed target (resolving through the cursed target's full defense pipeline: Angel, Guardian Shield, Witch, Holy Robe, G43, Undying, Bianca, Arnold).
   - **Excluded from redirection:** self-inflicted HP costs (`isHpCost`) and explicitly `unpreventable` damage.
   - **End-of-activation-turn cost:** At the end of the turn on which Anathema activated the curse (`activatedOnTurnNumber === state.turnNumber`), Anathema directly receives **1 unpreventable direct self-damage** (`sourceType: 'hp-cost'`, `isHpCost: true`, `unpreventable: true`, `attackerPlayerId: null`) — NEVER redirected to the cursed target!
   - When the cursed target dies, the curse terminates permanently (`active: false`); Anathema cannot retarget and takes subsequent damage normally.
   - Bounded visited-set loop guard prevents any recursive bounce (including Anathema ↔ Arnold).
6. **Server Event Ordering:** Curse binding during `ROLL_MOVE` (turn start) → triggers `ROLE_REVEALED_TRIGGERS` (`Umibozu`, `Cassie`, `Diana`, `Aaron`) → damage redirection runs at the start of `executeDamageStep` (before defense mitigation on Anathema) → end-of-turn 1 direct damage executes during `END_TURN` / turn finalization before advancing turn.
7. **Victory Semantics:** End-of-match survival (`individual` / co-winner at valid match end if `anathema.alive === true`; does not prematurely end the match solo unless sole survivor).
8. **Privacy Risks:** Zero leak before activation because activation is an active `ROLL_MOVE` skill button (no automatic secret prompt every turn). After activation, Anathema is revealed (`revealed === true`) and the cursed target badge is public by rule design.
9. **Edge Cases & Tests:** Redirect normal attack; redirect card & skill damage; cursed target dies (curse ends, no retarget); cursed target is Arnold (Arnold reflects lethal redirected dmg to original attacker, never loops back); AoE (`Flare`/`Dynamite`/`Wrath`) hitting both Anathema and cursed target; end-of-turn 1 direct self-dmg (even lethal if Anathema at 1 HP); recursion guard; survival victory & death loss.
10. **Future Official-Rule Review Required:** **YES** — confirm whether an already-revealed Anathema (e.g. via external reveal) may still cast the curse once at turn start, and whether 1 self-dmg applies on any reveal or only skill reveal. (In our experimental rule: Anathema may activate once at turn start whether unrevealed or already revealed, and the 1 direct end-of-turn self-dmg applies on the turn the curse is activated.)

---

## 3. Bethany — `exp1_bethany` (Neutral · 10 HP · Expansion 1)

1. **Original Source Text:**
   - **Skill Name:** `Thay đổi vận mệnh`
   - **Skill Description:** *"Bắt đầu lượt của bạn, bạn có thể chọn Người được chọn bằng cách cho họ 1 Trang bị. Tất cả mọi người có thể cho bạn 1 Trang bị để trở thành Người được chọn. Chỉ có 1 người được chọn tại thời điểm đó."*
   - **Victory Condition:** *"Người được chọn thắng."*
2. **Original Source URL:** `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-2-sha`
3. **Relevant Unresolved Rule References:** `RC-20` (legal transfer window for other players, Masamune restriction, survival requirement, zero-Chosen outcome, dependency cycles).
4. **Ambiguity & Gameplay Impact:** Unclear when other players may gift equipment to Bethany, whether Masamune can be given away, whether Bethany must survive, and how Bethany interacts with Diana/Cassie/Clairvoyant cycles.
5. **Experimental HUSTVerse Interpretation (`house-rule-approved`):**
   - Bethany must be **revealed** (`revealed === true`).
   - **Turn-Start Designation:** At the start of Bethany's own turn (`ON_TURN_START` while revealed & owning `>= 1` non-Masamune equipped item, or via `USE_SKILL` during `ROLL_MOVE`), Bethany may give 1 eligible equipped item (`cardId !== 'ev-01'`) to any other living player via `bethany_designate_chosen` (`EquipmentTransferTransaction` reason `'bethany-designate'`) to designate that player as Chosen.
   - **Other Players' Voluntary Transfer Window:** Any other living player, during **their own active turn** (`turnPhase === 'LOCATION_ACTION'` or `'MAIN_ACTION'`, `hand.length === 0`, no active `pendingChoice`), when Bethany is alive and revealed, may issue server-validated action `TRANSFER_TO_BETHANY` (`{ type: 'TRANSFER_TO_BETHANY', targetPlayerId: bethanyId, cardId }`) transferring 1 eligible equipped item (`cardId !== 'ev-01'`) via `EquipmentTransferTransaction` reason `'bethany-offer'` to become the new Chosen.
   - **Masamune (`ev-01`) cannot be transferred** in either direction.
   - **Single Active Chosen:** Each valid designation overwrites the previous `chosenPlayerId` atomically.
   - **Server-Side Authority:** Ownership, turn ownership, phase, alive/revealed status, and non-Masamune constraint are strictly enforced server-side. Arbitrary remote transfers outside active own-turn windows are rejected.
   - **Victory (`SHARE_OUTCOME`):** Bethany qualifies as a co-winner when the current `chosenPlayerId` qualifies as a winner via `CopiedVictoryGraph` (`SHARE_OUTCOME`, **not** `COPY_GOAL`). No additional survival requirement is imposed on Bethany. If no Chosen exists at match end, Bethany does not qualify.
6. **Server Event Ordering:** Transfer executes atomically through `equipment-transactions.ts` (never triggers Colt theft counterattack because reason is voluntary `'bethany-designate'` / `'bethany-offer'`, not genuine theft!) → updates `bethanyChosenByPlayer[bethanyId]` → triggers `finalizeIfFinished` (e.g., if transfer grants Bob 5th item or Colt 3rd weapon!).
7. **Victory Semantics:** `SHARE_OUTCOME` in `CopiedVictoryGraph` (transitive; cycle-safe fail-closed; death-based Chosen victory counts even if Bethany or Chosen died).
8. **Privacy Risks:** Low — requires revealed Bethany (`revealed === true`). Public badge `bethanyChosenTargetByPlayer` only appears when Bethany is revealed. Zero leak of hidden roles.
9. **Edge Cases & Tests:** Designation & replacement; ownership validation & no duplication; Masamune rejection; out-of-turn / wrong-phase rejection; Chosen wins as Hunter/Shadow/Neutral; dead Chosen wins via death-based condition (Daniel/Arlene/Bipolar); dead Bethany co-wins when Chosen wins; Bethany ↔ Diana cycle fails closed; 0 Chosen loses; reconnect persistence.
10. **Future Official-Rule Review Required:** **YES** — confirm whether Bethany may also accept gifts while dead or whether other players may gift before rolling dice.

---

## 4. Arnold — `exp1_arnold` (Neutral · 8 HP · Expansion 1)

1. **Original Source Text:**
   - **Skill Name:** `Số phận thay đổi`
   - **Skill Description:** *"Khi bạn nhận sát thương và chết, thay vào đó, bạn sẽ không chết và chuyển toàn bộ số sát thương kết liễu cho người đã gây cho bạn. (Chỉ sử dụng 1 lần)."*
   - **Victory Condition:** *"Bạn còn sống và trên bàn chơi có nhiều hơn 2 người khi trò chơi kết thúc."*
2. **Original Source URL:** `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-2-sha`
3. **Relevant Unresolved Rule References:** `RC-16` (HP preservation after reflection, source-less damage handling, reflection loops, hidden P0 privacy).
4. **Ambiguity & Gameplay Impact:** Unclear what Arnold's HP is after reflecting lethal damage, what happens when damage has no living attacker (e.g., self-damage or unattributed hazard), and how Arnold interacts with Anathema/Arnold/Cindy.
5. **Experimental HUSTVerse Interpretation (`house-rule-approved`):**
   - Triggers inside `executeDamageStep` **after** defense mitigation (Angel, Guardian Shield, Witch, Holy Robe, G43, Undying, Bianca) and **immediately before** HP commit when `postMitigationDmg >= arnold.hp` (would eliminate Arnold).
   - **Requires:** `!arnold.skillUsedOnce`, `!step.isHpCost`, `!step.unpreventable`, `!step.isArnoldReflection`, valid **living** `attackerPlayerId` (`attackerPlayerId !== arnold.playerId`), and `attackerPlayerId` not already in `redirectChain` (`redirectDepth < MAX_REDIRECT_CHAIN_DEPTH`).
   - **Hidden vs Revealed Choice:**
     - If Arnold is unrevealed: opens an owner-only **secret** `PendingChoice` (`kind: 'arnold_reflect_lethal'`, `isSecret: true`, respecting `SET_REACTION_PREF`: `AUTO_DECLINE` skips silently; `ASK` prompts owner with masked public payload; **NOT** added to `AUTO_ACTIVATE_WHEN_ELIGIBLE` unless explicitly safe, wait — Section 6 states *"Do not automatically add new multi-step reactions to the safe binary auto-activation allowlist."* Arnold is kept OUT of `BINARY_SECRET_REACTION_ROLES` so `ASK` prompts owner explicitly and `AUTO_DECLINE` silently declines!).
     - If Arnold is already revealed: opens non-secret `arnold_reflect_lethal` choice (`isSecret: false`).
   - **On Activation:**
     - Marks `arnold.skillUsedOnce = true` atomically (and reveals Arnold if unrevealed, emitting `ROLE_REVEALED_TRIGGERS`).
     - Cancels lethal damage to Arnold (`actual = 0`), **preserving Arnold's exact HP from immediately before that damage event**.
     - Enqueues **one linked `DAMAGE` event** (`causationId: step.damageEventId`, `rawAmount: postMitigationDmg`, `attackerPlayerId: arnold.playerId`, `targetPlayerId: origAttackerId`, `sourceType: 'skill'`, `isSingleTarget: true`, `isArnoldReflection: true`, `redirectChain: [...visited, origAttackerId]`, `redirectDepth: depth + 1`).
   - **No Valid Attacker / Decline / Timeout:** Resolves the original lethal damage normally.
   - **Victory:** End-of-match survival with **strictly more than 2 total living players** (`arnold.alive && alivePlayers.length > 2`, i.e., `>= 3` living players at match end).
6. **Server Event Ordering:** Defense Mitigation → Arnold Lethal Check (CAP-06) → on activate: reveal (if hidden) + mark `skillUsedOnce` + enqueue linked reflected `DAMAGE` step (which runs through the attacker's own defenses and can trigger Cindy retaliation if Cindy survives, or eliminate the attacker!) → continue remaining steps.
7. **Victory Semantics:** End-of-match individual/co-win (`arnold.alive && alivePlayers.length > 2`).
8. **Privacy Risks:** Secret P0 reaction when hidden: `ownerPlayerId: null`, `kind: null`, uniform normalized `publicDeadlineMs`, neutral error on non-owner probing, zero public log on decline/timeout. Residual timing pause when keeping `ASK` is documented honestly in `privacy-security-report.md`.
9. **Edge Cases & Tests:** Lethal attack; lethal attributable card (`Vampire Bat`/`Spider`/`Dynamite`/`Spiritual Doll`); unattributed / self-inflicted damage (does NOT trigger); HP strictly preserved; attacker eliminated by reflection; Arnold vs Arnold (blocked by `isArnoldReflection`); Arnold vs Anathema (blocked by `redirectChain` visited set); Arnold vs Cindy (Cindy retaliates 1 dmg if alive); DO hibernation mid-reaction; duplicate choice replay; victory with 3 living players vs loss with 2 living players.
10. **Future Official-Rule Review Required:** **YES** — confirm whether Arnold keeps pre-event HP or drops to 1 HP, and whether source-less Dynamite cast by another player counts as having an attributable attacker (HUSTVerse attributes Dynamite to its caster `actor`, which is attributable; self-inflicted Spider/Banana/Anathema cost has `attacker = null`).

---

## 5. Cassie — `exp1_cassie` (Neutral · 11 HP · Expansion 1)

1. **Original Source Text:**
   - **Skill Name:** `Cuộc tình dị thường`
   - **Skill Description:** *"Bắt đầu lượt của bạn, hồi 1 máu cho 1 người bất kỳ."*
   - **Victory Condition:** *"Giống với Neutral lộ diện trước."*
2. **Original Source URL:** `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-2-sha`
3. **Relevant Unresolved Rule References:** `RC-20` (reveal requirement for heal, binding trigger exclusion of death/final reveal, 5P sole-Neutral handling, `COPY_GOAL` vs `SHARE_OUTCOME`).
4. **Ambiguity & Gameplay Impact:** Unclear whether Cassie must be revealed to heal, whether death reveal binds her victory goal, what happens in 5P when Cassie is the sole Neutral, and whether she copies the goal or shares the winner outcome.
5. **Experimental HUSTVerse Interpretation (`house-rule-approved`):**
   - **Heal Skill:** Cassie must be **revealed**. At the start of each of Cassie's own turns (`ON_TURN_START`), opens optional `cassie_turn_heal` choice to heal **1 HP** for any living player (including self) routed strictly through **`HealPipeline`** (`sourceKind: 'skill'`, respecting max HP, Dalton self-heal lock, and Usurper heal block!).
   - **Copied Goal Binding (`COPY_GOAL`):** Automatically monitors authoritative `ROLE_REVEALED_TRIGGERS` for the **first OTHER Neutral** (`faction === 'wanderer'`, `playerId !== cassie.playerId`) revealed during **normal gameplay** (`wasAliveBeforeReveal && !isDeathReveal && !isFinalMatchDisclosure`).
   - Binds `cassieCopiedGoalByPlayer[cassieId]` **once** (immutable — never rebinds to later revealed Neutrals, even if the bound Neutral dies).
   - Evaluates the copied role's victory condition via **`CopiedVictoryGraph` (`COPY_GOAL`)** against **Cassie's own state** (Cassie's HP, alive status, equipped cards, kills, etc.), WITHOUT changing Cassie's faction or identity.
   - If the copied role itself has a linked or copied victory (e.g. Bethany, Diana, Clairvoyant), `CopiedVictoryGraph` evaluates it transitively with cycle detection failing closed.
   - If **no other Neutral** is ever revealed in normal gameplay (including all 5P matches where Cassie is the only Neutral), Cassie's copied goal remains **unresolved** and is **never auto-fulfilled**.
6. **Server Event Ordering:** Normal gameplay reveal emits `ROLE_REVEALED_TRIGGERS` → Cassie binding records `sourceRoleId` & `boundEventId` internally without leaking Cassie's own hidden identity if Cassie is still unrevealed! → Turn-start heal runs in `triggerExpandedTurnStart` when Cassie is revealed.
7. **Victory Semantics:** `COPY_GOAL` via `CopiedVictoryGraph` (supports both immediate copied goals like Bob/Colt/Cindy and end-of-match goals like Allie/Arnold/Bianca/Angel).
8. **Privacy Risks:** CRITICAL — Cassie binds passively when another Neutral reveals, even while Cassie herself is STILL UNREVEALED! Therefore binding MUST NOT emit any public log, public badge, or public event revealing that Cassie exists in the match! Cassie sees her bound goal ONLY in her own `privateView`.
9. **Edge Cases & Tests:** Heal self/other; Usurper blocks Cassie's heal; first normal Neutral reveal binds; death-only reveal & final-match disclosure ignored; no rebinding on 2nd Neutral reveal; 5P sole Neutral unresolved (never auto-wins); copying solo Neutral (Bob/Colt/Cindy) evaluated on Cassie's own state vs target's outcome; copying shared Neutral (Bethany/Diana); copying unresolved Clairvoyant; dependency cycle fails closed; reconnect persistence.
10. **Future Official-Rule Review Required:** **YES** — confirm whether official rules provide a 5P fallback condition for Cassie or exclude Cassie from 5P dealing.

---

## 6. Clairvoyant — `exp1_clairvoyant` (Neutral · 11 HP · Expansion 1)

1. **Original Source Text:**
   - **Skill Name:** `Lời tiên tri`
   - **Skill Description:** *"Vào đầu lượt, bạn có thể chọn một người chưa lộ diện để xem thẻ nhân vật của họ, sau đó bạn sẽ có điều kiện thắng giống họ. (Chỉ sử dụng 1 lần)."*
   - **Victory Condition:** *"Sau khi kỹ năng kích hoạt thì mới có điều kiện thắng."*
2. **Original Source URL:** `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-2-sha`
3. **Relevant Unresolved Rule References:** `RC-20` (reveal requirement, owner-only privacy isolation, no-target case, unresolved copied goals, cycle handling).
4. **Ambiguity & Gameplay Impact:** Must strictly prevent any leak of the inspected target's hidden role to other players/spectators/logs/VFX while letting Clairvoyant evaluate the copied victory goal authoritatively.
5. **Experimental HUSTVerse Interpretation (`house-rule-approved`):**
   - Clairvoyant must **reveal before activating** (`revealed === true`), **once per match**, during own turn-start skill window (`ON_TURN_START` prompt `clairvoyant_peek_copy` or `USE_SKILL` during `ROLL_MOVE`).
   - Selects **one other living unrevealed player** (`alive && !revealed && playerId !== clairvoyant.playerId`).
   - If all other living players are already revealed, the skill is unavailable (no free second selection, no targetless win).
   - Server records private inspection result in `expansionState.clairvoyantVisions[clairvoyantId]` and projects it **EXCLUSIVELY** into `privateView.clairvoyantReveals` and `privateClues` for Clairvoyant's owner socket.
   - Public log records ONLY a neutral message (`"🔮 Clairvoyant (...) đã sử dụng Lời Tiên Tri lên <targetName>."`) — **NEVER** exposing target role ID, role name, faction, max HP, copied goal text, or card metadata!
   - Target remains **unrevealed publicly** (`target.revealed` unchanged).
   - Binds `COPY_GOAL` link in `CopiedVictoryGraph` with immutable `sourceRoleId: target.roleId`.
   - **No faction change** (Clairvoyant stays `wanderer`), **no skill copy**, **no second target**.
   - If target is Hunter: Clairvoyant copies Hunter team victory (`huntersWon`). If target is Shadow: copies Shadow team victory (`shadowsWon`). If target is Neutral: evaluates that Neutral's victory goal against **Clairvoyant's own state** (or transitively via `CopiedVictoryGraph` if target's goal is linked/copied; unresolved goals remain unresolved and cycles fail closed).
6. **Server Event Ordering:** Turn-start `clairvoyant_peek_copy` → marks `skillUsedOnce = true` → writes owner-only `clairvoyantVisions` + `privateClues` + `VictoryDependencyLink` → emits neutral public log → re-evaluates immediate victory (in case Clairvoyant already satisfies an immediate copied goal like 5 equipped items for Bob, though never revealing the target's role before match end!).
7. **Victory Semantics:** `COPY_GOAL` via `CopiedVictoryGraph`. Before activation (or if copied goal is unresolved), Clairvoyant has no fulfilled victory condition.
8. **Privacy Risks:** **P0 CRITICAL** — Target's role must NEVER appear in: other players' `privateView`, Spectator payloads, `publicGame`, `publicLog`, `highlights`, `BG_ERROR` messages, VFX events, or network telemetry. Tested explicitly in Phase 6B & 6D.
9. **Edge Cases & Tests:** Correct private role data for owner; zero leak to target/opponents/spectators/public logs; wrong-owner `RESOLVE_CHOICE` rejected; copy Hunter/Shadow/Neutral goals; copy another copied goal (`Cassie` resolved & unresolved); cycle detection; reconnect restores owner `privateView.clairvoyantReveals`; all others revealed (skill unavailable); duplicate request idempotency.
10. **Future Official-Rule Review Required:** **YES** — confirm whether unrevealed Clairvoyant may stay hidden while using the ability in tabletop play.

---

## 7. April & Skipps — `exp2_april_skipps` (Neutral · 8 HP · Expansion 2)

1. **Original Source Text:**
   - **Skill Name:** `Bị Phát Hiện!! Chạy Ngay!`
   - **Skill Description:** *"Bạn phải lộ diện khi máu mình đang ở ô số 7."*
   - **Victory Condition:** *"Không lộ diện nhân vật khi trò chơi kết thúc. Nếu nhân vật bị lộ diện do kỹ năng của mình, thì bạn hãy cố gắng sống sót đến cuối lượt tiếp theo của mình, nếu làm được điều đó bạn sẽ chiến thắng."*
2. **Original Source URL:** `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-neutral-cua-ban-mo-rong-thu-2`
3. **Relevant Unresolved Rule References:** `RC-15` (**wound-track position 7 vs remaining HP 7** — explicitly preserved as unresolved original ambiguity!).
4. **Ambiguity & Gameplay Impact:** Physical Shadow Hunters boards track **wounds taken (`0..14`)** rather than remaining HP; *"ở ô số 7"* on an 8-HP character means `woundsTaken === 7` (`1 HP` remaining), whereas Vietnamese phrasing *"máu ở ô số 7"* can be misread as 7 remaining HP. Moreover, skipping from 6 wounds to 8+ wounds (lethal) bypasses position 7 entirely.
5. **Experimental HUSTVerse Interpretation (`house-rule-approved` — preserving `RC-15` ambiguity explicitly):**
   - Interprets *"ô số 7"* strictly by the **original Shadow Hunters wound-track convention**: `woundsTaken === 7` (i.e., **`hp === 1`** on 8 max HP while `alive === true`).
   - Triggers **once** immediately after any damage (or `First Aid` wound-setting to 7!) lands April & Skipps at `alive && !revealed && woundsTaken === 7`.
   - **Lethal skip:** If damage jumps past 7 wounds directly to death (`woundsTaken >= 8`, `hp <= 0`), the skill does **NOT** retroactively trigger.
   - **Forced Reveal & Countdown:** Forces reveal (`triggerReason: 'skill-forced'`, emits `ROLE_REVEALED_TRIGGERS`), records `aprilSkippsCountdownByPlayer[playerId] = { revealedBySkill: true, triggeredOnTurnNumber: state.turnNumber, triggeredDuringOwnTurn: state.activePlayerId === playerId, targetOwnTurnsCompleted: 0, survivedDeadlineWon: false }`.
   - **Exact Survival Deadline ("end of next OWN turn"):**
     - If triggered during **another player's turn**: April & Skipps must survive until the **end of April & Skipps's next own turn** (the 1st own turn that concludes after trigger).
     - If triggered during **April & Skipps's own turn** (e.g., Werewolf counterattack or Spider self-dmg on own turn): *"cuối lượt tiếp theo của mình"* means the **end of their NEXT own turn** (after the current turn ends and the table cycles back to finish April & Skipps's next full turn — i.e., `state.turnNumber > triggeredOnTurnNumber` when April & Skipps completes their own turn!).
     - If April & Skipps is **alive** at that deadline (`END_TURN` / turn completion of that own turn, even if healed above 1 HP in the meantime!), sets `survivedDeadlineWon = true` and triggers **immediate Neutral victory**!
     - If eliminated before the deadline, countdown fails.
   - **Unrevealed End-of-Match Victory:** If April & Skipps is **never revealed** during gameplay (`!revealed`) and is **alive** at valid match end, qualifies as a winner!
   - **Other Reveal Causes:** Voluntary reveal (`REVEAL_ROLE`) or card-forced reveal (`Mirror`/`Chocolate`) does **NOT** grant the countdown survival win (and disqualifies the unrevealed win).
6. **Server Event Ordering:** Post-damage HP update in `executeDamageStep` (or `First Aid` wound-set to 7!) → checks `woundsTaken === 7 && alive && !revealed` → forces reveal + records countdown + enqueues `ROLE_REVEALED_TRIGGERS` → at `END_TURN` of April & Skipps's qualifying next own turn, marks `survivedDeadlineWon = true` → `finalizeIfFinished` awards immediate victory!
7. **Victory Semantics:** Dual-path Neutral (`immediate` on countdown completion OR `end-of-match` if unrevealed & alive).
8. **Privacy Risks:** Low — before reaching 7 wounds, April & Skipps stays completely hidden with zero prompts; forced reveal at 7 wounds is public by rule design.
9. **Edge Cases & Tests:** 0–6 wounds (no trigger); exactly 7 wounds (`1 HP`) triggers; lethal skipping 7 (`6 → 8` wounds) does not trigger; healing after reaching 7 still preserves active countdown; multiple damage instances in one wave; trigger during own turn vs another player's turn; disconnect/reconnect before deadline; voluntary reveal does not grant countdown; victory at next own turn end; match ends before deadline (revealed April does not win).
10. **Future Official-Rule Review Required:** **YES (`RC-15` preserved)** — confirm official board wound-track interpretation vs remaining-HP interpretation in human playtests.

---

## 8. Colt — `exp2_colt` (Neutral · 11 HP · Expansion 2)

1. **Original Source Text:**
   - **Skill Name:** `Công Lý Đường Phố`
   - **Skill Description:** *"Bạn có thể ngay lập tức tấn công bất cứ nhân vật nào đang cướp trang bị từ bạn. Nếu bạn gây được 2 thiệt hại trở lên bằng cách này, bạn có thể chọn lấy lại vật phẩm đó thay vì gây sát thương."*
   - **Victory Condition:** *"Sở hữu từ 3 trang bị trở lên có tên: \"Butcher Knife\", \"Chainsaw\", \"Handgun\", hoặc \"Rusted Broad Axe\"."*
2. **Original Source URL:** `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-neutral-cua-ban-mo-rong-thu-2`
3. **Relevant Unresolved Rule References:** `RC-16` (remote theft range handling, weapon ID canonical mapping, reveal requirement, non-recursion, atomic recovery).
4. **Ambiguity & Gameplay Impact:** Unclear whether Colt must be revealed, how remote theft (`court`, `Moody Goblin`) interacts with attack range, and how Vietnamese card titles map to the 4 English weapon names.
5. **Experimental HUSTVerse Interpretation (`house-rule-approved`):**
   - Colt must be **alive and revealed** to activate the theft reaction.
   - Triggers ONLY from a **genuine equipment-theft transaction** (`isGenuineTheftReason`: `'theft-court'` Sân Bóng Ô 10, `'theft-moody-goblin'` `ev-11`, or `'theft-bob'` Bob's 2+ damage steal) where `fromPlayerId === colt.playerId` and thief is alive. Voluntary transfers (`Banana Peel`, `Bryon`, `Bethany`) and death loot do NOT trigger Colt.
   - Opens `colt_theft_counter` choice (`isSecret: false`, optional: counterattack or skip; timeout defaults to skip).
   - **Special Counterattack:** Ignores ordinary range limitations (Cluster / Handgun restriction) caused by remote theft, rolls normal attack dice server-side (applying Colt's weapon modifiers & Masamune/Fallen/etc., single-target against the thief only — no Machine Gun AoE splash on counterattack, `isRetaliatoryAttack: true` so it NEVER chains recursive counterattacks like Gwendolen/Werewolf!).
   - **Damage `>= 2` Branch:** If resulting calculated damage (after attack roll + Colt's modifiers, before committing HP) is **`>= 2`**:
     - Opens `colt_recover_or_damage` choice for Colt:
       1. **`recover_item`:** Atomically rolls back the exact stolen transaction (`reclaimStolenEquipmentTransaction(state, txId, nowMs)`) returning the exact stolen card instance from thief back to Colt **instead of dealing damage** (`0` damage dealt!).
       2. **`deal_damage`:** Commits the theft transaction (`commitEquipmentTransaction`) and applies the attack damage through the standard `DAMAGE` pipeline (subject to thief's defenses).
     - **Never** grants both damage and item recovery!
   - If resulting damage is **`< 2`** (`0` or `1`): commits the theft transaction and resolves the normal `0`/`1` damage immediately (no recovery option).
   - **Immediate Victory (`COLT_QUALIFYING_WEAPON_IDS`):** Qualifies immediately upon owning **`>= 3`** equipped card instances from the canonical IDs:
     - `ev-02` (`butcher_knife` — Dao Rọc Kỹ Thuật)
     - `ev-03` (`chainsaw` — Cưa Máy Công Xưởng)
     - `ev-04` (`rusted_broad_axe` — Rìu Sắt Cứu Hỏa)
     - `ev-05` (`handgun` — Súng Bắn Đinh)
     *(Canonical card IDs only — never display names!)*
6. **Server Event Ordering:** Theft executes `EquipmentTransferTransaction` (`status: 'pending-reaction'` if revealed alive Colt) → queues `COLT_THEFT_COUNTER` step → if Colt chooses counterattack: server rolls attack → if `dmg >= 2` opens `colt_recover_or_damage` → atomic reclaim OR `DAMAGE` step → `finalizeIfFinished` checks immediate 3-weapon win!
7. **Victory Semantics:** Immediate Neutral individual victory (`colt.alive && countColtQualifyingWeapons(colt.equipped) >= 3`).
8. **Privacy Risks:** Low — Colt must be revealed before reacting (`isSecret: false`). Equipment on the table is already public; hand contents are NEVER exposed during theft or recovery.
9. **Edge Cases & Tests:** Theft from `court`; remote theft via `ev-11` Moody Goblin; Bob robbery theft; voluntary gift (`Bethany`/`Bryon`/`Banana Peel`) does NOT trigger; counterattack misses (`0` dmg); damage `1` (< 2, no recover); damage `>= 2` choose recover vs choose damage; thief eliminated by counterattack; item transferred again before reclaim (revalidation prevents duplication!); 3 qualifying weapons immediate win; non-qualifying gear (`ev-01` Masamune, `ev-06` Machine Gun, White equipment) does not count; reconnect & duplicate request idempotency.
10. **Future Official-Rule Review Required:** **YES** — confirm whether unrevealed Colt may reveal-to-counterattack and whether recovery checks pre-mitigation or post-mitigation damage (HUSTVerse checks rolled attack damage against thief's static attack armor before HP commit, matching Bob's classic `>= 2` robbery check).

---

## 9. Diana — `exp2_diana` (Neutral · 13 HP · Expansion 2)

1. **Original Source Text:**
   - **Skill Name:** `Cho Thuê`
   - **Skill Description:** *"Neutral đầu tiên lộ diện sẽ trở thành khách hàng của bạn, bắt đầu từ lượt tiếp theo của họ và bạn sẽ lộ diện khi điều đó xảy ra."*
   - **Victory Condition:** *"Điều kiện chiến thắng của bạn dựa trên khách hàng của bạn khi bạn còn sống. Nếu bạn không tìm thấy khách hàng của mình, thì bạn phải đầy máu khi trò chơi kết thúc."*
2. **Original Source URL:** `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-neutral-cua-ban-mo-rong-thu-2`
3. **Relevant Unresolved Rule References:** `RC-13` (**internal source contradiction**: skill text explicitly specifies *"Neutral đầu tiên lộ diện"*, whereas the article's strategy commentary claims the customer can be Shadow or Hunter).
4. **Ambiguity & Gameplay Impact:** Contradictory source text plus edge cases when the customer dies before their next own turn, 5P matches with no other Neutral, and dependency cycles (`Diana ↔ Bethany`).
5. **Experimental HUSTVerse Interpretation (`house-rule-approved` — documenting `RC-13` contradiction):**
   - Strictly follows the **explicit skill text**: the **first OTHER Neutral** (`faction === 'wanderer'`, `playerId !== diana.playerId`) revealed during **normal gameplay** (`wasAliveBeforeReveal && !isDeathReveal && !isFinalMatchDisclosure`) becomes Diana's **pending customer**.
   - **Explicitly rejects** the conflicting strategy paragraph (Hunter/Shadow reveals do NOT bind Diana).
   - Persists `dianaContracts[dianaId] = { customerPlayerId, boundOnTurnNumber, boundEventId, status: 'pending' | 'active' | 'cancelled' }`.
   - **Delayed Activation & Forced Reveal:** At the **start of that customer's next own turn** (`triggerExpandedTurnStart` for `customerPlayerId` with `state.turnNumber > boundOnTurnNumber`):
     - If both Diana and customer are alive, transitions `status: 'active'`, forces Diana to reveal (`triggerReason: 'skill-forced'`, emitting `ROLE_REVEALED_TRIGGERS`!), and publishes `dianaActiveCustomerByPlayer[dianaId] = customerPlayerId`.
     - If the customer dies before their next own turn starts (or Diana dies first), `status` becomes `'cancelled'` — the contract **never activates** and cannot be reassigned to another Neutral!
   - **Victory (`CONDITIONAL_SHARED` + Fallback):**
     - If `status === 'active'`: Diana wins if and only if **`diana.alive === true` AND her active customer qualifies as a winner** in `CopiedVictoryGraph` (`CONDITIONAL_SHARED`, cycle-safe fail-closed!).
     - If **no customer contract ever activated** (no other Neutral revealed, 5P sole Neutral, or pending customer died before activation): Diana qualifies at valid match end if and only if **`diana.alive === true && diana.woundsTaken === 0`** (full HP!).
6. **Server Event Ordering:** Normal Neutral reveal records `pending` contract silently (zero public leak of hidden Diana!) → on customer's next own turn start, activates contract & reveals Diana (enqueuing `ROLE_REVEALED_TRIGGERS` which can in turn trigger `Umibozu`/`Aaron`!) → `CopiedVictoryGraph` evaluates `CONDITIONAL_SHARED` or full-HP fallback.
7. **Victory Semantics:** `CONDITIONAL_SHARED` (`requireOwnerAlive: true`) via `CopiedVictoryGraph` with `'diana_full_hp_survivor'` fallback when inactive.
8. **Privacy Risks:** CRITICAL — While `status === 'pending'` and Diana is unrevealed, **NO public DTO, badge, or log** may expose Diana's existence or pending contract! Only once `status === 'active'` (at which point Diana is forced revealed!) does `dianaActiveCustomerByPlayer` appear publicly.
9. **Edge Cases & Tests:** First normal Neutral reveal sets pending; Hunter/Shadow reveal ignored; death-only/final reveal ignored; customer killed before next own turn cancels contract (full-HP fallback applies); active customer wins as Neutral (including copied victory); Diana ↔ Bethany cycle fails closed; 5P sole Neutral full-HP fallback succeeds at 13/13 HP and fails at 12/13 HP; DO hibernation while pending before customer's next turn.
10. **Future Official-Rule Review Required:** **YES (`RC-13` documented)** — confirm original Japanese/English card text for Diana's customer faction filter.

---

## 10. Aaron — `exp2_aaron` (Neutral · 8 HP · Expansion 2)

1. **Original Source Text:**
   - **Skill Name:** `Yêu Từ Cái Nhìn Đầu Tiên`
   - **Skill Description:** *"Nhân vật nữ đầu tiên lộ diện sẽ trở thành vợ của bạn. Lộ diện bản thân, và kể thời điểm đó trở đi, bạn có thể không tấn công vợ mình."*
   - **Victory Condition:** *"Bạn và người vợ của bạn còn sống khi trò chơi kết thúc. Nếu bạn không tìm thấy vợ của mình, chết trước khi trò chơi kết thúc."*
2. **Original Source URL:** `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-neutral-cua-ban-mo-rong-thu-2`
3. **Relevant Unresolved Rule References:** `RC-14` (canonical fictional character gender metadata across all 66 roles, Vietnamese translation *"có thể không tấn công"* vs English *"cannot attack"* / Masamune / Machine Gun override, no-spouse death-win timing).
4. **Ambiguity & Gameplay Impact:** Requires authoritative fictional role gender metadata independent of live player avatars; Vietnamese phrase *"có thể không tấn công"* is a literal mistranslation of *"cannot attack"*; must prevent unmatched Aaron from triggering an unfair instant match-ending victory on death.
5. **Experimental HUSTVerse Interpretation (`house-rule-approved` — documenting `RC-14` translation ambiguity):**
   - **Curated Fictional Role Metadata (`CAP-10` `character-metadata.ts`):** Eligibility uses strictly `getCanonicalCharacterGender(roleId) === 'female'` from the versioned 66-role registry (NEVER live player `appearance`/profile; ambiguous/non-human roles are explicitly `'unspecified'`).
   - **Spouse Binding:** When the **first OTHER living player** with `fictionalGender === 'female'` is revealed during **normal gameplay** (`wasAliveBeforeReveal && !isDeathReveal && !isFinalMatchDisclosure`), while Aaron is alive and unmatched:
     - Deterministically binds `aaronSpouseByPlayer[aaronId] = { spousePlayerId, boundEventId, boundTurnNumber }` (uses ascending `revealSeq` if multiple reveals occur in one batch).
     - Immediately forces Aaron to reveal (`triggerReason: 'skill-forced'`, emitting `ROLE_REVEALED_TRIGGERS`!).
     - No reassignment if the spouse later dies.
   - **Attack Restriction ("cannot attack spouse"):**
     - Aaron **cannot directly attack** his spouse (`canExpandedPlayerAttackTarget` rejects spouse).
     - Spouse is **excluded from Machine Gun (`ev-06`) splash targets** when Aaron attacks another target.
     - If Aaron equips **Masamune (`ev-01`)**, spouse protection **overrides mandatory attack** on the spouse (if spouse is the ONLY player in range, Aaron is allowed to `END_TURN` without attacking!).
     - Does not alter non-attack cards or character faction.
   - **Victory (`CONDITIONAL_SHARED` + End-of-Match Fallback):**
     - **With Spouse:** Aaron qualifies at **valid match end** if and only if **both Aaron AND spouse are alive** (`aaron.alive && spouse.alive`).
     - **No Spouse Found:** Aaron qualifies at **valid match end** if and only if **Aaron was eliminated before the match ended** (`!aaron.alive`). **Does NOT trigger an immediate match-ending victory upon Aaron's death!**
6. **Server Event Ordering:** Normal reveal emits `ROLE_REVEALED_TRIGGERS` → checks `isEligibleFemaleRole(roleIdAtReveal)` → binds spouse & forces Aaron reveal → enqueues `ROLE_REVEALED_TRIGGERS` for Aaron (so Diana/Cassie/Umibozu can observe Aaron's forced Neutral reveal deterministically!).
7. **Victory Semantics:** `CONDITIONAL_SHARED` (`requireOwnerAlive: true, requireTargetAlive: true` — wait: note Aaron's spouse does NOT have to *win*, both simply must be *alive* at match end! Modeled cleanly in `CopiedVictoryGraph` as a `CONDITIONAL_SHARED` survival bond with `'aaron_dead_before_end'` fallback when unmatched).
8. **Privacy Risks:** CRITICAL — Before a qualifying female character is publicly revealed, server NEVER leaks gender metadata or Aaron's hidden identity to any client or candidate list. Public `aaronSpouseByPlayer` badge appears ONLY once Aaron is revealed & bound.
9. **Edge Cases & Tests:** First eligible female normal reveal binds & reveals Aaron; male & `unspecified` gender reveals ignored; death-only & final reveal ignored; multiple reveals in one batch follow `revealSeq`; spouse death (no reassignment, Aaron cannot win); Aaron death with spouse (loses); Aaron death without spouse (does NOT end match immediately; co-wins at normal match end); Masamune sole-target spouse allows `END_TURN`; Machine Gun excludes spouse while hitting other reachable targets; weapon modifiers unaffected on non-spouse targets; 5P–8P matches; metadata isolation.
10. **Future Official-Rule Review Required:** **YES (`RC-14` preserved)** — confirm official gender table for ambiguous expansion roles and confirm whether English original reads *"cannot attack"* vs *"may choose not to attack"*.
