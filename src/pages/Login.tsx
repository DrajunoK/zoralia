import { useState } from 'react';
import { errorMessage } from '../lib/errors';
import { supabaseConfigured } from '../lib/supabase';
import { applyTheme, DEFAULT_THEME } from '../lib/themes';
import InstallButton from '../ui/InstallButton';
import { signInWithGoogle } from '../state/session';
import { useEffect } from 'react';

export default function Login() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { applyTheme(DEFAULT_THEME); }, []);

  // Retour d'OAuth en erreur : Supabase met le détail dans l'URL.
  const params = new URLSearchParams(window.location.search + '&' + window.location.hash.replace(/^#/, ''));
  const callbackError = params.get('error_description');

  async function go() {
    setBusy(true); setError(null);
    try { await signInWithGoogle(); } catch (e) { setError(errorMessage(e)); setBusy(false); }
  }

  return (
    <main className="login">
      <div className="login-card">
        <img className="logo" src="/logo.svg" alt="" width="104" height="104" />
        <h1>Zoralia</h1>
        <p className="tagline">Chaque jour, une nouvelle aventure</p>
        {!supabaseConfigured ? (
          <p className="notice">Supabase n’est pas encore configuré. Copie <code>.env.example</code> en <code>.env.local</code> et renseigne l’URL et la clé publishable.</p>
        ) : (
          <button className="btn big google" onClick={go} disabled={busy}>
            {busy ? 'Connexion en cours…' : 'Se connecter avec Google'}
          </button>
        )}
        {(error || callbackError) && <p className="notice error" role="alert">La connexion a échoué : {error ?? callbackError}. Réessaie.</p>}
        <InstallButton />
        <p className="fine">🔒 Espace familial privé. Seuls les parents se connectent ; les enfants n’ont pas de compte.</p>
      </div>
    </main>
  );
}
