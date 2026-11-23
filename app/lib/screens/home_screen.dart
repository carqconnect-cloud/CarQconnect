import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'qr/qr.dart';
import 'trip/trips_screen.dart' as trip_screens;
import 'trip/trip_service.dart';
import 'store/store.dart';
import 'subscription/subscription.dart';
import 'documents/document_screens.dart';
import 'track/track_screen.dart';
import 'fastag/fastag_screen.dart';
import 'notifications/notifications.dart';
import 'reminder/reminder.dart';
import 'bot/bot.dart';
import 'profile/my_vehicles_screen.dart';
import 'package:geolocator/geolocator.dart';
import '../globals.dart';

import 'dart:convert';

import 'package:http/http.dart' as http;

import '../utils/api_config.dart';
import '../theme/app_theme.dart';
import '../services/auth_storage_service.dart';
import '../services/screen_refresh_service.dart';

class HomeScreen extends StatefulWidget {
  final VoidCallback? onOpenStore;
  final ValueChanged<int>? onNavigateTab;
  final bool hasBottomNav;

  const HomeScreen({
    super.key,
    this.onOpenStore,
    this.onNavigateTab,
    this.hasBottomNav = false,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with WidgetsBindingObserver, RefreshOnRouteReturn<HomeScreen>, TickerProviderStateMixin {
  // Figma Motion: "Resize in" (Amount 80, Delay 0ms, Duration 1077ms, Easing Gentle)
  // The vehicle image starts LARGER than its final size and settles to 100%.
  // Tweak this value to make the start bigger/smaller (1.3 = subtle, 1.8 = dramatic).
  static const double _vehicleStartScale = 1.5;
  static const Duration _vehicleAnimDuration = Duration(milliseconds: 1077);

  int _currentBannerIndex = 0;
  bool _isGpsConnected = true;
  bool _isQrActivated = false;
  bool _hasUploadedDocument = false;
  final PageController _bannerPageController = PageController();
  Timer? _bannerTimer;
  Timer? _autoRefreshTimer;
  String? _vehicleImageUrl;
  List<Map<String, dynamic>> _recentTrips = [];
  Offset? _botOffset;
  bool _isDraggingBot = false;

  // Resize-in animation strictly for the vehicle image
  late final AnimationController _vehiclePopController;
  late final Animation<double> _vehicleImageScaleAnim;
  bool _wasTabActive = false;

  @override
  void initState() {
    super.initState();
    AppTheme.isLightNotifier.addListener(_onThemeChanged);
    WidgetsBinding.instance.addObserver(this);

    _vehiclePopController = AnimationController(
      vsync: this,
      duration: _vehicleAnimDuration,
    );

    // Big -> normal, gentle ease-out (fast start, long soft settle). No fade, no slide.
    _vehicleImageScaleAnim = Tween<double>(
      begin: _vehicleStartScale,
      end: 1.0,
    ).animate(
      CurvedAnimation(
        parent: _vehiclePopController,
        curve: const Cubic(0.65, 0.0, 0.35, 1.0),
      ),
    );

    _startBannerTimer();
    _startAutoRefreshTimer();
    _checkLiveStatuses();
    _refreshHomeScreen();
    if (Globals.vehicleModel.isNotEmpty) {
      _fetchVehicleImage(Globals.vehicleModel);
    }

    // Trigger animation after initial frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _vehiclePopController.forward(from: 0.0);
      }
    });
  }

  void _onThemeChanged() {
    if (mounted) setState(() {});
  }

