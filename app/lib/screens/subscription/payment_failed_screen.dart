import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../widgets/animated_back_arrow.dart';

class PaymentFailedScreen extends StatelessWidget {
  final String? errorMessage;
  final VoidCallback? onTryAgain;
  final VoidCallback? onBack;

  const PaymentFailedScreen({
    super.key,
    this.errorMessage,
    this.onTryAgain,
    this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Scaffold(
          backgroundColor: isLight ? AppTheme.scaffoldBg : Colors.black,
          body: Container(
            decoration: BoxDecoration(
              color: isLight ? AppTheme.scaffoldBg : Colors.black,
              gradient: isLight
                  ? AppTheme.bgGradient
                  : const LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color(0xFF080C16),
                        Color(0xFF030508),
                        Colors.black,
                      ],
                      stops: [0.0, 0.4, 1.0],
                    ),
            ),
            child: SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(minHeight: constraints.maxHeight),
                      child: IntrinsicHeight(
                        child: Column(
                          children: [
                            // Top Bar with back button
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        AnimatedBackArrowButton(onTap: () {
                            if (onBack != null) {
                              onBack!();
                            } else {
                              Navigator.of(context).pop();
                            }
                          }),
                      ],
                    ),
                  ),

                  const Spacer(flex: 3),

                  // Center: Red Scalloped Badge with Black 'X'
                  Center(
                    child: Container(
                      width: 104,
                      height: 104,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: isLight
                                ? const Color(0x33FF0019)
                                : const Color(0x59FF0019),
                            blurRadius: 36,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: const CustomPaint(
                        size: Size(104, 104),
                        painter: _ScallopedBadgePainter(
                          color: Color(0xFFFF0019),
                          scallopCount: 16,
                          innerRadius: 38.0,
                          outerRadius: 49.0,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),

                  // Headline: "Your payment has failed!"
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Text(
                      'Your payment has failed!',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Subtitle
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Text(
                      'If amount was deducted from your selected\npayment method, refund will be processed\nwithin 24 hours',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E95A3),
                        fontSize: 14,
                        height: 1.45,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),

                  if (errorMessage != null && errorMessage!.trim().isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Text(
                        'Reason: ${errorMessage!}',
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          fontSize: 12,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                  ],

                  const Spacer(flex: 4),

                  // Bottom Button: "Try Again"
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                    child: SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: ElevatedButton(
                        onPressed: () {
                          if (onTryAgain != null) {
                            onTryAgain!();
                          } else {
                            Navigator.of(context).pop();
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFF0019),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shadowColor: Colors.transparent,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(28),
                          ),
                        ),
                        child: const Text(
                          'Try Again',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                    ),
                  ),
                          ],
                        ),
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

/// Custom painter for the scalloped rosette badge with black 'X'
class _ScallopedBadgePainter extends CustomPainter {
  final Color color;
  final int scallopCount;
  final double innerRadius;
  final double outerRadius;

  const _ScallopedBadgePainter({
    required this.color,
    required this.scallopCount,
    required this.innerRadius,
    required this.outerRadius,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final fillPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill
      ..isAntiAlias = true;

    final path = Path();
    final double step = (2 * math.pi) / scallopCount;

    for (int i = 0; i < scallopCount; i++) {
      final double theta = i * step;
      final double thetaPrev = theta - step / 2;
      final double thetaNext = theta + step / 2;

      final v1 = Offset(
        center.dx + innerRadius * math.cos(thetaPrev),
        center.dy + innerRadius * math.sin(thetaPrev),
      );
      final tip = Offset(
        center.dx + outerRadius * math.cos(theta),
        center.dy + outerRadius * math.sin(theta),
      );
      final v2 = Offset(
        center.dx + innerRadius * math.cos(thetaNext),
        center.dy + innerRadius * math.sin(thetaNext),
      );

      final c1 = Offset(
        v1.dx + (tip.dx - v1.dx) * 0.65,
        v1.dy + (tip.dy - v1.dy) * 0.65,
      );
      final c2 = Offset(
        v2.dx + (tip.dx - v2.dx) * 0.65,
        v2.dy + (tip.dy - v2.dy) * 0.65,
      );

      if (i == 0) {
        path.moveTo(v1.dx, v1.dy);
      }
      path.cubicTo(c1.dx, c1.dy, c2.dx, c2.dy, v2.dx, v2.dy);
    }
    path.close();

    canvas.drawPath(path, fillPaint);

    // Draw the bold black 'X'
    final xPaint = Paint()
      ..color = Colors.black
      ..strokeWidth = 6.2
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke
      ..isAntiAlias = true;

    const double xRadius = 13.0;
    // Diagonal 1: top-left to bottom-right
    canvas.drawLine(
      Offset(center.dx - xRadius, center.dy - xRadius),
      Offset(center.dx + xRadius, center.dy + xRadius),
      xPaint,
    );
    // Diagonal 2: top-right to bottom-left
    canvas.drawLine(
      Offset(center.dx + xRadius, center.dy - xRadius),
      Offset(center.dx - xRadius, center.dy + xRadius),
      xPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _ScallopedBadgePainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.scallopCount != scallopCount ||
        oldDelegate.innerRadius != innerRadius ||
        oldDelegate.outerRadius != outerRadius;
  }
}
