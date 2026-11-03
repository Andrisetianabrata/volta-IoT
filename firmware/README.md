# Firmware VOLTA.

Dua isi: library Arduino `VoltaESP32` dan proyek PlatformIO yang memakainya.

## Struktur

| Path | Isi |
|---|---|
| `lib/VoltaESP32/` | Library: header `src/`, contoh IDE `examples/`, `library.json` + `library.properties` |
| `src/main.cpp` | Aplikasi demo PlatformIO (device MQTT penuh) |
| `platformio.ini` | Env `esp32dev`, Arduino, PubSubClient + ArduinoJson |
| `test/host/` | Uji logika murni via g++, tanpa hardware |
| `tools/pins.json` | Skema pin contoh, lolos validator |
| `docs/WIRING.md` | Tabel pengkabelan ringkas |

## Perintah

```sh
pio run -d firmware                 # kompilasi
pio run -d firmware -t upload       # flash
pio device monitor -d firmware      # serial 115200
./firmware/test/host/run_tests.sh   # uji host
```

Isi `src/main.cpp` dengan kredensial sendiri (SSID, ID dan token device,
host broker) sebelum flash. Topik ikut kontrak server di `../tasks/plan.md`.
