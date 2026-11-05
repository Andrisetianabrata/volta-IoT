import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'models.dart';

class ApiException implements Exception {
  ApiException(this.status, this.code, this.message);

  final int status;
  final String code;
  final String message;

  @override
  String toString() => message;
}

class VoltaDevice {
  VoltaDevice({required this.id, required this.name, required this.createdAt});

  final String id;
  final String name;
  final int createdAt;

  factory VoltaDevice.fromJson(Map<String, dynamic> json) => VoltaDevice(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        createdAt: (json['created_at'] as num?)?.toInt() ?? 0,
      );
}

class VoltaBoard {
  VoltaBoard({required this.id, required this.name, required this.createdAt});

  final String id;
  final String name;
  final int createdAt;

  factory VoltaBoard.fromJson(Map<String, dynamic> json) => VoltaBoard(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        createdAt: (json['created_at'] as num?)?.toInt() ?? 0,
      );
}

class DeviceCredentials {
  DeviceCredentials({required this.deviceId, required this.token});

  final String deviceId;
  final String token;
}

class VoltaApi {
  VoltaApi({required this.baseUrl, http.Client? client})
      : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  static const _timeout = Duration(seconds: 10);

  Future<String> register(String email, String password) async {
    final body = await _post(
      '/auth/register',
      {'email': email, 'password': password},
    );
    final id = body['user_id'];
    if (id is! String || id.isEmpty) {
      throw ApiException(201, 'INVALID_RESPONSE', 'Respons register tidak valid');
    }
    return id;
  }

  Future<String> login(String email, String password) async {
    final body = await _post(
      '/auth/login',
      {'email': email, 'password': password},
    );
    final token = body['token'];
    if (token is! String || token.isEmpty) {
      throw ApiException(200, 'INVALID_RESPONSE', 'Respons login tidak valid');
    }
    return token;
  }

