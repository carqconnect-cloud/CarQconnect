import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_icons.dart';

/// App design gradient linked to central AppTheme
LinearGradient get kNotificationBackgroundGradient => AppTheme.bgGradient;

enum NotificationIconType {
  sos,
  document,
  wrench,
  tag,
  location,
  car,
  fuel,
  shield,
  custom,
}

class AppNotification {
  final String id;
  final String title;
  final String description;
  final String timeAgo;
  final String section; // 'Today', 'Yesterday', 'Earlier'
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;
  final bool isUnread;
  final NotificationIconType iconType;
  final String? svgAsset;
  final String type;

  const AppNotification({
    required this.id,
    required this.title,
    required this.description,
    required this.timeAgo,
    required this.section,
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
    this.isUnread = false,
    this.iconType = NotificationIconType.custom,
    this.svgAsset,
    this.type = 'general',
  });

  AppNotification copyWith({
    String? id,
    String? title,
    String? description,
    String? timeAgo,
    String? section,
    IconData? icon,
    Color? iconColor,
    Color? iconBgColor,
    bool? isUnread,
    NotificationIconType? iconType,
    String? svgAsset,
    String? type,
  }) {
    return AppNotification(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      timeAgo: timeAgo ?? this.timeAgo,
      section: section ?? this.section,
      icon: icon ?? this.icon,
      iconColor: iconColor ?? this.iconColor,
      iconBgColor: iconBgColor ?? this.iconBgColor,
      isUnread: isUnread ?? this.isUnread,
      iconType: iconType ?? this.iconType,
      svgAsset: svgAsset ?? this.svgAsset,
      type: type ?? this.type,
    );
  }

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    // Parse createdAt date to format timeAgo and section
    final createdAt = json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now();
    final now = DateTime.now();
    final diff = now.difference(createdAt);
    
    String section = 'Earlier';
    if (diff.inDays == 0 && now.day == createdAt.day) {
      section = 'Today';
    } else if (diff.inDays == 1 || (diff.inDays == 0 && now.day != createdAt.day)) {
      section = 'Yesterday';
    }

    String timeAgo = '';
    if (diff.inMinutes < 60) {
      timeAgo = '${diff.inMinutes == 0 ? 1 : diff.inMinutes} min ago';
    } else if (diff.inHours < 24) {
      timeAgo = '${diff.inHours} hr ago';
    } else {
      timeAgo = '${diff.inDays} days ago';
    }

    // Determine icon, iconType, and colors based on title and type
    final titleLower = (json['title'] ?? '').toString().toLowerCase();
    final typeLower = (json['type'] ?? 'general').toString().toLowerCase();
    final descLower = (json['description'] ?? '').toString().toLowerCase();
    final combined = '$titleLower $typeLower $descLower';

    NotificationIconType iconType = NotificationIconType.custom;
    IconData icon = Icons.notifications_active_rounded;
    Color iconColor = const Color(0xFF00C2FF);
    Color iconBgColor = const Color(0xFF14243B);
    String? svgAsset;

