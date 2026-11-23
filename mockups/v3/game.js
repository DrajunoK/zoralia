// Maquette interactive : données factices, aucune connexion Supabase.
const THEMES = {
  aventuriers: { name: 'Aventuriers', hero: '🛡️', glyph: '✦', decor: ['🌲', '🐉', '⚔️', '🏰', '🍃', '✨'],
    terr: ['Forêt des Premiers Pas', 'Rivière des Découvertes', 'Château du Foyer', 'Montagnes des Héros', 'Sommet des Légendes'] },
  princesses: { name: 'Princesses', hero: '👑', glyph: '♥', decor: ['🌸', '🦄', '🏰', '💎', '🦋', '✨'],
    terr: ['Jardins enchantés', 'Lac des souhaits', 'Palais', 'Nuages', 'Étoiles'] },
  pirates: { name: 'Pirates', hero: '🏴‍☠️', glyph: '⚓', decor: ['⛵', '🦜', '🌴', '🧭', '🐙', '🌊'],
    terr: ['Port', 'Jungle', 'Crique', 'Île au trésor', 'Grand large'] },
  espace: { name: 'Espace', hero: '🚀', glyph: '★', decor: ['🪐', '🚀', '⭐', '🛸', '🌙', '☄️'],
    terr: ['Base', 'Lune', 'Planète rouge', 'Nébuleuse', 'Constellations'] },
  dinosaures: { name: 'Dinosaures', hero: '🦖', glyph: '●', decor: ['🦕', '🌋', '🌿', '🥚', '🦴', '🌴'],
    terr: ['Camp', 'Jungle', 'Vallée', 'Volcan', 'Fossiles'] },
};
const STARTS = [0, 30, 80, 150, 250];
const state = { theme: 'aventuriers', balance: 14, lifetime: 62, tab: 'daily', treasure: 48, lea: 30 };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const coin = () => `<i class="coin" data-g="${THEMES[state.theme].glyph}"></i>`;

const MISSIONS = [
  { ic: '🍽️', t: 'Mettre la table', d: 'Avant le dîner', p: 1, c: 'daily', s: 'available' },
  { ic: '🛏️', t: 'Ranger sa chambre', d: 'Tout est à sa place', p: 1, c: 'daily', s: 'claimed' },
  { ic: '🎒', t: 'Préparer son cartable', d: '', p: 1, c: 'daily', s: 'approved' },
  { ic: '🤝', t: 'Aider sans qu’on le demande', d: '', p: 3, c: 'heroic', s: 'available' },
  { ic: '🕊️', t: 'Gérer une dispute calmement', d: '', p: 4, c: 'heroic', s: 'available' },
  { ic: '💪', t: 'Gros effort à l’école', d: 'Ou à l’entraînement', p: 5, c: 'heroic', s: 'available' },
  { ic: '🌟', t: 'Un beau geste spontané', d: 'Ton parent te le donne !', p: 2, c: 'surprise', s: 'none' },
];
const REWARDS = [['🎬', 'Choisir le film du vendredi', 5], ['🌙', 'Se coucher 15 min plus tard', 5], ['🍰', 'Choisir le dessert', 10], ['🎲', 'Choisir le jeu en famille', 10], ['🥞', 'Sortie choisie', 15], ['👑', 'Journée « c’est moi qui décide »', 40]];
const BADGES = [['🌱', 'Petit aventurier', 5], ['🧭', 'Explorateur', 30], ['🛡️', 'Gardien de la maison', 80], ['🎖️', 'Héros confirmé', 150], ['🏆', 'Maître des missions', 250]];

const mapStep = (p) => Math.min(50, Math.floor(p / 5));
const terrOf = (p) => STARTS.reduce((t, s, i) => (p >= s ? i : t), 0);

