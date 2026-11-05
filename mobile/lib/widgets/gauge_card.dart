import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../core/models.dart';

class GaugeCard extends StatelessWidget {
  const GaugeCard({super.key, required this.widget, required this.value});

  final BoardWidget widget;
  final PinValue? value;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final min = widget.number('min') ?? 0;
    final max = widget.number('max') ?? 100;
    final unit = widget.string('unit');
    final title = widget.label.isEmpty ? 'Gauge' : widget.label;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.labelSmall),
            const SizedBox(height: 12),
            SizedBox(
              height: 150,
              child: CustomPaint(
                painter: _DialPainter(
                  fraction: _fraction(value?.asNumber, min, max),
                  track: cs.onSurface.withValues(alpha: 0.15),
                  // Copper = nilai live/energi, satu-satunya aksen kartu.
                  accent: const Color(0xFFC07A24),
                ),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _display(value),
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      if (unit.isNotEmpty)
                        Text(
                          unit,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(_num(min), style: Theme.of(context).textTheme.bodySmall),
                Text(_num(max), style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static double _fraction(double? v, double min, double max) {
    if (v == null || max <= min) return 0;
    return ((v - min) / (max - min)).clamp(0.0, 1.0);
  }

  static String _display(PinValue? value) {
    if (value == null) return '—';
    return value.asNumber != null ? _num(value.asNumber!) : value.value;
  }

  static String _num(double v) =>
      v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(1);
}

class _DialPainter extends CustomPainter {
  _DialPainter({
    required this.fraction,
    required this.track,
    required this.accent,
  });

  final double fraction;
  final Color track;
  final Color accent;

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
    if (fraction > 0) {
      final valuePaint = Paint()
        ..color = accent
        ..style = PaintingStyle.stroke
        ..strokeWidth = 10
        ..strokeCap = StrokeCap.round;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        start,
        sweep * fraction,
        false,
        valuePaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _DialPainter old) =>
      old.fraction != fraction || old.track != track || old.accent != accent;
}
