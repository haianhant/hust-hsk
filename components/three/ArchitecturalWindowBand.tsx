// ---------------------------------------------------------------------------
// ArchitecturalWindowBand.tsx — Hệ cửa sổ nổi khối 3D & diềm/chân đế PBR
// dùng chung cho cụm Khu Đông (B1, A1-5, A17, Nhà E, Nhà T), KTX, Nhà thi đấu
// và giảng đường D2–D9 (giữ draw calls cực thấp bằng InstancedMesh + cleanup).
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getSharedBuildingPbrTextures } from './materials';

export interface WindowGrid3DProps {
  /** Tọa độ tâm mặt tường trên bề mặt tường (mặt ngoài đẩy theo +Z cục bộ) */
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Danh sách tọa độ tâm X cục bộ của các cột cửa sổ */
  colXs: readonly number[];
  /** Danh sách cao độ Y tâm của các tầng cửa sổ */
  rowYs: readonly number[];
  winW?: number;
  winH?: number;
  frameColor?: string;
  sillColor?: string;
  glassColor?: string;
  isNight?: boolean;
  seedOffset?: number;
  withRainHood?: boolean;
  withAcUnits?: boolean;
}

type CellSpec = {
  x: number;
  y: number;
  lit: boolean;
  coolTone: boolean;
  hasAc: boolean;
};

/**
 * Mảng cửa sổ 3D nhiều tầng gồm: kính phản chiếu IBL (+0,022m), khung nhôm + đố chữ thập (+0,042m),
 * bệ cửa sổ (+0,065m), ô văng che mưa (+0,08m) và tùy chọn cục nóng điều hòa có lồng quạt.
 */
