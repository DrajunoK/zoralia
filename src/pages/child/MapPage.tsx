import { MAP_CELLS } from '../../lib/game';
import { useChild } from '../../state/child';
import { useFamilyCtx } from '../../state/family';
import { Footprint, Gauge } from '../../ui/kit';
import WorldMap from '../../ui/WorldMap';
import Fellowship, { useFellowship } from './Fellowship';

export default function MapPage() {
  const { theme } = useFamilyCtx();
  const { child, steps, cell, nextAt, chest } = useChild();
  const members = useFellowship(child?.id);
  if (!child) return null;

  return (
    <>
      <h1>🗺️ La carte</h1>
      <section className="card">
        <p><b>Étape {cell}</b> sur {MAP_CELLS} · <b>{steps}</b> <Footprint /> pas au total</p>
        <Gauge value={cell} max={MAP_CELLS} label="Progression" />
        <p className="muted">{nextAt ? `Encore ${nextAt - steps} pas pour l’étape suivante.` : 'Bravo, tu as terminé la carte ! 🏆'} Les pas ne se dépensent jamais : ta carte ne recule pas.</p>
        {chest && <p>🧰 Prochain coffre dans <b>{chest.missing} pas</b> : +{chest.value} {theme.coin} pépites</p>}
      </section>
      {members.length > 1 && (
        <section className="card">
          <h2>👨‍👩‍👧 Les aventuriers</h2>
          <Fellowship currentId={child.id} />
        </section>
      )}
      <WorldMap worldKey={theme.slug} territories={theme.territories} members={members} />
    </>
  );
}
