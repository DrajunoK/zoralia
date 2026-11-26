// Un univers = design tokens + libellés. Les règles, composants et données sont partagés.

export interface Theme {
  slug: string;
  name: string;
  tagline: string;
  heroEmoji: string;
  territories: [string, string, string, string, string];
  vars: Record<string, string>;
}

const base = { '--radius': '24px' };

export const THEMES: Theme[] = [
  {
    slug: 'aventuriers',
    name: 'La Guilde des Aventuriers',
    tagline: 'Parchemin, blasons et coffres',
    heroEmoji: '🛡️',
    territories: ['Forêt des Premiers Pas', 'Rivière des Découvertes', 'Château du Foyer', 'Montagnes des Héros', 'Sommet des Légendes'],
    vars: { ...base, '--sky1': '#43b184', '--sky2': '#1b5e4b', '--primary': '#ff9f1c', '--primary-ink': '#3b2f1a', '--second': '#2f7d5b', '--soft': '#ffe7b0', '--hero': 'linear-gradient(120deg,#43b184,#ffd36e)' },
  },
  {
    slug: 'princesses',
    name: 'Le Royaume des Princesses',
    tagline: 'Palais, jardins fleuris et cristaux',
    heroEmoji: '👑',
    territories: ['Jardins enchantés', 'Lac des souhaits', 'Palais', 'Nuages', 'Étoiles'],
    vars: { ...base, '--sky1': '#ff9ad5', '--sky2': '#8e6cf0', '--primary': '#ff5fa8', '--primary-ink': '#ffffff', '--second': '#8b5cf6', '--soft': '#ffd6f0', '--hero': 'linear-gradient(120deg,#ff9ad5,#9b8cf0)' },
  },
  {
    slug: 'pirates',
    name: 'Les Îles des Pirates',
    tagline: 'Carte marine, boussole et trésor',
    heroEmoji: '🏴‍☠️',
    territories: ['Port', 'Jungle', 'Crique', 'Île au trésor', 'Grand large'],
    vars: { ...base, '--sky1': '#52d0f5', '--sky2': '#1d4e89', '--primary': '#ff6b35', '--primary-ink': '#ffffff', '--second': '#0b7285', '--soft': '#ffe0a8', '--hero': 'linear-gradient(120deg,#52d0f5,#1d4e89)' },
  },
  {
    slug: 'espace',
    name: 'La Galaxie des Héros',
    tagline: 'Planètes, fusées et étoiles',
    heroEmoji: '🚀',
    territories: ['Base', 'Lune', 'Planète rouge', 'Nébuleuse', 'Constellations'],
    vars: { ...base, '--sky1': '#6a55d8', '--sky2': '#1a1650', '--primary': '#ffd23f', '--primary-ink': '#2a2350', '--second': '#7c6cff', '--soft': '#d8ceff', '--hero': 'linear-gradient(120deg,#4b3fd1,#d84a8f)' },
  },
  {
    slug: 'dinosaures',
    name: 'Le Monde des Dinosaures',
    tagline: 'Vallée préhistorique, fougères et volcans',
    heroEmoji: '🦖',
    territories: ['Camp', 'Jungle', 'Vallée', 'Volcan', 'Fossiles'],
    vars: { ...base, '--sky1': '#a6e04e', '--sky2': '#2f7d32', '--primary': '#ff7a2f', '--primary-ink': '#ffffff', '--second': '#3f8f2f', '--soft': '#ecf3b8', '--hero': 'linear-gradient(120deg,#a6e04e,#ff7a2f)' },
  },
];

export const DEFAULT_THEME = THEMES[0];

export function themeBySlug(slug: string | null | undefined): Theme {
  return THEMES.find((t) => t.slug === slug) ?? DEFAULT_THEME;
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme.slug;
  for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v);
  root.style.colorScheme = 'light';
}

export const AVATARS: Record<string, string> = {
  fox: '🦊', cat: '🐱', dog: '🐶', bear: '🐻', panda: '🐼', owl: '🦉', lion: '🦁', frog: '🐸',
  unicorn: '🦄', dragon: '🐲', robot: '🤖', rocket: '🚀',
};

export const COLORS: Record<string, string> = {
  sun: '#f6b73c', sky: '#4aa8f0', mint: '#3ec9a0', rose: '#f0689a', violet: '#8a6cf0', coral: '#f0794a',
};

export const REWARD_ICONS: Record<string, string> = {
  tv: '📺', popcorn: '🍿', phone: '📱', gamepad: '🎮', bowling: '🎳', pajama: '🛏️', film: '🎬',
  moon: '🌙', dessert: '🍰', game: '🎲', outing: '🥞', chef: '🧑‍🍳', pool: '🏊', crepe: '🥞', jungle: '🌴', friend: '🧑‍🤝‍🧑', heart: '💞', gift: '🎁', crown: '👑',
};
