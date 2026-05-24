import React, { useEffect, useState } from 'react';
import apiService from '../api';

/*
=====================================================
CLASS DASHBOARD PAGE
=====================================================
*/
function Dashboard() {

  // STATE DATA
  const [trashData, setTrashData] = useState([]);
  const [adminData, setAdminData] = useState([]);

  // STATE MONITORING REALTIME
  const [organikBin, setOrganikBin] = useState({
    percentage: 0,
    status: 'KOSONG'
  });

  const [nonOrganikBin, setNonOrganikBin] = useState({
    percentage: 0,
    status: 'KOSONG'
  });

  /*
  =====================================================
  AMBIL DATA DARI BACKEND
  =====================================================
  */
  const fetchData = async () => {
    try {

      const trashResponse = await apiService.getTrashData();
      const adminResponse = await apiService.getAdmins();

      const allTrash = trashResponse.data || [];

      setTrashData(allTrash);
      setAdminData(adminResponse.data || []);

      // DATA ORGANIK TERBARU
      const latestOrganik = allTrash.find(
        item => item.bin_id === 'BIN-01'
      );

      if (latestOrganik) {
        setOrganikBin({
          percentage: Math.round(latestOrganik.percentage),
          status: latestOrganik.status.toUpperCase()
        });
      }

      // DATA NON ORGANIK TERBARU
      const latestNonOrganik = allTrash.find(
        item => item.bin_id === 'BIN-02'
      );

      if (latestNonOrganik) {
        setNonOrganikBin({
          percentage: Math.round(latestNonOrganik.percentage),
          status: latestNonOrganik.status.toUpperCase()
        });
      }

    } catch (error) {
      console.log("Gagal mengambil data dari backend", error);
    }
  };

  /*
  =====================================================
  AUTO REFRESH
  =====================================================
  */
  useEffect(() => {

    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 3000);

    return () => clearInterval(interval);

  }, []);

  /*
  =====================================================
  WARNA STATUS
  =====================================================
  */
  const getStatusColor = (status) => {
    if (status === 'PENUH') return '#d32f2f';
    if (status === 'SETENGAH') return '#f57c00';

    return '#388e3c';
  };

  /*
  =====================================================
  LOGOUT
  =====================================================
  */
  const handleLogout = () => {

    localStorage.removeItem("nama_aktif");
    localStorage.removeItem("token");

    alert("Berhasil logout!");

    window.location.href = "/";
  };

  /*
  =====================================================
  HAPUS SATU DATA
  =====================================================
  */
  const handleDeleteSingle = async (id) => {

    const confirmDelete = window.confirm(
      "Yakin ingin menghapus data ini?"
    );

    if (!confirmDelete) return;

    try {

      await apiService.deleteSingleTrash(id);

      alert("Data berhasil dihapus!");

      fetchData();

    } catch (error) {

      console.log("Gagal menghapus data", error);

      alert("Gagal menghapus data!");
    }
  };

  return (

    <div style={{
      padding: '30px',
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      backgroundColor: '#f4f7f5',
      minHeight: '100vh',
      color: '#2e3d30'
    }}>

      {/* GOOGLE FONT */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Oleo+Script:wght@400;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        `}
      </style>

      {/* ===================================================== */}
      {/* HEADER */}
      {/* ===================================================== */}

      <div style={{
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(46, 61, 48, 0.04)',
        borderLeft: '6px solid #2e7d32',
        marginBottom: '30px'
      }}>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}>

          {/* KIRI */}
          <div>

            <h1 style={{
              margin: '0 0 5px 0',
              fontSize: '34px',
              color: '#1b5e20',
              fontFamily: '"Oleo Script", cursive',
              fontWeight: '400'
            }}>
              🌿 Smart Trash Bin Management System
            </h1>

            <p style={{
              margin: 0,
              color: '#667c68',
              fontSize: '15px',
              fontWeight: '500'
            }}>
              Monitoring Sistem Internet of Things (IoT)
              secara Real-Time • Admin Aktif:
              <span style={{
                fontWeight: '700',
                color: '#2e7d32'
              }}>
                {" "}
                {localStorage.getItem("nama_aktif") || "Tidak Diketahui"}
              </span>
            </p>

          </div>

          {/* KANAN */}
          <div>

            <button
              onClick={handleLogout}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderRadius: '10px',
                backgroundColor: '#1b5e20',
                color: '#ffffff',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              🚪 Logout
            </button>

          </div>

        </div>

      </div>

      {/* ===================================================== */}
      {/* STATUS REALTIME */}
      {/* ===================================================== */}

      <h2 style={{
        fontSize: '24px',
        marginBottom: '15px',
        color: '#2e7d32',
        fontFamily: '"Oleo Script", cursive',
        fontWeight: '400'
      }}>
        📊 Status Real-Time Kapasitas Tempat Sampah
      </h2>

      <div style={{
        display: 'flex',
        gap: '25px',
        marginBottom: '35px'
      }}>

        {/* ORGANIK */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '25px',
          borderRadius: '16px',
          flex: 1,
          boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
          borderTop: '5px solid #4caf50'
        }}>

          <h3 style={{
            color: '#2e7d32',
            margin: '0 0 15px 0',
            fontSize: '18px',
            fontFamily: '"Oleo Script", cursive'
          }}>
            ♻️ Tong Organik (BIN-01)
          </h3>

          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '5px'
          }}>

            <span style={{
              fontSize: '54px',
              fontWeight: '800',
              color: '#1b5e20'
            }}>
              {organikBin.percentage}
            </span>

            <span style={{
              fontSize: '22px',
              color: '#81c784',
              fontWeight: '700'
            }}>
              %
            </span>

          </div>

          {/* PROGRESS */}
          <div style={{
            width: '100%',
            backgroundColor: '#e8f5e9',
            height: '10px',
            borderRadius: '5px',
            margin: '15px 0'
          }}>

            <div style={{
              width: `${organikBin.percentage}%`,
              backgroundColor: '#4caf50',
              height: '100%',
              borderRadius: '5px'
            }}></div>

          </div>

          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#555'
          }}>
            Kondisi:
            <span style={{
              fontWeight: '700',
              color: getStatusColor(organikBin.status),
              marginLeft: '8px'
            }}>
              {organikBin.status}
            </span>
          </p>

        </div>

        {/* NON ORGANIK */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '25px',
          borderRadius: '16px',
          flex: 1,
          boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
          borderTop: '5px solid #1e88e5'
        }}>

          <h3 style={{
            color: '#1565c0',
            margin: '0 0 15px 0',
            fontSize: '18px',
            fontFamily: '"Oleo Script", cursive'
          }}>
            📦 Tong Non-Organik (BIN-02)
          </h3>

          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '5px'
          }}>

            <span style={{
              fontSize: '54px',
              fontWeight: '800',
              color: '#0d47a1'
            }}>
              {nonOrganikBin.percentage}
            </span>

            <span style={{
              fontSize: '22px',
              color: '#64b5f6',
              fontWeight: '700'
            }}>
              %
            </span>

          </div>

          {/* PROGRESS */}
          <div style={{
            width: '100%',
            backgroundColor: '#e3f2fd',
            height: '10px',
            borderRadius: '5px',
            margin: '15px 0'
          }}>

            <div style={{
              width: `${nonOrganikBin.percentage}%`,
              backgroundColor: '#1e88e5',
              height: '100%',
              borderRadius: '5px'
            }}></div>

          </div>

          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#555'
          }}>
            Kondisi:
            <span style={{
              fontWeight: '700',
              color: getStatusColor(nonOrganikBin.status),
              marginLeft: '8px'
            }}>
              {nonOrganikBin.status}
            </span>
          </p>

        </div>

      </div>

      {/* ===================================================== */}
      {/* TABEL RIWAYAT */}
      {/* ===================================================== */}

      <h2 style={{
        fontSize: '24px',
        marginBottom: '15px',
        color: '#2e7d32',
        fontFamily: '"Oleo Script", cursive'
      }}>
        📋 Log Riwayat Data Sampah
      </h2>

      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
        marginBottom: '35px'
      }}>

        <table style={{
          width: '100%',
          textAlign: 'left',
          borderCollapse: 'collapse',
          fontSize: '14px'
        }}>

          <thead>

            <tr style={{
              backgroundColor: '#2e7d32',
              color: '#ffffff'
            }}>

              <th style={{ padding: '15px' }}>No</th>
              <th style={{ padding: '15px' }}>ID Tempat Sampah</th>
              <th style={{ padding: '15px' }}>Kategori</th>
              <th style={{ padding: '15px' }}>Kapasitas</th>
              <th style={{ padding: '15px' }}>Status</th>
              <th style={{ padding: '15px' }}>Waktu</th>
              <th style={{ padding: '15px' }}>Aksi</th>

            </tr>

          </thead>

          <tbody>

            {trashData.length === 0 ? (

              <tr>
                <td
                  colSpan="7"
                  style={{
                    padding: '25px',
                    textAlign: 'center'
                  }}
                >
                  Menunggu data dari ESP32...
                </td>
              </tr>

            ) : (

              trashData.map((item, index) => (

                <tr
                  key={index}
                  style={{
                    borderBottom: '1px solid #e2ece3'
                  }}
                >

                  <td style={{ padding: '14px 15px' }}>
                    {index + 1}
                  </td>

                  <td style={{
                    padding: '14px 15px',
                    fontWeight: '600'
                  }}>
                    {item.bin_id}
                  </td>

                  <td style={{ padding: '14px 15px' }}>
                    {item.type}
                  </td>

                  <td style={{
                    padding: '14px 15px',
                    fontWeight: '700'
                  }}>
                    {Math.round(item.percentage)}%
                  </td>

                  <td style={{ padding: '14px 15px' }}>
                    <span style={{
                      fontWeight: '800',
                      color: getStatusColor(
                        item.status
                          ? item.status.toUpperCase()
                          : 'KOSONG'
                      )
                    }}>
                      {item.status
                        ? item.status.toUpperCase()
                        : 'KOSONG'}
                    </span>
                  </td>

                  <td style={{
                    padding: '14px 15px',
                    color: '#777'
                  }}>
                    {
                      item.created_at
                        ? new Date(item.created_at)
                          .toLocaleString('id-ID')
                        : '-'
                    }
                  </td>

                  {/* BUTTON HAPUS */}
                  <td style={{ padding: '14px 15px' }}>

                    <button
                      onClick={() => handleDeleteSingle(item.id)}
                      style={{
                        backgroundColor: '#d32f2f',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '12px'
                      }}
                    >
                      🗑 Hapus
                    </button>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      {/* ===================================================== */}
      {/* ADMIN */}
      {/* ===================================================== */}

      <div style={{
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
      }}>

        <h3 style={{
          margin: '0 0 15px 0',
          fontSize: '18px',
          color: '#2e7d32',
          borderBottom: '2px solid #e8f5e9',
          paddingBottom: '8px',
          fontFamily: '"Oleo Script", cursive'
        }}>
          👥 Pengontrol Sistem (Daftar Admin)
        </h3>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '15px'
        }}>

          {adminData.map((admin, index) => (

            <div
              key={index}
              style={{
                backgroundColor: '#f1f8f3',
                padding: '8px 18px',
                borderRadius: '20px',
                fontSize: '13px',
                border: '1px solid #c8e6c9'
              }}
            >
              👤 <b>{admin.name}</b> — {admin.email}
            </div>

          ))}

        </div>

      </div>

    </div>
  );
}

export default Dashboard;