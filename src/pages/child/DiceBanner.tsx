import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { unlockText } from '../../lib/dice';
import { useChild } from '../../state/child';
import { useDiceRolls, useFamilyCtx } from '../../state/family';
import { Gauge } from '../../ui/kit';

/** Bannière en haut de l'accueil : dé prêt (qui pulse) ou progression vers le déblocage. */
export default function DiceBanner() {
  const { settings } = useFamilyCtx();
  const { child } = useChild();
  const rolls = useDiceRolls();
  const state = useQuery({
    queryKey: ['fam', 'dice-state', child?.id, rolls.data?.length],
    queryFn: () => api.diceState(child!.id),
    enabled: !!child && settings.dice_enabled,
    refetchOnMount: 'always',
  });
  const s = state.data;
  if (!child || !settings.dice_enabled || !s) return null;
  if (s.rolled) return (
    <Link to="de" className="dice-banner done"><span className="db-die" aria-hidden>🎲</span><div><strong>Dé du destin</strong><small>{unlockText(s)}</small></div></Link>
  );
  return (
    <Link to="de" className={`dice-banner ${s.eligible ? 'ready' : ''}`}>
      <span className="db-die" aria-hidden>🎲</span>
      <div>
        <strong>{s.eligible ? 'Ton dé du jour est prêt !' : 'Dé du destin'}</strong>
        {s.eligible ? <small>Touche ici pour le lancer</small> : (
          <>
            <small>{s.progress} / {s.threshold} missions validées aujourd’hui</small>
            <Gauge value={Math.min(s.progress, s.threshold)} max={s.threshold} label="Missions validées aujourd’hui" />
          </>
        )}
      </div>
      {s.eligible && <span className="db-go">Lancer !</span>}
    </Link>
  );
}
