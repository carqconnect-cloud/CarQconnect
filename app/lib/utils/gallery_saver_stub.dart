import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

Future<bool> saveImageToGalleryPlatform(Uint8List bytes, String filename) async {
  const channel = MethodChannel('com.carqconnect.app/media');
  try {
    final result = await channel.invokeMethod<bool>('saveImageToGallery', {
      'bytes': bytes,
      'filename': filename,
    });
    return result ?? false;
  } catch (e) {
    debugPrint('Platform saveImageToGallery error: $e');
    return false;
  }
}

