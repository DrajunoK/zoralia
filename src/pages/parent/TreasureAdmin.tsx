import { useState } from 'react';
import { api } from '../../lib/api';
import { useAction, useFamilyCtx, useTreasure } from '../../state/family';
import { Card, Field, Gauge } from '../../ui/kit';

const STATUS: Record<string, string> = { active: 'En cours', reached: 'Atteint', claimed: 'Récompense obtenue', archived: 'Archivé' };

export default function TreasureAdmin() {
  const { family } = useFamilyCtx();
  const treasure = useTreasure();
  const t = treasure.data;
  const open = t && (t.status === 'active' || t.status === 'reached');
  const [form, setForm] = useState<{ title: string; target: number; reward: string } | null>(null);
  const save = useAction(api.saveTreasure, 'Trésor enregistré 🏆');
  const setStatus = useAction(api.setTreasureStatus, 'Trésor mis à jour');

  async function submit() {
    if (!form || !form.title.trim()) return;
    await save.run({ id: open ? t!.id : undefined, family_id: family.id, title: form.title.trim(), target_points: form.target, reward_description: form.reward.trim() });
    setForm(null);
  }

  return (
    <>
      <h1>🏆 Trésor commun</h1>
      {t && (
        <Card title={t.title}>
          <Gauge value={t.current_points} max={t.target_points} label="Trésor" />
          <p><b>{t.current_points}</b> / {t.target_points} pépites · {STATUS[t.status]}</p>
          <p className="muted">Récompense : {t.reward_description || '—'}</p>
          <div className="row wrap">
            {open && <button className="btn ghost" onClick={() => setForm({ title: t.title, target: t.target_points, reward: t.reward_description })}>Modifier</button>}
            {t.status === 'reached' && <button className="btn" onClick={() => setStatus.run(t.id, 'claimed')}>Récompense offerte ✅</button>}
            {t.status === 'active' && <button className="btn ghost" onClick={() => window.confirm('Archiver ce trésor ? Les pépites déjà données ne sont pas rendues.') && setStatus.run(t.id, 'archived')}>Archiver</button>}
            {(t.status === 'claimed' || t.status === 'archived') && <button className="btn" onClick={() => setForm({ title: '', target: 100, reward: '' })}>+ Nouveau trésor</button>}
          </div>
        </Card>
      )}
      {!t && <Card><button className="btn" onClick={() => setForm({ title: 'Le coffre de la famille', target: 100, reward: '' })}>+ Créer un trésor</button></Card>}
      {t && t.status === 'claimed' && !form && <small className="muted">Un trésor « Récompense obtenue » peut être archivé en en créant un nouveau.</small>}
      {form && (
        <Card title={open ? 'Modifier le trésor' : 'Nouveau trésor'}>
          <Field label="Titre"><input value={form.title} maxLength={80} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Objectif (pépites)"><input type="number" min={1} max={5000} value={form.target} onChange={(e) => setForm({ ...form, target: Math.max(1, Number(e.target.value) || 1) })} /></Field>
          <Field label="Récompense familiale"><input value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} placeholder="Sortie au parc d’attractions…" /></Field>
          <div className="row"><button className="btn" disabled={save.pending} onClick={submit}>Enregistrer</button><button className="btn ghost" onClick={() => setForm(null)}>Annuler</button></div>
        </Card>
      )}
    </>
  );
}
