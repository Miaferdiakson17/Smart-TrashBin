// ============================================================
// SMART TRASH BIN IoT SYSTEM - DUAL BIN VERSION v2.3
// ============================================================
// FITUR:
// 1. Dual tempat sampah (Organik & Non-Organik)
// 2. Auto buka tutup menggunakan servo
// 3. Monitoring kapasitas sampah
// 4. Koneksi Wi-Fi ESP32
// 5. Kirim data JSON ke Backend Flask
// 6. Data dikirim hanya jika status berubah
// 7. Anti spam database
// 8. Monitoring realtime Serial Monitor
// 9. Deteksi sensor dicabut / error
// 10. Pull-down semua pin echo untuk stabilitas
// 11. [v2.3] Pin sensor organik dipindah ke 22 & 21
// 12. [v2.3] Saat sensor error, kirim 0% ke backend
//           agar data lama tidak menggantung di server
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

const char* serverUrl = "http://10.145.235.220:5000/api/trash";


// ============================================================
// PIN TEMPAT SAMPAH ORGANIK
// ============================================================

// Pin servo organik
#define SERV_ORG   18

// Sensor tangan organik
#define T_OBJ_ORG   4
#define E_OBJ_ORG   5

// Sensor volume organik
// [v2.3] Dipindah dari pin 25/26 ke pin 22/21
#define T_VOL_ORG  22
#define E_VOL_ORG  21


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


// ============================================================
// PARAMETER SISTEM
// ============================================================

// Tinggi maksimal tempat sampah (cm) - disesuaikan tong 10 liter
const int tinggiTong = 30;

// Jarak deteksi tangan untuk buka tutup (cm)
const int jarakBuka = 20;

// Lama servo terbuka (ms)
const long waktuTunggu = 5000;

// Batas maksimal pembacaan sensor valid (cm)
const int batasValidSensor = 200;


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
// TIMER SERIAL MONITOR
// ============================================================

unsigned long lastSerialPrint = 0;


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

// [v2.3] Flag untuk tahu apakah sudah kirim reset ke backend
// saat sensor error, agar tidak spam kirim 0%
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
void kirimDataKeBackend(
  String binId,
  String type,
  int percentage
) {

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
  }

  else {

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
  // GPIO 35 input-only, pull-down untuk cegah floating
  pinMode(E_VOL_NON, INPUT_PULLDOWN);


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


  // ==========================================================
  // INFORMASI SISTEM
  // ==========================================================
  Serial.println();
  Serial.println("====================================");
  Serial.println("SMART TRASH BIN SYSTEM ONLINE");
  Serial.println("DUAL BIN VERSION v2.3");
  Serial.println("====================================");


  setupWiFi();
}


