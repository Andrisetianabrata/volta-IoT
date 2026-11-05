import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/time_ago.dart';

class DeviceScreen extends StatefulWidget {
  const DeviceScreen({
    super.key,
    required this.baseUrl,
    required this.token,
    required this.device,
    required this.online,
    required this.updatedAt,
  });

  final String baseUrl;
  final String token;
  final VoltaDevice device;
  final bool online;
  final int updatedAt;

  @override
  State<DeviceScreen> createState() => _DeviceScreenState();
}

class _DeviceScreenState extends State<DeviceScreen> {
  final _url = TextEditingController();
  final _version = TextEditingController();
  bool _busy = false;
  String? _otaMessage;

  @override
  void dispose() {
    _url.dispose();
    _version.dispose();
    super.dispose();
  }

  Future<void> _ota(bool start) async {
    if (_busy) return;
    if (start && _url.text.trim().isEmpty) {
      setState(() => _otaMessage = 'Isi URL firmware dulu');
      return;
    }
    setState(() {
      _busy = true;
      _otaMessage = null;
    });
    try {
      final api = VoltaApi(baseUrl: widget.baseUrl);
      if (start) {
        await api.startOta(
          widget.token,
          widget.device.id,
          _url.text.trim(),
          _version.text.trim(),
        );
        if (!mounted) return;
        setState(() => _otaMessage = 'OTA dimulai');
      } else {
        await api.stopOta(widget.token, widget.device.id);
        if (!mounted) return;
        setState(() => _otaMessage = 'OTA dihentikan');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _otaMessage = e is ApiException ? e.message : 'OTA gagal';
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final pill = widget.online ? 'Online' : 'Offline';
    final pillColor =
        widget.online ? cs.tertiary : cs.onSurface.withValues(alpha: 0.5);
    return Scaffold(
      appBar: AppBar(title: Text(widget.device.name)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Status', style: Theme.of(context).textTheme.labelSmall),
            const SizedBox(height: 8),
            Text(
              widget.updatedAt > 0
                  ? '$pill • ${timeAgo(widget.updatedAt)}'
                  : pill,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(color: pillColor),
            ),
            const SizedBox(height: 24),
            Text('OTA firmware', style: Theme.of(context).textTheme.labelSmall),
            const SizedBox(height: 8),
            TextField(
              controller: _url,
              keyboardType: TextInputType.url,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'URL firmware',
                hintText: 'http://192.168.1.20:9443/fw.bin',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _version,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                labelText: 'Versi',
                hintText: '1.2.0',
              ),
            ),
            const SizedBox(height: 12),
            if (_otaMessage != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_otaMessage!),
              ),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: _busy ? null : () => _ota(true),
                    child: const Text('Mulai OTA'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _busy ? null : () => _ota(false),
                    child: const Text('Hentikan'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
