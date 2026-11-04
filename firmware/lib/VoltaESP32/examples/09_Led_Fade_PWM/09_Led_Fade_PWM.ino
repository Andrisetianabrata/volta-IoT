// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>

// LED PWM: fadeTo() jalan non-blocking, update() harus dipanggil tiap loop.
VoltaLed led(2);
static bool naik = true;

static void atur() {
  // fadeTo butuh update() di loop; setBrightness langsung lompat.
  led.fadeTo(naik ? 255 : 0, 10);
  naik = !naik;
  VoltaSerial::print(F("target: "));
  VoltaSerial::println(naik ? 0 : 255);
}

static void lapor() {
  VoltaSerial::print(F("level="));
  VoltaSerial::print(led.level());
  VoltaSerial::print(F(" nyala="));
  VoltaSerial::println(led.isOn() ? F("ya") : F("tidak"));
}

VoltaTask aturTask(atur, 4000, "atur");
VoltaTask laporTask(lapor, 1000, "lapor");

void setup() {
  VoltaSerial::begin();
  led.begin(true);
  led.setBrightness(64);
}

void loop() {
  led.update();
  aturTask.update();
  laporTask.update();
}
