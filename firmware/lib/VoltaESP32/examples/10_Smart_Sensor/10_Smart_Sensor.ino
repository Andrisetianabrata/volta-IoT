// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>

VoltaAnalog adc(32);

// Sensor suhu: terbit hanya jika berubah >= 0,05 V atau tiap 10 detik.
class SensorSuhu : public VoltaSensor {
 public:
  SensorSuhu() : VoltaSensor(0.05f, 10000) {}
  float read() override { return adc.readAveraged(8) * 3.3f / 4095.0f; }
};

SensorSuhu suhu;

static void cek() {
  if (suhu.shouldPublish()) {
    VoltaSerial::print(F("terbit: "));
    VoltaSerial::print(suhu.last(), 3);
    VoltaSerial::println(F(" V"));
  }
}

VoltaTask cekTask(cek, 500, "cek");

void setup() {
  VoltaSerial::begin();
  if (!adc.ready() && !adc.begin()) {
    VoltaSerial::println(F("ADC tak siap"));
    for (;;) delay(1000);
  }
  VoltaSerial::println(F("sensor hemat: hanya cetak saat berubah/cukup waktu"));
}

void loop() {
  cekTask.update();
}
