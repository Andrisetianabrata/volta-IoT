#define MQTT_MAX_PACKET_SIZE 1024
#include <VoltaESP32.h>

#define WIFI_SSID "NAMA-WIFI"
#define WIFI_PASS "ISI-PASSWORD"
#define DEVICE_ID "ISI-DEVICE-ID"
#define DEVICE_TOKEN "ISI-TOKEN-32-KARAKTER"
#define MQTT_HOST "ISI-IP-BROKER"

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

void setup() {
  Serial.begin(115200);
  led.begin();
  temp.begin();
  dev.setWifi(WIFI_SSID, WIFI_PASS);
  dev.onCommand(onCmd);
  dev.begin();
}

void loop() {
  dev.update();
  pubTask.update();
}
