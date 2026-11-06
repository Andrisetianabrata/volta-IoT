import 'package:flutter/material.dart';

import '../core/canvas_store.dart';
import '../core/widget_catalog.dart';
import 'canvas_screen.dart';
import '../widgets/preview_router.dart';

/// Galeri 25 widget gaya Pebble. Semua pratinjau statis dan jujur:
/// tidak ada angka yang diklaim sebagai data live. Tiap kartu bisa
/// ditambah ke kanvas lokal lewat tombol.
class GalleryScreen extends StatelessWidget {
  const GalleryScreen({super.key});

  Future<void> _add(BuildContext context, String kind) async {
    await CanvasStore.add(kind);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Ditambah ke kanvas')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Galeri widget'),
        actions: [
          IconButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const CanvasScreen()),
              );
            },
            icon: const Icon(Icons.dashboard_outlined),
            tooltip: 'Buka kanvas',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Pebble', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 4),
          Text(
            'Kartu radius 28, angka tinta tabular, copper hanya untuk energi atau live. '
            'Angka di sini pratinjau statis, bukan data device.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          for (final cat in WidgetCategory.values) ...[
            _SectionHeader(category: cat),
            for (final e in widgetCatalog.where((w) => w.category == cat)) ...[
              previewForKind(e.kind),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _add(context, e.kind),
                  icon: const Icon(Icons.add),
                  label: Text('Tambah ${e.title} ke kanvas'),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ],
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.category});

  final WidgetCategory category;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(categoryLabel(category), style: Theme.of(context).textTheme.titleLarge),
          Text(categoryHint(category), style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}
