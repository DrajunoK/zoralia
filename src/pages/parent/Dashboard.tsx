import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { mapStep } from '../../lib/game';
import { useAction, useChildren, useDiceRolls, useFamilyCtx, useMissions, useOccurrences, useRedemptions, useRewards, useTransactions, useTreasure, useWallets } from '../../state/family';
import { Avatar, Card, Coins, Empty, formatDate, Gauge } from '../../ui/kit';
import { FACES } from '../child/Dice';
import { TYPE_LABELS } from './Journal';

export default function Dashboard() {
  const { theme } = useFamilyCtx();
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
  const reject = useAction(api.rejectMission, 'Mission refusée');
  const approveR = useAction(api.approveReward, 'Récompense accordée 🎁');
  const rejectR = useAction(api.rejectReward, 'Demande refusée');
  const adjust = useAction(api.adjustPoints, 'Pépites ajustées');
  const record = useAction(api.recordMission, 'Mission enregistrée ✅');
  const resolve = useAction(api.resolveRoll, 'Noté comme honoré');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [adj, setAdj] = useState<{ child: string; amount: string; reason: string } | null>(null);

  const kids = (children.data ?? []).filter((c) => c.is_active);
  const kid = (id: string) => children.data?.find((c) => c.id === id);
  const pendingM = (occurrences.data ?? []).filter((o) => o.status === 'claimed');
  const pendingR = (redemptions.data ?? []).filter((r) => r.status === 'requested');
  const toHonor = (rolls.data ?? []).filter((r) => (r.result_key === 'joker' || r.result_key === 'surprise') && !r.result_payload.resolved);
  const t = treasure.data;

  return (
    <>
      <Card title={`À valider (${pendingM.length + pendingR.length})`}>
        {pendingM.length + pendingR.length === 0 && <Empty>Rien en attente. 🎉</Empty>}
        <ul className="list">
          {pendingM.map((o) => {
            const m = missions.data?.find((x) => x.id === o.mission_id);
            const c = kid(o.child_id);
            return (
              <li key={o.id} className="validate">
                <div><strong>{c?.display_name}</strong> a fait « {m?.title} » <Coins n={m?.points ?? 0} /><small>{formatDate(o.claimed_at)}</small></div>
                <input aria-label="Note facultative" placeholder="Note (facultatif)" value={notes[o.id] ?? ''} onChange={(e) => setNotes({ ...notes, [o.id]: e.target.value })} />
                <div className="row">
                  <button className="btn" disabled={approve.pending} onClick={() => approve.run(o.id, notes[o.id])}>Valider</button>
                  <button className="btn ghost" disabled={reject.pending} onClick={() => reject.run(o.id, notes[o.id])}>Refuser</button>
                </div>
              </li>
            );
          })}
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
                <div className="row"><Avatar avatar={c.avatar_key} color={c.color_key} /><strong>{c.display_name}</strong><Coins n={w?.balance ?? 0} /></div>
                <Gauge value={mapStep(w?.lifetime_earned_points ?? 0)} max={50} label="Carte" />
                <small className="muted">Étape {mapStep(w?.lifetime_earned_points ?? 0)} / 50 · {w?.lifetime_earned_points ?? 0} gagnées</small>
                <div className="row">
                  <select aria-label="Enregistrer une mission" value="" onChange={(e) => e.target.value && record.run(e.target.value, c.id)}>
                    <option value="">+ Mission accomplie…</option>
                    {todays.map((m) => <option key={m.id} value={m.id}>{m.title} (+{m.points})</option>)}
                  </select>
                  <button className="btn ghost" onClick={() => setAdj({ child: c.id, amount: '', reason: '' })}>± Pépites</button>
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
            if (!window.confirm(`${n > 0 ? 'Ajouter' : 'Retirer'} ${Math.abs(n)} pépites à ${kid(adj.child)?.display_name} ?`)) return;
            await adjust.run(adj.child, n, adj.reason);
            setAdj(null);
          }}>
            <strong>Ajuster les pépites de {kid(adj.child)?.display_name}</strong>
            <div className="row">
              <input type="number" aria-label="Montant (négatif pour retirer)" placeholder="+3 ou -2" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} />
              <input aria-label="Raison" placeholder="Raison" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} />
              <button className="btn" disabled={adjust.pending}>Valider</button>
              <button type="button" className="btn ghost" onClick={() => setAdj(null)}>Annuler</button>
            </div>
          </form>
        )}
      </Card>

      {t && t.status !== 'archived' && (
        <Card title={`${theme.coin} Trésor commun`} action={<Link to="tresor" className="link">Gérer</Link>}>
          <p>{t.title} · {t.current_points} / {t.target_points}</p>
          <Gauge value={t.current_points} max={t.target_points} label="Trésor" />
        </Card>
      )}

      <Card title="Activité récente" action={<Link to="journal" className="link">Tout voir</Link>}>
        {(tx.data ?? []).length === 0 ? <Empty>Aucune activité.</Empty> : (
          <ul className="list">
            {(tx.data ?? []).slice(0, 5).map((x) => (
              <li key={x.id}><span>{kid(x.child_id)?.display_name} · {TYPE_LABELS[x.type] ?? x.type}{x.description ? ` — ${x.description}` : ''}</span>
                <b className={x.amount > 0 ? 'plus' : 'minus'}>{x.amount > 0 ? '+' : ''}{x.amount}</b></li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
