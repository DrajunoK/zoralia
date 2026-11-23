import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Valeurs d'exemple de .env.example : considérées comme non configurées.
export const supabaseConfigured = Boolean(url && key && !url.includes('<') && !key.includes('<'));

// Projet partagé avec Popote : toutes les tables et RPC de Zoralia vivent dans le schéma `zoralia`.
// Clé publishable uniquement : la clé service_role ne doit jamais atteindre le navigateur.
export const supabase = createClient(
  supabaseConfigured ? url! : 'https://placeholder.supabase.co',
  supabaseConfigured ? key! : 'placeholder',
  { db: { schema: 'zoralia' }, auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
