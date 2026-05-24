import React, { useState } from 'react';
// Jalur import mengarah langsung ke src/api.js lokal kamu
import apiService from '../api';

/*
=====================================================
CLASS SIGNUP PAGE (FULL OLEO SCRIPT STYLE)
=====================================================
*/
function SignUp() {
  // State form register
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  /*
  =====================================================
  HANDLE REGISTER
  =====================================================
  */
  const handleSignUp = async (e) => {
    e.preventDefault();

    try {
      await apiService.signup(formData);
      alert("Pendaftaran admin berhasil!");
      window.location.href = "/"; 

    } catch (error) {
      if (error.response) {
        alert(error.response.data.message);
      } else {
        alert("Gagal terhubung ke backend lokal!");
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
      // SET FONT UTAMA KE OLEO SCRIPT UNTUK SELURUH AREA SIGN UP
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
        boxShadow: '0 20px 40px rgba(46, 61, 48, 0.06)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
        borderTop: '6px solid #4caf50'
      }}>
        {/* ICON */}
        <div style={{ fontSize: '50px', marginBottom: '10px' }}>📝</div>
        
        <h2 style={{ 
          margin: '0 0 5px 0', 
          color: '#1b5e20', 
          fontSize: '34px', 
          fontWeight: '400' 
        }}>
          Daftar Admin Baru
        </h2>
        <p style={{ margin: '0 0 35px 0', color: '#667c68', fontSize: '16px' }}>
          Buat akun panel monitoring IoT sampah
        </p>

        <form onSubmit={handleSignUp} style={{ textAlign: 'left' }}>
          {/* Input Nama Lengkap */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '15px', color: '#2e3d30', letterSpacing: '0.5px' }}>Nama Lengkap</label>
            <input
              type="text"
              placeholder="Masukkan nama lengkap"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                // Terapkan font ke dalam input & placeholder nama
                fontFamily: '"Oleo Script", cursive',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#4caf50';
                e.target.style.boxShadow = '0 0 0 4px rgba(76, 175, 80, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2ece3';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Input Email */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '15px', color: '#2e3d30', letterSpacing: '0.5px' }}>Email Resmi</label>
            <input
              type="email"
              placeholder="admin@smartbin.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                // Terapkan font ke dalam input & placeholder email
                fontFamily: '"Oleo Script", cursive',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#4caf50';
                e.target.style.boxShadow = '0 0 0 4px rgba(76, 175, 80, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2ece3';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Input Password */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '15px', color: '#2e3d30', letterSpacing: '0.5px' }}>Buat Password</label>
            <input
              type="password"
              placeholder="Minimal 6 karakter"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                // Terapkan font ke dalam input & placeholder password
                fontFamily: '"Oleo Script", cursive',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#4caf50';
                e.target.style.boxShadow = '0 0 0 4px rgba(76, 175, 80, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2ece3';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Tombol Daftar */}
          <button type="submit" 
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#4caf50',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              cursor: 'pointer',
              fontFamily: '"Oleo Script", cursive',
              transition: 'all 0.2s ease',
              boxShadow: '0 6px 15px rgba(76, 175, 80, 0.2)'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#388e3c'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#4caf50'}
          >
            Daftar Sekarang
          </button>
        </form>

        <p style={{ marginTop: '30px', fontSize: '16px', color: '#667c68' }}>
          Sudah punya akun? <a href="/" style={{ color: '#2e7d32', textDecoration: 'none', borderBottom: '1px dashed #2e7d32' }}>Login di sini</a>
        </p>
      </div>
    </div>
  );
}

export default SignUp;