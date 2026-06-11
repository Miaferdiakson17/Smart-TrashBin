// ============================================================
// SMART TRASH BIN IoT SYSTEM - DUAL BIN VERSION v2.5
// ============================================================
// FITUR:
// 1. Dual tempat sampah (Organik & Non-Organik)
// 2. Auto buka tutup menggunakan servo
// 3. Monitoring kapasitas sampah
// 4. Koneksi Wi-Fi ESP32
// 5. Kirim data JSON ke Backend Flask
// 6. Data dikirim jika status berubah ATAU setiap 30 detik
// 7. Anti spam database
// 8. Monitoring realtime Serial Monitor
// 9. Deteksi sensor dicabut / error
// 10. Pull-down semua pin echo untuk stabilitas
// 11. [v2.3] Pin sensor organik dipindah ke 22 & 21
// 12. [v2.3] Saat sensor error, kirim 0% ke backend
//           agar data lama tidak menggantung di server
// 13. [v2.4] tinggiTong disesuaikan tong 10 liter = 20 cm
// 14. [v2.4] Threshold kategori disinkronkan dengan backend:
//           KOSONG < 30% | SETENGAH 30-79% | PENUH >= 80%
// 15. [v2.4] Kirim data berkala setiap 30 detik
// 16. [v2.5] INTEGRASI LED INDIKATOR (Merah = Penuh, Hijau = Aman)
// ============================================================


// ============================================================
// IMPORT LIBRARY
// ============================================================

#include <WiFi.h>
#include <ESP32Servo.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>


// ============================================================
// KONFIGURASI WIFI
// ============================================================

const char* ssid     = "realme C65 i2mr";
const char* password = "achon900";


// ============================================================
// URL BACKEND FLASK
// ============================================================

const char* serverUrl = "https://trushbin.my.id/api/trash";


// ============================================================
// PIN TEMPAT SAMPAH ORGANIK
// ============================================================

// Pin servo organik
#define SERV_ORG   18

// Sensor tangan organik
#define T_OBJ_ORG   4
#define E_OBJ_ORG   5

// Sensor volume organik
#define T_VOL_ORG  22
#define E_VOL_ORG  21


// [v2.5] LED Indikator Organik
#define LED_ORG_MERAH  23  // Menyala saat penuh
#define LED_ORG_HIJAU  15   // Menyala saat kOW

// Tambahkan di bagian atas, setelah #define pin
//#define LED_ON  LOW   // Active LOW: nyala = L
//#define LED_OFF HIGH  // Active LOW: mati  = HIGH
// Ganti define LED_ON / LED_OFF dengan fungsi ini

void setLED(int pin, bool nyala) {
  if (nyala) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);   // Nyalakan
  } else {
    pinMode(pin, INPUT);      // Benar-benar putus, tidak ada arus bocor
  }
}

// ============================================================
// PIN TEMPAT SAMPAH NON-ORGANIK
// ============================================================

// Pin servo non-organik
#define SERV_NON   19

// Sensor tangan non-organik
#define T_OBJ_NON  27
#define E_OBJ_NON  32

// Sensor volume non-organik
#define T_VOL_NON  33
#define E_VOL_NON  35

// [v2.5] LED Indikator Non-Organik
#define LED_NON_MERAH  14  // Menyala saat penuh
#define LED_NON_HIJAU  12  // Menyala saat kosong/setengah


// ============================================================
// PARAMETER SISTEM
// ============================================================

const int tinggiTong = 20;
const int jarakBuka = 20;
const long waktuTunggu = 5000;
const int batasValidSensor = 200;
const long intervalKirim = 30000;


// ============================================================
// OBJECT SERVO
// ============================================================

Servo servoOrg;
Servo servoNon;


// ============================================================
// STATUS SERVO
// ============================================================

unsigned long waktuBukaOrg = 0;
bool isOpenOrg = false;

unsigned long waktuBukaNon = 0;
bool isOpenNon = false;


// ============================================================
// TIMER SERIAL MONITOR & KIRIM DATA
// ============================================================

unsigned long lastSerialPrint = 0;
unsigned long lastKirimData = 0;


// ============================================================
// STATUS TERAKHIR TEMPAT SAMPAH
// ============================================================

String lastStatusOrg = "";
String lastStatusNon = "";


