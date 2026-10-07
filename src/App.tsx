import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import Auth from './pages/Auth';
import CivicFeed from './pages/CivicFeed';
import MapView from './pages/MapView';
import AdminDashboard from './pages/AdminDashboard';
import CollectorDashboard from './pages/CollectorDashboard';
import Settings from './pages/Settings';
import ComplaintDetails from './pages/ComplaintDetails';
import Leaderboard from './pages/Leaderboard';

import UpdatePassword from './pages/UpdatePassword';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<CivicFeed />} />
            <Route path="complaint/:id" element={<ComplaintDetails />} />
            <Route path="map" element={<MapView />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="collector" element={<CollectorDashboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
