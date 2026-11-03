#include "arduino_stub.h"

#include "core/VoltaLogger.h"
#include "io/VoltaAnalog.h"
#include "io/VoltaLed.h"
#include "io/VoltaSensor.h"

class FakeSensor : public VoltaSensor {
 public:
  FakeSensor(float v, float deadband, unsigned long interval)
      : VoltaSensor(deadband, interval), v_(v) {}
  float read() override { return v_; }
  void set(float v) { v_ = v; }

 private:
  float v_;
};

int main() {
  resetHarness();

  VoltaLogger log;
  log.setLevel(LogLevel::DEBUG);
  log.debug("d");
  log.info("i");
  log.warn("w");
  log.error("e");
  log.infoThrottled("tag", "first", 1000);
  advanceMillis(500);
  log.infoThrottled("tag", "suppressed", 1000);
  advanceMillis(600);
  log.infoThrottled("tag", "second", 1000);

  VoltaAnalog a32(32);
  CHECK(a32.begin());
  setAnalogValue(32, 2048);
  CHECK(a32.readRaw() == 2048);
  CHECK(a32.readAveraged(4) == 2048);
  float v = a32.readVolt();
  CHECK(v > 1.64f && v < 1.66f);
  VoltaAnalog a4(4);
  CHECK(!a4.begin());
  VoltaAnalog a6(6);
  CHECK(!a6.begin());

  VoltaLed led(2);
  led.begin();
  led.on();
  CHECK(led.isOn());
  led.off();
  CHECK(!led.isOn());
  led.fadeTo(10, 10);
  advanceMillis(10);
  led.update();
  CHECK(led.level() == 1);
  advanceMillis(100);
  for (int i = 0; i < 20; ++i) {
    advanceMillis(10);
    led.update();
  }
  CHECK(led.level() == 10);

  FakeSensor s(25.0f, 0.5f, 5000);
  CHECK(s.shouldPublish(0));
  CHECK(!s.shouldPublish(100));
  s.set(25.8f);
  CHECK(s.shouldPublish(200));
  s.set(25.81f);
  CHECK(!s.shouldPublish(300));
  CHECK(s.shouldPublish(6000));

  printf("test_periph ok\n");
  return 0;
}
