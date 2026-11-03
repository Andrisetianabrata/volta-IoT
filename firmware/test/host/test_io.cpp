#include "arduino_stub.h"

#include "core/VoltaButton.h"
#include "io/VoltaRelay.h"
#include "utils/VoltaCsv.h"

int main() {
  resetHarness();

  VoltaButton btn(4, true, 25, 1000);
  setPinLevel(4, HIGH);
  btn.begin();
  CHECK(btn.poll() == VoltaButton::NONE);

  setPinLevel(4, LOW);
  advanceMillis(10);
  CHECK(btn.poll() == VoltaButton::NONE);
  advanceMillis(25);
  CHECK(btn.poll() == VoltaButton::PRESSED);
  CHECK(btn.poll() == VoltaButton::NONE);

  advanceMillis(500);
  CHECK(btn.poll() == VoltaButton::NONE);
  advanceMillis(600);
  CHECK(btn.poll() == VoltaButton::LONG_PRESS);
  CHECK(btn.poll() == VoltaButton::NONE);

  setPinLevel(4, HIGH);
  advanceMillis(10);
  CHECK(btn.poll() == VoltaButton::NONE);
  advanceMillis(25);
  CHECK(btn.poll() == VoltaButton::RELEASED);

  VoltaRelay relay(25, false, 200);
  relay.begin();
  relay.on();
  CHECK(digitalRead(25) == HIGH);
  advanceMillis(100);
  relay.off();
  CHECK(digitalRead(25) == HIGH);
  advanceMillis(150);
  relay.off();
  CHECK(digitalRead(25) == LOW);
  relay.on();
  CHECK(digitalRead(25) == LOW);
  advanceMillis(200);
  relay.on();
  CHECK(digitalRead(25) == HIGH);

  VoltaCsv csv;
  csv.add("t").add(42).add(3.14f, 2);
  CHECK(csv.line() == "t,42,3.14");

  printf("test_io ok\n");
  return 0;
}