export function WindowGrid3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  colXs,
  rowYs,
  winW = 1.45,
  winH = 1.25,
  frameColor = '#334155',
  sillColor = '#CBD5E1',
  glassColor = '#27445C',
  isNight = false,
  seedOffset = 17,
  withRainHood = true,
  withAcUnits = false,
}: WindowGrid3DProps) {
  const unlitRef = useRef<THREE.InstancedMesh>(null);
  const litRef = useRef<THREE.InstancedMesh>(null);
  const framePartRef = useRef<THREE.InstancedMesh>(null);
  const sillHoodRef = useRef<THREE.InstancedMesh>(null);
  const acBoxRef = useRef<THREE.InstancedMesh>(null);
  const acFanRef = useRef<THREE.InstancedMesh>(null);
  const pbr = useMemo(() => getSharedBuildingPbrTextures(), []);

  const cells = useMemo<CellSpec[]>(() => {
    const out: CellSpec[] = [];
    for (let r = 0; r < rowYs.length; r++) {
      for (let c = 0; c < colXs.length; c++) {
        const hash = Math.abs((r + 3) * 31 + (c + 5) * 17 + seedOffset * 13);
        const lit = isNight && hash % 3 !== 0;
        const coolTone = hash % 5 === 0;
        const hasAc = withAcUnits && r >= 1 && hash % 4 === 1;
        out.push({ x: colXs[c], y: rowYs[r], lit, coolTone, hasAc });
      }
    }
    return out;
  }, [colXs, rowYs, isNight, seedOffset, withAcUnits]);

  const unlitCells = useMemo(() => cells.filter((c) => !c.lit), [cells]);
  const litCells = useMemo(() => cells.filter((c) => c.lit), [cells]);
  const acCells = useMemo(() => cells.filter((c) => c.hasAc), [cells]);

  const geos = useMemo(() => {
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const fanCyl = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 12);
    fanCyl.rotateX(Math.PI / 2);
    return { unitBox, fanCyl };
  }, []);

  useEffect(
    () => () => {
      geos.unitBox.dispose();
      geos.fanCyl.dispose();
    },
    [geos],
  );

  // Mỗi cửa sổ gồm 6 thanh khung/đố (trên, dưới, trái, phải, đố đứng giữa, đố ngang giữa)
  const frameInstancesCount = cells.length * 6;
  const sillHoodCount = cells.length * (withRainHood ? 2 : 1);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const col = new THREE.Color();

    if (unlitRef.current) {
      unlitCells.forEach((cell, idx) => {
        pos.set(cell.x, cell.y, 0.022);
        scl.set(winW - 0.08, winH - 0.08, 0.024);
        m.compose(pos, q, scl);
        unlitRef.current!.setMatrixAt(idx, m);
      });
      unlitRef.current.instanceMatrix.needsUpdate = true;
    }

    if (litRef.current) {
      litCells.forEach((cell, idx) => {
        pos.set(cell.x, cell.y, 0.022);
        scl.set(winW - 0.08, winH - 0.08, 0.024);
        m.compose(pos, q, scl);
        litRef.current!.setMatrixAt(idx, m);
        col.set(cell.coolTone ? '#D4ECFF' : '#FFE3A3');
        litRef.current!.setColorAt(idx, col);
      });
      litRef.current.instanceMatrix.needsUpdate = true;
      if (litRef.current.instanceColor) litRef.current.instanceColor.needsUpdate = true;
    }

    if (framePartRef.current) {
      const t = 0.055;
      let ptr = 0;
      for (const cell of cells) {
        // 1 & 2: Cạnh trên & dưới khung
        pos.set(cell.x, cell.y + winH / 2 - t / 2, 0.042);
        scl.set(winW, t, 0.055);
        m.compose(pos, q, scl);
        framePartRef.current.setMatrixAt(ptr++, m);

        pos.set(cell.x, cell.y - winH / 2 + t / 2, 0.042);
        m.compose(pos, q, scl);
        framePartRef.current.setMatrixAt(ptr++, m);

        // 3 & 4: Cạnh trái & phải khung
        pos.set(cell.x - winW / 2 + t / 2, cell.y, 0.042);
        scl.set(t, winH, 0.055);
        m.compose(pos, q, scl);
        framePartRef.current.setMatrixAt(ptr++, m);

        pos.set(cell.x + winW / 2 - t / 2, cell.y, 0.042);
        m.compose(pos, q, scl);
        framePartRef.current.setMatrixAt(ptr++, m);

        // 5: Đố đứng chia 2 cánh cửa sổ
        pos.set(cell.x, cell.y, 0.044);
        scl.set(t * 0.72, winH - t, 0.042);
        m.compose(pos, q, scl);
        framePartRef.current.setMatrixAt(ptr++, m);

        // 6: Đố ngang tạo ô thoáng trên
        pos.set(cell.x, cell.y + winH * 0.22, 0.044);
        scl.set(winW - t, t * 0.68, 0.042);
        m.compose(pos, q, scl);
        framePartRef.current.setMatrixAt(ptr++, m);
      }
      framePartRef.current.instanceMatrix.needsUpdate = true;
    }

    if (sillHoodRef.current) {
      let ptr = 0;
      for (const cell of cells) {
        // Bệ cửa sổ đá nhô dưới
        pos.set(cell.x, cell.y - winH / 2 - 0.035, 0.072);
        scl.set(winW + 0.14, 0.065, 0.14);
        m.compose(pos, q, scl);
        sillHoodRef.current.setMatrixAt(ptr++, m);

        // Ô văng che mưa nhô phía trên
        if (withRainHood) {
          pos.set(cell.x, cell.y + winH / 2 + 0.055, 0.11);
          scl.set(winW + 0.22, 0.075, 0.22);
          m.compose(pos, q, scl);
          sillHoodRef.current.setMatrixAt(ptr++, m);
        }
      }
      sillHoodRef.current.instanceMatrix.needsUpdate = true;
    }

    if (acBoxRef.current && acFanRef.current && acCells.length > 0) {
      acCells.forEach((cell, idx) => {
        const ax = cell.x + winW * 0.34;
        const ay = cell.y - winH / 2 - 0.32;
        pos.set(ax, ay, 0.17);
        scl.set(0.62, 0.44, 0.28);
        m.compose(pos, q, scl);
        acBoxRef.current!.setMatrixAt(idx, m);

        pos.set(ax - 0.09, ay, 0.315);
        scl.set(1, 1, 1);
        m.compose(pos, q, scl);
        acFanRef.current!.setMatrixAt(idx, m);
      });
      acBoxRef.current.instanceMatrix.needsUpdate = true;
      acFanRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [cells, unlitCells, litCells, acCells, winW, winH, withRainHood]);

  if (cells.length === 0) return null;

  return (
    <group position={position} rotation={rotation}>
      {unlitCells.length > 0 && (
        <instancedMesh
          ref={unlitRef}
          key={`unlit-${unlitCells.length}`}
          args={[geos.unitBox, undefined, unlitCells.length]}
        >
          <meshStandardMaterial
            color={pbr?.windowGlass ? '#CFE3F7' : glassColor}
            map={pbr?.windowGlass}
            roughness={0.16}
            metalness={0.4}
            envMapIntensity={1.22}
          />
        </instancedMesh>
      )}
      {litCells.length > 0 && (
        <instancedMesh
          ref={litRef}
          key={`lit-${litCells.length}`}
          args={[geos.unitBox, undefined, litCells.length]}
        >
          <meshStandardMaterial
            color="#FFFFFF"
            emissive="#FFBE55"
            emissiveIntensity={0.85}
            roughness={0.22}
            metalness={0.15}
          />
        </instancedMesh>
      )}
      <instancedMesh
        ref={framePartRef}
        key={`frames-${frameInstancesCount}`}
        args={[geos.unitBox, undefined, frameInstancesCount]}
      >
        <meshStandardMaterial color={frameColor} roughness={0.55} metalness={0.35} />
      </instancedMesh>
      <instancedMesh
        ref={sillHoodRef}
        key={`sills-${sillHoodCount}`}
        args={[geos.unitBox, undefined, sillHoodCount]}
        receiveShadow
      >
        <meshStandardMaterial color={sillColor} roughness={0.82} />
      </instancedMesh>
      {acCells.length > 0 && (
        <>
          <instancedMesh
            ref={acBoxRef}
            key={`ac-box-${acCells.length}`}
            args={[geos.unitBox, undefined, acCells.length]}
          >
            <meshStandardMaterial color="#E2E8F0" roughness={0.62} metalness={0.15} />
          </instancedMesh>
          <instancedMesh
            ref={acFanRef}
            key={`ac-fan-${acCells.length}`}
            args={[geos.fanCyl, undefined, acCells.length]}
          >
            <meshStandardMaterial color="#1E293B" roughness={0.75} />
          </instancedMesh>
        </>
      )}
    </group>
  );
}

