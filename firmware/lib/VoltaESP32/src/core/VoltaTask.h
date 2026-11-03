#pragma once
#include <Arduino.h>

class VoltaTask {
 public:
  using TaskFunction = void (*)();

  VoltaTask(TaskFunction fn, unsigned long intervalMs, const char* name)
      : fn_(fn), interval_(intervalMs), lastRun_(0), enabled_(true), name_(name), runs_(0) {}

  void update() {
    if (!enabled_) return;
    unsigned long now = millis();
    if (now - lastRun_ >= interval_) {
      if (now - lastRun_ > interval_ * 10) {
        lastRun_ = now;
      } else {
        lastRun_ += interval_;
      }
      fn_();
      ++runs_;
    }
  }

  void setEnabled(bool on) { enabled_ = on; }
  void setInterval(unsigned long ms) { interval_ = ms; }
  bool isEnabled() const { return enabled_; }
  const char* name() const { return name_; }
  uint32_t runCount() const { return runs_; }
  unsigned long interval() const { return interval_; }

 private:
  TaskFunction fn_;
  unsigned long interval_;
  unsigned long lastRun_;
  bool enabled_;
  const char* name_;
  uint32_t runs_;
};

template <size_t MAX_TASKS>
class VoltaScheduler {
 public:
  bool addTask(VoltaTask* t) {
    if (count_ >= MAX_TASKS) return false;
    tasks_[count_++] = t;
    return true;
  }

  void run() {
    for (size_t i = 0; i < count_; ++i) tasks_[i]->update();
  }

  size_t count() const { return count_; }

 private:
  VoltaTask* tasks_[MAX_TASKS] = {};
  size_t count_ = 0;
};
