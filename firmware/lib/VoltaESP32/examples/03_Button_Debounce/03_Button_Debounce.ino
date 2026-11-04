// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>

VoltaButton btn(4);
VoltaLed led(2);

void setup() {
  VoltaSerial::begin();
  btn.begin();
  led.begin();
  VoltaSerial::println(F("Tekan tombol di GPIO4"));
}

void loop() {
  switch (btn.poll()) {
    case VoltaButton::PRESSED:
      VoltaSerial::println(F("ditekan"));
      led.toggle();
      break;
    case VoltaButton::RELEASED:
      VoltaSerial::println(F("dilepas"));
      break;
    case VoltaButton::LONG_PRESS:
      VoltaSerial::println(F("tahan lama -> LED mati"));
      led.off();
      break;
    default:
      break;
  }
}
