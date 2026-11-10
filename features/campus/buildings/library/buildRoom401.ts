// ---------------------------------------------------------------------------
// buildRoom401.ts — Phòng đọc 401 (Tầng 4) & Phòng học nhóm 501 (Tầng 5)
// Chuyển thể chuẩn 1:1 từ mô hình thủ tục studywithhuster.cyou (buildRoom401).
// Bao gồm: 12 bàn đọc × 12 ghế (144 chỗ), dãy máy tính chữ L 17 máy,
// 6 dãy giá sách đôi InstancedMesh, quầy thủ thư hình bán nguyệt có đồng hồ
// thời gian thực Hà Nội + TV, cổng xoay 3 chấu inox và 24 quạt trần quay.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import {
  canvasTex,
  lin,
  makeLibraryStuccoWallTex,
  makeLibraryUpholsteryTex,
  makeLibraryWoodGrainTex,
  mulberry32,
  optimizeStaticLibraryGroup,
} from './procedural-helpers';
import {
  ROOM_401_DIMS,
  createLibraryLocation,
  resolveLibraryMovement,
} from '../../world-data/library-spatial';

export interface Room401Controller {
  hit: (x: number, z: number) => boolean;
  update: (dt: number, px: number, pz: number, active: boolean) => void;
}

export function buildRoom401(
  rootGroup: THREE.Group,
  roomLabel = 'PHÒNG ĐỌC 401',
): Room401Controller {
  const {
    RW,
    RD,
    RH,
    HW,
    HD,
    WT,
    DOOR_X,
    DOOR_W,
    TX,
    TZ_LOCAL: TZ,
    TW,
    TD,
    TH,
    STACK_X,
    STACK_Z_LOCAL: STACK_Z,
    STACK_W,
    STACK_D,
    STACK_H,
    COMP_W,
    COMP_R,
    COMP_CD,
    DESK_X,
    DESK_Z_LOCAL: DESK_Z,
    DESK_W,
    DESK_D,
  } = ROOM_401_DIMS;

  const mats: Record<string, THREE.MeshStandardMaterial> = {};
  const gCache: Record<string, THREE.BufferGeometry> = {};
  const M = (c: number, r = 0.7, m = 0, ex?: THREE.MeshStandardMaterialParameters) => {
    const k = `${c}_${r}_${m}_${ex ? JSON.stringify(ex) : ''}`;
    if (!mats[k]) {
      mats[k] = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...ex });
    }
    return mats[k];
  };
  const B = (w: number, h: number, d: number, m: THREE.Material) =>
    new THREE.Mesh((gCache[`b_${w}_${h}_${d}`] ??= new THREE.BoxGeometry(w, h, d)), m);
  const C = (rt: number, rb: number, h: number, s: number, m: THREE.Material) =>
    new THREE.Mesh((gCache[`c_${rt}_${rb}_${h}_${s}`] ??= new THREE.CylinderGeometry(rt, rb, h, s)), m);
  const add = <T extends THREE.Object3D>(
    p: THREE.Object3D,
    o: T,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
  ): T => {
    o.position.set(x, y, z);
    if (rx || ry || rz) o.rotation.set(rx, ry, rz);
    p.add(o);
    return o;
  };
  const bx = (
    p: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
  ) => add(p, B(w, h, d, m), x, y, z, rx, ry, rz);
  const cy = (
    p: THREE.Object3D,
    rt: number,
    rb: number,
    h: number,
    s: number,
    m: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
  ) => add(p, C(rt, rb, h, s, m), x, y, z, rx, ry, rz);
  const G = (p: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    if (ry) g.rotation.y = ry;
    p.add(g);
    return g;
  };

  const r4WallPbr = makeLibraryStuccoWallTex('#f2eee3', '#e2dbc9', 6, 3, 601);
  const r4WoodLight = makeLibraryWoodGrainTex('#dbb98a', '#b68a54', 2, 2, 602);
  const r4WoodMed = makeLibraryWoodGrainTex('#ba8a5a', '#8c5e34', 2, 2, 603);
  const r4WoodDark = makeLibraryWoodGrainTex('#6e4726', '#462a13', 2, 2, 604);
  const r4BlueFabric = makeLibraryUpholsteryTex('#1f5fa8', '#144175', 3, 3);
  const r4RedFabric = makeLibraryUpholsteryTex('#b83228', '#852019', 3, 3);

  const mWall = new THREE.MeshStandardMaterial({
    color: 0xf4f0e6,
    map: r4WallPbr.map,
    bumpMap: r4WallPbr.bumpMap,
    bumpScale: 0.004,
    roughness: 0.8,
  });
  const mCeiling = M(0xf7f5ef, 0.88);
  const mCol = M(0xe5e0d2, 0.72);
  const mBaseboard = M(0xc8bfa8, 0.58);
  const mWoodLight = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: r4WoodLight.map,
    bumpMap: r4WoodLight.bumpMap,
    bumpScale: 0.007,
    roughness: 0.44,
    metalness: 0.05,
  });
  const mWoodMed = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: r4WoodMed.map,
    bumpMap: r4WoodMed.bumpMap,
    bumpScale: 0.007,
    roughness: 0.48,
    metalness: 0.05,
  });
  const mWoodDark = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: r4WoodDark.map,
    bumpMap: r4WoodDark.bumpMap,
    bumpScale: 0.008,
    roughness: 0.45,
    metalness: 0.06,
  });
  const mDivider = M(0xe8d9b8, 0.62);
  const mChairBlue = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: r4BlueFabric.map,
    bumpMap: r4BlueFabric.bumpMap,
    bumpScale: 0.006,
    roughness: 0.54,
  });
  const mChairRed = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: r4RedFabric.map,
    bumpMap: r4RedFabric.bumpMap,
    bumpScale: 0.006,
    roughness: 0.54,
  });
  const mMetal = M(0x3a3e44, 0.4, 0.7);
  const mChrome = M(0xc8cdd2, 0.25, 0.85);
  const mBlack = M(0x1a1c20, 0.4, 0.3);
  const mScreen = M(0x1e3a5f, 0.25, 0.2, { emissive: 0x0f2844, emissiveIntensity: 0.9 });
  const mLightEmit = M(0xfffdf5, 0.2, 0, { emissive: 0xfff6dd, emissiveIntensity: 1.6 });
  const mWinEmit = M(0xdff2ff, 0.2, 0, { emissive: 0xbfe4ff, emissiveIntensity: 0.7 });
  const mGlass = new THREE.MeshStandardMaterial({
    color: 0xcfe8f8,
    transparent: true,
    opacity: 0.32,
    roughness: 0.1,
    metalness: 0.1,
  });
  const mPot = M(0x9c6644, 0.8);
  const mLeaf = M(0x3b7a3e, 0.7);
  const mSignGreen = M(0x1e7a3a, 0.5, 0, { emissive: 0x0e4a22, emissiveIntensity: 0.5 });

  // Sàn gạch caro sáng
  const floorTex = canvasTex(
    256,
    256,
    (fctx) => {
      fctx.fillStyle = '#e9e4d6';
      fctx.fillRect(0, 0, 256, 256);
      fctx.fillStyle = '#dfdacb';
      fctx.fillRect(0, 0, 128, 128);
      fctx.fillRect(128, 128, 128, 128);
      fctx.strokeStyle = '#c9c2b0';
      fctx.lineWidth = 3;
      fctx.strokeRect(0, 0, 128, 128);
      fctx.strokeRect(128, 0, 128, 128);
      fctx.strokeRect(0, 128, 128, 128);
      fctx.strokeRect(128, 128, 128, 128);
    },
    RW / 2,
    RD / 2,
  );

  add(
    rootGroup,
    new THREE.Mesh(
      new THREE.PlaneGeometry(RW, RD),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, metalness: 0.08 }),
    ),
    0,
    0,
    0,
    -Math.PI / 2,
  );
  add(rootGroup, new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), mCeiling), 0, RH, 0, Math.PI / 2);

  bx(rootGroup, RW, RH, WT, mWall, 0, RH / 2, -HD);
  bx(rootGroup, WT, RH, RD, mWall, -HW, RH / 2, 0);
  bx(rootGroup, WT, RH, RD, mWall, HW, RH / 2, 0);

  const lW = DOOR_X - DOOR_W / 2 - -HW;
  const rW = HW - (DOOR_X + DOOR_W / 2);
  bx(rootGroup, lW, RH, WT, mWall, -HW + lW / 2, RH / 2, HD);
  bx(rootGroup, rW, RH, WT, mWall, DOOR_X + DOOR_W / 2 + rW / 2, RH / 2, HD);
  bx(rootGroup, DOOR_W, RH - 2.34, WT, mWall, DOOR_X, 2.34 + (RH - 2.34) / 2, HD);
  bx(rootGroup, RW, 0.09, 0.036, mBaseboard, 0, 0.045, -HD + WT / 2 + 0.018);
  bx(rootGroup, 0.036, 0.09, RD, mBaseboard, -HW + WT / 2 + 0.018, 0.045, 0);
  bx(rootGroup, 0.036, 0.09, RD, mBaseboard, HW - WT / 2 - 0.018, 0.045, 0);

  for (const x of lin(6, -12, 12)) {
    bx(rootGroup, 0.33, RH, 0.27, mCol, x, RH / 2, -HD + 0.13);
    bx(rootGroup, 0.33, RH, 0.27, mCol, x, RH / 2, HD - 0.13);
  }
  for (const z of lin(5, -8.4, 8.4)) {
    bx(rootGroup, 0.27, RH, 0.33, mCol, -HW + 0.13, RH / 2, z);
    bx(rootGroup, 0.27, RH, 0.33, mCol, HW - 0.13, RH / 2, z);
  }
  for (const ix of [-5.04, 5.04]) {
    for (const iz of [-2.4, 3.6]) {
      bx(rootGroup, 0.39, RH, 0.39, mCol, ix, RH / 2, iz);
      bx(rootGroup, 0.45, 0.12, 0.45, mBaseboard, ix, 0.06, iz);
    }
  }

  const makeWin = (w: number, h: number) => {
    const g = new THREE.Group();
    bx(g, w + 0.09, h + 0.09, 0.072, mMetal, 0, 0, 0);
    bx(g, w, h, 0.024, mWinEmit, 0, 0, 0.012);
    bx(g, 0.036, h, 0.048, mMetal, 0, 0, 0.018);
    bx(g, w, 0.036, 0.048, mMetal, 0, 0, 0.018);
    bx(g, w + 0.144, 0.048, 0.132, mCol, 0, -h / 2 - 0.036, 0.024);
    return g;
  };
  for (const x of lin(5, -9.6, 9.6)) add(rootGroup, makeWin(2.52, 1.44), x, 2.04, -HD + WT / 2 + 0.012);
  for (const z of lin(4, -6.6, 6.6)) {
    add(rootGroup, makeWin(2.28, 1.44), HW - WT / 2 - 0.012, 2.04, z, 0, -Math.PI / 2);
    add(rootGroup, makeWin(2.28, 1.44), -HW + WT / 2 + 0.012, 2.04, z, 0, Math.PI / 2);
  }
  for (const x of [-4.2, 0, 4.2, 8.4]) add(rootGroup, makeWin(2.28, 1.32), x, 2.04, HD - WT / 2 - 0.012, 0, Math.PI);

  for (const lx of lin(5, -10.8, 10.8)) {
    for (const lz of lin(4, -7.8, 7.8)) {
      bx(rootGroup, 0.48, 0.036, 1.8, mMetal, lx, RH - 0.018, lz);
      bx(rootGroup, 0.408, 0.024, 1.728, mLightEmit, lx, RH - 0.033, lz);
    }
  }
  for (const ax of [-8.4, 0, 8.4]) {
    for (const az of [-5.4, 1.8]) {
      const ac = G(rootGroup, ax, RH - 0.03, az);
      bx(ac, 0.57, 0.06, 0.57, mCol);
      bx(ac, 0.39, 0.042, 0.39, mMetal, 0, -0.012, 0);
    }
  }

  const fanHubs: THREE.Group[] = [];
  const makeFan = () => {
    const g = new THREE.Group();
    cy(g, 0.072, 0.048, 0.06, 12, mCol, 0, 0, 0);
    cy(g, 0.018, 0.018, 0.33, 8, mCol, 0, -0.18, 0);
    const hub = G(g, 0, -0.36, 0);
    cy(hub, 0.108, 0.108, 0.054, 16, mCol);
    for (let i = 0; i < 3; i++) {
      const bg = G(hub, 0, 0, 0, (i * Math.PI * 2) / 3);
      bx(bg, 0.51, 0.01, 0.096, mCol, 0.312, 0, 0, 0.12);
    }
    fanHubs.push(hub);
    return g;
  };
  for (const fx of [-10.8, -6.6, -2.4, 2.4, 6.6, 10.8]) {
    for (const fz of [-9.3, -4.5, 0.9, 6.3]) add(rootGroup, makeFan(), fx, RH, fz);
  }

  const makeChair = (mat: THREE.Material) => {
    const g = new THREE.Group();
    bx(g, 0.312, 0.033, 0.3, mat, 0, 0.288, 0);
    bx(g, 0.3, 0.27, 0.027, mat, 0, 0.45, -0.138, -0.08);
    for (const [lx, lz] of [
      [-0.132, -0.126],
      [0.132, -0.126],
      [-0.132, 0.126],
      [0.132, 0.126],
    ]) {
      cy(g, 0.012, 0.012, 0.288, 6, mChrome, lx, 0.144, lz);
    }
    return g;
  };

  // Quầy máy tính chữ L (17 máy)
  const compG = G(rootGroup);
  const cY = 0.75;
  const cBackZ = -HD + WT / 2 + COMP_CD / 2 + 0.03;
  const cBackX0 = -0.3;
  const cBackX1 = cBackX0 + COMP_W;
  bx(compG, COMP_W, 0.042, COMP_CD, mWoodLight, (cBackX0 + cBackX1) / 2, cY, cBackZ);
  bx(compG, COMP_W, cY - 0.03, 0.03, mWoodMed, (cBackX0 + cBackX1) / 2, (cY - 0.03) / 2, cBackZ - COMP_CD / 2 + 0.018);
  for (const lx of lin(7, cBackX0 + 0.12, cBackX1 - 0.12)) {
    bx(compG, 0.036, cY, COMP_CD - 0.048, mMetal, lx, cY / 2, cBackZ);
  }
  const cRightX = HW - WT / 2 - COMP_CD / 2 - 0.03;
  const cRightZ0 = -HD + WT / 2 + COMP_CD;
  const cRightZ1 = cRightZ0 + COMP_R;
  bx(compG, COMP_CD, 0.042, COMP_R, mWoodLight, cRightX, cY, (cRightZ0 + cRightZ1) / 2);
  bx(compG, 0.03, cY - 0.03, COMP_R, mWoodMed, cRightX + COMP_CD / 2 - 0.018, (cY - 0.03) / 2, (cRightZ0 + cRightZ1) / 2);
  for (const lz of lin(6, cRightZ0 + 0.12, cRightZ1 - 0.12)) {
    bx(compG, COMP_CD - 0.048, cY, 0.036, mMetal, cRightX, cY / 2, lz);
  }

  const placePC = (x: number, z: number, ry: number) => {
    const u = G(compG, x, 0, z, ry);
    bx(u, 0.432, 0.276, 0.024, mBlack, 0, cY + 0.24, -0.108);
    bx(u, 0.396, 0.24, 0.006, mScreen, 0, cY + 0.24, -0.094);
    bx(u, 0.042, 0.108, 0.036, mBlack, 0, cY + 0.066, -0.114);
    bx(u, 0.156, 0.012, 0.12, mBlack, 0, cY + 0.024, -0.108);
    bx(u, 0.276, 0.012, 0.096, mBlack, -0.024, cY + 0.027, 0.084);
    bx(u, 0.042, 0.012, 0.066, mBlack, 0.168, cY + 0.027, 0.09);
    bx(u, 0.12, 0.27, 0.252, mBlack, 0.24, 0.15, -0.06);
    add(u, makeChair(mChairBlue), 0, 0, 0.39, 0, Math.PI);
  };
  for (const px of lin(10, cBackX0 + 0.72, cBackX1 - 0.72)) placePC(px, cBackZ, 0);
  for (let i = 0; i < 8; i++) {
    placePC(cRightX, cRightZ0 + 0.72 + (i * (COMP_R - 1.44)) / 7, -Math.PI / 2);
  }
  for (let i = 0; i < 9; i++) {
    bx(compG, 0.018, 0.39, COMP_CD - 0.036, mDivider, cBackX0 + 0.72 + ((i + 0.5) * (COMP_W - 1.44)) / 9, cY + 0.21, cBackZ);
  }
  for (let i = 0; i < 7; i++) {
    bx(compG, COMP_CD - 0.036, 0.39, 0.018, mDivider, cRightX, cY + 0.21, cRightZ0 + 0.72 + ((i + 0.5) * (COMP_R - 1.44)) / 7);
  }

  // 6 dãy giá sách đôi + InstancedMesh sách
  const stackG = G(rootGroup);
  const bookPalette = [
    0x9e2a2b, 0x1d3557, 0x2a6f4e, 0xb5651d, 0x5c3c92, 0x3d5a80, 0xbc4749, 0x6b705c,
    0xc9a227, 0x264653, 0x7f4f24, 0x457b9d,
  ];
  const shelfBays = 5;
  const shelfLevels = 5;
  const booksPerBaySide = 12;
  const totalBooks = STACK_X.length * shelfBays * shelfLevels * 2 * booksPerBaySide;
  const bookInst = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0.05 }),
    totalBooks,
  );
  let bookIdx = 0;
  const dummy = new THREE.Object3D();
  const bColor = new THREE.Color();
  const rng = mulberry32(401007);

  for (const sx of STACK_X) {
    const sg = G(stackG, sx, 0, STACK_Z);
    bx(sg, STACK_W, STACK_H, 0.048, mWoodDark, 0, STACK_H / 2, -STACK_D / 2 + 0.024);
    bx(sg, STACK_W, STACK_H, 0.048, mWoodDark, 0, STACK_H / 2, STACK_D / 2 - 0.024);
    bx(sg, 0.024, STACK_H - 0.06, STACK_D - 0.096, mWoodMed, 0, STACK_H / 2, 0);
    bx(sg, STACK_W + 0.024, 0.048, STACK_D, mWoodDark, 0, STACK_H + 0.012, 0);
    bx(sg, 0.168, 0.108, 0.012, M(0xfaf6e8, 0.5), 0, 1.56, STACK_D / 2 + 0.006);

    const bayLen = (STACK_D - 0.096) / shelfBays;
    for (let b = 1; b < shelfBays; b++) {
      bx(sg, STACK_W - 0.024, STACK_H - 0.06, 0.024, mWoodMed, 0, STACK_H / 2, -STACK_D / 2 + 0.048 + b * bayLen);
    }

    for (let lv = 0; lv < shelfLevels; lv++) {
      const sy = 0.15 + lv * 0.432;
      bx(sg, STACK_W - 0.012, 0.027, STACK_D - 0.096, mWoodLight, 0, sy, 0);
      for (let b = 0; b < shelfBays; b++) {
        const z0 = -STACK_D / 2 + 0.072 + b * bayLen;
        for (const side of [-1, 1]) {
          let zCur = z0 + 0.024;
          const zMax = z0 + bayLen - 0.036;
          for (let k = 0; k < booksPerBaySide; k++) {
            if (zCur >= zMax || rng() < 0.1) {
              zCur += 0.048;
              continue;
            }
            const t = 0.024 + rng() * 0.03;
            const h = 0.21 + rng() * 0.132;
            const d = 0.168 + rng() * 0.054;
            if (zCur + t > zMax) break;
            dummy.position.set(sx + side * (0.018 + d / 2), sy + 0.015 + h / 2, STACK_Z + zCur + t / 2);
            dummy.rotation.set((rng() - 0.5) * 0.05, 0, 0);
            dummy.scale.set(d, h, t);
            dummy.updateMatrix();
            bookInst.setMatrixAt(bookIdx, dummy.matrix);
            bColor.setHex(bookPalette[Math.floor(rng() * bookPalette.length)]);
            bookInst.setColorAt(bookIdx, bColor);
            bookIdx++;
            zCur += t + 0.003;
          }
        }
      }
    }
  }
  bookInst.count = bookIdx;
  bookInst.instanceMatrix.needsUpdate = true;
  if (bookInst.instanceColor) bookInst.instanceColor.needsUpdate = true;
  rootGroup.add(bookInst);

  // 12 Bàn đọc lớn × 12 ghế (144 ghế)
  const buildStudyTable = (tx: number, tz: number, idx: number) => {
    const tg = G(rootGroup, tx, 0, tz);
    bx(tg, TW, 0.042, TD, mWoodLight, 0, TH, 0);
    bx(tg, TW + 0.024, 0.048, TD + 0.024, mWoodMed, 0, TH - 0.006, 0);
    for (const [lx, lz] of [
      [-TW / 2 + 0.09, -TD / 2 + 0.09],
      [TW / 2 - 0.09, -TD / 2 + 0.09],
      [-TW / 2 + 0.09, TD / 2 - 0.09],
      [TW / 2 - 0.09, TD / 2 - 0.09],
      [0, -TD / 2 + 0.09],
      [0, TD / 2 - 0.09],
    ]) {
      bx(tg, 0.042, TH - 0.024, 0.042, mMetal, lx, (TH - 0.024) / 2, lz);
    }
    bx(tg, TW - 0.18, 0.03, 0.03, mMetal, 0, 0.18, -TD / 2 + 0.09);
    bx(tg, TW - 0.18, 0.03, 0.03, mMetal, 0, 0.18, TD / 2 - 0.09);

    const divH = 0.348;
    const divY = TH + 0.021 + divH / 2;
    bx(tg, 0.021, divH, TD - 0.072, mDivider, 0, divY, 0);
    bx(tg, 0.03, 0.021, TD - 0.06, mWoodMed, 0, TH + 0.021 + divH + 0.009, 0);

    for (let s = 1; s < 3; s++) {
      const sz = -TD / 2 + (s * TD) / 3;
      bx(tg, TW - 0.072, divH * 0.92, 0.018, mDivider, 0, TH + 0.021 + (divH * 0.92) / 2, sz);
      bx(tg, TW - 0.06, 0.018, 0.027, mWoodMed, 0, TH + 0.021 + divH * 0.92 + 0.009, sz);
    }
    bx(tg, 0.03, divH + 0.024, 0.03, mWoodDark, 0, divY, -TD / 2 + 0.048);
    bx(tg, 0.03, divH + 0.024, 0.03, mWoodDark, 0, divY, TD / 2 - 0.048);

    const slotD = TD / 3;
    for (let s = 0; s < 3; s++) {
      const cz = -TD / 2 + (s + 0.5) * slotD;
      cy(tg, 0.018, 0.021, divH + 0.24, 8, mChrome, 0, TH + 0.021 + (divH + 0.24) / 2, cz);
      bx(tg, 0.33, 0.024, 0.084, mMetal, 0, TH + 0.021 + divH + 0.24, cz);
      bx(tg, 0.3, 0.015, 0.066, mLightEmit, 0, TH + 0.021 + divH + 0.228, cz);

      const useRed = (idx + s) % 5 === 0;
      const cL = makeChair(useRed ? mChairRed : mChairBlue);
      const cR = makeChair((idx + s) % 4 === 1 ? mChairRed : mChairBlue);
      add(tg, cL, -TW / 2 - 0.168, 0, cz, 0, Math.PI / 2 + (((idx * 3 + s) % 3) - 1) * 0.05);
      add(tg, cR, TW / 2 + 0.168, 0, cz, 0, -Math.PI / 2 + (((idx * 5 + s) % 3) - 1) * 0.05);

      const cL2 = makeChair((idx + s) % 3 === 0 ? mChairRed : mChairBlue);
      const cR2 = makeChair(mChairBlue);
      add(tg, cL2, -TW / 2 + 0.21, 0, cz + 0.21, 0, Math.PI / 2);
      add(tg, cR2, TW / 2 - 0.21, 0, cz - 0.21, 0, -Math.PI / 2);

      const seed = idx * 17 + s * 7;
      if (seed % 2 === 0) {
        for (let b = 0; b < 1 + (seed % 3); b++) {
          const bm = M(bookPalette[(seed + b * 3) % bookPalette.length], 0.65);
          bx(tg, 0.156, 0.021, 0.21, bm, -0.45, TH + 0.03 + b * 0.022, cz - 0.09, 0, (b - 1) * 0.12);
        }
      }
      if (seed % 3 === 0) {
        const lg = G(tg, 0.45, TH + 0.021, cz + 0.06, -Math.PI / 2);
        bx(lg, 0.204, 0.009, 0.144, mMetal, 0, 0.005, 0);
        bx(lg, 0.204, 0.132, 0.007, mBlack, 0, 0.072, -0.072, -0.2);
        bx(lg, 0.186, 0.114, 0.002, mScreen, 0, 0.072, -0.069, -0.2);
      }
      if (seed % 2 === 1) {
        bx(tg, 0.144, 0.007, 0.192, M(0xfbf9f0, 0.8), 0.432, TH + 0.026, cz - 0.108, 0, 0.08);
        cy(tg, 0.005, 0.005, 0.102, 6, M(0x1f4e8c, 0.4), 0.51, TH + 0.027, cz - 0.06, 0, 0.4, Math.PI / 2);
      }
      if (seed % 4 === 0) {
        const bpM = M(seed % 8 === 0 ? 0x2b3a4a : 0x7a2e2e, 0.8);
        bx(tg, 0.168, 0.252, 0.216, bpM, -TW / 2 - 0.33, 0.132, cz + 0.252, 0, 0.3);
      }
    }
  };
  let tIdx = 0;
  for (const tx of TX) for (const tz of TZ) buildStudyTable(tx, tz, tIdx++);

  // Quầy thủ thư hình bán nguyệt (Half-Stadium Librarian Desk)
  const deskG = G(rootGroup, DESK_X, 0, DESK_Z);
  const dW = DESK_W;
  const dD = DESK_D;
  const dH = 0.99;
  const dT = 0.468;
  const dR = dD / 2;
  const dBody = dW - dR;
  const mDeskTop = M(0xf5f1e6, 0.35, 0.05);
  const mDeskSlat = M(0xc8965a, 0.55);

  const makeHalfStadShape = (bodyLen: number, r: number, holeT = 0) => {
    const xL = -dW / 2;
    const xC = xL + bodyLen;
    const s = new THREE.Shape();
    s.moveTo(xL, -r);
    s.lineTo(xC, -r);
    s.absarc(xC, 0, r, -Math.PI / 2, Math.PI / 2, false);
    s.lineTo(xL, r);
    s.closePath();
    if (holeT > 0) {
      const rI = Math.max(0.06, r - holeT);
      const h = new THREE.Path();
      h.moveTo(xL, -rI);
      h.lineTo(xC, -rI);
      h.absarc(xC, 0, rI, -Math.PI / 2, Math.PI / 2, false);
      h.lineTo(xL, rI);
      h.closePath();
      s.holes.push(h);
    }
    return s;
  };
  const bodyGeo = new THREE.ExtrudeGeometry(makeHalfStadShape(dBody, dR, dT), { depth: dH, bevelEnabled: false, curveSegments: 28 });
  bodyGeo.rotateX(-Math.PI / 2);
  add(deskG, new THREE.Mesh(bodyGeo, mWoodLight), 0, 0, 0);

  const topGeo = new THREE.ExtrudeGeometry(makeHalfStadShape(dBody + 0.024, dR + 0.036, dT + 0.048), { depth: 0.048, bevelEnabled: false, curveSegments: 28 });
  topGeo.rotateX(-Math.PI / 2);
  add(deskG, new THREE.Mesh(topGeo, mDeskTop), 0, dH - 0.012, 0);

  const kickGeo = new THREE.ExtrudeGeometry(makeHalfStadShape(dBody + 0.012, dR + 0.012, 0.084), { depth: 0.06, bevelEnabled: false, curveSegments: 24 });
  kickGeo.rotateX(-Math.PI / 2);
  add(deskG, new THREE.Mesh(kickGeo, mWoodDark), 0, 0, 0);

  const xL = -dW / 2;
  const xC = xL + dBody;
  for (const sx of lin(12, xL + 0.09, xC - 0.03)) {
    bx(deskG, 0.024, dH - 0.084, 0.018, mDeskSlat, sx, dH / 2, dR + 0.008);
    bx(deskG, 0.024, dH - 0.084, 0.018, mDeskSlat, sx, dH / 2, -dR - 0.008);
  }
  for (let i = 0; i <= 14; i++) {
    const a = -Math.PI / 2 + (i / 14) * Math.PI;
    bx(deskG, 0.018, dH - 0.084, 0.024, mDeskSlat, xC + Math.cos(a) * (dR + 0.008), dH / 2, Math.sin(a) * (dR + 0.008), 0, -a);
  }
  bx(deskG, dBody * 0.9, 0.252, 0.012, mGlass, (xL + xC) / 2, dH + 0.162, dR - 0.06);
  for (const gx of lin(4, xL + 0.18, xC - 0.12)) {
    cy(deskG, 0.011, 0.011, 0.264, 8, mChrome, gx, dH + 0.162, dR - 0.06);
  }
  bx(deskG, dBody + dR - dT - 0.06, 0.03, dD - dT * 2 + 0.12, mWoodMed, (xL + xC) / 2, 0.72, 0);

  for (const wx of [xL + 0.66, xL + 1.56]) {
    bx(deskG, 0.39, 0.252, 0.024, mBlack, wx, dH + 0.168, dR - 0.21);
    bx(deskG, 0.354, 0.216, 0.006, mScreen, wx, dH + 0.168, dR - 0.224);
    bx(deskG, 0.042, 0.084, 0.036, mBlack, wx, dH + 0.048, dR - 0.21);
    bx(deskG, 0.252, 0.012, 0.09, mBlack, wx, 0.744, 0.06);
    add(deskG, makeChair(mChairRed), wx, 0, -0.12, 0, 0.1);
  }
  for (let b = 0; b < 4; b++) {
    bx(deskG, 0.168, 0.024, 0.228, M(bookPalette[b], 0.65), xC + 0.12, dH + 0.048 + b * 0.025, 0, 0, b * 0.12);
  }
  bx(deskG, 0.21, 0.096, 0.036, M(0x1f4e8c, 0.4), xC + dR - 0.12, dH + 0.084, 0, 0, Math.PI / 2);

  // Tủ gỗ, TV & Đồng hồ treo tường thời gian thực sau quầy thủ thư
  const cabZ = DESK_Z - 1.56;
  bx(rootGroup, 0.39, 1.98, 2.76, mWoodDark, -HW + WT / 2 + 0.21, 0.99, cabZ);
  for (let s = 0; s < 5; s++) {
    bx(rootGroup, 0.36, 0.024, 2.688, mWoodLight, -HW + WT / 2 + 0.222, 0.27 + s * 0.39, cabZ);
  }
  const tvG = G(rootGroup, -HW + WT / 2 + 0.06, 2.28, DESK_Z + 0.18, Math.PI / 2);
  bx(tvG, 1.56, 0.9, 0.048, mBlack);
  const tvTex = canvasTex(512, 288, (tvCtx) => {
    const grad = tvCtx.createLinearGradient(0, 0, 512, 288);
    grad.addColorStop(0, '#0d2b52');
    grad.addColorStop(1, '#1e5aa8');
    tvCtx.fillStyle = grad;
    tvCtx.fillRect(0, 0, 512, 288);
    tvCtx.fillStyle = '#c8102e';
    tvCtx.fillRect(0, 0, 512, 54);
    tvCtx.fillStyle = '#ffffff';
    tvCtx.font = 'bold 24px sans-serif';
    tvCtx.textAlign = 'center';
    tvCtx.fillText('THƯ VIỆN TẠ QUANG BỬU - HUST', 256, 36);
    tvCtx.fillStyle = '#ffd166';
    tvCtx.font = 'bold 30px sans-serif';
    tvCtx.fillText(roomLabel, 256, 118);
    tvCtx.fillStyle = '#e8f1ff';
    tvCtx.font = '20px sans-serif';
    tvCtx.fillText('• Giữ trật tự, tắt chuông điện thoại', 256, 168);
    tvCtx.fillText('• Quẹt thẻ sinh viên khi ra / vào cổng', 256, 204);
    tvCtx.fillText('• Để sách đúng vị trí sau khi đọc', 256, 240);
  });
  add(
    tvG,
    new THREE.Mesh(
      new THREE.PlaneGeometry(1.464, 0.816),
      new THREE.MeshStandardMaterial({ map: tvTex, emissive: 0xffffff, emissiveMap: tvTex, emissiveIntensity: 0.65, roughness: 0.3 }),
    ),
    0,
    0,
    0.026,
  );

  // Đồng hồ treo tường thời gian thực Hà Nội
  const clkG = G(rootGroup, -HW + WT / 2 + 0.04, 2.95, DESK_Z + 0.18, Math.PI / 2);
  const clkR = 0.24;
  cy(clkG, clkR + 0.022, clkR + 0.022, 0.042, 32, mBlack, 0, 0, 0, Math.PI / 2);
  const clkTex = canvasTex(256, 256, (clkX) => {
    clkX.fillStyle = '#faf8f2';
    clkX.beginPath();
    clkX.arc(128, 128, 122, 0, Math.PI * 2);
    clkX.fill();
    clkX.strokeStyle = '#1a1c20';
    for (let i = 0; i < 60; i++) {
      const a = (i * Math.PI) / 30 - Math.PI / 2;
      const r1 = i % 5 === 0 ? 96 : 106;
      clkX.lineWidth = i % 5 === 0 ? 5 : 2;
      clkX.beginPath();
      clkX.moveTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1);
      clkX.lineTo(128 + Math.cos(a) * 114, 128 + Math.sin(a) * 114);
      clkX.stroke();
    }
    clkX.fillStyle = '#1a1c20';
    clkX.font = 'bold 24px sans-serif';
    clkX.textAlign = 'center';
    clkX.textBaseline = 'middle';
    for (let n = 1; n <= 12; n++) {
      const a = (n * Math.PI) / 6 - Math.PI / 2;
      clkX.fillText(String(n), 128 + Math.cos(a) * 76, 128 + Math.sin(a) * 76);
    }
    clkX.fillStyle = '#c8102e';
    clkX.font = 'bold 14px sans-serif';
    clkX.fillText('HUST', 128, 88);
  });
  add(clkG, new THREE.Mesh(new THREE.CircleGeometry(clkR, 32), new THREE.MeshStandardMaterial({ map: clkTex, roughness: 0.4 })), 0, 0, 0.023);
  const clockHour = G(clkG, 0, 0, 0.026);
  bx(clockHour, 0.016, clkR * 0.52, 0.006, mBlack, 0, clkR * 0.22, 0);
  const clockMin = G(clkG, 0, 0, 0.029);
  bx(clockMin, 0.011, clkR * 0.74, 0.006, mBlack, 0, clkR * 0.32, 0);
  const clockSec = G(clkG, 0, 0, 0.032);
  bx(clockSec, 0.005, clkR * 0.82, 0.004, M(0xc8102e, 0.4), 0, clkR * 0.31, 0);
  cy(clkG, 0.016, 0.016, 0.016, 12, mChrome, 0, 0, 0.033, Math.PI / 2);

  // Lối vào + Cổng xoay 3 chấu inox (Turnstiles)
  const entryG = G(rootGroup, DOOR_X, 0, HD - 0.72);
  bx(entryG, 0.048, 2.34, 1.56, mGlass, -DOOR_W / 2, 1.17, -0.06);
  bx(entryG, 0.048, 2.34, 1.56, mGlass, DOOR_W / 2, 1.17, -0.06);
  bx(entryG, 0.06, 2.34, 0.06, mMetal, -DOOR_W / 2, 1.17, -0.84);
  bx(entryG, 0.06, 2.34, 0.06, mMetal, DOOR_W / 2, 1.17, -0.84);
  bx(entryG, 0.51, 0.99, 0.39, mWoodMed, -1.56, 0.495, -0.18);
  bx(entryG, 0.33, 0.252, 0.03, mBlack, -1.56, 1.14, -0.24);
  bx(entryG, 0.294, 0.216, 0.006, mScreen, -1.56, 1.14, -0.224);

  const makeTurnstile = (x: number, dir = 1) => {
    const g = G(entryG, x, 0, -0.36);
    bx(g, 0.228, 0.96, 0.9, mChrome, 0, 0.48, 0);
    bx(g, 0.24, 0.048, 0.924, mBlack, 0, 0.972, 0);
    bx(g, 0.12, 0.012, 0.15, M(0x22c55e, 0.3, 0, { emissive: 0x16a34a, emissiveIntensity: 0.9 }), 0, 1.002, 0.27);
    const hub = G(g, dir * 0.132, 0.75, 0);
    cy(hub, 0.054, 0.054, 0.084, 12, mMetal, 0, 0, 0, 0, 0, Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const arm = G(hub);
      arm.rotation.x = a;
      cy(arm, 0.015, 0.015, 0.51, 8, mChrome, dir * 0.24, Math.sin(0.35) * 0.12, Math.cos(0.35) * 0.12, 0, 0, Math.PI / 2 - dir * 0.35);
    }
    return { hub, x: DOOR_X + x, z: HD - 1.08, angle: 0, target: 0, cooldown: 0 };
  };
  const turnstile1 = makeTurnstile(-0.57, 1);
  const turnstile2 = makeTurnstile(0.57, -1);

  bx(rootGroup, 1.56, 0.33, 0.048, M(0x1e4d8c, 0.5), DOOR_X, 2.55, HD - WT / 2 - 0.03);
  bx(rootGroup, 0.66, 0.21, 0.036, mSignGreen, DOOR_X, 2.55, -HD + WT / 2 + 0.03);

  const makePlant = (x: number, z: number) => {
    const g = G(rootGroup, x, 0, z);
    cy(g, 0.21, 0.15, 0.39, 12, mPot, 0, 0.195, 0);
    cy(g, 0.03, 0.036, 0.48, 8, mWoodDark, 0, 0.54, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const s = new THREE.Mesh(
        (gCache['sph_0.192_10_8'] ??= new THREE.SphereGeometry(0.192, 10, 8)),
        mLeaf,
      );
      s.scale.set(1.2, 0.7, 0.9);
      add(g, s, Math.cos(a) * 0.132, 0.78 + (i % 2) * 0.108, Math.sin(a) * 0.132);
    }
  };
  makePlant(-HW + 0.72, -HD + 0.72);
  makePlant(HW - 0.72, HD - 0.72);
  makePlant(-7.5, HD - 0.66);
  makePlant(1.2, HD - 0.66);

  for (const [bxX, bxZ] of [
    [-7.2, -9.6],
    [1.8, -9.6],
    [12.6, 5.4],
  ]) {
    cy(rootGroup, 0.15, 0.12, 0.39, 12, mMetal, bxX, 0.195, bxZ);
  }
  bx(rootGroup, 1.92, 1.08, 0.048, mWoodDark, 0, 1.68, HD - WT / 2 - 0.03);
  bx(rootGroup, 1.8, 0.96, 0.03, M(0xc8a878, 0.8), 0, 1.68, HD - WT / 2 - 0.054);

  const makeWCDoor = (x: number, z: number, labelColor: number) => {
    const dg = G(rootGroup, x, 0, z, -Math.PI / 2);
    bx(dg, 0.98, 2.18, 0.09, mWoodDark, 0, 1.09, 0);
    bx(dg, 0.86, 2.08, 0.05, mWoodMed, 0, 1.06, 0.012);
    for (let i = 0; i < 5; i++) {
      bx(dg, 0.56, 0.018, 0.06, mWoodDark, 0, 0.28 + i * 0.055, 0.018);
    }
    cy(dg, 0.016, 0.016, 0.11, 8, mChrome, 0.34, 1.02, 0.05, 0, 0, Math.PI / 2);
    bx(dg, 0.24, 0.24, 0.025, M(labelColor, 0.4), 0, 1.56, 0.032);
    cy(dg, 0.038, 0.038, 0.012, 12, mCeiling, 0, 1.63, 0.046, Math.PI / 2);
    bx(dg, 0.07, 0.09, 0.012, mCeiling, 0, 1.52, 0.046);
  };
  makeWCDoor(HW - WT / 2 - 0.01, 4.9, 0x1f5fa8);
  makeWCDoor(HW - WT / 2 - 0.01, 8.1, 0xc83e5b);

  // Batch static room meshes into InstancedMesh & disable decorative pointer raycast
  optimizeStaticLibraryGroup(rootGroup, [
    ...fanHubs,
    turnstile1.hub,
    turnstile2.hub,
    clockHour,
    clockMin,
    clockSec,
  ]);

  const hit = (x: number, z: number): boolean => {
    const loc = createLibraryLocation(4, x, z + ROOM_401_DIMS.R4Z);
    const res = resolveLibraryMovement(loc, loc);
    return res.blocked || !res.grounded;
  };

  const update = (dt: number, px: number, pz: number, active: boolean) => {
    for (let i = 0; i < fanHubs.length; i++) {
      fanHubs[i].rotation.y += dt * (4.2 + (i % 3) * 0.35);
    }
    for (const ts of [turnstile1, turnstile2]) {
      if (ts.cooldown > 0) ts.cooldown -= dt;
      if (active && Math.hypot(px - ts.x, pz - ts.z) < 0.72 && ts.cooldown <= 0) {
        ts.target += (Math.PI * 2) / 3;
        ts.cooldown = 0.9;
      }
      ts.angle += (ts.target - ts.angle) * Math.min(1, dt * 8);
      ts.hub.rotation.x = ts.angle;
    }
    // Đồng hồ thời gian thực Hà Nội (UTC+7)
    const now = new Date(Date.now() + 7 * 3600 * 1000);
    const s = now.getUTCSeconds() + now.getUTCMilliseconds() / 1000;
    const m = now.getUTCMinutes() + s / 60;
    const h = (now.getUTCHours() % 12) + m / 60;
    clockSec.rotation.z = -(s / 60) * Math.PI * 2;
    clockMin.rotation.z = -(m / 60) * Math.PI * 2;
    clockHour.rotation.z = -(h / 12) * Math.PI * 2;
  };

  return { hit, update };
}
