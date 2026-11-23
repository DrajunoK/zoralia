// Carte illustrée : mise en page en serpentin (pure, testable) et décors par univers.
// La carte occupe toute la largeur : 7 cases par rangée sur téléphone, 14 sur grand écran, donc peu de défilement.

import { MAP_CELLS } from './game';

export interface Pt { x: number; y: number }

export interface MapLayout {
  W: number; H: number; cols: number; rows: number; rowH: number;
  /** Index 0 = départ, 1..100 = étapes. */
  pts: Pt[];
  /** Points de la route dans l'ordre (étapes + virages) ; `node` = numéro d'étape ou -1 pour un virage. */
  route: { p: Pt; node: number }[];
  /** y du milieu de chaque interligne entre la rangée r et la rangée r+1 (de bas en haut). */
  gaps: number[];
}

const MARGIN_X = 42;
const TOP = 88;
const BOTTOM = 130;

export function layoutMap(width: number): MapLayout {
  const wide = width >= 640;
  const cols = wide ? 14 : 7;
  const W = wide ? 720 : 360;
  const rows = Math.ceil(MAP_CELLS / cols);
  const rowH = wide ? 124 : 104;
  const H = TOP + BOTTOM + (rows - 1) * rowH;
  const step = (W - 2 * MARGIN_X) / (cols - 1);

  const pts: Pt[] = [{ x: MARGIN_X, y: H - BOTTOM + 78 }];
  for (let i = 1; i <= MAP_CELLS; i++) {
    const r = Math.floor((i - 1) / cols);
    const k = (i - 1) % cols;
    const ltr = r % 2 === 0;
    const x = MARGIN_X + (ltr ? k : cols - 1 - k) * step;
    const y = H - BOTTOM - r * rowH + 16 * Math.sin(k * 0.95 + r * 1.9);
    pts.push({ x, y });
  }

  const route: MapLayout['route'] = [{ p: pts[0], node: 0 }];
  for (let i = 1; i <= MAP_CELLS; i++) {
    route.push({ p: pts[i], node: i });
    if (i % cols === 0 && i < MAP_CELLS) {
      // virage : on arrondit le demi-tour au bord de la carte
      const dir = (i / cols - 1) % 2 === 0 ? 1 : -1;
      route.push({ p: { x: pts[i].x + dir * 30, y: (pts[i].y + pts[i + 1].y) / 2 }, node: -1 });
    }
  }
  const gaps = Array.from({ length: rows - 1 }, (_, r) => H - BOTTOM - r * rowH - rowH / 2);
  return { W, H, cols, rows, rowH, pts, route, gaps };
}

const f = (n: number) => n.toFixed(1);

