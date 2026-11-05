import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

import '../core/server_config.dart';
import '../core/session.dart';
import '../theme/theme_controller.dart';
import 'devices_screen.dart';
import 'login_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _controller;
  Timer? _fallback;
  bool _gone = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this);
    // Pengaman: animasi gagal dimuat pun user tetap sampai ke login.
    _fallback = Timer(const Duration(seconds: 10), _go);
  }

  @override
  void dispose() {
    _fallback?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _go() async {
    if (_gone || !mounted) return;
    _gone = true;
    final server = await ServerConfig.load();
    final token = await SessionStore().read();
    if (!mounted) return;
    final next = server != null && token != null
        ? DevicesScreen(baseUrl: server, token: token)
        : const LoginScreen();
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => next),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dark = themeModeNotifier.value == ThemeMode.dark;
    // Transparan (elemen putih) hanya terbaca di ground gelap; tema terang
    // tetap pakai varian light yang elemennya gelap.
    final asset = dark
        ? 'assets/lottie/volta-splash-transparent.json'
        : 'assets/lottie/volta-splash-light.json';
    return Scaffold(
      backgroundColor: dark
          ? Theme.of(context).scaffoldBackgroundColor
          : const Color(0xFFF5F3EE),
      body: SafeArea(
        child: Center(
          child: Lottie.asset(
            asset,
            controller: _controller,
            frameRate: FrameRate(60),
            onLoaded: (composition) {
              _controller.duration = composition.duration;
              // Tunggu satu frame statis ter-raster (pemanasan cache)
              // sebelum jam animasi jalan, agar fase drop terlihat.
              WidgetsBinding.instance.waitUntilFirstFrameRasterized.then((_) {
                if (mounted && !_gone) {
                  _controller.forward().whenComplete(_go);
                }
              });
            },
            errorBuilder: (context, error, stackTrace) {
              _go();
              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );
  }
}