    if (combined.contains('sos') || combined.contains('emergency') || combined.contains('danger') || combined.contains('alert sent')) {
      iconType = NotificationIconType.sos;
      icon = Icons.warning_rounded;
      iconColor = const Color(0xFFEF4444);
      iconBgColor = const Color(0xFF351216);
      svgAsset = AppIcons.sosBell;
    } else if (combined.contains('fuel')) {
      iconType = NotificationIconType.fuel;
      icon = Icons.local_gas_station_rounded;
      iconColor = const Color(0xFFEF4444);
      iconBgColor = const Color(0xFF351216);
      svgAsset = AppIcons.fuel;
    } else if (combined.contains('insurance') || combined.contains('rc') || combined.contains('document') || combined.contains('policy')) {
      iconType = NotificationIconType.document;
      icon = Icons.description_outlined;
      iconColor = const Color(0xFF00C2FF);
      iconBgColor = const Color(0xFF14243B);
      svgAsset = AppIcons.document;
    } else if (combined.contains('service') || combined.contains('maintenance') || combined.contains('appointment') || combined.contains('repair')) {
      iconType = NotificationIconType.wrench;
      icon = Icons.build_rounded;
      iconColor = const Color(0xFF00C2FF);
      iconBgColor = const Color(0xFF14243B);
      svgAsset = AppIcons.wrench;
    } else if (combined.contains('offer') || combined.contains('special') || combined.contains('discount') || combined.contains('coupon')) {
      iconType = NotificationIconType.tag;
      icon = Icons.local_offer_outlined;
      iconColor = const Color(0xFF00C2FF);
      iconBgColor = const Color(0xFF14243B);
      svgAsset = AppIcons.tag;
    } else if (typeLower == 'trip' || combined.contains('trip') || combined.contains('summary') || combined.contains('route')) {
      iconType = NotificationIconType.location;
      icon = Icons.navigation_rounded;
      iconColor = const Color(0xFF10B981);
      iconBgColor = const Color(0xFF063024);
      svgAsset = AppIcons.locationPin;
    } else if (combined.contains('parking') || combined.contains('parked') || combined.contains('car') || combined.contains('vehicle')) {
      iconType = NotificationIconType.car;
      icon = Icons.directions_car_rounded;
      iconColor = const Color(0xFF00C2FF);
      iconBgColor = const Color(0xFF14243B);
      svgAsset = AppIcons.carFront;
    } else if (combined.contains('gps') || combined.contains('shield') || combined.contains('connected') || combined.contains('security')) {
      iconType = NotificationIconType.shield;
      icon = Icons.verified_user_outlined;
      iconColor = const Color(0xFF00C2FF);
      iconBgColor = const Color(0xFF14243B);
      svgAsset = AppIcons.shieldAlt;
    }

    return AppNotification(
      id: json['id'] ?? '',
      title: json['title'] ?? 'Notification',
      description: json['description'] ?? '',
      timeAgo: timeAgo,
      section: section,
      icon: icon,
      iconColor: iconColor,
      iconBgColor: iconBgColor,
      isUnread: json['isUnread'] ?? false,
      iconType: iconType,
      svgAsset: svgAsset ?? AppIcons.notification,
      type: (json['type'] ?? (combined.contains('trip') ? 'trip' : 'general')).toString(),
    );
  }
}

/// Empty list of initial notifications - only real data is loaded
final List<AppNotification> kInitialNotifications = const [];

/// Notification icon renderer matching the exact icons in the design
class NotificationIconWidget extends StatelessWidget {
  final NotificationIconType type;
  final Color color;
  final double size;
  final String? svgAsset;

  const NotificationIconWidget({
    super.key,
    required this.type,
    required this.color,
    this.size = 22,
    this.svgAsset,
  });

  @override
  Widget build(BuildContext context) {
    if (svgAsset != null && svgAsset!.isNotEmpty) {
      return AppIcons.svg(svgAsset!, color: color, width: size, height: size);
    }
    switch (type) {
      case NotificationIconType.sos:
        return AppIcons.svg(AppIcons.sosBell, color: color, width: size, height: size);
      case NotificationIconType.document:
        return AppIcons.svg(AppIcons.document, color: color, width: size, height: size);
      case NotificationIconType.wrench:
        return AppIcons.svg(AppIcons.wrench, color: color, width: size, height: size);
      case NotificationIconType.tag:
        return AppIcons.svg(AppIcons.tag, color: color, width: size, height: size);
      case NotificationIconType.location:
        return AppIcons.svg(AppIcons.locationPin, color: color, width: size, height: size);
      case NotificationIconType.car:
        return AppIcons.svg(AppIcons.carFront, color: color, width: size, height: size);
      case NotificationIconType.fuel:
        return AppIcons.svg(AppIcons.fuel, color: color, width: size, height: size);
      case NotificationIconType.shield:
        return AppIcons.svg(AppIcons.shieldAlt, color: color, width: size, height: size);
      case NotificationIconType.custom:
        return AppIcons.svg(AppIcons.notification, color: color, width: size, height: size);
    }
  }
}

/// 3D Device & Bell Notification Permission Illustration (Screen 1)
class TurnOnNotificationsIllustration extends StatelessWidget {
  const TurnOnNotificationsIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 240,
      height: 250,
      child: CustomPaint(
        painter: _TurnOnNotificationsPainter(),
      ),
    );
  }
}

