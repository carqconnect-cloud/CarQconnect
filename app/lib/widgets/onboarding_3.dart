import 'dart:math' as math;

import 'package:flutter/material.dart';

class OnboardingPage3 extends StatefulWidget {
  final bool active;
  const OnboardingPage3({super.key, required this.active});

  @override
  State<OnboardingPage3> createState() => _OnboardingPage3State();
}

class _OnboardingPage3State extends State<OnboardingPage3>
    with SingleTickerProviderStateMixin {
  // ---- Timeline (ms) -------------------------------------------------------
  static const int _totalMs = 4200;
  static const int _typeStartMs = 150;
  static const int _perCharMs = 85;
  static const int _charFadeMs = 150;
  static const int _carStartMs = 600;
  static const int _carEndMs = 3600;

  // ---- Light timeline (ms) -------------------------------------------------
  // Ignition flicker as the car enters: on-off-on-off-on
  static const int _ignitionStartMs = 600;
  static const int _ignitionEndMs = 1400;
  // Car looks parked from here; glow blinks off/on twice
  static const int _blinkStartMs = 2800;
  static const int _blinkEndMs = 3900;

  // ---- Car asset geometry (Car_Componentsonboarding.png = 782 x 262) -------
  static const double _carW = 782.0;
  static const double _carH = 262.0;

  static const double _carScreenWFrac = 0.98;
  static const double _carRestLeftFrac = -0.01;

  static const double _visL = 0.0;
  static const double _visW = 1.0;
  static const double _visT = 0.0;
  static const double _visH = 1.0;

  // Where the tyres touch the road, as a fraction of screen height
  static const double _roadBottomFactor = 0.67;

  // Light positions relative to the car image (fractions of w / h).
  // Measured from the real lamps in the PNG.
  static const Offset _headlightFrac = Offset(0.074, 0.487);
  static const Offset _taillightFrac = Offset(0.906, 0.420);
  static const double _tailStartXFrac = 0.945;
  static const List<double> _tailYFrac = [0.12, 0.42, 0.66];

  // ── Wheel positions as fractions of the car PNG (782 × 262) ───────────────
  static const double _frontWheelXFrac = 0.200;
  static const double _frontWheelYFrac = 0.768;
  static const double _rearWheelXFrac = 0.768;
  static const double _rearWheelYFrac = 0.768;
  static const double _wheelRadiusFrac = 0.077;

  static const double _totalWheelRotations = 2.15;

  static const String _line1 = 'A Smarter';
  static const String _line2 = 'Journey Ahead';
  static const String _subtitle =
      'Plan trips, find nearby services, explore a marketplace and get AI support - all designed for you.';

  // Single controller drives everything: car, wheels, lights, and typewriter.
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: _totalMs),
  );

  late final Animation<double> _car = CurvedAnimation(
    parent: _c,
    curve: Interval(
      _carStartMs / _totalMs,
      _carEndMs / _totalMs,
      curve: Curves.easeOut,
    ),
  );

  @override
  void initState() {
    super.initState();
    if (widget.active) _c.forward();
  }

  @override
  void didUpdateWidget(covariant OnboardingPage3 old) {
    super.didUpdateWidget(old);
    if (widget.active && !old.active) {
      _c.forward(from: 0);
    } else if (!widget.active && old.active) {
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

  TextSpan _typed(String text, int offset, [Color? color]) {
    final baseColor = color ?? Colors.white;
    return TextSpan(
      children: [
        for (int i = 0; i < text.length; i++)
          TextSpan(
            text: text[i],
            style: TextStyle(
              color: baseColor.withValues(alpha: _charAlpha(offset + i)),
            ),
          ),
      ],
    );
  }

  /// 0 before ignition, flickers on-off-on-off-on, then steady 1.
  double _ignition(double t) {
    if (t < _ignitionStartMs) return 0.0;
    final u = ((t - _ignitionStartMs) / (_ignitionEndMs - _ignitionStartMs))
        .clamp(0.0, 1.0);
    if (u < 0.20) return 1.0;
    if (u < 0.35) return 0.08;
    if (u < 0.55) return 1.0;
    if (u < 0.70) return 0.08;
    return 1.0;
  }

  /// 1 normally; drops to ~0 twice during the blink window (car parked).
  double _parkedBlink(double t) {
    if (t < _blinkStartMs || t > _blinkEndMs) return 1.0;
    final u = (t - _blinkStartMs) / (_blinkEndMs - _blinkStartMs);
    final off = (u > 0.10 && u < 0.30) || (u > 0.50 && u < 0.70);
    return off ? 0.08 : 1.0;
  }

  @override
  Widget build(BuildContext context) {
    const titleStyle = TextStyle(
      fontSize: 38,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.5,
      color: Colors.white,
      height: 1.15,
    );

    return Stack(
      fit: StackFit.expand,
      children: [
        // 1. Background road image
        Image.asset(
          'assets/images/onboarding_3.png',
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) =>
              Container(color: const Color(0xFF040A18)),
        ),

        // 2. Top/bottom feathering vignette
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

        // 3. Car + spinning wheels + light effects
        Positioned.fill(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final w = constraints.maxWidth;
              final h = constraints.maxHeight;

              final drawnW = (w * _carScreenWFrac) / _visW;
              final drawnH = drawnW * (_carH / _carW);
              final s = drawnW / _carW;

              final visW = drawnW * _visW;
              final visH = drawnH * _visH;
              final visTopOffset = drawnH * _visT;

              final carTop = h * _roadBottomFactor - visTopOffset - visH;

              final wheelDiameter = drawnW * _wheelRadiusFrac * 2;

              return AnimatedBuilder(
                animation: _c,
                builder: (context, _) {
                  final p = _car.value; // 0 → 1 as car slides in and stops
                  final t = _c.value * _totalMs;

                  // Car horizontal position
                  final restVisLeft = w * _carRestLeftFrac;
                  final visLeft = w + (restVisLeft - w) * p;
                  final left = visLeft - drawnW * _visL;
                  final visTop = carTop + visTopOffset;

                  // Speed proxy (used for tail-light streak length)
                  final speed = (1.0 - p).clamp(0.0, 1.0);

                  // Wheel rotation angle
                  final wheelAngle = -p * 2 * math.pi * _totalWheelRotations;

                  // ── Lights ───────────────────────────────────────────────
                  // ignition: flicker on at entry, then steady.
                  final ignition = _ignition(t);

                  // Beam + red streaks: on while driving, fade as car stops.
                  final settle = ((p - 0.85) / 0.13).clamp(0.0, 1.0);
                  final travelLight = ignition * (1.0 - settle);
                  final beamOpacity = travelLight * 0.9;
                  final tailOpacity = travelLight;
                  final tailLength = (70 + 170 * speed) * (w / 393.0);

                  // Lamp glow on the car: ignition flicker, steady while
                  // driving, then blinks off/on twice once parked.
                  final glowAlpha = ignition * _parkedBlink(t);

                  // Wheel screen positions
                  final frontWheelX = left + drawnW * _frontWheelXFrac;
                  final frontWheelY = carTop + drawnH * _frontWheelYFrac;
                  final rearWheelX = left + drawnW * _rearWheelXFrac;
                  final rearWheelY = carTop + drawnH * _rearWheelYFrac;

                  return Stack(
                    clipBehavior: Clip.hardEdge,
                    children: [
                      // Tail-light streaks (behind the car, right side)
                      if (tailOpacity > 0.01)
                        Positioned.fill(
                          child: CustomPaint(
                            painter: _TailLightPainter(
                              startX: visLeft + visW * _tailStartXFrac,
                              carTop: visTop,
                              carH: visH,
                              yFracs: _tailYFrac,
                              length: tailLength,
                              scale: s,
                              opacity: tailOpacity,
                            ),
                          ),
                        ),

                      // Headlight beam (in front of car, left side)
                      if (beamOpacity > 0.01)
                        Positioned.fill(
                          child: CustomPaint(
                            painter: _HeadlightPainter(
                              origin: Offset(
                                visLeft + visW * _headlightFrac.dx,
                                visTop + visH * _headlightFrac.dy,
                              ),
                              length: w * 0.5,
                              scale: s,
                              opacity: beamOpacity,
                            ),
                          ),
                        ),

                      // Car body (lamps are baked into this PNG)
                      Positioned(
                        left: left,
                        top: carTop,
                        width: drawnW,
                        height: drawnH,
                        child: Image.asset(
                          'assets/images/Car_Componentsonboarding.png',
                          fit: BoxFit.fill,
                        ),
                      ),

                      // Spinning wheels overlaid on car body
                      if (p > 0) ...[
                        _buildWheel(
                          cx: frontWheelX,
                          cy: frontWheelY,
                          diameter: wheelDiameter,
                          angle: wheelAngle,
                          asset: 'assets/images/wheel_front.png',
                        ),
                        _buildWheel(
                          cx: rearWheelX,
                          cy: rearWheelY,
                          diameter: wheelDiameter,
                          angle: wheelAngle,
                          asset: 'assets/images/wheel_rear.png',
                        ),
                      ],

                      // Headlight / taillight glow on top of the baked lamps
                      if (glowAlpha > 0.01)
                        Positioned.fill(
                          child: CustomPaint(
                            painter: _LightGlowPainter(
                              headlight: Offset(
                                visLeft + visW * _headlightFrac.dx,
                                visTop + visH * _headlightFrac.dy,
                              ),
                              taillight: Offset(
                                visLeft + visW * _taillightFrac.dx,
                                visTop + visH * _taillightFrac.dy,
                              ),
                              headRadius: 46 * s,
                              tailRadius: 32 * s,
                              opacity: glowAlpha,
                            ),
                          ),
                        ),
                    ],
                  );
                },
              );
            },
          ),
        ),

        // 4. Typewriter title + subtitle
        SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 65),
                AnimatedBuilder(
                  animation: _c,
                  builder: (context, _) => Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text.rich(
                        _typed(_line1, 0, Colors.white),
                        style: titleStyle,
                      ),
                      ShaderMask(
                        shaderCallback: (bounds) => const LinearGradient(
                          colors: [
                            Color(0xFFB5C6FF),
                            Color(0xFFA28BFF),
                          ],
                          begin: Alignment.centerLeft,
                          end: Alignment.centerRight,
                        ).createShader(bounds),
                        child: Text.rich(
                          _typed(_line2, _line1.length, Colors.white),
                          style: titleStyle.copyWith(color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  _subtitle,
                  style: TextStyle(
                    fontSize: 15,
                    color: Colors.white.withValues(alpha: 0.88),
                    height: 1.48,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// Wheel image positioned at [cx, cy] center, rotated by [angle] radians.
  Widget _buildWheel({
    required double cx,
    required double cy,
    required double diameter,
    required double angle,
    required String asset,
  }) {
    return Positioned(
      left: cx - diameter / 2,
      top: cy - diameter / 2,
      width: diameter,
      height: diameter,
      child: Transform.rotate(
        angle: angle,
        child: Image.asset(asset, fit: BoxFit.fill),
      ),
    );
  }
}

// ─── Headlight beam painter ────────────────────────────────────────────────────

class _HeadlightPainter extends CustomPainter {
  final Offset origin;
  final double length;
  final double scale;
  final double opacity;

  const _HeadlightPainter({
    required this.origin,
    required this.length,
    required this.scale,
    required this.opacity,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (opacity <= 0) return;

    final end = origin.dx - length;
    final path = Path()
      ..moveTo(origin.dx, origin.dy - 3 * scale)
      ..lineTo(end, origin.dy - 16 * scale)
      ..lineTo(end, origin.dy + 24 * scale)
      ..lineTo(origin.dx, origin.dy + 5 * scale)
      ..close();

    canvas.drawPath(
      path,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.centerRight,
          end: Alignment.centerLeft,
          colors: [
            Colors.white.withValues(alpha: 0.85 * opacity),
            Colors.white.withValues(alpha: 0.30 * opacity),
            Colors.white.withValues(alpha: 0.0),
          ],
          stops: const [0.0, 0.45, 1.0],
        ).createShader(Rect.fromLTRB(
          end,
          origin.dy - 20 * scale,
          origin.dx,
          origin.dy + 28 * scale,
        ))
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8),
    );
  }

  @override
  bool shouldRepaint(covariant _HeadlightPainter old) =>
      old.origin != origin || old.opacity != opacity || old.length != length;
}

// ─── Tail-light streak painter ─────────────────────────────────────────────────

class _TailLightPainter extends CustomPainter {
  final double startX;
  final double carTop;
  final double carH;
  final List<double> yFracs;
  final double length;
  final double scale;
  final double opacity;

  const _TailLightPainter({
    required this.startX,
    required this.carTop,
    required this.carH,
    required this.yFracs,
    required this.length,
    required this.scale,
    required this.opacity,
  });

  static const List<double> _thickness = [3.0, 9.0, 4.0];
  static const List<double> _lenMul = [1.0, 0.85, 0.9];

  @override
  void paint(Canvas canvas, Size size) {
    if (opacity <= 0) return;

    for (int i = 0; i < yFracs.length; i++) {
      final y = carTop + carH * yFracs[i];
      final t = _thickness[i] * scale * 2.2;
      final len = length * _lenMul[i];
      final rect = Rect.fromLTRB(startX, y - t / 2, startX + len, y + t / 2);

      final shader = LinearGradient(
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
        colors: [
          const Color(0xFFFF3B4A).withValues(alpha: 0.95 * opacity),
          const Color(0xFFFF2A3D).withValues(alpha: 0.55 * opacity),
          const Color(0xFFFF2A3D).withValues(alpha: 0.0),
        ],
        stops: const [0.0, 0.5, 1.0],
      ).createShader(rect);

      // Soft glow halo
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect.inflate(t * 0.6), Radius.circular(t)),
        Paint()
          ..shader = shader
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 7),
      );
      // Sharp core streak
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, Radius.circular(t / 2)),
        Paint()
          ..shader = shader
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1.5),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _TailLightPainter old) =>
      old.startX != startX ||
      old.length != length ||
      old.opacity != opacity ||
      old.carTop != carTop;
}