// ============================================================
// STATUS ERROR SENSOR
// ============================================================

bool errorSensorOrg = false;
bool errorSensorNon = false;

bool sudahKirimResetOrg = false;
bool sudahKirimResetNon = false;


// ============================================================
// FUNGSI MEMBACA JARAK SENSOR ULTRASONIC
// ============================================================
int bacaJarak(int trigPin, int echoPin) {

  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);

  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);

  if (duration == 0) {
    return batasValidSensor;
  }

  int jarak = duration * 0.034 / 2;

  return jarak;
}


// ============================================================
// FUNGSI CEK APAKAH SENSOR VALID
// ============================================================
bool sensorValid(int jarak) {
  return (jarak > 0 && jarak < batasValidSensor);
}


// ============================================================
// FUNGSI KONEKSI WIFI
// ============================================================
void setupWiFi() {

  Serial.println();
  Serial.println("====================================");
  Serial.println("MENGHUBUNGKAN WIFI...");
  Serial.println("====================================");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("====================================");
  Serial.println("WIFI BERHASIL TERHUBUNG");
  Serial.print("IP ESP32 : ");
  Serial.println(WiFi.localIP());
  Serial.println("====================================");
}


// ============================================================
// FUNGSI MENGHITUNG STATUS TEMPAT SAMPAH
// ============================================================
String hitungKategori(int persen) {

  if (persen >= 80) return "PENUH";
  if (persen >= 30) return "SETENGAH";
  return "KOSONG";
}


// ============================================================
// FUNGSI MENGIRIM DATA KE BACKEND
// ============================================================
void kirimDataKeBackend(String binId, String type, int percentage) {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] WIFI TERPUTUS!");
    return;
  }

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["bin_id"]   = binId;
  doc["type"]     = type;
  doc["distance"] = (tinggiTong - (percentage * tinggiTong / 100));

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int responseCode = http.POST(jsonPayload);

  if (responseCode > 0) {
    Serial.println();
    Serial.println("=========== HTTP SUCCESS ===========");
    Serial.print("BIN ID     : "); Serial.println(binId);
    Serial.print("TYPE       : "); Serial.println(type);
    Serial.print("PERCENTAGE : "); Serial.print(percentage); Serial.println("%");
    Serial.print("RESPONSE   : "); Serial.println(responseCode);
    Serial.println("====================================");
  } else {
    Serial.println();
    Serial.println("=========== HTTP FAILED ============");
    Serial.print("ERROR : ");
    Serial.println(http.errorToString(responseCode));
    Serial.println("====================================");
  }

  http.end();
}


// ============================================================
// SETUP AWAL ESP32
// ============================================================
void setup() {

  Serial.begin(115200);

  // ==========================================================
  // SETUP PIN SENSOR ORGANIK
  // ==========================================================
  pinMode(T_OBJ_ORG, OUTPUT);
  pinMode(E_OBJ_ORG, INPUT_PULLDOWN);

  pinMode(T_VOL_ORG, OUTPUT);
  pinMode(E_VOL_ORG, INPUT_PULLDOWN);


  // ==========================================================
  // SETUP PIN SENSOR NON-ORGANIK
  // ==========================================================
  pinMode(T_OBJ_NON, OUTPUT);
  pinMode(E_OBJ_NON, INPUT_PULLDOWN);

  pinMode(T_VOL_NON, OUTPUT);
  pinMode(E_VOL_NON, INPUT_PULLDOWN);


  // ==========================================================
  // [v2.5] SETUP PIN LED INDIKATOR
  // ==========================================================
  pinMode(LED_ORG_MERAH, OUTPUT);
  pinMode(LED_ORG_HIJAU, OUTPUT);
  pinMode(LED_NON_MERAH, OUTPUT);
  pinMode(LED_NON_HIJAU, OUTPUT);


  // ==========================================================
  // SETUP PWM SERVO
  // ==========================================================
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);

  servoOrg.setPeriodHertz(50);
  servoNon.setPeriodHertz(50);

  servoOrg.attach(SERV_ORG, 500, 2400);
  servoNon.attach(SERV_NON, 500, 2400);


  // ==========================================================
  // POSISI AWAL SERVO
  // ==========================================================
  servoOrg.write(120);
  servoNon.write(120);

  delay(1000);

  Serial.println();
  Serial.println("====================================");
  Serial.println("SMART TRASH BIN SYSTEM ONLINE");
  Serial.println("DUAL BIN VERSION v2.5 + LED");
  Serial.println("====================================");

  setupWiFi();
}


