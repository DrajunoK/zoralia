import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CELLS_PER_TERRITORY as T, CHEST_COUNT, MAP_CELLS, STEPS_PER_CELL, STEPS_PER_TERRITORY, chestCell, chestValue, chestsReached, territoryIndex } from '../lib/game';
import { onFocusChild } from '../lib/mapfocus';
import { WORLDS, buildScenery, layoutMap, rng, routePath, tokenShifts, type MapLayout, type Shape } from '../lib/worldmap';
import { Avatar } from './kit';
import TreasureChest from './TreasureChest';

export interface MapMember { child: { id: string; display_name: string; avatar_key: string; color_key: string }; cell: number; steps: number; me: boolean }

interface Props { worldKey: string; territories: string[]; members: MapMember[] }

const chestAt = new Map(Array.from({ length: CHEST_COUNT }, (_, i) => [chestCell(i + 1), i + 1]));
const px = (n: number) => `${n.toFixed(1)}px`;

function wavy(layout: MapLayout, y: number, seed: number, amp: number): string {
  const n = 8, r = rng(seed * 101 + 9);
  const pts = Array.from({ length: n + 1 }, (_, i) => `${((i / n) * (layout.W + 60) - 30).toFixed(1)} ${(y + Math.sin(i * 1.4 + seed) * amp + (r() - 0.5) * amp * 0.4).toFixed(1)}`);
  let d = `M${pts[0]}`;
  for (let i = 1; i <= n; i++) {
    const [x0, y0] = pts[i - 1].split(' ').map(Number), [x1, y1] = pts[i].split(' ').map(Number);
    d += `C${(x0 + (x1 - x0) / 2).toFixed(1)} ${y0} ${(x0 + (x1 - x0) / 2).toFixed(1)} ${y1} ${x1} ${y1}`;
  }
  return d;
}

