import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';
import { localDate } from '../lib/game';
import { applyTheme, themeBySlug, type Theme } from '../lib/themes';
import type { Family, FamilySettings } from '../lib/types';
import { useToast } from './toast';

interface FamilyCtx { family: Family; settings: FamilySettings; theme: Theme; today: string }
const Ctx = createContext<FamilyCtx | null>(null);

export function useFamilyCtx() {
  const v = useContext(Ctx);
  if (!v) throw new Error('FamilyProvider manquant');
  return v;
}

/** Charge foyer + réglages + thème ; rend `fallback` si l'utilisateur n'a pas encore de foyer. */
export function FamilyProvider({ userId, fallback, children }: { userId: string; fallback: ReactNode; children: ReactNode }) {
  const familyQ = useQuery({ queryKey: ['family', userId], queryFn: () => api.myFamily(userId) });
  const themesQ = useQuery({ queryKey: ['themes'], queryFn: api.themes, staleTime: Infinity });
  const family = familyQ.data ?? null;
  const settingsQ = useQuery({
    queryKey: ['fam', family?.id, 'settings'], queryFn: () => api.settings(family!.id), enabled: !!family,
  });

  const slug = themesQ.data?.find((t) => t.id === family?.active_theme_id)?.slug;
  const theme = themeBySlug(slug);
  useEffect(() => { applyTheme(theme); }, [theme]);

  const value = useMemo(
    () => (family && settingsQ.data ? { family, settings: settingsQ.data, theme, today: localDate(family.timezone) } : null),
    [family, settingsQ.data, theme],
  );

  if (familyQ.isLoading || themesQ.isLoading || (family && settingsQ.isLoading)) return <div className="splash">Chargement…</div>;
  if (familyQ.error || settingsQ.error) return <div className="splash">Impossible de charger ton foyer. Recharge la page.</div>;
  if (!value) return <>{fallback}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Requête rattachée au foyer : invalidée par toute mutation via `useAction`. */
export function useFamQuery<T>(key: string, fn: (familyId: string, today: string) => Promise<T>, extra: unknown[] = []) {
  const { family, today } = useFamilyCtx();
  return useQuery({ queryKey: ['fam', family.id, key, ...extra], queryFn: () => fn(family.id, today) });
}

export const useChildren = () => useFamQuery('children', api.children);
export const useWallets = () => useFamQuery('wallets', api.wallets);
export const useMissions = () => useFamQuery('missions', api.missions);
export const useMissionChildren = () => useFamQuery('mission-children', () => api.missionChildren());
export const useOccurrences = () => useFamQuery('occurrences', (_f, today) => {
  const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 90);
  return api.occurrences(d.toISOString().slice(0, 10));
});
export const useRewards = () => useFamQuery('rewards', api.rewards);
export const useRedemptions = () => useFamQuery('redemptions', api.redemptions);
export const useTreasure = () => useFamQuery('treasure', api.treasure);
export const useChestClaims = () => useFamQuery('chest-claims', () => api.chestClaims());
export const useStepTransactions = () => useFamQuery('step-transactions', (f) => api.stepTransactions(f));
export const useTransactions = () => useFamQuery('transactions', (f) => api.transactions(f));
export const useDiceRolls = () => useFamQuery('dice-rolls', api.diceRolls);
export const useBadges = () => useQuery({ queryKey: ['badges'], queryFn: api.badges, staleTime: Infinity });
export const useChildBadges = () => useFamQuery('child-badges', () => api.childBadges());

/** Mutation + rafraîchissement du foyer + message. Les erreurs RPC sont traduites en français. */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>, success?: string | ((r: R) => string | undefined)) {
  const qc = useQueryClient();
  const toast = useToast();
  const { family } = useFamilyCtx();
  const m = useMutation({
    mutationFn: (args: A) => fn(...args),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['fam', family.id] });
      qc.invalidateQueries({ queryKey: ['family'] });
      const msg = typeof success === 'function' ? success(r) : success;
      if (msg) toast(msg);
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  return { run: (...args: A) => m.mutateAsync(args).catch(() => undefined), pending: m.isPending };
}
