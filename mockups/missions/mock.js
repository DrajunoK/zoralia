// Mockup : missions illustrées, liste complète et bloc « Défis héroïques ». Données fictives.
const THEMES = {
  aventuriers: { name: 'La Guilde des Aventuriers', sky1: '#43b184', sky2: '#1b5e4b', primary: '#ff9f1c', ink: '#3b2f1a', second: '#2f7d5b', soft: '#ffe7b0' },
  princesses: { name: 'Le Royaume des Princesses', sky1: '#ff9ad5', sky2: '#8e6cf0', primary: '#ff5fa8', ink: '#ffffff', second: '#8b5cf6', soft: '#ffd6f0' },
  pirates: { name: 'Les Îles des Pirates', sky1: '#52d0f5', sky2: '#1d4e89', primary: '#ff6b35', ink: '#ffffff', second: '#0b7285', soft: '#ffe0a8' },
  espace: { name: 'La Galaxie des Héros', sky1: '#6a55d8', sky2: '#1a1650', primary: '#ffd23f', ink: '#2a2350', second: '#7c6cff', soft: '#d8ceff' },
  dinosaures: { name: 'Le Monde des Dinosaures', sky1: '#a6e04e', sky2: '#2f7d32', primary: '#ff7a2f', ink: '#ffffff', second: '#3f8f2f', soft: '#ecf3b8' },
};

// done = validée · wait = envoyée, en attente d'un parent · todo = à faire
const DAILY = [
  ['Mettre la table', '🍽️', 1, 'done'], ['Débarrasser la table', '🧽', 1, 'todo'], ['Ranger ma chambre', '🧸', 1, 'wait'],
  ['Je mange correctement', '🍴', 1, 'todo'], ['Je me lave les mains', '🧼', 1, 'done'], ['Je me brosse les dents', '🪥', 1, 'done'],
  ['Je mets mon pyjama', '🌙', 1, 'todo'], ['Je réussis mon matin', '🌅', 1, 'done'], ['Ranger et retourner mes habits', '👕', 1, 'todo'],
  ['Mettre mes habits au sale', '🧺', 1, 'todo'], ['Pendre mon manteau', '🧥', 1, 'done'], ['Ranger mes chaussures', '👟', 1, 'todo'],
  ['J’écoute du 1er coup', '👂', 1, 'todo'], ['Je me prépare sans conflit', '😊', 1, 'todo'], ['Je parle gentiment et poliment', '💬', 1, 'todo'],
  ['Je m’endors sans perturber mes parents', '😴', 1, 'todo'], ['Je reste dans mon lit la nuit', '🛌', 1, 'todo'],
];
const HEROIC = [
  ['J’aide mes parents à sortir les affaires de la voiture', '🚗', 3, 'todo'], ['Je maîtrise mes émotions', '🧘', 3, 'todo'],
  ['Je suis courageux(se)', '🦁', 3, 'done'], ['Je termine mes missions', '🏁', 3, 'todo'],
  ['Aider sans qu’on le demande', '🤝', 3, 'todo'], ['Gérer une dispute calmement', '🕊️', 4, 'wait'],
  ['Très bon travail à l’école', '📚', 5, 'todo'], ['Très bon comportement à la maison et en famille', '🏡', 5, 'todo'],
];

const $ = (s, r = document) => r.querySelector(s);
const state = { universe: 'aventuriers', icons: 'chip', daily: 'all' };
const foot = (n) => `<span class="coins"><img class="ico foot" src="icons/pas.svg" alt="">${n}</span>`;

function applyUniverse() {
  const t = THEMES[state.universe], r = document.documentElement.style;
  r.setProperty('--sky1', t.sky1); r.setProperty('--sky2', t.sky2); r.setProperty('--primary', t.primary);
  r.setProperty('--primary-ink', t.ink); r.setProperty('--second', t.second); r.setProperty('--soft', t.soft);
  $('#uni').textContent = t.name;
}

function row([title, icon, pts, st], i) {
  const action = st === 'todo' ? '<button class="btn">J’ai terminé !</button>' : st === 'wait' ? '<span class="state">⏳ À valider</span>' : '<span class="state ok">✅ Validée !</span>';
  return `<li class="mission ${st}" style="--h:${(i * 47) % 360}"><span class="m-ic" aria-hidden="true">${icon}</span><div class="mission-main"><b>${title}</b>${foot('+' + pts)}</div>${action}</li>`;
}

function render() {
  const done = DAILY.filter((m) => m[3] === 'done').length;
  // les missions restantes d'abord, puis celles qui attendent, puis celles qui sont faites : tout reste visible
  const order = { todo: 0, wait: 1, done: 2 };
  const daily = DAILY.map((m, i) => [m, i]).sort((a, b) => order[a[0][3]] - order[b[0][3]] || a[1] - b[1]);
  const shown = state.daily === 'all' ? daily : daily.slice(0, 4);
  const hDone = HEROIC.filter((m) => m[3] === 'done').length;

  $('#app').className = `icons-${state.icons}`;
  $('#app').innerHTML = `
    <section class="card routines">
      <header class="card-head"><h2>☀️ Mes routines du jour</h2><span class="link">${done} / ${DAILY.length}</span></header>
      <div class="gauge" role="progressbar" aria-valuenow="${done}" aria-valuemax="${DAILY.length}"><i style="width:${(done / DAILY.length) * 100}%"></i></div>
      <ul class="list missions">${shown.map(([m, i]) => row(m, i)).join('')}</ul>
      ${state.daily === 'all' ? '' : `<p class="more-hint">+ ${DAILY.length - 4} autres routines…</p>`}
    </section>

    <section class="heroes" aria-label="Défis héroïques">
      <header><h2>🦸 Défis héroïques</h2><p>Relève un défi pour gagner plus de pas !</p><span class="hero-count">${hDone} / ${HEROIC.length} relevés</span></header>
      <div class="hero-grid">
        ${HEROIC.map(([title, icon, pts, st]) => `
          <article class="hero-tile ${st}">
            <span class="hero-pts"><img class="ico foot" src="icons/pas.svg" alt="">+${pts}</span>
            <span class="hero-ic" aria-hidden="true">${icon}</span>
            <b>${title}</b>
            ${st === 'todo' ? '<button class="btn">Relever le défi</button>' : st === 'wait' ? '<span class="state">⏳ À valider</span>' : '<span class="state ok">🏆 Bravo !</span>'}
          </article>`).join('')}
      </div>
    </section>`;
}

function bar() {
  const group = (key, label, options) => `<div class="grp"><span>${label}</span>${options.map(([v, l]) => `<button data-k="${key}" data-v="${v}" class="${state[key] === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  $('#bar').innerHTML =
    group('icons', 'Icônes', [['chip', 'Pastille'], ['bare', 'Grande icône'], ['ring', 'Rond coloré']]) +
    group('daily', 'Routines', [['all', 'Tout afficher'], ['four', 'Seulement 4 (avant)']]) +
    group('universe', 'Univers', Object.keys(THEMES).map((k) => [k, k[0].toUpperCase() + k.slice(1)]));
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-k]');
  if (!b) return;
  state[b.dataset.k] = b.dataset.v;
  if (b.dataset.k === 'universe') applyUniverse();
  bar(); render();
});
const q = new URLSearchParams(location.search);
for (const k of ['icons', 'daily', 'universe']) if (q.get(k)) state[k] = q.get(k);
applyUniverse(); bar(); render();
