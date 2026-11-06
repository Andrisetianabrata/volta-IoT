import 'package:shared_preferences/shared_preferences.dart';

/// Satu widget di kanvas lokal (urutan = susunan tampil).
class CanvasItem {
  const CanvasItem({required this.id, required this.kind});

  final String id;
  final String kind;

  String get encoded => '$id|$kind';

  static CanvasItem? decode(String raw) {
    final i = raw.indexOf('|');
    if (i <= 0 || i == raw.length - 1) return null;
    return CanvasItem(id: raw.substring(0, i), kind: raw.substring(i + 1));
  }
}

/// Penyimpanan kanvas di HP (non-rahasia, mirip alamat server).
/// Kunci: volta-canvas-v1.
class CanvasStore {
  CanvasStore._();

  static const key = 'volta-canvas-v1';

  static Future<List<CanvasItem>> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(key);
    if (raw == null) return [];
    return [for (final s in raw) CanvasItem.decode(s)]
        .whereType<CanvasItem>()
        .toList();
  }

  static Future<void> save(List<CanvasItem> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(key, [for (final it in items) it.encoded]);
  }

  static Future<void> add(String kind) async {
    final items = await load();
    final id = '$kind-${DateTime.now().millisecondsSinceEpoch}';
    items.add(CanvasItem(id: id, kind: kind));
    await save(items);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(key);
  }
}
