import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../services/secure_http_client.dart';

class ApiConfig {
  /// Pinned, TLS-secured HTTP client
  static http.Client get client => SecureHttpClient.client;

  /// Current Application Version (synced with pubspec.yaml)
  static const String appVersion = '1.0.0+1';

  /// Cloud / Render Deployed Backend URL
  static const String cloudBaseUrl = 'https://fioner-h5r7.onrender.com/api/v1';

  /// Local Network Backend URL
  static const String localBaseUrl = 'http://192.168.29.73:4000/api/v1';

  /// Localhost Backend URL
  static const String localhostBaseUrl = 'http://localhost:4000/api/v1';

  /// Determines the best initial base URL dynamically based on environment
  static String get _initialBaseUrl {
    // 1. Native mobile builds (Android APK, iOS): ALWAYS default to the deployed Cloud backend!
    if (!kIsWeb) {
      return cloudBaseUrl;
    }

    // 2. Web browser:
    final host = Uri.base.host;
    // Local LAN development (e.g. 192.168.x.x, 10.x.x.x, 172.x.x.x)
    if (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
      return '${Uri.base.scheme}://$host:4000/api/v1';
    }
    // Localhost on web
    if (host == 'localhost' || host == '127.0.0.1') {
      return localhostBaseUrl;
    }
    // Remote web deployment (Render, Vercel, etc.)
    return cloudBaseUrl;
  }

  /// Active URL
  static String _activeBaseUrl = _initialBaseUrl;

  /// Returns the current active base URL
  static String get baseUrl => _activeBaseUrl;

