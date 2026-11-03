#pragma once
#include <Arduino.h>

class VoltaLed {
 public:
  explicit VoltaLed(uint8_t pin) : pin_(pin), pwm_(false), level_(0), target_(0), stepMs_(15), lastStep_(0) {}

  void begin(bool pwm = false, uint32_t freq = 5000, uint8_t resolution = 8) {
    pwm_ = pwm;
    if (pwm_) {
      ledcAttach(pin_, freq, resolution);
    } else {
      pinMode(pin_, OUTPUT);
    }
    off();
  }

  void on() {
    target_ = 255;
    apply(255);
  }

  void off() {
    target_ = 0;
    apply(0);
  }

  void toggle() {
    if (level_ > 0) {
      off();
    } else {
      on();
    }
  }

  void setBrightness(uint8_t duty) {
    target_ = duty;
    apply(duty);
  }

  void fadeTo(uint8_t duty, unsigned long stepMs = 15) {
    target_ = duty;
    stepMs_ = stepMs;
    lastStep_ = millis();
  }

  void update() {
    if (level_ == target_) return;
    unsigned long now = millis();
    if (now - lastStep_ < stepMs_) return;
    lastStep_ = now;
    apply(level_ < target_ ? (uint8_t)(level_ + 1) : (uint8_t)(level_ - 1));
  }

  bool isOn() const { return level_ > 0; }
  uint8_t level() const { return level_; }

 private:
  void apply(uint8_t duty) {
    level_ = duty;
    if (pwm_) {
      ledcWrite(pin_, duty);
    } else {
      digitalWrite(pin_, duty > 0 ? HIGH : LOW);
    }
  }

  uint8_t pin_;
  bool pwm_;
  uint8_t level_;
  uint8_t target_;
  unsigned long stepMs_;
  unsigned long lastStep_;
};
