import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';
import type { DiceRoll } from '../../lib/types';
import { useChild } from '../../state/child';
import { useAction, useDiceRolls, useFamilyCtx } from '../../state/family';
import { Card, Empty, formatDate } from '../../ui/kit';

export const FACES: Record<DiceRoll['result_key'], { icon: string; label: (p: DiceRoll['result_payload']) => string }> = {
  double: { icon: '✖️2', label: (p) => `Pépites doublées ! +${p.bonus ?? 1}` },
  plus_one: { icon: '➕1', label: () => '+1 pépite bonus !' },
  joker: { icon: '🃏', label: () => 'Carte joker : ton parent choisit ton petit bonus' },
  surprise: { icon: '🎁', label: () => 'Petite surprise : ton parent va t’en préparer une' },
};

export default function Dice() {
  const { settings } = useFamilyCtx();
  const { child } = useChild();
  const rolls = useDiceRolls();
  const state = useQuery({ queryKey: ['fam', 'dice-state', child?.id, rolls.data?.length], queryFn: () => api.diceState(child!.id), enabled: !!child && settings.dice_enabled });
  const [result, setResult] = useState<{ result_key: DiceRoll['result_key']; result_payload: DiceRoll['result_payload'] } | null>(null);
  const [rolling, setRolling] = useState(false);
  const roll = useAction(api.rollDice);
  if (!child) return null;
  if (!settings.dice_enabled) return <><h1>🎲 Dé du destin</h1><Empty>Le dé est désactivé dans ton foyer.</Empty></>;

  async function go() {
    setRolling(true);
    const [r] = await Promise.all([roll.run(child!.id), new Promise((res) => setTimeout(res, 900))]);
    setRolling(false);
    if (r) setResult(r);
  }

  const s = state.data;
  const mine = (rolls.data ?? []).filter((r) => r.child_id === child.id);
  return (
    <>
      <h1>🎲 Dé du destin</h1>
      <Card>
        <div className={`die ${rolling ? 'rolling' : ''}`} aria-hidden>{result && !rolling ? FACES[result.result_key].icon : '🎲'}</div>
        {result && !rolling && <p className="result" role="status">{FACES[result.result_key].label(result.result_payload)}</p>}
        {s && (
          <p className="muted">
            {s.eligible ? 'Ton dé est prêt !' : s.mode === 'weekly' ? 'Reviens la semaine prochaine pour relancer le dé.' : `Encore ${Math.max(0, s.threshold - s.progress)} mission${s.threshold - s.progress > 1 ? 's' : ''} validée${s.threshold - s.progress > 1 ? 's' : ''} pour lancer le dé.`}
          </p>
        )}
        <button className="btn big" disabled={!s?.eligible || rolling || roll.pending} onClick={go}>Lancer le dé !</button>
      </Card>
      <Card title="Mes lancers">
        {mine.length === 0 ? <Empty>Pas encore de lancer.</Empty>
          : <ul className="list">{mine.slice(0, 10).map((r) => <li key={r.id}><span>{FACES[r.result_key].icon} {FACES[r.result_key].label(r.result_payload)}</span><small>{formatDate(r.rolled_at)}</small></li>)}</ul>}
      </Card>
    </>
  );
}
