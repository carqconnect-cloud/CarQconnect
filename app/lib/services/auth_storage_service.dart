import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../globals.dart';
import '../utils/api_config.dart';

/// Central Persistent Auth Storage Service
/// Persists sensitive authentication tokens in hardware-backed encrypted storage
/// (Android Keystore / iOS Keychain) via flutter_secure_storage and user preferences in SharedPreferences.
class AuthStorageService {
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      resetOnError: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock,
    ),
  );

  static const String _keyAccessToken = 'auth_access_token';
  static const String _keyRefreshToken = 'auth_refresh_token';
  static const String _keyFirstName = 'auth_first_name';
  static const String _keyLastName = 'auth_last_name';
  static const String _keyEmail = 'auth_email';
  static const String _keyPhone = 'auth_phone';
  static const String _keyVehicleModel = 'auth_vehicle_model';
  static const String _keyVehicleRegistration = 'auth_vehicle_registration';
  static const String _keyIsLoggedIn = 'auth_is_logged_in';
  static const String _keySessionCreatedAt = 'auth_session_created_at';
  static const String _keyLastActiveAt = 'auth_last_active_at';
  static const String _keyAppVersion = 'auth_app_version';

  /// Active session validity duration: 30 days (1 month)
  static const int sessionValidityDays = 30;

  /// Global navigator key to navigate to login on automatic logout
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  /// Notifier triggered when session expires or user is logged out
  static final ValueNotifier<bool> sessionExpiredNotifier = ValueNotifier<bool>(false);
  static Future<bool>? _refreshInFlight;

  /// Safely write sensitive token to encrypted secure storage
  static Future<void> _writeSecureToken(String key, String value) async {
    // Web browsers require HTTPS for FlutterSecureStorage SubtleCrypto; fallback to SharedPreferences on web HTTP
    if (kIsWeb) return;
    try {
      await _secureStorage.write(key: key, value: value);
    } catch (e) {
      debugPrint('[AuthStorage] Secure storage write note ($key): $e');
    }
  }

  /// Safely read sensitive token with automatic seamless migration from SharedPreferences
  static Future<String?> _readSecureToken(String key, SharedPreferences prefs) async {
    if (kIsWeb) {
      return prefs.getString(key);
    }
    try {
      final secureVal = await _secureStorage.read(key: key);
      if (secureVal != null && secureVal.isNotEmpty) {
        return secureVal;
      }
    } catch (e) {
      debugPrint('[AuthStorage] Secure storage read note ($key): $e');
    }

    // Migration fallback: if token exists in SharedPreferences, migrate to encrypted SecureStorage
    final legacyVal = prefs.getString(key);
    if (legacyVal != null && legacyVal.isNotEmpty) {
      await _writeSecureToken(key, legacyVal);
      return legacyVal;
    }
    return null;
  }

  /// Safely delete sensitive token from encrypted secure storage
  static Future<void> _deleteSecureToken(String key) async {
    if (kIsWeb) return;
    try {
      await _secureStorage.delete(key: key);
    } catch (e) {
      debugPrint('[AuthStorage] Secure storage delete note ($key): $e');
    }
  }

  /// Save session after successful Login, Google Sign-in, or Registration
  static Future<void> saveSession({
    required String accessToken,
    String? refreshToken,
    required String firstName,
    required String lastName,
    required String email,
    String? phone,
    String? vehicleModel,
    String? vehicleRegistration,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Store sensitive tokens in hardware-backed encrypted storage with fallback
      await _writeSecureToken(_keyAccessToken, accessToken);
      await prefs.setString(_keyAccessToken, accessToken);
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await _writeSecureToken(_keyRefreshToken, refreshToken);
        await prefs.setString(_keyRefreshToken, refreshToken);
      }
      await prefs.setString(_keyFirstName, firstName);
      await prefs.setString(_keyLastName, lastName);
      await prefs.setString(_keyEmail, email);
      if (phone != null) {
        await prefs.setString(_keyPhone, phone);
      }
      if (vehicleModel != null) {
        await prefs.setString(_keyVehicleModel, vehicleModel);
      }
      if (vehicleRegistration != null) {
        await prefs.setString(_keyVehicleRegistration, vehicleRegistration);
      }
      await prefs.setBool(_keyIsLoggedIn, true);

      // Record active session start time and current app version
      final now = DateTime.now().millisecondsSinceEpoch;
      await prefs.setInt(_keySessionCreatedAt, now);
      await prefs.setInt(_keyLastActiveAt, now);
      await prefs.setString(_keyAppVersion, ApiConfig.appVersion);
      sessionExpiredNotifier.value = false;

      // Populate in-memory Globals
      Globals.accessToken = accessToken;
      Globals.firstName = firstName;
      Globals.lastName = lastName;
      Globals.email = email;
      if (phone != null) Globals.phone = phone;
      if (vehicleModel != null) Globals.vehicleModel = vehicleModel;
      if (vehicleRegistration != null) Globals.vehicleRegistration = vehicleRegistration;

      // Sync background data
      syncProfileDataInBackground(accessToken);
    } catch (e) {
      debugPrint('Error saving auth session: $e');
    }
  }

  /// Update vehicle details in persistent storage
  static Future<void> updateVehicle({
    required String vehicleModel,
    required String vehicleRegistration,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyVehicleModel, vehicleModel);
      await prefs.setString(_keyVehicleRegistration, vehicleRegistration);
      Globals.vehicleModel = vehicleModel;
      Globals.vehicleRegistration = vehicleRegistration;
    } catch (e) {
      debugPrint('Error updating vehicle in storage: $e');
    }
  }

  /// Restore saved session from persistent storage on app launch.
  /// Returns true if a valid session exists.
  static Future<bool> restoreSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // 1. Check if the app was updated.
      // If the installed app version has changed, log the user out as requested:
      // "update the app then logout"
      final savedVersion = prefs.getString(_keyAppVersion);
      if (savedVersion != null && savedVersion.isNotEmpty && savedVersion != ApiConfig.appVersion) {
        debugPrint('App updated from $savedVersion to ${ApiConfig.appVersion}. Automatic logout.');
        await clearSession();
        await prefs.setString(_keyAppVersion, ApiConfig.appVersion);
        return false;
      }
      // Save current version
      await prefs.setString(_keyAppVersion, ApiConfig.appVersion);

      // Read encrypted access token with automatic legacy migration
      final token = await _readSecureToken(_keyAccessToken, prefs);
      final isLoggedIn = prefs.getBool(_keyIsLoggedIn) ?? false;

      if (token == null || token.trim().isEmpty || !isLoggedIn) {
        return false;
      }

      // 2. Check active session expiration: 30 days (at least 1 month)
      // "when the active session is out then automatic logout (but active session is atleast 1 month)"
      final sessionCreatedAt = prefs.getInt(_keySessionCreatedAt);
      if (sessionCreatedAt != null) {
        final sessionStart = DateTime.fromMillisecondsSinceEpoch(sessionCreatedAt);
        final elapsedDays = DateTime.now().difference(sessionStart).inDays;
        if (elapsedDays >= sessionValidityDays) {
          debugPrint('Active session expired ($elapsedDays days >= $sessionValidityDays days). Automatic logout.');
          await clearSession();
          return false;
        }
      } else {
        // First run with timestamp tracking: initialize creation timestamp
        await prefs.setInt(_keySessionCreatedAt, DateTime.now().millisecondsSinceEpoch);
      }

      // Update last active timestamp
      await prefs.setInt(_keyLastActiveAt, DateTime.now().millisecondsSinceEpoch);

      // Populate in-memory Globals immediately so the app can render instantly
      Globals.accessToken = token;
      Globals.firstName = prefs.getString(_keyFirstName) ?? 'User';
      Globals.lastName = prefs.getString(_keyLastName) ?? '';
      Globals.email = prefs.getString(_keyEmail) ?? '';
      Globals.phone = prefs.getString(_keyPhone) ?? '';
      Globals.vehicleModel = prefs.getString(_keyVehicleModel) ?? '';
      Globals.vehicleRegistration = prefs.getString(_keyVehicleRegistration) ?? '';

      // Load active plan from SharedPreferences
      await Globals.loadCurrentPlan();

      // Verify token in background and refresh if expired
      _validateOrRefreshTokenInBackground(prefs);

      // Sync profile addresses & emergency contacts in background
      syncProfileDataInBackground(token);

      return true;
    } catch (e) {
      debugPrint('Error restoring auth session: $e');
      return false;
    }
  }

  /// Refresh the saved session when an authenticated request reports an expired token.
  static Future<bool> refreshSession() async {
    final inFlight = _refreshInFlight;
    if (inFlight != null) return inFlight;

    final refresh = _refreshSessionOnce();
    _refreshInFlight = refresh;
    try {
      return await refresh;
    } finally {
      if (identical(_refreshInFlight, refresh)) _refreshInFlight = null;
    }
  }

  static Future<bool> _refreshSessionOnce() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final refreshToken = await _readSecureToken(_keyRefreshToken, prefs);
      if (refreshToken == null || refreshToken.isEmpty) return false;
      return await _refreshAccessToken(prefs, refreshToken);
    } catch (e) {
      debugPrint('Error refreshing saved auth session: $e');
      return false;
    }
  }

  /// Load authenticated API data and retry once after refreshing an expired
  /// access token. The token used for the retry is read after refresh completes.
  static Future<http.Response> authenticatedGet(
    String path, {
    Duration timeout = const Duration(seconds: 25),
  }) async {
    var response = await ApiConfig.get(
      path,
      headers: {'Authorization': 'Bearer ${Globals.accessToken}'},
      timeout: timeout,
    );
    if (response.statusCode == 401 && await refreshSession()) {
      response = await ApiConfig.get(
        path,
        headers: {'Authorization': 'Bearer ${Globals.accessToken}'},
        timeout: timeout,
      );
    }
    return response;
  }

  /// Asynchronously validate token and refresh if expired
  static void _validateOrRefreshTokenInBackground(SharedPreferences prefs) async {
    final token = Globals.accessToken;
    if (token.isEmpty) return;

    try {
      final res = await http
          .get(
            ApiConfig.uri('/auth/me'),
            headers: {'Authorization': 'Bearer $token', 'X-Portal-Type': 'app'},
          )
          .timeout(const Duration(seconds: 10));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['data'] != null) {
          final u = data['data'];
          if (u['firstName'] != null) {
            Globals.firstName = u['firstName'];
            await prefs.setString(_keyFirstName, u['firstName']);
          }
          if (u['lastName'] != null) {
            Globals.lastName = u['lastName'];
            await prefs.setString(_keyLastName, u['lastName']);
          }
          if (u['email'] != null) {
            Globals.email = u['email'];
            await prefs.setString(_keyEmail, u['email']);
          }
          if (u['phone'] != null) {
            Globals.phone = u['phone'].toString();
            await prefs.setString(_keyPhone, u['phone'].toString());
          }
        }
      } else if (res.statusCode == 401) {
        // Access token expired, attempt refresh
        final refreshed = await refreshSession();
        if (!refreshed) {
          await handleSessionExpired();
        }
      }
    } catch (e) {
      debugPrint('Background auth validation error: $e');
    }
  }

  /// Refresh access token using refresh token
  static Future<bool> _refreshAccessToken(
    SharedPreferences prefs,
    String refreshToken,
  ) async {
    try {
      final res = await http
          .post(
            ApiConfig.uri('/auth/refresh'),
            headers: {
              'Content-Type': 'application/json',
              'X-Portal-Type': 'app',
            },
            body: jsonEncode({'refreshToken': refreshToken}),
          )
          .timeout(const Duration(seconds: 10));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['data'] != null && data['data']['tokens'] != null) {
          final newAccess = data['data']['tokens']['accessToken'] ?? '';
          final newRefresh = data['data']['tokens']['refreshToken'];

          if (newAccess.isNotEmpty) {
            Globals.accessToken = newAccess;
            await _writeSecureToken(_keyAccessToken, newAccess);
            await prefs.setString(_keyAccessToken, newAccess);
            if (newRefresh != null && newRefresh.toString().isNotEmpty) {
              await _writeSecureToken(_keyRefreshToken, newRefresh.toString());
              await prefs.setString(_keyRefreshToken, newRefresh.toString());
            }
            debugPrint('Session refreshed successfully and stored in encrypted storage');
            return true;
          }
        }
      } else if (res.statusCode == 401 || res.statusCode == 403) {
        await handleSessionExpired();
      }
    } catch (e) {
      debugPrint('Error refreshing access token: $e');
    }
    return false;
  }

  /// Sync addresses & emergency contacts in background
  static void syncProfileDataInBackground(String token) {
    if (token.isEmpty) return;
    Future.wait([
      authenticatedGet('/app-profile/addresses').then((res) {
            if (res.statusCode == 200) {
              final addrData = jsonDecode(res.body)['data'] as List?;
              if (addrData != null) {
                Globals.savedAddresses = addrData.cast<Map<String, dynamic>>();
              }
            }
          })
          .catchError((e) {
            debugPrint('Background address load error: $e');
          }),
      authenticatedGet('/app-profile/emergency-contacts').then((res) {
            if (res.statusCode == 200) {
              final emData = jsonDecode(res.body)['data'] as List?;
              if (emData != null) {
                Globals.emergencyContacts = emData.cast<Map<String, dynamic>>();
              }
            }
          })
          .catchError((e) {
            debugPrint('Background emergency contacts load error: $e');
          }),
      authenticatedGet('/subscriptions/my').then((res) {
            if (res.statusCode == 200) {
              final subData = jsonDecode(res.body);
              if (subData['success'] == true && subData['data'] != null) {
                final plan = subData['data']['plan'];
                if (plan != null && plan['name'] != null) {
                  Globals.saveCurrentPlan(plan['name'], subData['data']['planId'] ?? '');
                }
              }
            }
          })
          .catchError((e) {
            debugPrint('Background subscription plan load error: $e');
          }),
    ]);
  }

  /// Trigger automatic logout and redirect to login when session expires
  static Future<void> handleSessionExpired() async {
    debugPrint('Session expired. Logging out user and redirecting to root.');
    await clearSession();
    sessionExpiredNotifier.value = true;
    navigatorKey.currentState?.pushNamedAndRemoveUntil('/', (route) => false);
  }

  /// Check if the active session is still valid (< 30 days old)
  static Future<bool> isSessionValid() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = Globals.accessToken.isNotEmpty
          ? Globals.accessToken
          : await _readSecureToken(_keyAccessToken, prefs);
      final isLoggedIn = prefs.getBool(_keyIsLoggedIn) ?? false;
      if (token == null || token.trim().isEmpty || !isLoggedIn) return false;

      final sessionCreatedAt = prefs.getInt(_keySessionCreatedAt);
      if (sessionCreatedAt != null) {
        final sessionStart = DateTime.fromMillisecondsSinceEpoch(sessionCreatedAt);
        if (DateTime.now().difference(sessionStart).inDays >= sessionValidityDays) {
          debugPrint('Session expired during active check. Triggering logout.');
          await handleSessionExpired();
          return false;
        }
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Clear session on Logout
  static Future<void> clearSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await _deleteSecureToken(_keyAccessToken);
      await _deleteSecureToken(_keyRefreshToken);
      await prefs.remove(_keyAccessToken);
      await prefs.remove(_keyRefreshToken);
      await prefs.remove(_keyFirstName);
      await prefs.remove(_keyLastName);
      await prefs.remove(_keyEmail);
      await prefs.remove(_keyPhone);
      await prefs.remove(_keyVehicleModel);
      await prefs.remove(_keyVehicleRegistration);
      await prefs.remove(_keySessionCreatedAt);
      await prefs.remove(_keyLastActiveAt);
      await prefs.setBool(_keyIsLoggedIn, false);

      // Clear in-memory Globals
      Globals.accessToken = '';
      Globals.firstName = '';
      Globals.lastName = '';
      Globals.email = '';
      Globals.phone = '';
      Globals.vehicleModel = '';
      Globals.vehicleRegistration = '';
      Globals.savedAddresses = [];
      Globals.emergencyContacts = [];
    } catch (e) {
      debugPrint('Error clearing auth session: $e');
    }
  }
}
