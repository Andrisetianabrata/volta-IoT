import 'package:flutter/material.dart';

/// Token visual Pebble (diwarisi dari galeri beku webapp).
/// Lihat tasks/prd-mobile-flutter.md §9.
class PebbleColors {
  PebbleColors._();

  // --- Gelap ---
  static const darkGround = Color(0xFF0A0A0B);
  static const darkSurface = Color(0xFF131316);
  static const darkRaised = Color(0xFF1B1B1F);
  static const darkText = Color(0xFFF2EFE9);
  static const darkMuted = Color(0xFFA7A7B0);
  static const copper = Color(0xFFC07A24);
  static const darkPositive = Color(0xFF3FC07A);
  static const darkNegative = Color(0xFFE5566F);

  // --- Terang ---
  static const lightGround = Color(0xFFF3F0E8);
  static const lightSurface = Color(0xFFFFFFFF);
  static const lightRaised = Color(0xFFE9E4D6);
  static const lightText = Color(0xFF131315);
  static const lightMuted = Color(0xFF5B5B62);
  static const lightPositive = Color(0xFF247B50);
  static const lightNegative = Color(0xFFC4242A);

  static const radiusCard = 28.0;
}

class PebbleTheme {
  PebbleTheme._();

  static final ThemeData lightTheme = light();
  static final ThemeData darkTheme = dark();

  static ThemeData dark() => _build(
        brightness: Brightness.dark,
        ground: PebbleColors.darkGround,
        surface: PebbleColors.darkSurface,
        raised: PebbleColors.darkRaised,
        text: PebbleColors.darkText,
        muted: PebbleColors.darkMuted,
        positive: PebbleColors.darkPositive,
        negative: PebbleColors.darkNegative,
      );

  static ThemeData light() => _build(
        brightness: Brightness.light,
        ground: PebbleColors.lightGround,
        surface: PebbleColors.lightSurface,
        raised: PebbleColors.lightRaised,
        text: PebbleColors.lightText,
        muted: PebbleColors.lightMuted,
        positive: PebbleColors.lightPositive,
        negative: PebbleColors.lightNegative,
      );

  static ThemeData _build({
    required Brightness brightness,
    required Color ground,
    required Color surface,
    required Color raised,
    required Color text,
    required Color muted,
    required Color positive,
    required Color negative,
  }) {
    // Copper dicadangkan untuk indikator energi/live, bukan untuk border input.
    final colorScheme = ColorScheme(
      brightness: brightness,
      primary: text,
      onPrimary: ground,
      secondary: PebbleColors.copper,
      onSecondary: ground,
      tertiary: positive,
      onTertiary: ground,
      error: negative,
      onError: ground,
      surface: surface,
      onSurface: text,
      surfaceContainerHighest: raised,
      outline: muted,
      outlineVariant: muted.withValues(alpha: 0.4),
    );

    final tabular = const TextStyle().copyWith(
      fontFeatures: const [FontFeature.tabularFigures()],
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: ground,
      canvasColor: ground,
      cardColor: surface,
      dividerColor: muted.withValues(alpha: 0.2),
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: text,
        selectionColor: text.withValues(alpha: 0.25),
        selectionHandleColor: text,
      ),
      textTheme: TextTheme(
        displayLarge: TextStyle(fontSize: 56, fontWeight: FontWeight.w600, color: text, height: 1.0).merge(tabular),
        headlineMedium: TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: text).merge(tabular),
        titleLarge: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: text),
        titleMedium: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: text),
        bodyLarge: TextStyle(fontSize: 16, color: text),
        bodyMedium: TextStyle(fontSize: 14, color: text),
        bodySmall: TextStyle(fontSize: 12, color: muted),
        labelSmall: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 1.2, color: muted),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: ground,
        foregroundColor: text,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: text),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(PebbleColors.radiusCard),
        ),
        margin: EdgeInsets.zero,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: text,
          foregroundColor: ground,
          minimumSize: const Size(0, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: text,
          minimumSize: const Size(0, 48),
          side: BorderSide(color: muted.withValues(alpha: 0.4)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: muted.withValues(alpha: 0.3)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: muted.withValues(alpha: 0.3)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: text, width: 1.5),
        ),
        labelStyle: TextStyle(color: muted),
        hintStyle: TextStyle(color: muted.withValues(alpha: 0.7)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      iconTheme: IconThemeData(color: text),
    );
  }
}