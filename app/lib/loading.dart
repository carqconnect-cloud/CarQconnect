import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'theme/app_theme.dart';

/// Reusable App Loading System for the entire application.
/// Provides:
/// - [AppLoadingSpinner] - The standalone rotating concentric vortex spinner.
/// - [AppLoadingScreen]  - Full page loading screen with automotive branding & messages.
/// - [AppLoading]        - Static helpers to show/hide loading dialogs or wrap async tasks anywhere.

// ============================================================================
// 1. AppLoading (Global Static Helpers)
// ============================================================================

class AppLoading {
  static BuildContext? _activeContext;
  static bool _isShowing = false;

  /// Show a global loading dialog overlay on top of any screen.
  static void show(
    BuildContext context, {
    String message = 'Loading...',
    String? subtitle,
    bool barrierDismissible = false,
  }) {
    if (_isShowing) return;
    _isShowing = true;
    _activeContext = context;
    final isLight = AppTheme.isLight;
    final primaryColor = isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF);

    showDialog(
      context: context,
      barrierDismissible: barrierDismissible,
      barrierColor: Colors.black.withValues(alpha: isLight ? 0.45 : 0.72),
      builder: (ctx) {
        return PopScope(
          canPop: barrierDismissible,
          child: Center(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 40),
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 26),
              decoration: BoxDecoration(
                color: isLight ? Colors.white : const Color(0xFF0A1224),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF00C2FF).withValues(alpha: 0.25),
                  width: 1.2,
                ),
                boxShadow: isLight
                    ? [
                        const BoxShadow(
                          color: Color(0x1F000000),
                          blurRadius: 28,
                          offset: Offset(0, 10),
                        ),
                      ]
                    : [
                        BoxShadow(
                          color: const Color(0xFF00C2FF).withValues(alpha: 0.12),
                          blurRadius: 30,
                          spreadRadius: 2,
                        ),
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.6),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppLoadingSpinner(size: 120, primaryColor: primaryColor),
                  const SizedBox(height: 20),
                  Text(
                    message,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.2,
                      decoration: TextDecoration.none,
                    ),
                  ),
                  if (subtitle != null && subtitle.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      subtitle,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8FA0B8),
                        fontSize: 12.5,
                        fontWeight: FontWeight.normal,
                        decoration: TextDecoration.none,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    ).then((_) {
      _isShowing = false;
      _activeContext = null;
    });
  }

  /// Dismiss the global loading dialog if currently active.
  static void hide([BuildContext? context]) {
    if (!_isShowing) return;
    final ctx = context ?? _activeContext;
    if (ctx != null && Navigator.canPop(ctx)) {
      Navigator.of(ctx, rootNavigator: true).pop();
    }
    _isShowing = false;
    _activeContext = null;
  }

  /// Run an asynchronous task while displaying the loading overlay.
  static Future<T> wrap<T>(
    BuildContext context, {
    required Future<T> Function() task,
    String message = 'Loading...',
    String? subtitle,
  }) async {
    show(context, message: message, subtitle: subtitle);
    try {
      final result = await task();
      return result;
    } finally {
      hide();
    }
  }
}

// ============================================================================
// 2. Full Page AppLoadingScreen
// ============================================================================

class AppLoadingScreen extends StatefulWidget {
  final String title;
  final String message;
  final String? subtitle;
  final double? progress; // null for indeterminate, or 0.0 to 1.0
  final Duration? autoNavigateDelay;
  final Widget? destinationScreen;
  final VoidCallback? onComplete;

  const AppLoadingScreen({
    super.key,
    this.title = 'CarQConnect',
    this.message = 'Setting up vehicle telemetry...',
    this.subtitle = 'Please wait while we sync your vehicle health & data.',
    this.progress,
    this.autoNavigateDelay,
    this.destinationScreen,
    this.onComplete,
  });

  @override
  State<AppLoadingScreen> createState() => _AppLoadingScreenState();
}

