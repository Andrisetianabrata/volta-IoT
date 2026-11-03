#pragma once
#include <Arduino.h>

enum class LogLevel : uint8_t { DEBUG, INFO, WARN, ERROR, SILENT };

class VoltaLogger {
 public:
  explicit VoltaLogger(Print* out = &Serial, LogLevel level = LogLevel::INFO)
      : out_(out), level_(level), lastTag_(0), lastWhen_(0) {}

  void setLevel(LogLevel level) { level_ = level; }

  void debug(const char* msg) { log(LogLevel::DEBUG, "[D] ", msg); }
  void info(const char* msg) { log(LogLevel::INFO, "[i] ", msg); }
  void warn(const char* msg) { log(LogLevel::WARN, "[!] ", msg); }
  void error(const char* msg) { log(LogLevel::ERROR, "[E] ", msg); }

  void infoThrottled(const char* tag, const char* msg, unsigned long everyMs) {
    unsigned long now = millis();
    unsigned long tagHash = hash(tag);
    if (tagHash == lastTag_ && now - lastWhen_ < everyMs) return;
    lastTag_ = tagHash;
    lastWhen_ = now;
    info(msg);
  }

 private:
  void log(LogLevel level, const char* prefix, const char* msg) {
    if (!out_ || level < level_) return;
    out_->print(prefix);
    out_->println(msg);
  }

  static unsigned long hash(const char* s) {
    unsigned long h = 5381;
    while (*s) h = h * 33 + (unsigned char)*s++;
    return h;
  }

  Print* out_;
  LogLevel level_;
  unsigned long lastTag_;
  unsigned long lastWhen_;
};
