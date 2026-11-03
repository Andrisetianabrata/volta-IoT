#pragma once
#include <Arduino.h>

class VoltaButton {
 public:
  enum Event : uint8_t { NONE, PRESSED, RELEASED, LONG_PRESS };

  VoltaButton(uint8_t pin, bool pullup = true, unsigned long debounceMs = 25,
              unsigned long longPressMs = 1000)
      : pin_(pin),
        pullup_(pullup),
        debounceMs_(debounceMs),
        longPressMs_(longPressMs),
        stable_(HIGH),
        lastRaw_(HIGH),
        lastChange_(0),
        pressStart_(0),
        longFired_(false) {}

  void begin() {
    pinMode(pin_, pullup_ ? INPUT_PULLUP : INPUT);
    int level = digitalRead(pin_);
    stable_ = lastRaw_ = level;
    lastChange_ = millis();
    pressStart_ = 0;
    longFired_ = false;
  }

  Event poll() {
    int raw = digitalRead(pin_);
    unsigned long now = millis();
    if (raw != lastRaw_) {
      lastRaw_ = raw;
      lastChange_ = now;
      if (raw == pressedLevel()) {
        pressStart_ = now;
        longFired_ = false;
      }
    }
    if (raw != stable_ && now - lastChange_ >= debounceMs_) {
      stable_ = raw;
      return (raw == pressedLevel()) ? PRESSED : RELEASED;
    }
    if (stable_ == pressedLevel() && !longFired_ && now - pressStart_ >= longPressMs_) {
      longFired_ = true;
      return LONG_PRESS;
    }
    return NONE;
  }

 private:
  int pressedLevel() const { return pullup_ ? LOW : HIGH; }

  uint8_t pin_;
  bool pullup_;
  unsigned long debounceMs_;
  unsigned long longPressMs_;
  int stable_;
  int lastRaw_;
  unsigned long lastChange_;
  unsigned long pressStart_;
  bool longFired_;
};
