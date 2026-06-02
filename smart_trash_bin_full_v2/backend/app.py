# =========================================================
# IMPORT LIBRARY YANG DIBUTUHKAN
# =========================================================
from flask import Flask, request, jsonify   # Framework utama untuk membangun web server API
from flask_cors import CORS                 # Mengizinkan domain React (localhost:3000) mengakses server Flask
from supabase import create_client, Client  # Library resmi konektor ke database cloud Supabase
from datetime import datetime               # Untuk memproses data pencatatan waktu (timestamp)
import requests                             # Mengirim HTTP request ke server eksternal API Telegram Bot

# =========================================================
# KELAS UTAMA APLIKASI SMART TRASH BIN
# =========================================================
class SmartBinAPI:

    def __init__(self):
        # Inisialisasi aplikasi framework Flask
        self.app = Flask(__name__)
        
        # Mengaktifkan konfigurasi CORS agar endpoint /api/* bisa diakses bebas oleh frontend React
        CORS(self.app, resources={r"/api/*": {"origins": "*"}})

        # =================================================
        # KONFIGURASI LINK KREDENSIAL DATABASE SUPABASE & TELEGRAM BOT
        # =================================================
        self.SUPABASE_URL       = ""
        self.SUPABASE_KEY       = ""
        self.TELEGRAM_BOT_TOKEN = ""
        self.TELEGRAM_CHAT_ID   = ""

        # Ukuran tinggi fisik tong sampah asli dalam satuan centimeter (cm)
        self.BIN_HEIGHT_CM = 30

        # Blok penanganan koneksi ke layanan cloud database Supabase
        try:
            self.supabase: Client = create_client(self.SUPABASE_URL, self.SUPABASE_KEY)
            print("====================================")
            print("  SUPABASE CONNECTED SUCCESSFULLY  ")
            print("====================================")
        except Exception as e:
            print("ERROR: Gagal terhubung ke Supabase:", e)

        # =================================================
        # MEMORI LIVE STATUS (DENGAN PROTECTION BUFFER ANTI-SPAM)
        # status             : Kondisi kapasitas (EMPTY, HALF, FULL)
        # milestone_notified : Menahan pemicu agar notifikasi Telegram tidak terkirim duplikat (Spam)
        # last_percentages   : Buffer array penyimpan data teranyar untuk filter fluktuasi/bouncing sensor
        # =================================================
        self.live_status = {
            "BIN-01": {
                "bin_id"            : "BIN-01",
                "type"              : "Organic",
                "percentage"        : 0,
                "status"            : "EMPTY",
                "created_at"        : None,
                "sensor_error"      : False,
                "milestone_notified": {"EMPTY": False, "HALF": False, "FULL": False},
                "milestone_times"   : {},
                "last_percentages"  : [] 
            },
            "BIN-02": {
                "bin_id"            : "BIN-02",
                "type"              : "Non-Organic",
                "percentage"        : 0,
                "status"            : "EMPTY",
                "created_at"        : None,
                "sensor_error"      : False,
                "milestone_notified": {"EMPTY": False, "HALF": False, "FULL": False},
                "milestone_times"   : {},
                "last_percentages"  : [] 
            }
        }

        # Menjalankan fungsi pendaftaran rute endpoint API
        self.setup_routes()

    # =====================================================
    # RUMUS MENGHITUNG PERSENTASE ISI TONG SAMPAH
    # Prinsip Kerja: Semakin dekat jarak objek ke sensor = tong sampah semakin penuh
    # =====================================================
    def calculate_percentage(self, distance):
        try:
            dist    = float(distance)
            # Menghitung sisa ruang kosong dikonversi ke bentuk persentase
            percent = (1 - (dist / self.BIN_HEIGHT_CM)) * 100
            # Membatasi nilai agar mutlak berada di rentang 0% hingga 100%
            return max(0, min(100, percent))
        except:
            return 0

    # =====================================================
    # TENTUKAN LABEL STATUS BERDASARKAN HASIL PERSENTASE AKHIR
    # =====================================================
    def get_status(self, percent):
        if percent <= 50:
            return "EMPTY"
        elif percent < 90:
            return "HALF"
        else:
            return "FULL"

    # =====================================================
    # AMBIL BATASAN SINKRONISASI MILESTONE SEBAGAI STRATEGI ANTISIPASI SPAM
    # =====================================================
    def get_milestone(self, percent):
        if percent <= 50:
            return "EMPTY"
        elif 51 <= percent <= 89:
            return "HALF"
        elif percent >= 90:
            return "FULL"
        return None

    # =====================================================
    # ESTIMASI WAKTU (JAM) SAMPAI TONG SAMPAH TERISI PENUH
    # Algoritma menghitung rasio kecepatan pengisian berdasarkan rentang titik milestone
    # =====================================================
    def estimate_hours_to_full(self, bin_id, current_percent):
        times = self.live_status[bin_id]["milestone_times"]
        # Memerlukan minimal 2 rekaman titik waktu pencapaian kondisi kapasitas
        if len(times) < 2:
            return None

        # Urutkan rekaman waktu dari yang paling awal tercapai
        sorted_milestones        = sorted(times.items(), key=lambda x: x[1])
        first_name, first_time   = sorted_milestones[0]
        last_name,  last_time    = sorted_milestones[-1]

        # Standar representasi median persentase kapasitas tiap milestone
        milestone_percent = {"EMPTY" : 0, "HALF"  : 70, "FULL"  : 95}

        persen_awal  = milestone_percent.get(first_name, 0)
        persen_akhir = milestone_percent.get(last_name, current_percent)
        
        # Hitung selisih waktu dalam satuan jam
        delta_jam    = (last_time - first_time).total_seconds() / 3600

        # Cegah pembagian angka dengan nilai nol atau minus jika data waktu tidak logis
        if delta_jam <= 0 or (persen_akhir - persen_awal) <= 0:
            return None

        # Laju pengisian sampah per jam
        rate_per_jam = (persen_akhir - persen_awal) / delta_jam
        # Mengembalikan perkiraan sisa durasi pengisian menuju angka 100% penuh
        return round((100 - current_percent) / rate_per_jam, 1)

    # =====================================================
    # FUNGSI MENYIMPAN DATA RIWAYAT KE TABEL TRASH_DATA SUPABASE
    # =====================================================
    def save_to_database(self, data):
        try:
            self.supabase.table("trash_data").insert(data).execute()
            print(f">> DB Saved: {data.get('bin_id')} | {data.get('status')} | {data.get('percentage')}%")
            return True
        except Exception as e:
            print(">> ERROR save_to_database:", e)
            return False

    # =====================================================
    # CORE ENGINE DISPATCH NOTIFIKASI TELEGRAM BOT (ENGLISH TEMPLATE)
    # =====================================================
    def _send_telegram(self, message):
        try:
            url = f"https://api.telegram.org/bot{self.TELEGRAM_BOT_TOKEN}/sendMessage"
            requests.post(url, data={"chat_id": self.TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}, timeout=5)
        except Exception as e:
            print(">> ERROR _send_telegram:", e)

    # Kirim format notifikasi jika tong sampah dikosongkan (Kapasitas <= 50%)
    def send_telegram_empty(self, bin_id, bin_type, percentage):
        current_time = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        message = (
            f"✅ *TRASH BIN IS EMPTY*\n\n"
            f"🗑️ Bin ID   : {bin_id}\n"
            f"📂 Type     : {bin_type}\n"
            f"📊 Capacity : {round(percentage)}%\n"
            f"🕐 Time     : {current_time}\n\n"
            f"📌 The trash bin is empty and ready to use."
        )
        self._send_telegram(message)

    # Kirim format notifikasi jika tong sampah terisi setengah penuh (Kapasitas 51% - 89%)
    def send_telegram_half(self, bin_id, bin_type, percentage, est_hours=None):
        current_time = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        est_text     = f"⏱️ Est. Full: ~{est_hours} hours left\n" if est_hours else ""
        message = (
            f"🟡 *TRASH BIN IS HALF FULL*\n\n"
            f"🗑️ Bin ID   : {bin_id}\n"
            f"📂 Type     : {bin_type}\n"
            f"📊 Capacity : {round(percentage)}%\n"
            f"🕐 Time     : {current_time}\n"
            f"{est_text}\n"
            f"⚠️ Trash bin is half full now. Please check periodically!"
        )
        self._send_telegram(message)

    # Kirim format notifikasi bahaya jika tong sampah penuh (Kapasitas >= 90%)
    def send_telegram_full(self, bin_id, bin_type, percentage):
        current_time = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        message = (
            f"🚨 *TRASH BIN IS FULL!*\n\n"
            f"🗑️ Bin ID   : {bin_id}\n"
            f"📂 Type     : {bin_type}\n"
            f"📊 Capacity : {round(percentage)}%\n"
            f"🕐 Time     : {current_time}\n\n"
            f"🔴 Please empty the trash bin immediately!"
        )
        self._send_telegram(message)

    # Kirim format notifikasi jika sistem mendeteksi kerusakan pembacaan hardware sensor
    def send_telegram_sensor_error(self, bin_id, bin_type):
        current_time = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        message = (
            f"⚠️ *SENSOR ERROR DETECTED!*\n\n"
            f"🗑️ Bin ID   : {bin_id}\n"
            f"📂 Type     : {bin_type}\n"
            f"🔌 Issue    : Ultrasonic sensor cannot be read\n"
            f"🕐 Time     : {current_time}\n\n"
            f"🔧 Please check the sensor hardware connection!"
        )
        self._send_telegram(message)

    # =====================================================
    # LOGIKA MANAJEMEN MILESTONE ANTI-SPAM NOTIFIKASI TELEGRAM
    # =====================================================
    def process_milestone(self, bin_id, bin_type, percentage, status_now):
        existing  = self.live_status[bin_id]
        notified  = existing["milestone_notified"]
        times     = existing["milestone_times"]
        now       = datetime.utcnow()
        milestone = self.get_milestone(percentage)

        if not milestone:
            return

        # PENCEGAHAN UTAMA: Jika status milestone saat ini sudah bernilai True, batalkan pengiriman notifikasi (Anti-Spam)
        if notified.get(milestone) is True:
            return

        # Simpan waktu mutakhir pencapaian milestone saat ini
        times[milestone] = now
        est_hours = self.estimate_hours_to_full(bin_id, percentage)

        # Trigger otomatisasi penulisan log riwayat ke cloud database Supabase
        self.save_to_database({
            "bin_id"           : bin_id,
            "type"             : bin_type,
            "percentage"       : round(percentage, 2),
            "status"           : milestone,
            "est_hours_to_full": est_hours
        })

        # Alur eksekusi pesan Telegram berdasarkan pembagian kategori milestone
        if milestone == "EMPTY":
            self.send_telegram_empty(bin_id, bin_type, percentage)
            # Jika tong sampah dikosongkan secara fisik, buka kembali seluruh gerbang kunci milestone
            existing["milestone_notified"] = {"EMPTY": True, "HALF": False, "FULL": False}
            existing["milestone_times"]    = {}
            return

        elif milestone == "HALF":
            self.send_telegram_half(bin_id, bin_type, percentage, est_hours)
            # Amankan status gerbang bawah (EMPTY) agar riak data sensor tidak memicu trigger kosong palsu
            notified["EMPTY"] = False 

        elif milestone == "FULL":
            self.send_telegram_full(bin_id, bin_type, percentage)

        # Kunci status terkirim saat ini menjadi True agar siklus pengiriman berhenti hingga milestone berubah
        notified[milestone] = True

    # =====================================================
    # PENGATURAN SELURUH DAFTAR ROUTE / ENDPOINT BACKEND API FLASK
    # =====================================================
    def setup_routes(self):

        # Rute Beranda Utama - Untuk memverifikasi apakah status server API Flask aktif
        @self.app.route('/')
        def home():
            return jsonify({"message": "Smart Trash Bin Backend is Running", "status" : "online"})

        # Endpoint Signup Akun Baru - Otomatis mengunci status user ke 'PENDING' dan hak akses standar 'ADMIN'
        @self.app.route('/api/signup', methods=['POST'])
        def signup():
            try:
                data     = request.json
                name     = data.get("name")
                email    = data.get("email")
                password = data.get("password")
                
                # Cek ketersediaan alamat email di dalam database Supabase agar tidak duplikat
                existing = self.supabase.table("users").select("*").eq("email", email).execute()
                if existing.data:
                    return jsonify({"message": "Email is already registered"}), 400
                
                # Simpan baris data user baru dengan status terkunci (PENDING)
                self.supabase.table("users").insert({
                    "name"    : name, 
                    "email"   : email, 
                    "password": password,
                    "status"  : "PENDING", 
                    "role"    : "ADMIN"      
                }).execute()
                return jsonify({"message": "Account created successfully! Waiting for Dormitory Management approval."}), 201
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        # Endpoint Login - Melakukan verifikasi kecocokan password, validasi approval, serta mengirimkan data hak akses (Role)
        @self.app.route('/api/login', methods=['POST'])
        def login():
            try:
                data     = request.json
                email    = data.get("email")
                password = data.get("password")
                
                # Ambil baris user yang memiliki email sesuai input
                response = self.supabase.table("users").select("*").eq("email", email).execute()
                if response.data:
                    user = response.data[0]
                    # Validasi password mentah string matching
                    if str(user["password"]) == str(password):
                        
                        # PROTEKSI AKSES: Cek apakah akun bersangkutan sudah di-approve oleh Kepala Asrama
                        user_status = user.get("status", "PENDING")
                        if user_status == "PENDING":
                            return jsonify({"message": "Your account is still pending. Please wait for Dormitory Management approval."}), 403
                        elif user_status == "REJECTED":
                            return jsonify({"message": "Your registration request was rejected."}), 403
                        
                        # Mengirimkan response sukses beserta muatan data hak akses (SUPER_ADMIN / ADMIN) menuju localStorage React
                        return jsonify({
                            "message": "Login successful", 
                            "user"   : user["name"], 
                            "email"  : user["email"],
                            "role"   : user.get("role", "ADMIN") 
                        }), 200
                return jsonify({"message": "Invalid email or password"}), 401
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        # ENDPOINT MENERIMA DATA TELEMETRI HARDWARE DARI MIKROKONTROLER ESP32
        # Implementasi Algoritma Moving Average Buffer Tingkat Server untuk meredam noise sensor non-organik (BIN-02)
        @self.app.route('/api/trash', methods=['POST'])
        def receive_trash():
            try:
                data       = request.json
                bin_id     = data.get("bin_id")
                bin_type   = data.get("type")
                distance   = data.get("distance")

                raw_percentage = self.calculate_percentage(distance)
                existing       = self.live_status.get(bin_id)

                # --- ALGORITMA FILTERING MOVING AVERAGE (REDAM FLUKTUASI) ---
                # Memasukkan data persentase terbaru ke dalam barisan antrean array memori RAM server
                existing["last_percentages"].append(raw_percentage)
                # Batasi kapasitas penampungan array memori maksimal hanya 3 data historis terakhir
                if len(existing["last_percentages"]) > 3:
                    existing["last_percentages"].pop(0)

                # Hitung nilai rata-rata dari 3 data terakhir untuk memperoleh nilai kapasitas konstan bebas bouncing sampah botol plastik
                stable_percentage = sum(existing["last_percentages"]) / len(existing["last_percentages"])
                status_now        = self.get_status(stable_percentage)

                # Validasi pelacakan indikator kerusakan sensor ultrasonik hardware
                sensor_error = (float(distance) >= self.BIN_HEIGHT_CM and existing.get("status") == "FULL")
                if sensor_error:
                    self.send_telegram_sensor_error(bin_id, bin_type)

                # Jalankan prosedur analisis urutan pencapaian milestone & pemicu notifikasi
                self.process_milestone(bin_id, bin_type, stable_percentage, status_now)

                # Simpan metadata paling mutakhir ke dalam RAM live_status untuk dibaca antarmuka React dashboard
                self.live_status[bin_id].update({
                    "bin_id"      : bin_id,
                    "type"        : bin_type,
                    "percentage"  : round(stable_percentage, 2),
                    "status"      : status_now,
                    "created_at"  : datetime.utcnow().isoformat() + "Z",
                    "sensor_error": sensor_error
                })

                return jsonify({"message": "Data received and filtered successfully"})
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        # ENDPOINT SINKRONISASI GRAFIS: MENGAMBIL DATA METRIKS GABUNGAN (LIVE STATUS RAM + DATABASE RIWAYAT)
        @self.app.route('/api/trash', methods=['GET'])
        def get_trash():
            try:
                # Ambil 50 rekaman data riwayat sampah terbaru dari tabel Supabase
                response = self.supabase.table("trash_data").select("*").order("created_at", desc=True).limit(50).execute()
                db_data  = response.data or []

                # Ekstrak data live status dari RAM server dan hilangkan field pengolah internal agar ringan
                live_data = []
                for item in self.live_status.values():
                    clean_item = {k: v for k, v in item.items() if k not in ("sensor_error", "milestone_notified", "milestone_times", "last_percentages")}
                    live_data.append(clean_item)

                # Gabungkan data live (berada di posisi atas) dan data riwayat lampau log database
                return jsonify(live_data + db_data)
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        # ENDPOINT MANAJEMEN AKUN (1): MENGAMBIL DAFTAR USER PENDAFTAR BARU YANG BERSTATUS 'PENDING'
        @self.app.route('/api/pending-users', methods=['GET'])
        def get_pending_users():
            try:
                response = self.supabase.table("users").select("name, email, status").eq("status", "PENDING").execute()
                return jsonify(response.data), 200
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        # ENDPOINT MANAJEMEN AKUN (2): MENERIMA PERINTAH APPROVE AKUN MENJADI AKTIF ('APPROVED')
        @self.app.route('/api/approve-user', methods=['POST'])
        def approve_user():
            try:
                data   = request.json
                email  = data.get("email")
                action = data.get("action") # Berisi parameter 'APPROVED' atau 'REJECTED'
                
                if action not in ["APPROVED", "REJECTED"]:
                    return jsonify({"message": "Invalid action parameter"}), 400
                    
                self.supabase.table("users").update({"status": action}).eq("email", email).execute()
                return jsonify({"message": f"User status successfully updated to {action}"}), 200
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        # ENDPOINT MANAJEMEN AKUN (3): MENGHAPUS AKUN ADMIN SECARA PERMANEN DARI DATABASE SUPABASE
        # Diizinkan akses lewat metode POST atau DELETE agar terhindar dari pemblokiran keamanan CORS jaringan lokal browser
        @self.app.route('/api/delete-user', methods=['POST', 'DELETE'])
        def delete_user():
            try:
                data  = request.get_json(force=True, silent=True) or {}
                email = data.get("email")
                
                if not email:
                    return jsonify({"message": "Email parameter is required"}), 400
                
                # PROTEKSI UTAMA SYSTEM: Menolak perintah jika mendeteksi upaya penghapusan akun induk Kepala Asrama
                if email == "julio@gmail.com":
                    return jsonify({"message": "The main SUPER_ADMIN account cannot be deleted!"}), 400
                    
                # Hapus baris data user dari tabel users Supabase berdasarkan parameter email unik
                self.supabase.table("users").delete().eq("email", email).execute()
                return jsonify({"message": f"Account {email} has been successfully deleted"}), 200
            except Exception as e:
                print(">> ERROR delete_user:", str(e))
                return jsonify({"message": str(e)}), 500

        # Endpoint Menghapus Satu Baris Riwayat Log Kapasitas Sampah di Tabel Tabel Trash Data
        @self.app.route('/api/trash/delete/<int:data_id>', methods=['DELETE'])
        def delete_trash(data_id):
            try:
                self.supabase.table("trash_data").delete().eq("id", data_id).execute()
                return jsonify({"message": "Record deleted successfully"}), 200
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        # Endpoint Mengambil Daftar Seluruh User Admin yang Sudah Resmi Aktif (APPROVED) untuk Ditampilkan di Web
        @self.app.route('/api/admins', methods=['GET'])
        def get_admins():
            try:
                response = self.supabase.table("users").select("name, email").eq("status", "APPROVED").execute()
                return jsonify(response.data)
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        # Endpoint Menjalankan Prosedur Reset Kalibrasi RAM Data Kapasitas Kembali ke Nol (Kosong)
        @self.app.route('/api/reset', methods=['POST'])
        def reset_bin():
            try:
                data   = request.json
                bin_id = data.get("bin_id")

                self.live_status[bin_id] = {
                    "bin_id"            : bin_id,
                    "type"              : self.live_status[bin_id]["type"],
                    "percentage"        : 0,
                    "status"            : "EMPTY",
                    "created_at"        : datetime.utcnow().isoformat() + "Z",
                    "sensor_error"      : False,
                    "milestone_notified": {"EMPTY": False, "HALF": False, "FULL": False},
                    "milestone_times"   : {},
                    "last_percentages"  : []
                }
                return jsonify({"message": "Bin configuration reset complete"})
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        # Endpoint Pengujian (Mockup Data Injection) Tanpa Memerlukan Kehadiran Alat Sensor/Hardware Aktif
        @self.app.route('/api/test-sensor', methods=['GET'])
        def test_sensor():
            self.live_status["BIN-01"].update({"percentage": 92, "status": "FULL", "created_at": datetime.utcnow().isoformat() + "Z"})
            self.live_status["BIN-02"].update({"percentage": 60, "status": "HALF", "created_at": datetime.utcnow().isoformat() + "Z"})
            return jsonify({"message": "Hardware telemetry diagnostics applied successfully"})


    # =====================================================
    # JALANKAN PROSEDUR WEB SERVER FLASK (INDENTASI SEJAJAR KELAS)
    # =====================================================
    def run(self):
        print("====================================")
        print("   SMART TRASH BIN SERVER RUNNING   ")
        print("   HOST : 0.0.0.0                   ")
        print("   PORT : 5000                      ")
        print("====================================")
        # Menjalankan server pada jaringan lokal (0.0.0.0) agar dapat ditembak langsung oleh IP ESP32 Anda
        self.app.run(host='0.0.0.0', port=5000, debug=True)


# =========================================================
# TITIK MASUK EKSEKUSI PROGRAM UTAMA (MAIN VECTOR)
# =========================================================
server = SmartBinAPI()
app    = server.app

if __name__ == '__main__':
    # Memanggil method untuk menjalankan server Flask secara penuh
    server.run()