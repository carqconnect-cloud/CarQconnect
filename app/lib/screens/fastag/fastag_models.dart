import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// App design gradient linked to central AppTheme
LinearGradient get kFastagBackgroundGradient => AppTheme.bgGradient;

class FastagAccount {
  final String id;
  final String bankName;
  final String vehicleNumber;
  final double balance;
  final String customerName;
  final String? logoAsset;
  final String? statusMessage;
  final bool isLowBalance;

  const FastagAccount({
    required this.id,
    required this.bankName,
    required this.vehicleNumber,
    required this.balance,
    this.customerName = 'John Doe',
    this.logoAsset,
    this.statusMessage,
    this.isLowBalance = false,
  });
}

class FastagTransaction {
  final String id;
  final String title;
  final String subtitle;
  final double amount;
  final bool isDebit;
  final String timestamp;
  final String tollPlaza;
  final String vehicleNumber;
  final String transactionId;
  final String paymentMethod;
  final String status;
  final Color iconColor;
  final Color iconBgColor;
  final bool isToll;

  const FastagTransaction({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.isDebit,
    required this.timestamp,
    required this.tollPlaza,
    required this.vehicleNumber,
    required this.transactionId,
    required this.paymentMethod,
    this.status = 'Successful',
    required this.iconColor,
    required this.iconBgColor,
    required this.isToll,
  });
}

final List<FastagTransaction> kSampleFastagTransactions = [
  const FastagTransaction(
    id: '1',
    title: 'Toll Payment',
    subtitle: '12 Sep, 10:24 AM • Devas Bypass',
    amount: 85.00,
    isDebit: true,
    timestamp: '12 Sep 2026, 10:24 AM',
    tollPlaza: 'Dewas Bypass',
    vehicleNumber: 'MP 09 CZ 1111',
    transactionId: 'FFTG728374',
    paymentMethod: 'FASTag Balance',
    status: 'Successful',
    iconColor: Color(0xFFB388FF),
    iconBgColor: Color(0xFF231C38),
    isToll: true,
  ),
  const FastagTransaction(
    id: '2',
    title: 'Recharge',
    subtitle: '10 Sep, 06:12 PM • UPI',
    amount: 500.00,
    isDebit: false,
    timestamp: '10 Sep 2026, 06:12 PM',
    tollPlaza: 'N/A',
    vehicleNumber: 'MP 09 CZ 1111',
    transactionId: 'FTG728374',
    paymentMethod: 'UPI',
    status: 'Successful',
    iconColor: Color(0xFF00E676),
    iconBgColor: Color(0xFF132D24),
    isToll: false,
  ),
  const FastagTransaction(
    id: '3',
    title: 'Toll Payment',
    subtitle: '08 Sep, 09:15 AM • Indore Bypass',
    amount: 60.00,
    isDebit: true,
    timestamp: '08 Sep 2026, 09:15 AM',
    tollPlaza: 'Indore Bypass',
    vehicleNumber: 'MP 09 CZ 1111',
    transactionId: 'FFTG582103',
    paymentMethod: 'FASTag Balance',
    status: 'Successful',
    iconColor: Color(0xFFFF5252),
    iconBgColor: Color(0xFF2D1822),
    isToll: true,
  ),
  const FastagTransaction(
    id: '4',
    title: 'Toll Payment',
    subtitle: '05 Sep, 11:20 AM • Ujjain Road',
    amount: 110.00,
    isDebit: true,
    timestamp: '05 Sep 2026, 11:20 AM',
    tollPlaza: 'Ujjain Road',
    vehicleNumber: 'MP 09 CZ 1111',
    transactionId: 'FFTG391845',
    paymentMethod: 'FASTag Balance',
    status: 'Successful',
    iconColor: Color(0xFF448AFF),
    iconBgColor: Color(0xFF14243B),
    isToll: true,
  ),
  const FastagTransaction(
    id: '5',
    title: 'Recharge',
    subtitle: '01 Sep, 04:30 PM • Net Banking',
    amount: 1000.00,
    isDebit: false,
    timestamp: '01 Sep 2026, 04:30 PM',
    tollPlaza: 'N/A',
    vehicleNumber: 'MP 09 CZ 1111',
    transactionId: 'FTG104829',
    paymentMethod: 'Net Banking',
    status: 'Successful',
    iconColor: Color(0xFF00E676),
    iconBgColor: Color(0xFF132D24),
    isToll: false,
  ),
];

