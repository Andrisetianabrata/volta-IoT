// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>

VoltaScheduler<4> scheduler;

extern VoltaTask tFast;
extern VoltaTask tMedium;
extern VoltaTask tSlow;

static void fast() {
  static uint32_t n = 0;
  VoltaSerial::print(F("[cepat] "));
  VoltaSerial::println(++n);
}

static void medium() {
  VoltaSerial::print(F("[sedang] V0="));
  VoltaSerial::println(analogRead(32));
}

static void slow() {
  VoltaSerial::print(F("[lambat] uptime="));
  VoltaSerial::println(millis() / 1000);
  VoltaSerial::print(F("[lambat] cepat jalan="));
  VoltaSerial::print(tFast.runCount());
  VoltaSerial::print(F("x, sedang tiap="));
  VoltaSerial::print(tMedium.interval());
  VoltaSerial::println(F(" ms"));
  // Demo API: ubah interval dan matikan/hidupkan tugas saat jalan.
  if (tSlow.runCount() == 2) {
    tMedium.setInterval(5000);
    VoltaSerial::println(F("[lambat] interval sedang -> 5000 ms"));
  }
  if (tSlow.runCount() == 4) {
    tFast.setEnabled(false);
    VoltaSerial::println(F("[lambat] tugas cepat dimatikan"));
  }
  if (tSlow.runCount() == 6) {
    tFast.setEnabled(true);
    VoltaSerial::print(F("[lambat] tugas cepat nyala lagi, aktif="));
    VoltaSerial::println(tFast.isEnabled() ? F("ya") : F("tidak"));
  }
}

VoltaTask tFast(fast, 500, "cepat");
VoltaTask tMedium(medium, 2000, "sedang");
VoltaTask tSlow(slow, 5000, "lambat");

void setup() {
  VoltaSerial::begin();
  scheduler.addTask(&tFast);
  scheduler.addTask(&tMedium);
  scheduler.addTask(&tSlow);
}

void loop() { scheduler.run(); }
