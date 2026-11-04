// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>

VoltaLed led(LED_BUILTIN);

static void blink() { led.toggle(); }
VoltaTask blinkTask(blink, 500, "blink");

void setup() {
  VoltaSerial::begin();
  led.begin();
}

void loop() { blinkTask.update(); }
