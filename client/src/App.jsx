import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import LandingPage    from "./pages/LandingPage";
import DashboardPage  from "./pages/DashboardPage";
import GroupPage      from "./pages/GroupPage";
import ProfilePage    from "./pages/ProfilePage";
import JoinGroupPage  from "./pages/JoinGroupPage";
import GameLobbyPage  from "./pages/GameLobbyPage";
import GameRoomPage   from "./pages/GameRoomPage";
import StubPage         from "./pages/StubPage";
import LeaderboardPage  from "./pages/LeaderboardPage";
import GroupsPage       from "./pages/GroupsPage";
import ChipsPage        from "./pages/ChipsPage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"            element={<LandingPage />} />
      <Route path="/join/:token" element={<JoinGroupPage />} />
      <Route path="/news"        element={<StubPage title="News" />} />
      <Route path="/chips"       element={<ChipsPage />} />
      <Route path="/store"       element={<StubPage title="Store" />} />
      <Route path="/settings"    element={<StubPage title="Settings" />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/help"        element={<StubPage title="Help" />} />

      {/* Protected */}
      <Route path="/dashboard"         element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/groups"            element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
      <Route path="/group/:slug"        element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
      <Route path="/profile"            element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/lobby/:sessionId"   element={<ProtectedRoute><GameLobbyPage /></ProtectedRoute>} />
      <Route path="/game/:sessionId"    element={<ProtectedRoute><GameRoomPage /></ProtectedRoute>} />

      {/* 404 fallback */}
      <Route path="*" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
    </Routes>
  );
}
