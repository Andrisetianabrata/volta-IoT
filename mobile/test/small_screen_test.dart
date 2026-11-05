import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/screens/login_screen.dart';
import 'package:mobile/theme/pebble.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(const {});
  });

  testWidgets('login + sheet server 360x640 tanpa overflow', (tester) async {
    tester.view.physicalSize = const Size(720, 1280);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      MaterialApp(theme: PebbleTheme.darkTheme, home: const LoginScreen()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Masuk'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('SERVER BELUM DIATUR'));
    await tester.pumpAndSettle();

    expect(find.text('Alamat server'), findsOneWidget);
    expect(find.text('Simpan'), findsOneWidget);
    expect(find.text('Batal'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