function ShapeSvg({ s, layout, ground }: { s: Shape; layout: MapLayout; ground: string }) {
  switch (s.kind) {
    case 'hill':
      return <ellipse cx={layout.W / 2} cy={s.y ?? 0} rx={layout.W * 0.62} ry={34} style={{ fill: `color-mix(in srgb, ${ground} 78%, #2b4a2b)` }} opacity=".28" />;
    case 'river': {
      const d = wavy(layout, s.y ?? 0, s.seed, 14);
      return <g><path d={d} stroke="#3fa9e0" strokeWidth="36" fill="none" strokeLinecap="round" /><path d={d} stroke="#79d0f7" strokeWidth="24" fill="none" strokeLinecap="round" /><path d={d} className="wm-ripple" stroke="#fff" strokeOpacity=".75" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="6 22" /></g>;
    }
    case 'lava': {
      const d = wavy(layout, s.y ?? 0, s.seed, 12);
      return <g><path d={d} stroke="#c2410c" strokeWidth="34" fill="none" strokeLinecap="round" /><path d={d} stroke="#ff7a2f" strokeWidth="22" fill="none" strokeLinecap="round" /><path d={d} className="wm-ripple" stroke="#ffd23f" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="10 26" /></g>;
    }
    case 'wave': {
      const d = wavy(layout, s.y ?? 0, s.seed, 9);
      return <path d={d} className="wm-ripple" stroke="#fff" strokeOpacity=".7" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="14 18" />;
    }
    case 'lake':
      return <g><ellipse cx={s.x} cy={s.y} rx={s.w} ry={s.h} fill="#54b9ec" stroke="#bfeaff" strokeWidth="3" /><ellipse cx={(s.x ?? 0) - (s.w ?? 0) * 0.25} cy={(s.y ?? 0) - (s.h ?? 0) * 0.25} rx={(s.w ?? 0) * 0.45} ry={(s.h ?? 0) * 0.35} fill="#fff" opacity=".35" /></g>;
    case 'mountain': {
      const x = s.x ?? 0, y = s.y ?? 0, w = s.w ?? 60, h = s.h ?? 50;
      return <g><polygon points={`${x - w / 2},${y + h * 0.45} ${x},${y - h * 0.55} ${x + w / 2},${y + h * 0.45}`} fill="#8e9bb8" stroke="#5d6b8a" strokeWidth="2" strokeLinejoin="round" /><polygon points={`${x},${y - h * 0.55} ${x + w / 2},${y + h * 0.45} ${x + w * 0.1},${y + h * 0.45}`} fill="#6f7d9c" opacity=".55" /><polygon points={`${x - w * 0.14},${y - h * 0.2} ${x},${y - h * 0.55} ${x + w * 0.14},${y - h * 0.2} ${x + w * 0.05},${y - h * 0.1} ${x - w * 0.04},${y - h * 0.22}`} fill="#fff" /></g>;
    }
    case 'cloud': {
      const x = s.x ?? 0, y = s.y ?? 0, w = s.w ?? 70;
      return <g className="wm-cloud" opacity=".92" style={{ animationDelay: `${-s.seed * 5}s` }}><ellipse cx={x} cy={y} rx={w / 2} ry="12" fill="#fff" /><circle cx={x - w * 0.18} cy={y - 8} r="12" fill="#fff" /><circle cx={x + w * 0.1} cy={y - 12} r="15" fill="#fff" /></g>;
    }
    case 'star': {
      const x = s.x ?? 0, y = s.y ?? 0, r = s.w ?? 8;
      return <path className="wm-twinkle" style={{ animationDelay: `${s.seed * 0.7}s` }} d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z`} fill="#fff" />;
    }
  }
}

export default function WorldMap({ worldKey, territories, members }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth || 360);
    return () => ro.disconnect();
  }, []);

  const wide = width >= 640;
  const layout = useMemo(() => layoutMap(wide ? 720 : 360), [wide]);
  const scenery = useMemo(() => buildScenery(layout, worldKey), [layout, worldKey]);
  const world = WORLDS[worldKey] ?? WORLDS.aventuriers;
  const u = width / layout.W;
  const { W, H } = layout;

  const me = members.find((m) => m.me);
  const lead = members.reduce((best, m) => Math.max(best, m.cell), 0);
  const reachedRegion = territoryIndex(lead * STEPS_PER_CELL);
  const pos = (x: number, y: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

  // fond : dégradé vertical, une couleur de sol par territoire
  const regionTop = (t: number) => (t >= 4 ? 0 : (layout.pts[t * T + T].y + layout.pts[t * T + T + 1].y) / 2);
  const regionBottom = (t: number) => (t === 0 ? H : regionTop(t - 1));
  const stops = [4, 3, 2, 1, 0].flatMap((t) => [`${world.regions[t].ground[0]} ${((regionTop(t) / H) * 100).toFixed(1)}%`, `${world.regions[t].ground[1]} ${((regionBottom(t) / H) * 100).toFixed(1)}%`]).join(',');

  const full = routePath(layout);
  const doneCell = me?.cell ?? 0;
  const done = doneCell > 0 ? routePath(layout, doneCell) : '';

  const nodeSize = 34 * u;
  const shifts = useMemo(() => tokenShifts(members.map((m) => ({ id: m.child.id, cell: m.cell }))), [members]);

  // ── défilement vers un enfant : à l'ouverture (l'enfant choisi), puis à la demande (liste, bouton « Où je suis ») ──
  const [pulse, setPulse] = useState<string | null>(null);
  const [meVisible, setMeVisible] = useState(true);
  const scrollToChild = useCallback((id: string, smooth: boolean) => {
    const el = wrap.current?.querySelector<HTMLElement>(`[data-child="${id}"]`);
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'center', behavior: smooth && !reduced ? 'smooth' : 'auto' });
    setPulse(id);
    window.setTimeout(() => setPulse((p) => (p === id ? null : p)), 1700);
  }, []);

  const placed = useRef(false);
  const meId = me?.child.id;
  useEffect(() => {
    if (placed.current || !meId) return;
    placed.current = true; // une seule fois, quand la position de l'enfant est connue
    window.setTimeout(() => scrollToChild(meId, false), 80);
  }, [meId, scrollToChild]);
  useEffect(() => onFocusChild((id) => scrollToChild(id, true)), [scrollToChild]);

  useEffect(() => {
    const el = wrap.current?.querySelector('.wm-me');
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setMeVisible(e.isIntersecting), { rootMargin: '-70px 0px -130px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [meId, layout]);

  return (
    <>
    <div ref={wrap} className="wm" role="group" aria-label="Carte de l’aventure" style={{ height: px(H * u), background: `linear-gradient(to bottom, ${stops})`, ['--u' as string]: u } as CSSProperties}>
      <svg className="wm-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {scenery.shapes.map((s, i) => <ShapeSvg key={i} s={s} layout={layout} ground={world.regions[s.region].ground[1]} />)}
        <path d={full} fill="none" stroke={world.edge} strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
        <path d={full} fill="none" stroke={world.road} strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
        <path d={full} fill="none" stroke={world.edge} strokeOpacity=".35" strokeWidth="2.5" strokeDasharray="3 11" strokeLinecap="round" />
        {done && <>
          <path d={done} className="wm-done" fill="none" stroke={world.edge} strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
          <path d={done} className="wm-done" fill="none" stroke="#ffc93c" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
        </>}
      </svg>

      {scenery.decos.map((d, i) => <i key={i} className={`wm-deco ${d.sway ? 'sway' : 'bob'}`} style={{ ...pos(d.x, d.y), fontSize: px(d.size * u), animationDelay: `${d.delay}s` }}>{d.e}</i>)}
      {scenery.landmarks.map((l, i) => <i key={`l${i}`} className="wm-deco landmark" style={{ ...pos(l.x, l.y), fontSize: px(78 * u) }}>{l.e}</i>)}
      {scenery.particles.map((p, i) => <i key={`p${i}`} className={`wm-amb ${p.kind}`} style={{ ...pos(p.x, p.y), ['--s' as string]: px(p.size * u), animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` } as CSSProperties} />)}

      {Array.from({ length: MAP_CELLS }, (_, k) => k + 1).map((i) => {
        const p = layout.pts[i], no = chestAt.get(i), passed = i <= doneCell;
        const hereMe = i === doneCell, ten = i % 10 === 0;
        if (hereMe) return null;
        const k = no ? 1.85 : ten ? 1.15 : 1;
        const nextNo = chestsReached(doneCell) + 1;
        return (
          <div key={i} className={`wm-node ${passed ? 'done' : ''} ${no ? 'chest' : ''} ${no && no === nextNo ? 'next' : ''} ${ten ? 'ten' : ''} ${i > doneCell + 12 ? 'far' : ''}`}
            style={{ ...pos(p.x, p.y), width: px(nodeSize * k), height: px(nodeSize * k), fontSize: px((i >= 100 ? 11.5 : 14) * u) } as CSSProperties}
            title={`Case ${i}${no ? ` · coffre : ${chestValue(no)} pépites` : ''}`}>
            {no ? <><TreasureChest uid={`c${no}`} open={passed} next={no === nextNo} /><small className="chest-val" style={{ fontSize: px(10.5 * u) }}>+{chestValue(no)}</small></> : i}
          </div>
        );
      })}
      <div className="wm-node finish" style={{ ...pos(layout.pts[MAP_CELLS].x, layout.pts[MAP_CELLS].y - 46), fontSize: px(34 * u) }} aria-label="Arrivée">🏆<small style={{ fontSize: px(10 * u) }}>ARRIVÉE</small></div>
      <div className="wm-start" style={{ ...pos(layout.pts[0].x + 40, layout.pts[0].y - 18), fontSize: px(12 * u) }}>🚩 DÉPART</div>

      {members.map((m) => {
        const p = layout.pts[m.cell];
        const shift = (shifts.get(m.child.id) ?? 0) * u;
        const size = (m.me ? 46 : 31) * u;
        return (
          <div key={m.child.id} data-child={m.child.id} className={`wm-token ${m.me ? 'wm-me' : ''} ${pulse === m.child.id ? 'pulse' : ''}`} style={{ ...pos(p.x, p.y), ['--dx' as string]: px(shift), zIndex: m.me ? 9 : 8 } as CSSProperties} title={`${m.child.display_name} · case ${m.cell}`}>
            {m.me && <span className="wm-tag" style={{ fontSize: px(11 * u) }}>TOI !</span>}
            {!m.me && <span className="wm-name" style={{ fontSize: px(9.5 * u) }}>{m.child.display_name}</span>}
            <Avatar avatar={m.child.avatar_key} color={m.child.color_key} size={size} />
          </div>
        );
      })}

      {territories.map((name, t) => {
        const y = t === 0 ? H - 26 : layout.pts[t * T + 1].y + layout.rowH * 0.5;
        const locked = t > reachedRegion;
        const range = `${t * STEPS_PER_TERRITORY}–${t === 4 ? MAP_CELLS * STEPS_PER_CELL : (t + 1) * STEPS_PER_TERRITORY - 1} pas`;
        return (
          <div key={name} className={`wm-ribbon ${locked ? 'locked' : ''} ${t === reachedRegion ? 'now' : ''}`} style={{ ...pos(W / 2, y), fontSize: px(12 * u) }} title={`${name} · ${range}`}>
            <span>{locked ? '🔒' : world.regions[t].landmark}</span><b>{name}</b>
          </div>
        );
      })}

      {[1, 2, 3, 4].filter((t) => t > reachedRegion).map((t) => (
        <div key={`fog${t}`} className="wm-fog" style={{ top: `${(regionTop(t) / H) * 100}%`, height: `${((regionBottom(t) - regionTop(t)) / H) * 100}%`, background: world.night ? 'rgba(8,8,40,.3)' : 'rgba(255,255,255,.22)' }} />
      ))}
    </div>
    {me && !meVisible && <button className="wm-locate" onClick={() => scrollToChild(me.child.id, true)}>📍 Où je suis</button>}
    </>
  );
}
