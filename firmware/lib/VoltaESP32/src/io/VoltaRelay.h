#pragma once
#include <Arduino.h>

class VoltaRelay {
 public:
  VoltaRelay(uint8_t pin, bool activeLow = false, unsigned long minSwitchMs = 200)
      : pin_(pin), activeLow_(activeLow), minMs_(minSwitchMs), state_(false), lastSwitch_(0) {}

  void begin() {
    pinMode(pin_, OUTPUT);
    state_ = false;
    digitalWrite(pin_, levelFor(false));
    lastSwitch_ = millis() - minMs_;
  }

  void on() { apply(true); }
  void off() { apply(false); }
  bool isOn() const { return state_; }

 private:
  void apply(bool on) {
    if (on == state_) return;
    if (millis() - lastSwitch_ < minMs_) return;
    state_ = on;
    digitalWrite(pin_, levelFor(on));
    lastSwitch_ = millis();
  }

  uint8_t levelFor(bool on) const { return (on != activeLow_) ? HIGH : LOW; }

  uint8_t pin_;
  bool activeLow_;
  unsigned long minMs_;
  bool state_;
  unsigned long lastSwitch_;
};
