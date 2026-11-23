import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { chestsReached, mapCell, missionState, nextCellAt, nextChest, territoryIndex, type MissionState } from '../lib/game';
import type { Mission } from '../lib/types';
import { useChildren, useFamilyCtx, useMissionChildren, useMissions, useOccurrences, useWallets } from './family';

export interface MissionView { mission: Mission; state: MissionState; occurrenceId?: string }

/** Tout ce qu'un écran enfant doit savoir de l'enfant courant. */
export function useChild() {
  const { childId } = useParams();
  const { today } = useFamilyCtx();
  const children = useChildren();
  const wallets = useWallets();
  const missions = useMissions();
  const assignments = useMissionChildren();
  const occurrences = useOccurrences();

  const child = children.data?.find((c) => c.id === childId);
  const wallet = wallets.data?.find((w) => w.child_id === childId);
  const balance = wallet?.balance ?? 0;
  const steps = wallet?.steps ?? 0;

  const missionViews = useMemo<MissionView[]>(() => {
    if (!child) return [];
    const mine = (occurrences.data ?? []).filter((o) => o.child_id === child.id);
    return (missions.data ?? []).filter((m) => m.is_active).map((m) => {
      const assigned = (assignments.data ?? []).filter((a) => a.mission_id === m.id).map((a) => a.child_id);
      const occs = mine.filter((o) => o.mission_id === m.id);
      return { mission: m, state: missionState(m, assigned, child.id, today, occs), occurrenceId: occs.find((o) => o.due_date === today)?.id };
    });
  }, [child, missions.data, assignments.data, occurrences.data, today]);

  // missions envoyées les jours précédents et pas encore validées par les parents
  const waitingOld = (occurrences.data ?? []).filter((o) => o.child_id === child?.id && o.status === 'claimed' && o.due_date < today);

  return {
    child, balance, steps, waitingOld,
    cell: mapCell(steps), nextAt: nextCellAt(steps), territory: territoryIndex(steps),
    chest: nextChest(steps), chestsOpened: chestsReached(steps),
    missionViews,
    loading: children.isLoading || wallets.isLoading || missions.isLoading,
  };
}
