import 'dart:async';
import 'dart:io' show InternetAddress;
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../utils/api_config.dart';

/// Centralized service to check internet connectivity
/// strictly on app launch or on demand (e.g. manual retry)
/// without any intrusive periodic polling or idle timeouts.
class NetworkService {
  static final NetworkService instance = NetworkService._internal();
  factory NetworkService() => instance;
  NetworkService._internal();

  /// ValueNotifier indicating whether internet connectivity is active
  static final ValueNotifier<bool> isConnectedNotifier = ValueNotifier<bool>(true);

  /// Convenient boolean getter
  static bool get isConnected => isConnectedNotifier.value;

  bool _isChecking = false;

  /// Check connectivity once on app startup and return the result
  static Future<bool> checkInitialConnection() async {
    return await instance.checkConnection();
  }

  /// Backward compatibility helper
  static Future<void> init() async {
    await instance.checkConnection();
  }

  /// Actively test internet connectivity with robust fallbacks
  Future<bool> checkConnection() async {
    if (_isChecking) return isConnected;
    _isChecking = true;

    bool connected = false;

    try {
      if (!kIsWeb) {
        // Native (Android/iOS): Multiple resilient checks
        // 1. Google DNS lookup
        try {
          final result = await InternetAddress.lookup('google.com')
              .timeout(const Duration(milliseconds: 2500));
          if (result.isNotEmpty && result[0].rawAddress.isNotEmpty) {
            connected = true;
          }
        } catch (_) {}

        // 2. Cloudflare DNS lookup
        if (!connected) {
          try {
            final result = await InternetAddress.lookup('one.one.one.one')
                .timeout(const Duration(milliseconds: 2500));
            if (result.isNotEmpty && result[0].rawAddress.isNotEmpty) {
              connected = true;
            }
          } catch (_) {}
        }

        // 3. Fallback to public HTTP 204 endpoint
        if (!connected) {
          try {
            final res = await http
                .get(Uri.parse('https://connectivitycheck.gstatic.com/generate_204'))
                .timeout(const Duration(milliseconds: 2500));
            if (res.statusCode == 204 || res.statusCode == 200) {
              connected = true;
            }
          } catch (_) {}
        }

        // 4. Fallback to backend health check
        if (!connected) {
          try {
            final res = await http
                .get(Uri.parse('${ApiConfig.cloudBaseUrl}/health'))
                .timeout(const Duration(milliseconds: 2500));
            connected = res.statusCode == 200;
          } catch (_) {}
        }
      } else {
        // Web Browser: Multiple reliable checks
        // 1. Same-origin test (if served over web server)
        try {
          final origin = Uri.base.origin;
          if (origin.isNotEmpty && origin != 'null') {
            final res = await http
                .get(Uri.parse(origin))
                .timeout(const Duration(milliseconds: 2000));
            if (res.statusCode >= 200 && res.statusCode < 400) {
              connected = true;
            }
          }
        } catch (_) {}

        // 2. Fast public CORS endpoint test
        if (!connected) {
          try {
            final res = await http
                .get(Uri.parse('https://httpbin.org/status/200'))
                .timeout(const Duration(milliseconds: 2000));
            if (res.statusCode == 200) {
              connected = true;
            }
          } catch (_) {}
        }

        // 3. Backend health endpoint test
        if (!connected) {
          try {
            final res = await http
                .get(ApiConfig.uri('/health'))
                .timeout(const Duration(milliseconds: 2000));
            if (res.statusCode == 200) {
              connected = true;
            }
          } catch (_) {}
        }

        // 4. In web, if page host is present and reachable, user has connectivity
        if (!connected && Uri.base.host.isNotEmpty) {
          connected = true;
        }
      }
    } catch (_) {
      connected = false;
    } finally {
      _isChecking = false;
      isConnectedNotifier.value = connected;
    }

    return connected;
  }

  void dispose() {}
}

