#define MQTT_MAX_PACKET_SIZE 1024
// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>

#define WIFI_SSID "NAMA-WIFI"
#define WIFI_PASS ""
#define DEVICE_ID "ISI-DEVICE-ID"
#define DEVICE_TOKEN "ISI-TOKEN-32-KARAKTER"
#define MQTT_HOST "ISI-IP-BROKER"
// Isi kredensial asli via Serial monitor (tersimpan di flash):
//   WIFI <ssid> [password]   contoh open network: WIFI ol
//   MQTT <ip-broker>
//   SHOW   (verifikasi tersimpan)
//   FORGET (hapus tersimpan, kembali ke bawaan)

VoltaDevice dev(DEVICE_ID, DEVICE_TOKEN, MQTT_HOST, 1883);
VoltaAnalog temp(32);
VoltaLed led(2);

static void onCmd(const char* pin, const char* value) {
  VoltaSerial::print(F("[cmd] "));
  VoltaSerial::print(pin);
  VoltaSerial::print(F("="));
  VoltaSerial::println(value);
  if (strcmp(pin, "V0") == 0) {
    if (strcmp(value, "1") == 0) {
      led.on();
    } else {
      led.off();
    }
  }
}

static void publish() {
  char buf[16];
  snprintf(buf, sizeof(buf), "%.2f", temp.readVolt() * 100.0f);
  dev.publishState("V1", buf);
}

VoltaTask pubTask(publish, 5000, "publish");

VoltaWifiConfig wificfg;
unsigned long restartAt = 0;

static void report() {
  VoltaSerial::print(F("[net] "));
  VoltaSerial::print(VoltaDevice::wifiStatusText());
  VoltaSerial::print(F(" rssi="));
  VoltaSerial::print(dev.rssi());
  VoltaSerial::print(F(" mqtt="));
  VoltaSerial::print(dev.mqttConnected() ? F("up") : F("down"));
  VoltaSerial::print(F(" up="));
  VoltaSerial::println(millis() / 1000);
}

VoltaTask reportTask(report, 5000, "report");

void setup() {
  VoltaSerial::begin();
  VoltaSerial::println(F("\nVOLTA. device"));
  VoltaSerial::print(F("id="));
  VoltaSerial::println(DEVICE_ID);
  VoltaSerial::print(F("ssid="));
  VoltaSerial::println(WIFI_SSID);
  VoltaSerial::print(F("broker="));
  VoltaSerial::println(MQTT_HOST);
  VoltaSerial::println(F("kirim WIFI <ssid> <password> via Serial untuk ganti kredensial"));
  wificfg.begin();
  VoltaSerial::print(F("profil tersimpan: "));
  VoltaSerial::println(wificfg.fromStorage() ? F("ya") : F("tidak, pakai bawaan"));
  if (wificfg.mqtt()) dev.setBroker(wificfg.mqtt());
  led.begin();
  temp.begin();
  dev.setWifi(wificfg.ssid() ? wificfg.ssid() : WIFI_SSID, wificfg.pass() ? wificfg.pass() : WIFI_PASS);
  dev.onCommand(onCmd);
  dev.begin();
}

void loop() {
  if (wificfg.pollSerial()) restartAt = millis() + 500;
  if (restartAt && (long)(millis() - restartAt) >= 0) ESP.restart();
  dev.update();
  pubTask.update();
  reportTask.update();
}
