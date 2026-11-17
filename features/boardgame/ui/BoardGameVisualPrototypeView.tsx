'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/BoardGameVisualPrototypeView.tsx
// Màn hình Visual Prototype & Comparison Lab: "HUSTVerse Midnight — Anime Noir"
// Cho phép đối chiếu trực tiếp Thiết kế Cũ (Classic) vs Mới (2:3 Full-Art)
// trên Desktop & Mobile, kiểm chứng bảo mật ẩn danh tính/mặt bài đúng luật.
// ---------------------------------------------------------------------------

import React, { useMemo, useRef, useState } from 'react';
import { CARDS_CATALOG, getCardById } from '@/features/boardgame/domain/cards';
import { getRoleDesign, ROLES_CATALOG } from '@/features/boardgame/domain/roles';
import { DEFAULT_CLUSTER_PAIRS } from '@/features/boardgame/domain/rules';
import {
  sanitizeBoardGameAppearance,
  type BoardGameCardPublicMeta,
  type BoardGameDeckId,
  type BoardGameFactionId,
  type BoardGameLocationId,
  type BoardGamePrivateGameView,
  type BoardGamePublicGameView,
  type BoardGamePublicPlayerView,
  type BoardGameRoleId,
} from '@/shared/contracts/boardgame';
import {
  buildBoardClustersView,
  DeckCardBackSvg,
  FactionCrestSvg,
  LocationSceneSvg,
} from './BoardGameArt';
import { MidnightActionCard } from './MidnightActionCard';
import { MidnightCardZoomModal, type MidnightZoomTarget } from './MidnightCardZoomModal';
import { MidnightCharacterCard } from './MidnightCharacterCard';
import { BoardGameVfxSandbox } from './BoardGameVfxSandbox';
import { RoleCard } from './RoleCard';
import { TabletopLocationTile } from './TabletopLocationTile';
import { useSmoothPawnGlide } from './useSmoothPawnGlide';
import { useBoardGameGraphicsSettings } from './graphics-settings';
import {
  MIDNIGHT_DECK_TOKENS,
  MIDNIGHT_FACTION_TOKENS,
  PROTOTYPE_SAMPLE_CARD_IDS,
  resolveActionCardPresentation,
  resolveRoleCardPresentation,
  type ActionCardZone,
  type RoleViewerMode,
} from './midnight-noir-tokens';

type SecrecyScenario = 'owner-peek' | 'owner-facedown' | 'other-player' | 'public-revealed';
type MobileLayerMode = 'both' | 'new' | 'old';

const DEFAULT_MOCK_APPEARANCE = sanitizeBoardGameAppearance({});

const SECRECY_SCENARIOS: ReadonlyArray<{
  id: SecrecyScenario;
  label: string;
  shortLabel: string;
  desc: string;
  viewerMode: RoleViewerMode;
  revealed: boolean;
}> = [
  {
    id: 'owner-peek',
    label: '👁️ Chủ thẻ soi vai',
    shortLabel: 'Soi vai',
    desc: 'Chủ thẻ mở soi riêng tư — hiện đầy đủ chân dung, HP thật & kỹ năng dù chưa lật công khai.',
    viewerMode: 'owner-peek',
    revealed: false,
  },
  {
    id: 'owner-facedown',
    label: '🙈 Chủ thẻ úp bài',
    shortLabel: 'Úp chống nhìn',
    desc: 'Úp mặt lưng bảo vệ khi chơi cạnh bạn; chỉ giữ thương tích công khai & nút soi lại.',
    viewerMode: 'owner-facedown',
    revealed: false,
  },
  {
    id: 'other-player',
    label: '🕵️ Đối thủ / Khán giả',
    shortLabel: 'Ẩn với người khác',
    desc: 'Khi vai chưa lật: người chơi khác & khán giả tuyệt đối KHÔNG thấy ảnh, tên vai, phe hay HP tối đa.',
    viewerMode: 'other-player',
    revealed: false,
  },
  {
    id: 'public-revealed',
    label: '🔓 Lật Vai Công Khai',
    shortLabel: 'Đã lộ diện',
    desc: 'Sau hành động Lật Vai: thẻ lật mở mặt trước công khai toàn bàn, kích hoạt kỹ năng nhân vật.',
    viewerMode: 'other-player',
    revealed: true,
  },
];

const CARD_ZONE_MODES: ReadonlyArray<{
  id: ActionCardZone;
  label: string;
  isParticipant: boolean;
}> = [
  { id: 'private-investigation', label: 'Đang giữ / Liên quan trực tiếp', isParticipant: true },
  { id: 'private-investigation', label: 'Người ngoài nhìn Thẻ Điều Tra', isParticipant: false },
  { id: 'draw-pile', label: 'Úp trên Chồng Bài rút', isParticipant: false },
];

