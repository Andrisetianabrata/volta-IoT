import 'package:flutter/material.dart';

import 'pebble_card.dart';

/// Pratinjau statis notifications, interface, dan others.
/// Semua aksi hanya lokal. Peta, webhook, dan HTML memakai placeholder
/// jujur karena dependensi natives (OSM, WebView) masuk Fase 2.

class PushPreview extends StatefulWidget {
  const PushPreview({super.key});

  @override
  State<PushPreview> createState() => _PushPreviewState();
}

class _PushPreviewState extends State<PushPreview> {
  bool _on = true;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return PebbleCard(
      title: 'Notification push',
      pin: 'alarm',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: cs.onSurface.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(Icons.notifications_outlined),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Tangki hampir kosong', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('Level kurang dari 2 selama 5 mnt'),
                  ],
                ),
              ),
              Switch(value: _on, onChanged: (v) => setState(() => _on = v)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _on ? 'Bersenjata' : 'Dibisukan',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class TabsPreview extends StatefulWidget {
  const TabsPreview({super.key});

  @override
  State<TabsPreview> createState() => _TabsPreviewState();
}

class _TabsPreviewState extends State<TabsPreview> {
  int _i = 0;
  static const _pages = ['home', 'sensors', 'log'];
  static const _texts = [
    'Ringkasan iklim ruangan.',
    'Semua ubin sensor.',
    'Log kejadian perangkat.',
  ];

  @override
  Widget build(BuildContext context) {
    return PebbleCard(
      title: 'Tabs',
      pin: 'tiga halaman',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 6,
            children: [
              for (var i = 0; i < _pages.length; i++)
                ChoiceChip(
                  label: Text(_pages[i]),
                  selected: _i == i,
                  onSelected: (_) => setState(() => _i = i),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(_texts[_i]),
        ],
      ),
    );
  }
}

class MenuPreview extends StatefulWidget {
  const MenuPreview({super.key});

  @override
  State<MenuPreview> createState() => _MenuPreviewState();
}

class _MenuPreviewState extends State<MenuPreview> {
  String _v = 'tomat';

  @override
  Widget build(BuildContext context) {
    return PebbleCard(
      title: 'Menu',
      pin: 'plot',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _v,
            decoration: const InputDecoration(labelText: 'Petak aktif'),
            items: const [
              DropdownMenuItem(value: 'tomat', child: Text('Tomat bed A')),
              DropdownMenuItem(value: 'cabai', child: Text('Cabai bed B')),
              DropdownMenuItem(value: 'selada', child: Text('Selada rak C')),
            ],
            onChanged: (v) => setState(() => _v = v ?? _v),
          ),
          const SizedBox(height: 4),
          Text(
            'Memilih mengirim index 1-3 ke hardware',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class TablePreview extends StatelessWidget {
  const TablePreview({super.key});

  static const _rows = [
    ['12:00', 'temp', '24.8 C'],
    ['11:55', 'soil', '68 %'],
    ['11:50', 'tank', '7/10'],
    ['11:45', 'pump', 'ON'],
  ];

  @override
  Widget build(BuildContext context) {
    final small = Theme.of(context).textTheme.bodySmall;
    return PebbleCard(
      title: 'Table',
      pin: 'multi',
      child: Table(
        columnWidths: const {0: FlexColumnWidth(1), 1: FlexColumnWidth(1), 2: FlexColumnWidth(1.4)},
        children: [
          TableRow(
            children: [
              Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text('Waktu', style: small)),
              Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text('Pin', style: small)),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Text('Nilai', style: small, textAlign: TextAlign.right),
              ),
            ],
          ),
          for (final r in _rows)
            TableRow(
              children: [
                Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text(r[0])),
                Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text(r[1])),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Text(r[2], textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600)),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class MapPreview extends StatelessWidget {
  const MapPreview({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return PebbleCard(
      title: 'Map',
      pin: 'gps',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 150,
            width: double.infinity,
            decoration: BoxDecoration(
              color: cs.onSurface.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.map_outlined, size: 36),
                  SizedBox(height: 8),
                  Text('-6.2088, 106.8456 (contoh)'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Ubin peta OSM menyusul di Fase 2',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class BridgePreview extends StatefulWidget {
  const BridgePreview({super.key});

  @override
  State<BridgePreview> createState() => _BridgePreviewState();
}

class _BridgePreviewState extends State<BridgePreview> {
  String _from = 'esp32-01';

  @override
  Widget build(BuildContext context) {
    return PebbleCard(
      title: 'Bridge',
      pin: 'relay ke pump',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _from,
            decoration: const InputDecoration(labelText: 'Dari device'),
            items: const [
              DropdownMenuItem(value: 'esp32-01', child: Text('ESP32-01 rumah kaca')),
              DropdownMenuItem(value: 'esp32-02', child: Text('ESP32-02 rumah pompa')),
            ],
            onChanged: (v) => setState(() => _from = v ?? _from),
          ),
          const SizedBox(height: 8),
          Text(
            'Meneruskan tulis ke pin device lain',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class WebhookPreview extends StatefulWidget {
  const WebhookPreview({super.key});

  @override
  State<WebhookPreview> createState() => _WebhookPreviewState();
}

class _WebhookPreviewState extends State<WebhookPreview> {
  final _url = TextEditingController(text: 'https://kebun.example.id/hook');

  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PebbleCard(
      title: 'Webhook',
      pin: 'report',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _url,
            keyboardType: TextInputType.url,
            decoration: const InputDecoration(labelText: 'Endpoint'),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Pratinjau: tidak mengirim ke jaringan')),
                );
              },
              child: const Text('Kirim ping uji'),
            ),
          ),
        ],
      ),
    );
  }
}

class BlePreview extends StatefulWidget {
  const BlePreview({super.key});

  @override
  State<BlePreview> createState() => _BlePreviewState();
}

class _BlePreviewState extends State<BlePreview> {
  bool _scan = false;

  @override
  Widget build(BuildContext context) {
    return PebbleCard(
      title: 'Bluetooth BLE',
      pin: 'lokal',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Commissioning', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('Tanpa internet'),
                  ],
                ),
              ),
              Switch(value: _scan, onChanged: (v) => setState(() => _scan = v)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _scan ? 'VOLTA-01A4 -58 dBm (contoh)' : 'Pindai mati, nyalakan untuk cari device',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class HtmlPreview extends StatelessWidget {
  const HtmlPreview({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return PebbleCard(
      title: 'HTML kustom',
      pin: 'html',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: cs.onSurface.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('DENAH RUANG A'),
                SizedBox(height: 4),
                Text('24.8 C', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w600)),
                SizedBox(height: 4),
                Text('Denah mini contoh, bukan WebView'),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'WebView sandbox menyusul di Fase 2',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
