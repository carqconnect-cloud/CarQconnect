import 'package:flutter/foundation.dart';
import 'gallery_saver_stub.dart'
    if (dart.library.html) 'gallery_saver_web.dart';

class GallerySaver {
  static Future<bool> saveImage(Uint8List bytes, {required String filename}) async {
    return saveImageToGalleryPlatform(bytes, filename);
  }
}