/**
 * Chân đế đá granite sẫm (chống cảm giác tường cắm thẳng xuống cỏ) + dải bóng âm dưới diềm mái nhô.
 */
export function RoofSoffitAndPlinth({
  w,
  d,
  height,
  plinthH = 0.48,
  plinthColor = '#64748B',
  graniteMap,
  graniteBump,
  showSoffit = true,
}: {
  w: number;
  d: number;
  height: number;
  plinthH?: number;
  plinthColor?: string;
  graniteMap?: THREE.CanvasTexture;
  graniteBump?: THREE.CanvasTexture;
  showSoffit?: boolean;
}) {
  return (
    <group>
      <mesh position={[0, plinthH / 2, 0]} receiveShadow>
        <boxGeometry args={[w + 0.14, plinthH, d + 0.14]} />
        <meshStandardMaterial
          color={plinthColor}
          map={graniteMap}
          bumpMap={graniteBump}
          bumpScale={0.014}
          roughness={0.86}
        />
      </mesh>
      {showSoffit && (
        <mesh position={[0, height - 0.08, 0]}>
          <boxGeometry args={[w + 0.24, 0.14, d + 0.24]} />
          <meshStandardMaterial color="#2E3438" roughness={0.92} />
        </mesh>
      )}
    </group>
  );
}
