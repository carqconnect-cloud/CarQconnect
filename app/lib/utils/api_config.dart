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
  static const String cloudBaseUrl = 'https://carqconnect-backend.onrender.com/api/v1';

  /// Local Network Backend URL
  static const String localBaseUrl = 'http://192.168.29.73:4000/api/v1';

  /// Localhost Backend URL
  static const String localhostBaseUrl = 'http://localhost:4000/api/v1';

  /// Determines the best initial base URL dynamically based on environment
  static String get _initialBaseUrl => cloudBaseUrl;

  /// Active URL
  static String _activeBaseUrl = cloudBaseUrl;

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

    // 1. Primary: Deployed Cloud Backend on Render
    if (!list.contains(cloudBaseUrl)) list.add(cloudBaseUrl);

    // 2. Active URL if user explicitly switched to another host
    if (_activeBaseUrl.isNotEmpty && !list.contains(_activeBaseUrl)) {
      list.insert(0, _activeBaseUrl);
    }

    // 3. Only if developing locally on web and local backend was chosen
    if (kIsWeb && kDebugMode && _activeBaseUrl != cloudBaseUrl) {
      if (!list.contains(localhostBaseUrl)) list.add(localhostBaseUrl);
    }

    return list;
  }

  /// Initialize and detect which server to use (or load saved preference)
  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedUrl = prefs.getString('preferred_api_base_url');
      final savedFrontend = prefs.getString('preferred_frontend_web_url');
      if (savedFrontend != null && savedFrontend.isNotEmpty) {
        _customFrontendUrl = savedFrontend;
      }

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


  /// Default Production Vercel Frontend Domain
  static const String defaultVercelFrontendUrl = 'https://carqconnect.vercel.app';
  static String? _customFrontendUrl;

  /// Web URL for QR code generation & browser scanning
  /// In Web browser: if on public domain, uses origin; if on localhost/local IP, uses deployed Vercel domain
  /// In Mobile App build (APK): always uses the deployed Vercel frontend domain
  static String get webBaseUrl {
    if (_customFrontendUrl != null && _customFrontendUrl!.isNotEmpty) {
      return _customFrontendUrl!;
    }
    if (kIsWeb) {
      final origin = Uri.base.origin;
      final isLocal = origin.contains('localhost') ||
          origin.contains('127.0.0.1') ||
          origin.contains('192.168.') ||
          origin.contains('10.');
      if (origin.isNotEmpty && origin != 'null' && !isLocal) {
        return origin;
      }
    }
    return defaultVercelFrontendUrl;
  }

  /// Sets a custom Vercel / Web frontend URL dynamically
  static Future<void> setCustomFrontendUrl(String url) async {
    _customFrontendUrl = url.trim().replaceAll(RegExp(r'/+$'), '');
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('preferred_frontend_web_url', _customFrontendUrl!);
    } catch (_) {}
  }

  /// Returns the complete URL for QR Code Tag scanning
  static String getQrScanUrl(String tagId) {
    return '$webBaseUrl/scan/$tagId';
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
    Duration timeout = const Duration(seconds: 25),
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
