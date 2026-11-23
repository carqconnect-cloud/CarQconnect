import 'package:flutter/material.dart';

class GeofenceItem {
  final String id;
  final String name;
  final String address;
  final double radiusMeters;
  bool isEnabled;
  final IconData icon;

  GeofenceItem({
    required this.id,
    required this.name,
    required this.address,
    required this.radiusMeters,
    this.isEnabled = true,
    this.icon = Icons.location_on_outlined,
  });

  String get radiusFormatted {
    if (radiusMeters >= 1000) {
      final km = radiusMeters / 1000;
      return '${km.toStringAsFixed(km.truncateToDouble() == km ? 0 : 1)} km';
    }
    return '${radiusMeters.toInt()} m';
  }
}

/// Custom top-view modern car widget for map and slider
class TopViewCarWidget extends StatelessWidget {
  final double width;
  final double height;
  final bool showGlow;

  const TopViewCarWidget({
    super.key,
    this.width = 30,
    this.height = 54,
    this.showGlow = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        boxShadow: showGlow
            ? [
                BoxShadow(
                  color: const Color(0xFF00C2FF).withValues(alpha: 0.5),
                  blurRadius: 16,
                  spreadRadius: 2,
                ),
              ]
            : null,
      ),
      child: CustomPaint(
        size: Size(width, height),
        painter: _TopViewCarPainter(),
      ),
    );
  }
}

class _TopViewCarPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Body Paint (White luxury car body)
    final bodyPaint = Paint()
      ..color = const Color(0xFFF1F5F9)
      ..style = PaintingStyle.fill;

    // Shadow Paint
    final shadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.35)
      ..style = PaintingStyle.fill;

    // Outer Body Path
    final bodyRect = RRect.fromRectAndCorners(
      Rect.fromLTWH(w * 0.12, h * 0.08, w * 0.76, h * 0.84),
      topLeft: Radius.circular(w * 0.36),
      topRight: Radius.circular(w * 0.36),
      bottomLeft: Radius.circular(w * 0.28),
      bottomRight: Radius.circular(w * 0.28),
    );

    // Subtle dark undercarriage / wheels
    final wheelPaint = Paint()..color = const Color(0xFF0F172A);
    // Front Wheels
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.05, h * 0.2, w * 0.12, h * 0.18),
        const Radius.circular(2),
      ),
      wheelPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.83, h * 0.2, w * 0.12, h * 0.18),
        const Radius.circular(2),
      ),
      wheelPaint,
    );
    // Rear Wheels
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.05, h * 0.62, w * 0.12, h * 0.18),
        const Radius.circular(2),
      ),
      wheelPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.83, h * 0.62, w * 0.12, h * 0.18),
        const Radius.circular(2),
      ),
      wheelPaint,
    );

    // Draw Main Body
    canvas.drawRRect(bodyRect, shadowPaint);
    canvas.drawRRect(bodyRect, bodyPaint);

    // Windshield (front dark glass)
    final glassPaint = Paint()
      ..color = const Color(0xFF0F172A)
      ..style = PaintingStyle.fill;

    final windshieldRect = RRect.fromRectAndCorners(
      Rect.fromLTWH(w * 0.22, h * 0.26, w * 0.56, h * 0.14),
      topLeft: Radius.circular(w * 0.2),
      topRight: Radius.circular(w * 0.2),
      bottomLeft: const Radius.circular(4),
      bottomRight: const Radius.circular(4),
    );
    canvas.drawRRect(windshieldRect, glassPaint);

    // Sunroof / Roof
    final roofPaint = Paint()
      ..color = const Color(0xFFCBD5E1)
      ..style = PaintingStyle.fill;
    final roofRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.24, h * 0.42, w * 0.52, h * 0.24),
      const Radius.circular(4),
    );
    canvas.drawRRect(roofRect, roofPaint);

    // Sunroof glass
    final sunroofPaint = Paint()..color = const Color(0xFF1E293B);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.28, h * 0.44, w * 0.44, h * 0.18),
        const Radius.circular(3),
      ),
      sunroofPaint,
    );

    // Rear Windshield
    final rearGlassRect = RRect.fromRectAndCorners(
      Rect.fromLTWH(w * 0.24, h * 0.68, w * 0.52, h * 0.1),
      topLeft: const Radius.circular(3),
      topRight: const Radius.circular(3),
      bottomLeft: Radius.circular(w * 0.16),
      bottomRight: Radius.circular(w * 0.16),
    );
    canvas.drawRRect(rearGlassRect, glassPaint);

    // Headlights (cyan glow tints)
    final headLightPaint = Paint()..color = const Color(0xFF00C2FF);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.2, h * 0.08, w * 0.14, h * 0.04),
        const Radius.circular(2),
      ),
      headLightPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.66, h * 0.08, w * 0.14, h * 0.04),
        const Radius.circular(2),
      ),
      headLightPaint,
    );

    // Tail lights (red)
    final tailLightPaint = Paint()..color = const Color(0xFFEF4444);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.2, h * 0.88, w * 0.16, h * 0.035),
        const Radius.circular(2),
      ),
      tailLightPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.64, h * 0.88, w * 0.16, h * 0.035),
        const Radius.circular(2),
      ),
      tailLightPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Realistic vector map painter matching screenshots with light/dark support
