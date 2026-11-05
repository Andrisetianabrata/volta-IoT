import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'theme/pebble.dart';
import 'theme/theme_controller.dart';
import 'screens/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations(const [
    DeviceOrientation.portraitUp,
  ]);
  applyThemeMode(ThemeMode.dark);
  runApp(const VoltaApp());
}

class VoltaApp extends StatelessWidget {
  const VoltaApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Shell MaterialApp fixed agar toggle tidak memicu AnimatedTheme
    // internal (mahal di HP kentang). Builder membungkus Navigator
    // sehingga semua rute ikut tema yang diganti instan.
    return MaterialApp(
      title: 'VOLTA.',
      debugShowCheckedModeBanner: false,
      theme: PebbleTheme.darkTheme,
      builder: (context, child) {
        return ValueListenableBuilder<ThemeMode>(
          valueListenable: themeModeNotifier,
          builder: (context, mode, _) {
            return Theme(
              data: mode == ThemeMode.dark
                  ? PebbleTheme.darkTheme
                  : PebbleTheme.lightTheme,
              child: child!,
            );
          },
        );
      },
      home: const SplashScreen(),
    );
  }
}
