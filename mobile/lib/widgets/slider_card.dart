import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';

class SliderCard extends StatefulWidget {
  const SliderCard({
    super.key,
    required this.api,
    required this.token,
    required this.model,
    required this.value,
  });

  final VoltaApi api;
  final String token;
  final BoardWidget model;
  final PinValue? value;

  @override
  State<SliderCard> createState() => _SliderCardState();
}

class _SliderCardState extends State<SliderCard> {
  double? _local;

  @override
  Widget build(BuildContext context) {
    final min = widget.model.number('min') ?? 0;
    final max = widget.model.number('max') ?? 100;
    final unit = widget.model.string('unit');
    final title = widget.model.label.isEmpty ? 'Slider' : widget.model.label;
    final current = (_local ?? widget.value?.asNumber ?? min).clamp(min, max);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: Theme.of(context).textTheme.labelSmall),
                Text(
                  unit.isEmpty ? '$current' : '$current $unit',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            Slider(
              value: current.toDouble(),
              min: min.toDouble(),
              max: max.toDouble(),
              onChanged: (v) => setState(() => _local = v),
              onChangeEnd: (v) => _send(v),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _send(double v) async {
    if (widget.model.device.isEmpty) return;
    final text = v == v.roundToDouble() ? v.toInt().toString() : '$v';
    try {
      await widget.api.sendPin(
        widget.token,
        widget.model.device,
        widget.model.pin,
        text,
      );
    } catch (e) {
      if (!mounted) return;
      // Kembali ke nilai server terakhir.
      setState(() => _local = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e is ApiException ? e.message : 'Gagal kirim perintah'),
        ),
      );
    }
  }
}
