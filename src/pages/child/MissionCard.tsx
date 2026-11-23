import { api } from '../../lib/api';
import { useAction } from '../../state/family';
import type { MissionView } from '../../state/child';
import { Coins } from '../../ui/kit';

const LABEL: Record<string, string> = {
  available: '', claimed: '⏳ À valider', approved: '✅ Validée !', rejected: '↩️ À refaire demain', unavailable: 'Pas aujourd’hui',
};

export default function MissionCard({ view, childId }: { view: MissionView; childId: string }) {
  const claim = useAction(api.claimMission, 'Mission envoyée ! Ton parent va la valider ✨');
  const { mission, state } = view;
  return (
    <li className={`mission ${state}`}>
      <div className="mission-main">
        <strong>{mission.title}</strong>
        {mission.description && <small>{mission.description}</small>}
      </div>
      <Coins n={mission.points} />
      {state === 'available'
        ? <button className="btn" disabled={claim.pending} onClick={() => claim.run(mission.id, childId)}>J’ai terminé !</button>
        : <span className="state">{LABEL[state]}</span>}
    </li>
  );
}
