import React, { useState } from 'react';
// Jalur import mengarah langsung ke src/api.js lokal kamu
import apiService from '../api';

/*
=====================================================
KOMPONEN HALAMAN REGISTER / SIGN UP
=====================================================
*/
function SignUp() {

  // State untuk menyimpan semua input form registrasi
  const [formData, setFormData] = useState({
    name    : '',
    email   : '',
    password: ''
  });

  // =====================================================
  // FUNGSI REGISTER - Dipanggil saat form di-submit
  // =====================================================
  const handleSignUp = async (e) => {
    e.preventDefault(); // Mencegah halaman reload saat form submit

    try {
      await apiService.signup(formData);
      alert("Admin account created successfully!");
      window.location.href = "/"; // Arahkan ke halaman login setelah daftar

    } catch (error) {
      // Tampilkan pesan error dari backend jika ada
      if (error.response) {
        alert(error.response.data.message);
      } else {
        alert("Failed to connect to the server!");
      }
    }
  };

  return (
    <div style={{
      display        : 'flex',
      justifyContent : 'center',
      alignItems     : 'center',
      minHeight      : '100vh',
      background     : 'linear-gradient(135deg, #e8f5e9 0%, #f4f7f5 100%)',
      // Menggunakan font Inter sebagai font standar website
      fontFamily     : '"Inter", sans-serif'
    }}>

      {/* Import font Inter dari Google Fonts */}
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}
      </style>

      {/* Kotak kartu registrasi */}
      <div style={{
        backgroundColor: '#ffffff',
        padding        : '45px 40px',
        borderRadius   : '24px',
        boxShadow      : '0 20px 40px rgba(46, 61, 48, 0.06)',
        width          : '100%',
        maxWidth       : '400px',
        textAlign      : 'center',
        borderTop      : '6px solid #4caf50'
      }}>

        {/* Ikon dekoratif */}
        <div style={{ fontSize: '50px', marginBottom: '10px' }}>📝</div>

        {/* Judul halaman */}
        <h2 style={{
          margin      : '0 0 5px 0',
          color       : '#1b5e20',
          fontSize    : '28px',
          fontWeight  : '700',
          letterSpacing: '-0.5px'
        }}>
          Create Admin Account
        </h2>

        {/* Subjudul */}
        <p style={{ margin: '0 0 35px 0', color: '#667c68', fontSize: '15px', fontWeight: '400' }}>
          Register to access the IoT monitoring panel
        </p>

        {/* Form registrasi */}
        <form onSubmit={handleSignUp} style={{ textAlign: 'left' }}>

          {/* Input Nama Lengkap */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display      : 'block',
              marginBottom : '8px',
              fontSize     : '14px',
              fontWeight   : '600',
              color        : '#2e3d30',
              letterSpacing: '0.3px'
            }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{
                width      : '100%',
                padding    : '12px 16px',
                borderRadius: '12px',
                border     : '2px solid #e2ece3',
                backgroundColor: '#fafffe',
                fontSize   : '15px',
                boxSizing  : 'border-box',
                outline    : 'none',
                color      : '#2e3d30',
                fontFamily : '"Inter", sans-serif',
                fontWeight : '400',
                transition : 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#4caf50';
                e.target.style.boxShadow   = '0 0 0 4px rgba(76, 175, 80, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2ece3';
                e.target.style.boxShadow   = 'none';
              }}
            />
          </div>

          {/* Input Email */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display      : 'block',
              marginBottom : '8px',
              fontSize     : '14px',
              fontWeight   : '600',
              color        : '#2e3d30',
              letterSpacing: '0.3px'
            }}>
              Official Email
            </label>
            <input
              type="email"
              placeholder="admin@smartbin.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              style={{
                width      : '100%',
                padding    : '12px 16px',
                borderRadius: '12px',
                border     : '2px solid #e2ece3',
                backgroundColor: '#fafffe',
                fontSize   : '15px',
                boxSizing  : 'border-box',
                outline    : 'none',
                color      : '#2e3d30',
                fontFamily : '"Inter", sans-serif',
                fontWeight : '400',
                transition : 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#4caf50';
                e.target.style.boxShadow   = '0 0 0 4px rgba(76, 175, 80, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2ece3';
                e.target.style.boxShadow   = 'none';
              }}
            />
          </div>

          {/* Input Password */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display      : 'block',
              marginBottom : '8px',
              fontSize     : '14px',
              fontWeight   : '600',
              color        : '#2e3d30',
              letterSpacing: '0.3px'
            }}>
              Create Password
            </label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              style={{
                width      : '100%',
                padding    : '12px 16px',
                borderRadius: '12px',
                border     : '2px solid #e2ece3',
                backgroundColor: '#fafffe',
                fontSize   : '15px',
                boxSizing  : 'border-box',
                outline    : 'none',
                color      : '#2e3d30',
                fontFamily : '"Inter", sans-serif',
                fontWeight : '400',
                transition : 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#4caf50';
                e.target.style.boxShadow   = '0 0 0 4px rgba(76, 175, 80, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2ece3';
                e.target.style.boxShadow   = 'none';
              }}
            />
          </div>

          {/* Tombol Submit Registrasi */}
          <button
            type="submit"
            style={{
              width          : '100%',
              padding        : '13px',
              backgroundColor: '#4caf50',
              color          : '#ffffff',
              border         : 'none',
              borderRadius   : '12px',
              fontSize       : '16px',
              fontWeight     : '600',
              cursor         : 'pointer',
              fontFamily     : '"Inter", sans-serif',
              letterSpacing  : '0.3px',
              transition     : 'all 0.2s ease',
              boxShadow      : '0 6px 15px rgba(76, 175, 80, 0.2)'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#388e3c'}
            onMouseOut={(e)  => e.target.style.backgroundColor = '#4caf50'}
          >
            Register Now
          </button>
        </form>

        {/* Link kembali ke halaman login */}
        <p style={{ marginTop: '30px', fontSize: '14px', color: '#667c68', fontWeight: '400' }}>
          Already have an account?{' '}
          <a
            href="/"
            style={{ color: '#2e7d32', textDecoration: 'none', fontWeight: '600', borderBottom: '1px dashed #2e7d32' }}
          >
            Sign in here
          </a>
        </p>

      </div>
    </div>  
  );
}

export default SignUp;