// ─── Headlight / taillight glow on the car body ────────────────────────────────

class _LightGlowPainter extends CustomPainter {
  final Offset headlight;
  final Offset taillight;
  final double headRadius;
  final double tailRadius;
  final double opacity;

  const _LightGlowPainter({
    required this.headlight,
    required this.taillight,
    required this.headRadius,
    required this.tailRadius,
    required this.opacity,
  });

  void _glow(Canvas canvas, Offset c, double r, Color color) {
    canvas.drawCircle(
      c,
      r,
      Paint()
        ..blendMode = BlendMode.plus // additive: brightens the baked lamp
        ..shader = RadialGradient(
          colors: [
            color.withValues(alpha: 0.95 * opacity),
            color.withValues(alpha: 0.35 * opacity),
            color.withValues(alpha: 0.0),
          ],
          stops: const [0.0, 0.4, 1.0],
        ).createShader(Rect.fromCircle(center: c, radius: r)),
    );
  }

  @override
  void paint(Canvas canvas, Size size) {
    if (opacity <= 0) return;
    _glow(canvas, headlight, headRadius, Colors.white);
    _glow(canvas, taillight, tailRadius, const Color(0xFFFF2A3D));
  }

  @override
  bool shouldRepaint(covariant _LightGlowPainter old) =>
      old.headlight != headlight ||
      old.taillight != taillight ||
      old.opacity != opacity;
}
