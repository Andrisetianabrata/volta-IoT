#include "arduino_stub.h"

#include "core/VoltaPinMap.h"

int main() {
  resetHarness();
  const char* why = nullptr;

  CHECK(isSafeOutput(21, Module::WROOM, &why));
  CHECK(isSafeOutput(32, Module::WROOM, &why));
  CHECK(!isSafeOutput(6, Module::WROOM, &why) && why != nullptr);
  CHECK(!isSafeOutput(12, Module::WROOM, &why) && why != nullptr);
  CHECK(!isSafeOutput(34, Module::WROOM, &why) && why != nullptr);
  CHECK(!isSafeOutput(16, Module::WROVER, &why) && why != nullptr);
  CHECK(isSafeOutput(16, Module::WROOM, &why));

  CHECK(isAdc1Capable(32));
  CHECK(isAdc1Capable(36));
  CHECK(!isAdc1Capable(4));
  CHECK(isStrapping(0));
  CHECK(!isStrapping(21));
  CHECK(isFlashReserved(6));
  CHECK(isFlashReserved(11));
  CHECK(!isFlashReserved(21));
  CHECK(isInputOnly(39));
  CHECK(!isInputOnly(33));

  CHECK(isAdc1Capable(wifiSafeAnalogPin()));
  CHECK(!isFlashReserved(wifiSafeAnalogPin()));

  printf("test_pinmap ok\n");
  return 0;
}
