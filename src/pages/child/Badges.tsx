import { useChild } from '../../state/child';
import { useBadges, useChildBadges, useFamilyCtx } from '../../state/family';

const ICONS: Record<string, string> = { seedling: '🌱', compass: '🧭', shield: '🛡️', medal: '🎖️', trophy: '🏆', star: '⭐' };

export default function Badges() {
  const { settings } = useFamilyCtx();
  const { child, steps } = useChild();
  const badges = useBadges();
  const earned = useChildBadges();
  if (!child) return null;
  const overrides = settings.settings.badge_thresholds ?? {};
  return (
    <>
      <h1>🏅 Mes badges</h1>
      <div className="badge-grid">
        {(badges.data ?? []).map((b) => {
          const at = overrides[b.slug] ?? b.threshold.steps ?? 0;
          const got = (earned.data ?? []).some((e) => e.child_id === child.id && e.badge_id === b.id) || steps >= at;
          return (
            <article key={b.id} className={`card badge ${got ? 'got' : 'locked'}`}>
              <div className="badge-icon" aria-hidden>{got ? ICONS[b.icon_key] ?? '⭐' : '🔒'}</div>
              <strong>{b.name}</strong>
              <small>{got ? b.description : `À ${at} pas`}</small>
            </article>
          );
        })}
      </div>
    </>
  );
}
