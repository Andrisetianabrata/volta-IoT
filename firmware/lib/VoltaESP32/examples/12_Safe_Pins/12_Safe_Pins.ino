// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>

// Audit tabel pin saat boot: tak butuh hardware, cukup Serial monitor.
static const uint8_t DAFTAR[] = {2, 4, 5, 6, 12, 13, 16, 32, 34};
VoltaLed aman(13);

static void lapor(uint8_t gpio) {
  const char* why = nullptr;
  VoltaSerial::print(F("GPIO"));
  VoltaSerial::print(gpio);
  VoltaSerial::print(F(" aman-out="));
  VoltaSerial::print(isSafeOutput(gpio, Module::WROOM, &why) ? F("ya") : F("tidak"));
  if (why) {
    VoltaSerial::print(F(" ("));
    VoltaSerial::print(why);
    VoltaSerial::print(F(")"));
  }
  VoltaSerial::print(F(" adc1="));
  VoltaSerial::print(isAdc1Capable(gpio) ? F("ya") : F("tidak"));
  VoltaSerial::print(F(" input-only="));
  VoltaSerial::print(isInputOnly(gpio) ? F("ya") : F("tidak"));
  VoltaSerial::print(F(" strapping="));
  VoltaSerial::print(isStrapping(gpio) ? F("ya") : F("tidak"));
  VoltaSerial::print(F(" flash="));
  VoltaSerial::println(isFlashReserved(gpio) ? F("ya") : F("tidak"));
}

void setup() {
  VoltaSerial::begin();
  for (size_t i = 0; i < sizeof(DAFTAR); ++i) lapor(DAFTAR[i]);
  VoltaSerial::print(F("pin analog aman WiFi: GPIO"));
  VoltaSerial::println(wifiSafeAnalogPin());
  const char* why = nullptr;
  if (isSafeOutput(13, Module::WROOM, &why)) {
    aman.begin();
    aman.on();
    VoltaSerial::println(F("LED GPIO13 nyala: pin lolos cek"));
  }
}

void loop() {}
