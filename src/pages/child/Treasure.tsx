import { useState } from 'react';
import { api } from '../../lib/api';
import { useChild } from '../../state/child';
import { useAction, useChildren, useFamilyCtx, useTreasure } from '../../state/family';
import { Card, Coins, Empty, Gauge } from '../../ui/kit';
import { useQuery } from '@tanstack/react-query';

export default function Treasure() {
  const { settings } = useFamilyCtx();
  const { child, balance } = useChild();
  const treasure = useTreasure();
  const children = useChildren();
  const t = treasure.data;
  const contribs = useQuery({ queryKey: ['fam', 'contribs', t?.id, t?.current_points], queryFn: () => api.contributions(t!.id), enabled: !!t });
  const contribute = useAction(api.contribute, 'Merci ! Le coffre se remplit 🏆');
  const [amount, setAmount] = useState(1);
  if (!child) return null;
  if (!settings.treasure_enabled || !t || t.status === 'archived') return <><h1>🏆 Trésor commun</h1><Empty>Pas de trésor en cours.</Empty></>;

  const remaining = t.target_points - t.current_points;
  const max = Math.max(0, Math.min(balance, remaining));
  const totals = (children.data ?? []).map((c) => ({ c, total: (contribs.data ?? []).filter((x) => x.child_id === c.id).reduce((s, x) => s + x.amount, 0) })).filter((x) => x.total > 0);

  return (
    <>
      <h1>🏆 Trésor commun</h1>
      <Card title={t.title}>
        <Gauge value={t.current_points} max={t.target_points} label="Trésor" />
        <p><b>{t.current_points}</b> / {t.target_points} pépites</p>
        <p className="muted">Quand le coffre est plein : {t.reward_description || 'une grosse récompense pour toute la famille !'}</p>
        {t.status === 'reached' && <p className="state">🎉 Coffre plein ! Ton parent va organiser la récompense.</p>}
        {t.status === 'claimed' && <p className="state">✅ Récompense obtenue !</p>}
        {t.status === 'active' && (
          <div className="contribute">
            <p>Tes pépites : <Coins n={balance} /></p>
            <div className="row">
              {[1, 5].filter((n) => n <= max).map((n) => <button key={n} className="btn ghost" onClick={() => setAmount(n)}>+{n}</button>)}
              <input type="number" min={1} max={max} value={Math.min(amount, Math.max(max, 1))} aria-label="Pépites à donner" onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))} />
              <button className="btn" disabled={max < 1 || amount > max || contribute.pending} onClick={() => contribute.run(t.id, child.id, amount)}>Donner</button>
            </div>
            {max < 1 && <small className="muted">Ouvre des coffres sur la carte pour gagner des pépites.</small>}
          </div>
        )}
      </Card>
      <Card title="Qui a donné ?">
        {totals.length === 0 ? <Empty>Personne encore : sois le premier !</Empty>
          : <ul className="list">{totals.map(({ c, total }) => <li key={c.id}><span>{c.display_name}</span><Coins n={total} /></li>)}</ul>}
      </Card>
    </>
  );
}
