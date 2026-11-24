import { MAP_CELLS } from '../../lib/game';
import { useChild } from '../../state/child';
import { useFamilyCtx } from '../../state/family';
import { Footprint, Gauge, Nugget } from '../../ui/kit';
import { focusChild } from '../../lib/mapfocus';
import WorldMap from '../../ui/WorldMap';
import Fellowship, { useFellowship } from './Fellowship';

export default function MapPage() {
  const { theme } = useFamilyCtx();
  const { child, steps, cell, chest } = useChild();
  const members = useFellowship(child?.id);
  if (!child) return null;

  return (
    <>
      <h1>🗺️ La carte</h1>
      <section className="card">
        <p>Tu es à la <b>case {cell}</b> sur {MAP_CELLS} · <b>{steps}</b> <Footprint /> pas</p>
        <Gauge value={cell} max={MAP_CELLS} label="Progression sur la carte" />
        <p className="muted">{cell >= MAP_CELLS ? 'Bravo, tu as terminé la carte ! 🏆' : 'Chaque pas fait avancer d’une case.'} Les pas ne se dépensent jamais : ta carte ne recule pas.</p>
        {chest && <p>🧰 Prochain coffre dans <b>{chest.missing} pas</b> : +{chest.value} <Nugget /> pépites</p>}
      </section>
      {members.length > 1 && (
        <section className="card">
          <h2>👨‍👩‍👧 Les aventuriers</h2>
          <Fellowship currentId={child.id} onPick={focusChild} />
          <small className="muted">Touche un enfant pour le retrouver sur la carte.</small>
        </section>
      )}
      <WorldMap worldKey={theme.slug} territories={theme.territories} members={members} />
    </>
  );
}
