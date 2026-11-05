import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/live_pins.dart';
import '../core/models.dart';
import '../core/session.dart';
import 'login_screen.dart';
import '../widgets/button_card.dart';
import '../widgets/gauge_card.dart';
import '../widgets/slider_card.dart';
import '../widgets/unsupported_card.dart';

class _BoardData {
  _BoardData(this.widgets, this.pins);

  final List<BoardWidget> widgets;
  final Map<String, Map<String, PinValue>> pins;
}

class BoardScreen extends StatefulWidget {
  const BoardScreen({
    super.key,
    required this.baseUrl,
    required this.token,
    required this.board,
  });

  final String baseUrl;
  final String token;
  final VoltaBoard board;

  @override
  State<BoardScreen> createState() => _BoardScreenState();
}

class _BoardScreenState extends State<BoardScreen> {
  late Future<_BoardData> _future;
  final _live = <String, Map<String, PinValue>>{};
  final _liveState = <String, LiveState>{};
  final _conns = <String, LivePins>{};

  @override
  void initState() {
    super.initState();
    _reload();
  }

  @override
  void dispose() {
    for (final c in _conns.values) {
      c.close();
    }
    super.dispose();
  }

  void _reload() {
    for (final c in _conns.values) {
      c.close();
    }
    _conns.clear();
    _live.clear();
    _liveState.clear();
    setState(() {
      _future = _load();
    });
  }

  Future<_BoardData> _load() async {
    final api = VoltaApi(baseUrl: widget.baseUrl);
    final widgets = await api.listWidgets(widget.token, widget.board.id);
    final devices = {
      for (final w in widgets)
        if (w.configError == null && w.device.isNotEmpty) w.device,
    };
    final pins = <String, Map<String, PinValue>>{};
    await Future.wait(devices.map((d) async {
      try {
        pins[d] = await api.listPins(widget.token, d);
      } catch (_) {
        pins[d] = {};
      }
    }));
    if (!mounted) return _BoardData(widgets, pins);
    for (final d in devices) {
      final conn = LivePins(
        baseUrl: widget.baseUrl,
        deviceId: d,
        token: widget.token,
        onEvent: (pin, value) {
          if (!mounted) return;
          setState(() {
            _live.putIfAbsent(d, () => {})[pin] = value;
          });
        },
        onState: (state) {
          if (!mounted) return;
          setState(() => _liveState[d] = state);
        },
      );
      _conns[d] = conn;
      conn.start();
    }
    return _BoardData(widgets, pins);
  }

  PinValue? _valueOf(BoardWidget w, _BoardData data) {
    return _live[w.device]?[w.pin] ?? data.pins[w.device]?[w.pin];
  }

  bool get _reconnecting =>
      _liveState.values.any((s) => s != LiveState.live);

  Future<void> _logout() async {
    await SessionStore().clear();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  void _backToLogin(String message) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.board.name),
        actions: [
          IconButton(
            onPressed: _reload,
            icon: const Icon(Icons.refresh),
            tooltip: 'Muat ulang',
          ),
          IconButton(
            onPressed: _logout,
            icon: const Icon(Icons.logout),
            tooltip: 'Keluar',
          ),
        ],
      ),
      body: FutureBuilder<_BoardData>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 12),
                  Text('Memuat board'),
                ],
              ),
            );
          }
          if (snapshot.hasError) {
            final err = snapshot.error;
            if (err is ApiException && err.status == 401) {
              _backToLogin('Sesi berakhir, silakan masuk lagi');
              return const SizedBox.shrink();
            }
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      err is ApiException ? err.message : 'Gagal memuat board',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: _reload,
                      child: const Text('Coba lagi'),
                    ),
                  ],
                ),
              ),
            );
          }
          final data = snapshot.data!;
          if (data.widgets.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Board kosong. Tambah widget segera hadir.',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          final api = VoltaApi(baseUrl: widget.baseUrl);
          final banner = _reconnecting
              ? Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  color: Theme.of(context).colorScheme.surface,
                  child: Text(
                    'Menghubungkan ulang…',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                )
              : const SizedBox.shrink();
          return Column(
            children: [
              banner,
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: data.widgets.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, i) {
                    final w = data.widgets[i];
                    if (w.configError != null) {
                      return UnsupportedCard(widget: w);
                    }
                    final value = _valueOf(w, data);
                    switch (w.kind) {
                      case 'gauge':
                        return GaugeCard(widget: w, value: value);
                      case 'button':
                        return ButtonCard(
                          api: api,
                          token: widget.token,
                          model: w,
                        );
                      case 'slider':
                        return SliderCard(
                          api: api,
                          token: widget.token,
                          model: w,
                          value: value,
                        );
                      default:
                        return UnsupportedCard(widget: w);
                    }
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
