// Dé du destin quotidien : six faces, la même chance pour chacune (le tirage est fait côté serveur, supabase/migrations/0012_daily_dice.sql).

export type FaceKey = 'lose' | 'steps1' | 'steps2' | 'pep1' | 'pep2' | 'chest2';
export type LegacyKey = 'double' | 'plus_one' | 'joker' | 'surprise';   // anciennes faces, gardées pour l'historique
export type Unit = 'steps' | 'pepites' | 'chest' | 'none';

export interface Face { key: FaceKey; unit: Unit; amount: number; short: string; message: string }

export const FACES: Face[] = [
  { key: 'lose', unit: 'none', amount: 0, short: 'Pas de chance', message: 'Pas de chance cette fois… à demain !' },
  { key: 'steps1', unit: 'steps', amount: 1, short: '+1 pas', message: 'Tu gagnes 1 pas !' },
  { key: 'steps2', unit: 'steps', amount: 2, short: '+2 pas', message: 'Tu gagnes 2 pas !' },
  { key: 'pep1', unit: 'pepites', amount: 1, short: '+1 pépite', message: 'Tu gagnes 1 pépite !' },
  { key: 'pep2', unit: 'pepites', amount: 2, short: '+2 pépites', message: 'Tu gagnes 2 pépites !' },
  { key: 'chest2', unit: 'chest', amount: 2, short: '+2 dans le coffre famille', message: 'Bravo ! 2 pépites de plus dans le coffre de la famille !' },
];

export interface RollPayload { steps?: number; pepites?: number; chest?: number; fallback?: boolean; bonus?: number; resolved?: boolean }

/** Ce que rapporte réellement un lancer (le coffre plein ou presque plein change le gain de la face « coffre »). */
export function effectOf(key: string, payload: RollPayload): { unit: Unit; amount: number; label: string; message: string } {
  if (key === 'double' || key === 'plus_one') return { unit: 'pepites', amount: payload.bonus ?? 1, label: `+${payload.bonus ?? 1} pépite`, message: 'Ancien dé : pépites bonus' };
  if (key === 'joker' || key === 'surprise') return { unit: 'none', amount: 0, label: key === 'joker' ? 'Carte joker' : 'Petite surprise', message: 'Ancien dé : cadeau du parent' };
  if (payload.chest !== undefined) return { unit: 'chest', amount: payload.chest, label: `+${payload.chest} dans le coffre famille`, message: `Bravo ! ${payload.chest} pépite${payload.chest > 1 ? 's' : ''} de plus dans le coffre de la famille !` };
  if (payload.fallback) return { unit: 'pepites', amount: payload.pepites ?? 2, label: `+${payload.pepites ?? 2} pépites (coffre déjà plein)`, message: 'Le coffre de la famille est déjà plein : les 2 pépites sont pour toi !' };
  if (payload.steps) return { unit: 'steps', amount: payload.steps, label: `+${payload.steps} pas`, message: `Tu gagnes ${payload.steps} pas !` };
  if (payload.pepites) return { unit: 'pepites', amount: payload.pepites, label: `+${payload.pepites} pépite${payload.pepites > 1 ? 's' : ''}`, message: `Tu gagnes ${payload.pepites} pépite${payload.pepites > 1 ? 's' : ''} !` };
  return { unit: 'none', amount: 0, label: 'Pas de chance', message: FACES[0].message };
}

/** Avancement vers le déblocage : « 6 sur 10 », et ce qu'il faut dire à l'enfant. */
export function unlockText(s: { eligible: boolean; rolled: boolean; progress: number; threshold: number }): string {
  if (s.rolled) return 'Tu as déjà lancé le dé aujourd’hui. Reviens demain !';
  if (s.eligible) return 'Ton dé est prêt : lance-le !';
  const left = Math.max(0, s.threshold - s.progress);
  return `Fais valider encore ${left} mission${left > 1 ? 's' : ''} aujourd’hui pour débloquer le dé (${Math.min(s.progress, s.threshold)} sur ${s.threshold}).`;
}
