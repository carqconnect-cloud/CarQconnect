import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Reusable vector painters that render realistic dark-theme navigation maps
/// matching Screenshots 2, 3, 4, and 5.

/// 1. Painter for PlanTripScreen Map Preview (Screenshot 2)
class PlanTripMapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Background fill
    final bgPaint = Paint()..color = const Color(0xFF0A101D);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    // Subtle road grid lines
    final gridPaint = Paint()
      ..color = const Color(0xFF141F30)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    // Grid intersections & street lines
    for (double y = 20; y < size.height; y += 35) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }
    for (double x = 30; x < size.width; x += 45) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }

    // Secondary angled roads (dashed)
    final dashedRoadPaint = Paint()
      ..color = const Color(0xFF1B2A40)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    final dashPath1 = Path()
      ..moveTo(0, size.height * 0.75)
      ..quadraticBezierTo(size.width * 0.35, size.height * 0.5, size.width * 0.8, 0);
    _drawDashedPath(canvas, dashPath1, dashedRoadPaint, 5, 4);

    final dashPath2 = Path()
      ..moveTo(size.width * 0.2, size.height)
      ..lineTo(size.width, size.height * 0.4);
    _drawDashedPath(canvas, dashPath2, dashedRoadPaint, 5, 4);

    // Minor local connector line
    canvas.drawLine(
      Offset(size.width * 0.45, size.height * 0.85),
      Offset(size.width * 0.75, size.height * 0.65),
      gridPaint..strokeWidth = 1.2,
    );

    // Glowing cyan main route path from Indore to Ujjain
    final startPoint = Offset(size.width * 0.18, size.height * 0.76);
    final endPoint = Offset(size.width * 0.72, size.height * 0.38);

    final routePath = Path()
      ..moveTo(startPoint.dx, startPoint.dy)
      ..cubicTo(
        size.width * 0.32,
        size.height * 0.72,
        size.width * 0.50,
        size.height * 0.54,
        endPoint.dx,
        endPoint.dy,
      );

    // Outer glow for route
    final glowPaint = Paint()
      ..color = const Color(0xFF00C2FF).withValues(alpha: 0.35)
      ..strokeWidth = 9.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);
    canvas.drawPath(routePath, glowPaint);

    // Core bright cyan route line
    final coreRoutePaint = Paint()
      ..color = const Color(0xFF00E5FF)
      ..strokeWidth = 3.5
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    canvas.drawPath(routePath, coreRoutePaint);

    // Start Marker (Indore - Green Dot)
    final startHalo = Paint()
      ..color = const Color(0xFF00E676).withValues(alpha: 0.3)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(startPoint, 8, startHalo);

    final startDot = Paint()..color = const Color(0xFF00E676);
    canvas.drawCircle(startPoint, 4.5, startDot);

    // End Marker (Ujjain - Red Pin)
    final endHalo = Paint()
      ..color = const Color(0xFFFF5252).withValues(alpha: 0.35)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(endPoint, 8, endHalo);

    final endDot = Paint()..color = const Color(0xFFFF5252);
    canvas.drawCircle(endPoint, 4.5, endDot);
  }

  void _drawDashedPath(
    Canvas canvas,
    Path path,
    Paint paint,
    double dashWidth,
    double dashSpace,
  ) {
    for (final metric in path.computeMetrics()) {
      double distance = 0.0;
      while (distance < metric.length) {
        final length = math.min(dashWidth, metric.length - distance);
        canvas.drawPath(metric.extractPath(distance, distance + length), paint);
        distance += dashWidth + dashSpace;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 2. Painter for Route Options Mini Maps (Screenshot 3)
class RouteOptionMiniMapPainter extends CustomPainter {
  final bool isSelected;
  final bool isSecondary;

  const RouteOptionMiniMapPainter({
    this.isSelected = false,
    this.isSecondary = false,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Subtle background
    final bgPaint = Paint()..color = const Color(0xFF0A101A);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, 0, size.width, size.height),
        const Radius.circular(12),
      ),
      bgPaint,
    );

    // Background road lines
    final roadPaint = Paint()
      ..color = const Color(0xFF141F2D)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    canvas.drawLine(
      Offset(size.width * 0.1, size.height * 0.8),
      Offset(size.width * 0.9, size.height * 0.2),
      roadPaint,
    );
    canvas.drawLine(
      Offset(size.width * 0.3, size.height),
      Offset(size.width * 0.5, 0),
      roadPaint,
    );

    final startPoint = Offset(size.width * 0.15, size.height * 0.68);
    final endPoint = Offset(size.width * 0.82, size.height * 0.32);

    final path = Path()
      ..moveTo(startPoint.dx, startPoint.dy)
      ..cubicTo(
        size.width * 0.35,
        size.height * (isSelected ? 0.82 : 0.65),
        size.width * 0.55,
        size.height * (isSelected ? 0.38 : 0.50),
        endPoint.dx,
        endPoint.dy,
      );

    if (isSelected) {
      // Glowing Cyan Route
      final glowPaint = Paint()
        ..color = const Color(0xFF00C2FF).withValues(alpha: 0.4)
        ..strokeWidth = 8.0
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5);
      canvas.drawPath(path, glowPaint);

      final corePaint = Paint()
        ..color = const Color(0xFF00E5FF)
        ..strokeWidth = 3.0
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke;
      canvas.drawPath(path, corePaint);

      // Start Cyan dot
      canvas.drawCircle(startPoint, 5, Paint()..color = const Color(0xFF00C2FF));
      canvas.drawCircle(startPoint, 2.5, Paint()..color = Colors.white);

      // End Red dot
      canvas.drawCircle(endPoint, 5, Paint()..color = const Color(0xFFFF5252));
      canvas.drawCircle(endPoint, 2.5, Paint()..color = Colors.white);
    } else {
      // Muted route line for secondary choices
      final secondaryPaint = Paint()
        ..color = const Color(0xFF334B68)
        ..strokeWidth = 2.0
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke;
      canvas.drawPath(path, secondaryPaint);

      // Small dots
      canvas.drawCircle(startPoint, 4, Paint()..color = const Color(0xFF6B7C91));
      canvas.drawCircle(endPoint, 4, Paint()..color = const Color(0xFFFF5252));
    }
  }

  @override
  bool shouldRepaint(covariant RouteOptionMiniMapPainter oldDelegate) {
    return oldDelegate.isSelected != isSelected;
  }
}

