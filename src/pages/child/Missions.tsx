import { useState } from 'react';
import type { Category } from '../../lib/types';
import { useChild } from '../../state/child';
import { Empty } from '../../ui/kit';
import MissionCard from './MissionCard';
import WaitingBanner from './WaitingBanner';

const TABS: [Category, string][] = [['daily', 'Quotidiennes'], ['heroic', 'Héroïques'], ['surprise', 'Surprises']];

export default function Missions() {
  const { child, missionViews } = useChild();
  const [tab, setTab] = useState<Category>('daily');
  if (!child) return null;
  const list = missionViews.filter((v) => v.mission.category === tab && v.state !== 'unavailable');
  return (
    <>
      <h1>⚔️ Mes missions</h1>
      <WaitingBanner />
      <div className="segmented" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {list.length === 0
        ? <Empty>{tab === 'surprise' ? 'Les pépites surprises arrivent quand tu fais un beau geste spontané ✨' : 'Aucune mission ici pour aujourd’hui.'}</Empty>
        : <ul className="list">{list.map((v) => <MissionCard key={v.mission.id} view={v} childId={child.id} />)}</ul>}
    </>
  );
}
