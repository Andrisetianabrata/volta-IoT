// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>

VoltaAnalog sensor(32);
MovingAverage<8> avg;
VoltaCsv csv;
VoltaCsv csvTitikKoma(';');

static void baca() {
  avg.add(sensor.readRaw());
  csv.clear();
  csv.add((long)(millis() / 1000)).add(avg.value());
  VoltaSerial::println(csv.line().c_str());
  // Varian pemisah titik-koma + float 3 desimal untuk locale spreadsheet.
  csvTitikKoma.clear();
  csvTitikKoma.add(sensor.readVolt(), 3).add(avg.value());
  VoltaSerial::println(csvTitikKoma.line().c_str());
}

VoltaTask bacaTask(baca, 1000, "baca");

void setup() {
  VoltaSerial::begin();
  sensor.begin();
}

void loop() { bacaTask.update(); }
