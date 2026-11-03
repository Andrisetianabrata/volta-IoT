#include <VoltaESP32.h>

VoltaLed led(LED_BUILTIN);

static void blink() { led.toggle(); }
VoltaTask blinkTask(blink, 500, "blink");

void setup() {
  Serial.begin(115200);
  led.begin();
}

void loop() { blinkTask.update(); }
