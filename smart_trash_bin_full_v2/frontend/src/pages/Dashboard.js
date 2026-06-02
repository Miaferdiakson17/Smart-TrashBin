import React, { useEffect, useState } from 'react';
import apiService from '../api';

/*
=====================================================
KELAS KOMPONEN HALAMAN DASHBOARD (TWO-OPTION APPROVAL & INTEGRATED HUB)
=====================================================
*/
function Dashboard() {

  // =====================================================
  // STATE DATA & NAVIGASI
  // =====================================================
  const [trashData, setTrashData] = useState([]);
  const [adminData, setAdminData] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]); // Menampung data akun status PENDING
  const [activeMenu, setActiveMenu] = useState('monitoring');

  // Mengambil data tingkatan akun dari localStorage saat login (ADMIN / SUPER_ADMIN)
  const userRole = localStorage.getItem("user_role") || "ADMIN";

  // =====================================================
  // STATE REALTIME TEMPAT SAMPAH (ESP32)
  // =====================================================
  const [organikBin, setOrganikBin] = useState({ percentage: 0, status: 'EMPTY' });
  const [nonOrganikBin, setNonOrganikBin] = useState({ percentage: 0, status: 'EMPTY' });

  // =====================================================
  // FUNGSI UNTUK MENGAMBIL DATA DARI BACKEND FLASK
  // =====================================================
  const fetchData = async () => {
    try {
      const trashResponse = await apiService.getTrashData();
      const adminResponse = await apiService.getAdmins();

      const allTrash = trashResponse.data || [];
      setTrashData(allTrash);
      setAdminData(adminResponse.data || []);

      // Mengambil data terbaru untuk BIN ORGANIK (BIN-01)
      const latestOrganik = allTrash.find(item => item.bin_id === 'BIN-01');
      if (latestOrganik) {
        const pct = Math.round(latestOrganik.percentage);
        setOrganikBin({
          percentage: pct,
          status: translateStatus(latestOrganik.status, pct)
        });
      }

      // Mengambil data terbaru untuk BIN NON-ORGANIK (BIN-02)
      const latestNonOrganik = allTrash.find(item => item.bin_id === 'BIN-02');
      if (latestNonOrganik) {
        const pct = Math.round(latestNonOrganik.percentage);
        setNonOrganikBin({
          percentage: pct,
          status: translateStatus(latestNonOrganik.status, pct)
        });
      }

      // Ambil data antrean register PENDING jika yang login adalah SUPER_ADMIN
      if (userRole === "SUPER_ADMIN") {
        const response = await fetch('http://localhost:5000/api/pending-users');
        const data = await response.json();
        setPendingUsers(data || []);
      }

    } catch (error) {
      console.log("Gagal mengambil data dari backend", error);
    }
  };

  // =====================================================
  // FUNGSI AKURAT UNTUK MENENTUKAN STATUS
  // =====================================================
  const translateStatus = (statusMentah, percentage) => {
    if (percentage !== undefined && percentage !== null) {
      if (percentage >= 80) return 'FULL';
      if (percentage >= 40) return 'HALF';
      return 'EMPTY';
    }
    if (!statusMentah) return 'EMPTY';
    const s = statusMentah.toUpperCase();
    if (s === 'PENUH' || s === 'FULL') return 'FULL';
    if (s === 'SETENGAH' || s === 'HALF') return 'HALF';
    return 'EMPTY';
  };

  // =====================================================
  // AUTO REFRESH DATA SETIAP 3 DETIK (REAL-TIME POLLING)
  // =====================================================
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // =====================================================
  // FUNGSI WARNA REAL-TIME
  // =====================================================
  const getStatusColor = (status, isNonOrganik = false) => {
    if (status === 'FULL') return '#FF3333';       
    if (status === 'HALF') return isNonOrganik ? '#FFD600' : '#FF9900'; 
    return '#00FF66';                              
  };

  // =====================================================
  // FUNGSI APPROVE AKUN PENDING
  // =====================================================
  const handleApproval = async (email, action) => {
    const confirmAction = window.confirm(`Are you sure you want to approve this admin request?`);
    if (!confirmAction) return;

    try {
      const response = await fetch('http://localhost:5000/api/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action })
      });

      if (response.ok) {
        alert("Account has been approved successfully!");
        fetchData(); 
      } else {
        alert("Failed to update registration status.");
      }
    } catch (error) {
      console.error("Error during approval:", error);
      alert("Network error. Please try again.");
    }
  };

  // =====================================================
  // FUNGSI MENGHAPUS / MENOLAK AKUN (PENDING DAN APPROVED)
  // =====================================================
  const handleDeleteUser = async (email, isPending = false) => {
    const alertMessage = isPending 
      ? `Are you sure you want to delete and reject this new registration request: ${email}?`
      : `CRITICAL WARNING:\nAre you sure you want to PERMANENTLY DELETE the active admin account: ${email}?`;

    const confirmDelete = window.confirm(alertMessage);
    if (!confirmDelete) return;

    try {
      const response = await fetch('http://localhost:5000/api/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const resData = await response.json();

      if (response.ok) {
        alert("Account deleted successfully!");
        fetchData(); 
      } else {
        alert(resData.message || "Failed to delete account.");
      }
    } catch (error) {
      console.error("Error during deletion:", error);
      alert("Network error. Cannot delete user.");
    }
  };

  // =====================================================
  // FUNGSI LOGOUT & DELETE DATA SAMPAH
  // =====================================================
  const handleLogout = () => {
    localStorage.clear(); 
    alert("Logout successful!");
    window.location.href = "/";
  };

  const handleDeleteSingle = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this trash record?");
    if (!confirmDelete) return;

    try {
      await apiService.deleteSingleTrash(id);
      alert("Record deleted successfully!");
      fetchData();
    } catch (error) {
      console.log("Gagal menghapus data", error);
      alert("Failed to delete record!");
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FAFFF9', fontFamily: '"Inter", sans-serif', color: '#1A3020', overflowX: 'hidden' }}>

      {/* STYLE INJEKSI UNTUK ANIMASI */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fredoka:wght@500;600;700&display=swap');
          @keyframes sway { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(6deg) skewX(3deg); } }
          .menu-btn { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
          .menu-btn:hover { transform: scale(1.03); background-color: #ffffff !important; color: #00AA44 !important; }
          .pulse-dot { animation: pulse-animation 2s infinite; }
          @keyframes pulse-animation { 0% { transform: scale(0.95); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } 100% { transform: scale(0.95); opacity: 1; } }
        `}
      </style>

      {/* ===================================================== */}
      {/* SIDEBAR NAVIGASI */}
      {/* ===================================================== */}
      <div style={{ width: '280px', backgroundColor: '#00E676', color: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0 20px 0', boxShadow: '4px 0 25px rgba(0, 230, 118, 0.2)', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 100, overflow: 'hidden' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '45px', width: '100%', padding: '0 20px', zIndex: 2 }}>
          <div style={{ width: '80px', height: '80px', backgroundColor: '#ffffff', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 15px auto', fontSize: '38px', boxShadow: '0 6px 15px rgba(0,0,0,0.1)', color: '#00AA44' }}>👤</div>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '700', fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#FFFFFF' }}>
            {localStorage.getItem("nama_aktif") || "julio"}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FFFFFF' }}></span>
            <span style={{ fontSize: '11px', color: '#FFFFFF', letterSpacing: '1.5px', fontWeight: '700', opacity: 0.9 }}>
              {userRole === "SUPER_ADMIN" ? "HEAD OF DORM" : "SYSTEM CONTROL"}
            </span>
          </div>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 15px', boxSizing: 'border-box', zIndex: 2 }}>
          <button onClick={() => setActiveMenu('monitoring')} className="menu-btn" style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%', padding: '14px 20px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '700', color: activeMenu === 'monitoring' ? '#00AA44' : '#FFFFFF', backgroundColor: activeMenu === 'monitoring' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)', boxShadow: activeMenu === 'monitoring' ? '0 8px 16px rgba(0, 0, 0, 0.08)' : 'none' }}>
            <span>📊</span> <span>Real-Time Monitoring</span>
          </button>

          <button onClick={() => setActiveMenu('riwayat')} className="menu-btn" style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%', padding: '14px 20px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '700', color: activeMenu === 'riwayat' ? '#00AA44' : '#FFFFFF', backgroundColor: activeMenu === 'riwayat' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)', boxShadow: activeMenu === 'riwayat' ? '0 8px 16px rgba(0, 0, 0, 0.08)' : 'none' }}>
            <span>📋</span> <span>Trash History Log</span>
          </button>

          <button onClick={() => setActiveMenu('admin')} className="menu-btn" style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%', padding: '14px 20px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '700', color: activeMenu === 'admin' ? '#00AA44' : '#FFFFFF', backgroundColor: activeMenu === 'admin' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)', boxShadow: activeMenu === 'admin' ? '0 8px 16px rgba(0, 0, 0, 0.08)' : 'none' }}>
            <span>👥</span> 
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              System Controllers
              {userRole === "SUPER_ADMIN" && pendingUsers.length > 0 && (
                <span style={{ backgroundColor: '#FF3333', color: '#FFFFFF', padding: '2px 8px', borderRadius: '50%', fontSize: '11px', fontWeight: '800' }}>
                  {pendingUsers.length}
                </span>
              )}
            </span>
          </button>
        </div>

        <button onClick={handleLogout} style={{ marginTop: 'auto', zIndex: 2, width: 'calc(100% - 30px)', padding: '12px', border: '2px dashed rgba(255,255,255, 0.6)', borderRadius: '14px', backgroundColor: 'transparent', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}>
          🚪 Leave Dashboard
        </button>
      </div>

      {/* ===================================================== */}
      {/* KONTEN UTAMA */}
      {/* ===================================================== */}
      <div style={{ marginLeft: '280px', padding: '40px', width: 'calc(100% - 280px)', boxSizing: 'border-box' }}>
        
        <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 35px rgba(0, 230, 118, 0.06)', borderLeft: '8px solid #00FF66', marginBottom: '40px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '34px', color: '#004D26', fontFamily: '"Fredoka", sans-serif' }}>Smart Trash Bin Management System</h1>
          <p style={{ margin: 0, color: '#6B8272', fontSize: '14px', fontWeight: '600' }}>
            Active Panel Status: <span style={{ backgroundColor: '#E6FFE6', color: '#00AA44', padding: '4px 12px', borderRadius: '8px', fontSize: '12px', marginLeft: '5px', fontWeight: '700' }}>{activeMenu}</span>
          </p>
        </div>

        {/* VIEW 1: MONITORING REAL-TIME */}
        {activeMenu === 'monitoring' && (
          <div>
            <h2 style={{ fontSize: '22px', marginBottom: '25px', color: '#004D26', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: '700' }}>📊 Real-Time Bin Capacity Status</h2>
            <div style={{ display: 'flex', gap: '30px', marginBottom: '35px', flexWrap: 'wrap' }}>
              {/* ORGANIK */}
              <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '24px', flex: 1, minWidth: '320px', boxShadow: '0 15px 40px rgba(0, 0, 0, 0.03)', borderTop: '6px solid #00FF66', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ color: '#004D26', marginBottom: '25px', fontWeight: '700', alignSelf: 'flex-start', margin: 0 }}>♻️ Organic Bin (BIN-01)</h3>
                <div style={{ position: 'relative', width: '220px', height: '220px', marginBottom: '20px' }}>
                  <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="110" cy="110" r="95" stroke="#F0F5F1" strokeWidth="16" fill="none" />
                    <circle cx="110" cy="110" r="95" stroke={getStatusColor(organikBin.status, false)} strokeWidth="16" fill="none" strokeDasharray={2 * Math.PI * 95} strokeDashoffset={2 * Math.PI * 95 * (1 - organikBin.percentage / 100)} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <svg width="95" height="95" viewBox="0 0 24 24" style={{ marginBottom: '2px' }}><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" fill="#004D26"/><path d={organikBin.status === 'EMPTY' ? "M9 17h6v2H9z" : organikBin.status === 'HALF' ? "M9 13h6v6H9z" : "M9 9h6v10H9z"} fill={getStatusColor(organikBin.status, false)} /></svg>
                    <span style={{ fontSize: '30px', fontWeight: '800', color: '#004D26', fontFamily: '"Fredoka", sans-serif', marginTop: '-5px' }}>{organikBin.percentage}%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F0FFF4', padding: '6px 16px', borderRadius: '20px' }}>
                  <span>Condition:</span><span style={{ fontWeight: '800', color: getStatusColor(organikBin.status, false) }}>{organikBin.status}</span>
                </div>
              </div>

              {/* NON-ORGANIK */}
              <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '24px', flex: 1, minWidth: '320px', boxShadow: '0 15px 40px rgba(0, 0, 0, 0.03)', borderTop: '6px solid #FFD600', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ color: '#004D26', marginBottom: '25px', fontWeight: '700', alignSelf: 'flex-start', margin: 0 }}>📦 Non-Organic Bin (BIN-02)</h3>
                <div style={{ position: 'relative', width: '220px', height: '220px', marginBottom: '20px' }}>
                  <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="110" cy="110" r="95" stroke="#F0F5F1" strokeWidth="16" fill="none" />
                    <circle cx="110" cy="110" r="95" stroke={getStatusColor(nonOrganikBin.status, true)} strokeWidth="16" fill="none" strokeDasharray={2 * Math.PI * 95} strokeDashoffset={2 * Math.PI * 95 * (1 - nonOrganikBin.percentage / 100)} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <svg width="95" height="95" viewBox="0 0 24 24" style={{ marginBottom: '2px' }}><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" fill="#004D26"/><path d={nonOrganikBin.status === 'EMPTY' ? "M9 17h6v2H9z" : nonOrganikBin.status === 'HALF' ? "M9 13h6v6H9z" : "M9 9h6v10H9z"} fill={getStatusColor(nonOrganikBin.status, true)} /></svg>
                    <span style={{ fontSize: '30px', fontWeight: '800', color: '#004D26', fontFamily: '"Fredoka", sans-serif', marginTop: '-5px' }}>{nonOrganikBin.percentage}%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FFFDF0', padding: '6px 16px', borderRadius: '20px' }}>
                  <span>Condition:</span><span style={{ fontWeight: '800', color: getStatusColor(nonOrganikBin.status, true) }}>{nonOrganikBin.status}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: HISTORY LOG */}
        {activeMenu === 'riwayat' && (
          <div>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 15px 40px rgba(0,0,0,0.03)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#00E676', color: '#ffffff' }}>
                    <th style={{ padding: '18px 24px' }}>No</th>
                    <th style={{ padding: '18px 24px' }}>Bin ID</th>
                    <th style={{ padding: '18px 24px' }}>Category</th>
                    <th style={{ padding: '18px 24px' }}>Capacity</th>
                    <th style={{ padding: '18px 24px' }}>Status</th>
                    <th style={{ padding: '18px 24px' }}>Timestamp</th>
                    <th style={{ padding: '18px 24px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {trashData.map((item, index) => {
                    const isNonOrg = item.bin_id === 'BIN-02';
                    const pct = Math.round(item.percentage);
                    const calculatedStatus = translateStatus(item.status, pct);
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid #EEF2EE' }}>
                        <td style={{ padding: '16px 24px' }}>{index + 1}</td>
                        <td style={{ padding: '16px 24px' }}><span style={{ backgroundColor: '#F0F4F1', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>{item.bin_id}</span></td>
                        <td style={{ padding: '16px 24px' }}>{item.type}</td>
                        <td style={{ padding: '16px 24px', fontWeight: '700' }}>{pct}%</td>
                        <td style={{ padding: '16px 24px', color: getStatusColor(calculatedStatus, isNonOrg), fontWeight: '800' }}>{calculatedStatus}</td>
                        <td style={{ padding: '16px 24px' }}>{item.created_at ? new Date(item.created_at).toLocaleString('en-US') : '-'}</td>
                        <td style={{ padding: '16px 24px' }}>
                          {item.id ? <button onClick={() => handleDeleteSingle(item.id)} style={{ backgroundColor: '#FF3333', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>🗑 Delete</button> : <span>● Live</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* VIEW 3: SYSTEM CONTROLLERS (MANAJEMEN AKUN GABUNGAN) */}
        {/* ===================================================== */}
        {activeMenu === 'admin' && (
          <div>
            {/* SUB-PANEL 1: DAFTAR AKUN BARU YANG BERSTATUS PENDING */}
            {userRole === "SUPER_ADMIN" && (
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '22px', marginBottom: '20px', color: '#004D26', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: '700' }}>
                  🔑 Pending Registration Requests
                </h2>
                <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '24px', boxShadow: '0 15px 40px rgba(0,0,0,0.03)' }}>
                  {pendingUsers.length === 0 ? (
                    <p style={{ color: '#6B8272', margin: 0, fontWeight: '600' }}>🎉 No pending registration requests at the moment.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {pendingUsers.map((pUser, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFDF0', padding: '16px 24px', borderRadius: '16px', border: '1px solid #FFD600' }}>
                          <div>
                            <div style={{ fontWeight: '700', color: '#004D26', fontSize: '16px' }}>{pUser.name}</div>
                            <div style={{ fontSize: '13px', color: '#556B5C' }}>{pUser.email}</div>
                          </div>
                          
                          {/* DUA TOMBOL AKSI: APPROVE DAN DELETE UNTUK AKUN BARU */}
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                              onClick={() => handleApproval(pUser.email, 'APPROVED')} 
                              style={{ backgroundColor: '#00E676', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}
                            >
                              ✅ Approve
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(pUser.email, true)} 
                              style={{ backgroundColor: '#FF3333', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-PANEL 2: DAFTAR AKUN ADMIN RESMI YANG SUDAH AKTIF */}
            <div>
              <h2 style={{ fontSize: '22px', marginBottom: '20px', color: '#004D26', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: '700' }}>
                👥 Active System Controllers (Admin List)
              </h2>
              <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '24px', boxShadow: '0 15px 40px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                  {adminData.map((admin, index) => (
                    <div key={index} style={{ backgroundColor: '#F0FFF4', padding: '16px 24px', borderRadius: '18px', border: '2px solid #00E676', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: '320px', flex: '1 1 calc(33.333% - 20px)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>👤</span>
                        <div>
                          <div style={{ fontWeight: '700', color: '#004D26' }}>{admin.name}</div>
                          <div style={{ fontSize: '13px', color: '#556B5C' }}>{admin.email}</div>
                        </div>
                      </div>

                      {/* SATU TOMBOL AKSI: HANYA TOMBOL DELETE UNTUK ADMIN YANG SUDAH AKTIF */}
                      {userRole === "SUPER_ADMIN" && admin.email !== "julio@gmail.com" && (
                        <button 
                          onClick={() => handleDeleteUser(admin.email, false)} 
                          style={{ backgroundColor: '#FF3333', color: '#FFFFFF', border: 'none', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Dashboard;