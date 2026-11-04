#define MQTT_MAX_PACKET_SIZE 1024
// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>

#define WIFI_SSID "NAMA-WIFI"
#define WIFI_PASS ""
#define DEVICE_ID "ISI-DEVICE-ID"
#define DEVICE_TOKEN "ISI-TOKEN-32-KARAKTER"
#define MQTT_HOST "ISI-IP-BROKER"

VoltaDevice dev(DEVICE_ID, DEVICE_TOKEN, MQTT_HOST, 1883);
VoltaAnalog temp(32);
VoltaLogger logger(VoltaSerial::stream());

static void kirimSuhu() {
  float suhu = temp.readVolt() * 100.0f;
  // Overload float: format desimal langsung, tanpa snprintf manual.
  if (dev.publishState("V1", suhu, 2)) {
    logger.info("V1 terkirim");
  }
}

static void kirimHitung() {
  static long n = 0;
  char buf[16];
  snprintf(buf, sizeof(buf), "%ld", ++n);
  // Overload string: untuk teks atau angka yang sudah diformat sendiri.
  dev.publishState("V2", buf);
}

static void kirimStatus() {
  char out[96];
  // makeStatePayload membangun {"pin","value","ts"} untuk topik LOG
  // (topik state hanya menerima nilai mentah, bukan JSON).
  char buf[16];
  snprintf(buf, sizeof(buf), "%ld", (long)dev.rssi());
  makeStatePayload("rssi", buf, millis() / 1000, out, sizeof(out));
  dev.publishLog(out);
}

VoltaTask suhuTask(kirimSuhu, 5000, "suhu");
VoltaTask hitungTask(kirimHitung, 2000, "hitung");
VoltaTask statusTask(kirimStatus, 30000, "status");

void setup() {
  VoltaSerial::begin();
  temp.begin();
  dev.setWifi(WIFI_SSID, WIFI_PASS);
  dev.begin();
  dev.publishLog("boot: contoh tulis virtual pin");
}

void loop() {
  dev.update();
  suhuTask.update();
  hitungTask.update();
  statusTask.update();
}
