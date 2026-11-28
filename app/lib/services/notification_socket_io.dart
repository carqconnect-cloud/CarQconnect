import 'dart:async';
import 'dart:convert';
import 'dart:io';

typedef SocketNotificationCallback = void Function(Map<String, dynamic> data);

/// Lightweight Engine.IO v4 / Socket.IO WebSocket client for instant push
/// notifications without external pub dependency constraints.
class NotificationSocketClient {
  WebSocket? _socket;
  StreamSubscription? _sub;
  Timer? _reconnectTimer;
  String? _lastBaseUrl;
  String? _lastToken;
  SocketNotificationCallback? _onNotification;
  bool _disposed = false;
  int _reconnectAttempts = 0;

  Future<void> connect({
    required String baseUrl,
    required String token,
    required SocketNotificationCallback onNotification,
  }) async {
    _disposed = false;
    _onNotification = onNotification;

    if (_socket != null &&
        _socket!.readyState == WebSocket.open &&
        _lastBaseUrl == baseUrl &&
        _lastToken == token) {
      return;
    }

    disconnect(keepReconnectTarget: false);
    _lastBaseUrl = baseUrl;
    _lastToken = token;
    _disposed = false;
    await _openSocket();
  }

  Future<void> _openSocket() async {
    if (_disposed) return;
    final baseUrl = _lastBaseUrl;
    final token = _lastToken;
    if (baseUrl == null || token == null || token.isEmpty) return;

    try {
      final parsed = Uri.parse(baseUrl);
      final wsScheme = parsed.scheme == 'https' ? 'wss' : 'ws';
      final wsUri = Uri(
        scheme: wsScheme,
        host: parsed.host,
        port: parsed.hasPort ? parsed.port : null,
        path: '/socket.io/',
        queryParameters: {'EIO': '4', 'transport': 'websocket'},
      );

      final socket = await WebSocket.connect(
        wsUri.toString(),
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 10));

      if (_disposed) {
        await socket.close();
        return;
      }

      _socket = socket;
      _reconnectAttempts = 0;
      socket.pingInterval = const Duration(seconds: 25);

      _sub = socket.listen(
        (raw) => _handleFrame(raw.toString(), token),
        onDone: _scheduleReconnect,
        onError: (_) => _scheduleReconnect(),
        cancelOnError: true,
      );
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void _handleFrame(String frame, String token) {
    if (frame.isEmpty) return;

    // Engine.IO ping ('2') -> respond pong ('3')
    if (frame == '2') {
      _socket?.add('3');
      return;
    }

    // Engine.IO open ('0{...}') -> send Socket.IO CONNECT with auth token ('40{...}')
    if (frame.startsWith('0')) {
      _socket?.add('40${jsonEncode({'token': token})}');
      return;
    }

    // Socket.IO EVENT ('42["event", payload]')
    if (frame.startsWith('42')) {
      try {
        final decoded = jsonDecode(frame.substring(2));
        if (decoded is List && decoded.length >= 2) {
          final eventName = decoded[0]?.toString() ?? '';
          final payload = decoded[1];
          if (eventName == 'notification:new' && payload is Map) {
            _onNotification?.call(Map<String, dynamic>.from(payload));
          }
        }
      } catch (_) {}
    }
  }

  void _scheduleReconnect() {
    _sub?.cancel();
    _sub = null;
    _socket = null;
    if (_disposed || _lastToken == null || _lastToken!.isEmpty) return;

    _reconnectTimer?.cancel();
    final backoffSec = (_reconnectAttempts < 4 ? (1 << _reconnectAttempts) : 30) * 2;
    _reconnectAttempts++;
    _reconnectTimer = Timer(Duration(seconds: backoffSec), _openSocket);
  }

  void disconnect({bool keepReconnectTarget = false}) {
    _disposed = !keepReconnectTarget;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _sub?.cancel();
    _sub = null;
    try {
      _socket?.close();
    } catch (_) {}
    _socket = null;
    if (!keepReconnectTarget) {
      _lastBaseUrl = null;
      _lastToken = null;
    }
  }
}
