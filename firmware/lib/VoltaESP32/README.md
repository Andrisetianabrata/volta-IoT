# VoltaESP32

Library OOP non-blocking untuk ESP32 (Arduino core v3). Scheduler kooperatif,
tombol debounce, filter sensor, IO aman, dan klien MQTT untuk protokol server
VOLTA. — tanpa `delay()` di mana pun.

## Fitur

| Modul | Isi |
|---|---|
| `core/VoltaTask.h` | Tugas millis + scheduler kapasitas-tetap, anti-spiral |
| `core/VoltaButton.h` | Debounce 25 ms, PRESSED / RELEASED / LONG_PRESS |
| `core/VoltaFilter.h` | Moving average, median, eksponensial (header-only) |
| `core/VoltaLogger.h` | Level + throttle per tag via `Print*` |
| `core/VoltaPinMap.h` | Tabel pin WROOM-32 murni: flash 6-11, jebakan GPIO12, input-only 34-39 |
| `io/VoltaLed.h` | Digital + PWM LEDC v3 (`ledcAttach`), fade non-blocking |
| `io/VoltaRelay.h` | Waktu on/off minimum anti-chatter |
| `io/VoltaAnalog.h` | Hanya ADC1 (aman WiFi), atenuasi 11 dB, rata-rata |
| `io/VoltaSensor.h` | Interface sensor + terbit-jika-berubah (deadband + interval) |
| `comms/VoltaMqtt.h` | PubSubClient: reconnect backoff, LWT, resubscribe |
| `core/VoltaSerial.h` | Gerbang serial opsional (`VOLTA_SERIAL_AKTIF`) |
| `comms/VoltaDevice.h` | WiFi + topik `volta/dev/{id}/state|cmd|status|log`, auth token |
| `utils/VoltaCsv.h` | Baris CSV untuk Serial Plotter |
| `utils/VoltaJson.h` | Payload JSON ArduinoJson v7 |

## Instalasi

1. Arduino IDE: pasang core **ESP32 v3** (Boards Manager).
2. Library Manager: pasang **PubSubClient** dan **ArduinoJson**.
3. Salin folder ini ke `libraries/VoltaESP32` (atau tambah ZIP).
4. Pilih board **ESP32 Dev Module**, baud 115200.

## Mulai cepat

```cpp
#include <VoltaESP32.h>

VoltaDevice dev("ID-DEVICE", "TOKEN-32-KARAKTER", "192.168.1.10", 1883);
VoltaAnalog temp(32);

static void onCmd(const char* pin, const char* value) { /* ... */ }
static void kirim() { dev.publishState("V1", temp.readVolt() * 100.0f); }
VoltaTask kirimTask(kirim, 5000, "kirim");

void setup() {
  VoltaSerial::begin();
  temp.begin();
  dev.setWifi("nama-wifi", "kata-sandi");
  dev.onCommand(onCmd);
  dev.begin();
}

void loop() {
  dev.update();
  kirimTask.update();
}
```

Topik ikut kontrak server: publish `state/{pin}` retained, subscribe
`cmd/{pin}`, LWT `status` online/offline retained, `log` tanpa retain.
Username dan password MQTT = token device.

## Serial opsional

Seluruh contoh dan `src/main.cpp` memakai `VoltaSerial`, bukan `Serial`
langsung, dan masing-masing sudah membawa saklarnya di baris teratas:

```cpp
// Saklar serial contoh ini: 1 = aktif, 0 = mati total.
#define VOLTA_SERIAL_AKTIF 1
#include <VoltaESP32.h>
```

Ubah `1` menjadi `0` untuk mematikan. Mati berarti `begin` dilewati, semua cetak dibuang saat kompilasi,
`VoltaLogger` diam (via `VoltaSerial::stream()` → `nullptr`), dan
`VoltaWifiConfig::pollSerial()` langsung kembali `false`. Cocok untuk
unit hemat daya atau saat pin TX/RX dipakai peripheral lain.

## Aturan pin (WROOM-32)

| Jangan | Alasan |
|---|---|
| GPIO6-11 | Jalur flash SPI, chip hang |
| GPIO12 HIGH saat boot | Pilih tegangan flash 1,8 V |
| GPIO34-39 sebagai output | Input-only, tanpa pull internal |
| ADC2 saat WiFi aktif | Bacaan ngaco, pakai ADC1 (32, 33) |

Default aman: I2C SDA 21 / SCL 22 + pull-up 4,7 kΩ, 1-Wire GPIO4 + 4,7 kΩ,
VSPI 23/19/18 (CS 5), UART1/2 bebas (jangan sentuh UART0 GPIO1/3), LED seri
220-330 Ω, beban induktif wajib driver + dioda flyback. Detail:
`docs/WIRING.md`. Validasi skema sendiri:
`python3 <skill>/validate_pinmap.py --format json < tools/pins.json`.

## Uji

Logika murni diuji off-target dengan g++ (tanpa hardware):

```sh
./test/host/run_tests.sh
```

Firmware `.ino` butuh Arduino IDE + board fisik (tidak ada toolchain di CI
ini); API mengikuti dokumentasi resmi yang diverifikasi via Context7
(arduino-esp32 v3, PubSubClient, ArduinoJson v7).

## Contoh

`examples/` mencakup seluruh API, tanpa kecuali:

| Contoh | Fitur yang didemo |
|---|---|
| 01 blink | `VoltaLed` on/off/toggle + `VoltaTask` dasar |
| 02 scheduler | `VoltaScheduler`, `runCount`, `setInterval`, `setEnabled`/`isEnabled` |
| 03 tombol | `VoltaButton` PRESSED / RELEASED / LONG_PRESS |
| 04 MQTT VOLTA. | `VoltaDevice` penuh + `VoltaWifiConfig` (WIFI/MQTT/SHOW/FORGET) |
| 05 filter + CSV | `MovingAverage`, `VoltaCsv` (float, pemisah `;`), `readRaw` |
| 06 tulis virtual pin | `publishState` string + float, `publishLog`, `makeStatePayload` |
| 07 baca virtual pin | `onCommand` (nilai mentah + JSON `{"value"}`), PWM via perintah |
| 08 relay | `VoltaRelay` active-low, guard waktu, `isOn` |
| 09 LED fade PWM | `begin(true)`, `setBrightness`, `fadeTo`/`update`, `level`/`isOn` |
| 10 sensor pintar | `VoltaSensor` + `shouldPublish`/`last`, `readAveraged`, `ready` |
| 11 logger | `VoltaLogger` level, `setLevel`, `infoThrottled` |
| 12 pin aman | `VoltaPinMap` lengkap + `wifiSafeAnalogPin` |
| 13 banding filter | `MedianFilter`, `ExpFilter` (+ rata-rata), `reset` |
| 14 MQTT mentah | `VoltaMqtt` langsung: LWT, `setHandler`, publish/subscribe |

## Lisensi

MIT.
