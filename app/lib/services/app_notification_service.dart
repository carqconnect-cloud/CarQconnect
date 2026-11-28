import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../globals.dart';
import '../screens/notifications/notifications_screen.dart';
import '../screens/notifications/web_notification_helper.dart';
import '../utils/api_config.dart';
import 'auth_storage_service.dart';
import 'notification_socket_stub.dart'
    if (dart.library.io) 'notification_socket_io.dart';

class AppNotificationService {
  AppNotificationService._internal();
  static final AppNotificationService instance = AppNotificationService._internal();

  static const MethodChannel _channel = MethodChannel('com.carqconnect.app/notifications');
  static const String _prefEnabledKey = 'notifications_enabled';
  static const String _prefSeenKey = 'carq_seen_notification_ids';
  static const String _prefPromptedKey = 'carq_notif_permission_prompted';

  final NotificationSocketClient _socketClient = NotificationSocketClient();
  Timer? _pollTimer;
  bool _initialized = false;
  bool _pollInFlight = false;
  bool _hasSeededBaseline = false;
  final Set<String> _seenIds = <String>{};

  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    if (!kIsWeb) {
      _channel.setMethodCallHandler((call) async {
        if (call.method == 'onNotificationTap') {
          _openNotificationsScreen();
        }
      });

      try {
        final launchRoute = await _channel.invokeMethod<String>('getLaunchRoute');
        if (launchRoute == 'notifications') {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _openNotificationsScreen();
          });
        }
      } catch (_) {}
    }

    final prefs = await SharedPreferences.getInstance();
    final savedSeen = prefs.getStringList(_prefSeenKey);
    if (savedSeen != null && savedSeen.isNotEmpty) {
      _seenIds.addAll(savedSeen);
      _hasSeededBaseline = true;
    }

    if (Globals.accessToken.isNotEmpty) {
      await onSessionReady(accessToken: Globals.accessToken);
    }
  }

  Future<bool> isEnabledInPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_prefEnabledKey) ?? true;
  }

  Future<bool> hasSystemPermission() async {
    if (kIsWeb) return true;
    try {
      final result = await _channel.invokeMethod<bool>('hasPermission');
      return result ?? false;
    } catch (_) {
      return false;
    }
  }

  Future<bool> requestPermissionAndEnable({bool showWelcomeBanner = false}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefEnabledKey, true);
    await prefs.setBool(_prefPromptedKey, true);

    bool granted = true;
    if (kIsWeb) {
      granted = await requestBrowserNotificationPermission();
    } else {
      try {
        granted = (await _channel.invokeMethod<bool>('requestPermission')) ?? false;
      } catch (_) {
        granted = false;
      }
    }

    if (granted && Globals.accessToken.isNotEmpty) {
      await _syncNativeConfig();
      await pollNow(notifyNew: false);
    }

    if (granted && showWelcomeBanner) {
      await showLocalNotification(
        id: 'welcome_notifications',
        title: 'CarQConnect Notifications Active',
        body: 'You will now receive instant vehicle alerts, QR scans, and safety updates.',
        type: 'general',
      );
    }
    return granted;
  }

  Future<void> requestPermissionIfNeeded() async {
    if (kIsWeb || Globals.accessToken.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    final enabled = prefs.getBool(_prefEnabledKey) ?? true;
    if (!enabled) return;

    final alreadyPrompted = prefs.getBool(_prefPromptedKey) ?? false;
    final hasPerm = await hasSystemPermission();
    if (!hasPerm && !alreadyPrompted) {
      await prefs.setBool(_prefPromptedKey, true);
      try {
        final granted = (await _channel.invokeMethod<bool>('requestPermission')) ?? false;
        if (granted) {
          await _syncNativeConfig();
        }
      } catch (_) {}
    } else if (hasPerm) {
      await _syncNativeConfig();
    }
  }

  Future<void> onSessionReady({required String accessToken}) async {
    if (accessToken.isEmpty) return;
    await _syncNativeConfig();

    if (!kIsWeb) {
      await _socketClient.connect(
        baseUrl: ApiConfig.baseUrl,
        token: accessToken,
        onNotification: _handleRealtimePayload,
      );
    }

    _startForegroundPolling();
    await pollNow(notifyNew: _hasSeededBaseline);
  }

  Future<void> onAppResumed() async {
    if (Globals.accessToken.isEmpty) return;
    await _syncNativeConfig();
    if (!kIsWeb) {
      await _socketClient.connect(
        baseUrl: ApiConfig.baseUrl,
        token: Globals.accessToken,
        onNotification: _handleRealtimePayload,
      );
    }
    await pollNow(notifyNew: true);
  }

  Future<void> onAppPaused() async {
    if (Globals.accessToken.isEmpty) return;
    await _syncNativeConfig();
  }

  Future<void> onSessionCleared() async {
    _pollTimer?.cancel();
    _pollTimer = null;
    _socketClient.disconnect();
    _seenIds.clear();
    _hasSeededBaseline = false;
    Globals.hasUnreadNotificationsNotifier.value = false;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefSeenKey);

    if (!kIsWeb) {
      try {
        await _channel.invokeMethod('syncConfig', {
          'baseUrl': ApiConfig.baseUrl,
          'token': '',
          'enabled': false,
          'seedIds': const <String>[],
        });
      } catch (_) {}
    }
  }

  void _startForegroundPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      pollNow(notifyNew: true);
    });
  }

  void _handleRealtimePayload(Map<String, dynamic> payload) {
    final id = (payload['id'] ?? '').toString();
    final title = (payload['title'] ?? 'CarQConnect').toString();
    final body = (payload['description'] ?? '').toString();
    final type = (payload['type'] ?? 'general').toString();

    if (id.isNotEmpty && _seenIds.contains(id)) return;
    if (id.isNotEmpty) {
      markIdsSeen([id]);
    }
    Globals.hasUnreadNotificationsNotifier.value = true;
    showLocalNotification(id: id.isEmpty ? DateTime.now().millisecondsSinceEpoch.toString() : id, title: title, body: body, type: type);
  }

  Future<void> pollNow({bool notifyNew = true}) async {
    if (_pollInFlight || Globals.accessToken.isEmpty) return;
    _pollInFlight = true;
    try {
      final enabled = await isEnabledInPrefs();
      final response = await AuthStorageService.authenticatedGet('/notifications');
      if (response.statusCode != 200) return;

      final decoded = jsonDecode(response.body);
      if (decoded is! Map || decoded['success'] != true || decoded['data'] is! List) return;

      final List items = decoded['data'] as List;
      bool anyUnread = false;
      final List<Map<String, dynamic>> newlyArrived = [];
      final List<String> allIds = [];

      for (final raw in items) {
        if (raw is! Map) continue;
        final id = (raw['id'] ?? '').toString();
        if (id.isEmpty) continue;
        allIds.add(id);
        final isUnread = raw['isUnread'] != false;
        if (isUnread) anyUnread = true;

        if (!_seenIds.contains(id)) {
          if (_hasSeededBaseline && notifyNew && isUnread && enabled) {
            newlyArrived.add(Map<String, dynamic>.from(raw));
          }
          _seenIds.add(id);
        }
      }

      _hasSeededBaseline = true;
      await _persistSeenIds();
      Globals.hasUnreadNotificationsNotifier.value = anyUnread;

      if (!kIsWeb && allIds.isNotEmpty) {
        await _syncNativeConfig(seedIds: allIds);
      }

      for (final item in newlyArrived.reversed.take(4)) {
        await showLocalNotification(
          id: (item['id'] ?? '').toString(),
          title: (item['title'] ?? 'CarQConnect').toString(),
          body: (item['description'] ?? '').toString(),
          type: (item['type'] ?? 'general').toString(),
        );
      }
    } catch (_) {
    } finally {
      _pollInFlight = false;
    }
  }

  Future<void> markIdsSeen(Iterable<String> ids) async {
    final clean = ids.where((e) => e.isNotEmpty).toList();
    if (clean.isEmpty) return;
    _seenIds.addAll(clean);
    _hasSeededBaseline = true;
    await _persistSeenIds();
    if (!kIsWeb) {
      try {
        await _channel.invokeMethod('markSeenIds', {'ids': clean});
      } catch (_) {}
    }
  }

  Future<void> showLocalNotification({
    required String id,
    required String title,
    required String body,
    String type = 'general',
  }) async {
    final enabled = await isEnabledInPrefs();
    if (!enabled) return;

    if (kIsWeb) {
      showBrowserNotification(title, body);
      return;
    }

    try {
      await _channel.invokeMethod('showNotification', {
        'id': id,
        'title': title,
        'body': body,
        'type': type,
      });
    } catch (_) {}
  }

  Future<void> _syncNativeConfig({List<String>? seedIds}) async {
    if (kIsWeb) return;
    final enabled = await isEnabledInPrefs();
    try {
      await _channel.invokeMethod('syncConfig', {
        'baseUrl': ApiConfig.baseUrl,
        'token': Globals.accessToken,
        'enabled': enabled,
        if (seedIds != null) 'seedIds': seedIds,
      });
    } catch (_) {}
  }

  Future<void> _persistSeenIds() async {
    final prefs = await SharedPreferences.getInstance();
    final trimmed = _seenIds.length > 250
        ? _seenIds.skip(_seenIds.length - 250).toList()
        : _seenIds.toList();
    _seenIds
      ..clear()
      ..addAll(trimmed);
    await prefs.setStringList(_prefSeenKey, trimmed);
  }

  void _openNotificationsScreen() {
    if (Globals.accessToken.isEmpty) return;
    final nav = AuthStorageService.navigatorKey.currentState;
    if (nav == null) return;
    nav.push(
      MaterialPageRoute(builder: (_) => const NotificationsScreen()),
    );
  }
}
