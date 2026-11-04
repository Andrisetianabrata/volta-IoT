#pragma once
#include <Arduino.h>

// Gerbang serial opsional: sketch utama mematikan seluruh keluaran
// serial (termasuk begin) dengan satu baris SEBELUM include library:
//   #define VOLTA_SERIAL_AKTIF 0
// Default 1 (aktif). Mati menghemat daya dan membebaskan pin TX/RX.
#ifndef VOLTA_SERIAL_AKTIF
#define VOLTA_SERIAL_AKTIF 1
#endif

struct VoltaSerial {
  static void begin(unsigned long baud = 115200) {
#if VOLTA_SERIAL_AKTIF
    Serial.begin(baud);
#else
    (void)baud;
#endif
  }

  // Aliran untuk VoltaLogger: nullptr bila serial mati (logger diam).
  static Print* stream() {
#if VOLTA_SERIAL_AKTIF
    return &Serial;
#else
    return nullptr;
#endif
  }

  template <typename T>
  static void print(const T& v) {
#if VOLTA_SERIAL_AKTIF
    Serial.print(v);
#else
    (void)v;
#endif
  }

  template <typename T, typename D>
  static void print(const T& v, D d) {
#if VOLTA_SERIAL_AKTIF
    Serial.print(v, d);
#else
    (void)v;
    (void)d;
#endif
  }

  template <typename T>
  static void println(const T& v) {
#if VOLTA_SERIAL_AKTIF
    Serial.println(v);
#else
    (void)v;
#endif
  }

  template <typename T, typename D>
  static void println(const T& v, D d) {
#if VOLTA_SERIAL_AKTIF
    Serial.println(v, d);
#else
    (void)v;
    (void)d;
#endif
  }

  static size_t write(const uint8_t* b, size_t n) {
#if VOLTA_SERIAL_AKTIF
    return Serial.write(b, n);
#else
    (void)b;
    (void)n;
    return 0;
#endif
  }

  static int available() {
#if VOLTA_SERIAL_AKTIF
    return Serial.available();
#else
    return 0;
#endif
  }

  static int read() {
#if VOLTA_SERIAL_AKTIF
    return Serial.read();
#else
    return -1;
#endif
  }
};
