// ---------------------------------------------------------------------------
// procedural-helpers.ts — Bộ công cụ sinh hình học 3D & CanvasTexture thủ tục
// cho nội thất đa tầng Thư viện Tạ Quang Bửu (Tầng 1–10 theo chuẩn studywithhuster.cyou).
// Tuân thủ ADR-0002 (0 file 3D ngoài) và GEMINI.md Mục 3 (giải phóng bộ nhớ WebGL).
// ---------------------------------------------------------------------------

import * as THREE from 'three';

export function lin(n: number, a: number, b: number): number[] {
  return Array.from({ length: n }, (_, i) => a + (n > 1 ? (i * (b - a)) / (n - 1) : 0));
}

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTex(
  w: number,
  h: number,
  fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  rx = 0,
  ry = 0,
): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    const dt = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    dt.colorSpace = THREE.SRGBColorSpace;
    if (rx) {
      dt.wrapS = THREE.RepeatWrapping;
      dt.wrapT = THREE.RepeatWrapping;
      dt.repeat.set(rx, ry || rx);
    }
    return dt as unknown as THREE.CanvasTexture;
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) fn(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (rx) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry || rx);
  }
  return t;
}

/**
 * No-op raycast handler for purely decorative procedural meshes so R3F pointer
 * events skip thousands of non-interactive triangles.
 */
export const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};

/**
 * Batches static `THREE.Mesh` objects sharing `(geometry, material)` inside
 * `container` into `THREE.InstancedMesh` instances (preserving any animated
 * subtrees in `preserveRoots`) and disables pointer raycasting on all procedural
 * meshes inside `container`.
 */
