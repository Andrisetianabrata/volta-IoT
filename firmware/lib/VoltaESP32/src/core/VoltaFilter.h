#pragma once
#include <stddef.h>
#include <stdint.h>

template <size_t N>
class MovingAverage {
 public:
  void add(int v) {
    buf_[head_] = v;
    head_ = (head_ + 1) % N;
    if (count_ < N) ++count_;
  }

  int value() const {
    if (count_ == 0) return 0;
    long sum = 0;
    for (size_t i = 0; i < count_; ++i) sum += buf_[i];
    return (int)(sum / (long)count_);
  }

  void reset() {
    count_ = 0;
    head_ = 0;
  }

 private:
  int buf_[N] = {};
  size_t head_ = 0;
  size_t count_ = 0;
};

template <size_t N>
class MedianFilter {
 public:
  void add(int v) {
    buf_[head_] = v;
    head_ = (head_ + 1) % N;
    if (count_ < N) ++count_;
  }

  int value() const {
    if (count_ == 0) return 0;
    int tmp[N];
    for (size_t i = 0; i < count_; ++i) tmp[i] = buf_[i];
    for (size_t i = 1; i < count_; ++i) {
      int k = tmp[i];
      size_t j = i;
      while (j > 0 && tmp[j - 1] > k) {
        tmp[j] = tmp[j - 1];
        --j;
      }
      tmp[j] = k;
    }
    return tmp[count_ / 2];
  }

  void reset() {
    count_ = 0;
    head_ = 0;
  }

 private:
  int buf_[N] = {};
  size_t head_ = 0;
  size_t count_ = 0;
};

class ExpFilter {
 public:
  explicit ExpFilter(float alpha) : alpha_(alpha), value_(0.0f) {}

  void add(float v) { value_ += alpha_ * (v - value_); }
  float value() const { return value_; }

 private:
  float alpha_;
  float value_;
};
