#define MQTT_MAX_PACKET_SIZE 1024
// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>

// VoltaMqtt mentah tanpa VoltaDevice: untuk kebutuhan khusus
// (topik di luar kontrak VOLTA.). Umumnya pakai VoltaDevice saja.
#define WIFI_SSID "NAMA-WIFI"
#define WIFI_PASS ""
#define DEVICE_ID "ISI-DEVICE-ID"
#define DEVICE_TOKEN "ISI-TOKEN-32-KARAKTER"
#define MQTT_HOST "ISI-IP-BROKER"

WiFiClient net;
VoltaMqtt mqtt(net, MQTT_HOST, 1883);

static void onPesan(const char* topic, const uint8_t* payload, unsigned int n) {
  VoltaSerial::print(topic);
  VoltaSerial::print(F(" <- "));
  VoltaSerial::write(payload, n);
  VoltaSerial::println();
}

void setup() {
  VoltaSerial::begin();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  // LWT: server menandai offline bila koneksi putus tak wajar.
  mqtt.setIdentity(DEVICE_ID, DEVICE_TOKEN, DEVICE_TOKEN, "volta/dev/" DEVICE_ID "/status", "offline");
  mqtt.setHandler(onPesan);
  mqtt.begin();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) return;
  bool was = mqtt.connected();
  mqtt.update();
  if (!was && mqtt.connected()) {
    // Reconnect backoff otomatis di dalam update(); subscribe ulang di sini.
    mqtt.publish("volta/dev/" DEVICE_ID "/status", "online", true);
    mqtt.subscribe("volta/dev/" DEVICE_ID "/cmd/+");
  }
}
