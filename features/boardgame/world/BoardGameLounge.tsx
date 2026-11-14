'use client';

// ---------------------------------------------------------------------------
// features/boardgame/world/BoardGameLounge.tsx — Nội thất Phòng Sinh Hoạt Chung
// HUSTVerse Board Game Club (lazy-loaded khi người chơi bước vào CLB).
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { TimeOfDay } from '../../../lib/playerState';
import { CANVAS_VN_FONT, wrapVietnameseCanvasContext } from '../../../components/three/TextPlate';
import { BOARD_GAME_LOUNGE, BOARD_GAME_TABLES } from '../../campus/world-data';
import BoardGameTable from './BoardGameTable';
import BoardGameSeats, { type BoardGameSeatOccupant } from './BoardGameSeats';

function makeWoodFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#7C5338';
    ctx.fillRect(0, 0, 512, 512);
    const plankH = 64;
    for (let row = 0; row < 8; row++) {
      const y = row * plankH;
      ctx.fillStyle = row % 2 === 0 ? '#875A3E' : '#734B32';
      ctx.fillRect(0, y, 512, plankH - 2);
      ctx.fillStyle = '#4B2E1E';
      ctx.fillRect(0, y + plankH - 2, 512, 2);
      const splitX = ((row * 173 + 80) % 420) + 40;
      ctx.fillRect(splitX, y, 2, plankH);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 3);
  return tex;
}

function makeInfoBoardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const raw = canvas.getContext('2d');
  if (raw) {
    const ctx = wrapVietnameseCanvasContext(raw);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, 1024, 512);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, 996, 484);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FDE68A';
    ctx.font = `700 44px ${CANVAS_VN_FONT}`;
    ctx.fillText('BÓNG ĐÊM KTX — SECRETS AFTER DARK', 512, 74);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = `600 28px ${CANVAS_VN_FONT}`;
    ctx.fillText('CLB BOARD GAME KÝ TÚC XÁ ĐHBK HÀ NỘI · 4–8 NGƯỜI / BÀN', 512, 126);

    ctx.textAlign = 'left';
    const bullets = [
      '• Đội Gác Đèn: Khôi phục Tín hiệu đạt 6 điểm hoặc hạ Hội Màn Sương.',
      '• Hội Màn Sương: Đẩy Nhiễu sóng đạt 6 điểm hoặc triệt tiêu Đội Gác Đèn.',
      '• Kẻ Lang Thang: Hoàn thành mục tiêu cá nhân bí mật trước khi hết vòng.',
      '• Đi lại tự do quanh phòng, chọn ghế ngồi hoặc bấm [E] tại bảng để xem luật.',
    ];
    ctx.fillStyle = '#E2E8F0';
    ctx.font = `600 26px ${CANVAS_VN_FONT}`;
    bullets.forEach((line, i) => {
      ctx.fillText(line, 58, 206 + i * 62);
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makePosterTexture(title: string, accent: string, tag: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const raw = canvas.getContext('2d');
  if (raw) {
    const ctx = wrapVietnameseCanvasContext(raw);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 256, 384);
    ctx.fillStyle = accent;
    ctx.fillRect(16, 16, 224, 196);
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 236, 364);
    ctx.fillStyle = '#FEF3C7';
    ctx.textAlign = 'center';
    ctx.font = `700 24px ${CANVAS_VN_FONT}`;
    ctx.fillText(title, 128, 268);
    ctx.fillStyle = '#9CA3AF';
    ctx.font = `600 18px ${CANVAS_VN_FONT}`;
    ctx.fillText(tag, 128, 326);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeExitSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const raw = canvas.getContext('2d');
  if (raw) {
    const ctx = wrapVietnameseCanvasContext(raw);
    ctx.fillStyle = '#065F46';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#6EE7B7';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = '#ECFDF5';
    ctx.textAlign = 'center';
    ctx.font = `700 34px ${CANVAS_VN_FONT}`;
    ctx.fillText('LỐI RA SÂN KTX [E]', 256, 76);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export interface BoardGameLoungeProps {
  timeOfDay?: TimeOfDay;
  nearestSeatId?: string | null;
  activeSeatId?: string | null;
  occupants?: readonly BoardGameSeatOccupant[];
  localPlayerId?: string | null;
  table1Count?: number;
  table2Count?: number;
  onSelectSeat?: (seatId: string) => void;
}

export default function BoardGameLounge({
  timeOfDay = 'day',
  nearestSeatId = null,
  activeSeatId = null,
  occupants = [],
  localPlayerId = null,
  table1Count = 0,
  table2Count = 0,
  onSelectSeat,
}: BoardGameLoungeProps) {
  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset';

  const floorTex = useMemo(() => makeWoodFloorTexture(), []);
  const infoTex = useMemo(() => makeInfoBoardTexture(), []);
  const poster1Tex = useMemo(() => makePosterTexture('ĐÊM HỘI KTX', '#991B1B', 'Thứ 7 hàng tuần'), []);
  const poster2Tex = useMemo(() => makePosterTexture('GIỮ BÍ MẬT', '#1E3A8A', 'Suy luận chiến thuật'), []);
  const exitTex = useMemo(() => makeExitSignTexture(), []);

  useEffect(() => {
    return () => {
      floorTex.dispose();
      infoTex.dispose();
      poster1Tex.dispose();
      poster2Tex.dispose();
      exitTex.dispose();
    };
  }, [floorTex, infoTex, poster1Tex, poster2Tex, exitTex]);

  const occupiedSeatIds = useMemo(() => {
    const s = new Set<string>();
    for (const o of occupants) s.add(o.seatId);
    if (activeSeatId) s.add(activeSeatId);
    return s;
  }, [occupants, activeSeatId]);

  const w = BOARD_GAME_LOUNGE.wallBounds.maxX - BOARD_GAME_LOUNGE.wallBounds.minX; // 14.7
  const d = BOARD_GAME_LOUNGE.wallBounds.maxZ - BOARD_GAME_LOUNGE.wallBounds.minZ; // 11.1
  const h = BOARD_GAME_LOUNGE.wallBounds.height; // 3.6
  const windowColor = isNight ? '#0F172A' : isSunset ? '#FDBA74' : '#BAE6FD';
  const windowEmissive = isNight ? '#1E293B' : isSunset ? '#FB923C' : '#E0F2FE';
  const windowIntensity = isNight ? 0.35 : isSunset ? 0.9 : 0.75;

  return (
    <group name="boardgame-lounge-interior">
      {/* Chiếu sáng không gian theo Ngày / Hoàng hôn / Đêm */}
      <ambientLight
        color={isNight ? '#3B2B22' : isSunset ? '#FED7AA' : '#FFF7ED'}
        intensity={isNight ? 0.55 : isSunset ? 0.85 : 1.05}
      />
      <directionalLight
        position={[-4, 3.2, 2]}
        color={isNight ? '#FDE68A' : isSunset ? '#FDBA74' : '#FFFFFF'}
        intensity={isNight ? 0.45 : isSunset ? 0.95 : 1.15}
        castShadow
      />

      {/* Sàn gỗ ấm */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floorTex} roughness={0.72} />
      </mesh>

      {/* Trần nhà + xà gỗ */}
      <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#3E2A20" roughness={0.85} />
      </mesh>
      {[-4.2, 0, 4.2].map((bx, idx) => (
        <mesh key={idx} position={[bx, h - 0.1, 0]}>
          <boxGeometry args={[0.24, 0.2, d]} />
          <meshStandardMaterial color="#2C1D15" roughness={0.82} />
        </mesh>
      ))}

      {/* 4 bức tường bao quanh (nền kem + ốp gỗ nửa dưới chống lọt tia) */}
      {/* Tường Bắc (-Z) */}
      <mesh position={[0, h / 2, BOARD_GAME_LOUNGE.wallBounds.minZ]} receiveShadow>
        <boxGeometry args={[w, h, 0.22]} />
        <meshStandardMaterial color="#EFE6D5" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.55, BOARD_GAME_LOUNGE.wallBounds.minZ + 0.12]} receiveShadow>
        <boxGeometry args={[w - 0.1, 1.1, 0.04]} />
        <meshStandardMaterial color="#5D4037" roughness={0.82} />
      </mesh>

      {/* Tường Nam (+Z, có cửa ra sân KTX ở giữa) */}
      <mesh position={[0, h / 2, BOARD_GAME_LOUNGE.wallBounds.maxZ]} receiveShadow>
        <boxGeometry args={[w, h, 0.22]} />
        <meshStandardMaterial color="#EFE6D5" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.55, BOARD_GAME_LOUNGE.wallBounds.maxZ - 0.12]} receiveShadow>
        <boxGeometry args={[w - 0.1, 1.1, 0.04]} />
        <meshStandardMaterial color="#5D4037" roughness={0.82} />
      </mesh>

      {/* Tường Tây (-X) */}
      <mesh position={[BOARD_GAME_LOUNGE.wallBounds.minX, h / 2, 0]} receiveShadow>
        <boxGeometry args={[0.22, h, d]} />
        <meshStandardMaterial color="#E7DCC8" roughness={0.88} />
      </mesh>
      <mesh position={[BOARD_GAME_LOUNGE.wallBounds.minX + 0.12, 0.55, 0]} receiveShadow>
        <boxGeometry args={[0.04, 1.1, d - 0.1]} />
        <meshStandardMaterial color="#5D4037" roughness={0.82} />
      </mesh>

      {/* Tường Đông (+X) */}
      <mesh position={[BOARD_GAME_LOUNGE.wallBounds.maxX, h / 2, 0]} receiveShadow>
        <boxGeometry args={[0.22, h, d]} />
        <meshStandardMaterial color="#E7DCC8" roughness={0.88} />
      </mesh>
      <mesh position={[BOARD_GAME_LOUNGE.wallBounds.maxX - 0.12, 0.55, 0]} receiveShadow>
        <boxGeometry args={[0.04, 1.1, d - 0.1]} />
        <meshStandardMaterial color="#5D4037" roughness={0.82} />
      </mesh>

      {/* Cửa sổ hông Tây & Đông phản ánh thời gian Ngày/Hoàng hôn/Đêm */}
      {[-2.2, 1.6].map((wz, idx) => (
        <group key={idx}>
          <mesh position={[BOARD_GAME_LOUNGE.wallBounds.minX + 0.14, 1.95, wz]}>
            <boxGeometry args={[0.06, 1.35, 1.65]} />
            <meshStandardMaterial
              color={windowColor}
              emissive={windowEmissive}
              emissiveIntensity={windowIntensity}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[BOARD_GAME_LOUNGE.wallBounds.maxX - 0.14, 1.95, wz]}>
            <boxGeometry args={[0.06, 1.35, 1.65]} />
            <meshStandardMaterial
              color={windowColor}
              emissive={windowEmissive}
              emissiveIntensity={windowIntensity}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}

      {/* Dây đèn trang trí vàng ấm trên tường Bắc */}
      {Array.from({ length: 11 }, (_, i) => -5 + i).map((lx, idx) => (
        <mesh
          key={idx}
          position={[
            lx,
            3.12 - Math.sin((idx / 10) * Math.PI) * 0.22,
            BOARD_GAME_LOUNGE.wallBounds.minZ + 0.22,
          ]}
        >
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshStandardMaterial
            color="#FEF3C7"
            emissive="#FBBF24"
            emissiveIntensity={isNight ? 1.8 : 0.7}
          />
        </mesh>
      ))}

      {/* Cửa ra vào phía Nam (+Z) */}
      <group position={[0, 0, BOARD_GAME_LOUNGE.wallBounds.maxZ - 0.16]}>
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[1.9, 2.3, 0.1]} />
          <meshStandardMaterial color="#3E2723" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.15, -0.04]}>
          <boxGeometry args={[1.64, 2.1, 0.05]} />
          <meshStandardMaterial color="#78350F" roughness={0.62} />
        </mesh>
        <mesh position={[0, 2.58, -0.05]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.55, 0.38]} />
          <meshStandardMaterial
            map={exitTex}
            emissive="#34D399"
            emissiveMap={exitTex}
            emissiveIntensity={isNight ? 0.75 : 0.35}
          />
        </mesh>
        {/* Thảm chùi chân đỏ trước cửa */}
        <mesh position={[0, 0.012, -0.78]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.8, 0.9]} />
          <meshStandardMaterial color="#991B1B" roughness={0.95} />
        </mesh>
      </group>

      {/* Bảng thông tin trận đấu CLB trên tường Bắc (0, -5.2) */}
      <group position={[0, 1.65, BOARD_GAME_LOUNGE.wallBounds.minZ + 0.18]}>
        <mesh castShadow>
          <boxGeometry args={[2.95, 1.55, 0.08]} />
          <meshStandardMaterial color="#451A03" roughness={0.72} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[2.76, 1.38]} />
          <meshStandardMaterial
            map={infoTex}
            emissive="#FDE68A"
            emissiveMap={infoTex}
            emissiveIntensity={isNight ? 0.38 : 0.12}
          />
        </mesh>
      </group>

      {/* Tủ trò chơi board game (-5.6, -4.65) */}
      <group position={[-5.6, 0, -4.7]}>
        <mesh position={[0, 1.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.15, 2.16, 0.56]} />
          <meshStandardMaterial color="#5C3A21" roughness={0.78} />
        </mesh>
        {/* 3 ngăn chứa hộp board game nhiều màu */}
        {[0.48, 1.05, 1.62].map((sy, rowIdx) => (
          <group key={rowIdx} position={[0, sy, 0.06]}>
            {[-0.7, -0.35, 0.02, 0.4, 0.74].map((bx, boxIdx) => (
              <mesh key={boxIdx} position={[bx, 0.16, 0.06]} castShadow>
                <boxGeometry args={[0.28, 0.34, 0.38]} />
                <meshStandardMaterial
                  color={['#B91C1C', '#1D4ED8', '#D97706', '#047857', '#6D28D9'][(rowIdx + boxIdx) % 5]}
                  roughness={0.62}
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Quầy nước nhỏ CLB (+5.4, -4.45) */}
      <group position={[5.4, 0, -4.55]}>
        <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.35, 1.04, 0.85]} />
          <meshStandardMaterial color="#4A2E1E" roughness={0.74} />
        </mesh>
        <mesh position={[0, 1.06, 0]} castShadow>
          <boxGeometry args={[2.45, 0.07, 0.95]} />
          <meshStandardMaterial color="#D6D3D1" roughness={0.48} />
        </mesh>
        {/* Bình trà đá, ly giấy & hũ đồ ăn vặt */}
        <mesh position={[-0.65, 1.24, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 0.3, 12]} />
          <meshStandardMaterial color="#0284C7" roughness={0.3} />
        </mesh>
        <mesh position={[0.1, 1.2, 0.12]} castShadow>
          <cylinderGeometry args={[0.11, 0.11, 0.24, 12]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.35} />
        </mesh>
        <mesh position={[0.68, 1.28, -0.1]}>
          <sphereGeometry args={[0.11, 10, 10]} />
          <meshStandardMaterial
            color="#FEF3C7"
            emissive="#F59E0B"
            emissiveIntensity={isNight ? 1.4 : 0.6}
          />
        </mesh>
      </group>

      {/* Góc đứng xem & ghế băng chờ trận (+5.3, +3.6) */}
      <group position={[5.3, 0, 3.6]} rotation={[0, -0.35, 0]}>
        <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.85, 0.1, 0.62]} />
          <meshStandardMaterial color="#7C2D12" roughness={0.75} />
        </mesh>
        <mesh position={[-0.76, 0.22, 0]} castShadow>
          <boxGeometry args={[0.1, 0.44, 0.52]} />
          <meshStandardMaterial color="#27272A" roughness={0.7} />
        </mesh>
        <mesh position={[0.76, 0.22, 0]} castShadow>
          <boxGeometry args={[0.1, 0.44, 0.52]} />
          <meshStandardMaterial color="#27272A" roughness={0.7} />
        </mesh>
      </group>

      {/* Poster CLB dán tường Tây & Đông */}
      <mesh position={[BOARD_GAME_LOUNGE.wallBounds.minX + 0.16, 1.85, -3.9]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.72, 1.08]} />
        <meshStandardMaterial map={poster1Tex} roughness={0.5} />
      </mesh>
      <mesh position={[BOARD_GAME_LOUNGE.wallBounds.maxX - 0.16, 1.85, 3.6]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.72, 1.08]} />
        <meshStandardMaterial map={poster2Tex} roughness={0.5} />
      </mesh>

      {/* 2 Bàn Board Game chính & 16 ghế */}
      <BoardGameTable
        table={BOARD_GAME_TABLES[0]}
        isNight={isNight}
        nearestSeatId={nearestSeatId}
        activeSeatId={activeSeatId}
        occupiedSeatIds={occupiedSeatIds}
        playerCount={table1Count}
        onSelectSeat={onSelectSeat}
      />
      <BoardGameTable
        table={BOARD_GAME_TABLES[1]}
        isNight={isNight}
        nearestSeatId={nearestSeatId}
        activeSeatId={activeSeatId}
        occupiedSeatIds={occupiedSeatIds}
        playerCount={table2Count}
        onSelectSeat={onSelectSeat}
      />

      {/* Avatar các người chơi khác đang ngồi tại bàn */}
      <BoardGameSeats
        occupants={occupants}
        localPlayerId={localPlayerId}
        localSeatId={activeSeatId}
      />
    </group>
  );
}