class _TurnOnNotificationsPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // 1. Bottom Glow Shadow
    final shadowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFF1E3A8A).withValues(alpha: 0.5),
          Colors.transparent,
        ],
      ).createShader(
        Rect.fromCenter(
          center: Offset(w * 0.5, h * 0.88),
          width: w * 0.85,
          height: h * 0.25,
        ),
      );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w * 0.5, h * 0.88),
        width: w * 0.85,
        height: h * 0.22,
      ),
      shadowPaint,
    );

    // 2. Main Tablet / Device Card (Periwinkle silver gradient with blue border)
    final deviceRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.22, h * 0.12, w * 0.56, h * 0.72),
      const Radius.circular(28),
    );

    final deviceGrad = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Color(0xFFE2EDFE),
          Color(0xFFC7DCFA),
          Color(0xFFA8C7F0),
        ],
      ).createShader(deviceRect.outerRect);

    // Outer border stroke
    final deviceBorder = Paint()
      ..color = const Color(0xFF3B82F6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5;

    canvas.drawRRect(deviceRect, deviceGrad);
    canvas.drawRRect(deviceRect, deviceBorder);

    // Subtle curved contour line at bottom of device
    final contourPaint = Paint()
      ..color = const Color(0xFF93C5FD).withValues(alpha: 0.6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    final contourPath = Path()
      ..moveTo(w * 0.25, h * 0.78)
      ..quadraticBezierTo(w * 0.45, h * 0.70, w * 0.75, h * 0.80);
    canvas.drawPath(contourPath, contourPaint);

    // 3. Notification Pill 1 (Top Blue Capsule)
    final pill1Rect = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.28, h * 0.20, w * 0.44, h * 0.11),
      const Radius.circular(16),
    );
    final pillPaint = Paint()..color = const Color(0xFF2563EB);
    canvas.drawRRect(pill1Rect, pillPaint);

    // Left Ring/Dot on Pill 1
    final ringPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;
    canvas.drawCircle(Offset(w * 0.35, h * 0.255), 7.5, ringPaint);
    canvas.drawCircle(
      Offset(w * 0.35, h * 0.255),
      3.0,
      Paint()..color = Colors.white,
    );

    // Message lines on Pill 1
    final linePaint = Paint()
      ..color = Colors.white
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 4.0;
    canvas.drawLine(
      Offset(w * 0.43, h * 0.235),
      Offset(w * 0.62, h * 0.235),
      linePaint,
    );
    canvas.drawLine(
      Offset(w * 0.43, h * 0.275),
      Offset(w * 0.55, h * 0.275),
      linePaint,
    );

    // 4. Notification Pill 2 (Second Blue Capsule)
    final pill2Rect = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.28, h * 0.34, w * 0.44, h * 0.11),
      const Radius.circular(16),
    );
    canvas.drawRRect(pill2Rect, pillPaint);

    // Left Ring/Dot on Pill 2
    canvas.drawCircle(Offset(w * 0.35, h * 0.395), 7.5, ringPaint);
    canvas.drawCircle(
      Offset(w * 0.35, h * 0.395),
      3.0,
      Paint()..color = Colors.white,
    );

    // Message lines on Pill 2
    canvas.drawLine(
      Offset(w * 0.43, h * 0.375),
      Offset(w * 0.61, h * 0.375),
      linePaint,
    );
    canvas.drawLine(
      Offset(w * 0.43, h * 0.415),
      Offset(w * 0.53, h * 0.415),
      linePaint,
    );

    // 5. 3D Silver-White Bell at bottom right
    final bellCenterX = w * 0.74;
    final bellCenterY = h * 0.77;

    // Bell drop shadow
    final bellShadow = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFF1D4ED8).withValues(alpha: 0.6),
          Colors.transparent,
        ],
      ).createShader(
        Rect.fromCircle(
          center: Offset(bellCenterX, bellCenterY + 18),
          radius: 26,
        ),
      );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(bellCenterX, bellCenterY + 18),
        width: 48,
        height: 18,
      ),
      bellShadow,
    );

    // Bell Blue Clapper under dome
    final clapperPaint = Paint()..color = const Color(0xFF2563EB);
    canvas.drawCircle(Offset(bellCenterX, bellCenterY + 10), 10, clapperPaint);

    // Bell Main Body (White/Silver 3D dome)
    final bellPath = Path()
      ..moveTo(bellCenterX - 24, bellCenterY + 12)
      ..quadraticBezierTo(
        bellCenterX - 18,
        bellCenterY + 2,
        bellCenterX - 14,
        bellCenterY - 14,
      )
      ..quadraticBezierTo(
        bellCenterX - 8,
        bellCenterY - 26,
        bellCenterX,
        bellCenterY - 26,
      )
      ..quadraticBezierTo(
        bellCenterX + 8,
        bellCenterY - 26,
        bellCenterX + 14,
        bellCenterY - 14,
      )
      ..quadraticBezierTo(
        bellCenterX + 18,
        bellCenterY + 2,
        bellCenterX + 24,
        bellCenterY + 12,
      )
      ..close();

    final bellGradient = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Colors.white,
          Color(0xFFF1F5F9),
          Color(0xFFCBD5E1),
        ],
      ).createShader(
        Rect.fromCircle(center: Offset(bellCenterX, bellCenterY), radius: 26),
      );

    canvas.drawPath(bellPath, bellGradient);

    // Bell top small loop
    canvas.drawCircle(
      Offset(bellCenterX, bellCenterY - 28),
      4.5,
      Paint()
        ..color = const Color(0xFFE2E8F0)
        ..style = PaintingStyle.fill,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D Low-Poly Origami Crystal Mascot for Empty State (Screen 4)
class LowPolyCrystalEmptyIllustration extends StatelessWidget {
  const LowPolyCrystalEmptyIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 170,
      height: 150,
      child: CustomPaint(
        painter: _LowPolyCrystalPainter(),
      ),
    );
  }
}

