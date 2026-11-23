import { useState } from 'react';
import { api } from '../../lib/api';
import type { Recurrence } from '../../lib/game';
import type { Category, Mission } from '../../lib/types';
import { useAction, useChildren, useFamilyCtx, useMissionChildren, useMissions } from '../../state/family';
import { useSession } from '../../state/session';
import { Card, Empty, Field, Steps } from '../../ui/kit';

const CATS: Record<Category, string> = { daily: 'Quotidienne', heroic: 'Héroïque', surprise: 'Surprise' };
const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface Draft {
  id?: string; title: string; description: string; category: Category; points: number; recType: Recurrence['type']; days: number[];
  starts_at: string; ends_at: string; requires_approval: boolean; is_active: boolean; childIds: string[];
}
const blank: Draft = { title: '', description: '', category: 'daily', points: 1, recType: 'daily', days: [1, 2, 3, 4, 5], starts_at: '', ends_at: '', requires_approval: true, is_active: true, childIds: [] };

export default function MissionsAdmin() {
  const { family } = useFamilyCtx();
  const { session } = useSession();
  const missions = useMissions();
  const children = useChildren();
  const assignments = useMissionChildren();
  const [draft, setDraft] = useState<Draft | null>(null);
  const save = useAction(api.saveMission, 'Mission enregistrée ✅');

  function edit(m: Mission) {
    setDraft({
      id: m.id, title: m.title, description: m.description, category: m.category, points: m.points, recType: m.recurrence.type,
      days: m.recurrence.type === 'weekly' ? m.recurrence.days : [1, 2, 3, 4, 5], starts_at: m.starts_at ?? '', ends_at: m.ends_at ?? '',
      requires_approval: m.requires_approval, is_active: m.is_active,
      childIds: (assignments.data ?? []).filter((a) => a.mission_id === m.id).map((a) => a.child_id),
    });
  }

  async function submit() {
    if (!draft || !draft.title.trim()) return;
    const recurrence: Recurrence = draft.recType === 'weekly' ? { type: 'weekly', days: draft.days } : { type: draft.recType };
    await save.run({
      ...(draft.id ? { id: draft.id } : {}), family_id: family.id, title: draft.title.trim(), description: draft.description.trim(),
      category: draft.category, points: draft.points, recurrence, starts_at: draft.starts_at || null, ends_at: draft.ends_at || null,
      requires_approval: draft.requires_approval, is_active: draft.is_active,
    }, draft.childIds, session!.user.id);
    setDraft(null);
  }

  const kids = (children.data ?? []).filter((c) => c.is_active);
  return (
    <>
      <h1>⚔️ Missions</h1>
      <Card action={<button className="btn" onClick={() => setDraft({ ...blank })}>+ Nouvelle mission</button>}>
        {(missions.data ?? []).length === 0 && <Empty>Aucune mission.</Empty>}
        {(['daily', 'heroic', 'surprise'] as Category[]).map((cat) => {
          const list = (missions.data ?? []).filter((m) => m.category === cat);
          if (!list.length) return null;
          return (
            <div key={cat}>
              <h3>{CATS[cat]}s</h3>
              <ul className="list">
                {list.map((m) => {
                  const who = (assignments.data ?? []).filter((a) => a.mission_id === m.id).length;
                  return (
                    <li key={m.id} className={m.is_active ? '' : 'inactive'}>
                      <span><strong>{m.title}</strong><small>{m.recurrence.type === 'daily' ? 'Tous les jours' : m.recurrence.type === 'once' ? 'Une seule fois' : 'Certains jours'} · {who ? `${who} enfant(s)` : 'Tous les enfants'}{m.is_active ? '' : ' · désactivée'}</small></span>
                      <span className="row"><Steps n={m.points} /><button className="btn ghost" onClick={() => edit(m)}>Modifier</button></span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </Card>

      {draft && (
        <Card title={draft.id ? 'Modifier la mission' : 'Nouvelle mission'}>
          <Field label="Titre"><input value={draft.title} maxLength={80} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
          <Field label="Description (facultatif)"><input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <div className="row wrap">
            <Field label="Type"><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}>
              {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Pas 👣" hint="Gagnés sur la carte quand la mission est validée"><input type="number" min={1} max={20} value={draft.points} onChange={(e) => setDraft({ ...draft, points: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })} /></Field>
            <Field label="Récurrence"><select value={draft.recType} onChange={(e) => setDraft({ ...draft, recType: e.target.value as Recurrence['type'] })}>
              <option value="daily">Tous les jours</option><option value="weekly">Certains jours</option><option value="once">Une seule fois</option></select></Field>
          </div>
          {draft.recType === 'weekly' && (
            <div className="row" role="group" aria-label="Jours">
              {DAYS.map((d, i) => (
                <button key={i} type="button" className={`chip ${draft.days.includes(i + 1) ? 'on' : ''}`} aria-pressed={draft.days.includes(i + 1)}
                  onClick={() => setDraft({ ...draft, days: draft.days.includes(i + 1) ? draft.days.filter((x) => x !== i + 1) : [...draft.days, i + 1] })}>{d}</button>
              ))}
            </div>
          )}
          <div className="row wrap">
            <Field label="Disponible à partir du"><input type="date" value={draft.starts_at} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })} /></Field>
            <Field label="Jusqu’au"><input type="date" value={draft.ends_at} onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })} /></Field>
          </div>
          <fieldset className="field"><legend>Pour qui ? <small>(aucun coché = tous)</small></legend>
            <div className="row wrap">{kids.map((c) => (
              <label key={c.id} className="check"><input type="checkbox" checked={draft.childIds.includes(c.id)}
                onChange={(e) => setDraft({ ...draft, childIds: e.target.checked ? [...draft.childIds, c.id] : draft.childIds.filter((x) => x !== c.id) })} /> {c.display_name}</label>
            ))}</div>
          </fieldset>
          <label className="check"><input type="checkbox" checked={draft.requires_approval} onChange={(e) => setDraft({ ...draft, requires_approval: e.target.checked })} /> Validation parentale requise</label>
          <label className="check"><input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Mission active</label>
          <div className="row"><button className="btn" disabled={save.pending || !draft.title.trim() || (draft.recType === 'weekly' && draft.days.length === 0)} onClick={submit}>Enregistrer</button><button className="btn ghost" onClick={() => setDraft(null)}>Annuler</button></div>
        </Card>
      )}
    </>
  );
}
