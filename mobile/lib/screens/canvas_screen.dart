import 'package:flutter/material.dart';

import '../core/canvas_store.dart';
import '../core/widget_catalog.dart';
import 'gallery_screen.dart';
import '../widgets/preview_router.dart';

/// Kanvas lokal: susunan pratinjau 25 widget yang bisa diseret ulang
/// lewat gagang, dihapus, dan dikosongkan. Tersimpan di HP
/// (shared_preferences), belum ke server. Isi ditambah dari galeri.
class CanvasScreen extends StatefulWidget {
  const CanvasScreen({super.key});

  @override
  State<CanvasScreen> createState() => _CanvasScreenState();
}

class _CanvasScreenState extends State<CanvasScreen> {
  bool _loading = true;
  List<CanvasItem> _items = [];

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    final items = await CanvasStore.load();
    if (!mounted) return;
    setState(() {
      _items = items;
      _loading = false;
    });
  }

  Future<void> _persist() => CanvasStore.save(_items);

  void _onReorderItem(int oldIndex, int newIndex) {
    setState(() {
      final it = _items.removeAt(oldIndex);
      _items.insert(newIndex, it);
    });
    _persist();
  }

  void _move(String id, int delta) {
    final i = _items.indexWhere((it) => it.id == id);
    final j = i + delta;
    if (i < 0 || j < 0 || j >= _items.length) return;
    setState(() {
      final it = _items.removeAt(i);
      _items.insert(j, it);
    });
    _persist();
  }

  void _remove(String id) {
    setState(() => _items.removeWhere((it) => it.id == id));
    _persist();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Widget dihapus dari kanvas')),
    );
  }

  Future<void> _clear() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Kosongkan kanvas?'),
          content: const Text('Semua widget di kanvas lokal akan dihapus.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Batal'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Kosongkan'),
            ),
          ],
        );
      },
    );
    if (confirm != true || !mounted) return;
    await CanvasStore.clear();
    if (!mounted) return;
    setState(() => _items = []);
  }

  String _titleOf(String kind) {
    for (final e in widgetCatalog) {
      if (e.kind == kind) return e.title;
    }
    return kind;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kanvas'),
        actions: [
          if (_items.isNotEmpty)
            IconButton(
              onPressed: _clear,
              icon: const Icon(Icons.delete_sweep_outlined),
              tooltip: 'Kosongkan kanvas',
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const GalleryScreen()),
          ).then((_) => _reload());
        },
        icon: const Icon(Icons.add),
        label: const Text('Tambah widget'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Kanvas kosong. Tambah widget dari galeri untuk mulai.',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: () {
                            Navigator.of(context)
                                .push(
                                  MaterialPageRoute(
                                      builder: (_) => const GalleryScreen()),
                                )
                                .then((_) => _reload());
                          },
                          child: const Text('Buka galeri'),
                        ),
                      ],
                    ),
                  ),
                )
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                      child: Text(
                        'Seret gagang untuk susun ulang. Tersimpan lokal di HP ini.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                    Expanded(
                      child: ReorderableListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _items.length,
                        buildDefaultDragHandles: false,
                        onReorderItem: _onReorderItem,
                        itemBuilder: (context, i) {
                          final it = _items[i];
                          return Padding(
                            key: ValueKey(it.id),
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8),
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).colorScheme.surface,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withValues(alpha: 0.08),
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      ReorderableDragStartListener(
                                        index: i,
                                        child: const Padding(
                                          padding: EdgeInsets.all(12),
                                          child: Icon(Icons.drag_handle),
                                        ),
                                      ),
                                      Expanded(
                                        child: Text(
                                          _titleOf(it.kind),
                                          style: Theme.of(context).textTheme.titleMedium,
                                        ),
                                      ),
                                      IconButton(
                                        onPressed: i == 0 ? null : () => _move(it.id, -1),
                                        icon: const Icon(Icons.arrow_upward),
                                        tooltip: 'Pindah ke atas',
                                      ),
                                      IconButton(
                                        onPressed: i == _items.length - 1
                                            ? null
                                            : () => _move(it.id, 1),
                                        icon: const Icon(Icons.arrow_downward),
                                        tooltip: 'Pindah ke bawah',
                                      ),
                                      IconButton(
                                        onPressed: () => _remove(it.id),
                                        icon: const Icon(Icons.delete_outline),
                                        tooltip: 'Hapus ${it.kind}',
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 8),
                                previewForKind(it.kind),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
    );
  }
}
