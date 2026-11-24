import { Link } from 'react-router-dom';
import { MAP_CELLS } from '../../lib/game';
import { useChild } from '../../state/child';
import { useFamilyCtx, useRewards, useTreasure } from '../../state/family';
import { Card, Coins, Empty, Gauge, Nugget } from '../../ui/kit';
import IntroVideoButton from '../../ui/IntroVideo';
import Fellowship, { useFellowship } from './Fellowship';
import MissionBoard from './MissionBoard';
import WaitingBanner from './WaitingBanner';

export default function Home() {
  const { theme, settings } = useFamilyCtx();
  const { child, balance, steps, cell, territory, chest, missionViews } = useChild();
  const rewards = useRewards();
  const treasure = useTreasure();
  const fellows = useFellowship(child?.id);
  if (!child) return null;

  const affordable = (rewards.data ?? []).filter((r) => r.is_active && r.cost <= balance).slice(0, 2);
  const t = treasure.data;

  return (
    <>
      <Card className="welcome">
        <h1>Bienvenue dans ton aventure, {child.display_name} ! <span aria-hidden>{theme.heroEmoji}</span></h1>
        <IntroVideoButton label="🎬 Comment ça marche ?" />
      </Card>

      <Card title="🗺️ Ma carte" action={<Link to="carte" className="link">Voir la carte</Link>}>
        <p>Case <b>{cell}</b> sur {MAP_CELLS} · {theme.territories[territory]}</p>
        <Gauge value={cell} max={MAP_CELLS} label={`Carte : case ${cell} sur ${MAP_CELLS}`} />
        {chest ? (
          <div className="chest-line">
            <p>🧰 Prochain coffre : plus que <b>{chest.missing} pas</b> pour +{chest.value} <Nugget /> pépites</p>
            <Gauge value={steps} max={chest.at} label={`Coffre : ${steps} pas sur ${chest.at}`} />
            <small className="muted">{steps} / {chest.at} pas</small>
          </div>
        ) : <p className="muted">Tous les coffres sont ouverts, bravo !</p>}
      </Card>

      <WaitingBanner />
      <MissionBoard views={missionViews} childId={child.id} />

      {fellows.length > 1 && (
        <Card title="👨‍👩‍👧 Les aventuriers" action={<Link to="carte" className="link">La carte</Link>}>
          <Fellowship currentId={child.id} />
        </Card>
      )}

      <div className="two-col">
        <Card title="🎁 Boutique" action={<Link to="boutique" className="link">Voir la boutique</Link>}>
          {affordable.length === 0 ? <Empty>Ouvre des coffres sur la carte pour gagner des pépites !</Empty>
            : <ul className="list">{affordable.map((r) => <li key={r.id}><span>{r.title}</span><Coins n={r.cost} /></li>)}</ul>}
        </Card>
        {settings.treasure_enabled && t && t.status !== 'archived' && (
          <Card title="🏆 Trésor commun" action={<Link to="tresor" className="link">Contribuer</Link>}>
            <p>{t.title}</p>
            <Gauge value={t.current_points} max={t.target_points} label="Trésor commun" />
            <p className="muted">{t.current_points} / {t.target_points} pépites</p>
          </Card>
        )}
      </div>
      <div className="tiles">
        {settings.dice_enabled && <Link to="de" className="tile" style={{ '--t': '#ff6f9c' } as React.CSSProperties}><span className="ic" aria-hidden>🎲</span>Dé du destin</Link>}
        <Link to="badges" className="tile" style={{ '--t': '#8b5cf6' } as React.CSSProperties}><span className="ic" aria-hidden>🏅</span>Mes badges</Link>
      </div>
    </>
  );
}