function applyTheme(name) {
  state.theme = name; const t = THEMES[name];
  document.body.dataset.theme = name;
  $$('#themebar button').forEach((b) => b.classList.toggle('on', b.dataset.t === name));
  $('#decor').innerHTML = Array.from({ length: 16 }, (_, i) =>
    `<i style="left:${(i * 37 + 5) % 96}%;top:${(i * 53 + 10) % 92}%;font-size:${34 + (i * 17) % 40}px;animation-duration:${9 + (i * 3) % 9}s;animation-delay:-${(i * 2) % 9}s">${t.decor[i % t.decor.length]}</i>`).join('');
  renderAll();
}

function renderAll() {
  const step = mapStep(state.lifetime), ti = terrOf(state.lifetime), t = THEMES[state.theme];
  $('#bal').textContent = state.balance;
  $$('.coin').forEach((c) => (c.dataset.g = t.glyph));
  $('#step').textContent = step; $('#m-step').textContent = step; $('#m-life').textContent = state.lifetime;
  $('#to-next').textContent = (step + 1) * 5 - state.lifetime; $('#m-next').textContent = (step + 1) * 5;
  $('#terr-name').textContent = t.terr[ti];
  $('#hello').textContent = `Salut Léa ! ${t.hero} Prête pour l’aventure ?`;
  $('#tiles').innerHTML = [['🎲', 'Dé du destin', 'de', '#ff5a8a', '1'], ['🏅', 'Badges', 'badges', '#8b5cf6', ''], ['🎁', 'Boutique', 'boutique', '#ff7a45', ''], ['🏆', 'Trésor', 'tresor', '#2fb36b', ''], ['🗺️', 'Carte', 'carte', '#2f8de0', '']]
    .map(([i, l, h, c, d]) => `<a class="tile" href="#${h}" style="--t:${c}">${d ? `<span class="dot">${d}</span>` : ''}<span class="ic">${i}</span>${l}</a>`).join('');
  renderMissions(); renderMap(); renderShop(); renderBadges();
}

function missionHTML(m, i) {
  const state_ = m.s === 'claimed' ? '<span class="badge-state">⏳ À valider</span>' : m.s === 'approved' ? '<span class="badge-state ok">✅ Validée !</span>'
    : m.s === 'none' ? '' : `<button class="btn green check" data-claim="${i}" aria-label="J’ai terminé"></button>`;
  return `<div class="mission ${m.s}"><div class="ic">${m.ic}</div><div class="tx"><b>${m.t}</b>${m.d ? `<small>${m.d}</small>` : ''}<span class="rw">+${m.p} ${coin()}</span></div>${state_}</div>`;
}
function renderMissions() {
  const list = MISSIONS.map((m, i) => [m, i]).filter(([m]) => m.c === state.tab);
  $('#mission-list').innerHTML = list.length ? list.map(([m, i]) => missionHTML(m, i)).join('') : '<div class="panel">Rien pour le moment ✨</div>';
  $('#home-missions').innerHTML = MISSIONS.map((m, i) => [m, i]).filter(([m]) => m.s === 'available' && m.c === 'daily' || m.s === 'claimed').slice(0, 3).map(([m, i]) => missionHTML(m, i)).join('');
}

