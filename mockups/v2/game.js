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

function renderMap() {
  const step = mapStep(state.lifetime), t = THEMES[state.theme];
  const ranges = STARTS.map((s, i) => { const first = Math.max(1, Math.ceil((s || 1) / 5)), last = i === 4 ? 50 : Math.ceil(STARTS[i + 1] / 5) - 1; return [first, last]; });
  $('#map').innerHTML = ranges.map(([a, b], ti) => {
    const cells = Array.from({ length: b - a + 1 }, (_, k) => a + k), rows = [];
    for (let i = 0; i < cells.length; i += 5) rows.push(cells.slice(i, i + 5));
    const locked = a > step + 1 && ti > terrOf(state.lifetime);
    const html = rows.map((r, ri) => {
      const rev = ri % 2 === 1, done = r.filter((c) => c <= step).length;
      const fill = Math.round((Math.max(0, done - (r.includes(step + 1) ? 0 : 0)) / Math.max(1, r.length - 1)) * 100);
      const nodes = r.map((c) => {
        const chest = c === b, cls = ['node', c <= step ? 'done' : '', c === step ? 'here' : '', chest ? 'chest' : '', c > step + 6 ? 'far' : ''].join(' ');
        return `<div class="${cls}">${c === step ? '🦊' : chest ? '🎁' : c}</div>`;
      });
      return `<div class="prow ${rev ? 'rev' : ''}" style="--fill:${Math.min(100, fill)}%">${nodes.join('')}</div>`;
    }).join('');
    return `<div class="territory"><div class="banner ${locked ? 'locked' : ''}"><span>${t.decor[ti]}</span><b>${t.terr[ti]}</b><small>${STARTS[ti]}${ti === 4 ? '+' : '–' + (STARTS[ti + 1] - 1)} ${coin()}</small></div><div class="panel path">${html}</div></div>`;
  }).join('');
  const here = $('.node.here'); if (here && location.hash === '#carte') setTimeout(() => here.scrollIntoView({ block: 'center', behavior: 'smooth' }), 400);
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
  if (s === 'carte') setTimeout(() => $('.node.here')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 500);
}
$('#themebar').innerHTML = Object.entries(THEMES).map(([k, t]) => `<button data-t="${k}">${t.hero} ${t.name}</button>`).join('');
$('#themebar').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) applyTheme(b.dataset.t); });
addEventListener('hashchange', route);
const q = new URLSearchParams(location.search).get('theme');
if (new URLSearchParams(location.search).has('shot')) document.body.classList.add('shot');
applyTheme(THEMES[q] ? q : 'aventuriers'); route();
