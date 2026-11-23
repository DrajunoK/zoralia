import { useChildren, useStepTransactions, useTransactions } from '../../state/family';
import { Card, Empty, formatDate } from '../../ui/kit';

export const TYPE_LABELS: Record<string, string> = {
  mission_reward: 'Mission', shop_purchase: 'Boutique', family_treasure_contribution: 'Trésor', dice_bonus: 'Dé du destin',
  parent_adjustment_credit: 'Bonus parent', parent_adjustment_debit: 'Retrait parent', refund: 'Remboursement', chest_reward: 'Coffre de la carte',
  mission_steps: 'Mission', parent_adjustment_steps: 'Pas ajoutés', migration: 'Gains passés',
};

export default function Journal() {
  const tx = useTransactions();
  const steps = useStepTransactions();
  const children = useChildren();
  const rows = [
    ...(tx.data ?? []).map((x) => ({ ...x, unit: '🪙' })),
    ...(steps.data ?? []).map((x) => ({ ...x, unit: '👣' })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 80);
  return (
    <>
      <h1>📜 Journal d’activité</h1>
      <Card>
        {rows.length === 0 ? <Empty>Aucune opération pour l’instant.</Empty> : (
          <ul className="list">
            {rows.map((x) => (
              <li key={`${x.unit}${x.id}`}>
                <span><strong>{children.data?.find((c) => c.id === x.child_id)?.display_name}</strong> · {TYPE_LABELS[x.type] ?? x.type}{x.description ? ` — ${x.description}` : ''}<small>{formatDate(x.created_at)}</small></span>
                <b className={x.amount > 0 ? 'plus' : 'minus'}>{x.amount > 0 ? '+' : ''}{x.amount} {x.unit}</b>
              </li>
            ))}
          </ul>
        )}
        <small className="muted">Le journal est immuable : les dernières opérations sont affichées (👣 pas, 🪙 pépites).</small>
      </Card>
    </>
  );
}
