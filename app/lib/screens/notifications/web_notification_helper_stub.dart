Future<bool> requestBrowserNotificationPermission() async {
  return true;
}

void showBrowserNotification(String title, String body) {
  // No-op on non-web platforms
}
