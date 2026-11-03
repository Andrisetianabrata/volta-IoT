#pragma once
#include <stddef.h>
#include <stdint.h>

enum class Module : uint8_t { WROOM, WROVER };

inline bool isFlashReserved(uint8_t gpio) { return gpio >= 6 && gpio <= 11; }

inline bool isInputOnly(uint8_t gpio) {
  return gpio == 34 || gpio == 35 || gpio == 36 || gpio == 37 || gpio == 38 || gpio == 39;
}

inline bool isStrapping(uint8_t gpio) {
  return gpio == 0 || gpio == 2 || gpio == 5 || gpio == 12 || gpio == 15;
}

inline bool isAdc1Capable(uint8_t gpio) {
  switch (gpio) {
    case 32:
    case 33:
    case 34:
    case 35:
    case 36:
    case 39:
      return true;
    default:
      return false;
  }
}

inline bool isSafeOutput(uint8_t gpio, Module module, const char** why) {
  if (isFlashReserved(gpio)) {
    if (why) *why = "GPIO6-11 wired to SPI flash";
    return false;
  }
  if (isInputOnly(gpio)) {
    if (why) *why = "input-only pin, cannot drive output";
    return false;
  }
  if (gpio == 12) {
    if (why) *why = "strapping pin, HIGH at boot selects 1.8V flash";
    return false;
  }
  if ((gpio == 16 || gpio == 17) && module == Module::WROVER) {
    if (why) *why = "reserved for PSRAM on WROVER";
    return false;
  }
  if (gpio > 39) {
    if (why) *why = "no such GPIO on ESP32";
    return false;
  }
  if (why) *why = nullptr;
  return true;
}

inline uint8_t wifiSafeAnalogPin() { return 32; }
