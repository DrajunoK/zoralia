import { api } from '../../lib/api';
import { REWARD_ICONS } from '../../lib/themes';
import { useChild } from '../../state/child';
import { useAction, useRedemptions, useRewards } from '../../state/family';
import { groupByTier } from '../../lib/shop';
import { Banner, Card, Coins, Empty } from '../../ui/kit';

export default function Shop() {
  const { child, balance } = useChild();
  const rewards = useRewards();
  const redemptions = useRedemptions();
  const request = useAction(api.requestReward, 'Demande envoyée ! Ton parent va répondre 🎁');
  if (!child) return null;

  const mine = (redemptions.data ?? []).filter((r) => r.child_id === child.id);
  const pending = mine.filter((r) => r.status === 'requested');
  const list = (rewards.data ?? []).filter((r) => r.is_active);

  return (
    <>
      <h1>🎁 Boutique</h1>
      <p className="muted">Tu as <Coins n={balance} />. Ton parent doit accepter ta demande avant que les pépites soient dépensées.</p>
      {list.length === 0 ? <Empty>La boutique est vide pour l’instant.</Empty> : (
        groupByTier(list).map(({ tier, items }) => (
          <div key={tier.key}>
            <Banner icon={tier.icon} label={tier.label} count={items.length} hint={tier.hint} color={tier.color} />
            <div className="shop-grid">
              {items.map((r) => {
                const waiting = pending.some((p) => p.reward_id === r.id);
                const soldOut = r.stock !== null && r.stock <= 0;
                const missing = r.cost - balance;
                return (
                  <article key={r.id} className="card reward">
                    <div className="reward-icon" aria-hidden>{REWARD_ICONS[r.image_key] ?? '🎁'}</div>
                    <strong>{r.title}</strong>
                    {r.description && <small>{r.description}</small>}
                    <Coins n={r.cost} />
                    {waiting ? <span className="state">⏳ Demande en cours</span>
                      : soldOut ? <span className="state">Épuisé</span>
                      : <button className="btn" disabled={missing > 0 || request.pending} onClick={() => request.run(child.id, r.id)}>
                          {missing > 0 ? `Encore ${missing}` : 'Je le veux !'}
                        </button>}
                  </article>
                );
              })}
            </div>
          </div>
        ))
      )}
      {mine.length > 0 && (
        <Card title="Mes demandes">
          <ul className="list">
            {mine.slice(0, 8).map((r) => (
              <li key={r.id}>
                <span>{list.find((x) => x.id === r.reward_id)?.title ?? (rewards.data ?? []).find((x) => x.id === r.reward_id)?.title ?? 'Récompense'}</span>
                <span className="state">{r.status === 'requested' ? '⏳ En attente' : r.status === 'approved' ? '✅ Accordée' : '↩️ Refusée'}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
