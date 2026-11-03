#pragma once
#include <Arduino.h>
#include <math.h>

class VoltaSensor {
 public:
  VoltaSensor(float deadband = 0.0f, unsigned long intervalMs = 5000)
      : deadband_(deadband), intervalMs_(intervalMs), last_(NAN), lastSent_(0), hasLast_(false) {}

  virtual ~VoltaSensor() = default;
  virtual float read() = 0;

  bool shouldPublish(unsigned long nowMs) {
    float v = read();
    if (!hasLast_) {
      last_ = v;
      hasLast_ = true;
      lastSent_ = nowMs;
      return true;
    }
    if (nowMs - lastSent_ >= intervalMs_) {
      last_ = v;
      lastSent_ = nowMs;
      return true;
    }
    if (fabsf(v - last_) >= deadband_ && deadband_ > 0.0f) {
      last_ = v;
      lastSent_ = nowMs;
      return true;
    }
    return false;
  }

  bool shouldPublish() { return shouldPublish(millis()); }
  float last() const { return last_; }

 private:
  float deadband_;
  unsigned long intervalMs_;
  float last_;
  unsigned long lastSent_;
  bool hasLast_;
};
