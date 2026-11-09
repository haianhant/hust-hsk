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
      return;
    }

    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.raycast = NOOP_RAYCAST;

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
