// Affichage des missions côté enfant : ordre de la liste et choix d'icônes.

import type { MissionState } from './game';

/** À faire d'abord, puis envoyées, puis à refaire, puis validées (grisées) : tout reste visible, le reste à faire en tête. */
const ORDER: Record<MissionState, number> = { available: 0, claimed: 1, rejected: 2, approved: 3, unavailable: 4 };

export function orderViews<T extends { state: MissionState }>(views: T[]): T[] {
  return views.filter((v) => v.state !== 'unavailable').map((v, i) => [v, i] as const)
    .sort((a, b) => ORDER[a[0].state] - ORDER[b[0].state] || a[1] - b[1]).map(([v]) => v);
}

/** Icônes proposées dans le formulaire d'une mission (emoji : aucune image à fabriquer). */
export const ICON_CHOICES = [
  '🍽️', '🧽', '🧸', '🍴', '🧼', '🪥', '👘', '🌅', '👕', '🧺', '🧥', '👟',
  '👂', '😊', '💬', '😴', '🛌', '🚗', '🧘', '🦁', '🏁', '🤝', '🕊️', '📚',
  '🏡', '🧹', '🪣', '🛁', '🚿', '🐶', '🐱', '🌱', '🎒', '✏️', '🎨', '🎹',
  '⚽', '🚲', '🛒', '🍎', '🥦', '💧', '🔑', '⏰', '⭐', '🌟', '🦸', '💖',
];
