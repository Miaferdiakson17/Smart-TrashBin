# =========================================================
# IMPORT LIBRARY YANG DIBUTUHKAN
# =========================================================
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from datetime import datetime
import requests
import os

# =========================================================
# KELAS UTAMA APLIKASI SMART TRASH BIN
# =========================================================
class SmartBinAPI:

    def __init__(self):
        self.app = Flask(__name__)

        CORS(self.app,
             resources={r"/api/*": {"origins": "*"}},
             allow_headers=["Content-Type", "Authorization"],
             methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

        @self.app.after_request
        def after_request(response):
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
            response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
            response.headers['Access-Control-Max-Age'] = '3600'
            return response

        # =================================================
        # KONFIGURASI SUPABASE & TELEGRAM
        # =================================================
        self.SUPABASE_URL       = os.environ.get("SUPABASE_URL", "https://hjxdtogcfmutvjcxgkja.supabase.co")
        self.SUPABASE_KEY       = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqeGR0b2djZm11dHZqY3hna2phIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MT75MzE5MjIzLCJleHAiOjIwOTA4OTUyMjNfQ.O45SYx9xpu10Vv1e0TGYC5fGLnB1shy67R8wrPW9tq0")
        self.TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "8787423520:AAFGtFj-SVl17DablQKwYMR1ecvS1_GEDII")
        self.TELEGRAM_CHAT_ID   = os.environ.get("TELEGRAM_CHAT_ID", "-1003824268641")

        # =================================================
        # [v2.5] TINGGI TONG = 20 CM
        # =================================================
        self.BIN_HEIGHT_CM = 20

        self.supabase = None
        self._init_supabase()

        self.live_status = {
            "BIN-01": {
                "bin_id"            : "BIN-01",
                "type"              : "Organic",
                "percentage"        : 0,
                "status"            : "EMPTY",
                "created_at"        : None,
                "sensor_error"      : False,
                "milestone_notified": {"EMPTY": False, "HALF": False, "FULL": False},
                "milestone_times"   : {}
            },
            "BIN-02": {
                "bin_id"            : "BIN-02",
                "type"              : "Non-Organic",
                "percentage"        : 0,
                "status"            : "EMPTY",
                "created_at"        : None,
                "sensor_error"      : False,
                "milestone_notified": {"EMPTY": False, "HALF": False, "FULL": False},
                "milestone_times"   : {}
            }
        }

        self.setup_routes()

    # =====================================================
    # INISIALISASI SUPABASE
    # =====================================================
    def _init_supabase(self):
        try:
            print("\n====================================")
            print("   INITIALIZING SUPABASE CONNECTION")
            print("====================================")
            self.supabase = create_client(self.SUPABASE_URL, self.SUPABASE_KEY)
            response = self.supabase.table("users").select("*").limit(1).execute()
            print("✅ SUPABASE CONNECTED SUCCESSFULLY")
            print("====================================\n")
            return True
        except Exception as e:
            print(f"❌ SUPABASE CONNECTION FAILED: {str(e)}")
            self.supabase = None
            return False

    # =====================================================
    # [v2.5] RUMUS HITUNG PERSENTASE
    # =====================================================
    def calculate_percentage(self, distance):
        try:
            dist    = float(distance)
            percent = ((self.BIN_HEIGHT_CM - dist) / self.BIN_HEIGHT_CM) * 100
            return max(0, min(100, percent))
        except:
            return 0

    # =====================================================
    # [v2.5] STATUS BERDASARKAN PERSENTASE
    # =====================================================
    def get_status(self, percent):
        if percent >= 80:
            return "FULL"
        elif percent >= 30:
            return "HALF"
        else:
            return "EMPTY"

    # =====================================================
    # [v2.5] MILESTONE DISINKRONKAN DENGAN get_status()
    # =====================================================
    def get_milestone(self, percent):
        if percent >= 80:
            return "FULL"
        elif percent >= 30:
            return "HALF"
        else:
            return "EMPTY"

    # =====================================================
    # ESTIMASI JAM SAMPAI PENUH
    # =====================================================
    def estimate_hours_to_full(self, bin_id, current_percent):
        times = self.live_status[bin_id]["milestone_times"]
        if len(times) < 2:
            return None

        sorted_milestones      = sorted(times.items(), key=lambda x: x[1])
        first_name, first_time = sorted_milestones[0]
        last_name,  last_time  = sorted_milestones[-1]

        milestone_percent = {"EMPTY": 0, "HALF": 55, "FULL": 90}

        persen_awal  = milestone_percent.get(first_name, 0)
        persen_akhir = milestone_percent.get(last_name, current_percent)
        delta_jam    = (last_time - first_time).total_seconds() / 3600

        if delta_jam <= 0 or (persen_akhir - persen_awal) <= 0:
            return None

        rate_per_jam = (persen_akhir - persen_awal) / delta_jam
        return round((100 - current_percent) / rate_per_jam, 1)

    # =====================================================
    # SIMPAN DATA KE SUPABASE
    # =====================================================
    def save_to_database(self, data):
        if not self.supabase:
            print(">> WARNING: Supabase not connected, skipping database save")
            return False
        try:
            self.supabase.table("trash_data").insert(data).execute()
            print(f">> DB Saved: {data.get('bin_id')} | {data.get('status')} | {data.get('percentage')}%")
            return True
        except Exception as e:
            print(">> ERROR save_to_database:", e)
            return False

    # =====================================================
    # KIRIM NOTIFIKASI TELEGRAM
    # =====================================================
    def _send_telegram(self, message):
        try:
            url = f"https://api.telegram.org/bot{self.TELEGRAM_BOT_TOKEN}/sendMessage"
            requests.post(url, data={"chat_id": self.TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}, timeout=5)
        except Exception as e:
            print(">> ERROR _send_telegram:", e)

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
    # LOGIKA MILESTONE ANTI-SPAM NOTIFIKASI
    # =====================================================
    def process_milestone(self, bin_id, bin_type, percentage, status_now):
        existing  = self.live_status[bin_id]
        notified  = existing["milestone_notified"]
        times     = existing["milestone_times"]
        now       = datetime.utcnow()
        milestone = self.get_milestone(percentage)

        if not milestone:
            return

        if notified.get(milestone) is True:
            return

        times[milestone] = now
        est_hours = self.estimate_hours_to_full(bin_id, percentage)

        self.save_to_database({
            "bin_id"           : bin_id,
            "type"             : bin_type,
            "percentage"       : round(percentage, 2),
            "status"           : milestone,
            "est_hours_to_full": est_hours
        })

        if milestone == "EMPTY":
            self.send_telegram_empty(bin_id, bin_type, percentage)
            existing["milestone_notified"] = {"EMPTY": True, "HALF": False, "FULL": False}
            existing["milestone_times"]    = {}
            return
        elif milestone == "HALF":
            self.send_telegram_half(bin_id, bin_type, percentage, est_hours)
            notified["EMPTY"] = False
        elif milestone == "FULL":
            self.send_telegram_full(bin_id, bin_type, percentage)

        notified[milestone] = True

    # =====================================================
    # SETUP ROUTES / ENDPOINT API
    # =====================================================
    def setup_routes(self):

        @self.app.route('/')
        def home():
            return jsonify({
                "message" : "Smart Trash Bin Backend is Running",
                "status"  : "online",
                "database": "connected" if self.supabase else "disconnected"
            })

        @self.app.route('/api/signup', methods=['POST'])
        def signup():
            if not self.supabase:
                return jsonify({"message": "Database connection error. Please try again later."}), 503
            try:
                data     = request.json
                name     = data.get("name")
                email    = data.get("email")
                password = data.get("password")

                existing = self.supabase.table("users").select("*").eq("email", email).execute()
                if existing.data:
                    return jsonify({"message": "Email is already registered"}), 400

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

        @self.app.route('/api/login', methods=['POST'])
        def login():
            if not self.supabase:
                return jsonify({"message": "Database connection error. Please try again later."}), 503
            try:
                data     = request.json
                email    = data.get("email")
                password = data.get("password")

                response = self.supabase.table("users").select("*").eq("email", email).execute()

                if response.data:
                    user        = response.data[0]
                    user_status = user.get("status", "PENDING")

                    if str(user["password"]) == str(password):
                        if user_status == "PENDING":
                            return jsonify({"message": "Your account is still pending. Please wait for Dormitory Management approval."}), 403
                        elif user_status == "REJECTED":
                            return jsonify({"message": "Your registration request was rejected."}), 403

                        return jsonify({
                            "message": "Login successful",
                            "user"   : user["name"],
                            "email"  : user["email"],
                            "role"   : user.get("role", "ADMIN")
                        }), 200

                return jsonify({"message": "Invalid email or password"}), 401
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        # =====================================================
        # ENDPOINT EDIT PROFIL ADMIN (VERSI PROTEKSI AMAN KEPALA ASRAMA)
        # =====================================================
        @self.app.route('/api/update-profile', methods=['PUT', 'OPTIONS'])
        def update_profile():
            if request.method == 'OPTIONS':
                return jsonify({"message": "Preflight OK"}), 200

            if not self.supabase:
                return jsonify({"message": "Database connection error. Please try again later."}), 503
            try:
                data          = request.json
                current_email = data.get("current_email") 
                new_name      = data.get("name")
                new_email     = data.get("new_email")
                new_password  = data.get("password")

                if not current_email:
                    return jsonify({"message": "Current email parameter is required"}), 400

                # 🛑 PROTEKSI UTAMA: Akun utama kepala asrama tidak boleh diganti emailnya lewat endpoint umum
                if current_email == "julio@gmail.com" and new_email and new_email != "julio@gmail.com":
                    return jsonify({"message": "Protected account! Changing Kepala Asrama email is prohibited via API."}), 403

                user_check = self.supabase.table("users").select("*").eq("email", current_email).execute()
                if not user_check.data:
                    return jsonify({"message": "User not found"}), 404

                update_data = {}
                if new_name:
                    update_data["name"] = new_name
                if new_password:
                    update_data["password"] = new_password

                if new_email and new_email != current_email:
                    email_check = self.supabase.table("users").select("*").eq("email", new_email).execute()
                    if email_check.data:
                        return jsonify({"message": "The new email is already registered by another account"}), 400
                    update_data["email"] = new_email

                if not update_data:
                    return jsonify({"message": "No data provided to update"}), 400

                self.supabase.table("users").update(update_data).eq("email", current_email).execute()

                return jsonify({
                    "message": "Profile updated successfully!",
                    "updated_fields": list(update_data.keys())
                }), 200

            except Exception as e:
                print(f">> ERROR update_profile: {str(e)}")
                return jsonify({"message": str(e)}), 500

        # =====================================================
        # [v2.5] ENDPOINT TERIMA DATA DARI ESP32
        # =====================================================
        @self.app.route('/api/trash', methods=['POST'])
        def receive_trash():
            try:
                data     = request.json
                bin_id   = data.get("bin_id")
                bin_type = data.get("type")
                distance = data.get("distance")

                print(f"\n>> DATA MASUK  : bin_id={bin_id} | type={bin_type} | distance={distance} cm")

                existing = self.live_status.get(bin_id)
                if not existing:
                    return jsonify({"message": "Invalid bin_id"}), 400

                percentage = self.calculate_percentage(distance)
                status_now = self.get_status(percentage)

                print(f">> PERCENTAGE  : {round(percentage, 2)}%")
                print(f">> STATUS      : {status_now}")

                sensor_error = (float(distance) >= self.BIN_HEIGHT_CM and existing.get("status") == "FULL")
                if sensor_error:
                    self.send_telegram_sensor_error(bin_id, bin_type)

                self.process_milestone(bin_id, bin_type, percentage, status_now)

                self.live_status[bin_id].update({
                    "bin_id"      : bin_id,
                    "type"        : bin_type,
                    "percentage"  : round(percentage, 2),
                    "status"      : status_now,
                    "created_at"  : datetime.utcnow().isoformat() + "Z",
                    "sensor_error": sensor_error
                })

                return jsonify({
                    "message"   : "Data received successfully",
                    "bin_id"    : bin_id,
                    "percentage": round(percentage, 2),
                    "status"    : status_now
                })

            except Exception as e:
                print(f">> ERROR receive_trash: {str(e)}")
                return jsonify({"message": str(e)}), 500

        @self.app.route('/api/trash', methods=['GET'])
        def get_trash():
            if not self.supabase:
                return jsonify({"message": "Database connection error. Please try again later."}), 503
            try:
                response = self.supabase.table("trash_data").select("*").order("created_at", desc=True).limit(50).execute()
                db_data  = response.data or []

                live_data = []
                for item in self.live_status.values():
                    clean_item = {k: v for k, v in item.items() if k not in ("sensor_error", "milestone_notified", "milestone_times")}
                    live_data.append(clean_item)

                return jsonify(live_data + db_data)
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        @self.app.route('/api/pending-users', methods=['GET'])
        def get_pending_users():
            if not self.supabase:
                return jsonify({"message": "Database connection error. Please try again later."}), 503
            try:
                response = self.supabase.table("users").select("name, email, status").eq("status", "PENDING").execute()
                return jsonify(response.data), 200
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        @self.app.route('/api/approve-user', methods=['POST'])
        def approve_user():
            if not self.supabase:
                return jsonify({"message": "Database connection error. Please try again later."}), 503
            try:
                data   = request.json
                email  = data.get("email")
                action = data.get("action")

                if action not in ["APPROVED", "REJECTED"]:
                    return jsonify({"message": "Invalid action parameter"}), 400

                self.supabase.table("users").update({"status": action}).eq("email", email).execute()
                return jsonify({"message": f"User status successfully updated to {action}"}), 200
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        @self.app.route('/api/delete-user', methods=['POST', 'DELETE'])
        def delete_user():
            if not self.supabase:
                return jsonify({"message": "Database connection error. Please try again later."}), 503
            try:
                data  = request.get_json(force=True, silent=True) or {}
                email = data.get("email")

                if not email:
                    return jsonify({"message": "Email parameter is required"}), 400

                if email == "julio@gmail.com":
                    return jsonify({"message": "The main KEPALA_ASRAMA account cannot be deleted!"}), 400

                self.supabase.table("users").delete().eq("email", email).execute()
                return jsonify({"message": f"Account {email} has been successfully deleted"}), 200
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        @self.app.route('/api/trash/delete/<int:data_id>', methods=['DELETE'])
        def delete_trash(data_id):
            if not self.supabase:
                return jsonify({"message": "Database connection error. Please try again later."}), 503
            try:
                self.supabase.table("trash_data").delete().eq("id", data_id).execute()
                return jsonify({"message": "Record deleted successfully"}), 200
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        @self.app.route('/api/admins', methods=['GET'])
        def get_admins():
            if not self.supabase:
                return jsonify({"message": "Database connection error. Please try again later."}), 503
            try:
                response = self.supabase.table("users").select("name, email").eq("status", "APPROVED").execute()
                return jsonify(response.data)
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        @self.app.route('/api/reset', methods=['POST'])
        def reset_bin():
            try:
                data   = request.json
                bin_id = data.get("bin_id")

                if bin_id not in self.live_status:
                    return jsonify({"message": "Invalid bin_id"}), 400

                self.live_status[bin_id] = {
                    "bin_id"            : bin_id,
                    "type"              : self.live_status[bin_id]["type"],
                    "percentage"        : 0,
                    "status"            : "EMPTY",
                    "created_at"        : datetime.utcnow().isoformat() + "Z",
                    "sensor_error"      : False,
                    "milestone_notified": {"EMPTY": False, "HALF": False, "FULL": False},
                    "milestone_times"   : {}
                }
                return jsonify({"message": "Bin configuration reset complete"})
            except Exception as e:
                return jsonify({"message": str(e)}), 500

        @self.app.route('/api/test-sensor', methods=['GET'])
        def test_sensor():
            self.live_status["BIN-01"].update({"percentage": 92, "status": "FULL", "created_at": datetime.utcnow().isoformat() + "Z"})
            self.live_status["BIN-02"].update({"percentage": 55, "status": "HALF", "created_at": datetime.utcnow().isoformat() + "Z"})
            return jsonify({"message": "Hardware telemetry diagnostics applied successfully"})

    # =====================================================
    # JALANKAN SERVER FLASK
    # =====================================================
    def run(self):
        print("\n====================================")
        print("   SMART TRASH BIN SERVER RUNNING   ")
        print("   HOST : 0.0.0.0                  ")
        print("   PORT : 5000                      ")
        print("====================================\n")
        self.app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)


# =========================================================
# MAIN EXECUTION
# =========================================================
server = SmartBinAPI()
app    = server.app

if __name__ == '__main__':
    server.run()