function buildMockMatchViews(
  roleId: BoardGameRoleId,
  woundsTaken: number,
  revealed: boolean,
): {
  publicGame: BoardGamePublicGameView;
  privateView: BoardGamePrivateGameView;
} {
  const design = getRoleDesign(roleId);
  const clampedWounds = Math.max(0, Math.min(design.maxHp - 1, woundsTaken));
  const hp = design.maxHp - clampedWounds;
  const spear = getCardById('eq-04');
  const eqList: readonly BoardGameCardPublicMeta[] = spear
    ? [
        {
          id: spear.id,
          deck: spear.deck,
          title: spear.title,
          summary: spear.summary,
          isConsumable: false,
          effectId: spear.effectId,
          targetMode: spear.targetMode,
          value: spear.value,
        },
      ]
    : [];

  const publicGame: BoardGamePublicGameView = {
    rulesetVersion: 4,
    matchId: 'proto-midnight-01',
    round: 3,
    maxRounds: 20,
    turnNumber: 9,
    turnPhase: 'MAIN_ACTION',
    activePlayerId: 'proto-p1',
    turnOrder: ['proto-p1'],
    clusterPairs: DEFAULT_CLUSTER_PAIRS,
    deadCount: 1,
    players: [
      {
        playerId: 'proto-p1',
        displayName: design.name,
        seatIndex: 0,
        location: roleId === 'gac-radio' ? 'radio' : 'lobby',
        woundsTaken: clampedWounds,
        handCount: 0,
        equipped: eqList,
        attacksMade: 1,
        attacksThisTurn: 0,
        investigationsCount: 1,
        guardianShieldActive: false,
        alive: true,
        connected: true,
        revealedRoleId: revealed ? design.id : null,
        revealedFaction: revealed ? design.faction : null,
        revealedMaxHp: revealed ? design.maxHp : null,
        revealedSkillCooldown: 0,
        revealedSkillUsedOnce: false,
        appearance: DEFAULT_MOCK_APPEARANCE,
      },
    ],
    deckCounts: { investigation: 12, equipment: 13, event: 14 },
    lastDiceRoll: null,
    lastInvestigation: null,
    lastRevealEvent: null,
    publicLog: [],
    highlights: [],
    winnerLabel: null,
    winnerFaction: null,
    winnerPlayerIds: [],
    winReason: null,
    finalReveal: null,
  };

  const privateView: BoardGamePrivateGameView = {
    playerId: 'proto-p1',
    roleId: design.id,
    roleName: design.name,
    faction: design.faction,
    hp,
    maxHp: design.maxHp,
    woundsTaken: clampedWounds,
    skillCooldown: 0,
    skillUsedOnce: false,
    revealed,
    secretGoalText: design.secretGoalText,
    protegePlayerId: null,
    protegeDisplayName: null,
    avengedProtegeKiller: false,
    investigatedTargetIds: [],
    hand: [],
    equipped: eqList,
    privateClues: [
      {
        id: 'clue-proto-1',
        atMs: 1_760_000_000_000,
        round: 2,
        cardTitle: 'Thăm Dò: Tiên Tri',
        targetPlayerId: 'proto-p2',
        targetName: 'Sinh viên B',
        outcome: 'condition-met',
        detail: 'Phát hiện người nhận thẻ thuộc Hội Bóng Đêm.',
      },
    ],
  };

  return { publicGame, privateView };
}

