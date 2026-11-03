#pragma once
#include <cstdio>
#include <string>

class VoltaCsv {
 public:
  explicit VoltaCsv(char sep = ',') : sep_(sep), first_(true) {}

  VoltaCsv& add(const char* s) {
    sepIfNeeded();
    buf_ += s;
    return *this;
  }

  VoltaCsv& add(long v) {
    sepIfNeeded();
    buf_ += std::to_string(v);
    return *this;
  }

  VoltaCsv& add(int v) { return add((long)v); }

  VoltaCsv& add(float v, int prec = 2) {
    sepIfNeeded();
    char tmp[32];
    snprintf(tmp, sizeof(tmp), "%.*f", prec, (double)v);
    buf_ += tmp;
    return *this;
  }

  const std::string& line() const { return buf_; }
  void clear() {
    buf_.clear();
    first_ = true;
  }

 private:
  void sepIfNeeded() {
    if (!first_) buf_ += sep_;
    first_ = false;
  }

  std::string buf_;
  char sep_;
  bool first_;
};