class BankInfo {
  final String id;
  final String name;
  final String? assetPath;
  final bool isPopular;

  const BankInfo({
    required this.id,
    required this.name,
    this.assetPath,
    this.isPopular = false,
  });
}

/// Authentic Indian number plate badge with Ashoka Chakra and IND text
class IndPlateBadge extends StatelessWidget {
  const IndPlateBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 38,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFFCBD5E1), width: 1.2),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Ashoka Chakra ring representation
          Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: const Color(0xFF1E3A8A),
                width: 1.2,
              ),
            ),
            child: const Center(
              child: Icon(
                Icons.flare_rounded,
                size: 8,
                color: Color(0xFF1E3A8A),
              ),
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'IND',
            style: TextStyle(
              color: Color(0xFF1E3A8A),
              fontSize: 7.5,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

/// Bank Logo helper widget that uses assets with clean fallback
class BankLogoWidget extends StatelessWidget {
  final String bankName;
  final String? assetPath;
  final double size;

  const BankLogoWidget({
    super.key,
    required this.bankName,
    this.assetPath,
    this.size = 36,
  });

  @override
  Widget build(BuildContext context) {
    if (assetPath != null && assetPath!.isNotEmpty) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: const Color(0xFF142238),
          borderRadius: BorderRadius.circular(10),
        ),
        clipBehavior: Clip.antiAlias,
        child: Image.asset(
          assetPath!,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) =>
              _buildFallbackLogo(bankName),
        ),
      );
    }
    return _buildFallbackLogo(bankName);
  }

  Widget _buildFallbackLogo(String name) {
    final lower = name.toLowerCase();
    Color bg = const Color(0xFF142238);
    Color textCol = const Color(0xFF00C2FF);

    if (lower.contains('icici')) {
      bg = const Color(0xFF8B0000);
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Center(
          child: Text(
            'i',
            style: TextStyle(
              color: Color(0xFFFFB300),
              fontSize: 22,
              fontWeight: FontWeight.w900,
              fontStyle: FontStyle.italic,
            ),
          ),
        ),
      );
    } else if (lower.contains('baroda')) {
      bg = const Color(0xFFE65100);
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Center(
          child: Icon(
            Icons.wb_sunny_rounded,
            color: Colors.white,
            size: 20,
          ),
        ),
      );
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Center(
        child: Text(
          name.isNotEmpty ? name.substring(0, 1).toUpperCase() : 'B',
          style: TextStyle(
            color: textCol,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

/// 3D Toll Plaza Illustration using assets/fastagicons/fastag.png asset
class TollPlazaIllustration extends StatelessWidget {
  const TollPlazaIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Image.asset(
        'assets/fastagicons/fastag.png',
        height: 180,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) => SizedBox(
          height: 165,
          width: double.infinity,
          child: CustomPaint(
            painter: _TollPlazaPainter(),
          ),
        ),
      ),
    );
  }
}

