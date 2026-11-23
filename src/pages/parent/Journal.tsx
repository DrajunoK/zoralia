import { useChildren, useTransactions } from '../../state/family';
import { Card, Empty, formatDate } from '../../ui/kit';

export const TYPE_LABELS: Record<string, string> = {
  mission_reward: 'Mission', shop_purchase: 'Boutique', family_treasure_contribution: 'Trésor', dice_bonus: 'Dé du destin',
  parent_adjustment_credit: 'Bonus parent', parent_adjustment_debit: 'Retrait parent', refund: 'Remboursement',
};

export default function Journal() {
  const tx = useTransactions();
  const children = useChildren();
  return (
    <>
      <h1>📜 Journal d’activité</h1>
      <Card>
        {(tx.data ?? []).length === 0 ? <Empty>Aucune opération pour l’instant.</Empty> : (
          <ul className="list">
            {(tx.data ?? []).map((x) => (
              <li key={x.id}>
                <span><strong>{children.data?.find((c) => c.id === x.child_id)?.display_name}</strong> · {TYPE_LABELS[x.type] ?? x.type}{x.description ? ` — ${x.description}` : ''}<small>{formatDate(x.created_at)}</small></span>
                <b className={x.amount > 0 ? 'plus' : 'minus'}>{x.amount > 0 ? '+' : ''}{x.amount}</b>
              </li>
            ))}
          </ul>
        )}
        <small className="muted">Le journal est immuable : les 60 dernières opérations sont affichées.</small>
      </Card>
    </>
  );
}