/* ───────── Carte illustrée : un monde par univers ───────── */
const MAPW = 360, MAPH = 3300, TOP = 130, BOT = 130;
const WORLD = {
  aventuriers: { road: '#f1d49b', fog: 'rgba(255,255,255,.55)', pal: ['#8ee09a', '#8ad9f2', '#e8d7a0', '#c3cedd', '#ffe7a0'],
    deco: [['🌲', '🌳', '🍄', '🦌', '🌿', '🐿️'], ['🌊', '🐟', '🪷', '🦆', '🎣', '🐸'], ['🌷', '🚩', '⚔️', '🛡️', '🐎', '🌹'], ['⛰️', '🏔️', '🦅', '🪨', '🐐', '🌨️'], ['☁️', '🌈', '✨', '🦅', '👑', '💫']],
    lm: ['🛖', '🌉', '🏰', '🏔️', '🐉'], amb: ['fireflies', 'bubbles', 'petals', 'snow', 'clouds'] },
  princesses: { road: '#ffffff', fog: 'rgba(255,240,250,.6)', pal: ['#ffd1ea', '#bfe6ff', '#ffe0f5', '#d9ccff', '#fff2b8'],
    deco: [['🌸', '🌷', '🦋', '🌺', '🐝', '🌼'], ['🦢', '🪷', '💧', '🐸', '🌙', '🐟'], ['👑', '💐', '🎀', '🕊️', '✨', '🪞'], ['☁️', '🌈', '🎈', '🦄', '🕊️', '💫'], ['⭐', '🌟', '🌙', '💎', '✨', '🔮']],
    lm: ['⛲', '🛶', '🏰', '🌈', '🌟'], amb: ['petals', 'bubbles', 'sparkles', 'clouds', 'stars'] },
  pirates: { road: '#f5deb0', fog: 'rgba(255,248,225,.55)', pal: ['#ffe2a8', '#8fe0a0', '#8be4ee', '#ffd98a', '#4fa8e0'],
    deco: [['⚓', '⛵', '🦀', '🛶', '🪝', '🐚'], ['🌴', '🦜', '🐒', '🌺', '🐍', '🥥'], ['🏖️', '🐚', '🦀', '🪸', '🐠', '⛱️'], ['💎', '🗺️', '☠️', '🌴', '🪙', '🔑'], ['🌊', '🐋', '🐙', '⛈️', '🦈', '🧭']],
    lm: ['🚢', '🛖', '🏝️', '🏴‍☠️', '🐋'], amb: ['birds', 'fireflies', 'bubbles', 'sparkles', 'bubbles'] },
  espace: { road: '#cfd6ff', fog: 'rgba(10,10,50,.55)', pal: ['#2b3a8c', '#4a4f7a', '#8a3a4a', '#3a2a7a', '#14123a'],
    deco: [['🛰️', '🔭', '📡', '🚀', '🛸', '🌍'], ['🌙', '🌑', '👨‍🚀', '⭐', '🪨', '🛸'], ['🪐', '🔴', '🛸', '☄️', '🌋', '👽'], ['🌌', '💫', '✨', '🔮', '🌠', '🪐'], ['⭐', '🌟', '✨', '💫', '🔭', '🌠']],
    lm: ['🛰️', '🌙', '🛸', '🌌', '🌟'], amb: ['stars', 'stars', 'embers', 'sparkles', 'stars'] },
  dinosaures: { road: '#efd9a2', fog: 'rgba(255,250,225,.55)', pal: ['#bfe36a', '#6fcf7a', '#e8d08a', '#ff9a5a', '#d9c7a0'],
    deco: [['⛺', '🔥', '🌿', '🥚', '🪵', '🦴'], ['🦕', '🌴', '🌿', '🦎', '🐊', '🦋'], ['🦖', '🌾', '🪨', '🐢', '🌄', '🦴'], ['🌋', '🔥', '🪨', '🦇', '💨', '🦖'], ['🦴', '🐚', '🪨', '🦕', '💎', '🏜️']],
    lm: ['⛺', '🦕', '🦖', '🌋', '🏜️'], amb: ['fireflies', 'fireflies', 'birds', 'embers', 'dust'] },
};
const AMB = { fireflies: ['dot', 'glow'], bubbles: ['dot', 'rise'], embers: ['dot', 'ember'], sparkles: ['dot', 'twinkle'], stars: ['dot', 'twinkle'], dust: ['dot', 'rise'],
  petals: ['🌸', 'fall'], snow: ['❄️', 'fall'], clouds: ['☁️', 'cloud'], birds: ['🕊️', 'fly'] };
const rng = (seed) => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; };

