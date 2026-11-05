import 'package:flutter/material.dart';

import '../core/models.dart';

class UnsupportedCard extends StatelessWidget {
  const UnsupportedCard({super.key, required this.widget});

  final BoardWidget widget;

  @override
  Widget build(BuildContext context) {
    final message = widget.configError ??
        'Kind "${widget.kind}" belum didukung di aplikasi ini.';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Widget', style: Theme.of(context).textTheme.labelSmall),
            const SizedBox(height: 8),
            Text(message),
            if (widget.pin.isNotEmpty)
              Text(
                'Pin ${widget.pin}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
          ],
        ),
      ),
    );
  }
}
