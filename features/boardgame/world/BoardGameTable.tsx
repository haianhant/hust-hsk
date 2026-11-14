'use client';

// ---------------------------------------------------------------------------
// features/boardgame/world/BoardGameTable.tsx — Bàn chơi 8 ghế + đạo cụ
// board game Bóng Đêm KTX + đèn thả trần vàng ấm.
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { CANVAS_VN_FONT, wrapVietnameseCanvasContext } from '../../../components/three/TextPlate';
import {
  BOARD_GAME_SEATS,
  type BoardGameSeatSpec,
  type BoardGameTableSpec,
} from '../../campus/world-data';

function makeGameBoardTexture(tableLabel: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const raw = canvas.getContext('2d');
  if (raw) {
    const ctx = wrapVietnameseCanvasContext(raw);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 488, 360);

    // 6 ô khu vực KTX trên bàn cờ
    const zones = [
      { x: 36, y: 84, color: '#1E3A8A', name: 'Sảnh KTX' },
      { x: 192, y: 84, color: '#92400E', name: 'Căng Tin' },
      { x: 348, y: 84, color: '#6B21A8', name: 'Phát Thanh' },
      { x: 36, y: 222, color: '#065F46', name: 'Sân Bóng' },
      { x: 192, y: 222, color: '#374151', name: 'Hành Lang B7' },
      { x: 348, y: 222, color: '#991B1B', name: 'Cầu Dao' },
    ];
    for (const z of zones) {
      ctx.fillStyle = z.color;
      ctx.fillRect(z.x, z.y, 128, 108);
      ctx.strokeStyle = '#FCD34D';
      ctx.lineWidth = 2;
      ctx.strokeRect(z.x, z.y, 128, 108);
      ctx.fillStyle = '#F9FAFB';
      ctx.textAlign = 'center';
      ctx.font = `700 18px ${CANVAS_VN_FONT}`;
      ctx.fillText(z.name, z.x + 64, z.y + 60);
    }

    ctx.fillStyle = '#FBBF24';
    ctx.textAlign = 'center';
    ctx.font = `700 26px ${CANVAS_VN_FONT}`;
    ctx.fillText(`BÓNG ĐÊM KTX · ${tableLabel.toUpperCase()}`, 256, 48);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export interface BoardGameTableProps {
  table: BoardGameTableSpec;
  isNight?: boolean;
  nearestSeatId?: string | null;
  activeSeatId?: string | null;
  occupiedSeatIds?: ReadonlySet<string>;
  playerCount?: number;
  onSelectSeat?: (seatId: string) => void;
}

export default function BoardGameTable({
  table,
  isNight = false,
  nearestSeatId = null,
  activeSeatId = null,
  occupiedSeatIds,
  playerCount = 0,
  onSelectSeat,
}: BoardGameTableProps) {
  const seats = useMemo(
    () => BOARD_GAME_SEATS.filter((s) => s.tableId === table.tableId),
    [table.tableId],
  );
  const boardTex = useMemo(() => makeGameBoardTexture(table.tableId === 'table-1' ? 'Bàn 1' : 'Bàn 2'), [table.tableId]);

  useEffect(() => {
    return () => {
      boardTex.dispose();
    };
  }, [boardTex]);

  const { center, width, depth, height } = table;
  const lampIntensity = isNight ? 5.2 : 2.6;

  return (
    <group name={`boardgame-table-group-${table.tableId}`}>
      <group position={[center.x, 0, center.z]}>
        {/* Thảm lót dưới chân bàn */}
        <mesh position={[0, 0.008, 0]} receiveShadow>
          <boxGeometry args={[width + 1.5, 0.014, depth + 1.5]} />
          <meshStandardMaterial
            color={table.tableId === 'table-1' ? '#2B3A42' : '#3E2C27'}
            roughness={0.95}
          />
        </mesh>

        {/* Mặt bàn gỗ óc chó */}
        <mesh position={[0, height - 0.03, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, 0.06, depth]} />
          <meshStandardMaterial color="#5C3A21" roughness={0.62} />
        </mesh>
        {/* Yếm bàn dưới mặt */}
        <mesh position={[0, height - 0.08, 0]} castShadow>
          <boxGeometry args={[width - 0.16, 0.06, depth - 0.16]} />
          <meshStandardMaterial color="#3B2314" roughness={0.75} />
        </mesh>

        {/* 4 chân bàn chắc chắn */}
        {[
          [-width / 2 + 0.15, -depth / 2 + 0.15],
          [width / 2 - 0.15, -depth / 2 + 0.15],
          [-width / 2 + 0.15, depth / 2 - 0.15],
          [width / 2 - 0.15, depth / 2 - 0.15],
        ].map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, (height - 0.06) / 2, lz]} castShadow receiveShadow>
            <boxGeometry args={[0.11, height - 0.06, 0.11]} />
            <meshStandardMaterial color="#3B2314" roughness={0.78} />
          </mesh>
        ))}

        {/* Tấm nỉ xanh rêu đặt giữa bàn */}
        <mesh position={[0, height + 0.006, 0]} receiveShadow>
          <boxGeometry args={[width - 0.36, 0.01, depth - 0.32]} />
          <meshStandardMaterial color="#1E3F35" roughness={0.92} />
        </mesh>

        {/* Bàn cờ Bóng Đêm KTX in sơ đồ 6 khu vực */}
        <mesh position={[0, height + 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1.05, 0.78]} />
          <meshStandardMaterial map={boardTex} roughness={0.65} />
        </mesh>

        {/* 3 chồng thẻ bài: Manh mối (vàng), Sự kiện (đỏ), Chiến thuật (xanh) */}
        {[
          { x: -0.78, z: -0.24, color: '#F59E0B' },
          { x: -0.78, z: 0.04, color: '#DC2626' },
          { x: -0.78, z: 0.3, color: '#2563EB' },
        ].map((deck, idx) => (
          <group key={idx} position={[deck.x, height + 0.032, deck.z]} rotation={[0, (idx - 1) * 0.08, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.16, 0.045, 0.21]} />
              <meshStandardMaterial color={deck.color} roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.025, 0]}>
              <boxGeometry args={[0.14, 0.006, 0.19]} />
              <meshStandardMaterial color="#FEF3C7" roughness={0.6} />
            </mesh>
          </group>
        ))}

        {/* Đèn bão mini + 2 viên xúc xắc ở góc bàn */}
        <group position={[0.78, height + 0.015, 0]}>
          <mesh position={[0, 0.09, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.07, 0.16, 10]} />
            <meshStandardMaterial
              color="#FDE68A"
              emissive="#F59E0B"
              emissiveIntensity={isNight ? 1.5 : 0.6}
              roughness={0.35}
            />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <coneGeometry args={[0.08, 0.06, 10]} />
            <meshStandardMaterial color="#78350F" roughness={0.6} />
          </mesh>
          <mesh position={[-0.14, 0.03, 0.12]} rotation={[0.2, 0.5, 0]} castShadow>
            <boxGeometry args={[0.048, 0.048, 0.048]} />
            <meshStandardMaterial color="#FAFAFA" roughness={0.4} />
          </mesh>
          <mesh position={[-0.08, 0.03, -0.14]} rotation={[0, -0.4, 0.1]} castShadow>
            <boxGeometry args={[0.048, 0.048, 0.048]} />
            <meshStandardMaterial color="#DC2626" roughness={0.4} />
          </mesh>
        </group>

        {/* Đèn thả trần vàng ấm chiếu thẳng xuống mặt bàn */}
        <group position={[0, 2.25, 0]}>
          <mesh position={[0, 0.68, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 1.35, 8]} />
            <meshStandardMaterial color="#18181B" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0]} castShadow>
            <coneGeometry args={[0.36, 0.24, 16, 1, true]} />
            <meshStandardMaterial color="#292524" side={THREE.DoubleSide} roughness={0.55} />
          </mesh>
          <mesh position={[0, -0.05, 0]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial
              color="#FFFBEB"
              emissive="#FBBF24"
              emissiveIntensity={isNight ? 2.2 : 1.1}
            />
          </mesh>
          <pointLight
            position={[0, -0.18, 0]}
            color="#FFCA7A"
            intensity={lampIntensity}
            distance={8.5}
            decay={1.8}
          />
        </group>

        {/* Vòng tròn hiển thị trạng thái bàn hoạt động trên thảm */}
        {playerCount > 0 && (
          <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.65, 1.72, 32]} />
            <meshBasicMaterial color="#F59E0B" transparent opacity={0.55} />
          </mesh>
        )}
      </group>

      {/* 8 chiếc ghế gỗ bố trí chuẩn xác quanh bàn */}
      {seats.map((seat) => (
        <BoardGameChair
          key={seat.seatId}
          seat={seat}
          highlighted={nearestSeatId === seat.seatId}
          isActive={activeSeatId === seat.seatId}
          isOccupied={Boolean(occupiedSeatIds?.has(seat.seatId))}
          onSelectSeat={onSelectSeat}
        />
      ))}
    </group>
  );
}

