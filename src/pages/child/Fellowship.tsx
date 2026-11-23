import { MAP_CELLS, mapCell } from '../../lib/game';
import { useChildren, useFamilyCtx, useWallets } from '../../state/family';
import { Avatar, Footprint, Gauge } from '../../ui/kit';

/** Les enfants du foyer qui partagent la carte (l'enfant courant d'abord, les autres si le parent l'autorise). */
export function useFellowship(currentId: string | undefined) {
  const { settings } = useFamilyCtx();
  const children = useChildren();
  const wallets = useWallets();
  const showOthers = settings.settings.show_siblings !== false;
  const members = (children.data ?? [])
    .filter((c) => c.is_active && (c.id === currentId || showOthers))
    .map((c) => {
      const steps = wallets.data?.find((w) => w.child_id === c.id)?.steps ?? 0;
      return { child: c, steps, cell: mapCell(steps), me: c.id === currentId };
    })
    .sort((a, b) => Number(b.me) - Number(a.me) || b.steps - a.steps);
  return members;
}

/** Liste « les aventuriers » : avatar, étape et jauge de chacun, pour voir qui avance où. */
export default function Fellowship({ currentId }: { currentId: string }) {
  const members = useFellowship(currentId);
  if (members.length < 2) return null;
  return (
    <ul className="list fellowship">
      {members.map(({ child, steps, cell, me }) => (
        <li key={child.id} className={me ? 'me' : ''}>
          <Avatar avatar={child.avatar_key} color={child.color_key} size={40} />
          <div className="fw-main">
            <strong>{child.display_name}{me ? ' (toi)' : ''}</strong>
            <Gauge value={cell} max={MAP_CELLS} label={`Étape de ${child.display_name}`} />
          </div>
          <span className="fw-num">étape <b>{cell}</b><small><Footprint /> {steps}</small></span>
        </li>
      ))}
    </ul>
  );
}
