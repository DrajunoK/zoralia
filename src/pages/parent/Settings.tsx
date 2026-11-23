import { useState } from 'react';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { THEMES } from '../../lib/themes';
import { useQuery } from '@tanstack/react-query';
import { useAction, useBadges, useFamilyCtx } from '../../state/family';
import { useSession } from '../../state/session';
import { useToast } from '../../state/toast';
import { Card, Field } from '../../ui/kit';

export default function Settings() {
  const { family, settings, theme } = useFamilyCtx();
  const { signOut } = useSession();
  const toast = useToast();
  const themes = useQuery({ queryKey: ['themes'], queryFn: api.themes, staleTime: Infinity });
  const badges = useBadges();
  const saveSettings = useAction(api.updateSettings, 'Réglages enregistrés');
  const saveFamily = useAction(api.updateFamily, 'Univers changé ✨');
  const [confirmName, setConfirmName] = useState('');
  const [confirmReset, setConfirmReset] = useState('');
  const reset = useAction(api.resetActivity, 'Activité remise à zéro ✨');
  const overrides = settings.settings.badge_thresholds ?? {};

  async function download() {
    try {
      const data = await api.exportFamily(family.id);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      Object.assign(document.createElement('a'), { href: url, download: `zoralia-${family.name}.json` }).click();
      URL.revokeObjectURL(url);
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  async function remove() {
    try { await api.deleteFamily(family.id); window.location.href = '/'; } catch (e) { toast(errorMessage(e), 'error'); }
  }

  const set = (patch: Parameters<typeof api.updateSettings>[1]) => saveSettings.run(family.id, patch);

  return (
    <>
      <h1>⚙️ Réglages</h1>
      <Card title="Univers">
        <p className="muted">Changer d’univers ne touche ni aux pépites ni à la progression.</p>
        <div className="universes">
          {THEMES.map((u) => {
            const row = themes.data?.find((t) => t.slug === u.slug);
            return (
              <button key={u.slug} className={`universe ${theme.slug === u.slug ? 'on' : ''}`} style={{ background: u.vars['--hero'] }} aria-pressed={theme.slug === u.slug}
                onClick={() => row && saveFamily.run(family.id, { active_theme_id: row.id })}>
                <span className="big-emoji" aria-hidden>{u.heroEmoji}</span><strong>{u.name}</strong>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Règles du foyer">
        <label className="check"><input type="checkbox" checked={settings.approval_required} onChange={(e) => set({ approval_required: e.target.checked })} /> Valider toutes les missions (recommandé au début)</label>
        <label className="check"><input type="checkbox" checked={settings.settings.show_siblings !== false} onChange={(e) => set({ settings: { ...settings.settings, show_siblings: e.target.checked } })} /> Montrer les autres enfants sur la carte (chacun voit où en sont les autres)</label>
        <label className="check"><input type="checkbox" checked={settings.treasure_enabled} onChange={(e) => set({ treasure_enabled: e.target.checked })} /> Trésor commun activé</label>
        <label className="check"><input type="checkbox" checked={settings.dice_enabled} onChange={(e) => set({ dice_enabled: e.target.checked })} /> Dé du destin activé</label>
        {settings.dice_enabled && (
          <div className="row wrap">
            <Field label="Le dé se débloque">
              <select value={settings.dice_mode} onChange={(e) => set({ dice_mode: e.target.value as 'weekly' | 'quests' })}>
                <option value="quests">après N missions validées</option><option value="weekly">une fois par semaine</option>
              </select>
            </Field>
            {settings.dice_mode === 'quests' && (
              <Field label="Nombre de missions"><input type="number" min={1} max={50} defaultValue={settings.dice_quest_threshold}
                onBlur={(e) => { const n = Math.min(50, Math.max(1, Number(e.target.value) || 5)); if (n !== settings.dice_quest_threshold) set({ dice_quest_threshold: n }); }} /></Field>
            )}
          </div>
        )}
      </Card>

      <Card title="Seuils des badges">
        <p className="muted">Nombre de pas au total pour obtenir chaque badge (la carte fait 500 pas).</p>
        {(badges.data ?? []).map((b) => (
          <Field key={b.slug} label={b.name}>
            <input type="number" min={1} max={2000} defaultValue={overrides[b.slug] ?? b.threshold.steps ?? 0}
              onBlur={(e) => {
                const n = Math.max(1, Number(e.target.value) || 1);
                if (n !== (overrides[b.slug] ?? b.threshold.steps)) set({ settings: { ...settings.settings, badge_thresholds: { ...overrides, [b.slug]: n } } });
              }} />
          </Field>
        ))}
        <small className="muted">S’applique aux prochains gains.</small>
      </Card>

      <Card title="Mes données">
        <p className="muted">Zoralia ne garde que prénoms/pseudos, avatars et historique de jeu.</p>
        <div className="row wrap"><button className="btn ghost" onClick={download}>⬇️ Exporter les données du foyer</button><button className="btn ghost" onClick={signOut}>Se déconnecter</button></div>
      </Card>

      <Card title="Remettre l’activité à zéro" className="danger">
        <p>Efface ce que les enfants ont fait : missions réalisées, pas, pépites, coffres ouverts, demandes de la boutique, dé, badges, trésor. <b>Les enfants, les missions, la boutique et les réglages sont conservés.</b> Pense à exporter les données avant si tu veux garder une trace.</p>
        <Field label="Tape RESET pour confirmer"><input value={confirmReset} onChange={(e) => setConfirmReset(e.target.value)} autoCapitalize="characters" /></Field>
        <button className="btn danger" disabled={confirmReset !== 'RESET' || reset.pending} onClick={async () => { await reset.run(family.id); setConfirmReset(''); }}>Tout remettre à zéro</button>
      </Card>

      <Card title="Supprimer le foyer" className="danger">
        <p>Supprimer le foyer efface définitivement enfants, missions, pépites et historique. Ton compte Google (et Popote) n’est pas touché.</p>
        <Field label={`Tape « ${family.name} » pour confirmer`}><input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} /></Field>
        <button className="btn danger" disabled={confirmName !== family.name} onClick={remove}>Supprimer le foyer</button>
      </Card>
    </>
  );
}