function BoardGameChair({
  seat,
  highlighted,
  isActive,
  isOccupied,
  onSelectSeat,
}: {
  seat: BoardGameSeatSpec;
  highlighted: boolean;
  isActive: boolean;
  isOccupied: boolean;
  onSelectSeat?: (seatId: string) => void;
}) {
  return (
    <group
      name={`boardgame-chair-${seat.seatId}`}
      position={[seat.x, 0, seat.z]}
      rotation={[0, seat.facing, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (!isOccupied && onSelectSeat) {
          onSelectSeat(seat.seatId);
        }
      }}
    >
      {/* Đệm ghế */}
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.055, 0.42]} />
        <meshStandardMaterial
          color={isActive ? '#059669' : isOccupied ? '#991B1B' : '#78350F'}
          roughness={0.75}
        />
      </mesh>
      {/* Lưng tựa phía sau (-Z local khi nhân vật nhìn theo +Z quay vào bàn) */}
      <mesh position={[0, 0.7, -0.18]} castShadow>
        <boxGeometry args={[0.4, 0.48, 0.05]} />
        <meshStandardMaterial color="#451A03" roughness={0.78} />
      </mesh>
      {/* 4 chân ghế */}
      {[
        [-0.17, -0.17],
        [0.17, -0.17],
        [-0.17, 0.17],
        [0.17, 0.17],
      ].map(([cx, cz], idx) => (
        <mesh key={idx} position={[cx, 0.22, cz]} castShadow>
          <boxGeometry args={[0.045, 0.44, 0.045]} />
          <meshStandardMaterial color="#291D14" roughness={0.8} />
        </mesh>
      ))}
      {/* Vòng sáng chân ghế khi tới gần */}
      {(highlighted || isActive) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.34, 24]} />
          <meshBasicMaterial color={isActive ? '#10B981' : '#FBBF24'} transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}
