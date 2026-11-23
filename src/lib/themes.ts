// Un univers = design tokens + libellés. Les règles, composants et données sont partagés.

export interface Theme {
  slug: string;
  name: string;
  tagline: string;
  coin: string; // icône de la pépite
  heroEmoji: string;
  territories: [string, string, string, string, string];
  vars: Record<string, string>;
}

const base = { '--radius': '18px' };

export const THEMES: Theme[] = [
  {
    slug: 'aventuriers',
    name: 'La Guilde des Aventuriers',
    tagline: 'Parchemin, blasons et coffres',
    coin: '🪙',
    heroEmoji: '🛡️',
    territories: ['Forêt des Premiers Pas', 'Rivière des Découvertes', 'Château du Foyer', 'Montagnes des Héros', 'Sommet des Légendes'],
    vars: { ...base, '--bg': '#f5f0e6', '--card': '#fffdf8', '--ink': '#283247', '--muted': '#6c7384', '--line': '#e2d9ca', '--primary': '#2f6f4f', '--primary-ink': '#ffffff', '--accent': '#d9a21b', '--soft': '#f1e5c7', '--hero': 'linear-gradient(120deg,#2f6f4f,#d9a21b)', '--font': 'system-ui, sans-serif', '--font-title': 'Georgia, "Times New Roman", serif' },
  },
  {
    slug: 'princesses',
    name: 'Le Royaume des Princesses',
    tagline: 'Palais, jardins fleuris et cristaux',
    coin: '💎',
    heroEmoji: '👑',
    territories: ['Jardins enchantés', 'Lac des souhaits', 'Palais', 'Nuages', 'Étoiles'],
    vars: { ...base, '--bg': '#fdf2f8', '--card': '#ffffff', '--ink': '#4a2545', '--muted': '#8b6a88', '--line': '#f3d4e8', '--primary': '#c2459b', '--primary-ink': '#ffffff', '--accent': '#7c5cd6', '--soft': '#fbe3f2', '--hero': 'linear-gradient(120deg,#e879b9,#9b8cf0)', '--font': 'system-ui, sans-serif', '--font-title': '"Trebuchet MS", system-ui, sans-serif' },
  },
  {
    slug: 'pirates',
    name: 'Les Îles des Pirates',
    tagline: 'Carte marine, boussole et trésor',
    coin: '🪙',
    heroEmoji: '🏴‍☠️',
    territories: ['Port', 'Jungle', 'Crique', 'Île au trésor', 'Grand large'],
    vars: { ...base, '--bg': '#eaf3f6', '--card': '#ffffff', '--ink': '#13324a', '--muted': '#5d7788', '--line': '#c9dde6', '--primary': '#0e6e8c', '--primary-ink': '#ffffff', '--accent': '#d8602b', '--soft': '#d6eaf1', '--hero': 'linear-gradient(120deg,#0e6e8c,#13324a)', '--font': 'system-ui, sans-serif', '--font-title': '"Palatino Linotype", Palatino, serif' },
  },
  {
    slug: 'espace',
    name: 'La Galaxie des Héros',
    tagline: 'Planètes, fusées et étoiles',
    coin: '⭐',
    heroEmoji: '🚀',
    territories: ['Base', 'Lune', 'Planète rouge', 'Nébuleuse', 'Constellations'],
    vars: { ...base, '--bg': '#12142b', '--card': '#1c2043', '--ink': '#eef0ff', '--muted': '#a0a6d6', '--line': '#2d3365', '--primary': '#7c6cff', '--primary-ink': '#ffffff', '--accent': '#ffcf4a', '--soft': '#262b5a', '--hero': 'linear-gradient(120deg,#4b3fd1,#d84a8f)', '--font': 'system-ui, sans-serif', '--font-title': '"Avenir Next", system-ui, sans-serif' },
  },
  {
    slug: 'dinosaures',
    name: 'Le Monde des Dinosaures',
    tagline: 'Vallée préhistorique, fougères et volcans',
    coin: '🥚',
    heroEmoji: '🦖',
    territories: ['Camp', 'Jungle', 'Vallée', 'Volcan', 'Fossiles'],
    vars: { ...base, '--bg': '#f1f4e6', '--card': '#fdfef7', '--ink': '#2d3a1f', '--muted': '#6b7a55', '--line': '#d9e1c2', '--primary': '#5a8a1f', '--primary-ink': '#ffffff', '--accent': '#e0662a', '--soft': '#e3ebc9', '--hero': 'linear-gradient(120deg,#5a8a1f,#e0662a)', '--font': 'system-ui, sans-serif', '--font-title': '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif' },
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
  root.style.colorScheme = theme.slug === 'espace' ? 'dark' : 'light';
}

export const AVATARS: Record<string, string> = {
  fox: '🦊', cat: '🐱', dog: '🐶', bear: '🐻', panda: '🐼', owl: '🦉', lion: '🦁', frog: '🐸',
  unicorn: '🦄', dragon: '🐲', robot: '🤖', rocket: '🚀',
};

export const COLORS: Record<string, string> = {
  sun: '#f6b73c', sky: '#4aa8f0', mint: '#3ec9a0', rose: '#f0689a', violet: '#8a6cf0', coral: '#f0794a',
};

export const REWARD_ICONS: Record<string, string> = {
  film: '🎬', moon: '🌙', dessert: '🍰', game: '🎲', outing: '🥞', friend: '🧑‍🤝‍🧑', heart: '💞', gift: '🎁', crown: '👑',
};
