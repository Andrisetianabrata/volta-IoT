#include <VoltaESP32.h>

VoltaAnalog sensor(32);
MovingAverage<8> avg;
VoltaCsv csv;

static void baca() {
  avg.add(sensor.readRaw());
  csv.clear();
  csv.add((long)(millis() / 1000)).add(avg.value());
  Serial.println(csv.line().c_str());
}

VoltaTask bacaTask(baca, 1000, "baca");

void setup() {
  Serial.begin(115200);
  sensor.begin();
}

void loop() { bacaTask.update(); }
