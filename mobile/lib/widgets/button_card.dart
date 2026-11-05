import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';

class ButtonCard extends StatefulWidget {
  const ButtonCard({
    super.key,
    required this.api,
    required this.token,
    required this.model,
  });

  final VoltaApi api;
  final String token;
  final BoardWidget model;

  @override
  State<ButtonCard> createState() => _ButtonCardState();
}

class _ButtonCardState extends State<ButtonCard> {
  bool _sending = false;

  Future<void> _send(String value) async {
    if (_sending || widget.model.device.isEmpty) return;
    setState(() => _sending = true);
    try {
      final online = await widget.api.deviceOnline(
        widget.token,
        widget.model.device,
      );
      if (!mounted) return;
      if (!online) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Device offline, perintah tidak dikirim')),
        );
        return;
      }
      await widget.api.sendPin(
        widget.token,
        widget.model.device,
        widget.model.pin,
        value,
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e is ApiException ? e.message : 'Gagal kirim perintah'),
        ),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _pressCycle() async {
    if (_sending) return;
    await _send(widget.model.string('on', '1'));
    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;
    await _send(widget.model.string('off', '0'));
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.model.label.isEmpty ? 'Button' : widget.model.label;
    final on = widget.model.string('on', '1');
    final off = widget.model.string('off', '0');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.labelSmall),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: GestureDetector(
                onTapDown: (_) => _send(on),
                onTapUp: (_) => _send(off),
                onTapCancel: () => _send(off),
                child: FilledButton(
                  // Aksi lewat gesture (tahan = on, lepas = off).
                  // onPressed hanya untuk akses keyboard: satu siklus tekan.
                  onPressed: _sending ? null : _pressCycle,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 56),
                  ),
                  child: _sending
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Tahan'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
