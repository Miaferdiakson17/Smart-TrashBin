# =========================================================
# IMPORT LIBRARY
# =========================================================
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from datetime import datetime
import requests

# =========================================================
# CLASS SMART TRASH BIN API
# =========================================================
class SmartBinAPI:

    def __init__(self):

        # =================================================
        # INIT FLASK
        # =================================================
        self.app = Flask(__name__)

        CORS(
            self.app,
            resources={r"/api/*": {"origins": "*"}}
        )

        # =================================================
        # SUPABASE CONFIG
        # =================================================
        self.SUPABASE_URL = "https://hjxdtogcfmutvjcxgkja.supabase.co"

        self.SUPABASE_KEY = "sb_publishable_sr2aTuvxjvfJYsXkGBuW7w_4o7-UVTt"

        # =================================================
        # TELEGRAM CONFIG
        # =================================================
        self.TELEGRAM_BOT_TOKEN = "ISI_BOT_TOKEN"

        self.TELEGRAM_CHAT_ID = "ISI_CHAT_ID"

        # =================================================
        # TINGGI TONG
        # =================================================
        self.TINGGI_TONG = 30

        # =================================================
        # CONNECT SUPABASE
        # =================================================
        try:

            self.supabase: Client = create_client(
                self.SUPABASE_URL,
                self.SUPABASE_KEY
            )

            print("====================================")
            print("SUPABASE CONNECTED SUCCESSFULLY")
            print("====================================")

        except Exception as e:

            print("FAILED CONNECT SUPABASE")
            print(e)

        # =================================================
        # LIVE STATUS
        # =================================================
        self.live_status = {

            "BIN-01": {
                "bin_id": "BIN-01",
                "type": "Organik",
                "percentage": 0,
                "status": "kosong",
                "created_at": None,
                "penuh_saved": False,
                "sensor_error": False
            },

            "BIN-02": {
                "bin_id": "BIN-02",
                "type": "Non-Organik",
                "percentage": 0,
                "status": "kosong",
                "created_at": None,
                "penuh_saved": False,
                "sensor_error": False
            }
        }

        self.setup_routes()

    # =====================================================
    # HITUNG PERSENTASE
    # =====================================================
    def calculate_percentage(self, distance):

        try:

            dist = float(distance)

            percent = (
                1 - (dist / self.TINGGI_TONG)
            ) * 100

            return max(0, min(100, percent))

        except:

            return 0

    # =====================================================
    # STATUS TEMPAT SAMPAH
    # =====================================================
    def get_status(self, percent):

        if percent < 30:
            return "kosong"

        elif percent < 80:
            return "setengah"

        else:
            return "penuh"

    # =====================================================
    # SAVE DATABASE
    # =====================================================
    def save_to_database(self, data):

        try:

            self.supabase.table(
                "trash_data"
            ).insert(data).execute()

            print("DATA BERHASIL DISIMPAN")

            return True

        except Exception as e:

            print("GAGAL SAVE:", e)

            return False

    # =====================================================
    # TELEGRAM FULL
    # =====================================================
    def send_telegram(self, bin_id, bin_type, percentage):

        try:

            waktu = datetime.now().strftime(
                "%d-%m-%Y %H:%M:%S"
            )

            pesan = (
                f"🚨 TEMPAT SAMPAH PENUH!\n\n"
                f"🗑️ ID : {bin_id}\n"
                f"📂 Jenis : {bin_type}\n"
                f"📊 Kapasitas : {round(percentage)}%\n"
                f"🕐 Waktu : {waktu}"
            )

            url = (
                f"https://api.telegram.org/bot"
                f"{self.TELEGRAM_BOT_TOKEN}/sendMessage"
            )

            requests.post(
                url,
                data={
                    "chat_id": self.TELEGRAM_CHAT_ID,
                    "text": pesan
                },
                timeout=5
            )

            print("TELEGRAM BERHASIL")

        except Exception as e:

            print("ERROR TELEGRAM:", e)

    # =====================================================
    # TELEGRAM SENSOR ERROR
    # =====================================================
    def send_telegram_sensor_error(self, bin_id, bin_type):

        try:

            waktu = datetime.now().strftime(
                "%d-%m-%Y %H:%M:%S"
            )

            pesan = (
                f"⚠️ SENSOR ERROR!\n\n"
                f"🗑️ ID : {bin_id}\n"
                f"📂 Jenis : {bin_type}\n"
                f"🔌 Sensor Bermasalah\n"
                f"🕐 Waktu : {waktu}"
            )

            url = (
                f"https://api.telegram.org/bot"
                f"{self.TELEGRAM_BOT_TOKEN}/sendMessage"
            )

            requests.post(
                url,
                data={
                    "chat_id": self.TELEGRAM_CHAT_ID,
                    "text": pesan
                },
                timeout=5
            )

        except Exception as e:

            print("ERROR SENSOR:", e)

    # =====================================================
    # ROUTES
    # =====================================================
    def setup_routes(self):

        # =================================================
        # HOME
        # =================================================
        @self.app.route('/')
        def home():

            return jsonify({
                "message": "Smart Trash Bin Backend Running"
            })

        # =================================================
        # SIGNUP
        # =================================================
        @self.app.route('/api/signup', methods=['POST'])
        def signup():

            try:

                data = request.json

                name = data.get("name")
                email = data.get("email")
                password = data.get("password")

                check_user = self.supabase.table(
                    "users"
                ).select("*").eq(
                    "email",
                    email
                ).execute()

                if check_user.data:

                    return jsonify({
                        "message": "Email sudah digunakan"
                    }), 400

                self.supabase.table(
                    "users"
                ).insert({
                    "name": name,
                    "email": email,
                    "password": password
                }).execute()

                return jsonify({
                    "message": "success"
                }), 201

            except Exception as e:

                return jsonify({
                    "message": str(e)
                }), 500

        # =================================================
        # LOGIN
        # =================================================
        @self.app.route('/api/login', methods=['POST'])
        def login():

            try:

                data = request.json

                email = data.get("email")
                password = data.get("password")

                response = self.supabase.table(
                    "users"
                ).select("*").eq(
                    "email",
                    email
                ).execute()

                if response.data:

                    user = response.data[0]

                    if str(user["password"]) == str(password):

                        return jsonify({
                            "message": "success",
                            "user": user["name"],
                            "email": user["email"]
                        }), 200

                return jsonify({
                    "message": "Email atau password salah"
                }), 401

            except Exception as e:

                return jsonify({
                    "message": str(e)
                }), 500

        # =================================================
        # RECEIVE DATA ESP32
        # =================================================
        @self.app.route('/api/trash', methods=['POST'])
        def receive_trash():

            try:

                data = request.json

                bin_id = data.get("bin_id")
                bin_type = data.get("type")
                distance = data.get("distance")

                percentage = self.calculate_percentage(
                    distance
                )

                status_now = self.get_status(
                    percentage
                )

                existing = self.live_status.get(
                    bin_id
                )

                penuh_saved = existing.get(
                    "penuh_saved",
                    False
                )

                # =========================================
                # SENSOR ERROR
                # =========================================
                sensor_error = (
                    float(distance) >= self.TINGGI_TONG
                    and existing.get("status") == "penuh"
                )

                if sensor_error:

                    self.send_telegram_sensor_error(
                        bin_id,
                        bin_type
                    )

                # =========================================
                # SAVE ONLY FIRST FULL
                # =========================================
                if status_now == "penuh" and not penuh_saved:

                    self.save_to_database({
                        "bin_id": bin_id,
                        "type": bin_type,
                        "percentage": round(
                            percentage,
                            2
                        ),
                        "status": status_now
                    })

                    self.send_telegram(
                        bin_id,
                        bin_type,
                        percentage
                    )

                    penuh_saved = True

                elif status_now != "penuh":

                    penuh_saved = False

                # =========================================
                # UPDATE LIVE STATUS
                # =========================================
                self.live_status[bin_id] = {

                    "bin_id": bin_id,
                    "type": bin_type,
                    "percentage": round(
                        percentage,
                        2
                    ),
                    "status": status_now,
                    "created_at":
                        datetime.utcnow().isoformat() + "Z",
                    "penuh_saved": penuh_saved,
                    "sensor_error": False
                }

                return jsonify({
                    "message": "success"
                })

            except Exception as e:

                return jsonify({
                    "message": str(e)
                }), 500

        # =================================================
        # GET TRASH DATA
        # =================================================
        @self.app.route('/api/trash', methods=['GET'])
        def get_trash():

            try:

                response = self.supabase.table(
                    "trash_data"
                ).select("*").order(
                    "created_at",
                    desc=True
                ).limit(50).execute()

                db_data = response.data or []

                live_data = []

                for item in self.live_status.values():

                    clean = {
                        k: v for k, v in item.items()
                        if k not in (
                            "penuh_saved",
                            "sensor_error"
                        )
                    }

                    live_data.append(clean)

                return jsonify(
                    live_data + db_data
                )

            except Exception as e:

                return jsonify({
                    "message": str(e)
                }), 500

        # =================================================
        # DELETE DATA
        # =================================================
        @self.app.route(
            '/api/trash/delete/<int:data_id>',
            methods=['DELETE']
        )
        def delete_trash(data_id):

            try:

                self.supabase.table(
                    "trash_data"
                ).delete().eq(
                    "id",
                    data_id
                ).execute()

                print(f"DATA {data_id} BERHASIL DIHAPUS")

                return jsonify({
                    "message": "Data berhasil dihapus"
                }), 200

            except Exception as e:

                print("DELETE ERROR:", e)

                return jsonify({
                    "message": str(e)
                }), 500

        # =================================================
        # GET ADMINS
        # =================================================
        @self.app.route('/api/admins', methods=['GET'])
        def get_admins():

            try:

                response = self.supabase.table(
                    "users"
                ).select(
                    "name, email"
                ).execute()

                return jsonify(
                    response.data
                )

            except Exception as e:

                return jsonify({
                    "message": str(e)
                }), 500

        # =================================================
        # RESET BIN
        # =================================================
        @self.app.route('/api/reset', methods=['POST'])
        def reset_bin():

            try:

                data = request.json

                bin_id = data.get("bin_id")

                self.live_status[bin_id] = {

                    "bin_id": bin_id,
                    "type": self.live_status[bin_id]["type"],
                    "percentage": 0,
                    "status": "kosong",
                    "created_at":
                        datetime.utcnow().isoformat() + "Z",
                    "penuh_saved": False,
                    "sensor_error": False
                }

                return jsonify({
                    "message": "reset_success"
                })

            except Exception as e:

                return jsonify({
                    "message": str(e)
                }), 500

        # =================================================
        # TEST SENSOR
        # =================================================
        @self.app.route('/api/test-sensor', methods=['GET'])
        def test_sensor():

            self.live_status["BIN-01"] = {

                "bin_id": "BIN-01",
                "type": "Organik",
                "percentage": 85,
                "status": "penuh",
                "created_at":
                    datetime.utcnow().isoformat() + "Z",
                "penuh_saved": False,
                "sensor_error": False
            }

            self.live_status["BIN-02"] = {

                "bin_id": "BIN-02",
                "type": "Non-Organik",
                "percentage": 50,
                "status": "setengah",
                "created_at":
                    datetime.utcnow().isoformat() + "Z",
                "penuh_saved": False,
                "sensor_error": False
            }

            return jsonify({
                "message": "success"
            })

    # =====================================================
    # RUN SERVER
    # =====================================================
    def run(self):

        print("====================================")
        print("SMART TRASH BIN SERVER RUNNING")
        print("PORT : 5000")
        print("====================================")

        self.app.run(
            host='0.0.0.0',
            port=5000,
            debug=True
        )

# =========================================================
# JALANKAN SERVER
# =========================================================
server = SmartBinAPI()

app = server.app

if __name__ == '__main__':
    server.run()