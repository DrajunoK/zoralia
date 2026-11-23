import { CELLS_PER_TERRITORY, CHEST_COUNT, MAP_CELLS, STEPS_PER_CELL, STEPS_PER_TERRITORY, chestCell, chestValue } from '../../lib/game';
import { useChild } from '../../state/child';
import { useFamilyCtx } from '../../state/family';
import { Avatar, Footprint, Gauge } from '../../ui/kit';
import Fellowship, { useFellowship } from './Fellowship';

const chestAt = new Map(Array.from({ length: CHEST_COUNT }, (_, i) => [chestCell(i + 1), i + 1]));

export default function MapPage() {
  const { theme } = useFamilyCtx();
  const { child, steps, cell, nextAt, territory, chest } = useChild();
  const members = useFellowship(child?.id);
  if (!child) return null;

  const groups = theme.territories.map((name, t) => ({
    name, t, cells: Array.from({ length: CELLS_PER_TERRITORY }, (_, i) => t * CELLS_PER_TERRITORY + i + 1),
  }));
  const at = (c: number) => members.filter((m) => m.cell === c);
  const atStart = members.filter((m) => m.cell === 0);

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
      {atStart.length > 0 && (
        <p className="startline">🚩 Départ : {atStart.map((m) => <Avatar key={m.child.id} avatar={m.child.avatar_key} color={m.child.color_key} size={30} />)}</p>
      )}
      {groups.map((g) => (
        <section key={g.name} className={`card territory ${g.t === territory ? 'current' : ''}`}>
          <h2>{g.t + 1}. {g.name} <small>({g.t * STEPS_PER_TERRITORY}{g.t === 4 ? '–' + MAP_CELLS * STEPS_PER_CELL : '–' + ((g.t + 1) * STEPS_PER_TERRITORY - 1)} pas)</small></h2>
          <div className="map-grid" role="list">
            {g.cells.map((c) => {
              const no = chestAt.get(c);
              const here = at(c);
              const mine = here.find((m) => m.me);
              const others = here.filter((m) => !m.me);
              const cls = `step ${c <= cell ? 'done' : ''} ${mine ? 'here' : ''} ${no ? 'chest' : ''}`;
              const who = here.map((m) => m.child.display_name).join(', ');
              return (
                <div key={c} role="listitem" className={cls}
                  title={`Étape ${c} · ${c * STEPS_PER_CELL} pas${no ? ` · coffre : ${chestValue(no)} pépites` : ''}${who ? ` · ${who}` : ''}`}>
                  {mine ? <Avatar avatar={mine.child.avatar_key} color={mine.child.color_key} size={34} /> : no ? '🧰' : c}
                  {no && <small>+{chestValue(no)}</small>}
                  {others.length > 0 && (
                    <span className="others">{others.map((m) => <Avatar key={m.child.id} avatar={m.child.avatar_key} color={m.child.color_key} size={24} />)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
