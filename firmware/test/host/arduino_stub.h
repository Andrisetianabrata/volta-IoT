#pragma once
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <string>

static unsigned long g_fake_millis = 0;
static int g_pin_state[40] = {0};
static int g_analog_value[40] = {0};

inline unsigned long millis() { return g_fake_millis; }
inline void advanceMillis(unsigned long d) { g_fake_millis += d; }
inline void resetHarness() {
  g_fake_millis = 0;
  memset(g_pin_state, 0, sizeof(g_pin_state));
  memset(g_analog_value, 0, sizeof(g_analog_value));
}

#define HIGH 1
#define LOW 0
#define INPUT 0
#define OUTPUT 1
#define INPUT_PULLUP 2
#define INPUT_PULLDOWN 3
#define ADC_11db 3

inline void pinMode(uint8_t, uint8_t) {}
inline void digitalWrite(uint8_t pin, uint8_t v) {
  if (pin < 40) g_pin_state[pin] = v;
}
inline int digitalRead(uint8_t pin) { return (pin < 40) ? g_pin_state[pin] : LOW; }
inline void setPinLevel(uint8_t pin, int v) {
  if (pin < 40) g_pin_state[pin] = v;
}
inline int analogRead(uint8_t pin) { return (pin < 40) ? g_analog_value[pin] : 0; }
inline void setAnalogValue(uint8_t pin, int v) {
  if (pin < 40) g_analog_value[pin] = v;
}
inline void analogSetPinAttenuation(uint8_t, int) {}
inline bool ledcAttach(uint8_t, uint32_t, uint8_t) { return true; }
inline void ledcWrite(uint8_t, uint32_t) {}
inline void ledcDetach(uint8_t) {}

#define F(x) (x)

struct Print {
  virtual ~Print() = default;
  virtual size_t write(const uint8_t* b, size_t n) {
    return fwrite(b, 1, n, stdout);
  }
  size_t print(const char* s) { return write((const uint8_t*)s, strlen(s)); }
  size_t print(int v) {
    char b[16];
    snprintf(b, sizeof(b), "%d", v);
    return print(b);
  }
  size_t print(unsigned long v) {
    char b[24];
    snprintf(b, sizeof(b), "%lu", v);
    return print(b);
  }
  size_t println(const char* s) {
    size_t n = print(s);
    return n + write((const uint8_t*)"\n", 1);
  }
  size_t println(int v) {
    size_t n = print(v);
    return n + write((const uint8_t*)"\n", 1);
  }
  size_t println() { return write((const uint8_t*)"\n", 1); }
};

struct SerialStub : public Print {};
inline SerialStub Serial;

#define CHECK(cond)                                                            \
  do {                                                                         \
    if (!(cond)) {                                                             \
      printf("FAIL %s:%d: %s\n", __FILE__, __LINE__, #cond);                   \
      return 1;                                                                \
    }                                                                          \
  } while (0)