class _TollPlazaPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Road Surface
    final roadPaint = Paint()
      ..color = const Color(0xFF131D2D)
      ..style = PaintingStyle.fill;
    final roadPath = Path()
      ..moveTo(w * 0.1, h * 0.95)
      ..lineTo(w * 0.9, h * 0.95)
      ..lineTo(w * 0.75, h * 0.45)
      ..lineTo(w * 0.25, h * 0.45)
      ..close();
    canvas.drawPath(roadPath, roadPaint);

    // Toll Booth Overhead Canopy (Dark Navy with 3D depth)
    final canopyTop = Paint()..color = const Color(0xFF1E2B3E);
    final canopyFront = Paint()..color = const Color(0xFF26374D);

    final canopyRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.42, h * 0.12, w * 0.48, h * 0.26),
      const Radius.circular(8),
    );
    canvas.drawRRect(canopyRect, canopyTop);

    final canopyFrontRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.42, h * 0.32, w * 0.48, h * 0.06),
      const Radius.circular(4),
    );
    canvas.drawRRect(canopyFrontRect, canopyFront);

    // FASTag sign banner on canopy (White signboard with FASTag colors)
    final signBg = Paint()..color = Colors.white;
    final signRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.46, h * 0.16, w * 0.40, h * 0.16),
      const Radius.circular(5),
    );
    canvas.drawRRect(signRect, signBg);

    // FASTag Text
    final fastagText = TextPainter(
      text: const TextSpan(
        children: [
          TextSpan(
            text: 'FAS',
            style: TextStyle(
              color: Color(0xFFFF6D00),
              fontSize: 14,
              fontWeight: FontWeight.w900,
              fontStyle: FontStyle.italic,
              letterSpacing: -0.5,
            ),
          ),
          TextSpan(
            text: 'Tag',
            style: TextStyle(
              color: Color(0xFF00C853),
              fontSize: 14,
              fontWeight: FontWeight.w900,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
      textDirection: TextDirection.ltr,
    );
    fastagText.layout();
    fastagText.paint(canvas, Offset(w * 0.51, h * 0.18));

    // Toll Booth Column / Pillar (Yellow & Black stripes)
    final boothPaint = Paint()..color = const Color(0xFF1E2D42);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.68, h * 0.38, w * 0.16, h * 0.46),
        const Radius.circular(6),
      ),
      boothPaint,
    );

    // Hazard Stripes on Booth Base
    final stripeYellow = Paint()..color = const Color(0xFFFFB300);
    final stripeBlack = Paint()..color = const Color(0xFF0F172A);

    for (int i = 0; i < 4; i++) {
      final p = (i % 2 == 0) ? stripeYellow : stripeBlack;
      canvas.drawRect(
        Rect.fromLTWH(w * 0.68, h * 0.74 + (i * 5), w * 0.16, 5),
        p,
      );
    }

    // Toll Barrier Boom Arm (Red and White striped)
    final armWhite = Paint()..color = Colors.white;
    final armRed = Paint()..color = const Color(0xFFEF4444);

    final armRect = Rect.fromLTWH(w * 0.44, h * 0.56, w * 0.28, 5);
    canvas.drawRect(armRect, armWhite);

    for (int i = 0; i < 5; i++) {
      canvas.drawRect(
        Rect.fromLTWH(w * 0.44 + (i * 18), h * 0.56, 9, 5),
        armRed,
      );
    }

    // White Sedan Car approaching the toll booth (Rear 3/4 Perspective view)
    final carBody = Paint()..color = const Color(0xFFF8FAFC);
    final carGlass = Paint()..color = const Color(0xFF1E293B);
    final carShadow = Paint()
      ..color = Colors.black.withValues(alpha: 0.4)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);

    // Car Shadow
    canvas.drawOval(
      Rect.fromLTWH(w * 0.18, h * 0.78, w * 0.38, h * 0.12),
      carShadow,
    );

    // Car Body Path (Rear view of white sedan)
    final bodyPath = Path()
      ..moveTo(w * 0.22, h * 0.82)
      ..lineTo(w * 0.54, h * 0.82)
      ..lineTo(w * 0.52, h * 0.62)
      ..lineTo(w * 0.46, h * 0.52)
      ..lineTo(w * 0.30, h * 0.52)
      ..lineTo(w * 0.24, h * 0.62)
      ..close();
    canvas.drawPath(bodyPath, carBody);

    // Rear Windshield
    final glassPath = Path()
      ..moveTo(w * 0.26, h * 0.62)
      ..lineTo(w * 0.50, h * 0.62)
      ..lineTo(w * 0.45, h * 0.54)
      ..lineTo(w * 0.31, h * 0.54)
      ..close();
    canvas.drawPath(glassPath, carGlass);

    // Rear Taillights (Red LED strips)
    final redLight = Paint()..color = const Color(0xFFEF4444);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.23, h * 0.67, w * 0.08, h * 0.04),
        const Radius.circular(2),
      ),
      redLight,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.45, h * 0.67, w * 0.08, h * 0.04),
        const Radius.circular(2),
      ),
      redLight,
    );

    // Number Plate on Car
    final plateBg = Paint()..color = Colors.white;
    final plateRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.32, h * 0.69, w * 0.12, h * 0.035),
      const Radius.circular(1.5),
    );
    canvas.drawRRect(plateRect, plateBg);

    final plateText = TextPainter(
      text: const TextSpan(
        text: 'MP 09 AB 1234',
        style: TextStyle(
          color: Colors.black,
          fontSize: 4.5,
          fontWeight: FontWeight.w900,
        ),
      ),
      textDirection: TextDirection.ltr,
    );
    plateText.layout();
    plateText.paint(canvas, Offset(w * 0.33, h * 0.695));

    // Wheels
    final wheelPaint = Paint()..color = const Color(0xFF0F172A);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.21, h * 0.74, w * 0.05, h * 0.12),
        const Radius.circular(3),
      ),
      wheelPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.50, h * 0.74, w * 0.05, h * 0.12),
        const Radius.circular(3),
      ),
      wheelPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Custom Toll Barrier / Toll Gate icon matching the designs
