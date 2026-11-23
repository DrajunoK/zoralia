import { useState } from 'react';
import { api } from '../../lib/api';
import { REWARD_ICONS } from '../../lib/themes';
import { useAction, useFamilyCtx, useRewards } from '../../state/family';
import { groupByTier } from '../../lib/shop';
import { Banner, Card, Coins, Empty, Field } from '../../ui/kit';

interface Draft { id?: string; title: string; description: string; cost: number; image_key: string; stock: string; is_active: boolean }
const blank: Draft = { title: '', description: '', cost: 5, image_key: 'gift', stock: '', is_active: true };

export default function ShopAdmin() {
  const { family } = useFamilyCtx();
  const rewards = useRewards();
  const [draft, setDraft] = useState<Draft | null>(null);
  const save = useAction(api.saveReward, 'Récompense enregistrée 🎁');

  async function submit() {
    if (!draft || !draft.title.trim()) return;
    await save.run({
      ...(draft.id ? { id: draft.id } : {}), family_id: family.id, title: draft.title.trim(), description: draft.description.trim(),
      cost: draft.cost, image_key: draft.image_key, stock: draft.stock === '' ? null : Math.max(0, Number(draft.stock)), is_active: draft.is_active,
    });
    setDraft(null);
  }

  return (
    <>
      <h1>🎁 Boutique</h1>
      <Card action={<button className="btn" onClick={() => setDraft({ ...blank })}>+ Récompense</button>}>
        {(rewards.data ?? []).length === 0 && <Empty>Aucune récompense.</Empty>}
        {groupByTier(rewards.data ?? []).map(({ tier, items }) => (
          <div key={tier.key}>
            <Banner icon={tier.icon} label={tier.label} count={items.length} hint={tier.hint} color={tier.color} />
            <ul className="list">
          {items.map((r) => (
            <li key={r.id} className={r.is_active ? '' : 'inactive'}>
              <span><span aria-hidden>{REWARD_ICONS[r.image_key] ?? '🎁'}</span> <strong>{r.title}</strong>{r.stock !== null && <small>Stock : {r.stock}</small>}{!r.is_active && <small>désactivée</small>}</span>
              <span className="row"><Coins n={r.cost} /><button className="btn ghost" onClick={() => setDraft({ id: r.id, title: r.title, description: r.description, cost: r.cost, image_key: r.image_key, stock: r.stock === null ? '' : String(r.stock), is_active: r.is_active })}>Modifier</button></span>
            </li>
          ))}
            </ul>
          </div>
        ))}
      </Card>
      {draft && (
        <Card title={draft.id ? 'Modifier la récompense' : 'Nouvelle récompense'}>
          <Field label="Titre"><input value={draft.title} maxLength={80} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
          <Field label="Description (facultatif)"><input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <div className="row wrap">
            <Field label="Coût en pépites"><input type="number" min={1} max={1000} value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: Math.max(1, Number(e.target.value) || 1) })} /></Field>
            <Field label="Stock" hint="Vide = illimité"><input type="number" min={0} value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} /></Field>
          </div>
          <div className="row wrap" role="radiogroup" aria-label="Icône">
            {Object.entries(REWARD_ICONS).map(([k, e]) => <button key={k} type="button" role="radio" aria-checked={draft.image_key === k} aria-label={k} className={`chip ${draft.image_key === k ? 'on' : ''}`} onClick={() => setDraft({ ...draft, image_key: k })}>{e}</button>)}
          </div>
          <label className="check"><input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Visible dans la boutique</label>
          <div className="row"><button className="btn" disabled={save.pending || !draft.title.trim()} onClick={submit}>Enregistrer</button><button className="btn ghost" onClick={() => setDraft(null)}>Annuler</button></div>
        </Card>
      )}
    </>
  );
}