function renderMap() {
  const W = WORLD[state.theme], th = THEMES[state.theme], step = mapStep(state.lifetime), tIdx = terrOf(state.lifetime);
  const dy = (MAPH - TOP - BOT) / 49;
  const P = (i) => ({ x: 180 + 98 * Math.sin(i * 0.55 + 0.6), y: MAPH - BOT - (i - 1) * dy });
  const f = (n) => n.toFixed(1);
  const seg = (a, b) => {
    const p0 = P(a - 1), p1 = P(a), p2 = P(b), p3 = P(b + 1);
    return `C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`;
  };
  const pathTo = (end) => { let d = `M${f(P(0).x)} ${f(P(0).y)}`; for (let i = 0; i < end; i++) d += seg(i, i + 1); return d; };
  const full = pathTo(50), done = step > 0 ? pathTo(step) : '';
  const ranges = STARTS.map((s, i) => [Math.max(1, Math.ceil((s || 1) / 5)), i === 4 ? 50 : Math.ceil(STARTS[i + 1] / 5) - 1]);
  const bound = (t) => (t < 0 ? MAPH : t > 4 ? 0 : t === 4 ? 0 : (P(ranges[t][1]).y + P(ranges[t][1] + 1).y) / 2); // frontière en haut du territoire t
  const top = (t) => bound(t), bottom = (t) => (t === 0 ? MAPH : bound(t - 1));
  const pct = (y) => ((y / MAPH) * 100).toFixed(1);

  const stops = [4, 3, 2, 1, 0].map((t) => `${W.pal[t]} ${pct((top(t) + bottom(t)) / 2)}%`).join(',');
  let html = '';

  ranges.forEach(([a, b], t) => {
    const r = rng(t * 97 + Object.keys(WORLD).indexOf(state.theme) * 13 + 5), y0 = top(t), y1 = bottom(t);
    const items = W.deco[t].concat(W.deco[t].slice(0, 4));
    items.forEach((e, k) => {
      const y = y0 + 40 + r() * (y1 - y0 - 80), i = Math.min(50, Math.max(1, Math.round((MAPH - BOT - y) / dy) + 1)), rx = P(i).x;
      const x = rx >= 180 ? 14 + r() * Math.max(10, rx - 105) : Math.min(346, rx + 105) + r() * Math.max(10, 346 - rx - 105);
      html += `<i class="deco ${k % 3 === 0 ? 'sway' : 'bobd'}" style="--x:${f(x)};--y:${f(y)};--s:${28 + Math.floor(r() * 26)};--d:${(r() * 4).toFixed(1)}s">${e}</i>`;
    });
    const lp = P(b), lx = lp.x >= 180 ? 18 + r() * 40 : 270 + r() * 40;
    html += `<i class="deco landmark" style="--x:${f(lx + 20)};--y:${f(lp.y - 6)};--s:76">${W.lm[t]}</i>`;
    const [kind, anim] = AMB[W.amb[t]];
    for (let k = 0; k < 14; k++) {
      const y = y0 + r() * (y1 - y0), x = r() * 350;
      html += `<i class="amb ${anim}${kind === 'dot' ? ' dotp' : ''}" style="--x:${f(x)};--y:${f(y)};--d:${(r() * 6).toFixed(1)}s;--t:${(5 + r() * 6).toFixed(1)}s;--s:${kind === 'dot' ? 6 + Math.floor(r() * 7) : 24 + Math.floor(r() * 16)}">${kind === 'dot' ? '' : kind === '🕊️' && state.theme === 'dinosaures' ? '🦅' : kind === '🕊️' && state.theme === 'pirates' ? '🦜' : kind}</i>`;
    }
    if (t > tIdx) html += `<div class="fog" style="top:${pct(y0)}%;height:${pct(y1 - y0)}%;background:${W.fog}"></div>`;
  });

  for (let i = 1; i <= 50; i++) {
    const p = P(i), isEnd = ranges.some(([, b]) => b === i);
    if (i === step) continue;
    const cls = ['mnode', i < step ? 'done' : '', isEnd ? 'chestn' : '', i > step + 8 ? 'far' : ''].join(' ');
    html += `<div class="${cls}" style="--x:${f(p.x)};--y:${f(p.y)};--i:${i}">${isEnd ? '🧰' : i}</div>`;
  }
  const hp = P(step);
  html += `<div class="mhero" style="--x:${f(hp.x)};--y:${f(hp.y)}"><span class="tag">TOI !</span><span class="avatar" style="background:#f6b73c">🦊</span></div>`;
  html += `<div class="mstart" style="--x:${f(P(0).x)};--y:${f(P(0).y + 30)}">🚩 Départ</div>`;

  ranges.forEach(([a, b], t) => {
    const y = t === 0 ? MAPH - 44 : bottom(t), locked = t > tIdx;
    const ri = Math.min(50, Math.max(1, Math.round((MAPH - BOT - y) / dy) + 1)), side = P(ri).x >= 180 ? 100 : 262;
    html += `<div class="ribbon ${locked ? 'locked' : ''} ${t === tIdx ? 'now' : ''}" style="--x:${side};--y:${f(y)}"><span>${locked ? '🔒' : W.deco[t][0]}</span><div><b>${th.terr[t]}</b><small>${STARTS[t]}${t === 4 ? '+' : '–' + (STARTS[t + 1] - 1)} pépites</small></div></div>`;
  });
  html += `<div class="summit" style="--y:46">🏆 Sommet !</div>`;

  const L = done ? '1' : '0';
  $('#map').innerHTML = `<div class="worldmap" style="height:calc(var(--u) * ${MAPH});background:linear-gradient(to bottom,${stops})">
    <svg viewBox="0 0 ${MAPW} ${MAPH}" aria-hidden="true">
      <path d="${full}" class="r-ink"/><path d="${full}" class="r-road" style="stroke:${W.road}"/><path d="${full}" class="r-dash"/>
      ${done ? `<path d="${done}" class="r-ink gold"/><path d="${done}" class="r-gold" id="rdone"/>` : ''}
    </svg>${html}</div>`;
  const rd = $('#rdone'); if (rd) rd.style.setProperty('--L', Math.ceil(rd.getTotalLength()));
}

