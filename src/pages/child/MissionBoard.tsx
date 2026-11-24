import { api } from '../../lib/api';
import { orderViews } from '../../lib/missions';
import type { MissionView } from '../../state/child';
import { useAction } from '../../state/family';
import { Card, Empty, Footprint, Gauge } from '../../ui/kit';

function Reward({ n }: { n: number }) {
  return <span className="reward-chip"><Footprint />+{n}</span>;
}

/** Une routine : grande icône, titre, pas à gagner et le bouton (ou l'état) à droite. */
function RoutineRow({ view, childId }: { view: MissionView; childId: string }) {
  const claim = useAction(api.claimMission, 'Mission envoyée ! Ton parent va la valider ✨');
  const { mission: m, state } = view;
  return (
    <li className={`mission ${state}`}>
      <span className="m-ic" aria-hidden="true">{m.icon}</span>
      <div className="mission-main"><b>{m.title}</b>{m.description && <small>{m.description}</small>}<Reward n={m.points} /></div>
      {state === 'available' ? <button className="btn" disabled={claim.pending} onClick={() => claim.run(m.id, childId)}>J’ai terminé !</button>
        : state === 'claimed' ? <span className="state">⏳ À valider</span>
        : state === 'rejected' ? <span className="state bad">↩️ À refaire demain</span>
        : <span className="state ok">✅ Validée !</span>}
    </li>
  );
}

/** Un défi héroïque : grosse tuile avec les pas bien visibles. */
function HeroTile({ view, childId }: { view: MissionView; childId: string }) {
  const claim = useAction(api.claimMission, 'Défi envoyé ! Ton parent va le valider 🦸');
  const { mission: m, state } = view;
  return (
    <article className={`hero-tile ${state}`}>
      <span className="hero-pts"><Footprint />+{m.points}</span>
      <span className="hero-ic" aria-hidden="true">{m.icon}</span>
      <b>{m.title}</b>
      {state === 'available' ? <button className="btn" disabled={claim.pending} onClick={() => claim.run(m.id, childId)}>Relever le défi</button>
        : state === 'claimed' ? <span className="state">⏳ À valider</span>
        : state === 'rejected' ? <span className="state bad">↩️ À refaire demain</span>
        : <span className="state ok">🏆 Bravo !</span>}
    </article>
  );
}

/** Toutes les missions du jour d'un enfant : routines (liste complète), bloc des défis héroïques, surprises. */
export default function MissionBoard({ views, childId }: { views: MissionView[]; childId: string }) {
  const routines = orderViews(views.filter((v) => v.mission.category === 'daily'));
  const heroes = orderViews(views.filter((v) => v.mission.category === 'heroic'));
  const surprises = orderViews(views.filter((v) => v.mission.category === 'surprise'));
  const done = (list: MissionView[]) => list.filter((v) => v.state === 'approved').length;

  return (
    <>
      <Card title="☀️ Mes routines du jour" action={routines.length > 0 && <span className="link">{done(routines)} / {routines.length}</span>}>
        {routines.length === 0 ? <Empty>Pas de routine aujourd’hui.</Empty> : (
          <>
            <Gauge value={done(routines)} max={routines.length} label="Routines faites" />
            {done(routines) === routines.length && <p className="cheer">Toutes tes routines sont validées, bravo ! 🎉</p>}
            <ul className="list missions">{routines.map((v) => <RoutineRow key={v.mission.id} view={v} childId={childId} />)}</ul>
          </>
        )}
      </Card>

      {heroes.length > 0 && (
        <section className="heroes" aria-label="Défis héroïques">
          <header>
            <h2>🦸 Défis héroïques</h2>
            <p>Relève un défi pour gagner plus de pas !</p>
            <span className="hero-count">{done(heroes)} / {heroes.length} relevés</span>
          </header>
          <div className="hero-grid">{heroes.map((v) => <HeroTile key={v.mission.id} view={v} childId={childId} />)}</div>
        </section>
      )}

      {surprises.length > 0 && (
        <Card title="🌟 Surprises"><ul className="list missions">{surprises.map((v) => <RoutineRow key={v.mission.id} view={v} childId={childId} />)}</ul></Card>
      )}
    </>
  );
}
