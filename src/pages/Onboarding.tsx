import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';
import { applyTheme, THEMES, themeBySlug } from '../lib/themes';
import { useSession } from '../state/session';
import { useToast } from '../state/toast';
import { AvatarPicker, Avatar, Field, Footprint, Nugget } from '../ui/kit';

interface Draft { name: string; avatar: string; color: string }
const AVATAR_CYCLE = ['fox', 'cat', 'panda', 'owl', 'dragon', 'unicorn'];
const COLOR_CYCLE = ['sun', 'sky', 'mint', 'rose', 'violet', 'coral'];

export default function Onboarding({ userName }: { userName: string }) {
  const [step, setStep] = useState(0);
  const [familyName, setFamilyName] = useState(userName ? `Famille de ${userName.split(' ')[0]}` : '');
  const [kids, setKids] = useState<Draft[]>([{ name: '', avatar: 'fox', color: 'sun' }]);
  const [theme, setTheme] = useState('aventuriers');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const { signOut } = useSession();

  const validKids = kids.filter((k) => k.name.trim());
  const canNext = [familyName.trim().length > 0, validKids.length > 0, true, true][step];

  function pickTheme(slug: string) { setTheme(slug); applyTheme(themeBySlug(slug)); }

  async function finish() {
    setBusy(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
      const familyId = await api.createFamily(familyName.trim(), theme, timezone);
      for (const k of validKids) {
        await api.addChild({ family_id: familyId, display_name: k.name.trim(), avatar_key: k.avatar, color_key: k.color });
      }
      await qc.invalidateQueries();
    } catch (e) {
      toast(errorMessage(e), 'error');
      // Le foyer a pu être créé avant l'échec : on recharge pour reprendre depuis l'espace parent.
      await qc.invalidateQueries();
      setBusy(false);
    }
  }

  return (
    <main className="onboarding">
      <ol className="stepper" aria-label="Étapes">
        {['Foyer', 'Enfants', 'Univers', 'Règles'].map((s, i) => (
          <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''}>{s}</li>
        ))}
      </ol>

      {step === 0 && (
        <section className="card">
          <h1>Bienvenue sur Zoralia !</h1>
          <p>Commençons par créer ton foyer. Tu en seras l’administrateur.</p>
          <Field label="Nom du foyer"><input value={familyName} maxLength={60} onChange={(e) => setFamilyName(e.target.value)} placeholder="Famille Martin" /></Field>
        </section>
      )}

      {step === 1 && (
        <section className="card">
          <h1>Qui part à l’aventure ?</h1>
          <p>Un prénom ou un pseudo suffit : pas de photo, pas d’email.</p>
          {kids.map((k, i) => (
            <div className="kid-form" key={i}>
              <div className="row"><Avatar avatar={k.avatar} color={k.color} />
                <input aria-label={`Prénom de l’enfant ${i + 1}`} value={k.name} maxLength={30} placeholder="Prénom ou pseudo"
                  onChange={(e) => setKids(kids.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                {kids.length > 1 && <button className="btn ghost" onClick={() => setKids(kids.filter((_, j) => j !== i))} aria-label="Retirer">✕</button>}
              </div>
              <AvatarPicker avatar={k.avatar} color={k.color} onChange={(v) => setKids(kids.map((x, j) => (j === i ? { ...x, avatar: v.avatar, color: v.color } : x)))} />
            </div>
          ))}
          <button className="btn ghost" onClick={() => setKids([...kids, { name: '', avatar: AVATAR_CYCLE[kids.length % 6], color: COLOR_CYCLE[kids.length % 6] }])}>+ Ajouter un enfant</button>
        </section>
      )}

      {step === 2 && (
        <section className="card">
          <h1>Choisis votre univers</h1>
          <p>Seuls les décors changent : les règles et la progression restent les mêmes. Tu pourras changer plus tard.</p>
          <div className="universes">
            {THEMES.map((u) => (
              <button key={u.slug} className={`universe ${theme === u.slug ? 'on' : ''}`} style={{ background: u.vars['--hero'] }} onClick={() => pickTheme(u.slug)} aria-pressed={theme === u.slug}>
                <span className="big-emoji" aria-hidden>{u.heroEmoji}</span>
                <strong>{u.name}</strong><small>{u.tagline}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="card">
          <h1>Les règles du jeu</h1>
          <ul className="rules">
            <li>⚔️ Les enfants réalisent des <b>missions</b> et déclarent « J’ai terminé » ; <b>tu valides</b>.</li>
            <li><Footprint /> Chaque mission validée donne des <b>pas</b> : 1 pour une routine, 3 à 5 pour un exploit. Les pas font avancer sur la carte et ne se dépensent jamais.</li>
            <li>🧰 Sur la carte, des <b>coffres</b> contiennent des pépites : de 5 au début jusqu’à 20 près du sommet.</li>
            <li><Nugget /> Les <b>pépites</b> s’échangent contre des récompenses que tu approuves, ou remplissent le trésor commun.</li>
            <li>🎲 Un <b>dé du destin</b> offre de petites surprises.</li>
            <li>💚 Jamais de pénalité : la carte ne recule pas, on valorise.</li>
          </ul>
        </section>
      )}

      <div className="nav-row">
        {step > 0 ? <button className="btn ghost" onClick={() => setStep(step - 1)} disabled={busy}>Retour</button> : <button className="btn ghost" onClick={signOut}>Se déconnecter</button>}
        {step < 3
          ? <button className="btn" disabled={!canNext} onClick={() => setStep(step + 1)}>Continuer</button>
          : <button className="btn" disabled={busy} onClick={finish}>{busy ? 'Création…' : 'C’est parti !'}</button>}
      </div>
    </main>
  );
}
