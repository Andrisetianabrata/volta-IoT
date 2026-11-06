import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/core/canvas_store.dart';
import 'package:mobile/core/widget_catalog.dart';
import 'package:mobile/screens/canvas_screen.dart';
import 'package:mobile/screens/gallery_screen.dart';
import 'package:mobile/widgets/preview_router.dart';

void main() {
  test('katalog memuat 25 kind unik', () {
    expect(widgetCatalog.length, 25);
    final kinds = widgetCatalog.map((e) => e.kind).toSet();
    expect(kinds.length, 25);
  });

  test('CanvasItem encode/decode roundtrip, sampah ditolak', () {
    const it = CanvasItem(id: 'gauge-1', kind: 'gauge');
    expect(CanvasItem.decode(it.encoded), isNotNull);
    expect(CanvasItem.decode(it.encoded)!.kind, 'gauge');
    expect(CanvasItem.decode('tanpa-pemisah'), isNull);
    expect(CanvasItem.decode('|kind'), isNull);
  });

  testWidgets('semua 25 pratinjau bisa dibangun', (tester) async {
    for (final e in widgetCatalog) {
      await tester.pumpWidget(MaterialApp(home: Scaffold(body: previewForKind(e.kind))));
      await tester.pump();
    }
  });

  testWidgets('galeri tampil + tambah ke kanvas', (tester) async {
    SharedPreferences.setMockInitialValues({});
    // Layar tes dibuat tinggi agar seluruh daftar tampil tanpa scroll:
    // drag vertikal bisa ditangkap mistar bersarang, bukan galeri.
    tester.view.physicalSize = const Size(800, 16000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    await tester.pumpWidget(const MaterialApp(home: GalleryScreen()));
    await tester.pump();
    expect(find.text('Galeri widget'), findsOneWidget);
    expect(find.text('Pebble'), findsOneWidget);
    expect(find.text('Tambah Button push ke kanvas'), findsOneWidget);
    expect(find.text('Tambah HTML kustom ke kanvas'), findsOneWidget);
  });

  testWidgets('kanvas kosong menampilkan empty state jujur', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const MaterialApp(home: CanvasScreen()));
    await tester.pump();
    expect(find.text('Kanvas'), findsOneWidget);
    expect(find.textContaining('Kanvas kosong'), findsOneWidget);
  });
}
