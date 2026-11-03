#include "arduino_stub.h"

#include "core/VoltaFilter.h"

int main() {
  resetHarness();

  MovingAverage<4> avg;
  avg.add(10);
  avg.add(20);
  CHECK(avg.value() == 15);
  avg.add(30);
  avg.add(40);
  CHECK(avg.value() == 25);
  avg.add(50);
  CHECK(avg.value() == 35);
  avg.reset();
  CHECK(avg.value() == 0);

  MedianFilter<5> med;
  med.add(30);
  med.add(10);
  med.add(50);
  CHECK(med.value() == 30);
  med.add(20);
  med.add(40);
  CHECK(med.value() == 30);

  ExpFilter f(0.5f);
  f.add(100.0f);
  float v = f.value();
  CHECK(v > 49.0f && v < 51.0f);
  f.add(100.0f);
  v = f.value();
  CHECK(v > 74.0f && v < 76.0f);

  printf("test_filter ok\n");
  return 0;
}
