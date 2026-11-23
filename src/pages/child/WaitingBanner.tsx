import { dayLabel } from '../../lib/pending';
import { useChild } from '../../state/child';
import { useFamilyCtx } from '../../state/family';

/** Rassure l'enfant : ses missions des jours précédents attendent seulement la validation d'un parent. */
export default function WaitingBanner() {
  const { today } = useFamilyCtx();
  const { waitingOld } = useChild();
  if (waitingOld.length === 0) return null;
  const oldest = waitingOld.reduce((d, o) => (o.due_date < d ? o.due_date : d), waitingOld[0].due_date);
  const n = waitingOld.length;
  return (
    <p className="waiting" role="status">
      ⏳ {n} mission{n > 1 ? 's attendent' : ' attend'} la validation de tes parents ({dayLabel(oldest, today).toLowerCase()}).
    </p>
  );
}
