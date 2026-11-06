import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'pebble_card.dart';

/// Pratinjau statis displays. Nilai angka hanya contoh tampilan,
/// bukan data device (segel PRATINJAU di cangkang).

class LabeledValuePreview extends StatelessWidget {
  const LabeledValuePreview({super.key});

  @override
  Widget build(BuildContext context) {
    return PebbleCard(
      title: 'Value display',
      pin: 'temp',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const MicroLabel('Suhu rumah kaca'),
          const SizedBox(height: 4),
          Text(
            '24.8 C',
            style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 48),
          ),
          const SizedBox(height: 4),
          Text(
            'Contoh tampilan, bukan data live',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class LedPreview extends StatefulWidget {
  const LedPreview({super.key});

  @override
  State<LedPreview> createState() => _LedPreviewState();
}

class _LedPreviewState extends State<LedPreview> {
  bool _on = true;

  @override
  Widget build(BuildContext context) {
    return PebbleCard(
      title: 'LED',
      pin: 'pump',
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _on
                  ? const Color(0xFFC07A24)
                  : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.1),
              boxShadow: _on
                  ? [BoxShadow(color: const Color(0xFFC07A24).withValues(alpha: 0.5), blurRadius: 18, spreadRadius: 4)]
                  : null,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_on ? 'ON' : 'OFF', style: Theme.of(context).textTheme.titleLarge),
                Text('Pompa relay', style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          Switch(value: _on, onChanged: (v) => setState(() => _on = v)),
        ],
      ),
    );
  }
}

class GaugePreview extends StatelessWidget {
  const GaugePreview({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return PebbleCard(
      title: 'Gauge',
      pin: 'soil',
      child: Column(
        children: [
          SizedBox(
            height: 130,
            child: CustomPaint(
              painter: _StaticDialPainter(
                fraction: 0.68,
                track: cs.onSurface.withValues(alpha: 0.15),
              ),
              child: Center(
                child: Text('68 %', style: Theme.of(context).textTheme.headlineMedium),
              ),
            ),
          ),
          Text('Kelembapan tanah (contoh)', style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _StaticDialPainter extends CustomPainter {
  _StaticDialPainter({required this.fraction, required this.track});

  final double fraction;
  final Color track;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.92);
    final radius = math.min(size.width / 2, size.height * 0.92) - 8;
    const start = math.pi;
    const sweep = math.pi;
    final trackPaint = Paint()
      ..color = track
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), start, sweep, false, trackPaint);
    final valuePaint = Paint()
      ..color = const Color(0xFFC07A24)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), start, sweep * fraction, false, valuePaint);
  }

  @override
  bool shouldRepaint(covariant _StaticDialPainter old) =>
      old.fraction != fraction || old.track != track;
}

class LcdPreview extends StatelessWidget {
  const LcdPreview({super.key});

  @override
  Widget build(BuildContext context) {
    return PebbleCard(
      title: 'LCD',
      pin: 'lcd',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF101408),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Text(
              'T:24.8C H:47%\nPOMPA ON 06:30',
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 15,
                height: 1.6,
                color: Color(0xFFC8E06A),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Dua baris, 16 kolom (contoh)',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class HistoryChartPreview extends StatelessWidget {
  const HistoryChartPreview({super.key});

  @override
  Widget build(BuildContext context) {
    return PebbleCard(
      title: 'SuperChart 24H',
      pin: 'temp',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('25.6 C maks', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          SizedBox(
            height: 140,
            width: double.infinity,
            child: CustomPaint(painter: _ChartPainter()),
          ),
          const SizedBox(height: 4),
          Text(
            'Satu garis copper, contoh 12 titik',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _ChartPainter extends CustomPainter {
  static const _values = [21.2, 20.8, 20.4, 20.9, 22.1, 23.4, 24.8, 25.6, 25.1, 23.9, 22.7, 21.9];

  @override
  void paint(Canvas canvas, Size size) {
    const min = 19.0;
    const max = 27.0;
    final grid = Paint()
      ..color = const Color(0xFF808080).withValues(alpha: 0.25)
      ..strokeWidth = 1;
    for (var i = 1; i < 4; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }
    final pts = <Offset>[];
    for (var i = 0; i < _values.length; i++) {
      final x = size.width * i / (_values.length - 1);
      final y = size.height - ((_values[i] - min) / (max - min)) * size.height;
      pts.add(Offset(x, y));
    }
    final line = Paint()
      ..color = const Color(0xFFC07A24)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final path = Path()..moveTo(pts.first.dx, pts.first.dy);
    for (var i = 1; i < pts.length; i++) {
      path.lineTo(pts[i].dx, pts[i].dy);
    }
    canvas.drawPath(path, line);
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

class TerminalPreview extends StatefulWidget {
  const TerminalPreview({super.key});

  @override
  State<TerminalPreview> createState() => _TerminalPreviewState();
}

class _TerminalPreviewState extends State<TerminalPreview> {
  final _lines = ['volta> connected @ 115200', 'suhu?', 'suhu=24.8'];
  final _draft = TextEditingController();

  @override
  void dispose() {
    _draft.dispose();
    super.dispose();
  }

  void _send() {
    final cmd = _draft.text.trim();
    if (cmd.isEmpty) return;
    setState(() {
      _lines.addAll(['> $cmd', 'ok (contoh)']);
      if (_lines.length > 8) _lines.removeRange(0, _lines.length - 8);
    });
    _draft.clear();
  }

  @override
  Widget build(BuildContext context) {
    return PebbleCard(
      title: 'Terminal',
      pin: 'cmd',
      child: Column(
        children: [
          Container(
            height: 110,
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF111111),
              borderRadius: BorderRadius.circular(16),
            ),
            child: SingleChildScrollView(
              reverse: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final l in _lines)
                    Text(
                      l,
                      style: TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: l.startsWith('> ')
                            ? const Color(0xFFE0A75E)
                            : Colors.white.withValues(alpha: 0.85),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _draft,
                  decoration: const InputDecoration(
                    hintText: 'Ketik perintah',
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  onSubmitted: (_) => _send(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: _send,
                icon: const Icon(Icons.send),
                tooltip: 'Kirim (echo lokal)',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class LevelPreview extends StatefulWidget {
  const LevelPreview({super.key});

  @override
  State<LevelPreview> createState() => _LevelPreviewState();
}

class _LevelPreviewState extends State<LevelPreview> {
  int _v = 7;
  static const _max = 10;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return PebbleCard(
      title: 'Level',
      pin: 'tank',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('$_v/$_max', style: Theme.of(context).textTheme.headlineMedium),
              Row(
                children: [
                  IconButton(
                    onPressed: () => setState(() => _v = (_v - 1).clamp(0, _max)),
                    icon: const Icon(Icons.remove),
                    tooltip: 'Kurangi',
                  ),
                  IconButton(
                    onPressed: () => setState(() => _v = (_v + 1).clamp(0, _max)),
                    icon: const Icon(Icons.add),
                    tooltip: 'Tambah',
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              for (var i = 0; i < _max; i++)
                Expanded(
                  child: Container(
                    height: 36,
                    margin: EdgeInsets.only(right: i == _max - 1 ? 0 : 5),
                    decoration: BoxDecoration(
                      color: i < _v ? cs.onSurface : cs.onSurface.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Segmen tangki air (contoh)',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
