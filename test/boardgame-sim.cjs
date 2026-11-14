/**
 * test/boardgame-sim.cjs — Chạy mô phỏng >= 3.000 ván bot offline cân bằng
 * (4–8 người chơi) trên Pure Domain Engine để xác nhận:
 *  - 0% trận bị kẹt (infinite loop / hang)
 *  - Tỉ lệ thắng giữa Đội Gác Đèn, Hội Màn Sương và Kẻ Lang Thang hợp lý
 */

const assert = require('node:assert/strict');
require('./register-ts.cjs');

const {
  KTX_LOCATIONS,
  applyPlayerGameAction,
  createInitialGameState,
  getActivePlayer,
  isAdjacentLocation,
} = require('../features/boardgame/domain/index.ts');

const GAMES_PER_COUNT = 640; // 640 * 5 = 3.200 trận (>= 3.000)

function chooseBotAction(state, actor, rngTick) {
  if (state.turnPhase === 'MOVE') {
    const validLocs = KTX_LOCATIONS.map((l) => l.id).filter((id) => id !== actor.location);
    // Phe Gác Đèn / Màn Sương ưu tiên ghé Phát thanh hoặc Cầu dao; Lang Thang ưu tiên Hành lang / Sân bóng rổ
    const preferred =
      actor.faction === 'wanderer'
        ? ['court', 'corridor', 'canteen', 'breaker']
        : ['radio', 'breaker', 'court', 'canteen'];
    const pool = validLocs.filter((id) => preferred.includes(id));
    const list = pool.length > 0 && rngTick % 4 !== 0 ? pool : validLocs;
    const loc = list[rngTick % list.length];
    return { type: 'MOVE', location: loc };
  }

  if (state.turnPhase === 'DRAW_OR_EXPLORE') {
    if (
      actor.location === 'radio' &&
      state.blackoutLocation !== actor.location &&
      actor.faction !== 'wanderer' &&
      rngTick % 3 !== 0
    ) {
      return {
        type: 'ADJUST_TRACK',
        mode: actor.faction === 'lantern-guard' ? 'signal' : 'mist',
      };
    }
    const decks =
      actor.faction === 'wanderer'
        ? ['clue', 'clue', 'tactic', 'event']
        : ['event', 'clue', 'tactic'];
    return { type: 'DRAW_CARD', deck: decks[rngTick % decks.length] };
  }

  if (state.turnPhase === 'TACTICAL_ACTION') {
    if (!state.actionUsedThisTurn) {
      // Dùng kỹ năng nhân vật nếu đủ điều kiện
      if (!actor.skillUsed && state.round >= 2) {
        const sameOrAdjOthers = state.players.filter(
          (p) =>
            p.alive &&
            p.playerId !== actor.playerId &&
            (p.location === actor.location || isAdjacentLocation(actor.location, p.location)),
        );
        return {
          type: 'USE_SKILL',
          targetPlayerId: sameOrAdjOthers[0]?.playerId,
        };
      }

      // Thử dùng 1 lá tactic phù hợp trên tay
      if (actor.hand.length > 0) {
        const card = actor.hand.find((c) => {
          if (actor.faction === 'lantern-guard' && c.effectKind === 'mist-up') return false;
          if (actor.faction === 'mist-order' && c.effectKind === 'signal-up') return false;
          return true;
        });
        if (card) {
          const sameLoc = state.players.filter(
            (p) =>
              p.alive &&
              p.playerId !== actor.playerId &&
              (card.targetMode !== 'same-location' || p.location === actor.location) &&
              (card.targetMode !== 'adjacent-or-same' ||
                isAdjacentLocation(actor.location, p.location)),
          );
          if (card.targetMode === 'self' || card.targetMode === 'global') {
            return { type: 'USE_CARD', cardId: card.id };
          }
          if (sameLoc.length > 0) {
            return { type: 'USE_CARD', cardId: card.id, targetPlayerId: sameLoc[0].playerId };
          }
        }
      }

      // Công kích hoặc Thăm dò nếu có người cùng khu vực
      const targets = state.players.filter(
        (p) =>
          p.alive &&
          p.playerId !== actor.playerId &&
          (p.location === actor.location ||
            (actor.location === 'court' && isAdjacentLocation(actor.location, p.location))),
      );
      if (targets.length > 0) {
        if (actor.roleId === 'lang-quan-sat' || rngTick % 3 === 0) {
          const guesses = ['mist-order', 'lantern-guard', 'wanderer'];
          return {
            type: 'PROBE',
            targetPlayerId: targets[0].playerId,
            claimedFaction: guesses[rngTick % guesses.length],
          };
        }
        return { type: 'ATTACK', targetPlayerId: targets[0].playerId };
      }
    }
    return { type: 'END_TURN' };
  }

  return { type: 'END_TURN' };
}