class _LowPolyCrystalPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // Ambient radial glow behind the crystal
    final glowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFF60A5FA).withValues(alpha: 0.22),
          Colors.transparent,
        ],
      ).createShader(
        Rect.fromCircle(center: Offset(cx, cy + 10), radius: 68),
      );
    canvas.drawCircle(Offset(cx, cy + 10), 68, glowPaint);

    void drawFacet(List<Offset> points, Color color) {
      final path = Path()..moveTo(points[0].dx, points[0].dy);
      for (int i = 1; i < points.length; i++) {
        path.lineTo(points[i].dx, points[i].dy);
      }
      path.close();
      canvas.drawPath(path, Paint()..color = color);
    }

    // Geometry Vertices based on Screen 4
    final pTop = Offset(cx, cy - 48);
    final pLeftOuter = Offset(cx - 58, cy - 8);
    final pRightOuter = Offset(cx + 58, cy - 8);
    final pLeftMid = Offset(cx - 28, cy + 14);
    final pRightMid = Offset(cx + 28, cy + 14);
    final pBottomCenter = Offset(cx, cy + 44);
    final pBottomLeft = Offset(cx - 44, cy + 40);
    final pBottomRight = Offset(cx + 44, cy + 40);

    // Facet 1: Top Left Slate Facet
    drawFacet([pTop, pLeftOuter, pLeftMid], const Color(0xFF475569));

    // Facet 2: Top Right Dark Slate Facet
    drawFacet([pTop, pRightOuter, pRightMid], const Color(0xFF334155));

    // Facet 3: Center Front Upper White/Icy Triangle (where eyes sit!)
    drawFacet([pTop, pLeftMid, pRightMid], const Color(0xFFF1F5F9));

    // Facet 4: Bottom Center Front Light Ice Blue Triangle
    drawFacet([pLeftMid, pRightMid, pBottomCenter], const Color(0xFFDBEAFE));

    // Facet 5: Bottom Left Blue Facet
    drawFacet([pLeftOuter, pLeftMid, pBottomLeft], const Color(0xFF93C5FD));

    // Facet 6: Bottom Right Darker Ice Blue Facet
    drawFacet([pRightOuter, pRightMid, pBottomRight], const Color(0xFFBFDBFE));

    // Facet 7: Bottom Left Under Facet
    drawFacet([pLeftMid, pBottomLeft, pBottomCenter], const Color(0xFFBFDBFE));

    // Facet 8: Bottom Right Under Facet
    drawFacet([pRightMid, pBottomRight, pBottomCenter], const Color(0xFF93C5FD));

    // Front Eyes: Two dark vertical pill-shaped eyes inside the front white facet
    final eyePaint = Paint()
      ..color = const Color(0xFF0F172A)
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 4.2;

    canvas.drawLine(
      Offset(cx - 5.5, cy - 8),
      Offset(cx - 5.5, cy + 4),
      eyePaint,
    );
    canvas.drawLine(
      Offset(cx + 5.5, cy - 8),
      Offset(cx + 5.5, cy + 4),
      eyePaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
