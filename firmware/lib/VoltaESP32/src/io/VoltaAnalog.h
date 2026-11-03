#pragma once
#include <Arduino.h>

#include "core/VoltaPinMap.h"

class VoltaAnalog {
 public:
  explicit VoltaAnalog(uint8_t pin) : pin_(pin), ready_(false) {}

  bool begin() {
    if (!isAdc1Capable(pin_)) return false;
    analogSetPinAttenuation(pin_, ADC_11db);
    ready_ = true;
    return true;
  }

  int readRaw() const { return analogRead(pin_); }

  float readVolt(float vref = 3.3f) const { return (float)analogRead(pin_) * vref / 4095.0f; }

  int readAveraged(uint8_t samples = 8) const {
    if (samples == 0) return 0;
    long sum = 0;
    for (uint8_t i = 0; i < samples; ++i) sum += analogRead(pin_);
    return (int)(sum / samples);
  }

  bool ready() const { return ready_; }

 private:
  uint8_t pin_;
  bool ready_;
};
