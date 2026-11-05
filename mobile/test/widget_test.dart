import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';
import 'package:mobile/screens/splash_screen.dart';

void main() {
  testWidgets('Volta app opens on splash', (WidgetTester tester) async {
    await tester.pumpWidget(const VoltaApp());
    expect(find.byType(SplashScreen), findsOneWidget);
  });
}