function renderShop() {
  $('#shop').innerHTML = REWARDS.map(([i, t, c]) => {
    const missing = c - state.balance;
    return `<div class="card ${missing > 0 ? 'locked' : ''}"><div class="big">${i}</div><b>${t}</b><span class="price">${coin()} ${c}</span>${missing > 0 ? `<button class="btn" disabled>Encore ${missing}</button>` : `<button class="btn green" data-buy="${c}">Je le veux !</button>`}</div>`;
  }).join('');
}
function renderBadges() {
  $('#medals').innerHTML = BADGES.map(([i, n, at]) => {
    const got = state.lifetime >= at;
    return `<div class="panel medal ${got ? '' : 'locked'}" style="margin:0"><div class="m">${got ? i : '🔒'}</div><b>${n}</b><small>${got ? 'Obtenu !' : `À ${at} pépites gagnées`}</small></div>`;
  }).join('');
}

/* effets */
function confetti(x, y, n = 36) {
  const cols = ['#ff5a8a', '#ffc93c', '#3ecf7a', '#4aa8f0', '#8b5cf6', '#ff7a45'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i'); c.className = 'confetti';
    const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 190;
    c.style.cssText = `left:${x}px;top:${y}px;background:${cols[i % cols.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d + 120}px;--rot:${Math.random() * 900 - 450}deg`;
    document.body.append(c); setTimeout(() => c.remove(), 1500);
  }
}
function flyCoins(from, n = 5) {
  const to = $('#wallet').getBoundingClientRect(), f = from.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i'); c.className = 'flycoin'; c.textContent = '🪙';
    c.style.cssText = `left:${f.left + f.width / 2}px;top:${f.top}px;--dx:${to.left - f.left}px;--dy:${to.top - f.top}px;animation-delay:${i * 70}ms`;
    document.body.append(c); setTimeout(() => c.remove(), 1200 + i * 70);
  }
}
function bump() { const w = $('#wallet'); w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump'); $('#bal').textContent = state.balance; }
function toast(t) { const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.append(e); setTimeout(() => e.remove(), 2500); }

/* interactions */
document.addEventListener('click', (e) => {
  const claim = e.target.closest('[data-claim]');
  if (claim) {
    const r = claim.getBoundingClientRect(); const m = MISSIONS[claim.dataset.claim];
    m.s = 'claimed'; confetti(r.left + r.width / 2, r.top + r.height / 2, 22); toast('Mission envoyée ! Ton parent va la valider ✨'); renderMissions(); return;
  }
  const buy = e.target.closest('[data-buy]');
  if (buy) { toast('Demande envoyée ! Ton parent va répondre 🎁'); confetti(e.clientX, e.clientY, 20); return; }
  const give = e.target.closest('[data-give]');
  if (give) {
    const n = +give.dataset.give; if (state.balance < n) return toast('Pas assez de pépites');
    state.balance -= n; state.treasure += n; state.lea += n; flyCoins(give, 4);
    $('#tr-bar').style.setProperty('--v', state.treasure + '%'); $('#tr-now').textContent = state.treasure; $('#c-lea').textContent = state.lea;
    const ch = $('#chest'); ch.classList.remove('shake'); void ch.offsetWidth; ch.classList.add('shake'); bump(); renderShop();
    if (state.treasure >= 100) { confetti(innerWidth / 2, innerHeight / 3, 80); toast('Coffre plein ! 🎉'); } return;
  }
  const seg = e.target.closest('#seg button');
  if (seg) { state.tab = seg.dataset.c; $$('#seg button').forEach((b) => b.classList.toggle('on', b === seg)); renderMissions(); return; }
  const ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]');
  if (ok || no) {
    const q = (ok || no).closest('.qi'); if (ok) { const r = ok.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 26); }
    q.classList.add('gone'); setTimeout(() => { q.remove(); $('#q-count').textContent = $$('.qi').length; }, 350);
  }
});
function roll() {
  const die = $('#die'), faces = ['✖️2', '➕1', '🃏', '🎁'], texts = ['Pépites doublées ! +3', '+1 pépite bonus !', 'Carte joker : ton parent choisit', 'Petite surprise à venir !'];
  die.classList.remove('rolling'); void die.offsetWidth; die.classList.add('rolling'); $('#result').textContent = '…';
  const t = setInterval(() => (die.textContent = faces[Math.floor(Math.random() * 4)]), 90);
  setTimeout(() => {
    clearInterval(t); const k = Math.floor(Math.random() * 4); die.textContent = faces[k]; $('#result').textContent = texts[k];
    const r = die.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2, 60);
    if (k < 2) { state.balance += k ? 1 : 3; state.lifetime += k ? 1 : 3; bump(); renderAll(); }
  }, 900);
}
$('#roll').addEventListener('click', roll); $('#die').addEventListener('click', roll);

