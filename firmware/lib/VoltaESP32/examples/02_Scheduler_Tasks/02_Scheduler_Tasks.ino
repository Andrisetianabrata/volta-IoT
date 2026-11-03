#include <VoltaESP32.h>

VoltaScheduler<4> scheduler;

static void fast() {
  static uint32_t n = 0;
  Serial.print(F("[cepat] "));
  Serial.println(++n);
}

static void medium() {
  Serial.print(F("[sedang] V0="));
  Serial.println(analogRead(32));
}

static void slow() {
  Serial.print(F("[lambat] uptime="));
  Serial.println(millis() / 1000);
}

VoltaTask tFast(fast, 500, "cepat");
VoltaTask tMedium(medium, 2000, "sedang");
VoltaTask tSlow(slow, 5000, "lambat");

void setup() {
  Serial.begin(115200);
  scheduler.addTask(&tFast);
  scheduler.addTask(&tMedium);
  scheduler.addTask(&tSlow);
}

void loop() { scheduler.run(); }
