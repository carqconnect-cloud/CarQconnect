// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:html' as html;
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

Future<bool> shareTextPlatform({
  required String text,
  String? subject,
  String? title,
}) async {
  try {
    await html.window.navigator.share({
      'title': title ?? 'Share Document',
      'text': text,
    });
    return true;
  } catch (_) {
    // User cancelled or Web Share API not supported in this browser
  }

  // Fallback to WhatsApp or clipboard
  try {
    final encoded = Uri.encodeComponent(text);
    final waUrl = Uri.parse('https://wa.me/?text=$encoded');
    await launchUrl(waUrl, mode: LaunchMode.externalApplication);
    return true;
  } catch (_) {}

  await Clipboard.setData(ClipboardData(text: text));
  return true;
}
