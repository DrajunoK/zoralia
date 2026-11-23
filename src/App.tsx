import { Navigate, Route, Routes } from 'react-router-dom';
import ChildLayout from './pages/child/ChildLayout';
import ChildHome from './pages/child/Home';
import ChildMissions from './pages/child/Missions';
import ChildMap from './pages/child/MapPage';
import ChildShop from './pages/child/Shop';
import ChildTreasure from './pages/child/Treasure';
import ChildDice from './pages/child/Dice';
import ChildBadges from './pages/child/Badges';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Profiles from './pages/Profiles';
import ParentLayout from './pages/parent/ParentLayout';
import Dashboard from './pages/parent/Dashboard';
import ChildrenAdmin from './pages/parent/ChildrenAdmin';
import MissionsAdmin from './pages/parent/MissionsAdmin';
import ShopAdmin from './pages/parent/ShopAdmin';
import TreasureAdmin from './pages/parent/TreasureAdmin';
import SettingsPage from './pages/parent/Settings';
import Journal from './pages/parent/Journal';
import { FamilyProvider } from './state/family';
import { useSession } from './state/session';
import { supabaseConfigured } from './lib/supabase';

export default function App() {
  const { session, loading } = useSession();
  if (loading) return <div className="splash">Chargement…</div>;
  if (!supabaseConfigured || !session) return <Login />;

  return (
    <FamilyProvider userId={session.user.id} fallback={<Onboarding userName={session.user.user_metadata?.full_name ?? ''} />}>
      <Routes>
        <Route path="/profils" element={<Profiles />} />
        <Route path="/enfant/:childId" element={<ChildLayout />}>
          <Route index element={<ChildHome />} />
          <Route path="missions" element={<ChildMissions />} />
          <Route path="carte" element={<ChildMap />} />
          <Route path="boutique" element={<ChildShop />} />
          <Route path="tresor" element={<ChildTreasure />} />
          <Route path="de" element={<ChildDice />} />
          <Route path="badges" element={<ChildBadges />} />
        </Route>
        <Route path="/parent" element={<ParentLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="enfants" element={<ChildrenAdmin />} />
          <Route path="missions" element={<MissionsAdmin />} />
          <Route path="boutique" element={<ShopAdmin />} />
          <Route path="tresor" element={<TreasureAdmin />} />
          <Route path="reglages" element={<SettingsPage />} />
          <Route path="journal" element={<Journal />} />
        </Route>
        <Route path="*" element={<Navigate to="/profils" replace />} />
      </Routes>
    </FamilyProvider>
  );
}
