// Les RPC lèvent des codes courts ; on les traduit pour l'affichage.
const MESSAGES: Record<string, string> = {
  forbidden: 'Action non autorisée.',
  not_found: 'Introuvable.',
  already_claimed: 'Cette mission est déjà faite aujourd’hui.',
  not_available: 'Cette mission n’est pas disponible aujourd’hui.',
  invalid_state: 'Cette demande a déjà été traitée.',
  insufficient_points: 'Pas assez de pépites.',
  out_of_stock: 'Cette récompense n’est plus en stock.',
  exceeds_target: 'Ça dépasse l’objectif du coffre.',
  invalid_amount: 'Montant invalide.',
  not_eligible: 'Le dé n’est pas encore disponible.',
  already_in_family: 'Tu as déjà un foyer.',
};

export function errorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  for (const [code, msg] of Object.entries(MESSAGES)) if (raw.includes(code)) return msg;
  return 'Oups, une erreur est survenue. Réessaie dans un instant.';
}
