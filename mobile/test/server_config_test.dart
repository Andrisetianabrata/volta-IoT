import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/core/server_config.dart';

void main() {
  group('normalizeServerUrl', () {
    test('host:port tanpa skema jadi http', () {
      expect(
        normalizeServerUrl('192.168.1.10:9443'),
        'http://192.168.1.10:9443',
      );
    });

    test('URL penuh dipertahankan, path dibuang', () {
      expect(
        normalizeServerUrl('http://192.168.1.10:9443/api/'),
        'http://192.168.1.10:9443',
      );
    });

    test('https tanpa port tetap', () {
      expect(normalizeServerUrl('https://contoh.com'), 'https://contoh.com');
    });

    test('skema selain http/https ditolak', () {
      expect(normalizeServerUrl('ftp://contoh.com'), isNull);
    });

    test('kosong dan sampah ditolak', () {
      expect(normalizeServerUrl(''), isNull);
      expect(normalizeServerUrl('   '), isNull);
      expect(normalizeServerUrl('://'), isNull);
    });

    test('spasi dirapikan', () {
      expect(normalizeServerUrl('  10.0.0.1  '), 'http://10.0.0.1');
    });
  });
}
