import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:web_socket_channel/web_socket_channel.dart';

import 'models.dart';

/// URI WS untuk stream device. http->ws, https->wss.
Uri streamUri(String baseUrl, String deviceId, String token) {
  final base = Uri.parse(baseUrl);
  final scheme = base.scheme == 'https' ? 'wss' : 'ws';
  return base.replace(
    scheme: scheme,
    path: '${base.path}/devices/$deviceId/stream'.replaceFirst('//', '/'),
    queryParameters: {'token': token},
  );
}

/// Parse satu pesan WS menjadi (pin, value). Pesan non-JSON
/// (mis. sapaan connect) diabaikan -> null.
({String pin, String value})? parsePinMessage(dynamic message) {
  if (message is! String) return null;
  try {
    final decoded = jsonDecode(message);
    if (decoded is! Map) return null;
    final pin = decoded['pin'];
    final value = decoded['value'];
    if (pin is! String || value is! String) return null;
    return (pin: pin, value: value);
  } on FormatException {
    return null;
  }
}

/// Delay reconnect ke-n: 1/2/4/8 dtk + jitter, capped 8 dtk.
Duration backoffDelay(int attempt, [int Function(int)? jitter]) {
  final base = min(1 << attempt, 8);
  final j = jitter != null ? jitter(base) : Random().nextInt(1000);
  return Duration(seconds: base, milliseconds: j % 1000);
}

enum LiveState { connecting, live, reconnecting }

/// Satu koneksi WS per device dengan reconnect otomatis.
class LivePins {
  LivePins({
    required this.baseUrl,
    required this.deviceId,
    required this.token,
    required this.onEvent,
    required this.onState,
  });

  final String baseUrl;
  final String deviceId;
  final String token;
  final void Function(String pin, PinValue value) onEvent;
  final void Function(LiveState state) onState;

  WebSocketChannel? _channel;
  StreamSubscription? _sub;
  bool _closed = false;
  int _attempt = 0;
  Timer? _retryTimer;

  void start() {
    _closed = false;
    _attempt = 0;
    _connect();
  }

  void _connect() {
    if (_closed) return;
    onState(_attempt == 0 ? LiveState.connecting : LiveState.reconnecting);
    final channel = WebSocketChannel.connect(
      streamUri(baseUrl, deviceId, token),
    );
    _channel = channel;
    channel.ready.then((_) {
      if (_closed || _channel != channel) return;
      _attempt = 0;
      onState(LiveState.live);
    });
    _sub = channel.stream.listen(
      (message) {
        final parsed = parsePinMessage(message);
        if (parsed == null) return;
        _attempt = 0;
        onState(LiveState.live);
        onEvent(
          parsed.pin,
          PinValue(value: parsed.value, updatedAt: _now()),
        );
      },
      onError: (_) => _scheduleRetry(),
      onDone: () => _scheduleRetry(),
      cancelOnError: false,
    );
  }

  void _scheduleRetry() {
    if (_closed) return;
    _sub?.cancel();
    _sub = null;
    try {
      _channel?.sink.close();
    } catch (_) {}
    _channel = null;
    onState(LiveState.reconnecting);
    final delay = backoffDelay(_attempt);
    _attempt++;
    _retryTimer?.cancel();
    _retryTimer = Timer(delay, _connect);
  }

  Future<void> close() async {
    _closed = true;
    _retryTimer?.cancel();
    await _sub?.cancel();
    _sub = null;
    try {
      await _channel?.sink.close();
    } catch (_) {}
    _channel = null;
  }

  static int _now() => DateTime.now().millisecondsSinceEpoch ~/ 1000;
}