export function optimizeStaticLibraryGroup(
  container: THREE.Object3D,
  preserveRoots: ReadonlyArray<THREE.Object3D | null | undefined> = [],
): { batchedMeshes: number; instancedGroups: number } {
  const preserved = new Set<THREE.Object3D>();
  for (let i = 0; i < preserveRoots.length; i++) {
    const root = preserveRoots[i];
    if (!root) continue;
    root.traverse((node: THREE.Object3D) => {
      preserved.add(node);
    });
  }

  container.updateMatrixWorld(true);
  const containerInverse = new THREE.Matrix4().copy(container.matrixWorld).invert();

  const buckets = new Map<
    string,
    {
      geometry: THREE.BufferGeometry;
      material: THREE.Material;
      meshes: THREE.Mesh[];
      matrices: THREE.Matrix4[];
    }
  >();

  container.traverse((obj) => {
    const inst = obj as THREE.InstancedMesh;
    if (inst.isInstancedMesh) {
      inst.raycast = NOOP_RAYCAST;
      const isBasic = Boolean((inst.material as THREE.MeshBasicMaterial | undefined)?.isMeshBasicMaterial);
      if (!isBasic) {
        inst.castShadow = true;
        inst.receiveShadow = true;
      }
      return;
    }

    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.raycast = NOOP_RAYCAST;
    const isBasic = Boolean((mesh.material as THREE.MeshBasicMaterial | undefined)?.isMeshBasicMaterial);
    if (!isBasic) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }

    if (preserved.has(mesh) || mesh.children.length > 0) return;
    if (!mesh.geometry || !mesh.material || Array.isArray(mesh.material)) return;

    const key = `${mesh.geometry.uuid}_${mesh.material.uuid}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        geometry: mesh.geometry,
        material: mesh.material,
        meshes: [],
        matrices: [],
      };
      buckets.set(key, bucket);
    }
    bucket.meshes.push(mesh);
    bucket.matrices.push(
      new THREE.Matrix4().multiplyMatrices(containerInverse, mesh.matrixWorld),
    );
  });

  let batchedMeshes = 0;
  let instancedGroups = 0;

  buckets.forEach(({ geometry, material, meshes, matrices }) => {
    if (meshes.length < 2) return;
    for (const m of meshes) {
      m.parent?.remove(m);
    }
    const im = new THREE.InstancedMesh(geometry, material, matrices.length);
    im.raycast = NOOP_RAYCAST;
    const isBasic = Boolean((material as THREE.MeshBasicMaterial | undefined)?.isMeshBasicMaterial);
    if (!isBasic) {
      im.castShadow = true;
      im.receiveShadow = true;
    }
    for (let i = 0; i < matrices.length; i++) {
      im.setMatrixAt(i, matrices[i]);
    }
    im.instanceMatrix.needsUpdate = true;
    container.add(im);
    batchedMeshes += meshes.length;
    instancedGroups += 1;
  });

  return { batchedMeshes, instancedGroups };
}

/**
 * Sinh cặp CanvasTexture (map + bumpMap) vân gỗ sồi / óc chó ấm áp cho bàn đọc,
 * kệ sách, tay vịn lan can và bậc cầu thang xoắn trong Thư viện Tạ Quang Bửu.
 */
export function makeLibraryWoodGrainTex(
  baseHex: string,
  grainHex: string,
  rx = 2,
  ry = 2,
  seed = 195610,
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const rng = mulberry32(seed);
  const map = canvasTex(
    256,
    256,
    (ctx) => {
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, 256, 256);
      // Các thớ gỗ chạy dọc mềm mại
      for (let i = 0; i < 68; i++) {
        const y = rng() * 256;
        const h = 1.5 + rng() * 4.5;
        ctx.fillStyle = grainHex;
        ctx.globalAlpha = 0.08 + rng() * 0.16;
        ctx.fillRect(0, y, 256, h);
      }
      // Đường vân sóng tự nhiên
      ctx.strokeStyle = grainHex;
      for (let k = 0; k < 22; k++) {
        const y0 = rng() * 256;
        const amp = 2 + rng() * 5;
        ctx.globalAlpha = 0.12 + rng() * 0.14;
        ctx.lineWidth = 1 + rng() * 1.6;
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.bezierCurveTo(85, y0 + amp, 170, y0 - amp, 256, y0);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    rx,
    ry,
  );
  const bumpRn = mulberry32(seed + 73);
  const bumpMap = canvasTex(
    128,
    128,
    (ctx) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 48; i++) {
        const y = bumpRn() * 128;
        ctx.fillStyle = i % 2 === 0 ? '#989898' : '#686868';
        ctx.fillRect(0, y, 128, 1 + bumpRn() * 2);
      }
    },
    rx,
    ry,
  );
  return { map, bumpMap };
}

/**
 * Sinh texture vải nỉ / da bọc đệm ghế đọc sách, ghế bành và sofa.
 */
export function makeLibraryUpholsteryTex(
  baseHex: string,
  weaveHex: string,
  rx = 3,
  ry = 3,
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const map = canvasTex(
    128,
    128,
    (ctx) => {
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = weaveHex;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 128; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 128);
        ctx.moveTo(0, i);
        ctx.lineTo(128, i);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    rx,
    ry,
  );
  const bumpMap = canvasTex(
    64,
    64,
    (ctx) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#969696';
      for (let y = 0; y < 64; y += 4) {
        for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < 64; x += 4) {
          ctx.fillRect(x, y, 2, 2);
        }
      }
    },
    rx,
    ry,
  );
  return { map, bumpMap };
}

/**
 * Sinh texture vữa kiến trúc / đá mịn cho tường và cột thông tầng Thư viện.
 */
export function makeLibraryStuccoWallTex(
  baseHex: string,
  grainHex: string,
  rx = 6,
  ry = 3,
  seed = 202611,
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const rng = mulberry32(seed);
  const map = canvasTex(
    256,
    256,
    (ctx) => {
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = grainHex;
      for (let i = 0; i < 420; i++) {
        ctx.globalAlpha = 0.05 + rng() * 0.08;
        const x = rng() * 256;
        const y = rng() * 256;
        const s = 2 + rng() * 6;
        ctx.fillRect(x, y, s, s);
      }
      ctx.globalAlpha = 1;
    },
    rx,
    ry,
  );
  const bumpRng = mulberry32(seed + 19);
  const bumpMap = canvasTex(
    128,
    128,
    (ctx) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#8e8e8e' : '#727272';
        ctx.fillRect(bumpRng() * 128, bumpRng() * 128, 2, 2);
      }
    },
    rx,
    ry,
  );
  return { map, bumpMap };
}

/**
 * Giải phóng toàn bộ BufferGeometry, Material và Texture trong cây Object3D
 * khi unmount component để tránh rò rỉ bộ nhớ WebGL (GEMINI.md Mục 3).
 */
export function disposeObject3D(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((obj) => {
    const anyObj = obj as THREE.Mesh & { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
    if (anyObj.geometry) {
      geometries.add(anyObj.geometry);
    }
    if (anyObj.material) {
      const mats = Array.isArray(anyObj.material) ? anyObj.material : [anyObj.material];
      for (const m of mats) {
        if (!m) continue;
        materials.add(m);
        const rec = m as unknown as Record<string, unknown>;
        for (const key of ['map', 'emissiveMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap']) {
          const val = rec[key];
          if (val && (val as THREE.Texture).isTexture) {
            textures.add(val as THREE.Texture);
          }
        }
      }
    }
  });

  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}