// ============================================================
// LOOP UTAMA
// ============================================================
void loop() {

  if (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(ssid, password);
  }

  unsigned long now = millis();


  // ==========================================================
  // ====== TEMPAT SAMPAH ORGANIK ======
  // ==========================================================

  int dObjOrg = bacaJarak(T_OBJ_ORG, E_OBJ_ORG);
  delay(40);

  int dVolOrg = bacaJarak(T_VOL_ORG, E_VOL_ORG);
  delay(40);

  int persenOrg = 0;

  if (!sensorValid(dVolOrg)) {
    errorSensorOrg = true;
    persenOrg = 0;

    Serial.println("[WARNING] SENSOR VOLUME ORGANIK ERROR / DICABUT!");

    if (!sudahKirimResetOrg) {
      Serial.println("[INFO] RESET DATA ORGANIK KE BACKEND...");
      kirimDataKeBackend("BIN-01", "Organik", 0);
      sudahKirimResetOrg = true;
      lastStatusOrg = "ERROR";
    }
  } else {
    errorSensorOrg = false;
    sudahKirimResetOrg = false;

    if (dVolOrg > tinggiTong) dVolOrg = tinggiTong;
    persenOrg = ((float)(tinggiTong - dVolOrg) / tinggiTong) * 100;
    if (persenOrg < 0) persenOrg = 0;
  }


  // ==========================================================
  // LOGIKA SERVO ORGANIK
  // ==========================================================

  if (!isOpenOrg && !errorSensorOrg && persenOrg < 80 && dObjOrg <= jarakBuka) {
    Serial.println();
    Serial.println("[EVENT] ORGANIK TERBUKA");
    servoOrg.write(10);
    isOpenOrg = true;
    waktuBukaOrg = now;
  }

  if (isOpenOrg && (now - waktuBukaOrg >= waktuTunggu)) {
    Serial.println();
    Serial.println("[EVENT] ORGANIK TERTUTUP");
    servoOrg.write(120);
    isOpenOrg = false;
  }


  // ==========================================================
  // ====== TEMPAT SAMPAH NON-ORGANIK ======
  // ==========================================================

  int dObjNon = bacaJarak(T_OBJ_NON, E_OBJ_NON);
  delay(40);

  int dVolNon = bacaJarak(T_VOL_NON, E_VOL_NON);
  delay(40);

  int persenNon = 0;

  if (!sensorValid(dVolNon)) {
    errorSensorNon = true;
    persenNon = 0;

    Serial.println("[WARNING] SENSOR VOLUME NON-ORGANIK ERROR / DICABUT!");

    if (!sudahKirimResetNon) {
      Serial.println("[INFO] RESET DATA NON-ORGANIK KE BACKEND...");
      kirimDataKeBackend("BIN-02", "Non-Organik", 0);
      sudahKirimResetNon = true;
      lastStatusNon = "ERROR";
    }
  } else {
    errorSensorNon = false;
    sudahKirimResetNon = false;

    if (dVolNon > tinggiTong) dVolNon = tinggiTong;
    persenNon = ((float)(tinggiTong - dVolNon) / tinggiTong) * 100;
    if (persenNon < 0) persenNon = 0;
  }


  // ==========================================================
  // LOGIKA SERVO NON-ORGANIK
  // ==========================================================

  if (!isOpenNon && !errorSensorNon && persenNon < 80 && dObjNon <= jarakBuka) {
    Serial.println();
    Serial.println("[EVENT] NON-ORGANIK TERBUKA");
    servoNon.write(10);
    isOpenNon = true;
    waktuBukaNon = now;
  }

  if (isOpenNon && (now - waktuBukaNon >= waktuTunggu)) {
    Serial.println();
    Serial.println("[EVENT] NON-ORGANIK TERTUTUP");
    servoNon.write(120);
    isOpenNon = false;
  }


  // ==========================================================
  // CEK STATUS TEMPAT SAMPAH
  // ==========================================================

  String currentStatusOrg = errorSensorOrg ? "ERROR" : hitungKategori(persenOrg);
  String currentStatusNon = errorSensorNon ? "ERROR" : hitungKategori(persenNon);


  // ==========================================================
// ==========================================================
  // [v2.5] KONTROL FISIK LAMPU LED INDIKATOR (UJI LOGIKA TERBALIK)
  // ==========================================================
 // --- KONTROL LED ORGANIK ---
if (currentStatusOrg == "PENUH") {
    setLED(LED_ORG_HIJAU, false);
    setLED(LED_ORG_MERAH, true);
} 
else if (currentStatusOrg == "SETENGAH" || currentStatusOrg == "KOSONG") {
    setLED(LED_ORG_MERAH, false);
    setLED(LED_ORG_HIJAU, true);
} 
else {
    setLED(LED_ORG_MERAH, false);
    setLED(LED_ORG_HIJAU, false);
}

// --- KONTROL LED NON-ORGANIK ---
if (currentStatusNon == "PENUH") {
    setLED(LED_NON_HIJAU, false);
    setLED(LED_NON_MERAH, true);
} 
else if (currentStatusNon == "SETENGAH" || currentStatusNon == "KOSONG") {
    setLED(LED_NON_MERAH, false);
    setLED(LED_NON_HIJAU, true);
} 
else {
    setLED(LED_NON_MERAH, false);
    setLED(LED_NON_HIJAU, false);
}

  // ==========================================================
  // FLAG KIRIM BERKALA (setiap 30 detik)
  // ==========================================================

  bool waktuyaKirim = (now - lastKirimData >= intervalKirim);


  // ==========================================================
  // JIKA STATUS ORGANIK BERUBAH ATAU WAKTUNYA KIRIM BERKALA
  // ==========================================================
  if (currentStatusOrg != lastStatusOrg || waktuyaKirim) {

    Serial.println();
    if (currentStatusOrg != lastStatusOrg) {
      Serial.println("[INFO] STATUS ORGANIK BERUBAH - KIRIM DATA");
    } else {
      Serial.println("[INFO] KIRIM DATA ORGANIK BERKALA (30 detik)");
    }

    if (!errorSensorOrg) {
      kirimDataKeBackend("BIN-01", "Organik", persenOrg);
    }

    lastStatusOrg = currentStatusOrg;
  }


  // ==========================================================
  // JIKA STATUS NON-ORGANIK BERUBAH ATAU WAKTUNYA KIRIM BERKALA
  // ==========================================================
  if (currentStatusNon != lastStatusNon || waktuyaKirim) {

    Serial.println();
    if (currentStatusNon != lastStatusNon) {
      Serial.println("[INFO] STATUS NON-ORGANIK BERUBAH - KIRIM DATA");
    } else {
      Serial.println("[INFO] KIRIM DATA NON-ORGANIK BERKALA (30 detik)");
    }

    if (!errorSensorNon) {
      kirimDataKeBackend("BIN-02", "Non-Organik", persenNon);
    }

    lastStatusNon = currentStatusNon;
  }


  // ==========================================================
  // UPDATE TIMER KIRIM BERKALA
  // ==========================================================
  if (waktuyaKirim) {
    lastKirimData = now;
  }


  // ==========================================================
  // SERIAL MONITOR LIVE
  // ==========================================================
  if (now - lastSerialPrint >= 1000) {

    Serial.println();
    Serial.println("============= LIVE MONITOR =============");

    Serial.printf(
      "[ORGANIK]     Tangan: %2d cm | Isi: %3d%% (%s)%s | Servo: %s\n",
      dObjOrg, persenOrg, currentStatusOrg.c_str(),
      errorSensorOrg ? " [!]" : "", isOpenOrg ? "BUKA" : "TUTUP"
    );

    Serial.printf(
      "[NON-ORGANIK] Tangan: %2d cm | Isi: %3d%% (%s)%s | Servo: %s\n",
      dObjNon, persenNon, currentStatusNon.c_str(),
      errorSensorNon ? " [!]" : "", isOpenNon ? "BUKA" : "TUTUP"
    );

    Serial.printf(
      "[WIFI STATUS] %s\n",
      (WiFi.status() == WL_CONNECTED) ? "CONNECTED" : "DISCONNECTED"
    );

    Serial.println("========================================");

    lastSerialPrint = now;
  }
}