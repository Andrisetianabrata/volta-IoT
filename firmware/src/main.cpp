#define MQTT_MAX_PACKET_SIZE 1024
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

VoltaDevice dev(DEVICE_ID, DEVICE_TOKEN, MQTT_HOST, 1883);
VoltaAnalog temp(32);
VoltaLed led(2);

static void onCmd(const char* pin, const char* value) {
  Serial.print(F("[cmd] "));
  Serial.print(pin);
  Serial.print(F("="));
  Serial.println(value);
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
  Serial.print(F("[net] "));
  Serial.print(VoltaDevice::wifiStatusText());
  Serial.print(F(" rssi="));
  Serial.print(dev.rssi());
  Serial.print(F(" mqtt="));
  Serial.print(dev.mqttConnected() ? F("up") : F("down"));
  Serial.print(F(" up="));
  Serial.println(millis() / 1000);
}

VoltaTask reportTask(report, 5000, "report");

void setup() {
  Serial.begin(115200);
  Serial.println(F("\nVOLTA. device"));
  Serial.print(F("id="));
  Serial.println(DEVICE_ID);
  Serial.print(F("ssid="));
  Serial.println(WIFI_SSID);
  Serial.print(F("broker="));
  Serial.println(MQTT_HOST);
  Serial.println(F("kirim WIFI <ssid> <password> via Serial untuk ganti kredensial"));
  wificfg.begin();
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
