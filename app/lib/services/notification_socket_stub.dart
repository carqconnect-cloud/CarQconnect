typedef SocketNotificationCallback = void Function(Map<String, dynamic> data);

class NotificationSocketClient {
  Future<void> connect({
    required String baseUrl,
    required String token,
    required SocketNotificationCallback onNotification,
  }) async {}

  void disconnect() {}
}
