#include "arduino_stub.h"
#include <cassert>

#include "core/VoltaTask.h"

static int g_calls = 0;
static void onTick() { ++g_calls; }

int main() {
  resetHarness();
  g_calls = 0;

  VoltaTask t(onTick, 100, "tick");
  CHECK(t.isEnabled());
  CHECK(t.runCount() == 0);

  advanceMillis(99);
  t.update();
  CHECK(g_calls == 0);

  advanceMillis(1);
  t.update();
  CHECK(g_calls == 1);

  advanceMillis(100);
  t.update();
  CHECK(g_calls == 2);

  t.setEnabled(false);
  advanceMillis(500);
  t.update();
  CHECK(g_calls == 2);

  t.setEnabled(true);
  t.setInterval(50);
  advanceMillis(50);
  t.update();
  CHECK(g_calls == 3);

  VoltaScheduler<4> s;
  g_calls = 0;
  VoltaTask a(onTick, 100, "a");
  VoltaTask b(onTick, 200, "b");
  CHECK(s.addTask(&a));
  CHECK(s.addTask(&b));
  CHECK(s.count() == 2);
  resetHarness();
  g_calls = 0;
  for (int i = 0; i < 10; ++i) {
    advanceMillis(50);
    s.run();
  }
  CHECK(g_calls == 7);

  VoltaScheduler<1> tiny;
  VoltaTask x(onTick, 10, "x");
  VoltaTask y(onTick, 10, "y");
  CHECK(tiny.addTask(&x));
  CHECK(!tiny.addTask(&y));

  printf("test_scheduler ok\n");
  return 0;
}
