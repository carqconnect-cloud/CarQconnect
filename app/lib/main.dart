import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'widgets/light_strip_sweep.dart';

import 'widgets/onboarding_3.dart';
import 'screens/login_screen.dart';
import 'screens/public_scan_screen.dart';
import 'utils/api_config.dart';

import 'package:flutter/services.dart';

import 'theme/app_theme.dart';
import 'services/network_service.dart';
import 'services/localization_service.dart';
import 'services/vehicle_model_service.dart';
import 'services/auth_storage_service.dart';
import 'services/app_notification_service.dart';
import 'services/screen_refresh_service.dart';
import 'services/security_service.dart';
import 'screens/no_connection_screen.dart';
import 'screens/bottom_navigation_screen.dart';

import 'package:model_viewer_plus/model_viewer_plus.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // App Crash Prevention: Catch unhandled Flutter framework errors
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    debugPrint('[CarQConnect Error] FlutterError: ${details.exceptionAsString()}');
  };

  // App Crash Prevention: Catch unhandled asynchronous platform errors
  PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
    debugPrint('[CarQConnect Error] Async Dispatcher error: $error\n$stack');
    return true; // Mark as handled to prevent OS-level app termination
  };

  // App Crash Prevention: Replace red screen of death with an elegant fallback UI
  ErrorWidget.builder = (FlutterErrorDetails details) {
    return Material(
      color: Colors.transparent,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.info_outline, color: Colors.blueAccent, size: 36),
              const SizedBox(height: 8),
              const Text(
                'Something went wrong',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              ),
              const SizedBox(height: 4),
              Text(
                details.exception.toString(),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    );
  };

  await ApiConfig.init();
  ApiConfig.prewarm();
  await AppTheme.init();
  await LocalizationService.init();

  // Enable full screen edge-to-edge display with transparent status overlay
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  // Avoid blocking launch on DNS, connectivity probes, or the remote backend.
  // Screens can render cached/local content and report API errors as needed.
  final hasSavedSession = await AuthStorageService.restoreSession();
  VehicleModelService.init();
  await AppNotificationService.instance.initialize();
  runApp(MyApp(isInitialOnline: true, isLoggedIn: hasSavedSession));
}

class MyApp extends StatelessWidget {
  final bool isInitialOnline;
  final bool isLoggedIn;

