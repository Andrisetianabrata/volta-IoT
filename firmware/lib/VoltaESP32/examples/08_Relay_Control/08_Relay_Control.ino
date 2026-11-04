// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>

// Relay modul aktif-LOW di GPIO13, jeda saklar minimum 500 ms
// agar chatter perintah tidak mengadu kontak.
VoltaRelay relay(13, true, 500);

static void saklar() {
  if (relay.isOn()) {
    relay.off();
  } else {
    relay.on();
  }
  VoltaSerial::print(F("relay: "));
  VoltaSerial::println(relay.isOn() ? F("ON") : F("OFF"));
}

VoltaTask saklarTask(saklar, 3000, "saklar");

void setup() {
  VoltaSerial::begin();
  const char* why = nullptr;
  if (!isSafeOutput(13, Module::WROOM, &why)) {
    VoltaSerial::print(F("pin tak aman: "));
    VoltaSerial::println(why);
    for (;;) delay(1000);
  }
  relay.begin();
  VoltaSerial::println(F("relay berkedip tiap 3 detik, coba ubah ke 100 ms: guard menahan"));
}

void loop() {
  saklarTask.update();
}
