import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Central Device & Runtime Security Service
/// Detects compromised/rooted Android devices and jailbroken iOS devices via native platform checks.
class SecurityService {
  static const MethodChannel _securityChannel = MethodChannel('com.carqconnect.app/media');
  static bool _compromisedAlertShown = false;

  /// Check if the device is rooted or jailbroken.
  /// Gracefully returns false on Web, Desktop, and when running in safe environments.
  static Future<bool> isDeviceCompromised() async {
    if (kIsWeb) return false;

    try {
      final bool? isRooted = await _securityChannel.invokeMethod<bool>('isDeviceRooted');
      if (isRooted == true) {
        debugPrint('[SecurityService] WARNING: Device is jailbroken or rooted!');
        return true;
      }
    } catch (e) {
      debugPrint('[SecurityService] Root detection check bypassed or unsupported: $e');
    }
    return false;
  }

  /// Run device security check on app launch.
  /// Shows an informative security alert to protect user trust without crashing the app.
  static Future<void> checkDeviceSecurity(BuildContext context) async {
    if (_compromisedAlertShown) return;

    final compromised = await isDeviceCompromised();
    if (compromised && context.mounted) {
      _compromisedAlertShown = true;
      _showSecurityWarning(context);
    }
  }

  static void _showSecurityWarning(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.gpp_maybe_rounded, color: Color(0xFFF59E0B), size: 28),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Security Warning',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: const Text(
          'This device appears to be rooted or jailbroken. '
          'Running CarQConnect on a modified operating system increases the risk of '
          'unauthorized data access, credential tampering, and network interception.\n\n'
          'Please exercise caution when managing sensitive vehicle or payment information.',
          style: TextStyle(fontSize: 14, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text(
              'I Understand & Accept Risk',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}