class _AppLoadingScreenState extends State<AppLoadingScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.autoNavigateDelay != null) {
      Future.delayed(widget.autoNavigateDelay!, () {
        if (!mounted) return;
        if (widget.destinationScreen != null) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => widget.destinationScreen!),
          );
        } else if (widget.onComplete != null) {
          widget.onComplete!();
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF040A18),
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0.0, -0.08),
            radius: 0.9,
            colors: [
              Color(0xFF0B1733), // Subtle glowing navy core
              Color(0xFF040A18), // Deep black-blue edge
            ],
            stops: [0.0, 1.0],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Spacer(flex: 3),

                  // Brand / Header Tag
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF00C2FF).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: const Color(0xFF00C2FF).withValues(alpha: 0.35),
                        width: 1.0,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: Color(0xFF00C2FF),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Color(0xFF00C2FF),
                                blurRadius: 6,
                                spreadRadius: 1,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          widget.title.toUpperCase(),
                          style: const TextStyle(
                            color: Color(0xFF00C2FF),
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const Spacer(flex: 2),

                  // Automotive Car Loading Animation
                  const AppLoadingSpinner(size: 180),

                  const Spacer(flex: 2),

                  // Primary Message
                  Text(
                    widget.message,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.3,
                    ),
                  ),

                  // Subtitle
                  if (widget.subtitle != null && widget.subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      widget.subtitle!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xFF8293AA),
                        fontSize: 13.5,
                        height: 1.45,
                      ),
                    ),
                  ],

                  // Progress Bar if specified
                  if (widget.progress != null) ...[
                    const SizedBox(height: 24),
                    SizedBox(
                      width: 200,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: widget.progress,
                          minHeight: 4,
                          backgroundColor: const Color(0xFF13223A),
                          valueColor: const AlwaysStoppedAnimation(Color(0xFF00C2FF)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${(widget.progress! * 100).toInt()}%',
                      style: const TextStyle(
                        color: Color(0xFF00C2FF),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],

                  const Spacer(flex: 4),

                  // Footer info
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.lock_outline_rounded, color: Color(0xFF55677E), size: 14),
                      SizedBox(width: 6),
                      Text(
                        'End-to-End Encrypted Telemetry',
                        style: TextStyle(
                          color: Color(0xFF55677E),
                          fontSize: 11.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// 3. AppLoadingSpinner / CarLoadingAnimation (Dynamic Driving Car Loader)
// ============================================================================

/// Dynamic Automotive Car Loading Animation.
/// Replaces the static spiral with a driving car, rotating alloy wheels,
/// and an infinitely scrolling road with trees and dashed road dividers.
typedef CarLoadingAnimation = AppLoadingSpinner;

class AppLoadingSpinner extends StatefulWidget {
  final double size;
  final double? width;
  final double? height;
  final Duration duration;
  final Color primaryColor;
  final Color secondaryColor;
  final bool? showGlow;

  const AppLoadingSpinner({
    super.key,
    this.size = 130.0,
    this.width,
    this.height,
    this.duration = const Duration(milliseconds: 2600),
    this.primaryColor = const Color(0xFF4CD3FB),
    this.secondaryColor = const Color(0xFF1F51DA),
    this.showGlow,
  });

  @override
  State<AppLoadingSpinner> createState() => _AppLoadingSpinnerState();
}

class _AppLoadingSpinnerState extends State<AppLoadingSpinner>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  // Pre-cached SVG widgets to optimize rendering performance at 60/120fps
  late final Widget _roadTreesSvg;
  late final Widget _carBodySvg;
  late final Widget _frontTyreSvg;
  late final Widget _rearTyreSvg;

  // Native SVG scene dimensions
  static const double _sceneWidth = 226.0;
  static const double _sceneHeight = 75.0;
  static const double _carWidth = 88.0;
  static const double _carHeight = 30.0;
  static const double _tyreSize = 10.0;

  // Car horizontal center in scene: (226 - 88) / 2 = 69.0
  static const double _carLeft = 69.0;
  // Tyre bottom rests on road surface at Y = 56.5 -> top = 56.5 - 27.34 = 29.16
  static const double _carTop = 29.16;

  // Precise wheel hub coordinates relative to 88x30 car body:
  // Rear tyre: center (21.93, 22.34) -> top-left (16.93, 17.34)
  static const double _rearTyreLeft = 16.93;
  static const double _rearTyreTop = 17.34;
  // Front tyre: center (67.24, 22.34) -> top-left (62.24, 17.34)
  static const double _frontTyreLeft = 62.24;
  static const double _frontTyreTop = 17.34;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    )..repeat();

    _roadTreesSvg = SvgPicture.asset(
      'assets/images/Road_trees.svg',
      width: _sceneWidth,
      height: _sceneHeight,
      fit: BoxFit.contain,
    );

    _carBodySvg = SvgPicture.asset(
      'assets/images/Car.svg',
      width: _carWidth,
      height: _carHeight,
      fit: BoxFit.contain,
    );

    _frontTyreSvg = SvgPicture.asset(
      'assets/images/Front_Tyre.svg',
      width: _tyreSize,
      height: _tyreSize,
      fit: BoxFit.contain,
    );

    _rearTyreSvg = SvgPicture.asset(
      'assets/images/Rear_Tyre.svg',
      width: _tyreSize,
      height: _tyreSize,
      fit: BoxFit.contain,
    );
  }

  @override
  void didUpdateWidget(covariant AppLoadingSpinner oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.duration != widget.duration) {
      _controller.duration = widget.duration;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final effectiveShowGlow = widget.showGlow ?? (widget.size >= 70);
    final targetHeight = widget.height ?? (widget.size * 0.75).clamp(16.0, 220.0);
    final targetWidth = widget.width ?? (targetHeight * (_sceneWidth / _sceneHeight));

    return LayoutBuilder(
      builder: (context, constraints) {
        final maxW = constraints.hasBoundedWidth && constraints.maxWidth > 0
            ? constraints.maxWidth
            : double.infinity;
        final maxH = constraints.hasBoundedHeight && constraints.maxHeight > 0
            ? constraints.maxHeight
            : double.infinity;

        final double width = (targetWidth > maxW) ? maxW : targetWidth;
        final double height = (targetHeight > maxH) ? maxH : targetHeight;

        return SizedBox(
          width: width,
          height: height,
          child: FittedBox(
            fit: BoxFit.contain,
            child: SizedBox(
              width: _sceneWidth,
              height: _sceneHeight,
              child: AnimatedBuilder(
                animation: _controller,
                builder: (context, _) {
                  final t = _controller.value;
                  final scrollOffset = t * _sceneWidth;
                  // 7 full wheel revolutions per road cycle matches linear road distance (226 / ~32.2)
                  final wheelAngle = t * 7 * 2 * math.pi;
                  // Subtle suspension vibration/bounce while driving
                  final bounceY = math.sin(t * 14 * math.pi) * 0.45;

                  return ClipRect(
                    child: ShaderMask(
                      shaderCallback: (Rect bounds) {
                        return const LinearGradient(
                          begin: Alignment.centerLeft,
                          end: Alignment.centerRight,
                          colors: [
                            Colors.transparent,
                            Colors.black,
                            Colors.black,
                            Colors.transparent,
                          ],
                          stops: [0.0, 0.08, 0.92, 1.0],
                        ).createShader(bounds);
                      },
                      blendMode: BlendMode.dstIn,
                      child: Stack(
                        clipBehavior: Clip.hardEdge,
                        children: [
                          // 1. Seamless Scrolling Scenery (Trees, Bushes, Road Surface, Dashes)
                          Positioned(
                            left: -scrollOffset,
                            top: 0,
                            width: _sceneWidth,
                            height: _sceneHeight,
                            child: _roadTreesSvg,
                          ),
                          Positioned(
                            left: _sceneWidth - scrollOffset,
                            top: 0,
                            width: _sceneWidth,
                            height: _sceneHeight,
                            child: _roadTreesSvg,
                          ),
                          Positioned(
                            left: (_sceneWidth * 2) - scrollOffset,
                            top: 0,
                            width: _sceneWidth,
                            height: _sceneHeight,
                            child: _roadTreesSvg,
                          ),

                          // 2. Subtle Chassis Underglow Reflection
                          if (effectiveShowGlow)
                            Positioned(
                              left: _carLeft + 8,
                              top: _carTop + _carHeight - 4,
                              width: _carWidth - 16,
                              height: 6,
                              child: Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(4),
                                  boxShadow: [
                                    BoxShadow(
                                      color: widget.primaryColor.withValues(alpha: 0.28),
                                      blurRadius: 8,
                                      spreadRadius: 1,
                                    ),
                                  ],
                                ),
                              ),
                            ),

                          // 3. The Car (centered on the road, with rotating front & rear alloy wheels)
                          Positioned(
                            left: _carLeft,
                            top: _carTop + bounceY,
                            width: _carWidth,
                            height: _carHeight,
                            child: Stack(
                              clipBehavior: Clip.none,
                              children: [
                                // Main Car Body & Windows
                                _carBodySvg,

                                // Rotating Rear Alloy Wheel
                                Positioned(
                                  left: _rearTyreLeft,
                                  top: _rearTyreTop,
                                  width: _tyreSize,
                                  height: _tyreSize,
                                  child: Transform.rotate(
                                    angle: wheelAngle,
                                    alignment: Alignment.center,
                                    child: _rearTyreSvg,
                                  ),
                                ),

                                // Rotating Front Alloy Wheel
                                Positioned(
                                  left: _frontTyreLeft,
                                  top: _frontTyreTop,
                                  width: _tyreSize,
                                  height: _tyreSize,
                                  child: Transform.rotate(
                                    angle: wheelAngle,
                                    alignment: Alignment.center,
                                    child: _frontTyreSvg,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Convenient drop-in loading indicator widget to replace CircularProgressIndicator anywhere.
class AppLoadingIndicator extends StatelessWidget {
  final double size;
  final Color? color;
  final bool? showGlow;

  const AppLoadingIndicator({
    super.key,
    this.size = 80.0,
    this.color,
    this.showGlow,
  });

  @override
  Widget build(BuildContext context) {
    return AppLoadingSpinner(
      size: size,
      primaryColor: color ?? (AppTheme.isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF)),
      showGlow: showGlow,
    );
  }
}
