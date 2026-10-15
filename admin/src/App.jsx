import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Candidates from './pages/Candidates';
import Drivers from './pages/Drivers';
import RoutesPage from './pages/Routes';
import Messages from './pages/Messages';
import Support from './pages/Support';

function App() {
  // Session is saved in localStorage so refresh never logs the user out
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('yolovchi_admin_logged_in') === 'true';
  });

  const handleLogin = (user) => {
    localStorage.setItem('yolovchi_admin_logged_in', 'true');
    if (user) {
      localStorage.setItem('yolovchi_admin_user', JSON.stringify(user));
    }
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('yolovchi_admin_logged_in');
    localStorage.removeItem('yolovchi_admin_user');
    setIsLoggedIn(false);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route 
          path="/login" 
          element={
            isLoggedIn ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
          } 
        />

        {/* Protected Routes */}
        <Route 
          path="/" 
          element={
            isLoggedIn ? <DashboardLayout onLogout={handleLogout} /> : <Navigate to="/login" replace />
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="messages" element={<Messages />} />
          <Route path="support" element={<Support />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