  Future<bool> health() async {
    try {
      final res = await _client
          .get(Uri.parse('$baseUrl/healthz'))
          .timeout(const Duration(seconds: 3));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<List<VoltaBoard>> listDashboards(String token) async {
    final res = await _get('/dashboards', token);
    final body = _decode(res);
    if (body is! List) {
      throw ApiException(res.statusCode, 'INVALID_RESPONSE', 'Respons board tidak valid');
    }
    return body
        .map((e) => VoltaBoard.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<String> createDashboard(String token, String name) async {
    final res = await _postAuthed('/dashboards', token, {'name': name});
    final body = _decode(res);
    final id = body is Map ? body['id'] : null;
    if (id is! String || id.isEmpty) {
      throw ApiException(res.statusCode, 'INVALID_RESPONSE', 'Respons buat board tidak valid');
    }
    return id;
  }

  Future<void> deleteDashboard(String token, String id) async {
    late http.Response res;
    try {
      res = await _client
          .delete(
            Uri.parse('$baseUrl/dashboards/$id'),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(_timeout);
    } on TimeoutException {
      throw ApiException(0, 'TIMEOUT', 'Server tidak menjawab');
    } on SocketException {
      throw ApiException(0, 'UNREACHABLE', 'Server tidak terjangkau');
    }
    _decode(res);
  }

  Future<DeviceCredentials> createDevice(String token, String name) async {
    final res = await _postAuthed('/devices', token, {'name': name});
    final body = _decode(res);
    final map = body is Map ? body.cast<String, dynamic>() : <String, dynamic>{};
    final id = map['device_id'];
    final tok = map['token'];
    if (id is! String || id.isEmpty || tok is! String || tok.isEmpty) {
      throw ApiException(res.statusCode, 'INVALID_RESPONSE', 'Respons buat device tidak valid');
    }
    return DeviceCredentials(deviceId: id, token: tok);
  }

  Future<List<VoltaDevice>> listDevices(String token) async {
    final res = await _get('/devices', token);
    final body = _decode(res);
    if (body is! List) {
      throw ApiException(res.statusCode, 'INVALID_RESPONSE', 'Respons device tidak valid');
    }
    return body
        .map((e) => VoltaDevice.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<Map<String, PinValue>> listPins(String token, String deviceId) async {
    final res = await _get('/devices/$deviceId/pins', token);
    final body = _decode(res);
    if (body is! List) {
      throw ApiException(res.statusCode, 'INVALID_RESPONSE', 'Respons pin tidak valid');
    }
    final out = <String, PinValue>{};
    for (final e in body) {
      final m = (e as Map).cast<String, dynamic>();
      final pin = m['pin'] as String? ?? '';
      if (pin.isEmpty) continue;
      out[pin] = PinValue(
        value: m['value'] as String? ?? '',
        updatedAt: (m['updated_at'] as num?)?.toInt() ?? 0,
      );
    }
    return out;
  }

  Future<({bool online, int updatedAt})> deviceStatus(
    String token,
    String deviceId,
  ) async {
    final res = await _get('/devices/$deviceId/status', token);
    final body = _decode(res);
    if (body is! Map<String, dynamic>) return (online: false, updatedAt: 0);
    return (
      online: body['online'] == true,
      updatedAt: (body['updated_at'] as num?)?.toInt() ?? 0,
    );
  }

  Future<bool> deviceOnline(String token, String deviceId) async {
    return (await deviceStatus(token, deviceId)).online;
  }

  Future<void> deleteDevice(String token, String id) async {
    try {
      final res = await _client
          .delete(
            Uri.parse('$baseUrl/devices/$id'),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(_timeout);
      _decode(res);
    } on TimeoutException {
      throw ApiException(0, 'TIMEOUT', 'Server tidak menjawab');
    } on SocketException {
      throw ApiException(0, 'UNREACHABLE', 'Server tidak terjangkau');
    }
  }

  Future<void> startOta(
    String token,
    String deviceId,
    String url,
    String version,
  ) async {
    final res = await _postAuthed(
      '/devices/$deviceId/ota/start',
      token,
      {'url': url, 'version': version},
    );
    _decode(res);
  }

  Future<void> stopOta(String token, String deviceId) async {
    final res = await _postAuthed(
      '/devices/$deviceId/ota/stop',
      token,
      {},
    );
    _decode(res);
  }

  Future<List<BoardWidget>> listWidgets(String token, String boardId) async {
    final res = await _get('/dashboards/$boardId/widgets', token);
    final body = _decode(res);
    if (body is! List) {
      throw ApiException(res.statusCode, 'INVALID_RESPONSE', 'Respons widget tidak valid');
    }
    return body
        .map((e) => BoardWidget.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<void> sendPin(
    String token,
    String deviceId,
    String pin,
    String value,
  ) async {
    try {
      final res = await _client
          .put(
            Uri.parse('$baseUrl/devices/$deviceId/pins/$pin'),
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json; charset=UTF-8',
            },
            body: jsonEncode({'value': value}),
          )
          .timeout(const Duration(seconds: 2));
      _decode(res);
    } on TimeoutException {
      throw ApiException(0, 'CMD_TIMEOUT', 'Perintah timeout (2 dtk)');
    } on SocketException {
      throw ApiException(0, 'UNREACHABLE', 'Server tidak terjangkau');
    }
  }

  Future<http.Response> _get(String path, String token) async {
    try {
      return await _client
          .get(
            Uri.parse('$baseUrl$path'),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(_timeout);
    } on TimeoutException {
      throw ApiException(0, 'TIMEOUT', 'Server tidak menjawab');
    } on SocketException {
      throw ApiException(0, 'UNREACHABLE', 'Server tidak terjangkau');
    }
  }

  Future<http.Response> _postAuthed(
    String path,
    String token,
    Map<String, String> payload,
  ) async {
    try {
      return await _client
          .post(
            Uri.parse('$baseUrl$path'),
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json; charset=UTF-8',
            },
            body: jsonEncode(payload),
          )
          .timeout(_timeout);
    } on TimeoutException {
      throw ApiException(0, 'TIMEOUT', 'Server tidak menjawab');
    } on SocketException {
      throw ApiException(0, 'UNREACHABLE', 'Server tidak terjangkau');
    }
  }

  Future<Map<String, dynamic>> _post(
    String path,
    Map<String, String> payload,
  ) async {
    late http.Response res;
    try {
      res = await _client
          .post(
            Uri.parse('$baseUrl$path'),
            headers: {'Content-Type': 'application/json; charset=UTF-8'},
            body: jsonEncode(payload),
          )
          .timeout(_timeout);
    } on TimeoutException {
      throw ApiException(0, 'TIMEOUT', 'Server tidak menjawab');
    } on SocketException {
      throw ApiException(0, 'UNREACHABLE', 'Server tidak terjangkau');
    }
    final body = _decode(res);
    if (body is! Map<String, dynamic>) {
      throw ApiException(res.statusCode, 'INVALID_RESPONSE', 'Respons server tidak valid');
    }
    return body;
  }

  dynamic _decode(http.Response res) {
    dynamic body;
    try {
      body = jsonDecode(res.body);
    } on FormatException {
      throw ApiException(res.statusCode, 'INVALID_RESPONSE', 'Respons server tidak valid');
    }
    if (res.statusCode >= 400) {
      final err = body is Map ? body['error'] : null;
      final code = err is Map ? err['code'] as String? : null;
      final message = err is Map ? err['message'] as String? : null;
      throw ApiException(
        res.statusCode,
        code ?? 'ERROR',
        message ?? 'Permintaan gagal (${res.statusCode})',
      );
    }
    return body;
  }
}
