import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { THEMES } from '../../lib/themes';
import { useChild } from '../../state/child';
import { useAction, useFamilyCtx } from '../../state/family';
import { Card } from '../../ui/kit';

/** L'enfant choisit son univers : seuls les couleurs, le décor et les noms des territoires changent. */
export default function Universe() {
  const { theme } = useFamilyCtx();
  const { child } = useChild();
  const themes = useQuery({ queryKey: ['themes'], queryFn: api.themes, staleTime: Infinity });
  const save = useAction(api.updateChild, 'Ton univers a changé ✨');
  if (!child) return null;

  return (
    <>
      <h1>🎨 Mon univers</h1>
      <Card>
        <p className="muted">Choisis ton monde préféré. Tes pas, tes pépites et tes badges ne changent pas.</p>
        <div className="universes">
          {THEMES.map((u) => {
            const row = themes.data?.find((t) => t.slug === u.slug);
            const on = theme.slug === u.slug;
            return (
              <button key={u.slug} type="button" className={`universe ${on ? 'on' : ''}`} style={{ background: u.vars['--hero'] }} aria-pressed={on} disabled={save.pending || !row}
                onClick={() => row && !on && save.run(child.id, { theme_id: row.id })}>
                <span className="big-emoji" aria-hidden>{u.heroEmoji}</span><strong>{u.name}</strong><br /><small>{on ? 'Mon univers actuel' : u.tagline}</small>
              </button>
            );
          })}
        </div>
      </Card>
    </>
  );
}
