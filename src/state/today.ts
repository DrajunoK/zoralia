import { useEffect, useState } from 'react';
import { localDate } from '../lib/game';

/** Date locale du foyer, remise à jour toute seule (minuit, retour sur l'onglet) sans recharger la page. */
export function useToday(timezone: string | undefined): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const bump = () => setNow(new Date());
    const id = setInterval(bump, 60_000);
    document.addEventListener('visibilitychange', bump);
    window.addEventListener('focus', bump);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', bump); window.removeEventListener('focus', bump); };
  }, []);
  return timezone ? localDate(timezone, now) : '';
}
