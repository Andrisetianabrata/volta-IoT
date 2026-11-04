// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>

VoltaLogger logger(VoltaSerial::stream());

static void berisik() {
  // Dipanggil tiap 200 ms, tapi hanya cetak tiap 2 detik per tag.
  logger.infoThrottled("detak", "masih hidup", 2000);
}

VoltaTask berisikTask(berisik, 200, "berisik");

void setup() {
  VoltaSerial::begin();
  logger.setLevel(LogLevel::DEBUG);
  logger.debug("level debug: terlihat");
  logger.info("level info: terlihat");
  logger.warn("level warn: terlihat");
  logger.error("level error: terlihat");
  logger.setLevel(LogLevel::WARN);
  logger.info("level info: disaring, tak tercetak");
  logger.warn("level warn: masih terlihat");
}

void loop() {
  berisikTask.update();
}