  const MyApp({
    super.key,
    this.isInitialOnline = true,
    this.isLoggedIn = false,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return ValueListenableBuilder<String>(
          valueListenable: LocalizationService.currentCodeNotifier,
          builder: (context, currentCode, _) {
            return MaterialApp(
              navigatorKey: AuthStorageService.navigatorKey,
              title: 'CarQConnect',
              debugShowCheckedModeBanner: false,
              themeMode: isLight ? ThemeMode.light : ThemeMode.dark,
              theme: AppTheme.lightTheme,
              darkTheme: AppTheme.darkTheme,
              navigatorObservers: [appRouteObserver],
              builder: (context, child) {
                final mediaQuery = MediaQuery.of(context);
                final screenWidth = mediaQuery.size.width;
                final scaleFactor = screenWidth > 0
                    ? (screenWidth / AppScale.baselineWidth).clamp(0.92, 1.15)
                    : 1.0;
                return MediaQuery(
                  data: mediaQuery.copyWith(
                    textScaler: TextScaler.linear(scaleFactor),
                  ),
                  child: child ?? const SizedBox.shrink(),
                );
              },
              initialRoute: '/',
              onGenerateRoute: (settings) {
                final uri = Uri.parse(settings.name ?? '/');

                if (uri.pathSegments.length == 2 &&
                    uri.pathSegments.first == 'scan') {
                  final tagId = uri.pathSegments[1];
                  return MaterialPageRoute(
                    builder: (context) => PublicScanScreen(tagId: tagId),
                  );
                }

                return MaterialPageRoute(
                  builder: (context) => AppRootGate(
                    initialConnected: isInitialOnline,
                    isLoggedIn: isLoggedIn,
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}

/// Gate at app launch that checks internet connectivity and login state.
/// If user is already logged in, directly loads BottomNavigationScreen.
/// The No Connection screen is ONLY shown at app launch when the user opens the app without internet.
class AppRootGate extends StatefulWidget {
  final bool initialConnected;
  final bool isLoggedIn;

  const AppRootGate({
    super.key,
    this.initialConnected = true,
    this.isLoggedIn = false,
  });

  @override
  State<AppRootGate> createState() => _AppRootGateState();
}

class _AppRootGateState extends State<AppRootGate> with WidgetsBindingObserver {
  late bool _isConnected;
  late bool _isLoggedIn;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _isConnected = widget.initialConnected;
    _isLoggedIn = widget.isLoggedIn;
    AuthStorageService.sessionExpiredNotifier.addListener(_onSessionExpiredChanged);
    if (_isLoggedIn) {
      AuthStorageService.isSessionValid();
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        SecurityService.checkDeviceSecurity(context);
      }
    });
  }

  void _onSessionExpiredChanged() {
    if (AuthStorageService.sessionExpiredNotifier.value && mounted) {
      setState(() {
        _isLoggedIn = false;
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_isLoggedIn) return;
    if (state == AppLifecycleState.resumed) {
      AuthStorageService.isSessionValid();
      AppNotificationService.instance.onAppResumed();
    } else if (state == AppLifecycleState.paused) {
      AppNotificationService.instance.onAppPaused();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    AuthStorageService.sessionExpiredNotifier.removeListener(_onSessionExpiredChanged);
    super.dispose();
  }

  void _onRetry() async {
    final connected = await NetworkService.instance.checkConnection();
    if (connected && mounted) {
      if (!_isLoggedIn) {
        final hasSession = await AuthStorageService.restoreSession();
        if (mounted) {
          setState(() {
            _isConnected = true;
            _isLoggedIn = hasSession;
          });
          return;
        }
      }
      setState(() {
        _isConnected = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_isConnected) {
      return NoConnectionScreen(showBottomNav: false, onRetry: _onRetry);
    }
    if (_isLoggedIn) {
      return const BottomNavigationScreen();
    }
    return const OnboardingScreen();
  }
}

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  // Pre-cached images
  static const List<String> _allAssetPaths = [
    'assets/images/onboarding_1.png',
    'assets/images/onboarding_2.png',
    'assets/images/onboarding_3.png',
  ];

  final List<Map<String, String>> _onboardingData = [
    {
      "title": "Your Vehicle,\nOne Scan Away",
      "subtitle": "Your CarQConnect Smart QR Tag connects your vehicle to the people who need to reach you.",
      "image": "assets/images/onboarding_1.svg",
      "footerTitle": "CONNECT\nTODAY\nDRIVE BETTER",
    },
    {
      "title": "Stay Safe,\nAlways Protected",
      "subtitle": "Stay Connected with real-time tracking, SOS alerts and instant assistance.",
      "image": "assets/images/onboarding_2.png",
      "footerTitle": "PROTECTION\nTHAT DRIVES\nWITH YOU",
    },
    {
      "title": "A Smarter\nJourney Ahead",
      "subtitle": "Plan trips, find nearby services, explore a marketplace and get AI support - all designed for you.",
      "image": "assets/images/onboarding_3.png",
      "footerTitle": "A SMOOTHER\nWAY\n FORWARD",
    },
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    for (final path in _allAssetPaths) {
      precacheImage(AssetImage(path), context);
    }
  }

  void _goToLogin() {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const LogInScreen()),
    );
  }

  void _onNextPressed() {
    if (_currentPage < _onboardingData.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      _goToLogin();
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF040A18),
      body: Stack(
        children: [
          // Background gradient
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: [0.0, 0.55, 1.0],
                  colors: [
                    Color(0xFF070B18),
                    Color(0xFF0B1022),
                    Color(0xFF111936),
                  ],
                ),
              ),
            ),
          ),

          // Offstage pre-render to keep textures hot in GPU memory
          Offstage(
            offstage: true,
            child: Row(
              children: _allAssetPaths
                  .map((p) => Image.asset(p, width: 1, height: 1))
                  .toList(),
            ),
          ),

          // PageView for onboarding pages
          PageView(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentPage = index;
              });
            },
            children: [
              FirstOnboardingPage(active: _currentPage == 0),
              _buildStandardOnboardingPage(1),
              OnboardingPage3(active: _currentPage == 2),
            ],
          ),

          // Top Header: Skip Button
          SafeArea(
            child: Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24.0,
                  vertical: 12.0,
                ),
                child: TextButton(
                  onPressed: _goToLogin,
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.white70,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                  ),
                  child: const Text(
                    "Skip",
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Bottom Navigation Row
          Positioned(
            left: 24,
            right: 24,
            bottom: 24,
            child: SafeArea(top: false, child: _buildBottomControls()),
          ),
        ],
      ),
    );
  }

