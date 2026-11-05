import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

final ValueNotifier<ThemeMode> themeModeNotifier =
    ValueNotifier<ThemeMode>(ThemeMode.dark);

void toggleTheme() {
  applyThemeMode(
    themeModeNotifier.value == ThemeMode.dark
        ? ThemeMode.light
        : ThemeMode.dark,
  );
}

void applyThemeMode(ThemeMode mode) {
  themeModeNotifier.value = mode;
  final dark = mode == ThemeMode.dark;
  SystemChrome.setSystemUIOverlayStyle(
    SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: dark ? Brightness.light : Brightness.dark,
      statusBarBrightness: dark ? Brightness.dark : Brightness.light,
    ),
  );
}
