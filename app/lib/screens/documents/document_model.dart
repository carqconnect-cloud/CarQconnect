import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../globals.dart';

/// App design gradient linked to central AppTheme
LinearGradient get kDocumentBackgroundGradient => AppTheme.bgGradient;

enum DocumentStatus { valid, expiringSoon, active, expired }

class VehicleDocument {
  final String id;
  final String title;
  final String subtitle;
  final String docType;
  final DocumentStatus status;
  final String regNumber;
  final String ownerName;
  final String issueDate;
  final String expiryDate;
  final bool reminderEnabled;
  final String? bankName;
  final String? frontImageUrl;
  final String? backImageUrl;

  const VehicleDocument({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.docType,
    required this.status,
    required this.regNumber,
    required this.ownerName,
    required this.issueDate,
    required this.expiryDate,
    this.reminderEnabled = true,
    this.bankName,
    this.frontImageUrl,
    this.backImageUrl,
  });

  factory VehicleDocument.fromJson(Map<String, dynamic> json) {
    DocumentStatus parseStatus(String? st) {
      if (st == null) return DocumentStatus.valid;
      switch (st.toLowerCase()) {
        case 'expiring soon':
        case 'expiringsoon':
          return DocumentStatus.expiringSoon;
        case 'active':
          return DocumentStatus.active;
        case 'expired':
          return DocumentStatus.expired;
        default:
          return DocumentStatus.valid;
      }
    }

    return VehicleDocument(
      id: json['id'] ?? '',
      title: json['title'] ?? 'Document',
      subtitle: json['subtitle'] ?? '',
      docType: json['docType'] ?? 'unknown',
      status: parseStatus(json['status']),
      regNumber: json['regNumber'] ?? '',
      ownerName: json['ownerName'] ?? '',
      issueDate: json['issueDate'] != null ? json['issueDate'].toString().split('T')[0] : '',
      expiryDate: json['expiryDate'] != null ? json['expiryDate'].toString().split('T')[0] : '',
      reminderEnabled: json['reminderEnabled'] ?? true,
      bankName: json['bankName'],
      frontImageUrl: json['frontImageUrl'],
      backImageUrl: json['backImageUrl'],
    );
  }

  String get statusText {
    switch (status) {
      case DocumentStatus.valid:
        return 'VALID';
      case DocumentStatus.expiringSoon:
        return 'EXPIRING SOON';
      case DocumentStatus.active:
        return 'ACTIVE';
      case DocumentStatus.expired:
        return 'EXPIRED';
    }
  }

  Color get statusTextColor {
    switch (status) {
      case DocumentStatus.valid:
        return const Color(0xFF00E676);
      case DocumentStatus.expiringSoon:
        return const Color(0xFFFFB020);
      case DocumentStatus.active:
        return const Color(0xFF00E676);
      case DocumentStatus.expired:
        return const Color(0xFFFF5252);
    }
  }

  Color get statusBgColor {
    final isLight = AppTheme.isLight;
    switch (status) {
      case DocumentStatus.valid:
      case DocumentStatus.active:
        return isLight ? const Color(0xFFDCFCE7) : const Color(0xFF0B2B24);
      case DocumentStatus.expiringSoon:
        return isLight ? const Color(0xFFFEF3C7) : const Color(0xFF2E240D);
      case DocumentStatus.expired:
        return isLight ? const Color(0xFFFEE2E2) : const Color(0xFF2D1214);
    }
  }

  Color get statusBorderColor {
    final isLight = AppTheme.isLight;
    switch (status) {
      case DocumentStatus.valid:
      case DocumentStatus.active:
        return isLight ? const Color(0xFF86EFAC) : const Color(0xFF104A3A);
      case DocumentStatus.expiringSoon:
        return isLight ? const Color(0xFFFDE68A) : const Color(0xFF5A4112);
      case DocumentStatus.expired:
        return isLight ? const Color(0xFFFECACA) : const Color(0xFF5A1E22);
    }
  }
}

/// Custom painter for dashed rounded borders
class DashedRectPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;
  final double dashWidth;
  final double dashSpace;
  final double cornerRadius;

  const DashedRectPainter({
    required this.color,
    this.strokeWidth = 1.2,
    this.dashWidth = 6.0,
    this.dashSpace = 4.0,
    this.cornerRadius = 16.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        strokeWidth / 2,
        strokeWidth / 2,
        size.width - strokeWidth,
        size.height - strokeWidth,
      ),
      Radius.circular(cornerRadius),
    );

    final path = Path()..addRRect(rrect);
    final dashedPath = _createDashedPath(path, dashWidth, dashSpace);
    canvas.drawPath(dashedPath, paint);
  }

  Path _createDashedPath(Path source, double dashWidth, double dashSpace) {
    final dest = Path();
    for (final metric in source.computeMetrics()) {
      var distance = 0.0;
      var draw = true;
      while (distance < metric.length) {
        final length = draw ? dashWidth : dashSpace;
        if (distance + length > metric.length) {
          if (draw) {
            dest.addPath(
              metric.extractPath(distance, metric.length),
              Offset.zero,
            );
          }
          break;
        }
        if (draw) {
          dest.addPath(
            metric.extractPath(distance, distance + length),
            Offset.zero,
          );
        }
        distance += length;
        draw = !draw;
      }
    }
    return dest;
  }

  @override
  bool shouldRepaint(covariant DashedRectPainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.strokeWidth != strokeWidth ||
        oldDelegate.dashWidth != dashWidth ||
        oldDelegate.dashSpace != dashSpace ||
        oldDelegate.cornerRadius != cornerRadius;
  }
}

/// Reusable vehicle header card matching all screens
class VehicleSelectorCard extends StatelessWidget {
  final String? vehicleName;
  final String? vehicleNumber;
  final VoidCallback? onSwitch;

  const VehicleSelectorCard({
    super.key,
    this.vehicleName,
    this.vehicleNumber,
    this.onSwitch,
  });

  @override
  Widget build(BuildContext context) {
    final displayName = (vehicleName != null && vehicleName!.isNotEmpty)
        ? vehicleName!
        : (Globals.vehicleModel.isNotEmpty ? Globals.vehicleModel : 'No Vehicle Linked');
    final displayReg = (vehicleNumber != null && vehicleNumber!.isNotEmpty)
        ? vehicleNumber!
        : (Globals.vehicleRegistration.isNotEmpty ? Globals.vehicleRegistration : '');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder),
        boxShadow: AppTheme.isLight ? AppTheme.cardShadow : null,
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppTheme.isLight ? const Color(0xFFF1F5F9) : const Color(0xFF162030),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.directions_car_rounded,
              color: AppTheme.isLight ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
              size: 24,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  displayName,
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.1,
                  ),
                ),
                if (displayReg.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    displayReg,
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ],
            ),
          ),
          InkWell(
            onTap: onSwitch,
            borderRadius: BorderRadius.circular(18),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppTheme.isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1A2337),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.swap_horiz_rounded,
                color: AppTheme.textSecondary,
                size: 20,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