/* routage par hash */
const CHILD = ['accueil', 'missions', 'carte', 'boutique', 'tresor', 'de', 'badges'];
function route() {
  const s = location.hash.slice(1) || 'profils';
  $$('.screen').forEach((e) => e.classList.toggle('on', e.id === s));
  const child = CHILD.includes(s);
  $$('.child-only').forEach((e) => (e.style.display = child ? '' : 'none'));
  $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.s === s));
  window.scrollTo(0, 0);
  if (s === 'carte') setTimeout(() => $('.mhero')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 500);
}
const SKINS = { arcade: '🎮 Arcade', douceur: '☁️ Douceur', candy: '🍭 Candy', carnet: '📒 Carnet', nuit: '🌙 Nuit' };
function applySkin(s) { document.body.dataset.skin = s; $$('#skinbar button').forEach((b) => b.classList.toggle('on', b.dataset.k === s)); }
$('#themebar').innerHTML = Object.entries(THEMES).map(([k, t]) => `<button data-t="${k}">${t.hero} ${t.name}</button>`).join('');
$('#skinbar').innerHTML = Object.entries(SKINS).map(([k, n]) => `<button data-k="${k}">${n}</button>`).join('');
$('#skinbar').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) applySkin(b.dataset.k); });
$('#themebar').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) applyTheme(b.dataset.t); });
addEventListener('hashchange', route);
const q = new URLSearchParams(location.search).get('theme');
if (new URLSearchParams(location.search).has('shot')) document.body.classList.add('shot');
const sk = new URLSearchParams(location.search).get('skin');
applySkin(SKINS[sk] ? sk : 'arcade');
applyTheme(THEMES[q] ? q : 'aventuriers'); route();