  /// Helper to get a full Uri for a given API endpoint path
  static Uri uri(String path) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$_activeBaseUrl$cleanPath');
  }

  /// Helper to get a full URL string for a given API endpoint path
  static String url(String path) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return '$_activeBaseUrl$cleanPath';
  }

  /// List of candidate base URLs to attempt
  static List<String> get candidateBaseUrls {
    final List<String> list = [];

    // Prioritize active URL (e.g. local backend during local development)
    if (!list.contains(_activeBaseUrl)) list.add(_activeBaseUrl);

    // Add local endpoints if running in web development mode
    if (kIsWeb && !kReleaseMode) {
      final host = Uri.base.host;
      if (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
        final originCandidate = '${Uri.base.scheme}://$host:4000/api/v1';
        if (!list.contains(originCandidate)) list.add(originCandidate);
      }
      if (!list.contains(localhostBaseUrl)) list.add(localhostBaseUrl);
      if (!list.contains(localBaseUrl)) list.add(localBaseUrl);
    }

    // Fall back to deployed Cloud backend
    if (!list.contains(cloudBaseUrl)) list.add(cloudBaseUrl);

    return list;
  }

  /// Initialize and detect which server to use (or load saved preference)
  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedUrl = prefs.getString('preferred_api_base_url');

      // Release APKs must never inherit a development machine's LAN address.
      // Such a URL works during local testing but is unreachable for installed users.
      if (!kIsWeb && kReleaseMode) {
        _activeBaseUrl = cloudBaseUrl;
        if (savedUrl != null && savedUrl != cloudBaseUrl) {
          await prefs.remove('preferred_api_base_url');
        }
        return;
      }

      // If the user or developer explicitly saved a URL preference, honor it
      if (savedUrl != null && savedUrl.isNotEmpty) {
        _activeBaseUrl = savedUrl;
        return;
      }

      // Native mobile builds (Android APK, iOS): Default to live Cloud Backend
      if (!kIsWeb) {
        _activeBaseUrl = cloudBaseUrl;
        return;
      }

      // Web builds on remote host or LAN
      final host = Uri.base.host;
      if (host.isNotEmpty && host != 'localhost' && host != '127.0.0.1') {
        if (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
          final originCandidate = '${Uri.base.scheme}://$host:4000/api/v1';
          try {
            final res = await http
                .get(Uri.parse('$originCandidate/health'))
                .timeout(const Duration(milliseconds: 1500));
            if (res.statusCode == 200) {
              _activeBaseUrl = originCandidate;
              return;
            }
          } catch (_) {}
        }
        _activeBaseUrl = cloudBaseUrl;
        return;
      }

      // Web builds on localhost
      try {
        final res = await http
            .get(Uri.parse('$localhostBaseUrl/health'))
            .timeout(const Duration(milliseconds: 1000));
        if (res.statusCode == 200) {
          _activeBaseUrl = localhostBaseUrl;
          return;
        }
      } catch (_) {}

      // Fallback to Cloud Render URL
      _activeBaseUrl = cloudBaseUrl;
    } catch (_) {
      _activeBaseUrl = _initialBaseUrl;
    } finally {
      // Fire-and-forget background ping so Render wakes up immediately upon app launch
      prewarm();
    }
  }

  static bool _isPrewarming = false;
  static DateTime? _lastPrewarmTime;

  /// Fire-and-forget background ping to wake up Cloud (Render) instances if sleeping
  static void prewarm() {
    // Avoid redundant pings within 60 seconds
    if (_isPrewarming) return;
    if (_lastPrewarmTime != null &&
        DateTime.now().difference(_lastPrewarmTime!).inSeconds < 60) {
      return;
    }

    _isPrewarming = true;
    _lastPrewarmTime = DateTime.now();

    Future(() async {
      try {
        final targetUrl = _activeBaseUrl.isNotEmpty ? _activeBaseUrl : cloudBaseUrl;
        final cleanPath = targetUrl.endsWith('/')
            ? '${targetUrl}health'
            : '$targetUrl/health';
        final uri = Uri.parse(cleanPath);
        await http.get(uri).timeout(const Duration(seconds: 45));
        if (kDebugMode) {
          debugPrint('[ApiConfig] Pre-warm health ping succeeded to $cleanPath');
        }
      } catch (e) {
        if (kDebugMode) {
          debugPrint('[ApiConfig] Pre-warm ping attempt notice: $e');
        }
      } finally {
        _isPrewarming = false;
      }
    });
  }

  /// Manually switch active backend URL and save preference
  static Future<void> setBaseUrl(String newUrl) async {
    _activeBaseUrl = newUrl;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('preferred_api_base_url', newUrl);
    } catch (_) {}
  }

  /// Switch between Cloud and Local
  static Future<void> toggleServer() async {
    final target = isCloud ? localBaseUrl : cloudBaseUrl;
    await setBaseUrl(target);
  }

  static bool get isCloud => _activeBaseUrl == cloudBaseUrl;
  static bool get isLocal => _activeBaseUrl == localBaseUrl;
  static String get activeServerName => isCloud ? 'Cloud (Render)' : 'Local ($_activeBaseUrl)';


  /// Web URL for QR code generation & browser scanning
  /// Automatically uses the origin when running in browser (e.g. 3000, 3001, 3002, or live domain)
  static String get webBaseUrl {
    if (kIsWeb) {
      final origin = Uri.base.origin;
      if (origin.isNotEmpty && origin != 'null') {
        return origin;
      }
    }
    // Deployed domain for mobile / native app
    return 'https://fioner-h5r7.onrender.com';
  }

  /// Returns the complete URL for QR Code Tag scanning
  static String getQrScanUrl(String tagId) {
    return '$webBaseUrl/#/scan/$tagId';
  }

  /// Executes an HTTP request with automatic fallback between servers
  static Future<http.Response> requestWithFallback(
    Future<http.Response> Function(String baseUrl) requestFn, {
    Duration timeout = const Duration(seconds: 30),
  }) async {
    final targets = candidateBaseUrls;
    Exception? lastException;

    for (final base in targets) {
      try {
        final res = await requestFn(base).timeout(timeout);
        _activeBaseUrl = base;
        return res;
      } catch (e) {
        lastException = e is Exception ? e : Exception(e.toString());
      }
    }

    throw lastException ?? Exception('All backend endpoints failed to respond.');
  }

  /// GET an API endpoint with one bounded retry for transient network and
  /// reverse-proxy failures. This helps recover from a sleeping cloud instance
  /// without allowing one failed request to hold a screen indefinitely.
  static Future<http.Response> get(
    String path, {
    Map<String, String>? headers,
    Duration timeout = const Duration(seconds: 12),
  }) async {
    Object? lastError;
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        final response = await http
            .get(uri(path), headers: headers)
            .timeout(timeout);
        final isTransient = response.statusCode == 502 ||
            response.statusCode == 503 ||
            response.statusCode == 504;
        if (!isTransient || attempt == 1) return response;
      } catch (error) {
        lastError = error;
        if (attempt == 1) rethrow;
      }
      await Future<void>.delayed(const Duration(milliseconds: 400));
    }
    throw lastError ?? Exception('API request failed.');
  }
}