function LegacyClassicActionCardBox({ cardId }: { cardId: string }) {
  const card = getCardById(cardId);
  if (!card) return null;
  const deckTone =
    card.deck === 'investigation'
      ? 'border-emerald-500/45 bg-emerald-950/35 text-emerald-200'
      : card.deck === 'equipment'
        ? 'border-sky-500/45 bg-sky-950/35 text-sky-200'
        : 'border-rose-500/45 bg-rose-950/35 text-rose-200';
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${deckTone}`}>
          {card.deck === 'investigation'
            ? 'Khám Phá'
            : card.deck === 'equipment'
              ? 'Cung Ứng'
              : 'Đột Kích'}
        </span>
        <span className="text-[11px] text-slate-400">Hộp chữ cũ</span>
      </div>
      <div className="flex items-center gap-2.5">
        <DeckCardBackSvg deck={card.deck} size={38} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{card.title}</p>
          <p className="text-xs text-slate-300 leading-snug">{card.summary}</p>
        </div>
      </div>
    </div>
  );
}

const DEMO_LOCATION_ROTATION: readonly BoardGameLocationId[] = [
  'radio',
  'breaker',
  'lobby',
  'canteen',
  'corridor',
  'court',
];

const DEMO_PAWN_ROSTER: ReadonlyArray<{
  playerId: string;
  displayName: string;
  seatIndex: number;
  roleId: BoardGameRoleId;
  faction: BoardGameFactionId;
  maxHp: number;
  baseOffset: number;
  wounds: number;
}> = [
  { playerId: 'demo-p1', displayName: 'Minh An', seatIndex: 0, roleId: 'gac-ky-thuat', faction: 'lantern-guard', maxHp: 14, baseOffset: 0, wounds: 2 },
  { playerId: 'demo-p2', displayName: 'Vy Hà', seatIndex: 1, roleId: 'gac-radio', faction: 'lantern-guard', maxHp: 12, baseOffset: 2, wounds: 1 },
  { playerId: 'demo-p3', displayName: 'Tú Linh', seatIndex: 2, roleId: 'suong-an-danh', faction: 'mist-order', maxHp: 13, baseOffset: 3, wounds: 4 },
  { playerId: 'demo-p4', displayName: 'Hải Nam', seatIndex: 3, roleId: 'lang-anh-san', faction: 'wanderer', maxHp: 10, baseOffset: 5, wounds: 3 },
];

export default function BoardGameVisualPrototypeView() {
  const [scenarioId, setScenarioId] = useState<SecrecyScenario>('owner-peek');
  const [woundsTaken, setWoundsTaken] = useState<number>(2);
  const [foilEnabled, setFoilEnabled] = useState<boolean>(true);
  const [mobileLayer, setMobileLayer] = useState<MobileLayerMode>('both');
  const [manualFlipIds, setManualFlipIds] = useState<Record<string, boolean>>({});
  const [actionZoneIdx, setActionZoneIdx] = useState<number>(0);
  const [rosterFactionFilter, setRosterFactionFilter] = useState<'all' | BoardGameFactionId>('all');
  const [libraryDeckFilter, setLibraryDeckFilter] = useState<'all' | BoardGameDeckId>('all');
  const [pawnStep, setPawnStep] = useState<number>(0);
  const [pawnsRevealed, setPawnsRevealed] = useState<boolean>(false);
  const [selectedDemoPlayerId, setSelectedDemoPlayerId] = useState<string | null>('demo-p3');
  const [zoomTarget, setZoomTarget] = useState<MidnightZoomTarget | null>(null);
  const tabletopMapRef = useRef<HTMLDivElement>(null);
  const gfx = useBoardGameGraphicsSettings();

  const demoTabletopPlayers = useMemo<BoardGamePublicPlayerView[]>(
    () =>
      DEMO_PAWN_ROSTER.map((item) => ({
        playerId: item.playerId,
        displayName: item.displayName,
        seatIndex: item.seatIndex,
        location: DEMO_LOCATION_ROTATION[(item.baseOffset + pawnStep) % DEMO_LOCATION_ROTATION.length],
        woundsTaken: item.wounds,
        handCount: 0,
        equipped: [],
        attacksMade: 1,
        attacksThisTurn: 0,
        investigationsCount: 1,
        guardianShieldActive: false,
        alive: true,
        connected: true,
        revealedRoleId: pawnsRevealed ? item.roleId : null,
        revealedFaction: pawnsRevealed ? item.faction : null,
        revealedMaxHp: pawnsRevealed ? item.maxHp : null,
        revealedSkillCooldown: 0,
        revealedSkillUsedOnce: false,
        appearance: DEFAULT_MOCK_APPEARANCE,
      })),
    [pawnStep, pawnsRevealed],
  );

  useSmoothPawnGlide({
    containerRef: tabletopMapRef,
    players: demoTabletopPlayers,
    matchId: 'proto-tabletop-demo',
    reducedMotion: gfx.profile.reducedMotion,
    durationMs: gfx.profile.pawnGlideDurationMs,
  });

  const filteredRoles = useMemo(
    () =>
      rosterFactionFilter === 'all'
        ? ROLES_CATALOG
        : ROLES_CATALOG.filter((r) => r.faction === rosterFactionFilter),
    [rosterFactionFilter],
  );

  const filteredLibraryCards = useMemo(
    () =>
      libraryDeckFilter === 'all'
        ? CARDS_CATALOG
        : CARDS_CATALOG.filter((c) => c.deck === libraryDeckFilter),
    [libraryDeckFilter],
  );

  const scenario = SECRECY_SCENARIOS.find((s) => s.id === scenarioId) ?? SECRECY_SCENARIOS[0];
  const cardZoneCfg = CARD_ZONE_MODES[actionZoneIdx] ?? CARD_ZONE_MODES[0];

  const effectiveCharacterSecrecy = (roleId: BoardGameRoleId) => {
    const manualFlipped = Boolean(manualFlipIds[roleId]);
    if (manualFlipped) {
      return {
        viewerMode: 'owner-facedown' as RoleViewerMode,
        revealed: false,
      };
    }
    return {
      viewerMode: scenario.viewerMode,
      revealed: scenario.revealed,
    };
  };

  const toggleFlipKey = (key: string) => {
    setManualFlipIds((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const classicMinh = useMemo(
    () => buildMockMatchViews('gac-ky-thuat', woundsTaken, scenario.revealed),
    [woundsTaken, scenario.revealed],
  );
  const classicVy = useMemo(
    () => buildMockMatchViews('gac-radio', woundsTaken, scenario.revealed),
    [woundsTaken, scenario.revealed],
  );

  const classicShowsSecretForMinh =
    scenario.revealed || (scenario.viewerMode === 'owner-peek' && !manualFlipIds['gac-ky-thuat']);
  const classicShowsSecretForVy =
    scenario.revealed || (scenario.viewerMode === 'owner-peek' && !manualFlipIds['gac-radio']);
  const classicSpectatorHide = scenario.viewerMode === 'other-player' && !scenario.revealed;

  const minhPresentation = resolveRoleCardPresentation({
    viewerMode: manualFlipIds['gac-ky-thuat'] ? 'owner-facedown' : scenario.viewerMode,
    revealed: manualFlipIds['gac-ky-thuat'] ? false : scenario.revealed,
    roleId: 'gac-ky-thuat',
    woundsTaken,
  });

  const actionSamplesMeta = PROTOTYPE_SAMPLE_CARD_IDS.map((cid) => ({
    cardId: cid,
    pres: resolveActionCardPresentation({
      cardId: cid,
      zone: cardZoneCfg.id,
      isParticipantInInvestigation: cardZoneCfg.isParticipant,
    }),
  }));

  const threeFactionShowcase: ReadonlyArray<{
    roleId: BoardGameRoleId;
    tag: string;
  }> = [
    { roleId: 'gac-ky-thuat', tag: 'Emerald / Gold · Đội Săn Đêm' },
    { roleId: 'suong-an-danh', tag: 'Crimson / Violet · Hội Bóng Đêm' },
    { roleId: 'lang-anh-san', tag: 'Amber / Silver · Kẻ Độc Hành' },
  ];

  const allDecks: readonly BoardGameDeckId[] = ['investigation', 'equipment', 'event'];

  return (
    <div
      data-testid="bg-visual-prototype-page"
      className="min-h-screen overflow-x-hidden bg-[#050811] text-slate-100"
      style={{
        backgroundImage:
          'radial-gradient(circle at 12% 10%, rgba(16,185,129,0.16), transparent 36%), radial-gradient(circle at 88% 12%, rgba(225,29,72,0.16), transparent 38%), radial-gradient(circle at 50% 90%, rgba(245,158,11,0.1), transparent 42%)',
      }}
    >
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-400/50 bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                Visual Prototype v1
              </span>
              <span className="rounded-full border border-amber-400/40 bg-amber-950/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                HUSTVerse Midnight — Anime Noir
              </span>
            </div>
            <h1 className="mt-1 truncate text-base font-black text-white sm:text-xl">
              Bóng Đêm KTX — Bàn So Sánh Thẻ Nhân Vật 2:3 &amp; Hệ Thống Bài Mới
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              data-testid="prototype-back-campus-link"
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition"
            >
              ← Về Campus 3D
            </a>
          </div>
        </div>

        {/* Interactive Lab Controls */}
        <div className="border-t border-slate-800/70 bg-slate-900/60">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 sm:px-6">
            {/* Chế độ bảo mật */}
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chế độ bảo mật">
              {SECRECY_SCENARIOS.map((item) => {
                const active = scenarioId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`proto-secrecy-${item.id}`}
                    onClick={() => {
                      setScenarioId(item.id);
                      setManualFlipIds({});
                    }}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                      active
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg'
                        : 'border border-slate-700 bg-slate-950/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="sm:hidden">{item.shortLabel}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Thương tích + Foil + Mobile Layer toggle */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/80 px-2.5 py-1">
                <span className="font-bold text-rose-200">Thương tích: {woundsTaken}</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={woundsTaken}
                  data-testid="proto-wounds-slider"
                  onChange={(e) => setWoundsTaken(Number(e.target.value))}
                  className="w-20 accent-rose-500 cursor-pointer"
                />
              </label>

              <button
                type="button"
                data-testid="proto-toggle-foil-btn"
                onClick={() => setFoilEnabled((v) => !v)}
                className={`rounded-xl border px-2.5 py-1 font-bold transition cursor-pointer ${
                  foilEnabled
                    ? 'border-amber-400/60 bg-amber-950/70 text-amber-200'
                    : 'border-slate-700 bg-slate-950 text-slate-400'
                }`}
              >
                {foilEnabled ? '✨ Foil: BẬT' : '✨ Foil: TẮT'}
              </button>

              <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950 p-0.5 md:hidden">
                {(
                  [
                    { id: 'both', label: 'Cả 2' },
                    { id: 'new', label: 'Mới' },
                    { id: 'old', label: 'Cũ' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`proto-mobile-view-${m.id}`}
                    onClick={() => setMobileLayer(m.id)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer ${
                      mobileLayer === m.id ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6 sm:py-8">
        <BoardGameVfxSandbox />

        {/* Privacy Status Banner */}
        <section
          data-testid="proto-secrecy-status"
          className="rounded-2xl border border-slate-800 bg-slate-900/75 p-3.5 sm:p-4 backdrop-blur-md"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                Kiểm chứng Bảo mật Luật Shadow Hunters: {scenario.label}
              </p>
              <p className="mt-0.5 text-xs text-slate-300 sm:text-sm">{scenario.desc}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-1.5 text-[11px] font-mono text-slate-300">
              showFront={String(minhPresentation.showFront)} · portraitSrc=
              {minhPresentation.portraitSrc ? 'loaded' : 'null'} · maxHp=
              {minhPresentation.maxHp ?? 'null'}
            </div>
          </div>
        </section>

        {/* PHẦN 1: SO SÁNH NHÂN VẬT CŨ VS MỚI (MINH & VY) */}
        <section data-testid="proto-section-characters" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-white sm:text-2xl">
                1. So Sánh Thẻ Nhân Vật: Classic vs Full-Art 2:3 (Minh &amp; Vy)
              </h2>
              <p className="text-xs text-slate-400 sm:text-sm">
                Di chuột/chạm để nghiêng 3D &amp; ánh kim Foil; chạm vào từng thẻ Midnight Noir để tự lật úp/mở 3D.
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Minh "Kỹ Thuật" & Vy "Radio" */}
            {(
              [
                {
                  roleId: 'gac-ky-thuat' as BoardGameRoleId,
                  classicPack: classicMinh,
                  classicVisible: classicShowsSecretForMinh,
                  heading: 'Minh "Kỹ Thuật" (George · 14 HP · Đội Săn Đêm)',
                  sub: 'Full-art bán thân KTX đêm mưa + Đèn bão ngọc lục bảo & Cờ lê',
                  testKey: 'minh',
                },
                {
                  roleId: 'gac-radio' as BoardGameRoleId,
                  classicPack: classicVy,
                  classicVisible: classicShowsSecretForVy,
                  heading: 'Vy "Radio" (Franklin · 12 HP · Đội Săn Đêm)',
                  sub: 'Full-art sân thượng KTX đêm giông + Bộ đàm hồ quang sét cao áp',
                  testKey: 'vy',
                },
              ] as const
            ).map((char) => {
              const eff = effectiveCharacterSecrecy(char.roleId);
              return (
                <div
                  key={char.roleId}
                  data-testid={`proto-compare-${char.testKey}`}
                  className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-4 sm:p-6 shadow-2xl"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-black text-amber-200 sm:text-lg">
                        {char.heading}
                      </h3>
                      <p className="text-xs text-slate-400">{char.sub}</p>
                    </div>
                    <button
                      type="button"
                      data-testid={`proto-flip-${char.testKey}-btn`}
                      onClick={() => toggleFlipKey(char.roleId)}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
                    >
                      🔄 Lật Thẻ 3D ({manualFlipIds[char.roleId] ? 'Đang úp tay' : 'Theo chế độ'})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-start">
                    {/* Cột CŨ */}
                    <div
                      className={`md:col-span-6 space-y-2 ${
                        mobileLayer === 'new' ? 'hidden md:block' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                          Thiết Kế Hiện Tại (Classic UI)
                        </span>
                        <span className="text-[11px] text-slate-400">RoleCard.tsx mặc định</span>
                      </div>
                      <RoleCard
                        publicGame={char.classicPack.publicGame}
                        privateView={
                          classicSpectatorHide ? null : char.classicPack.privateView
                        }
                        isSpectator={classicSpectatorHide}
                        cardVisible={char.classicVisible}
                        unreadClueCount={1}
                        visualStyle="classic"
                        onToggleCardVisible={() => toggleFlipKey(char.roleId)}
                      />
                    </div>

                    {/* Cột MỚI */}
                    <div
                      className={`md:col-span-6 space-y-2 ${
                        mobileLayer === 'old' ? 'hidden md:block' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg border border-emerald-400/50 bg-emerald-950/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-200">
                          Thiết Kế Mới (2:3 Anime Noir)
                        </span>
                        <span className="text-[11px] text-amber-300 font-semibold">
                          Full-Art · Foil 3D Tilt
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 sm:p-6">
                        <div className="w-full max-w-[300px]">
                          <MidnightCharacterCard
                            testId={`proto-new-card-${char.testKey}`}
                            roleId={char.roleId}
                            revealed={eff.revealed}
                            viewerMode={eff.viewerMode}
                            woundsTaken={woundsTaken}
                            foilEnabled={foilEnabled}
                            priority
                            onFlipToggle={() => toggleFlipKey(char.roleId)}
                            onZoom={() =>
                              setZoomTarget({
                                kind: 'role',
                                roleId: char.roleId,
                                revealed: eff.revealed,
                                viewerMode: eff.viewerMode,
                                woundsTaken,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PHẦN 2: 3 HỆ MÀU PHE (EMERALD/GOLD · CRIMSON/VIOLET · AMBER/SILVER) */}
        <section data-testid="proto-section-factions" className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-white sm:text-2xl">
              2. Hệ Thống 3 Màu Phe &amp; Khung Kim Loại (Art Tokens)
            </h2>
            <p className="text-xs text-slate-400 sm:text-sm">
              Khung kim loại &amp; huy hiệu phân tách rõ ràng 3 phe: Đội Săn Đêm (Emerald/Gold), Hội Bóng Đêm (Crimson/Violet) và Kẻ Độc Hành (Amber/Silver).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {threeFactionShowcase.map((item) => {
              const design = getRoleDesign(item.roleId);
              const token = MIDNIGHT_FACTION_TOKENS[design.faction];
              return (
                <div
                  key={item.roleId}
                  className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FactionCrestSvg faction={design.faction} size={24} />
                      <div>
                        <p className="text-xs font-black text-white">{token.label}</p>
                        <p className="text-[10px] font-bold tracking-wider text-slate-400">
                          {token.englishTag}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-4 w-4 rounded-full border border-white/30"
                        style={{ backgroundColor: token.primaryHex }}
                        title={token.primaryHex}
                      />
                      <span
                        className="h-4 w-4 rounded-full border border-white/30"
                        style={{ backgroundColor: token.secondaryHex }}
                        title={token.secondaryHex}
                      />
                    </div>
                  </div>

                  <div className="mx-auto w-full max-w-[260px]">
                    <MidnightCharacterCard
                      testId={`proto-faction-card-${design.faction}`}
                      roleId={item.roleId}
                      revealed={true}
                      viewerMode="other-player"
                      woundsTaken={0}
                      foilEnabled={foilEnabled}
                      showGoalFooter={false}
                    />
                  </div>

                  <p className="text-center text-[11px] text-slate-300">{token.paletteSummary}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* PHẦN 3: 3 THẺ BÀI MẪU (ĐIỀU TRA · TRANG BỊ · ĐỘT KÍCH) & MẶT LƯNG CHỒNG BÀI */}
        <section data-testid="proto-section-action-cards" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white sm:text-2xl">
                3. Ba Thẻ Bài Mẫu: Điều Tra · Trang Bị · Đột Kích
              </h2>
              <p className="text-xs text-slate-400 sm:text-sm">
                So sánh ô chữ cũ với thẻ 2:3 mới và kiểm tra luật úp mặt lưng theo từng vùng hiển thị.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {CARD_ZONE_MODES.map((m, idx) => (
                <button
                  key={`${m.id}-${idx}`}
                  type="button"
                  data-testid={`proto-card-zone-${idx}`}
                  onClick={() => {
                    setActionZoneIdx(idx);
                    setManualFlipIds((prev) => {
                      const next = { ...prev };
                      for (const cid of PROTOTYPE_SAMPLE_CARD_IDS) {
                        delete next[cid];
                      }
                      return next;
                    });
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    actionZoneIdx === idx
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {actionSamplesMeta.map(({ cardId, pres }) => {
              const zoneOverride = manualFlipIds[cardId]
                ? ('draw-pile' as ActionCardZone)
                : cardZoneCfg.id;
              const isParticipant = manualFlipIds[cardId] ? false : cardZoneCfg.isParticipant;
              const deckToken = MIDNIGHT_DECK_TOKENS[pres.deck];
              return (
                <div
                  key={cardId}
                  className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${deckToken.badgeClass}`}>
                      {deckToken.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleFlipKey(cardId)}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
                    >
                      🔄 Lật úp/mở
                    </button>
                  </div>

                  {/* Old small box */}
                  <div className={mobileLayer === 'new' ? 'hidden md:block' : ''}>
                    <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Cũ: Ô chữ đơn giản
                    </p>
                    <LegacyClassicActionCardBox cardId={cardId} />
                  </div>

                  {/* New 2:3 card */}
                  <div className={mobileLayer === 'old' ? 'hidden md:block' : ''}>
                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                      Mới: Thẻ Full-Art 2:3 + Mặt Lưng
                    </p>
                    <div className="mx-auto w-full max-w-[270px]">
                      <MidnightActionCard
                        testId={`proto-action-card-${cardId}`}
                        cardId={cardId}
                        zone={zoneOverride}
                        isParticipantInInvestigation={isParticipant}
                        foilEnabled={foilEnabled}
                        priority
                        onFlipToggle={() => toggleFlipKey(cardId)}
                        onZoom={() =>
                          setZoomTarget({
                            kind: 'card',
                            cardId,
                            zone: zoneOverride,
                            isParticipantInInvestigation: isParticipant,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3 Mặt lưng Chồng bài & Khu vực */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 mb-3">
              Bộ 3 Mặt Lưng Chồng Bài Rút Kín &amp; 6 Địa Điểm KTX Tái Sử Dụng (`BoardGameArt.tsx`)
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-center">
              <div className="grid grid-cols-3 gap-3 md:col-span-7">
                {allDecks.map((d) => {
                  const tok = MIDNIGHT_DECK_TOKENS[d];
                  const sampleId =
                    d === 'investigation' ? 'inv-12' : d === 'equipment' ? 'eq-04' : 'ev-01';
                  return (
                    <div key={d} className="space-y-1.5 text-center">
                      <MidnightActionCard
                        testId={`proto-deck-back-${d}`}
                        cardId={sampleId}
                        zone="draw-pile"
                        isParticipantInInvestigation={false}
                        foilEnabled={foilEnabled}
                      />
                      <p className="text-[11px] font-bold text-slate-300">{tok.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-2.5 md:col-span-5">
                {(['radio', 'breaker', 'lobby', 'canteen', 'corridor', 'court'] as const).map(
                  (loc) => (
                    <div
                      key={loc}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/80 p-2.5"
                    >
                      <LocationSceneSvg location={loc} size={40} />
                      <span className="text-[10px] font-bold text-slate-300 uppercase">{loc}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        {/* PHẦN 4: THÔNG SỐ ART TOKENS & SAFE ZONE */}
        <section
          data-testid="proto-section-specs"
          className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4 sm:p-6 space-y-3 text-xs text-slate-300"
        >
          <h2 className="text-base font-black text-amber-200">
            4. Quy Chuẩn Thông Số Thẻ &amp; Tài Nguyên Prototype (`boardgame-midnight-noir-guidelines.md`)
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="font-black text-white">Tỷ lệ &amp; Safe Zone</p>
              <p className="mt-1 text-slate-400">
                Thẻ `2:3` (720×1080 WebP): Top 14% cho Huy hiệu Phe &amp; Con dấu HP · Giữa 58% cho Chân dung/Vũ khí · Đáy 28% tối dần cho Tên &amp; Kỹ năng.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="font-black text-white">Hiệu ứng Tương tác</p>
              <p className="mt-1 text-slate-400">
                CSS `perspective: 1100px`, nghiêng 3D `±11°`, Foil shimmer + Glare theo tọa độ con trỏ, tắt tự động khi `prefers-reduced-motion: reduce`.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="font-black text-white">Bảo mật Danh tính P0</p>
              <p className="mt-1 text-slate-400">
                `resolveRoleCardPresentation` chặn render `portraitSrc`, `roleName`, `faction`, `maxHp` khỏi DOM khi thẻ chưa lật với người khác.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="font-black text-white">Độ nhẹ Tài nguyên</p>
              <p className="mt-1 text-slate-400">
                57 artwork AI WebP tối ưu (10 nhân vật 720×1080 + 40 loại thẻ 600×900 + 6 địa điểm 960×540 + 1 mặt lưng), lazy-loading &amp; decoding async.
              </p>
            </div>
          </div>
        </section>

        {/* PHẦN 5: TRỌN BỘ 10 NHÂN VẬT FULL-ART 2:3 */}
        <section data-testid="proto-section-roster-10" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white sm:text-2xl">
                5. Trọn Bộ 10 Nhân Vật Full-Art 2:3 ({ROLES_CATALOG.length}/10 Vai Trò)
              </h2>
              <p className="text-xs text-slate-400 sm:text-sm">
                Mỗi nhân vật sở hữu tạo hình, biểu cảm, đạo cụ KTX và màu phe riêng; bấm nút 🔍 để phóng lớn &amp; lật soi 2 mặt.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['all', 'Tất cả (10)'],
                  ['lantern-guard', 'Đội Săn Đêm (3)'],
                  ['mist-order', 'Hội Bóng Đêm (3)'],
                  ['wanderer', 'Kẻ Độc Hành (4)'],
                ] as const
              ).map(([fid, label]) => (
                <button
                  key={fid}
                  type="button"
                  data-testid={`proto-roster-tab-${fid}`}
                  onClick={() => setRosterFactionFilter(fid)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                    rosterFactionFilter === fid
                      ? 'bg-emerald-400 text-slate-950 shadow'
                      : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            data-testid="proto-roster-grid"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          >
            {filteredRoles.map((role) => {
              const eff = effectiveCharacterSecrecy(role.id);
              return (
                <div key={role.id} className="mx-auto w-full max-w-[270px]">
                  <MidnightCharacterCard
                    testId={`proto-roster-card-${role.id}`}
                    roleId={role.id}
                    revealed={eff.revealed}
                    viewerMode={eff.viewerMode}
                    woundsTaken={woundsTaken}
                    foilEnabled={foilEnabled}
                    showGoalFooter={false}
                    onFlipToggle={() => toggleFlipKey(role.id)}
                    onZoom={() =>
                      setZoomTarget({
                        kind: 'role',
                        roleId: role.id,
                        revealed: eff.revealed,
                        viewerMode: eff.viewerMode,
                        woundsTaken,
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* PHẦN 6: THƯ VIỆN ĐỦ 40 LOẠI THẺ / 48 BẢN SAO */}
        <section data-testid="proto-section-card-library-40" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white sm:text-2xl">
                6. Thư Viện Đủ 40 Loại Thẻ / 48 Bản Sao (Điều Tra · Trang Bị · Đột Kích)
              </h2>
              <p className="text-xs text-slate-400 sm:text-sm">
                Tất cả 40 mẫu minh họa AI 2:3 với huy hiệu chỉ số &amp; số bản sao; dùng template chung và lazy-loading cho độ mượt tối đa.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['all', 'Tất cả (40 loại / 48 lá)'],
                  ['investigation', 'Điều Tra (12 / 16 lá)'],
                  ['equipment', 'Cung Ứng (15 / 16 lá)'],
                  ['event', 'Đột Kích (13 / 16 lá)'],
                ] as const
              ).map(([did, label]) => (
                <button
                  key={did}
                  type="button"
                  data-testid={`proto-lib-tab-${did}`}
                  onClick={() => setLibraryDeckFilter(did)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                    libraryDeckFilter === did
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            data-testid="proto-card-library"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          >
            {filteredLibraryCards.map((card) => {
              const zoneOverride = manualFlipIds[card.id]
                ? ('draw-pile' as ActionCardZone)
                : cardZoneCfg.id;
              const isParticipant = manualFlipIds[card.id] ? false : cardZoneCfg.isParticipant;
              return (
                <div key={card.id} className="mx-auto w-full max-w-[260px]">
                  <MidnightActionCard
                    testId={`proto-library-card-${card.id}`}
                    cardId={card.id}
                    zone={zoneOverride}
                    isParticipantInInvestigation={isParticipant}
                    foilEnabled={foilEnabled}
                    onFlipToggle={() => toggleFlipKey(card.id)}
                    onZoom={() =>
                      setZoomTarget({
                        kind: 'card',
                        cardId: card.id,
                        zone: zoneOverride,
                        isParticipantInInvestigation: isParticipant,
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* PHẦN 7: 6 ĐỊA ĐIỂM KTX TABLETOP TILES, QUÂN CỜ ĐẾ NỔI & DI CHUYỂN MƯỢT */}
        <section data-testid="proto-section-tabletop-6-ktx" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white sm:text-2xl">
                7. Sáu Địa Điểm KTX Illustrated Tabletop Tiles &amp; Quân Cờ Đế Nổi
              </h2>
              <p className="text-xs text-slate-400 sm:text-sm">
                Bối cảnh KTX ban đêm có ánh đèn, sương nhẹ, quân cờ đế nổi 3D trượt FLIP mượt và chỉ hiện chân dung thật sau khi Lật Vai (P0).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="proto-glide-pawn-btn"
                onClick={() => setPawnStep((s) => s + 1)}
                className="rounded-xl border border-cyan-400/55 bg-cyan-950/75 px-3 py-1.5 text-xs font-black text-cyan-100 hover:bg-cyan-900/80 transition cursor-pointer"
              >
                🎲 Di chuyển thử quân cờ (Bước {pawnStep + 1})
              </button>
              <button
                type="button"
                data-testid="proto-reveal-pawn-btn"
                onClick={() => setPawnsRevealed((v) => !v)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                  pawnsRevealed
                    ? 'border-emerald-400/70 bg-emerald-950/80 text-emerald-200'
                    : 'border-amber-400/60 bg-amber-950/75 text-amber-200 hover:bg-amber-900/70'
                }`}
              >
                {pawnsRevealed ? '🔓 Đang lộ chân dung trên quân cờ' : '🎭 Lật vai thử trên quân cờ'}
              </button>
            </div>
          </div>

          <div
            ref={tabletopMapRef}
            data-testid="proto-tabletop-map"
            className="grid grid-cols-1 gap-3 md:grid-cols-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-3 sm:p-4"
          >
            {buildBoardClustersView(DEFAULT_CLUSTER_PAIRS).map((cluster) => (
              <div
                key={cluster.clusterId}
                className={`rounded-2xl border p-2.5 space-y-2 ${cluster.ringClass}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full border text-[11px] font-black whitespace-nowrap ${cluster.badgeClass}`}
                  >
                    {cluster.title}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-300">
                    Đánh chung cụm
                  </span>
                </div>
                <div className="space-y-2">
                  {cluster.locations.map((locId) => (
                    <TabletopLocationTile
                      key={locId}
                      locId={locId}
                      occupants={demoTabletopPlayers.filter((p) => p.location === locId)}
                      selfPlayerId="demo-p1"
                      activePlayerId="demo-p2"
                      selectedTargetId={selectedDemoPlayerId}
                      attackableIds={new Set(['demo-p3'])}
                      isSelfHere={demoTabletopPlayers[0]?.location === locId}
                      canChooseMoveHere={locId === 'court'}
                      rolledDestinationHere={locId === 'radio'}
                      reducedMotion={gfx.profile.reducedMotion}
                      enableMist={gfx.profile.enableMistDrift}
                      enableBackdropBlur={gfx.profile.enableBackdropBlur}
                      onSelectPlayer={setSelectedDemoPlayerId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <MidnightCardZoomModal
        target={zoomTarget}
        reducedMotion={!gfx.profile.enable3DTilt || gfx.profile.reducedMotion}
        foilEnabled={foilEnabled && gfx.profile.enableFoil}
        enableBackdropBlur={gfx.profile.enableBackdropBlur}
        onClose={() => setZoomTarget(null)}
      />
    </div>
  );
}
