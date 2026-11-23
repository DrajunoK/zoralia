import { useState } from 'react';
import { api } from '../../lib/api';
import type { Child } from '../../lib/types';
import { useAction, useChildren, useFamilyCtx } from '../../state/family';
import { Avatar, AvatarPicker, Card, Empty, Field } from '../../ui/kit';

interface Draft { id?: string; name: string; avatar: string; color: string }

export default function ChildrenAdmin() {
  const { family } = useFamilyCtx();
  const children = useChildren();
  const [draft, setDraft] = useState<Draft | null>(null);
  const add = useAction(api.addChild, 'Enfant ajouté 🎉');
  const update = useAction(api.updateChild);

  async function save() {
    if (!draft || !draft.name.trim()) return;
    if (draft.id) await update.run(draft.id, { display_name: draft.name.trim(), avatar_key: draft.avatar, color_key: draft.color });
    else await add.run({ family_id: family.id, display_name: draft.name.trim(), avatar_key: draft.avatar, color_key: draft.color });
    setDraft(null);
  }

  return (
    <>
      <h1>👧 Enfants</h1>
      <Card action={<button className="btn" onClick={() => setDraft({ name: '', avatar: 'fox', color: 'sun' })}>+ Ajouter</button>}>
        {(children.data ?? []).length === 0 && <Empty>Aucun enfant.</Empty>}
        <ul className="list">
          {(children.data ?? []).map((c: Child) => (
            <li key={c.id} className={c.is_active ? '' : 'inactive'}>
              <span className="row"><Avatar avatar={c.avatar_key} color={c.color_key} /> <strong>{c.display_name}</strong>{!c.is_active && <small>(désactivé)</small>}</span>
              <span className="row">
                <button className="btn ghost" onClick={() => setDraft({ id: c.id, name: c.display_name, avatar: c.avatar_key, color: c.color_key })}>Modifier</button>
                <button className="btn ghost" onClick={() => update.run(c.id, { is_active: !c.is_active })}>{c.is_active ? 'Désactiver' : 'Réactiver'}</button>
              </span>
            </li>
          ))}
        </ul>
        <small className="muted">Désactiver masque l’enfant sans effacer son historique ni ses pépites.</small>
      </Card>
      {draft && (
        <Card title={draft.id ? 'Modifier' : 'Nouvel enfant'}>
          <Field label="Prénom ou pseudo"><input value={draft.name} maxLength={30} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <AvatarPicker avatar={draft.avatar} color={draft.color} onChange={(v) => setDraft({ ...draft, avatar: v.avatar, color: v.color })} />
          <div className="row"><button className="btn" onClick={save}>Enregistrer</button><button className="btn ghost" onClick={() => setDraft(null)}>Annuler</button></div>
        </Card>
      )}
    </>
  );
}
