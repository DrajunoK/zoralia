import { buildActivity } from '../../lib/activity';
import { useChildren, useDiceRolls, useStepTransactions, useTransactions } from '../../state/family';
import { Card, Empty, Footprint, formatDate, Nugget } from '../../ui/kit';

export function Amount({ unit, amount }: { unit: 'steps' | 'pepites' | 'chest' | 'none'; amount: number }) {
  if (unit === 'none') return <b className="muted">0</b>;
  return <b className={amount > 0 ? 'plus' : 'minus'}>{amount > 0 ? '+' : ''}{amount} {unit === 'steps' ? <Footprint /> : unit === 'pepites' ? <Nugget /> : <span aria-label="coffre de la famille">🧰</span>}</b>;
}

export default function Journal() {
  const children = useChildren();
  const rows = buildActivity({ points: useTransactions().data ?? [], steps: useStepTransactions().data ?? [], rolls: useDiceRolls().data ?? [] }).slice(0, 80);
  return (
    <>
      <h1>📜 Journal d’activité</h1>
      <Card>
        {rows.length === 0 ? <Empty>Aucune opération pour l’instant.</Empty> : (
          <ul className="list">
            {rows.map((x) => (
              <li key={x.key} className={x.dice ? 'dice-row' : ''}>
                <span><strong>{children.data?.find((c) => c.id === x.child_id)?.display_name}</strong> · {x.dice && <span aria-hidden>🎲 </span>}{x.label}{x.detail ? ` — ${x.detail}` : ''}<small>{formatDate(x.created_at)}</small></span>
                <Amount unit={x.unit} amount={x.amount} />
              </li>
            ))}
          </ul>
        )}
        <small className="muted">Le journal est immuable : les dernières opérations sont affichées (pas, pépites et lancers du dé 🎲).</small>
      </Card>
    </>
  );
}
