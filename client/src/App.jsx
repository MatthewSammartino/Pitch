import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import LandingPage    from "./pages/LandingPage";
import DashboardPage  from "./pages/DashboardPage";
import GroupPage      from "./pages/GroupPage";
import ProfilePage    from "./pages/ProfilePage";
import JoinGroupPage  from "./pages/JoinGroupPage";
import GameLobbyPage  from "./pages/GameLobbyPage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"            element={<LandingPage />} />
      <Route path="/join/:token" element={<JoinGroupPage />} />

      {/* Protected */}
      <Route path="/dashboard"         element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/group/:slug"        element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
      <Route path="/profile"            element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/lobby/:sessionId"   element={<ProtectedRoute><GameLobbyPage /></ProtectedRoute>} />

      {/* 404 fallback */}
      <Route path="*" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
    </Routes>
  );
}
