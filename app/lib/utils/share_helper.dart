import 'share_helper_stub.dart'
    if (dart.library.html) 'share_helper_web.dart';

class ShareHelper {
  static Future<bool> shareText({
    required String text,
    String? subject,
    String? title,
  }) async {
    return shareTextPlatform(
      text: text,
      subject: subject,
      title: title,
    );
  }
}