  void _startBannerTimer() {
    _bannerTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (_bannerPageController.hasClients) {
        final nextPage = (_currentBannerIndex + 1) % 4;
        _bannerPageController.animateToPage(
          nextPage,
          duration: const Duration(milliseconds: 500),
          curve: Curves.easeInOutCubic,
        );
      }
    });
  }

  void _startAutoRefreshTimer() {
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted && isTabActive) _refreshHomeScreen();
    });
  }

  Future<void> _fetchVehicleImage(String vehicleName) async {
    final query = vehicleName.trim();
    if (query.isEmpty) return;

    try {
      final res = await http
          .get(
            ApiConfig.uri('/vehicle-image?query=${Uri.encodeComponent(query)}'),
            headers: Globals.accessToken.isNotEmpty
                ? {'Authorization': 'Bearer ${Globals.accessToken}'}
                : null,
          )
          .timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        if (body['success'] == true && body['data'] != null) {
          final url = body['data']['imageUrl'] as String?;
          if (url != null &&
              url.isNotEmpty &&
              !url.contains('wikimedia.org') &&
              !url.contains('wikipedia.org') &&
              mounted) {
            setState(() {
              _vehicleImageUrl = url;
            });
            _triggerVehiclePopUp();
          }
        }
      }
    } catch (e) {
      debugPrint('Error fetching vehicle image: $e');
    }
  }

  bool _isTwoWheeler(String name) {
    final lower = name.toLowerCase();
    final twoWheelerKeywords = [
      'ninja',
      'kawasaki',
      'hayabusa',
      'zx',
      'superbike',
      'bike',
      'motorcycle',
      'activa',
      'scooter',
      'scooty',
      'dio',
      'jupiter',
      'access',
      'pleasure',
      'ntorq',
      'ola',
      'ather',
      'chetak',
      'destini',
      'ray',
      'grazia',
      'burgman',
      'fascino',
      'vespa',
      'aerox',
      'vida',
      'iqube',
      'splendor',
      'passion',
      'shine',
      'platina',
      'hf deluxe',
      'ct 100',
      'glamour',
      'super splendor',
      'pulsar',
      'apache',
      'bullet',
      'classic',
      'duke',
      'ktm',
      'r15',
      'mt 15',
      'fz',
      'hunter',
      'royal enfield',
      'cbr',
      'panigale',
      'ducati',
      's1000rr',
      'daytona',
      'gsx',
      'meteor',
      'avenger',
      'sp 125',
      'raider',
      'ronin',
      'himalayan',
      'harley',
      'harleydavidson',
      'gt 650',
      'continental gt',
      'fat boy',
      'iron 883',
    ];
    return twoWheelerKeywords.any((k) => lower.contains(k));
  }

  Future<void> _checkLiveStatuses() async {
    // 1. Check GPS service
    try {
      final bool isGpsEnabled = await Geolocator.isLocationServiceEnabled();
      if (mounted) {
        setState(() {
          _isGpsConnected = isGpsEnabled;
        });
      }
    } catch (_) {}

    // 2. Check QR activation status
    if (Globals.accessToken.isNotEmpty) {
      try {
        final tagRes = await AuthStorageService.authenticatedGet('/app-qr/tags');
        if (tagRes.statusCode == 200) {
          final tagBody = jsonDecode(tagRes.body);
          if (tagBody['data'] is List) {
            final List tags = tagBody['data'];
            final hasActiveTag = tags.any((t) {
              final tagId = t['tagId'] ?? t['code'] ?? t['tag']?['tagId'];
              return tagId != null && tagId.toString().trim().isNotEmpty;
            });
            if (mounted) {
              setState(() {
                _isQrActivated = hasActiveTag || MyQrScreen.cachedActiveTag != null;
              });
            }
          }
        }
      } catch (_) {}
    } else if (MyQrScreen.cachedActiveTag != null) {
      if (mounted) setState(() => _isQrActivated = true);
    }

    // 3. Check Document upload status
    if (Globals.accessToken.isNotEmpty) {
      try {
        final docRes = await AuthStorageService.authenticatedGet('/documents');
        if (docRes.statusCode == 200) {
          final docBody = jsonDecode(docRes.body);
          if (docBody['success'] == true && docBody['data'] is List) {
            final List docs = docBody['data'];
            if (mounted) {
              setState(() {
                _hasUploadedDocument = docs.isNotEmpty;
              });
            }
          }
        }
      } catch (_) {}
    }
  }

  Future<void> _refreshHomeScreen() async {
    unawaited(_checkLiveStatuses());
    final token = Globals.accessToken;
    final vehicleRequest = token.isNotEmpty
        ? AuthStorageService.authenticatedGet('/app-qr/vehicles')
        : null;
    final tripsRequest = TripService.fetchUserTrips();
    final notificationsRequest = token.isNotEmpty
        ? AuthStorageService.authenticatedGet('/notifications')
        : null;

    // 1. Fetch user vehicles
    if (vehicleRequest != null) {
      try {
        final res = await vehicleRequest;

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          if (data['success'] == true && data['data'] != null) {
            final List list = data['data'];
            if (list.isNotEmpty) {
              final v = list.first;
              final newModel = v['name'] ?? Globals.vehicleModel;
              final newReg = v['regNumber'] ?? Globals.vehicleRegistration;
              final imagePath = v['imagePath'] as String?;
              Globals.vehicleModel = newModel;
              Globals.vehicleRegistration = newReg;
              AuthStorageService.updateVehicle(
                vehicleModel: newModel,
                vehicleRegistration: newReg,
              );

              final lowerModel = newModel.toLowerCase();
              final isMismatched =
                  (lowerModel.contains('pulsar') &&
                      (imagePath?.contains('splendor') == true ||
                          imagePath?.contains('uqkb0n2xuqdi8f40mwgh') ==
                              true)) ||
                  (lowerModel.contains('activa') &&
                      imagePath?.contains('activa') != true) ||
                  (lowerModel.contains('splendor') &&
                      imagePath?.contains('splendor') != true &&
                      imagePath?.contains('uqkb0n2xuqdi8f40mwgh') != true);

              final isInvalidPlaceholder =
                  imagePath == null ||
                  imagePath.isEmpty ||
                  imagePath.contains('white_creta') ||
                  imagePath.contains('wikimedia.org') ||
                  imagePath.contains('wikipedia.org') ||
                  (imagePath.contains('carimage.png') &&
                      _isTwoWheeler(newModel)) ||
                  isMismatched;

              if (!isInvalidPlaceholder) {
                _vehicleImageUrl = imagePath;
              } else if (newModel.isNotEmpty) {
                _fetchVehicleImage(newModel);
              }
            }
          }
        }
      } catch (e) {
        debugPrint('Home auto-refresh error: $e');
      }
    } else if (Globals.vehicleModel.isNotEmpty && _vehicleImageUrl == null) {
      _fetchVehicleImage(Globals.vehicleModel);
    }
    if (mounted) setState(() {});

    // 2. Fetch real user recent trips
    try {
      final trips = await tripsRequest;
      if (mounted) {
        _recentTrips = trips;
        setState(() {});
      }
    } catch (_) {}

    // 3. Fetch unread notifications status
    if (notificationsRequest != null) {
      try {
        final notifRes = await notificationsRequest;
        if (notifRes.statusCode == 200) {
          final data = jsonDecode(notifRes.body);
          if (data['success'] == true && data['data'] != null) {
            final List list = data['data'];
            final hasUnread = list.any((n) => n['isUnread'] == true);
            Globals.hasUnreadNotificationsNotifier.value = hasUnread;
          }
        }
      } catch (_) {}
    }

    if (mounted) {
      setState(() {});
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final tab = TabVisibilityScope.maybeOf(context);
    final isNowActive = tab?.isActive ?? true;
    if (isNowActive && !_wasTabActive) {
      _triggerVehiclePopUp();
    }
    _wasTabActive = isNowActive;
  }

  void _triggerVehiclePopUp() {
    if (!mounted) return;
    _vehiclePopController.forward(from: 0.0);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkLiveStatuses();
      _triggerVehiclePopUp();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    AppTheme.isLightNotifier.removeListener(_onThemeChanged);
    _bannerTimer?.cancel();
    _autoRefreshTimer?.cancel();
    _bannerPageController.dispose();
    _vehiclePopController.dispose();
    super.dispose();
  }

  @override
  Future<void> refreshOnRouteReturn() {
    _triggerVehiclePopUp();
    return _refreshHomeScreen();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            gradient: isLight ? AppTheme.bgGradient : null,
            color: isLight ? null : const Color(0xFF090E17),
          ),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            body: SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final maxW = constraints.maxWidth;
                  final maxH = constraints.maxHeight;
                  const botSize = 56.0;

                  // Initial default position: bottom-right above bottom nav or bottom edge
                  final defaultX = maxW - botSize - 18.0;
                  final defaultY = maxH -
                      (widget.hasBottomNav
                          ? (118.0 + MediaQuery.of(context).padding.bottom)
                          : 32.0) -
                      botSize;

                  final currentPos = _botOffset ?? Offset(defaultX, defaultY);
                  final clampedX = currentPos.dx.clamp(
                    10.0,
                    maxW - botSize - 10.0,
                  );
                  final clampedY = currentPos.dy.clamp(
                    10.0,
                    maxH - botSize - 10.0,
                  );

                  return Stack(
                    children: [
                      _buildHomeContent(),
                      Positioned(
                        left: clampedX,
                        top: clampedY,
                        child: GestureDetector(
                          onPanStart: (_) {
                            _isDraggingBot = false;
                          },
                          onPanUpdate: (details) {
                            _isDraggingBot = true;
                            setState(() {
                              final newX =
                                  (_botOffset?.dx ?? clampedX) +
                                  details.delta.dx;
                              final newY =
                                  (_botOffset?.dy ?? clampedY) +
                                  details.delta.dy;
                              _botOffset = Offset(
                                newX.clamp(10.0, maxW - botSize - 10.0),
                                newY.clamp(10.0, maxH - botSize - 10.0),
                              );
                            });
                          },
                          onPanEnd: (_) {
                            Future.delayed(
                              const Duration(milliseconds: 100),
                              () {
                                _isDraggingBot = false;
                              },
                            );
                          },
                          onTap: () {
                            if (!_isDraggingBot) {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const BotScreen(),
                                ),
                              );
                            }
                          },
                          child: _buildFloatingBotButton(),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildFloatingBotButton() {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            const Color(0xFF8C8CBA).withValues(alpha: 0.86), // 0%
            const Color(0xFF292D78).withValues(alpha: 0.86), // 29%
            const Color(0xFF0C0C0E).withValues(alpha: 0.86), // 50%
            const Color(0xFF658198).withValues(alpha: 0.86), // 100%
          ],
          stops: const [0.0, 0.29, 0.50, 1.0],
        ),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.15),
          width: 0.8,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF292D78).withValues(alpha: 0.35),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.5),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Center(
        child: Image.asset(
          'assets/homescreensicons/bot.png',
          width: 43,
          height: 52,
          fit: BoxFit.contain,
        ),
      ),
    );
  }

  Widget _buildHomeContent() {
    final isLight = AppTheme.isLight;
    final scale = AppScale.factor(context);
    return RefreshIndicator(
      color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
      backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
      onRefresh: _refreshHomeScreen,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: widget.hasBottomNav
              ? (112.0 + MediaQuery.of(context).padding.bottom)
              : (24.0 + MediaQuery.of(context).padding.bottom),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Hello, ${Globals.firstName} ',
                          style: TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Text('👋', style: TextStyle(fontSize: 24)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Drive Safe. Go Further.',
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    // Notifications Button
                    GestureDetector(
                      onTap: () async {
                        final prefs = await SharedPreferences.getInstance();
                        final isEnabled =
                            prefs.getBool('notifications_enabled') ?? false;
                        if (!mounted) return;

                        if (isEnabled) {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const NotificationsScreen(),
                            ),
                          );
                          if (mounted) _refreshHomeScreen();
                        } else {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) =>
                                  const TurnOnNotificationsScreen(),
                            ),
                          );
                          if (mounted) _refreshHomeScreen();
                        }
                      },
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          shape: BoxShape.rectangle,
                          borderRadius: BorderRadius.circular(14),
                          color: isLight
                              ? Colors.white
                              : const Color(0xFF101B2E),
                          border: Border.all(
                            color: isLight
                                ? const Color(0xFFE2E8F0)
                                : const Color(0xFF1E2D44),
                          ),
                          boxShadow: isLight
                              ? AppTheme.cardShadow
                              : [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.25),
                                    blurRadius: 6,
                                  ),
                                ],
                        ),
                        child: Center(
                          child: ValueListenableBuilder<bool>(
                            valueListenable: Globals.hasUnreadNotificationsNotifier,
                            builder: (context, hasUnread, _) {
                              return Stack(
                                alignment: Alignment.center,
                                children: [
                                  Icon(
                                    Icons.notifications_none_rounded,
                                    color: AppTheme.textPrimary,
                                    size: 22,
                                  ),
                                  if (hasUnread)
                                    Positioned(
                                      top: 1,
                                      right: 1,
                                      child: Container(
                                        width: 6,
                                        height: 6,
                                        decoration: const BoxDecoration(
                                          color: Color(0xFF00C2FF),
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                    ),
                                ],
                              );
                            },
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Main Vehicle Card (card is static; only the vehicle image animates)
            GestureDetector(
              onTap: () {
                _triggerVehiclePopUp();
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const MyVehiclesScreen(),
                  ),
                ).then((_) {
                  if (mounted) _refreshHomeScreen();
                });
              },
              child: Container(
                height: (272 * scale).roundToDouble(),
                // Clip so the oversized car is cut by the card's rounded edge
                clipBehavior: Clip.antiAlias,
                padding: EdgeInsets.all((16 * scale).roundToDouble()),
                decoration: BoxDecoration(
                  color: AppTheme.isLight ? Colors.white : null,
                  gradient: AppTheme.isLight
                      ? null
                      : const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            Color(0xFF070D1A),
                            Color(0xFF10172C),
                            Color(0xFF171E42),
                          ],
                          stops: [0.0, 0.55, 1.0],
                        ),
                  borderRadius: BorderRadius.circular(32),
                  border: Border.all(
                    color: AppTheme.isLight
                        ? const Color(0xFFE2E8F0)
                        : const Color(0xFF1F2D47),
                    width: 1.0,
                  ),
                  boxShadow: AppTheme.cardShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          Globals.vehicleModel.isNotEmpty
                              ? Globals.vehicleModel
                              : 'No Vehicle Added',
                          style: TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          Globals.vehicleRegistration.isNotEmpty
                              ? Globals.vehicleRegistration
                              : (Globals.vehicleModel.isNotEmpty
                                    ? ''
                                    : 'Tap to register vehicle'),
                          style: TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                    Expanded(
                      child: Center(
                        // Figma "Resize in": big -> 100%, gentle ease-out, no fade
                        child: AnimatedBuilder(
                          animation: _vehiclePopController,
                          builder: (context, child) {
                            return Transform.scale(
                              scale: _vehicleImageScaleAnim.value,
                              alignment: Alignment.center,
                              child: child,
                            );
                          },
                          child: _buildVehicleImage(),
                        ),
                      ),
                    ),
                    SizedBox(
                      width: double.infinity,
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _buildStatusPill(
                              _isQrActivated
                                  ? const Color(0xFF34D399)
                                  : const Color(0xFFEF4444),
                              _isQrActivated
                                  ? 'QR is activated'
                                  : 'QR is not activated',
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => const MyQrScreen(),
                                  ),
                                ).then((_) => _refreshHomeScreen());
                              },
                            ),
                            const SizedBox(width: 6),
                            _buildStatusPill(
                              _isGpsConnected
                                  ? const Color(0xFF34D399)
                                  : const Color(0xFFEF4444),
                              _isGpsConnected
                                  ? 'GPS Connected'
                                  : 'GPS is not connected',
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => const TrackScreen(),
                                  ),
                                ).then((_) => _refreshHomeScreen());
                              },
                            ),
                            const SizedBox(width: 6),
                            _buildStatusPill(
                              _hasUploadedDocument
                                  ? const Color(0xFF34D399)
                                  : const Color(0xFFEF4444),
                              _hasUploadedDocument
                                  ? 'Documents Valid'
                                  : 'Document is not uploaded',
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) =>
                                        const VehicleDocumentsScreen(),
                                  ),
                                ).then((_) => _refreshHomeScreen());
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Promotional Banners Carousel (4 Banners)
            Column(
              children: [
                SizedBox(
                  height: (146 * scale).roundToDouble(),
                  child: PageView(
                    controller: _bannerPageController,
                    onPageChanged: (index) {
                      setState(() {
                        _currentBannerIndex = index;
                      });
                    },
                    children: [
                      _buildBanner1(scale),
                      _buildBanner2(scale),
                      _buildBanner3(scale),
                      _buildBanner4(scale),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(4, (index) {
                    final isSelected = _currentBannerIndex == index;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      height: 5,
                      width: isSelected ? 18 : 5,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFF00C2FF)
                            : Colors.white.withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    );
                  }),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Quick Actions
            Text(
              'Quick Actions',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildActionCard(
                    'assets/homescreensicons/myqr.png',
                    'My QR',
                    'Vehicle ID',
                    const Color(0xFF5E5FEB),
                    () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const SelectVehicleScreen(),
                        ),
                      );
                    },
                  ),
                ),
                SizedBox(width: (10 * scale).roundToDouble()),
                Expanded(
                  child: _buildActionCard(
                    'assets/homescreensicons/location.png',
                    'Track',
                    'Live Location',
                    const Color(0xFF14B8A6),
                    () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const TrackScreen(),
                        ),
                      );
                    },
                  ),
                ),
                SizedBox(width: (10 * scale).roundToDouble()),
                Expanded(
                  child: _buildActionCard(
                    'assets/homescreensicons/plaintrip.png',
                    'Plan Trip',
                    'Smart Routes',
                    const Color(0xFF7A30FF),
                    () {
                      if (widget.onNavigateTab != null) {
                        widget.onNavigateTab!(2);
                      } else {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) =>
                                const trip_screens.TripsScreen(initialTab: 0),
                          ),
                        );
                      }
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Vehicle Utilities
            Text(
              'Vehicle Utilities',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildActionCard(
                    'assets/homescreensicons/fastag.png',
                    'FASTag',
                    'Check Balance',
                    const Color(0xFFF59E0B),
                    () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const AddFastagScreen(),
                        ),
                      );
                    },
                  ),
                ),
                SizedBox(width: (10 * scale).roundToDouble()),
                Expanded(
                  child: _buildActionCard(
                    'assets/homescreensicons/document.png',
                    'Documents',
                    'View & Manage',
                    const Color(0xFF235CDF),
                    () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const VehicleDocumentsScreen(),
                        ),
                      );
                    },
                  ),
                ),
                SizedBox(width: (10 * scale).roundToDouble()),
                Expanded(
                  child: _buildActionCard(
                    'assets/homescreensicons/reminder.png',
                    'Reminders',
                    'Service & PUC',
                    const Color(0xFFD22D77),
                    () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const RemindersScreen(),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
            SizedBox(height: (10 * scale).roundToDouble()),
            Row(
              children: [
                Expanded(
                  child: _buildActionCard(
                    'assets/homescreensicons/product.png',
                    'Products',
                    'Gps & many more',
                    const Color(0xFF7A30FF),
                    () {
                      if (widget.onOpenStore != null) {
                        widget.onOpenStore!();
                      } else {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const StoreScreen(),
                          ),
                        );
                      }
                    },
                  ),
                ),
                SizedBox(width: (10 * scale).roundToDouble()),
                const Expanded(child: SizedBox()),
                SizedBox(width: (10 * scale).roundToDouble()),
                const Expanded(child: SizedBox()),
              ],
            ),
            const SizedBox(height: 24),

            // CarQConnect Plus
            GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const SubscriptionPlanScreen(),
                  ),
                );
              },
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: AppTheme.isLight
                        ? [
                            const Color(0xFFF59E0B).withValues(alpha: 0.35),
                            const Color(0xFFFDE68A).withValues(alpha: 0.30),
                            const Color(0xFFFEF3C7).withValues(alpha: 0.20),
                          ]
                        : [
                            const Color(0xFFE29C26).withValues(alpha: 0.50),
                            const Color(0xFF7D5513).withValues(alpha: 0.40),
                            const Color(0xFF180F00).withValues(alpha: 0.25),
                          ],
                    stops: const [0.0, 0.50, 1.0],
                  ),
                  boxShadow: AppTheme.cardShadow,
                ),
                padding: const EdgeInsets.all(1),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(23),
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: AppTheme.isLight
                          ? [
                              Colors.white,
                              const Color(0xFFFFFDF5),
                              const Color(0xFFFFFBEB),
                            ]
                          : [
                              const Color(0xFF1C180E),
                              const Color(0xFF0D0A04),
                              Colors.black,
                            ],
                      stops: const [0.0, 0.40, 1.0],
                    ),
                  ),
                  child: Row(
                    children: [
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          Container(
                            width: 32,
                            height: 24,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFFE29C26).withValues(
                                    alpha: AppTheme.isLight ? 0.25 : 0.15,
                                  ),
                                  blurRadius: 16,
                                  spreadRadius: 4,
                                ),
                              ],
                            ),
                          ),
                          Image.asset(
                            'assets/homescreensicons/crown.png',
                            width: 44,
                            height: 34,
                            fit: BoxFit.contain,
                          ),
                        ],
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'CarQConnect Plus',
                              style: TextStyle(
                                color: AppTheme.isLight
                                    ? const Color(0xFF78350F)
                                    : Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'Drive with more safety, more benefits.',
                              style: TextStyle(
                                color: AppTheme.isLight
                                    ? const Color(0xFF92400E)
                                          .withValues(alpha: 0.8)
                                    : Colors.white.withValues(alpha: 0.60),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppTheme.isLight
                              ? const Color(0xFFFEF3C7)
                              : Colors.black,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: const Color(0xFFE29C26)
                                .withValues(alpha: 0.45),
                            width: 1.2,
                          ),
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.chevron_right_rounded,
                            color: Color(0xFFD97706),
                            size: 22,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Recent Activity
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recent Activity',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) =>
                            const trip_screens.TripsScreen(initialTab: 2),
                      ),
                    );
                  },
                  child: Row(
                    children: [
                      Text(
                        'See All',
                        style: TextStyle(
                          color: AppTheme.primaryColor,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        Icons.arrow_forward_ios,
                        color: AppTheme.primaryColor,
                        size: 12,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            Builder(
              builder: (context) {
                final latestTrip = _recentTrips.isNotEmpty
                    ? _recentTrips.first
                    : null;
                if (latestTrip != null) {
                  final from = (latestTrip['fromName'] ?? 'Start')
                      .toString()
                      .split(',')
                      .first
                      .trim();
                  final to = (latestTrip['toName'] ?? 'Destination')
                      .toString()
                      .split(',')
                      .first
                      .trim();
                  final dist = latestTrip['distance']?.toString() ?? '--';
                  final dur = latestTrip['duration']?.toString() ?? '--';
                  String timeLabel = 'Recent Trip';
                  final created = latestTrip['createdAt']?.toString();
                  if (created != null) {
                    try {
                      final dt = DateTime.parse(created).toLocal();
                      timeLabel = '${dt.day}/${dt.month}/${dt.year}';
                    } catch (_) {}
                  }

                  return GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) =>
                              const trip_screens.TripsScreen(initialTab: 2),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.cardBg,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.cardBorder),
                        boxShadow: AppTheme.cardShadow,
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.isLight
                                  ? const Color(0xFFEEF2FF)
                                  : Colors.white.withValues(alpha: 0.05),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.location_on,
                              color: Color(0xFFA594FF),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '$from → $to',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: AppTheme.textPrimary,
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  timeLabel,
                                  style: TextStyle(
                                    color: AppTheme.textSecondary,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                dist,
                                style: TextStyle(
                                  color: AppTheme.textPrimary,
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                dur,
                                style: TextStyle(
                                  color: AppTheme.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 12),
                          Icon(
                            Icons.arrow_forward_ios,
                            color: AppTheme.textSecondary,
                            size: 14,
                          ),
                        ],
                      ),
                    ),
                  );
                }

                // Empty State
                return GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) =>
                            const trip_screens.TripsScreen(initialTab: 0),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.cardBg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.cardBorder),
                      boxShadow: AppTheme.cardShadow,
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.isLight
                                ? const Color(0xFFEEF2FF)
                                : Colors.white.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.route_outlined,
                            color: Color(0xFFA594FF),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'No recent trips',
                                style: TextStyle(
                                  color: AppTheme.textPrimary,
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Tap to plan your first trip',
                                style: TextStyle(
                                  color: AppTheme.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          Icons.arrow_forward_ios,
                          color: AppTheme.textSecondary,
                          size: 14,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showSnackbar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFF161B22),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  Widget _buildStatusPill(Color color, String text, {VoidCallback? onTap}) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: AppTheme.isLight
              ? const Color(0xFFF1F5F9)
              : const Color(0xFF080F1D).withValues(alpha: 0.7),
          border: Border.all(
            color: AppTheme.isLight
                ? const Color(0xFFE2E8F0)
                : const Color(0xFF1F2D47),
            width: 1.0,
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: color.withValues(alpha: 0.8),
                    blurRadius: 6,
                    spreadRadius: 1.5,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 6),
            Text(
              text,
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBannerButton(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6.5),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.20),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            text,
            style: const TextStyle(
              color: Color(0xFF131D4F),
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
          const SizedBox(width: 5),
          const Icon(
            Icons.arrow_forward_rounded,
            color: Color(0xFF131D4F),
            size: 15,
          ),
        ],
      ),
    );
  }

  Widget _buildBanner1([double scale = 1.0]) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const MyQrScreen()),
        );
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        height: (146 * scale).roundToDouble(),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          image: const DecorationImage(
            image: AssetImage('assets/homescreensicons/qr_banner_bg.png'),
            fit: BoxFit.fill,
          ),
          border: Border.all(
            color: const Color(0xFF6366F1).withValues(alpha: 0.25),
            width: 1.0,
          ),
        ),
        child: Stack(
          children: [
            // QR Plate positioned at right
            Positioned(
              right: 14,
              top: 12,
              bottom: 12,
              width: 122,
              child: IgnorePointer(
                child: Image.asset(
                  'assets/homescreensicons/qrimage.png',
                  fit: BoxFit.contain,
                ),
              ),
            ),

            // Left Content: Title + Get the QR Tag Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  RichText(
                    text: const TextSpan(
                      style: TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.bold,
                        height: 1.15,
                        letterSpacing: -0.2,
                      ),
                      children: [
                        TextSpan(
                          text: 'Stick.\nConnect.\n',
                          style: TextStyle(color: Colors.white),
                        ),
                        TextSpan(
                          text: 'Stay Safer.',
                          style: TextStyle(color: Color(0xFFFF7700)),
                        ),
                      ],
                    ),
                  ),
                  _buildBannerButton('Get the QR Tag'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBanner2([double scale = 1.0]) {
    return GestureDetector(
      onTap: () {
        if (widget.onOpenStore != null) {
          widget.onOpenStore!();
        } else if (widget.onNavigateTab != null) {
          widget.onNavigateTab!(3);
        } else {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const StoreScreen()),
          );
        }
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        height: (146 * scale).roundToDouble(),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            begin: Alignment(-1.1, -1.0),
            end: Alignment(1.15, 0.88),
            stops: [0.0, 0.39, 0.72, 1.0],
            colors: [
              Color(0xFF2B1754),
              Color(0xFF1A153B),
              Color(0xFF5A5A81),
              Color(0xFF151B38),
            ],
          ),
          border: Border.all(
            color: const Color(0xFF6366F1).withValues(alpha: 0.25),
            width: 1.0,
          ),
        ),
        child: Stack(
          children: [
            // Smart Devices Image sitting on stone base at right & clipped cleanly
            Positioned(
              right: -12,
              bottom: -20,
              width: 200,
              height: 138,
              child: IgnorePointer(
                child: Image.asset(
                  'assets/homescreensicons/ProductImage.png',
                  fit: BoxFit.contain,
                ),
              ),
            ),

            // Left Content: Tag, Title, Shop Now Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // SMART DEVICES Tag + Devices for a Smarter Ride
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'SMART DEVICES',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.70),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 6),
                      RichText(
                        text: const TextSpan(
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            height: 1.15,
                            letterSpacing: -0.2,
                          ),
                          children: [
                            TextSpan(
                              text: 'Devices for a\n',
                              style: TextStyle(color: Colors.white),
                            ),
                            TextSpan(
                              text: 'Smarter Ride',
                              style: TextStyle(color: Color(0xFF749EFA)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  // Shop Now Button
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 6.5,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.20),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Shop Now',
                          style: TextStyle(
                            color: Color(0xFF131D4F),
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                        SizedBox(width: 5),
                        Icon(
                          Icons.arrow_forward_rounded,
                          color: Color(0xFF131D4F),
                          size: 15,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBanner3([double scale = 1.0]) {
    return GestureDetector(
      onTap: () {
        if (widget.onNavigateTab != null) {
          widget.onNavigateTab!(2);
        } else {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => trip_screens.TripsScreen(
                onBackToHome: () {
                  if (Navigator.canPop(context)) {
                    Navigator.pop(context);
                  }
                },
              ),
            ),
          );
        }
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        height: (146 * scale).roundToDouble(),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          image: const DecorationImage(
            image: AssetImage('assets/homescreensicons/Exploreridebanner.png'),
            fit: BoxFit.cover,
          ),
          border: Border.all(
            color: const Color(0xFF6366F1).withValues(alpha: 0.25),
            width: 1.0,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Plan Your Next Ride',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    'Discover routes, nearby stops\nand drive with confidence.',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 10.5,
                      height: 1.25,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ],
              ),
              _buildBannerButton('Explore Trips'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBanner4([double scale = 1.0]) {
    return GestureDetector(
      onTap: () {
        _showSnackbar('30% OFF offer claimed with ABC Bank Card!');
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        height: (146 * scale).roundToDouble(),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            begin: Alignment(-1.1, -1.0),
            end: Alignment(1.15, 0.88),
            stops: [0.0, 0.29, 0.50, 0.78, 1.0],
            colors: [
              Color(0xFF531754),
              Color(0xFF37153F),
              Color(0xFF32153B),
              Color(0xFF5C426A),
              Color(0xFF361538),
            ],
          ),
          border: Border.all(
            color: const Color(0xFF6366F1).withValues(alpha: 0.25),
            width: 1.0,
          ),
        ),
        child: Stack(
          children: [
            // Tilted Credit Card placed on right & clipped by rounded corner
            Positioned(
              top: 35,
              right: -49,
              width: 205,
              height: 191,
              child: IgnorePointer(
                child: Image.asset(
                  'assets/homescreensicons/creditcardimage.png',
                  fit: BoxFit.contain,
                ),
              ),
            ),

            // Left Content: Title, Subtitle, Claim Offer Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Title + Subtitle
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      RichText(
                        text: const TextSpan(
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.2,
                          ),
                          children: [
                            TextSpan(
                              text: 'Get Up to ',
                              style: TextStyle(color: Colors.white),
                            ),
                            TextSpan(
                              text: '30% OFF',
                              style: TextStyle(color: Color(0xFFF7C129)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        'On devices, accessories & CarQConnect\nPlus membership using ABC Bank\nCard.',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.85),
                          fontSize: 10.5,
                          height: 1.25,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                    ],
                  ),

                  // Claim Offer Button
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 6.5,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.20),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Claim Offer',
                          style: TextStyle(
                            color: Color(0xFF131D4F),
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                        SizedBox(width: 5),
                        Icon(
                          Icons.arrow_forward_rounded,
                          color: Color(0xFF131D4F),
                          size: 15,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionCard(
    dynamic icon,
    String title,
    String subtitle,
    Color bgColor,
    VoidCallback onTap, {
    Color iconColor = Colors.white,
  }) {
    final scale = AppScale.factor(context);
    final cardHeight = (122.0 * scale).roundToDouble();
    final iconSize = (48.0 * scale).roundToDouble();

    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: cardHeight,
        padding: EdgeInsets.symmetric(
          vertical: (10 * scale).roundToDouble(),
          horizontal: 4,
        ),
        decoration: BoxDecoration(
          color: AppTheme.isLight ? Colors.white : null,
          gradient: AppTheme.isLight
              ? null
              : LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color.alphaBlend(
                      bgColor.withValues(alpha: 0.16),
                      const Color(0xFF0D121F),
                    ),
                    const Color(0xFF080B14),
                    const Color(0xFF05070D),
                  ],
                  stops: const [0.0, 0.55, 1.0],
                ),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: AppTheme.isLight
                ? const Color(0xFFE2E8F0)
                : Colors.white.withValues(alpha: 0.08),
            width: 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // ICON
            if (icon == 'assets/homescreensicons/fastag.png')
              Container(
                width: iconSize,
                height: iconSize,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.10),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 8),
                child: Center(child: Image.asset(icon, fit: BoxFit.contain)),
              )
            else if (icon == 'assets/bottomnavigation/plaintripfillded.png' ||
                icon == 'assets/bottomnavigation/plaintrip.png')
              Container(
                width: iconSize,
                height: iconSize,
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: bgColor.withValues(alpha: 0.35),
                      blurRadius: 10,
                      spreadRadius: 1,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                padding: EdgeInsets.all((11 * scale).roundToDouble()),
                child: Center(
                  child: Image.asset(
                    icon,
                    fit: BoxFit.contain,
                    color: Colors.white,
                  ),
                ),
              )
            else if (icon is String)
              Image.asset(
                icon,
                width: iconSize,
                height: iconSize,
                fit: BoxFit.contain,
              )
            else
              Container(
                width: iconSize,
                height: iconSize,
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: bgColor.withValues(alpha: 0.35),
                      blurRadius: 10,
                      spreadRadius: 1,
                    ),
                  ],
                ),
                child: Center(
                  child: icon is IconData
                      ? Icon(icon, color: iconColor, size: 24 * scale)
                      : const SizedBox(),
                ),
              ),

            SizedBox(height: 7 * scale),

            // TITLE
            Text(
              title,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontWeight: FontWeight.bold,
                fontSize: 13,
                letterSpacing: -0.2,
              ),
            ),

            SizedBox(height: 3 * scale),

            // SUBTITLE
            Text(
              subtitle,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 10,
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVehicleImage() {
    final modelName = Globals.vehicleModel.trim();
    var imgUrl = _vehicleImageUrl;

    // Guard against mismatched, corrupt Wikipedia URLs, or placeholder carimage
    final lowerName = modelName.toLowerCase();
    final isMismatched =
        (lowerName.contains('pulsar') &&
            (imgUrl?.contains('splendor') == true ||
                imgUrl?.contains('uqkb0n2xuqdi8f40mwgh') == true)) ||
        (lowerName.contains('activa') && imgUrl?.contains('activa') != true) ||
        (lowerName.contains('splendor') &&
            imgUrl?.contains('splendor') != true &&
            imgUrl?.contains('uqkb0n2xuqdi8f40mwgh') != true);

    if (imgUrl != null &&
        (imgUrl.contains('wikimedia.org') ||
            imgUrl.contains('wikipedia.org') ||
            (imgUrl.contains('carimage.png') && _isTwoWheeler(modelName)) ||
            isMismatched)) {
      imgUrl = null;
    }

    if (imgUrl != null && imgUrl.isNotEmpty) {
      if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
        return Image.network(
          imgUrl,
          fit: BoxFit.contain,
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return _buildFallbackVehicleImage(modelName);
          },
          errorBuilder: (context, error, stackTrace) {
            return _buildFallbackVehicleImage(modelName);
          },
        );
      } else {
        return Image.asset(
          imgUrl,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) {
            return _buildFallbackVehicleImage(modelName);
          },
        );
      }
    }

    return _buildFallbackVehicleImage(modelName);
  }

  Widget _buildFallbackVehicleImage(String modelName) {
    final lower = modelName.toLowerCase();

    // Superbikes & Sports bikes (Ninja, Kawasaki, Hayabusa, ZX, R15, CBR, Panigale, etc.)
    final sportsBikeKeywords = [
      'ninja',
      'kawasaki',
      'hayabusa',
      'zx',
      'superbike',
      'sports bike',
      'sportbike',
      'cbr',
      'panigale',
      'ducati',
      's1000rr',
      'daytona',
      'gsx',
      'bmw s',
      'r1',
      'r6',
      'yamaha r',
    ];
    if (sportsBikeKeywords.any((k) => lower.contains(k))) {
      return Image.asset(
        'assets/homescreensicons/ninja_trans.png',
        fit: BoxFit.contain,
      );
    }

    // Scooters (e.g. Activa 4G, Access, Jupiter, Dio, etc.)
    final scooterKeywords = [
      'activa',
      'scooter',
      'scooty',
      'dio',
      'jupiter',
      'access',
      'pleasure',
      'ntorq',
      'ola',
      'ather',
      'chetak',
      'destini',
      'ray',
      'grazia',
      'burgman',
      'fascino',
      'vespa',
      'aerox',
      'vida',
      'iqube',
    ];
    if (scooterKeywords.any((k) => lower.contains(k))) {
      return Image.asset(
        'assets/homescreensicons/activa_trans.png',
        fit: BoxFit.contain,
      );
    }

    // Performance & Street Bikes (Pulsar, Apache, FZ, MT 15, RTR, Dominar, Duke, KTM, Bullet, Classic, etc.)
    final pulsarKeywords = [
      'pulsar',
      'apache',
      'fz',
      'mt 15',
      'rtr',
      'dominar',
      'gixxer',
      'duke',
      'ktm',
      'hornet',
      'ns200',
      'rs200',
      'n250',
      'f250',
      'bullet',
      'classic',
      'royal enfield',
      'hunter',
      'meteor',
      'avenger',
      'jaw',
      'yezdi',
      'speed 400',
      'scrambler',
      'thunderbird',
      'harley',
      'harleydavidson',
      'gt 650',
      'continental gt',
      'fat boy',
      'iron 883',
    ];
    if (pulsarKeywords.any((k) => lower.contains(k))) {
      return Image.asset(
        'assets/homescreensicons/pulsar_trans.png',
        fit: BoxFit.contain,
      );
    }

    // Commuter Bikes (Splendor, Passion, Shine, Platina, HF Deluxe, etc.)
    final commuterKeywords = [
      'splendor',
      'passion',
      'shine',
      'platina',
      'hf deluxe',
      'ct 100',
      'glamour',
      'super splendor',
      'hero',
      'commuter',
      'sp 125',
      'raider',
      'ronin',
      'cd 110',
      'livo',
      'bike',
      'motorcycle',
    ];
    if (commuterKeywords.any((k) => lower.contains(k))) {
      return Image.asset(
        'assets/homescreensicons/splendor_trans.png',
        fit: BoxFit.contain,
      );
    }

    // Hatchback cars (Swift, Baleno, i20, Alto, WagonR, Tiago, etc.)
    final hatchbackKeywords = [
      'swift',
      'baleno',
      'i20',
      'i10',
      'alto',
      'wagonr',
      'tiago',
      'altroz',
      'polo',
      'glanza',
      'ignis',
      'celerio',
      'kwid',
      's-presso',
    ];
    if (hatchbackKeywords.any((k) => lower.contains(k))) {
      return Image.asset(
        'assets/homescreensicons/swift_trans.png',
        fit: BoxFit.contain,
      );
    }

    // If user has no vehicle added
    if (modelName.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.directions_car_outlined,
              size: 48,
              color: AppTheme.textSecondary.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 6),
            Text(
              'Tap to add vehicle',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
            ),
          ],
        ),
      );
    }

    if (_isTwoWheeler(modelName)) {
      return Image.asset(
        'assets/homescreensicons/bikeimage.png',
        fit: BoxFit.contain,
      );
    }

    // Default: car
    return Image.asset(
      'assets/homescreensicons/carimage.png',
      fit: BoxFit.contain,
    );
  }
}
