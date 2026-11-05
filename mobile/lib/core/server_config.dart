import 'package:shared_preferences/shared_preferences.dart';

const serverPrefsKey = 'volta_server_url';

/// Normalisasi input server menjadi base URL, atau null bila tidak valid.
/// Menerima `host`, `host:port`, atau URL penuh http/https.
String? normalizeServerUrl(String input) {
  final text = input.trim();
  if (text.isEmpty) return null;
  final withScheme = text.contains('://') ? text : 'http://$text';
  final uri = Uri.tryParse(withScheme);
  if (uri == null || uri.host.isEmpty) return null;
  if (uri.scheme != 'http' && uri.scheme != 'https') return null;
  final port = uri.hasPort ? ':${uri.port}' : '';
  return '${uri.scheme}://${uri.host}$port';
}

class ServerConfig {
  ServerConfig._();

  static Future<String?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(serverPrefsKey);
    if (raw == null) return null;
    return normalizeServerUrl(raw);
  }

  static Future<void> save(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(serverPrefsKey, url);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(serverPrefsKey);
  }
}
