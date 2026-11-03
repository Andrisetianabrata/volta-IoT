# Pengkabelan ESP32-WROOM-32 (ringkas)

## I2C

SDA GPIO21, SCL GPIO22 (konvensi; pin lain bisa via matrix, kecuali 34-39).
Pull-up **4,7 kΩ** ke 3V3 di SDA dan SCL. Kecepatan umum 100 kHz, sensor 400 kHz.

## SPI

Pakai VSPI: MOSI 23, MISO 19, SCLK 18, CS 5. CS diberi pull-up 10 kΩ.
Hindari HSPI (MISO-nya GPIO12 = pin strapping berbahaya).

## UART

Jangan pakai UART0 (GPIO1/3, USB serial). UART1/2 bebas (misal TX 4 / RX 5).

## 1-Wire

GPIO4 + pull-up **4,7 kΩ** ke 3V3.

## Analog

Hanya ADC1 bila WiFi aktif: GPIO32/33 penuh, 34/35/36/39 input-only.
Rentang 0-3,3 V (jangan lebih), tambah RC 100 Ω + 100 nF bila berisik.

## Daya dan beban

- Logika 3,3 V, **5 V merusak pin**.
- LED pakai resistor seri: `(3,3 - Vf) / If`, umum 220-330 Ω.
- Relai/motor: transistor/MOSFET + dioda flyback (1N4148/1N4007), jangan langsung.
- Arus per pin maks 20 mA (aman), level shifter 2 arah BSS138 untuk I2C/1-Wire
  3,3 V <-> 5 V (jangan TXB untuk open-drain).
