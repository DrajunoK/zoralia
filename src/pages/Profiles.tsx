import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Child } from '../lib/types';
import { useChildren, useFamilyCtx, useWallets } from '../state/family';
import { useLock } from '../state/lock';
import InstallButton from '../ui/InstallButton';
import IntroVideoButton from '../ui/IntroVideo';
import { Avatar, Coins, Steps } from '../ui/kit';
import PinPad from '../ui/PinPad';

type Asking = { kind: 'child'; child: Child } | { kind: 'parent' } | null;

export default function Profiles() {
  const { family, theme } = useFamilyCtx();
  const children = useChildren();
  const wallets = useWallets();
  const nav = useNavigate();
  const lock = useLock();
  const [asking, setAsking] = useState<Asking>(null);
  const kids = (children.data ?? []).filter((c) => c.is_active);

  // Revenir ici referme tout : l'enfant suivant (ou le parent) doit retaper son code.
  useEffect(() => { lock.closeAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function pickChild(c: Child) {
    if (!c.has_pin) { lock.openChild(c.id); nav(`/enfant/${c.id}`); return; }
    setAsking({ kind: 'child', child: c });
  }

  return (
    <main className="profiles">
      <h1><span aria-hidden>{theme.heroEmoji}</span> {family.name}</h1>
      <p className="tagline">Qui part à l’aventure aujourd’hui ?</p>
      <div className="profile-grid">
        {kids.map((c) => (
          <button key={c.id} type="button" className="profile-card" onClick={() => pickChild(c)}>
            <Avatar avatar={c.avatar_key} color={c.color_key} size={96} />
            <strong>{c.display_name}{c.has_pin && <span className="lock-ico" role="img" aria-label="protégé par un code"> 🔒</span>}</strong>
            <span className="counters"><Steps n={wallets.data?.find((w) => w.child_id === c.id)?.steps ?? 0} /><Coins n={wallets.data?.find((w) => w.child_id === c.id)?.balance ?? 0} /></span>
          </button>
        ))}
        {!children.isLoading && kids.length === 0 && <p className="empty">Aucun enfant pour l’instant. Ajoute-en depuis l’espace parent.</p>}
      </div>
      <button type="button" className="btn ghost parent-link" onClick={() => setAsking({ kind: 'parent' })}>🔑 Espace parent</button>
      <div className="profile-extras"><IntroVideoButton /></div>
      <InstallButton className="install-bottom" />

      {asking?.kind === 'child' && (
        <PinPad
          title={`Code de ${asking.child.display_name}`}
          subtitle="Tape ton code à 4 chiffres"
          onCancel={() => setAsking(null)}
          onSubmit={async (pin) => {
            const ok = await api.verifyChildPin(asking.child.id, pin);
            if (ok) { lock.openChild(asking.child.id); nav(`/enfant/${asking.child.id}`); }
            return ok;
          }}
        />
      )}
      {asking?.kind === 'parent' && (
        <PinPad
          title="Espace parent"
          subtitle="Tape le code parent"
          onCancel={() => setAsking(null)}
          onSubmit={async (pin) => {
            const ok = await api.verifyParentPin(family.id, pin);
            if (ok) { lock.openParent(); nav('/parent'); }
            return ok;
          }}
        />
      )}
    </main>
  );
}
