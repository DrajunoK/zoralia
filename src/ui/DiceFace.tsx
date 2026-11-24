import type { Unit } from '../lib/dice';
import { Footprint, Nugget } from './kit';

/** Pictogramme d'une face du dé : l'empreinte, la pépite, le coffre ou le trèfle, avec le nombre. */
export default function DiceFace({ unit, amount, big }: { unit: Unit; amount: number; big?: boolean }) {
  return (
    <span className={`dface ${big ? 'big' : ''}`} aria-hidden>
      {unit === 'none' ? <span className="dface-ico">🍀</span> : (
        <>
          <span className="dface-ico">{unit === 'steps' ? <Footprint /> : unit === 'pepites' ? <Nugget /> : '🧰'}</span>
          <b>+{amount}</b>
        </>
      )}
    </span>
  );
}
