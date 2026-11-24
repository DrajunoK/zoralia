import { describe, expect, it } from 'vitest';
import { MAP_CELLS } from './game';
import { WORLDS, buildScenery, layoutMap, regionAtY, routePath, tokenShifts } from './worldmap';

describe('mise en page de la carte', () => {
  for (const [label, width] of [['téléphone', 390], ['grand écran', 900]] as const) {
    const L = layoutMap(width);
    it(`${label} : 100 étapes plus le départ, toutes dans la carte`, () => {
      expect(L.pts).toHaveLength(MAP_CELLS + 1);
      for (const p of L.pts) {
        expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(L.W);
        expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(L.H);
      }
    });
    it(`${label} : on monte du départ (bas) vers l'arrivée (haut)`, () => {
      expect(L.pts[1].y).toBeGreaterThan(L.pts[MAP_CELLS].y);
      expect(L.pts[0].y).toBeGreaterThan(L.pts[1].y);
    });
    it(`${label} : le serpentin alterne le sens à chaque rangée`, () => {
      expect(L.pts[2].x).toBeGreaterThan(L.pts[1].x);
      expect(L.pts[L.cols + 2].x).toBeLessThan(L.pts[L.cols + 1].x);
    });
    it(`${label} : la route traverse chaque étape dans l'ordre, virages compris`, () => {
      const nodes = L.route.filter((r) => r.node > 0).map((r) => r.node);
      expect(nodes).toEqual(Array.from({ length: MAP_CELLS }, (_, i) => i + 1));
      expect(L.route.length).toBeGreaterThan(MAP_CELLS + 1);
    });
  }
  it('compte 500 cases : 7 par rangée sur téléphone, 14 sur grand écran', () => {
    const phone = layoutMap(390), wide = layoutMap(900);
    expect(phone.cols).toBe(7); expect(wide.cols).toBe(14);
    expect(phone.rows).toBe(Math.ceil(MAP_CELLS / 7)); expect(wide.rows).toBe(Math.ceil(MAP_CELLS / 14));
    expect(wide.rows).toBeLessThan(phone.rows);
    expect(MAP_CELLS).toBe(500);
  });
  it('reste raisonnable en hauteur : la carte défile mais ne devient pas démesurée', () => {
    expect(layoutMap(390).H * (390 / 360)).toBeLessThan(9000);
    expect(layoutMap(900).H * (900 / 720)).toBeLessThan(6000);
  });
  it('le chemin parcouru est un préfixe de la route', () => {
    const L = layoutMap(390);
    const full = routePath(L), part = routePath(L, 12);
    expect(part.length).toBeLessThan(full.length);
    expect(full.startsWith(part.slice(0, 20))).toBe(true);
  });
  it('chaque case appartient à un territoire et le décor est déterministe', () => {
    const L = layoutMap(390);
    expect(regionAtY(L, L.pts[1].y)).toBe(0);
    expect(regionAtY(L, L.pts[MAP_CELLS].y)).toBe(4);
    for (const key of Object.keys(WORLDS)) {
      const a = buildScenery(L, key), b = buildScenery(L, key);
      expect(a.decos.length).toBeGreaterThan(40);
      expect(a.decos).toEqual(b.decos);
      expect(WORLDS[key].regions).toHaveLength(5);
    }
  });
});

describe('pions des enfants sur la carte', () => {
  it('ne décale pas un enfant seul sur sa case, même si un autre est ailleurs', () => {
    const s = tokenShifts([{ id: 'a', cell: 62 }, { id: 'b', cell: 14 }]);
    expect(s.get('a')).toBe(0);
    expect(s.get('b')).toBe(0);
  });
  it('écarte de part et d’autre les enfants qui partagent une case, autour de son centre', () => {
    const s = tokenShifts([{ id: 'a', cell: 14 }, { id: 'b', cell: 14 }]);
    expect(s.get('a')).toBe(-15);
    expect(s.get('b')).toBe(15);
    const trio = tokenShifts([{ id: 'a', cell: 5 }, { id: 'b', cell: 5 }, { id: 'c', cell: 5 }]);
    expect([...trio.values()]).toEqual([-30, 0, 30]);
  });
});
