import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Animated generative topographical soundwave / contour orb matching Image 1
class GenerativeOrbWidget extends StatefulWidget {
  final double size;
  final bool? isLight;

  const GenerativeOrbWidget({super.key, this.size = 280, this.isLight});

  @override
  State<GenerativeOrbWidget> createState() => _GenerativeOrbWidgetState();
}

class _GenerativeOrbWidgetState extends State<GenerativeOrbWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final light = widget.isLight ?? AppTheme.isLightNotifier.value;
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return CustomPaint(
          size: Size(widget.size, widget.size),
          painter: GenerativeOrbPainter(
            progress: _controller.value,
            isLight: light,
          ),
        );
      },
    );
  }
}

class GenerativeOrbPainter extends CustomPainter {
  final double progress;
  final bool isLight;

  GenerativeOrbPainter({required this.progress, this.isLight = false});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final maxRadius = math.min(cx, cy) * 0.95;
    const int numRings = 22;

    final rect = Rect.fromLTWH(0, 0, size.width, size.height);
    // Gradient shader: cyan at top -> purple/magenta at bottom
    final gradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: isLight
          ? const [
              Color(0xFF0066FF), // Blue
              Color(0xFF0284C7), // Sky
              Color(0xFF6366F1), // Indigo
              Color(0xFF8B5CF6), // Purple
              Color(0xFFA855F7), // Violet
              Color(0xFFEC4899), // Pink
              Color(0xFF4338CA), // Deep Indigo
            ]
          : const [
              Color(0xFF38BDF8), // Light Cyan
              Color(0xFF00C2FF), // Cyan
              Color(0xFF818CF8), // Periwinkle
              Color(0xFFA855F7), // Purple
              Color(0xFFC084FC), // Violet
              Color(0xFFE879F9), // Magenta
              Color(0xFF7E22CE), // Deep violet
            ],
      stops: const [0.0, 0.2, 0.4, 0.6, 0.75, 0.88, 1.0],
    ).createShader(rect);

    final paint = Paint()
      ..shader = gradient
      ..style = PaintingStyle.stroke
      ..strokeWidth = isLight ? 1.5 : 1.35
      ..strokeCap = StrokeCap.round;

    for (int i = 1; i <= numRings; i++) {
      final ringFraction = i / numRings;
      final baseRadius = maxRadius * ringFraction;
      final ringAlpha = (0.28 + 0.72 * ringFraction).clamp(0.0, 1.0);
      paint.color = (isLight ? const Color(0xFF0066FF) : Colors.white)
          .withValues(alpha: isLight ? ringAlpha * 0.9 : ringAlpha);

      final path = Path();
      const int steps = 90;
      final phaseOffset = (i * 0.28) + (progress * 2 * math.pi);

      for (int s = 0; s <= steps; s++) {
        final theta = (s / steps) * 2 * math.pi;

        // Multi-frequency harmonic perturbation for organic topographical waves
        final w1 = math.sin(theta * 3 + phaseOffset) * (6.0 * ringFraction);
        final w2 = math.cos(theta * 5 - phaseOffset * 0.6) * (3.5 * ringFraction);
        final w3 = math.sin(theta * 2 + (i * 0.3)) * (5.0 * ringFraction);

        final r = (baseRadius + w1 + w2 + w3).clamp(4.0, maxRadius * 1.05);
        final x = cx + r * math.cos(theta);
        final y = cy + r * math.sin(theta);

        if (s == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }

      // Draw path with dashed effect
      _drawDashedPath(canvas, path, paint, dashLength: 3.5, gapLength: 3.5);
    }
  }

  void _drawDashedPath(
    Canvas canvas,
    Path source,
    Paint paint, {
    required double dashLength,
    required double gapLength,
  }) {
    for (final metric in source.computeMetrics()) {
      double distance = 0.0;
      while (distance < metric.length) {
        final length = math.min(dashLength, metric.length - distance);
        final extractPath = metric.extractPath(distance, distance + length);
        canvas.drawPath(extractPath, paint);
        distance += dashLength + gapLength;
      }
    }
  }

  @override
  bool shouldRepaint(covariant GenerativeOrbPainter oldDelegate) =>
      oldDelegate.progress != progress;
}

/// Voice waveform listening mode centerpiece matching Image 3
class VoiceVisualizerWidget extends StatefulWidget {
  final double size;

  const VoiceVisualizerWidget({super.key, this.size = 250});

  @override
  State<VoiceVisualizerWidget> createState() => _VoiceVisualizerWidgetState();
}

class _VoiceVisualizerWidgetState extends State<VoiceVisualizerWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animController,
      builder: (context, child) {
        return CustomPaint(
          size: Size(widget.size, widget.size),
          painter: VoiceVisualizerPainter(progress: _animController.value),
        );
      },
    );
  }
}