class TollBoothIcon extends StatelessWidget {
  final double size;
  final Color color;

  const TollBoothIcon({
    super.key,
    this.size = 24,
    this.color = const Color(0xFFFF8A3D),
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _TollBoothIconPainter(color: color),
      ),
    );
  }
}

class _TollBoothIconPainter extends CustomPainter {
  final Color color;

  _TollBoothIconPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final w = size.width;
    final h = size.height;

    // 1. Top Canopy Roof
    final roofRRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.12, h * 0.20, w * 0.76, h * 0.16),
      const Radius.circular(2.5),
    );
    canvas.drawRRect(roofRRect, paint);

    // 2. Left Pillar
    final leftPillar = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.18, h * 0.36, w * 0.13, h * 0.44),
      const Radius.circular(1.5),
    );
    canvas.drawRRect(leftPillar, paint);

    // 3. Right Pillar
    final rightPillar = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.69, h * 0.36, w * 0.13, h * 0.44),
      const Radius.circular(1.5),
    );
    canvas.drawRRect(rightPillar, paint);

    // 4. Center Toll Cabin / Booth
    final centerBooth = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.42, h * 0.40, w * 0.16, h * 0.40),
      const Radius.circular(1.5),
    );
    canvas.drawRRect(centerBooth, paint);
  }

  @override
  bool shouldRepaint(covariant _TollBoothIconPainter oldDelegate) =>
      oldDelegate.color != color;
}

/// Floating celebration confetti particles matching Image 2
class ConfettiPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    void drawChip(Offset offset, double width, double height, double angle, Color color) {
      canvas.save();
      canvas.translate(cx + offset.dx, cy + offset.dy);
      canvas.rotate(angle);
      final rrect = RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset.zero, width: width, height: height),
        const Radius.circular(2),
      );
      canvas.drawRRect(rrect, Paint()..color = color);
      canvas.restore();
    }

    void drawDot(Offset offset, double radius, Color color) {
      canvas.drawCircle(Offset(cx + offset.dx, cy + offset.dy), radius, Paint()..color = color);
    }

    // Top-left cyan pill
    drawChip(const Offset(-46, -45), 14, 6, -0.6, const Color(0xFF00C2FF));
    // Top-right yellow dot
    drawDot(const Offset(30, -48), 4, const Color(0xFFFFCA28));
    // Far-left light yellow dot
    drawDot(const Offset(-65, -18), 4.5, const Color(0xFFFFE082));
    // Right coral chip
    drawChip(const Offset(62, -18), 12, 6, 0.2, const Color(0xFFFF6F61));
    // Mid-left blue pill
    drawChip(const Offset(-62, 14), 13, 6, 0.7, const Color(0xFF2979FF));
    // Bottom-right cyan/mint diamond
    drawChip(const Offset(52, 14), 11, 7, -0.7, const Color(0xFF4DD0E1));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

