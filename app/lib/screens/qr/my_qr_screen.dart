import 'package:flutter/material.dart';
import '../profile/my_qr_tags_screen.dart';

/// Displays the active QR tags screen
class MyQrScreen extends StatelessWidget {
  const MyQrScreen({super.key});

  /// In-memory cache of the latest active tag for compatibility
  static Map<String, dynamic>? cachedActiveTag;
  static bool hasEverChecked = false;

  @override
  Widget build(BuildContext context) {
    return const MyQrTagsScreen();
  }
}
