import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

Future<bool> shareTextPlatform({
  required String text,
  String? subject,
  String? title,
}) async {
  const channel = MethodChannel('com.carqconnect.app/media');
  try {
    final result = await channel.invokeMethod<bool>('shareContent', {
      'text': text,
      'subject': subject ?? 'Share Document',
      'title': title ?? 'Share Document',
    });
    if (result == true) return true;
  } catch (e) {
    debugPrint('Platform shareContent error: $e');
  }

  // Fallback to WhatsApp URL or Clipboard
  try {
    final encoded = Uri.encodeComponent(text);
    final waUrl = Uri.parse('https://wa.me/?text=$encoded');
    if (await canLaunchUrl(waUrl)) {
      return await launchUrl(waUrl, mode: LaunchMode.externalApplication);
    }
  } catch (_) {}

  await Clipboard.setData(ClipboardData(text: text));
  return true;
}

