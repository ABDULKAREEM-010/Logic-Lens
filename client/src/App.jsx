import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedApp from './ProtectedApp';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './components/AdminDashboard';
import GithubCallback from './pages/GithubCallback';
import Editor from './pages/Editor';
import CreateTeam from './pages/CreateTeam';
import JoinTeam from './pages/JoinTeam';
import LeaderDashboard from './pages/LeaderDashboard';

const App = () => {
  return (
    <Routes>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/github-callback" element={<GithubCallback />} />
      <Route path="/create-team" element={<CreateTeam />} />
      <Route path="/join/:teamId" element={<JoinTeam />} />
      <Route path="/leader/:teamId" element={<LeaderDashboard />} />

      {/* Protected Routes */}
      <Route
        path="/editor"
        element={
          <ProtectedApp>
            <Editor />
          </ProtectedApp>
        }
      />
      <Route path="/*" element={<ProtectedApp />} /> {/* Catch-all protected */}
    </Routes>
  );
};

export default App;