class VoiceVisualizerPainter extends CustomPainter {
  final double progress;

  VoiceVisualizerPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final maxR = size.width / 2;

    // 1. Concentric outer glowing ripple rings (Image 3)
    final ringPaints = [
      Paint()
        ..color = const Color(0xFF1E3A8A).withValues(alpha: 0.3)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0,
      Paint()
        ..color = const Color(0xFF4338CA).withValues(alpha: 0.4)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2,
      Paint()
        ..color = const Color(0xFF7C3AED).withValues(alpha: 0.45)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2,
    ];

    final double pulse = math.sin(progress * 2 * math.pi) * 4;

    canvas.drawCircle(Offset(cx, cy), maxR * 0.95 + pulse, ringPaints[0]);
    canvas.drawCircle(Offset(cx, cy), maxR * 0.82 - pulse * 0.5, ringPaints[1]);
    canvas.drawCircle(Offset(cx, cy), maxR * 0.68 + pulse * 0.8, ringPaints[2]);

    // Dashed subtle ring
    final dashedPaint = Paint()
      ..color = const Color(0xFF6366F1).withValues(alpha: 0.35)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    _drawDashedCircle(canvas, Offset(cx, cy), maxR * 0.75, dashedPaint);

    // 2. Central dark glowing disc
    final discRadius = maxR * 0.48;
    final discGradient = const RadialGradient(
      colors: [
        Color(0xFF2E1065), // Rich violet
        Color(0xFF1E1B4B), // Deep navy
        Color(0xFF0F172A), // Dark base
      ],
      stops: [0.0, 0.6, 1.0],
    ).createShader(Rect.fromCircle(center: Offset(cx, cy), radius: discRadius));

    final discPaint = Paint()
      ..shader = discGradient
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx, cy), discRadius, discPaint);

    // Subtle disc rim border
    final rimPaint = Paint()
      ..color = const Color(0xFFA855F7).withValues(alpha: 0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    canvas.drawCircle(Offset(cx, cy), discRadius, rimPaint);

    // 3. Central Audio Equalizer Bars (7 bars)
    const int barCount = 7;
    const double barWidth = 4.5;
    const double spacing = 6.0;
    const double totalW = (barCount * barWidth) + ((barCount - 1) * spacing);
    final startX = cx - (totalW / 2) + (barWidth / 2);

    final baseHeights = [14.0, 22.0, 36.0, 42.0, 34.0, 20.0, 12.0];

    for (int i = 0; i < barCount; i++) {
      final x = startX + i * (barWidth + spacing);
      final phase = progress * 2 * math.pi + (i * 0.8);
      final heightMultiplier = 0.65 + 0.35 * math.sin(phase);
      final h = baseHeights[i] * heightMultiplier;

      final barRect = RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(x, cy), width: barWidth, height: h),
        const Radius.circular(2.5),
      );

      final barGradient = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          Color(0xFFE879F9), // Light Pink/Magenta
          Color(0xFFA855F7), // Purple
          Color(0xFF818CF8), // Violet
        ],
      ).createShader(barRect.outerRect);

      final barPaint = Paint()
        ..shader = barGradient
        ..style = PaintingStyle.fill;

      canvas.drawRRect(barRect, barPaint);
    }
  }

  void _drawDashedCircle(Canvas canvas, Offset center, double radius, Paint paint) {
    const int dashes = 36;
    final dTheta = (2 * math.pi) / dashes;
    for (int i = 0; i < dashes; i += 2) {
      final theta1 = i * dTheta;
      final theta2 = (i + 1) * dTheta;
      final path = Path()
        ..addArc(
          Rect.fromCircle(center: center, radius: radius),
          theta1,
          theta2 - theta1,
        );
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant VoiceVisualizerPainter oldDelegate) =>
      oldDelegate.progress != progress;
}

/// Circular Bot Avatar icon matching Image 2 ("F" cyan badge)
class BotAvatarIcon extends StatelessWidget {
  final double size;
  final bool? isLight;

  const BotAvatarIcon({super.key, this.size = 32, this.isLight});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, globalIsLight, _) {
        final light = isLight ?? globalIsLight;
        return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: light ? const Color(0xFFE0F2FE) : const Color(0xFF0F2B3E),
            shape: BoxShape.circle,
            border: Border.all(
              color: light
                  ? const Color(0xFF0284C7).withValues(alpha: 0.5)
                  : const Color(0xFF00C2FF).withValues(alpha: 0.5),
              width: 1.0,
            ),
          ),
          child: Center(
            child: Text(
              'F',
              style: TextStyle(
                color: light ? const Color(0xFF0284C7) : const Color(0xFF00C2FF),
                fontSize: size * 0.55,
                fontWeight: FontWeight.w900,
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        );
      },
    );
  }
}
