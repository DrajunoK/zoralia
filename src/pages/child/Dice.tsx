import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';
import { FACES, effectOf, unlockText, type RollPayload } from '../../lib/dice';
import type { DiceRoll } from '../../lib/types';
import { useChild } from '../../state/child';
import { useAction, useDiceRolls, useFamilyCtx } from '../../state/family';
import DiceFace from '../../ui/DiceFace';
import { Card, Empty, formatDate, Gauge } from '../../ui/kit';

type Result = { result_key: DiceRoll['result_key']; result_payload: DiceRoll['result_payload'] };

export default function Dice() {
  const { settings } = useFamilyCtx();
  const { child } = useChild();
  const rolls = useDiceRolls();
  const state = useQuery({ queryKey: ['fam', 'dice-state', child?.id, rolls.data?.length], queryFn: () => api.diceState(child!.id), enabled: !!child && settings.dice_enabled });
  const [result, setResult] = useState<Result | null>(null);
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
  const shown = result && !rolling ? effectOf(result.result_key, result.result_payload as RollPayload) : null;
  return (
    <>
      <h1>🎲 Dé du destin</h1>
      <Card>
        <div className={`die ${rolling ? 'rolling' : ''}`}>{shown ? <DiceFace unit={shown.unit} amount={shown.amount} big /> : <span aria-hidden>🎲</span>}</div>
        {shown && <p className="result" role="status">{shown.message}</p>}
        {s && (
          <>
            {!s.rolled && <Gauge value={Math.min(s.progress, s.threshold)} max={s.threshold} label="Missions validées aujourd’hui" />}
            <p className="muted">{shown && s.rolled ? 'À demain pour un nouveau lancer !' : unlockText(s)}</p>
          </>
        )}
        <button className="btn big" disabled={!s?.eligible || rolling || roll.pending} onClick={go}>Lancer le dé !</button>
      </Card>
      <Card title="Les 6 faces du dé">
        <div className="faces6">
          {FACES.map((f) => <div key={f.key}><DiceFace unit={f.unit} amount={f.amount} /><small>{f.key === 'lose' ? 'Pas de chance' : f.key === 'chest2' ? 'Coffre famille' : f.short.replace('+', '')}</small></div>)}
        </div>
        <small className="muted">Chaque face a exactement la même chance de sortir. Un seul lancer par jour, dès que tes missions du jour sont validées.</small>
      </Card>
      <Card title="Mes lancers">
        {mine.length === 0 ? <Empty>Pas encore de lancer.</Empty>
          : <ul className="list">{mine.slice(0, 10).map((r) => { const e = effectOf(r.result_key, r.result_payload as RollPayload); return <li key={r.id}><span className="row"><DiceFace unit={e.unit} amount={e.amount} /> {e.label}</span><small>{formatDate(r.rolled_at)}</small></li>; })}</ul>}
      </Card>
    </>
  );
}
