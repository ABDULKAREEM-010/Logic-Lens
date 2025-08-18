// App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedApp from './ProtectedApp';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './components/AdminDashboard';

const App = () => {
  return (
    <Routes>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/*" element={<ProtectedApp />} /> {/* Catch all other routes */}
    </Routes>
  );
};

export default App;
