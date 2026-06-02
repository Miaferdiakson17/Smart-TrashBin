import React, { useState } from 'react';
// Jalur import mengarah langsung ke src/api.js lokal kamu
import apiService from '../api';

/*
=====================================================
KOMPONEN HALAMAN LOGIN (SINKRONISASI ROLE & APPROVAL SYSTEM)
=====================================================
*/
function Login() {
  // State untuk menyimpan input email dan password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // =====================================================
  // FUNGSI LOGIN - Dipanggil saat form di-submit
  // =====================================================
  const handleLogin = async (e) => {
    e.preventDefault(); // Mencegah halaman reload saat form submit
    try {
      const response = await apiService.login({ email, password });

      // =====================================================
      // PROSES KRUSIAL: MENYIMPAN DATA DATA LOGIN & ROLE BARU
      // =====================================================
      localStorage.setItem("email_aktif", response.data.email);
      localStorage.setItem("nama_aktif", response.data.user);
      
      // Menyimpan data role (SUPER_ADMIN atau ADMIN) agar dibaca oleh Dashboard.js
      localStorage.setItem("user_role", response.data.role); 

      alert("Login successful!");
      window.location.href = "/dashboard"; // Arahkan ke halaman dashboard
    } catch (error) {
      // Tampilkan pesan error dari backend jika ada (misal: Akun masih PENDING)
      if (error.response) {
        alert(error.response.data.message);
      } else {
        alert("Failed to connect to the server!");
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e8f5e9 0%, #f4f7f5 100%)',
      // Menggunakan font Inter sebagai font standar website
      fontFamily: '"Inter", sans-serif'
    }}>

      {/* Import font Inter dari Google Fonts */}
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}
      </style>

      {/* Kotak kartu login */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '45px 40px',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(46, 61, 48, 0.06)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
        borderTop: '6px solid #00E676' // Diubah ke warna hijau terang senada dengan tema baru
      }}>

        {/* Ikon dekoratif */}
        <div style={{ fontSize: '50px', marginBottom: '10px' }}>🌿</div>

        {/* Judul halaman */}
        <h2 style={{
          margin: '0 0 5px 0',
          color: '#1b5e20',
          fontSize: '28px',
          fontWeight: '700',
          letterSpacing: '-0.5px'
        }}>
          Welcome Back
        </h2>

        {/* Subjudul */}
        <p style={{ margin: '0 0 35px 0', color: '#667c68', fontSize: '15px', fontWeight: '400' }}>
          Smart Bin Management System
        </p>

        {/* Form login */}
        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>

          {/* Input Email */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{
              display: 'block', marginBottom: '8px',
              fontSize: '14px', fontWeight: '600',
              color: '#2e3d30', letterSpacing: '0.3px'
            }}>
              Admin Email
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '2px solid #e2ece3',
                backgroundColor: '#fafffe',
                fontSize: '15px',
                boxSizing: 'border-box',
                outline: 'none',
                color: '#2e3d30',
                fontFamily: '"Inter", sans-serif',
                fontWeight: '400',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#00E676';
                e.target.style.boxShadow = '0 0 0 4px rgba(0, 230, 118, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2ece3';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Input Password */}
          <div style={{ marginBottom: '35px' }}>
            <label style={{
              display: 'block', marginBottom: '8px',
              fontSize: '14px', fontWeight: '600',
              color: '#2e3d30', letterSpacing: '0.3px'
            }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '2px solid #e2ece3',
                backgroundColor: '#fafffe',
                fontSize: '15px',
                boxSizing: 'border-box',
                outline: 'none',
                color: '#2e3d30',
                fontFamily: '"Inter", sans-serif',
                fontWeight: '400',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#00E676';
                e.target.style.boxShadow = '0 0 0 4px rgba(0, 230, 118, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2ece3';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Tombol Submit Login */}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '13px',
              backgroundColor: '#00E676', // Menggunakan warna hijau terang hidup tema baru
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: '"Inter", sans-serif',
              letterSpacing: '0.3px',
              transition: 'all 0.2s ease',
              boxShadow: '0 6px 15px rgba(0, 230, 118, 0.2)'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#00C853'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#00E676'}
          >
            Sign In
          </button>
        </form>

        {/* Link ke halaman registrasi */}
        <p style={{ marginTop: '30px', fontSize: '14px', color: '#667c68', fontWeight: '400' }}>
          Don't have an account?{' '}
          <a
            href="/register"
            style={{ color: '#00E676', textDecoration: 'none', fontWeight: '600', borderBottom: '1px dashed #00E676' }}
          >
            Register here
          </a>
        </p>

      </div>
    </div>
  );
}

export default Login;