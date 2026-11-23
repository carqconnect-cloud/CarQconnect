// ignore_for_file: deprecated_member_use, avoid_web_libraries_in_flutter
import 'dart:html' as html;

Future<bool> requestBrowserNotificationPermission() async {
  try {
    if (html.Notification.supported) {
      final perm = await html.Notification.requestPermission();
      return perm == 'granted';
    }
  } catch (e) {
    // Browser does not allow or failed
  }
  return false;
}

void showBrowserNotification(String title, String body) {
  try {
    if (html.Notification.supported && html.Notification.permission == 'granted') {
      html.Notification(title, body: body, icon: 'favicon.png');
    }
  } catch (e) {
    // Ignore any browser notification display errors
  }
}
