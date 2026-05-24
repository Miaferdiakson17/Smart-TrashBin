import React, { useState } from 'react';
// Jalur import mengarah langsung ke src/api.js lokal kamu
import apiService from '../api';

/*
=====================================================
CLASS LOGIN PAGE (FULL OLEO SCRIPT STYLE)
=====================================================
*/
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await apiService.login({ email, password });
      localStorage.setItem("email_aktif", response.data.email);
      localStorage.setItem("nama_aktif", response.data.user);
      alert("Login berhasil!");
      window.location.href = "/dashboard";
    } catch (error) {
      if (error.response) {
        alert(error.response.data.message);
      } else {
        alert("Gagal terhubung ke backend!");
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f4f7f5',
      background: 'linear-gradient(135deg, #e8f5e9 0%, #f4f7f5 100%)',
      // SET FONT UTAMA KE OLEO SCRIPT UNTUK SELURUH AREA
      fontFamily: '"Oleo Script", cursive, sans-serif'
    }}>
      {/* Memanggil font Oleo Script dari Google Fonts */}
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Oleo+Script:wght@400;750&display=swap');`}
      </style>

      <div style={{
        backgroundColor: '#ffffff',
        padding: '45px 40px',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(46, 61, 48, 0.06)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
        borderTop: '6px solid #2e7d32'
      }}>
        <div style={{ fontSize: '50px', marginBottom: '10px' }}>🌿</div>
        
        <h2 style={{ 
          margin: '0 0 5px 0', 
          color: '#1b5e20', 
          fontSize: '34px', 
          fontWeight: '400'
        }}>
          Selamat Datang
        </h2>
        <p style={{ margin: '0 0 35px 0', color: '#667c68', fontSize: '16px' }}>
          Smart Bin Management System
        </p>

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          {/* Input Email */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '15px', color: '#2e3d30', letterSpacing: '0.5px' }}>Email Admin</label>
            <input
              type="email"
              placeholder="contoh@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '2px solid #e2ece3',
                backgroundColor: '#fafdffa',
                fontSize: '15px',
                boxSizing: 'border-box',
                outline: 'none',
                color: '#2e3d30',
                // Terapkan font ke dalam input & placeholder
                fontFamily: '"Oleo Script", cursive',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2e7d32';
                e.target.style.boxShadow = '0 0 0 4px rgba(46, 125, 50, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2ece3';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Input Password */}
          <div style={{ marginBottom: '35px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '15px', color: '#2e3d30', letterSpacing: '0.5px' }}>Password</label>
            <input
              type="password"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '2px solid #e2ece3',
                backgroundColor: '#fafdffa',
                fontSize: '15px',
                boxSizing: 'border-box',
                outline: 'none',
                color: '#2e3d30',
                // Terapkan font ke dalam input & placeholder
                fontFamily: '"Oleo Script", cursive',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2e7d32';
                e.target.style.boxShadow = '0 0 0 4px rgba(46, 125, 50, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2ece3';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Tombol Login */}
          <button type="submit" 
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2e7d32',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              cursor: 'pointer',
              fontFamily: '"Oleo Script", cursive',
              transition: 'all 0.2s ease',
              boxShadow: '0 6px 15px rgba(46, 125, 50, 0.2)'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1b5e20'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2e7d32'}
          >
            Masuk Sekarang
          </button>
        </form>

        <p style={{ marginTop: '30px', fontSize: '16px', color: '#667c68' }}>
          Belum punya akun? <a href="/register" style={{ color: '#2e7d32', textDecoration: 'none', borderBottom: '1px dashed #2e7d32' }}>Daftar di sini</a>
        </p>
      </div>
    </div>
  );
}

export default Login;