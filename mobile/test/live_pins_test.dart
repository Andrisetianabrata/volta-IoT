import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/core/live_pins.dart';

void main() {
  test('streamUri http->ws dengan token', () {
    expect(
      streamUri('http://192.168.1.20:9443', 'd1', 'tok').toString(),
      'ws://192.168.1.20:9443/devices/d1/stream?token=tok',
    );
  });

  test('streamUri https->wss', () {
    expect(
      streamUri('https://contoh.com', 'd1', 'tok').scheme,
      'wss',
    );
  });

  test('parsePinMessage JSON valid', () {
    expect(
      parsePinMessage('{"pin":"V1","value":"27.5"}'),
      (pin: 'V1', value: '27.5'),
    );
  });

  test('parsePinMessage sapaan dan sampah diabaikan', () {
    expect(parsePinMessage('connected d1'), isNull);
    expect(parsePinMessage('bukan json'), isNull);
    expect(parsePinMessage('{"pin":"V1"}'), isNull);
    expect(parsePinMessage(42), isNull);
  });

  test('backoff 1/2/4/8 capped', () {
    expect(backoffDelay(0, (_) => 0), const Duration(seconds: 1));
    expect(backoffDelay(1, (_) => 0), const Duration(seconds: 2));
    expect(backoffDelay(2, (_) => 0), const Duration(seconds: 4));
    expect(backoffDelay(3, (_) => 0), const Duration(seconds: 8));
    expect(backoffDelay(9, (_) => 0), const Duration(seconds: 8));
  });
}
