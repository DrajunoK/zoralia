import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { MAP_CELLS, mapCell, nextChest } from '../../lib/game';
import { groupPending } from '../../lib/pending';
import { useAction, useChildren, useDiceRolls, useFamilyCtx, useMissions, useOccurrences, useRedemptions, useRewards, useTransactions, useTreasure, useWallets } from '../../state/family';
import { Avatar, Card, Coins, Empty, formatDate, formatTime, Footprint, Gauge, Nugget, Steps } from '../../ui/kit';
import { FACES } from '../child/Dice';
import { TYPE_LABELS } from './Journal';

export default function Dashboard() {
  
  const children = useChildren();
  const wallets = useWallets();
  const missions = useMissions();
  const occurrences = useOccurrences();
  const redemptions = useRedemptions();
  const rewards = useRewards();
  const treasure = useTreasure();
  const tx = useTransactions();
  const rolls = useDiceRolls();

  const approve = useAction(api.approveMission, 'Mission validée ✅');
  const approveMany = useAction(api.approveMany, (n) => `${n} mission${n > 1 ? 's' : ''} validée${n > 1 ? 's' : ''} ✅`);
  const reject = useAction(api.rejectMission, 'Mission refusée');
  const approveR = useAction(api.approveReward, 'Récompense accordée 🎁');
  const rejectR = useAction(api.rejectReward, 'Demande refusée');
  const adjust = useAction(api.adjustPoints, 'Pépites ajustées');
  const adjustSteps = useAction(api.adjustSteps, 'Pas ajoutés');
  const record = useAction(api.recordMission, 'Mission enregistrée ✅');
  const resolve = useAction(api.resolveRoll, 'Noté comme honoré');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({});
  const { today } = useFamilyCtx();
  const [adj, setAdj] = useState<{ child: string; kind: 'steps' | 'points'; amount: string; reason: string } | null>(null);

  const kids = (children.data ?? []).filter((c) => c.is_active);
  const kid = (id: string) => children.data?.find((c) => c.id === id);
  const pendingM = (occurrences.data ?? []).filter((o) => o.status === 'claimed');
  const groups = groupPending(pendingM, today);
  const validateAll = (items: { id: string }[], what: string) => {
    if (window.confirm(`Valider ${what} ?`)) approveMany.run(items.map((i) => i.id));
  };
  const pendingR = (redemptions.data ?? []).filter((r) => r.status === 'requested');
  const toHonor = (rolls.data ?? []).filter((r) => (r.result_key === 'joker' || r.result_key === 'surprise') && !r.result_payload.resolved);
  const t = treasure.data;

  return (
    <>
      <Card title={`À valider (${pendingM.length + pendingR.length})`}>
        {pendingM.length + pendingR.length === 0 && <Empty>Rien en attente. 🎉</Empty>}
        {groups.map((day) => (
          <section key={day.date} className="pend-day">
            <h3 className="day-head">
              <span>{day.label}</span><b>{day.count}</b>
              {day.count > 1 && <button className="btn" disabled={approveMany.pending} onClick={() => validateAll(day.children.flatMap((c) => c.items), `les ${day.count} missions de ${day.label.toLowerCase()}`)}>Tout valider</button>}
            </h3>
            {day.children.map((grp) => {
              const c = kid(grp.childId);
              return (
                <div key={grp.childId} className="pend-child">
                  <div className="pend-who">
                    {c && <Avatar avatar={c.avatar_key} color={c.color_key} size={30} />}<strong>{c?.display_name}</strong><small>{grp.items.length} mission{grp.items.length > 1 ? 's' : ''}</small>
                    {grp.items.length > 1 && day.children.length > 1 && <button className="btn ghost" disabled={approveMany.pending} onClick={() => validateAll(grp.items, `les ${grp.items.length} missions de ${c?.display_name} (${day.label.toLowerCase()})`)}>Tout valider</button>}
                  </div>
                  <ul className="list compact">
                    {grp.items.map((o) => {
                      const m = missions.data?.find((x) => x.id === o.mission_id);
                      return (
                        <li key={o.id} className="validate">
                          <div className="pend-line">
                            <span>{m?.title} <Steps n={m?.points ?? 0} /><small>{formatTime(o.claimed_at)}</small></span>
                            <span className="row">
                              <button className="btn" disabled={approve.pending} onClick={() => approve.run(o.id, notes[o.id])}>Valider</button>
                              <button className="btn ghost" disabled={reject.pending} onClick={() => reject.run(o.id, notes[o.id])}>Refuser</button>
                              <button className="btn ghost icon" aria-label="Ajouter une note" aria-expanded={!!noteOpen[o.id]} onClick={() => setNoteOpen({ ...noteOpen, [o.id]: !noteOpen[o.id] })}>📝</button>
                            </span>
                          </div>
                          {noteOpen[o.id] && <input aria-label="Note facultative" placeholder="Note (facultatif)" value={notes[o.id] ?? ''} onChange={(e) => setNotes({ ...notes, [o.id]: e.target.value })} />}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </section>
        ))}
        {pendingR.length > 0 && (
          <section className="pend-day">
            <h3 className="day-head"><span>🎁 Demandes de la boutique</span><b>{pendingR.length}</b></h3>
            <ul className="list">
              {pendingR.map((r) => {
                const rw = rewards.data?.find((x) => x.id === r.reward_id);
                return (
                  <li key={r.id} className="validate">
                    <div><strong>{kid(r.child_id)?.display_name}</strong> demande « {rw?.title} » <Coins n={r.cost_snapshot} /><small>{formatDate(r.requested_at)}</small></div>
                    <div className="row">
                      <button className="btn" disabled={approveR.pending} onClick={() => approveR.run(r.id)}>Accorder</button>
                      <button className="btn ghost" disabled={rejectR.pending} onClick={() => rejectR.run(r.id)}>Refuser</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </Card>

      {toHonor.length > 0 && (
        <Card title="Dé du destin : à honorer">
          <ul className="list">
            {toHonor.map((r) => (
              <li key={r.id}><span><strong>{kid(r.child_id)?.display_name}</strong> · {FACES[r.result_key].icon} {FACES[r.result_key].label(r.result_payload)}</span>
                <button className="btn ghost" onClick={() => resolve.run(r.id)}>C’est fait</button></li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Les enfants" action={<Link to="enfants" className="link">Gérer</Link>}>
        {kids.length === 0 && <Empty>Ajoute un premier enfant pour commencer.</Empty>}
        <div className="kids">
          {kids.map((c) => {
            const w = wallets.data?.find((x) => x.child_id === c.id);
            const todays = (missions.data ?? []).filter((m) => m.is_active);
            return (
              <article key={c.id} className="kid-card">
                <div className="row"><Avatar avatar={c.avatar_key} color={c.color_key} /><strong>{c.display_name}</strong><span className="counters"><Steps n={w?.steps ?? 0} /><Coins n={w?.balance ?? 0} /></span></div>
                <Gauge value={mapCell(w?.steps ?? 0)} max={MAP_CELLS} label="Carte" />
                <small className="muted">Étape {mapCell(w?.steps ?? 0)} / {MAP_CELLS} · {w?.steps ?? 0} pas{nextChest(w?.steps ?? 0) ? ` · coffre dans ${nextChest(w?.steps ?? 0)!.missing} pas` : ''}</small>
                <div className="row">
                  <select aria-label="Enregistrer une mission" value="" onChange={(e) => e.target.value && record.run(e.target.value, c.id)}>
                    <option value="">+ Mission accomplie…</option>
                    {todays.map((m) => <option key={m.id} value={m.id}>{m.title} (+{m.points})</option>)}
                  </select>
                  <button className="btn ghost" onClick={() => setAdj({ child: c.id, kind: 'steps', amount: '', reason: '' })}>± Pas / pépites</button>
                </div>
              </article>
            );
          })}
        </div>
        {adj && (
          <form className="adjust" onSubmit={async (e) => {
            e.preventDefault();
            const n = Number(adj.amount);
            if (!n) return;
            const who = kid(adj.child)?.display_name;
            const unit = adj.kind === 'steps' ? 'pas' : 'pépites';
            if (!window.confirm(`${n > 0 ? 'Ajouter' : 'Retirer'} ${Math.abs(n)} ${unit} à ${who} ?`)) return;
            if (adj.kind === 'steps') await adjustSteps.run(adj.child, n, adj.reason);
            else await adjust.run(adj.child, n, adj.reason);
            setAdj(null);
          }}>
            <strong>Ajuster pour {kid(adj.child)?.display_name}</strong>
            <div className="seg" role="tablist">
              <button type="button" role="tab" aria-selected={adj.kind === 'steps'} className={adj.kind === 'steps' ? 'on' : ''} onClick={() => setAdj({ ...adj, kind: 'steps' })}><Footprint /> Pas</button>
              <button type="button" role="tab" aria-selected={adj.kind === 'points'} className={adj.kind === 'points' ? 'on' : ''} onClick={() => setAdj({ ...adj, kind: 'points' })}><Nugget /> Pépites</button>
            </div>
            <div className="row">
              <input type="number" aria-label="Montant" min={adj.kind === 'steps' ? 1 : undefined} placeholder={adj.kind === 'steps' ? '+3' : '+3 ou -2'} value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} />
              <input aria-label="Raison" placeholder="Raison" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} />
              <button className="btn" disabled={adjust.pending || adjustSteps.pending}>Valider</button>
              <button type="button" className="btn ghost" onClick={() => setAdj(null)}>Annuler</button>
            </div>
            <small className="muted">Les pas font avancer la carte (jamais retirés) ; les pépites se dépensent.</small>
          </form>
        )}
      </Card>

      {t && t.status !== 'archived' && (
        <Card title={<><Nugget /> Trésor commun</>} action={<Link to="tresor" className="link">Gérer</Link>}>
          <p>{t.title} · {t.current_points} / {t.target_points}</p>
          <Gauge value={t.current_points} max={t.target_points} label="Trésor" />
        </Card>
      )}

      <Card title="Activité récente" action={<Link to="journal" className="link">Tout voir</Link>}>
        {(tx.data ?? []).length === 0 ? <Empty>Aucune activité.</Empty> : (
          <ul className="list">
            {(tx.data ?? []).slice(0, 5).map((x) => (
              <li key={x.id}><span>{kid(x.child_id)?.display_name} · {TYPE_LABELS[x.type] ?? x.type}{x.description ? ` — ${x.description}` : ''}</span>
                <b className={x.amount > 0 ? 'plus' : 'minus'}>{x.amount > 0 ? '+' : ''}{x.amount} <Nugget /></b></li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
