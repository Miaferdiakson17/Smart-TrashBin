import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import semua halaman kamu
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SignUp from './pages/SignUp'; // Pastikan nama filenya SignUp.js (S dan U besar)

function App() {
  return (
    <Router>
      <Routes>
        {/* Halaman Login (Utama) */}
        <Route path="/" element={<Login />} />
        
        {/* Halaman Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* 🚩 INI YANG KURANG: Daftarkan rute /register */}
        <Route path="/register" element={<SignUp />} />
      </Routes>
    </Router>
  );
}

export default App;