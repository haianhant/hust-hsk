// ---------------------------------------------------------------------------
// features/avatar/appearance/textures.ts — Procedural Canvas 2D textures dùng
// cho đồng phục HUST, phù hiệu tay áo, thẻ sinh viên và bóng đổ tiếp xúc
// Module IDs: avatar.rig, avatar.outfit.*
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  makeHairStrandTexture,
  makeSoftShadowTexture,
} from '../../../components/three/materials';
import { WHITE } from './presets';

// Shared singleton textures for all human figures (Player + NPCs + AmbientLife)
let sharedAvatarTex: {
  hair: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };
  shadow: THREE.CanvasTexture;
} | null = null;

export function getSharedAvatarTextures() {
  if (!sharedAvatarTex) {
    sharedAvatarTex = {
      hair: makeHairStrandTexture(3, 3),
      shadow: makeSoftShadowTexture(),
    };
  }
  return sharedAvatarTex;
}

/** Logo chữ HUST trắng dùng cho nền áo tối/đỏ */
export function useHustTexture(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 256, 80);
      ctx.fillStyle = WHITE;
      ctx.font = '900 46px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HUST', 128, 42);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Logo HUST đỏ Bách khoa đặt trên mảng ngực trắng của Áo khoác gió đồng phục HUST */
export function useHustCrimsonLogoTexture(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 256, 96);
      // Huy hiệu khiên nhỏ bên trái + chữ HUST đỏ đậm bên phải
      ctx.fillStyle = '#B5121B';
      ctx.beginPath();
      ctx.roundRect(14, 18, 46, 58, 10);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.font = '900 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BK', 37, 48);

      ctx.fillStyle = '#B5121B';
      ctx.font = '900 50px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('HUST', 72, 50);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Phù hiệu tròn trắng-đỏ ĐHBK Hà Nội gắn trên bắp tay trái (ao-khoac-gio-do-chi-tiet-01.jpg, polo-do-nam-nu-01.jpg) */
export function useHustSleeveBadgeTexture(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);
      // Nền tròn trắng viền đỏ Bách khoa
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(64, 64, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#B5121B';
      ctx.lineWidth = 8;
      ctx.stroke();
      // Vòng chấm chữ đỏ quanh viền trong
      ctx.strokeStyle = '#B5121B';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(64, 64, 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Biểu trưng đỏ + sao vàng ở tâm
      ctx.fillStyle = '#B5121B';
      ctx.beginPath();
      ctx.arc(64, 64, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.font = '900 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BK', 64, 65);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Texture Thẻ sinh viên Bách Khoa đeo trước ngực (HUST Student ID Card). */
export function useStudentIdTexture(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, 128, 192);
      ctx.fillStyle = '#DA1E26';
      ctx.fillRect(0, 0, 128, 38);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HUST', 64, 27);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(14, 50, 42, 54);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(35, 68, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(21, 82, 28, 18);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(66, 54, 48, 8);
      ctx.fillStyle = '#64748B';
      ctx.fillRect(66, 70, 40, 6);
      ctx.fillRect(66, 82, 44, 6);
      ctx.fillStyle = '#0F172A';
      for (let x = 18; x < 110; x += 6) {
        ctx.fillRect(x, 122, 3, 18);
      }
      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(0, 166, 128, 26);
      ctx.fillStyle = '#FACC15';
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.fillText('SINH VIÊN BK', 64, 184);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