// ============================================================
// LOOP UTAMA
// ============================================================
void loop() {

  // Auto reconnect WiFi
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

    // Sensor error / dicabut
    errorSensorOrg = true;
    persenOrg = 0;

    Serial.println("[WARNING] SENSOR VOLUME ORGANIK ERROR / DICABUT!");

    // [v2.3] Kirim 0% ke backend SEKALI saat sensor baru error
    // agar data lama tidak menggantung di server
    if (!sudahKirimResetOrg) {

      Serial.println("[INFO] RESET DATA ORGANIK KE BACKEND...");

      kirimDataKeBackend("BIN-01", "Organik", 0);

      sudahKirimResetOrg = true;
      lastStatusOrg = "ERROR";
    }
  }

  else {

    // Sensor kembali normal
    errorSensorOrg = false;

    // [v2.3] Reset flag agar siap kirim reset lagi jika error berikutnya
    sudahKirimResetOrg = false;

    if (dVolOrg > tinggiTong) dVolOrg = tinggiTong;

    persenOrg = ((float)(tinggiTong - dVolOrg) / tinggiTong) * 100;

    if (persenOrg < 0) persenOrg = 0;
  }


  // ==========================================================
  // LOGIKA SERVO ORGANIK
  // ==========================================================

  if (
    !isOpenOrg &&
    !errorSensorOrg &&
    persenOrg < 80 &&
    dObjOrg <= jarakBuka
  ) {

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

    // Sensor error / dicabut
    errorSensorNon = true;
    persenNon = 0;

    Serial.println("[WARNING] SENSOR VOLUME NON-ORGANIK ERROR / DICABUT!");

    // [v2.3] Kirim 0% ke backend SEKALI saat sensor baru error
    // agar data lama tidak menggantung di server
    if (!sudahKirimResetNon) {

      Serial.println("[INFO] RESET DATA NON-ORGANIK KE BACKEND...");

      kirimDataKeBackend("BIN-02", "Non-Organik", 0);

      sudahKirimResetNon = true;
      lastStatusNon = "ERROR";
    }
  }

  else {

    // Sensor kembali normal
    errorSensorNon = false;

    // [v2.3] Reset flag agar siap kirim reset lagi jika error berikutnya
    sudahKirimResetNon = false;

    if (dVolNon > tinggiTong) dVolNon = tinggiTong;

    persenNon = ((float)(tinggiTong - dVolNon) / tinggiTong) * 100;

    if (persenNon < 0) persenNon = 0;
  }


  // ==========================================================
  // LOGIKA SERVO NON-ORGANIK
  // ==========================================================

  if (
    !isOpenNon &&
    !errorSensorNon &&
    persenNon < 80 &&
    dObjNon <= jarakBuka
  ) {

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

  String currentStatusOrg = errorSensorOrg
    ? "ERROR"
    : hitungKategori(persenOrg);

  String currentStatusNon = errorSensorNon
    ? "ERROR"
    : hitungKategori(persenNon);


  // ==========================================================
  // JIKA STATUS ORGANIK BERUBAH
  // ==========================================================
  if (currentStatusOrg != lastStatusOrg) {

    Serial.println();
    Serial.println("[INFO] STATUS ORGANIK BERUBAH");

    // Hanya kirim jika sensor tidak error
    if (!errorSensorOrg) {
      kirimDataKeBackend("BIN-01", "Organik", persenOrg);
    }

    lastStatusOrg = currentStatusOrg;
  }


  // ==========================================================
  // JIKA STATUS NON-ORGANIK BERUBAH
  // ==========================================================
  if (currentStatusNon != lastStatusNon) {

    Serial.println();
    Serial.println("[INFO] STATUS NON-ORGANIK BERUBAH");

    // Hanya kirim jika sensor tidak error
    if (!errorSensorNon) {
      kirimDataKeBackend("BIN-02", "Non-Organik", persenNon);
    }

    lastStatusNon = currentStatusNon;
  }


  // ==========================================================
  // SERIAL MONITOR LIVE
  // ==========================================================
  if (now - lastSerialPrint >= 1000) {

    Serial.println();
    Serial.println("============= LIVE MONITOR =============");

    Serial.printf(
      "[ORGANIK]     Tangan: %2d cm | Isi: %3d%% (%s)%s | Servo: %s\n",
      dObjOrg,
      persenOrg,
      currentStatusOrg.c_str(),
      errorSensorOrg ? " [!]" : "",
      isOpenOrg ? "BUKA" : "TUTUP"
    );

    Serial.printf(
      "[NON-ORGANIK] Tangan: %2d cm | Isi: %3d%% (%s)%s | Servo: %s\n",
      dObjNon,
      persenNon,
      currentStatusNon.c_str(),
      errorSensorNon ? " [!]" : "",
      isOpenNon ? "BUKA" : "TUTUP"
    );

    Serial.printf(
      "[WIFI STATUS] %s\n",
      (WiFi.status() == WL_CONNECTED) ? "CONNECTED" : "DISCONNECTED"
    );

    Serial.println("========================================");

    lastSerialPrint = now;
  }
}