/** Courbe lisse (Catmull-Rom) qui passe par tous les points donnés. */
export function smoothPath(points: Pt[]): string {
  if (points.length === 0) return '';
  let d = `M${f(points[0].x)} ${f(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    d += `C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

/** Route entière, ou jusqu'à l'étape `upTo` incluse (chemin déjà parcouru). */
export function routePath(layout: MapLayout, upTo: number = MAP_CELLS): string {
  const idx = layout.route.findIndex((r) => r.node === upTo);
  const end = idx < 0 ? layout.route.length - 1 : idx;
  return smoothPath(layout.route.slice(0, end + 1).map((r) => r.p));
}

/** Générateur pseudo-aléatoire déterministe : le décor est le même à chaque affichage. */
export function rng(seed: number): () => number {
  let s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// ───────────────────────── Décors par univers ─────────────────────────

export type Feature = 'plain' | 'river' | 'lake' | 'mountains' | 'clouds' | 'stars' | 'sea' | 'lava';
export type Ambient = 'fireflies' | 'bubbles' | 'petals' | 'snow' | 'clouds' | 'stars' | 'embers' | 'sparkles' | 'birds' | 'dust';

export interface Region {
  ground: [string, string]; // haut / bas du dégradé du territoire
  feature: Feature;
  deco: string[];
  landmark: string;
  ambient: Ambient;
}
export interface World { road: string; edge: string; night: boolean; regions: Region[] }

export const WORLDS: Record<string, World> = {
  aventuriers: { road: '#f6e2b4', edge: '#6b4a2a', night: false, regions: [
    { ground: ['#9be0a0', '#5bbf72'], feature: 'plain', deco: ['🌲', '🌳', '🍄', '🦌', '🌿', '🐿️', '🌼', '🪵'], landmark: '🛖', ambient: 'fireflies' },
    { ground: ['#b5e8a8', '#74c77a'], feature: 'river', deco: ['🌳', '🪷', '🦆', '🐟', '🌾', '🐸', '🌸', '🪨'], landmark: '🏞️', ambient: 'bubbles' },
    { ground: ['#d9e8a4', '#a8cf72'], feature: 'plain', deco: ['🏡', '🌷', '🐎', '⛲', '🌹', '🛡️', '🌳', '🚩'], landmark: '🏰', ambient: 'petals' },
    { ground: ['#cfd8e4', '#9fb0c6'], feature: 'mountains', deco: ['🌲', '🦅', '🪨', '🐐', '❄️', '⛺', '🏔️', '🌨️'], landmark: '🏔️', ambient: 'snow' },
    { ground: ['#ffeaa8', '#ffc86b'], feature: 'clouds', deco: ['☁️', '🌈', '✨', '🦅', '👑', '💫', '⭐', '🕊️'], landmark: '🐉', ambient: 'clouds' },
  ] },
  princesses: { road: '#ffffff', edge: '#a0527f', night: false, regions: [
    { ground: ['#ffd9ee', '#ffb3dc'], feature: 'plain', deco: ['🌸', '🌷', '🦋', '🌺', '🐝', '🌼', '🍓', '🌹'], landmark: '⛲', ambient: 'petals' },
    { ground: ['#c9ecff', '#8fd3f6'], feature: 'lake', deco: ['🦢', '🪷', '💧', '🐸', '🌙', '🐟', '🌸', '⛵'], landmark: '🛶', ambient: 'bubbles' },
    { ground: ['#ffe3f6', '#f7b9e6'], feature: 'plain', deco: ['👑', '💐', '🎀', '🕊️', '✨', '🪞', '🌹', '🧚'], landmark: '🏰', ambient: 'sparkles' },
    { ground: ['#e3dbff', '#bca9f5'], feature: 'clouds', deco: ['☁️', '🌈', '🎈', '🦄', '🕊️', '💫', '✨', '🪁'], landmark: '🌈', ambient: 'clouds' },
    { ground: ['#fff4c2', '#ffe08a'], feature: 'stars', deco: ['⭐', '🌟', '🌙', '💎', '✨', '🔮', '👸', '🪄'], landmark: '🌟', ambient: 'stars' },
  ] },
  pirates: { road: '#f7e6bd', edge: '#6a4426', night: false, regions: [
    { ground: ['#ffe7b0', '#f4c876'], feature: 'plain', deco: ['⚓', '⛵', '🦀', '🛶', '🪝', '🐚', '🪣', '🌴'], landmark: '🚢', ambient: 'birds' },
    { ground: ['#a8e6a0', '#5fc271'], feature: 'plain', deco: ['🌴', '🦜', '🐒', '🌺', '🐍', '🥥', '🍍', '🌿'], landmark: '🛖', ambient: 'fireflies' },
    { ground: ['#b3f0ee', '#6fd6d8'], feature: 'lake', deco: ['🏖️', '🐚', '🦀', '🪸', '🐠', '⛱️', '🐢', '🌊'], landmark: '🏝️', ambient: 'bubbles' },
    { ground: ['#ffe29a', '#f2b85a'], feature: 'plain', deco: ['💎', '🗺️', '☠️', '🌴', '🪙', '🔑', '⚔️', '🦜'], landmark: '🏴‍☠️', ambient: 'sparkles' },
    { ground: ['#7cc4f2', '#3f8fd6'], feature: 'sea', deco: ['🌊', '🐋', '🐙', '⛈️', '🦈', '🧭', '🐬', '⛵'], landmark: '🐋', ambient: 'bubbles' },
  ] },
  espace: { road: '#d9defa', edge: '#1d1b4d', night: true, regions: [
    { ground: ['#3a4aa8', '#26307a'], feature: 'stars', deco: ['🛰️', '🔭', '📡', '🚀', '🛸', '🌍', '👩‍🚀', '🪐'], landmark: '🛰️', ambient: 'stars' },
    { ground: ['#5a5f95', '#3b3f72'], feature: 'stars', deco: ['🌙', '🌑', '👨‍🚀', '⭐', '🪨', '🛸', '🌕', '☄️'], landmark: '🌙', ambient: 'stars' },
    { ground: ['#a8454d', '#7a2a3a'], feature: 'lava', deco: ['🪐', '🔴', '🛸', '☄️', '🌋', '👽', '🪨', '🚀'], landmark: '🛸', ambient: 'embers' },
    { ground: ['#5b34a8', '#35206f'], feature: 'stars', deco: ['🌌', '💫', '✨', '🔮', '🌠', '🪐', '🛰️', '⭐'], landmark: '🌌', ambient: 'sparkles' },
    { ground: ['#1b1750', '#0d0b30'], feature: 'stars', deco: ['⭐', '🌟', '✨', '💫', '🔭', '🌠', '🌌', '🚀'], landmark: '🌟', ambient: 'stars' },
  ] },
  dinosaures: { road: '#f3e0aa', edge: '#6a4a24', night: false, regions: [
    { ground: ['#c9ea82', '#8fd35a'], feature: 'plain', deco: ['⛺', '🔥', '🌿', '🥚', '🪵', '🦴', '🌱', '🦎'], landmark: '⛺', ambient: 'fireflies' },
    { ground: ['#8fe0a0', '#4fbf6e'], feature: 'river', deco: ['🦕', '🌴', '🌿', '🦎', '🐊', '🦋', '🌺', '🪨'], landmark: '🦕', ambient: 'birds' },
    { ground: ['#f0dc9a', '#d4b868'], feature: 'plain', deco: ['🦖', '🌾', '🪨', '🐢', '🌄', '🦴', '🌵', '🥚'], landmark: '🦖', ambient: 'dust' },
    { ground: ['#ffb27a', '#e86a3a'], feature: 'lava', deco: ['🌋', '🔥', '🪨', '🦇', '💨', '🦖', '☄️', '🌶️'], landmark: '🌋', ambient: 'embers' },
    { ground: ['#e8d6b0', '#c9ae80'], feature: 'plain', deco: ['🦴', '🐚', '🪨', '🦕', '💎', '🏜️', '🌵', '🐍'], landmark: '🏜️', ambient: 'dust' },
  ] },
};

export interface Deco { x: number; y: number; size: number; e: string; sway: boolean; delay: number }
export interface Particle { x: number; y: number; size: number; kind: Ambient; delay: number; dur: number }
export interface Shape { kind: 'river' | 'lake' | 'mountain' | 'cloud' | 'lava' | 'wave' | 'star' | 'hill'; region: number; d?: string; x?: number; y?: number; w?: number; h?: number; seed: number }

/** Territoire (0..4) d'une position verticale de la carte : bandes autour des cases 20, 40, 60, 80. */
export function regionAtY(layout: MapLayout, y: number): number {
  let best = 0, bestDist = Infinity;
  for (let t = 0; t < 5; t++) {
    const a = layout.pts[t * 20 + 1].y, b = layout.pts[t * 20 + 20].y;
    const mid = (a + b) / 2, dist = Math.abs(y - mid);
    if (dist < bestDist) { bestDist = dist; best = t; }
  }
  return best;
}

export interface Scenery { decos: Deco[]; particles: Particle[]; shapes: Shape[]; landmarks: { x: number; y: number; e: string }[] }

export function buildScenery(layout: MapLayout, worldKey: string): Scenery {
  const world = WORLDS[worldKey] ?? WORLDS.aventuriers;
  const r = rng(worldKey.length * 977 + layout.cols * 31 + 7);
  const decos: Deco[] = [], particles: Particle[] = [], shapes: Shape[] = [], landmarks: Scenery['landmarks'] = [];
  const { W } = layout;
  const perGap = layout.cols === 14 ? 9 : 5;

  layout.gaps.forEach((gy, g) => {
    const region = regionAtY(layout, gy);
    const reg = world.regions[region];
    // relief de fond : colline, rivière, lac, montagnes… selon le territoire
    shapes.push({ kind: 'hill', region, y: gy + 26, seed: g * 13 + 1 });
    if (reg.feature === 'river' && g % 2 === 0) shapes.push({ kind: 'river', region, y: gy, seed: g * 7 + 3 });
    if (reg.feature === 'lake') shapes.push({ kind: 'lake', region, x: 40 + r() * (W - 160), y: gy, w: 70 + r() * 50, h: 22 + r() * 8, seed: g });
    if (reg.feature === 'mountains') for (let k = 0; k < (layout.cols === 14 ? 6 : 3); k++) shapes.push({ kind: 'mountain', region, x: 30 + (k + r() * 0.6) * ((W - 60) / (layout.cols === 14 ? 6 : 3)), y: gy + 16, w: 56 + r() * 30, h: 44 + r() * 22, seed: k });
    if (reg.feature === 'clouds') for (let k = 0; k < 3; k++) shapes.push({ kind: 'cloud', region, x: r() * W, y: gy - 6 + r() * 20, w: 70 + r() * 40, h: 24, seed: k });
    if (reg.feature === 'lava' && g % 2 === 0) shapes.push({ kind: 'lava', region, y: gy, seed: g * 5 + 2 });
    if (reg.feature === 'sea') shapes.push({ kind: 'wave', region, y: gy, seed: g * 3 + 1 });
    if (reg.feature === 'stars') for (let k = 0; k < 3; k++) shapes.push({ kind: 'star', region, x: r() * W, y: gy - 20 + r() * 40, w: 10 + r() * 10, seed: k });

    // objets du décor, posés dans l'interligne (la route occupe les rangées)
    for (let k = 0; k < perGap; k++) {
      const x = 30 + ((k + 0.15 + r() * 0.7) / perGap) * (W - 60);
      const y = gy + (r() - 0.5) * (layout.rowH * 0.46);
      decos.push({ x, y, size: 26 + Math.floor(r() * 24), e: reg.deco[Math.floor(r() * reg.deco.length)], sway: r() > 0.55, delay: r() * 4 });
    }
    for (let k = 0; k < (layout.cols === 14 ? 10 : 6); k++) {
      particles.push({ x: r() * W, y: gy + (r() - 0.5) * layout.rowH * 1.4, size: 6 + Math.floor(r() * 8), kind: reg.ambient, delay: r() * 6, dur: 5 + r() * 6 });
    }
  });

  // un point de repère par territoire, à la fin de son dernier rang, du côté opposé à la route
  for (let t = 0; t < 5; t++) {
    const p = layout.pts[Math.min(100, t * 20 + 20)];
    const lx = p.x > W / 2 ? p.x - 62 : p.x + 62;
    landmarks.push({ x: lx, y: p.y - (t === 4 ? 4 : layout.rowH * 0.5), e: world.regions[t].landmark });
  }
  return { decos, particles, shapes, landmarks };
}
