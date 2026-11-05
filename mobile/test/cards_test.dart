import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/core/models.dart';
import 'package:mobile/theme/pebble.dart';
import 'package:mobile/widgets/gauge_card.dart';
import 'package:mobile/widgets/unsupported_card.dart';

BoardWidget gauge() => BoardWidget.fromJson({
      'id': 'w1',
      'dashboard_id': 'b1',
      'kind': 'gauge',
      'pin': 'V1',
      'config': '{"device":"d1","label":"Suhu","min":0,"max":100,"unit":"%"}',
    });

void main() {
  testWidgets('gauge tampilkan nilai', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: PebbleTheme.darkTheme,
        home: Scaffold(
          body: GaugeCard(
            widget: gauge(),
            value: PinValue(value: '72', updatedAt: 1),
          ),
        ),
      ),
    );
    expect(find.text('72'), findsOneWidget);
    expect(find.text('Suhu'), findsOneWidget);
  });

  testWidgets('kind asing tampilkan kartu dukungan', (tester) async {
    final w = BoardWidget.fromJson({
      'id': 'w2',
      'dashboard_id': 'b1',
      'kind': 'teleport',
      'pin': 'V9',
      'config': '{}',
    });
    await tester.pumpWidget(
      MaterialApp(
        theme: PebbleTheme.darkTheme,
        home: Scaffold(body: UnsupportedCard(widget: w)),
      ),
    );
    expect(find.textContaining('belum didukung'), findsOneWidget);
  });
}
