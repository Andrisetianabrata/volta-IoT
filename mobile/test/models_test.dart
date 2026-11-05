import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/core/models.dart';

void main() {
  group('BoardWidget.fromJson', () {
    test('config valid terparse', () {
      final w = BoardWidget.fromJson({
        'id': 'w1',
        'dashboard_id': 'b1',
        'kind': 'gauge',
        'pin': 'V1',
        'config': '{"device":"d1","label":"Suhu","min":0,"max":100}',
      });
      expect(w.configError, isNull);
      expect(w.device, 'd1');
      expect(w.number('max'), 100);
    });

    test('config rusak tidak crash', () {
      final w = BoardWidget.fromJson({
        'id': 'w1',
        'dashboard_id': 'b1',
        'kind': 'gauge',
        'pin': 'V1',
        'config': '{rusak',
      });
      expect(w.configError, isNotNull);
    });

    test('config raksasa ditolak', () {
      final w = BoardWidget.fromJson({
        'id': 'w1',
        'dashboard_id': 'b1',
        'kind': 'html',
        'pin': '',
        'config': '{"a":"${'x' * 70000}"}',
      });
      expect(w.configError, isNotNull);
    });
  });
}
