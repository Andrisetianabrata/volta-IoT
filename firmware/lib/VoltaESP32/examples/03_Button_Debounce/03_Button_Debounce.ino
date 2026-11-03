#include <VoltaESP32.h>

VoltaButton btn(4);
VoltaLed led(2);

void setup() {
  Serial.begin(115200);
  btn.begin();
  led.begin();
  Serial.println(F("Tekan tombol di GPIO4"));
}

void loop() {
  switch (btn.poll()) {
    case VoltaButton::PRESSED:
      Serial.println(F("ditekan"));
      led.toggle();
      break;
    case VoltaButton::RELEASED:
      Serial.println(F("dilepas"));
      break;
    case VoltaButton::LONG_PRESS:
      Serial.println(F("tahan lama -> LED mati"));
      led.off();
      break;
    default:
      break;
  }
}