class DarkMapPainter extends CustomPainter {
  final bool showGeofence;
  final double geofenceRadius;
  final Offset? centerOffset;
  final bool isInteractive;
  final bool isLight;

  const DarkMapPainter({
    this.showGeofence = false,
    this.geofenceRadius = 90.0,
    this.centerOffset,
    this.isInteractive = false,
    this.isLight = false,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // 1. Background
    final bgPaint = Paint()..color = isLight ? const Color(0xFFE2E8F0) : const Color(0xFF0D1726);
    canvas.drawRect(Rect.fromLTWH(0, 0, w, h), bgPaint);

    // 2. City Blocks (slightly darker/lighter patches)
    final blockPaint = Paint()
      ..color = isLight ? const Color(0xFFCBD5E1) : const Color(0xFF111E30)
      ..style = PaintingStyle.fill;

    final blockGreen = Paint()
      ..color = isLight
          ? const Color(0xFFDCFCE7)
          : const Color(0xFF0F2B36).withValues(alpha: 0.6)
      ..style = PaintingStyle.fill;

    // City blocks
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.1, h * 0.1, w * 0.22, h * 0.14),
        const Radius.circular(4),
      ),
      blockPaint,
    );

    // Sector R block
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.35, h * 0.16, w * 0.24, h * 0.12),
        const Radius.circular(4),
      ),
      blockGreen,
    );

    // 3. Roads & Highways
    final secondaryRoadPaint = Paint()
      ..color = isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1E2E48)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;

    final mainRoadPaint = Paint()
      ..color = isLight ? Colors.white : const Color(0xFF263B5C)
      ..strokeWidth = 4.5
      ..style = PaintingStyle.stroke;

    final majorArterialPaint = Paint()
      ..color = isLight ? const Color(0xFFFEF3C7) : const Color(0xFF334E78)
      ..strokeWidth = 7.0
      ..style = PaintingStyle.stroke;

    // Vertical & Angled Grid Streets
    for (double i = -50; i < w + 80; i += 45) {
      canvas.drawLine(
        Offset(i, 0),
        Offset(i + 30, h),
        secondaryRoadPaint,
      );
    }

    // Horizontal & Cross Streets
    for (double j = -30; j < h + 80; j += 42) {
      canvas.drawLine(
        Offset(0, j),
        Offset(w, j + 20),
        secondaryRoadPaint,
      );
    }

    // Main Arterials (AB Road & Ring Road equivalent)
    final mainPath1 = Path()
      ..moveTo(w * 0.1, 0)
      ..lineTo(w * 0.45, h * 0.5)
      ..lineTo(w * 0.7, h);
    canvas.drawPath(mainPath1, mainRoadPaint);

    final mainPath2 = Path()
      ..moveTo(0, h * 0.44)
      ..lineTo(w * 0.5, h * 0.48)
      ..lineTo(w, h * 0.55);
    canvas.drawPath(mainPath2, majorArterialPaint);

    final crossPath = Path()
      ..moveTo(w * 0.85, 0)
      ..lineTo(w * 0.3, h);
    canvas.drawPath(crossPath, mainRoadPaint);

    // 4. Dotted / Dashed Live Navigation Trail
    final trailPaint = Paint()
      ..color = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF)
      ..strokeWidth = 3.5
      ..style = PaintingStyle.stroke;

    final trailPath = Path()
      ..moveTo(w * 0.45, h * 0.75)
      ..lineTo(w * 0.48, h * 0.48)
      ..lineTo(w * 0.52, h * 0.32);

    _drawDashedPath(canvas, trailPath, trailPaint, 6, 5);

    // 5. Text Labels on Map
    _drawMapText(canvas, 'NORTH\nAVENUE', Offset(w * 0.55, h * 0.11), 10.5, true);
    _drawMapText(canvas, 'SECTOR 4', Offset(w * 0.42, h * 0.20), 8.5, false);
    _drawMapText(canvas, 'Ring Road', Offset(w * 0.25, h * 0.28), 7.5, false);
    _drawMapText(canvas, 'City Center', Offset(w * 0.12, h * 0.32), 9.0, false);
    _drawMapText(canvas, 'Park Avenue', Offset(w * 0.82, h * 0.38), 9.5, false);
    _drawMapText(canvas, 'CENTRAL\nZONE', Offset(w * 0.66, h * 0.50), 9.0, false);
    _drawMapText(canvas, 'MAIN HIGHWAY', Offset(w * 0.52, h * 0.62), 8.0, false);

    // 6. Bus Stop Icons (Small circles with bus glyph)
    _drawBusIcon(canvas, Offset(w * 0.44, h * 0.46));
    _drawBusIcon(canvas, Offset(w * 0.86, h * 0.48));
    _drawBusIcon(canvas, Offset(w * 0.94, h * 0.60));

    // 7. If geofence overlay is active
    if (showGeofence) {
      final center = centerOffset ?? Offset(w * 0.5, h * 0.42);
      final primary = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF);

      // Fill with subtle glow
      final geofenceFill = Paint()
        ..color = primary.withValues(alpha: isLight ? 0.15 : 0.12)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(center, geofenceRadius, geofenceFill);

      // Boundary Line
      final geofenceBorder = Paint()
        ..color = primary
        ..strokeWidth = 2.2
        ..style = PaintingStyle.stroke;
      canvas.drawCircle(center, geofenceRadius, geofenceBorder);

      // 4 Node Handles (Top, Bottom, Left, Right)
      final handleFill = Paint()..color = primary;
      final handleInner = Paint()..color = Colors.white;

      final handlePoints = [
        Offset(center.dx, center.dy - geofenceRadius),
        Offset(center.dx, center.dy + geofenceRadius),
        Offset(center.dx - geofenceRadius, center.dy),
        Offset(center.dx + geofenceRadius, center.dy),
      ];

      for (final p in handlePoints) {
        canvas.drawCircle(p, 6.0, handleFill);
        canvas.drawCircle(p, 3.5, handleInner);
      }
    }
  }

  void _drawMapText(
    Canvas canvas,
    String text,
    Offset offset,
    double fontSize,
    bool isBold,
  ) {
    final textSpan = TextSpan(
      text: text,
      style: TextStyle(
        color: isLight
            ? const Color(0xFF475569).withValues(alpha: 0.85)
            : const Color(0xFF8E9BAE).withValues(alpha: 0.75),
        fontSize: fontSize,
        fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
        letterSpacing: 0.5,
      ),
    );
    final textPainter = TextPainter(
      text: textSpan,
      textAlign: TextAlign.center,
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    textPainter.paint(canvas, offset);
  }

  void _drawBusIcon(Canvas canvas, Offset center) {
    final bg = Paint()..color = isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2B40);
    final border = Paint()
      ..color = isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    canvas.drawCircle(center, 7.0, bg);
    canvas.drawCircle(center, 7.0, border);

    final iconPainter = TextPainter(
      text: const TextSpan(
        text: '🚌',
        style: TextStyle(fontSize: 8),
      ),
      textDirection: TextDirection.ltr,
    );
    iconPainter.layout();
    iconPainter.paint(canvas, Offset(center.dx - 4, center.dy - 5));
  }

  void _drawDashedPath(
    Canvas canvas,
    Path path,
    Paint paint,
    double dashWidth,
    double dashSpace,
  ) {
    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      var draw = true;
      while (distance < metric.length) {
        final length = draw ? dashWidth : dashSpace;
        if (distance + length > metric.length) {
          if (draw) {
            canvas.drawPath(
              metric.extractPath(distance, metric.length),
              paint,
            );
          }
          break;
        }
        if (draw) {
          canvas.drawPath(
            metric.extractPath(distance, distance + length),
            paint,
          );
        }
        distance += length;
        draw = !draw;
      }
    }
  }

  @override
  bool shouldRepaint(covariant DarkMapPainter oldDelegate) {
    return oldDelegate.showGeofence != showGeofence ||
        oldDelegate.geofenceRadius != geofenceRadius ||
        oldDelegate.centerOffset != centerOffset ||
        oldDelegate.isLight != isLight;
  }
}