  // Standard Onboarding Page (screen 2) - fully bright background
  Widget _buildStandardOnboardingPage(int index) {
    final titleLines = _onboardingData[index]["title"]!.split('\n');

    return Stack(
      fit: StackFit.expand,
      children: [
        // 1. Background image
        Image.asset(
          _onboardingData[index]["image"]!,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) =>
              Container(color: const Color(0xFF040A18)),
        ),

        // 2. Subtle top & bottom contrast feathering
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                const Color(0xFF040A18).withValues(alpha: 0.28),
                Colors.transparent,
                Colors.transparent,
                const Color(0xFF040A18).withValues(alpha: 0.38),
              ],
              stops: const [0.0, 0.18, 0.78, 1.0],
            ),
          ),
        ),

        // 3. Ambient light strip sweep
        Positioned.fill(
          child: IgnorePointer(
            child: LightStripSweep(
              active: _currentPage == index,
              imagePath: _onboardingData[index]["image"]!,
            ),
          ),
        ),

        SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 65),

                // Heading: Line 1 White, Line 2 Lilac Gradient (Typewriter animation)
                TypewriterOnboardingTitle(
                  line1: titleLines[0],
                  line2: titleLines.length > 1 ? titleLines[1] : '',
                  active: _currentPage == index,
                  gradientColors: const [Color(0xFFB5C6FF), Color(0xFFA28BFF)],
                  shadows: const [
                    Shadow(
                      color: Colors.black45,
                      blurRadius: 8,
                      offset: Offset(0, 1),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Subtitle
                Text(
                  _onboardingData[index]["subtitle"]!,
                  style: TextStyle(
                    fontSize: 15,
                    color: Colors.white.withValues(alpha: 0.88),
                    height: 1.48,
                    fontWeight: FontWeight.w400,
                    shadows: const [
                      Shadow(
                        color: Colors.black54,
                        blurRadius: 8,
                        offset: Offset(0, 1),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // Bottom Controls: Page Number, Footer Text, Indicator Dots & Next Arrow
  Widget _buildBottomControls() {
    final bool isLastScreen = _currentPage == _onboardingData.length - 1;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Left column: 01 ── CONNECT TODAY DRIVE BETTER
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Text(
                  "0${_currentPage + 1}",
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  width: 32,
                  height: 2,
                  color: Colors.white.withValues(alpha: 0.35),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              _onboardingData[_currentPage]["footerTitle"]!,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 2.0,
                height: 1.35,
                color: Colors.white.withValues(alpha: 0.65),
              ),
            ),
          ],
        ),

        // Center: dots indicator
        Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(
            _onboardingData.length,
            (index) => AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              margin: const EdgeInsets.symmetric(horizontal: 4),
              width: _currentPage == index ? 22 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: _currentPage == index
                    ? (isLastScreen
                          ? const Color(0xFF00C2FF)
                          : const Color(0xFF3875F6))
                    : Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
        ),

        // Right: squircle next button (bright cyan on screen 3)
        GestureDetector(
          onTap: _onNextPressed,
          child: Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: isLastScreen
                  ? const Color(0xFF00C2FF)
                  : const Color(0xFF1E2538),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isLastScreen
                    ? Colors.transparent
                    : Colors.white.withValues(alpha: 0.12),
                width: 1.2,
              ),
            ),
            child: Icon(
              Icons.arrow_forward,
              color: isLastScreen ? Colors.black : Colors.white,
              size: 24,
            ),
          ),
        ),
      ],
    );
  }
}

