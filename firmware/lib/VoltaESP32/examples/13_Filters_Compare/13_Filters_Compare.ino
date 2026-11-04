// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>

// Bandingkan tiga filter pada satu sinyal: rata-rata, median (kebal
// spike), dan eksponensial (ringan memori). Buka Serial Plotter.
VoltaAnalog sensor(32);
MovingAverage<8> rata;
MedianFilter<8> median;
ExpFilter eks(0.2f);
VoltaCsv csv;

static void baca() {
  int mentah = sensor.readRaw();
  rata.add(mentah);
  median.add(mentah);
  eks.add((float)mentah);
  csv.clear();
  csv.add(mentah).add(rata.value()).add(median.value()).add(eks.value(), 1);
  VoltaSerial::println(csv.line().c_str());
}

VoltaTask bacaTask(baca, 100, "baca");

void setup() {
  VoltaSerial::begin();
  sensor.begin();
  VoltaSerial::println(F("kirim r via Serial untuk nol-kan filter"));
}

void loop() {
  bacaTask.update();
  if (VoltaSerial::available() && (char)VoltaSerial::read() == 'r') {
    rata.reset();
    median.reset();
    VoltaSerial::println(F("rata/median dinolkan, eksponensial jalan terus"));
  }
}