/// 3. Painter for Trip Overview Map (Screenshot 4)
class TripOverviewMapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Dark Map Background
    final bgPaint = Paint()..color = const Color(0xFF0A111E);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    // Subtle road grid
    final gridPaint = Paint()
      ..color = const Color(0xFF142032)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    // Major crossing roads
    canvas.drawLine(
      Offset(0, size.height * 0.35),
      Offset(size.width, size.height * 0.25),
      gridPaint..strokeWidth = 1.5,
    );
    canvas.drawLine(
      Offset(size.width * 0.15, size.height),
      Offset(size.width * 0.9, 0),
      gridPaint..strokeWidth = 1.2,
    );
    canvas.drawLine(
      Offset(0, size.height * 0.8),
      Offset(size.width * 0.7, size.height * 0.1),
      gridPaint,
    );

    // Secondary dashed connection
    final dashPaint = Paint()
      ..color = const Color(0xFF1E2E44)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    final dashPath = Path()
      ..moveTo(size.width * 0.2, size.height * 0.8)
      ..cubicTo(
        size.width * 0.45,
        size.height * 0.6,
        size.width * 0.6,
        size.height * 0.35,
        size.width * 0.85,
        size.height * 0.2,
      );
    _drawDashedPath(canvas, dashPath, dashPaint, 5, 4);

    // Primary Glowing Cyan Route from Indore to Ujjain
    final startPoint = Offset(size.width * 0.16, size.height * 0.82);
    final fuelPoint = Offset(size.width * 0.44, size.height * 0.62);
    final foodPoint = Offset(size.width * 0.61, size.height * 0.48);
    final endPoint = Offset(size.width * 0.76, size.height * 0.24);

    final routePath = Path()
      ..moveTo(startPoint.dx, startPoint.dy)
      ..cubicTo(
        size.width * 0.26,
        size.height * 0.78,
        size.width * 0.42,
        size.height * 0.64,
        fuelPoint.dx,
        fuelPoint.dy,
      )
      ..cubicTo(
        size.width * 0.48,
        size.height * 0.58,
        size.width * 0.55,
        size.height * 0.52,
        foodPoint.dx,
        foodPoint.dy,
      )
      ..cubicTo(
        size.width * 0.66,
        size.height * 0.42,
        size.width * 0.72,
        size.height * 0.32,
        endPoint.dx,
        endPoint.dy,
      );

    // Glowing cyan line
    final glowPaint = Paint()
      ..color = const Color(0xFF00C2FF).withValues(alpha: 0.4)
      ..strokeWidth = 10.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 7);
    canvas.drawPath(routePath, glowPaint);

    final corePaint = Paint()
      ..color = const Color(0xFF00E5FF)
      ..strokeWidth = 4.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    canvas.drawPath(routePath, corePaint);

    // Start Point (Indore) Cyan Halo Marker
    canvas.drawCircle(
      startPoint,
      14,
      Paint()..color = const Color(0xFF00C2FF).withValues(alpha: 0.25),
    );
    canvas.drawCircle(
      startPoint,
      7,
      Paint()..color = const Color(0xFF00E5FF),
    );
    canvas.drawCircle(
      startPoint,
      3.5,
      Paint()..color = Colors.white,
    );

    // Intermediate Stop: Fuel Station (Green Circle Badge)
    canvas.drawCircle(
      fuelPoint + const Offset(-4, -14),
      12,
      Paint()..color = const Color(0xFF0D251C),
    );
    canvas.drawCircle(
      fuelPoint + const Offset(-4, -14),
      12,
      Paint()
        ..color = const Color(0xFF00E676)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2,
    );

    // Intermediate Stop: Food (Yellow Circle Badge)
    canvas.drawCircle(
      foodPoint + const Offset(4, -14),
      12,
      Paint()..color = const Color(0xFF282210),
    );
    canvas.drawCircle(
      foodPoint + const Offset(4, -14),
      12,
      Paint()
        ..color = const Color(0xFFFFD600)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2,
    );

    // Destination Pin (Ujjain - Orange Ring + Mint Dot)
    final ujjainCenter = endPoint + const Offset(4, -12);
    canvas.drawCircle(
      ujjainCenter,
      13,
      Paint()..color = const Color(0xFFFF6D00).withValues(alpha: 0.2),
    );
    canvas.drawCircle(
      ujjainCenter,
      9,
      Paint()..color = const Color(0xFFFF6D00),
    );
    canvas.drawCircle(
      ujjainCenter,
      4,
      Paint()..color = Colors.white,
    );

    // Mint companion dot near destination (Screenshot 4)
    canvas.drawCircle(
      ujjainCenter + const Offset(16, 8),
      7,
      Paint()..color = const Color(0xFF00E5B0),
    );
    canvas.drawCircle(
      ujjainCenter + const Offset(16, 8),
      3,
      Paint()..color = Colors.black,
    );
  }

  void _drawDashedPath(
    Canvas canvas,
    Path path,
    Paint paint,
    double dashWidth,
    double dashSpace,
  ) {
    for (final metric in path.computeMetrics()) {
      double distance = 0.0;
      while (distance < metric.length) {
        final length = math.min(dashWidth, metric.length - distance);
        canvas.drawPath(metric.extractPath(distance, distance + length), paint);
        distance += dashWidth + dashSpace;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 4. Painter for Active Navigation Map (Screenshot 5)
class ActiveNavigationMapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Navigation Dark Map Background
    final bgPaint = Paint()..color = const Color(0xFF070D18);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    // Secondary streets & road grid
    final streetPaint = Paint()
      ..color = const Color(0xFF131D2D)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;

    // Crossing road lines
    canvas.drawLine(
      Offset(0, size.height * 0.18),
      Offset(size.width, size.height * 0.12),
      streetPaint..strokeWidth = 3.0,
    );
    canvas.drawLine(
      Offset(0, size.height * 0.42),
      Offset(size.width, size.height * 0.38),
      streetPaint..strokeWidth = 3.5,
    );
    canvas.drawLine(
      Offset(0, size.height * 0.62),
      Offset(size.width, size.height * 0.58),
      streetPaint..strokeWidth = 2.0,
    );

    // Diagonal crossing highways
    canvas.drawLine(
      Offset(size.width * 0.15, 0),
      Offset(size.width * 0.28, size.height),
      streetPaint..strokeWidth = 2.5,
    );
    canvas.drawLine(
      Offset(size.width * 0.85, 0),
      Offset(size.width * 0.68, size.height),
      streetPaint..strokeWidth = 2.5,
    );

    // Active Navigation Route running vertically with curve
    final routePath = Path()
      ..moveTo(size.width * 0.5, size.height)
      ..lineTo(size.width * 0.5, size.height * 0.52)
      ..cubicTo(
        size.width * 0.5,
        size.height * 0.44,
        size.width * 0.62,
        size.height * 0.34,
        size.width * 0.62,
        size.height * 0.22,
      );

    // Glowing cyan highway trace
    final glowPaint = Paint()
      ..color = const Color(0xFF00C2FF).withValues(alpha: 0.5)
      ..strokeWidth = 14.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10);
    canvas.drawPath(routePath, glowPaint);

    final coreRoutePaint = Paint()
      ..color = const Color(0xFF00E5FF)
      ..strokeWidth = 5.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    canvas.drawPath(routePath, coreRoutePaint);

    // Waypoint dot along route
    final waypoint = Offset(size.width * 0.5, size.height * 0.44);
    canvas.drawCircle(
      waypoint,
      4.0,
      Paint()..color = const Color(0xFF00E5FF),
    );

    // Navigation Puck Location (Indore / current vehicle position)
    final puckCenter = Offset(size.width * 0.5, size.height * 0.52);

    // Radar pulse rings
    canvas.drawCircle(
      puckCenter,
      32,
      Paint()
        ..color = const Color(0xFF00C2FF).withValues(alpha: 0.18)
        ..style = PaintingStyle.fill,
    );
    canvas.drawCircle(
      puckCenter,
      24,
      Paint()
        ..color = const Color(0xFF00C2FF).withValues(alpha: 0.32)
        ..style = PaintingStyle.fill,
    );

    // Solid core circle
    canvas.drawCircle(
      puckCenter,
      18,
      Paint()..color = const Color(0xFF00C2FF),
    );

    // Inner White Direction Arrow (pointing forward/up)
    final arrowPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    final arrowPath = Path()
      ..moveTo(puckCenter.dx, puckCenter.dy - 9)
      ..lineTo(puckCenter.dx + 6.5, puckCenter.dy + 7)
      ..lineTo(puckCenter.dx, puckCenter.dy + 3.5)
      ..lineTo(puckCenter.dx - 6.5, puckCenter.dy + 7)
      ..close();

    canvas.drawPath(arrowPath, arrowPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 5. Painter for Folded 3D Map Illustration in "No Active Trip" (Image 3)
class FoldedMapIllustrationPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // Soft Ambient Floating Dots
    final dotPaint = Paint()
      ..color = const Color(0xFF6B7C91).withValues(alpha: 0.25)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx - 95, cy - 40), 3.5, dotPaint);
    canvas.drawCircle(Offset(cx - 110, cy + 10), 4.0, dotPaint);
    canvas.drawCircle(Offset(cx + 90, cy + 20), 4.5, dotPaint);

    // Drop Shadow under the folded map
    final shadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.45)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 16);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(cx, cy + 50),
        width: 170,
        height: 36,
      ),
      shadowPaint,
    );

    // 3 Folded Map Panels
    // Coordinates relative to center
    // Left fold
    final leftPath = Path()
      ..moveTo(cx - 80, cy - 10)
      ..lineTo(cx - 25, cy - 35)
      ..lineTo(cx - 25, cy + 45)
      ..lineTo(cx - 80, cy + 65)
      ..close();

    final leftGrad = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: const [Color(0xFF2C4362), Color(0xFF142438)],
    );
    canvas.drawPath(
      leftPath,
      Paint()
        ..shader = leftGrad.createShader(leftPath.getBounds())
        ..style = PaintingStyle.fill,
    );

    // Center fold
    final centerPath = Path()
      ..moveTo(cx - 25, cy - 35)
      ..lineTo(cx + 30, cy - 15)
      ..lineTo(cx + 30, cy + 65)
      ..lineTo(cx - 25, cy + 45)
      ..close();

    final centerGrad = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: const [Color(0xFF3B567C), Color(0xFF1F3249)],
    );
    canvas.drawPath(
      centerPath,
      Paint()
        ..shader = centerGrad.createShader(centerPath.getBounds())
        ..style = PaintingStyle.fill,
    );

    // Right fold
    final rightPath = Path()
      ..moveTo(cx + 30, cy - 15)
      ..lineTo(cx + 80, cy - 30)
      ..lineTo(cx + 80, cy + 50)
      ..lineTo(cx + 30, cy + 65)
      ..close();

    final rightGrad = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: const [Color(0xFF2C4362), Color(0xFF16253A)],
    );
    canvas.drawPath(
      rightPath,
      Paint()
        ..shader = rightGrad.createShader(rightPath.getBounds())
        ..style = PaintingStyle.fill,
    );

    // Fold edges / creases
    final creasePaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.12)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;
    canvas.drawLine(Offset(cx - 25, cy - 35), Offset(cx - 25, cy + 45), creasePaint);
    canvas.drawLine(Offset(cx + 30, cy - 15), Offset(cx + 30, cy + 65), creasePaint);

    // Shadow of Pin on center fold
    final pinShadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.5)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(cx + 2, cy + 18),
        width: 26,
        height: 10,
      ),
      pinShadowPaint,
    );

    // Floating 3D Pin
    final pinCenter = Offset(cx + 2, cy - 30);
    final pinRadius = 26.0;

    // Pin teardrop shape
    final pinPath = Path();
    pinPath.moveTo(pinCenter.dx, pinCenter.dy + 34); // Tip
    pinPath.cubicTo(
      pinCenter.dx - 12,
      pinCenter.dy + 14,
      pinCenter.dx - pinRadius,
      pinCenter.dy + 8,
      pinCenter.dx - pinRadius,
      pinCenter.dy - 6,
    );
    pinPath.arcToPoint(
      Offset(pinCenter.dx + pinRadius, pinCenter.dy - 6),
      radius: Radius.circular(pinRadius),
      clockwise: true,
    );
    pinPath.cubicTo(
      pinCenter.dx + pinRadius,
      pinCenter.dy + 8,
      pinCenter.dx + 12,
      pinCenter.dy + 14,
      pinCenter.dx,
      pinCenter.dy + 34,
    );
    pinPath.close();

    // Pin gradient (Light cyan / white gradient)
    final pinGrad = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: const [
        Color(0xFFE8F7FF),
        Color(0xFFB3E5FC),
        Color(0xFF81D4FA),
      ],
    );

    // Pin drop shadow
    canvas.drawPath(
      pinPath,
      Paint()
        ..color = Colors.black.withValues(alpha: 0.35)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10),
    );

    // Pin fill
    canvas.drawPath(
      pinPath,
      Paint()
        ..shader = pinGrad.createShader(pinPath.getBounds())
        ..style = PaintingStyle.fill,
    );

    // Inner Bullseye Circle on Pin
    final innerCenter = Offset(pinCenter.dx, pinCenter.dy - 6);
    canvas.drawCircle(
      innerCenter,
      10,
      Paint()
        ..color = const Color(0xFF0F1A28)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5,
    );
    canvas.drawCircle(
      innerCenter,
      3.5,
      Paint()
        ..color = const Color(0xFF0F1A28)
        ..style = PaintingStyle.fill,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