/// Custom 3D Isometric Hologram Illustration for Empty Geofence state
class GeofenceHologramPainter extends CustomPainter {
  final bool isLight;
  const GeofenceHologramPainter({this.isLight = false});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final center = Offset(w / 2, h / 2 + 10);
    final primaryColor = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF);

    // 1. Concentric Cyan Radar Circles
    final ringPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    for (int i = 1; i <= 3; i++) {
      ringPaint.color = primaryColor.withValues(alpha: 0.15 * i);
      canvas.drawCircle(center, 38.0 * i, ringPaint);
    }

    // 2. Isometric Diamond Pad (Base Plate)
    final padPath = Path()
      ..moveTo(center.dx, center.dy - 35)
      ..lineTo(center.dx + 65, center.dy)
      ..lineTo(center.dx, center.dy + 35)
      ..lineTo(center.dx - 65, center.dy)
      ..close();

    final padFill = Paint()
      ..color = (isLight ? const Color(0xFFE0F2FE) : const Color(0xFF0A1E35)).withValues(alpha: 0.8)
      ..style = PaintingStyle.fill;

    final padStroke = Paint()
      ..color = primaryColor.withValues(alpha: 0.6)
      ..strokeWidth = 1.6
      ..style = PaintingStyle.stroke;

    canvas.drawPath(padPath, padFill);
    canvas.drawPath(padPath, padStroke);

    // Inner Dashed Diamond
    final innerPath = Path()
      ..moveTo(center.dx, center.dy - 22)
      ..lineTo(center.dx + 42, center.dy)
      ..lineTo(center.dx, center.dy + 22)
      ..lineTo(center.dx - 42, center.dy)
      ..close();

    final innerStroke = Paint()
      ..color = primaryColor.withValues(alpha: 0.4)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    canvas.drawPath(innerPath, innerStroke);

    // Center Beacon Dot on Pad
    final beaconDot = Paint()..color = primaryColor;
    canvas.drawCircle(Offset(center.dx, center.dy - 2), 3.0, beaconDot);

    // 3. Floating Glowing Cyan Pin
    final pinCenter = Offset(center.dx, center.dy - 38);

    // Glow under pin
    final glowPaint = Paint()
      ..color = primaryColor.withValues(alpha: isLight ? 0.2 : 0.3)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12);
    canvas.drawCircle(pinCenter, 20.0, glowPaint);

    // Cyan Pin Circle
    final pinBg = Paint()..color = primaryColor;
    canvas.drawCircle(pinCenter, 20.0, pinBg);

    // Inner circle with pin icon center
    final pinInner = Paint()..color = isLight ? Colors.white : const Color(0xFF090E17);
    canvas.drawCircle(pinCenter, 7.0, pinInner);
  }

  @override
  bool shouldRepaint(covariant GeofenceHologramPainter oldDelegate) => oldDelegate.isLight != isLight;
}