// 1st Onboarding Page: 3D car / bike model
class FirstOnboardingPage extends StatefulWidget {
  final bool active;
  const FirstOnboardingPage({super.key, required this.active});

  @override
  State<FirstOnboardingPage> createState() => _FirstOnboardingPageState();
}

class _FirstOnboardingPageState extends State<FirstOnboardingPage>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 65),

            // Heading: "Your Vehicle," (White) + "One Scan Away" (Lilac gradient typewriter animation)
            RepaintBoundary(
              child: TypewriterOnboardingTitle(
                line1: "Your Vehicle,",
                line2: "One Scan Away",
                active: widget.active,
                gradientColors: const [
                  Color(0xFFB5C6FF),
                  Color(0xFFA28BFF),
                  Color(0xFF9373FF),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Subtitle
            Text(
              "Your CarQConnect Smart QR Tag connects your vehicle to the people who need to reach you.",
              style: TextStyle(
                fontSize: 15,
                color: Colors.white.withValues(alpha: 0.65),
                height: 1.45,
                fontWeight: FontWeight.w400,
              ),
            ),

            const SizedBox(height: 16),

            // Vehicle showcase: glossy 3D CarQConnect vehicle on a neon platform.
            Expanded(child: Center(child: _buildVehicleShowcase())),

            const SizedBox(height: 96),
          ],
        ),
      ),
    );
  }

  // 1st Onboarding Screen Vehicle Showcase
  Widget _buildVehicleShowcase() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = math.min(constraints.maxWidth, 460.0);
        final height = math.min(
          constraints.maxHeight > 0 ? constraints.maxHeight : 360.0,
          360.0,
        );
        return RepaintBoundary(
          child: SizedBox(
            width: width,
            height: height,
            child: Stack(
              fit: StackFit.expand,
              children: [
                const IgnorePointer(
                  child: CustomPaint(painter: _NeonTurntablePainter()),
                ),
                IgnorePointer(
                  child: ModelViewer(
                    key: const ValueKey('onboarding_car_3d_Car_3d_Model'),
                    src: kIsWeb
                        ? 'assets/assets/models/Car_3d_Model.glb'
                        : 'assets/models/Car_3d_Model.glb',
                    alt: 'CarQConnect Connected 3D Car',
                    autoRotate: true,
                    autoRotateDelay: 0,
                    rotationPerSecond: '24deg',
                    cameraOrbit: '0deg 85deg 108%',
                    cameraTarget: 'auto',
                    cameraControls: false,
                    interactionPrompt: InteractionPrompt.none,
                    fieldOfView: '30deg',
                    disableZoom: true,
                    disablePan: true,
                    disableTap: true,
                    environmentImage: 'neutral',
                    exposure: 0.95,
                    backgroundColor: Colors.transparent,
                    loading: Loading.eager,
                    relatedCss: '''
model-viewer {
  --poster-color: transparent;
  pointer-events: none;
  touch-action: none;
}
''',
                    relatedJs: '''
window.ModelViewerElement = window.ModelViewerElement || {};
window.ModelViewerElement.powerPreference = 'high-performance';
if (window.customElements) {
  customElements.whenDefined('model-viewer').then(function() {
    var mv = document.querySelector('model-viewer');
    if (mv) {
      mv.shadowIntensity = 0.85;
      mv.shadowSoftness = 0.8;
      mv.setAttribute('power-preference', 'high-performance');
    }
  });
}
''',
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _NeonTurntablePainter extends CustomPainter {
  const _NeonTurntablePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.60);
    final ringRect = Rect.fromCenter(
      center: center,
      width: size.width * 0.94,
      height: size.height * 0.18,
    );

    final floorRect = Rect.fromCenter(
      center: center,
      width: ringRect.width * 0.98,
      height: ringRect.height * 1.12,
    );
    canvas.drawOval(
      floorRect,
      Paint()
        ..shader = RadialGradient(
          colors: [
            const Color(0xFF5B91C8).withValues(alpha: 0.12),
            const Color(0xFF263B5D).withValues(alpha: 0.08),
            Colors.transparent,
          ],
          stops: const [0, 0.65, 1],
        ).createShader(floorRect),
    );

    final contactShadowRect = Rect.fromCenter(
      center: Offset(center.dx, center.dy - ringRect.height * 0.08),
      width: ringRect.width * 0.70,
      height: ringRect.height * 0.44,
    );
    canvas.drawOval(
      contactShadowRect,
      Paint()
        ..shader = const RadialGradient(
          colors: [Color(0x66020813), Color(0x332B4D78), Colors.transparent],
          stops: [0, 0.58, 1],
        ).createShader(contactShadowRect),
    );

    final ringPath = Path()..addOval(ringRect);
    canvas.drawPath(
      ringPath,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5
        ..color = const Color(0xFF78BFFF).withValues(alpha: 0.10)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8),
    );
    canvas.drawPath(
      ringPath,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.4
        ..shader = const LinearGradient(
          colors: [
            Color(0xA0526883),
            Color(0xB078B9D8),
            Color(0xA064759E),
            Color(0xA0526883),
          ],
        ).createShader(ringRect),
    );
  }

  @override
  bool shouldRepaint(covariant _NeonTurntablePainter oldDelegate) => false;
}

/// Character-by-character typewriter fade animation matching OnboardingPage3.
class TypewriterOnboardingTitle extends StatefulWidget {
  final String line1;
  final String line2;
  final bool active;
  final List<Color> gradientColors;
  final List<Shadow>? shadows;

  const TypewriterOnboardingTitle({
    super.key,
    required this.line1,
    required this.line2,
    required this.active,
    this.gradientColors = const [
      Color(0xFFB5C6FF),
      Color(0xFFA28BFF),
      Color(0xFF9373FF),
    ],
    this.shadows,
  });

  @override
  State<TypewriterOnboardingTitle> createState() =>
      _TypewriterOnboardingTitleState();
}

class _TypewriterOnboardingTitleState extends State<TypewriterOnboardingTitle>
    with SingleTickerProviderStateMixin {
  static const int _typeStartMs = 150;
  static const int _perCharMs = 85;
  static const int _charFadeMs = 150;

  late int _totalMs;
  late AnimationController _c;

  @override
  void initState() {
    super.initState();
    final totalChars = widget.line1.length + widget.line2.length;
    _totalMs = _typeStartMs + totalChars * _perCharMs + _charFadeMs + 200;
    _c = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: _totalMs),
    );
    if (widget.active) {
      _c.forward();
    }
  }

  @override
  void didUpdateWidget(covariant TypewriterOnboardingTitle oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !oldWidget.active) {
      _c.forward(from: 0);
    } else if (!widget.active && oldWidget.active) {
      _c.reset();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  double _charAlpha(int index) {
    final t = _c.value * _totalMs;
    final start = _typeStartMs + index * _perCharMs;
    return ((t - start) / _charFadeMs).clamp(0.0, 1.0);
  }

  TextSpan _typed(String text, int offset) {
    return TextSpan(
      children: [
        for (int i = 0; i < text.length; i++)
          TextSpan(
            text: text[i],
            style: TextStyle(
              color: Colors.white.withValues(alpha: _charAlpha(offset + i)),
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final titleStyle = TextStyle(
      fontSize: 38,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.5,
      color: Colors.white,
      height: 1.15,
      shadows: widget.shadows,
    );

    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text.rich(_typed(widget.line1, 0), style: titleStyle),
          if (widget.line2.isNotEmpty)
            ShaderMask(
              shaderCallback: (bounds) => LinearGradient(
                colors: widget.gradientColors,
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ).createShader(bounds),
              child: Text.rich(
                _typed(widget.line2, widget.line1.length),
                style: titleStyle,
              ),
            ),
        ],
      ),
    );
  }
}
