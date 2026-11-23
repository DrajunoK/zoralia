import { MAP_STEPS, POINTS_PER_STEP, TERRITORY_STARTS, territoryOfCell } from '../../lib/game';
import { useChild } from '../../state/child';
import { useFamilyCtx } from '../../state/family';
import { Gauge } from '../../ui/kit';

export default function MapPage() {
  const { theme } = useFamilyCtx();
  const { child, lifetime, step, nextAt, territory } = useChild();
  if (!child) return null;

  const cells = Array.from({ length: MAP_STEPS }, (_, i) => i + 1);
  const groups = theme.territories.map((name, t) => ({ name, t, cells: cells.filter((c) => territoryOfCell(c) === t) }));

  return (
    <>
      <h1>🗺️ Ma carte</h1>
      <section className="card">
        <p><b>Étape {step}</b> sur {MAP_STEPS} · {lifetime} pépites gagnées au total</p>
        <Gauge value={step} max={MAP_STEPS} label="Progression" />
        <p className="muted">{nextAt ? `Prochaine étape à ${nextAt} pépites gagnées.` : 'Bravo, tu as terminé la carte ! 🏆'} Les pépites dépensées ne font jamais reculer ta carte.</p>
      </section>
      {groups.map((g) => (
        <section key={g.name} className={`card territory ${g.t === territory ? 'current' : ''}`}>
          <h2>{g.t + 1}. {g.name} <small>({TERRITORY_STARTS[g.t]}{g.t === 4 ? '+' : `–${TERRITORY_STARTS[g.t + 1] - 1}`} pépites)</small></h2>
          <div className="map-grid" role="list">
            {g.cells.map((c) => (
              <div key={c} role="listitem" className={`step ${c <= step ? 'done' : ''} ${c === step ? 'here' : ''}`} title={`Étape ${c} · ${c * POINTS_PER_STEP} pépites`}>
                {c === step ? theme.heroEmoji : c}
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
