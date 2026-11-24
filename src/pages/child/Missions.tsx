import { useChild } from '../../state/child';
import MissionBoard from './MissionBoard';
import WaitingBanner from './WaitingBanner';

export default function Missions() {
  const { child, missionViews } = useChild();
  if (!child) return null;
  return (
    <>
      <h1>⚔️ Mes missions</h1>
      <WaitingBanner />
      <MissionBoard views={missionViews} childId={child.id} />
    </>
  );
}