function runSimulation() {
  let totalGames = 0;
  let stuckGames = 0;
  let totalRounds = 0;
  let guardWins = 0;
  let mistWins = 0;
  let wandererSoloWins = 0;
  let wandererCoWins = 0;

  for (let playerCount = 4; playerCount <= 8; playerCount++) {
    for (let g = 0; g < GAMES_PER_COUNT; g++) {
      totalGames += 1;
      const players = Array.from({ length: playerCount }, (_, idx) => ({
        playerId: `bot_${idx + 1}`,
        displayName: `Bot ${idx + 1}`,
        seatIndex: idx,
      }));
      const state = createInitialGameState({
        matchId: `sim-${playerCount}-${g}`,
        seed: playerCount * 100_000 + g * 37 + 7,
        nowMs: 1_700_000_000_000,
        players,
      });

      let steps = 0;
      const maxSteps = 500;
      while (!state.finished && steps < maxSteps) {
        steps += 1;
        const actor = getActivePlayer(state);
        if (!actor) break;
        const action = chooseBotAction(state, actor, steps + g * 13);
        const res = applyPlayerGameAction(
          state,
          actor.playerId,
          action,
          1_700_000_000_000 + steps * 1000,
        );
        if (!res.ok) {
          // Dự phòng an toàn nếu điều kiện phụ vừa thay đổi
          const fallback =
            state.turnPhase === 'MOVE'
              ? {
                  type: 'MOVE',
                  location: KTX_LOCATIONS.find((l) => l.id !== actor.location).id,
                }
              : state.turnPhase === 'DRAW_OR_EXPLORE'
                ? { type: 'DRAW_CARD', deck: 'event' }
                : { type: 'END_TURN' };
          const fbRes = applyPlayerGameAction(
            state,
            actor.playerId,
            fallback,
            1_700_000_000_000 + steps * 1000,
          );
          assert.equal(fbRes.ok, true, `Fallback must succeed: ${fbRes.reason}`);
        }
      }

      if (!state.finished) {
        stuckGames += 1;
      } else {
        totalRounds += Math.min(state.round, state.maxRounds);
        if (state.winnerFaction === 'lantern-guard') guardWins += 1;
        else if (state.winnerFaction === 'mist-order') mistWins += 1;
        else if (state.winnerFaction === 'wanderer-solo') wandererSoloWins += 1;

        const hasWandererWinner = state.winnerPlayerIds.some((wid) => {
          const wp = state.players.find((p) => p.playerId === wid);
          return wp && wp.faction === 'wanderer';
        });
        if (hasWandererWinner) wandererCoWins += 1;
      }
    }
  }

  const guardRate = (guardWins / totalGames) * 100;
  const mistRate = (mistWins / totalGames) * 100;
  const wandererRate = (wandererCoWins / totalGames) * 100;
  const avgRounds = totalRounds / totalGames;

  console.log(
    JSON.stringify({
      totalGames,
      stuckGames,
      avgRounds: Number(avgRounds.toFixed(2)),
      guardWins,
      mistWins,
      wandererSoloWins,
      wandererCoWins,
      guardRatePct: Number(guardRate.toFixed(2)),
      mistRatePct: Number(mistRate.toFixed(2)),
      wandererRatePct: Number(wandererRate.toFixed(2)),
    }),
  );

  assert.equal(stuckGames, 0, 'Tỷ lệ kẹt trận đấu phải bằng 0%');
  assert.ok(totalGames >= 3000, 'Phải chạy ít nhất 3.000 trận');
  assert.ok(guardRate >= 20 && guardRate <= 65, `Tỷ lệ thắng Đội Gác Đèn (${guardRate.toFixed(1)}%) cần cân bằng`);
  assert.ok(mistRate >= 20 && mistRate <= 65, `Tỷ lệ thắng Hội Màn Sương (${mistRate.toFixed(1)}%) cần cân bằng`);
  assert.ok(wandererCoWins > 0, 'Kẻ Lang Thang phải có khả năng hoàn thành mục tiêu riêng');
}

runSimulation();
