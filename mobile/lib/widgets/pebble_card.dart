import 'package:flutter/material.dart';

/// Cangkang Pebble bersama untuk galeri dan kanvas: kartu radius 28,
/// hairline, satu bayangan lembut dari tema. Header selalu memuat judul
/// mikro 11px kapital, chip pin, dan segel PRATINJAU agar nilai statis
/// tidak dikira data device live.
class PebbleCard extends StatelessWidget {
  const PebbleCard({
    super.key,
    required this.title,
    required this.pin,
    required this.child,
  });

  final String title;
  final String pin;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(child: MicroLabel(title)),
                PinChip(pin),
                const SizedBox(width: 6),
                const PreviewChip(),
              ],
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class MicroLabel extends StatelessWidget {
  const MicroLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(text, style: Theme.of(context).textTheme.labelSmall);
  }
}

class PinChip extends StatelessWidget {
  const PinChip(this.pin, {super.key});

  final String pin;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: cs.onSurface.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        pin,
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          fontFeatures: [FontFeature.tabularFigures()],
        ),
      ),
    );
  }
}

class PreviewChip extends StatelessWidget {
  const PreviewChip({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: cs.onSurface.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        'PRATINJAU',
        style: Theme.of(context)
            .textTheme
            .labelSmall
            ?.copyWith(fontSize: 10),
      ),
    );
  }
}
