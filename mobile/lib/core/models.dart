import 'dart:convert';

const maxWidgetConfigLen = 65536;

/// Widget board apa adanya dari server (`dashboard_widgets`).
class BoardWidget {
  BoardWidget({
    required this.id,
    required this.boardId,
    required this.kind,
    required this.pin,
    required this.config,
    this.configError,
  });

  final String id;
  final String boardId;
  final String kind;
  final String pin;

  /// Config terparse. Dijamin Map bila [configError] null.
  final Map<String, dynamic> config;

  /// Non-null bila config rusak (bukan JSON / > 64 KB).
  final String? configError;

  factory BoardWidget.fromJson(Map<String, dynamic> json) {
    final raw = json['config'];
    final rawStr = raw is String ? raw : '{}';
    if (rawStr.length > maxWidgetConfigLen) {
      return BoardWidget._invalid(json, 'Konfigurasi melebihi 64 KB');
    }
    try {
      final parsed = jsonDecode(rawStr);
      if (parsed is! Map<String, dynamic>) {
        return BoardWidget._invalid(json, 'Konfigurasi bukan objek JSON');
      }
      return BoardWidget(
        id: json['id'] as String? ?? '',
        boardId: json['dashboard_id'] as String? ?? '',
        kind: json['kind'] as String? ?? '',
        pin: json['pin'] as String? ?? '',
        config: parsed,
        configError: null,
      );
    } on FormatException {
      return BoardWidget._invalid(json, 'Konfigurasi bukan JSON valid');
    }
  }

  BoardWidget._invalid(Map<String, dynamic> json, String error)
      : id = json['id'] as String? ?? '',
        boardId = json['dashboard_id'] as String? ?? '',
        kind = json['kind'] as String? ?? '',
        pin = json['pin'] as String? ?? '',
        config = const {},
        configError = error;

  String get device => config['device'] as String? ?? '';

  String get label => config['label'] as String? ?? '';

  double? number(String key) {
    final v = config[key];
    if (v is num) return v.toDouble();
    if (v is String) return double.tryParse(v);
    return null;
  }

  String string(String key, [String def = '']) {
    final v = config[key];
    return v is String ? v : def;
  }
}

/// Nilai pin snapshot dari server.
class PinValue {
  PinValue({required this.value, required this.updatedAt});

  final String value;
  final int updatedAt;

  double? get asNumber => double.tryParse(value);
}
