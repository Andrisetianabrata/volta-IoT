#define MQTT_MAX_PACKET_SIZE 1024
// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>

#define WIFI_SSID "NAMA-WIFI"
#define WIFI_PASS ""
#define DEVICE_ID "ISI-DEVICE-ID"
#define DEVICE_TOKEN "ISI-TOKEN-32-KARAKTER"
#define MQTT_HOST "ISI-IP-BROKER"
// Perintah dari server tiba sebagai nilai mentah ("1") atau JSON
// ({"value":"1"}); keduanya sudah diurai sebelum handler dipanggil.

VoltaDevice dev(DEVICE_ID, DEVICE_TOKEN, MQTT_HOST, 1883);
VoltaLed ledDigital(2);
VoltaLed ledPwm(16);

static void onCmd(const char* pin, const char* value) {
  VoltaSerial::print(F("[cmd] "));
  VoltaSerial::print(pin);
  VoltaSerial::print(F("="));
  VoltaSerial::println(value);
  if (strcmp(pin, "V0") == 0) {
    // V0: tulis "1" untuk nyala, "0" untuk mati.
    if (strcmp(value, "1") == 0) {
      ledDigital.on();
    } else {
      ledDigital.off();
    }
  } else if (strcmp(pin, "V1") == 0) {
    // V1: tulis 0-255 untuk kecerahan (PWM).
    ledPwm.setBrightness((uint8_t)atoi(value));
  } else {
    dev.publishLog("pin perintah tak dikenal");
  }
}

void setup() {
  VoltaSerial::begin();
  ledDigital.begin();
  ledPwm.begin(true);
  dev.setWifi(WIFI_SSID, WIFI_PASS);
  dev.onCommand(onCmd);
  dev.begin();
  VoltaSerial::println(F("kirim V0=1/0 atau V1=0..255 dari server"));
}

void loop() {
  dev.update();
  ledPwm.update();
}
