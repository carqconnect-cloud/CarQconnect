import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'qr_code_widget.dart';
import 'qr_activated_screen.dart';
import '../../widgets/animated_back_arrow.dart';

/// Screen: Link Your QR Tag matching Image 1
class LinkQrTagScreen extends StatefulWidget {
  final String vehicleId;
  final String vehicleName;
  final String vehicleReg;

  const LinkQrTagScreen({
    super.key,
    required this.vehicleId,
    required this.vehicleName,
    required this.vehicleReg,
  });

  @override
  State<LinkQrTagScreen> createState() => _LinkQrTagScreenState();
}

class _LinkQrTagScreenState extends State<LinkQrTagScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _tagIdController = TextEditingController();
  late AnimationController _scannerAnimationController;
  late Animation<double> _scannerAnimation;
  bool _isScanning = false;

  @override
  void initState() {
    super.initState();
    _scannerAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat(reverse: true);

    _scannerAnimation = Tween<double>(begin: 0.08, end: 0.92).animate(
      CurvedAnimation(
        parent: _scannerAnimationController,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _tagIdController.dispose();
    _scannerAnimationController.dispose();
    super.dispose();
  }

  void _onScanTapped() {
    setState(() {
      _isScanning = true;
    });

    // Simulate instant scan detection after 1.2s
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (!mounted) return;
      setState(() {
        _isScanning = false;
        _tagIdController.text = 'FNR78451236';
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF101C2B),
          duration: Duration(seconds: 2),
          content: Row(
            children: [
              Icon(Icons.check_circle_rounded, color: Color(0xFF00C2FF), size: 19),
              SizedBox(width: 8),
              Text(
                'Tag Scanned: FNR78451236',
                style: TextStyle(color: Colors.white),
              ),
            ],
          ),
        ),
      );
    });
  }

  void _onContinue() {
    final tagId = _tagIdController.text.trim().isNotEmpty
        ? _tagIdController.text.trim().toUpperCase()
        : 'FN78451236';

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => QrActivatedScreen(
          tagId: tagId,
          vehicleId: widget.vehicleId,
          vehicleName: widget.vehicleName,
          vehicleReg: widget.vehicleReg,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            gradient: isLight ? AppTheme.bgGradient : null,
            color: isLight ? null : const Color(0xFF090E15),
          ),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            body: SafeArea(
              child: Column(
                children: [
                  // Top App Bar matching Image 1
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    child: Row(
                      children: [
                        AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                        Expanded(
                          child: Center(
                            child: Text(
                              'Link Your QR Tag',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 18.5,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.3,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 48), // Balance leading back icon
                      ],
                    ),
                  ),

                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        children: [
                          const SizedBox(height: 14),

                          // Subtitle matching Image 1
                          Text(
                            'Enter the unique code on your tag\nor scan it to link.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF7E8C9D),
                              fontSize: 13.5,
                              height: 1.4,
                            ),
                          ),

                          const SizedBox(height: 32),

                          // Viewfinder Box with 4 Cyan Corner Brackets (Image 1)
                          GestureDetector(
                            onTap: _onScanTapped,
                            child: Center(
                              child: SizedBox(
                                width: 230,
                                height: 230,
                                child: Stack(
                                  alignment: Alignment.center,
                                  children: [
                                    // 4 Corner Brackets
                                    Positioned.fill(
                                      child: CustomPaint(
                                        painter: _CornerBracketsPainter(
                                          color: AppTheme.primaryColor,
                                          strokeWidth: 3.5,
                                          cornerLength: 32,
                                        ),
                                      ),
                                    ),

                                    // White QR Code Card inside viewfinder
                                    Container(
                                      width: 170,
                                      height: 170,
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(16),
                                        boxShadow: isLight ? AppTheme.cardShadow : null,
                                      ),
                                      child: const QrCodeWidget(
                                        size: 150,
                                        darkColor: Colors.black,
                                        lightColor: Colors.transparent,
                                        hasRoundedCorners: false,
                                      ),
                                    ),

                                    // Animated Scanning Laser Line
                                    if (_isScanning)
                                      AnimatedBuilder(
                                        animation: _scannerAnimation,
                                        builder: (context, child) {
                                          return Positioned(
                                            top: 230 * _scannerAnimation.value,
                                            left: 20,
                                            right: 20,
                                            child: Container(
                                              height: 2.5,
                                              decoration: BoxDecoration(
                                                color: AppTheme.primaryColor,
                                                boxShadow: [
                                                  BoxShadow(
                                                    color: AppTheme.primaryColor
                                                        .withValues(alpha: 0.8),
                                                    blurRadius: 10,
                                                    spreadRadius: 2,
                                                  ),
                                                ],
                                              ),
                                            ),
                                          );
                                        },
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 24),

                          // Scan Tag Code Title
                          Text(
                            'Scan Tag Code',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 6),

                          // Tap to scan subtitle
                          Text(
                            'Tap to scan the QR code\non your CarQConnect tag',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF7E8C9D),
                              fontSize: 13,
                              height: 1.35,
                            ),
                          ),

                          const SizedBox(height: 28),

                          // Divider with "or" in the center (Image 1)
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  height: 1,
                                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF192535),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 14),
                                child: Text(
                                  'or',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF7E8C9D),
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Container(
                                  height: 1,
                                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF192535),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 24),

                          // "Enter QR Tag ID" Label
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'Enter QR Tag ID',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF475569) : const Color(0xFF7E8C9D),
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Input Box matching Image 1
                          Container(
                            height: 50,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF0E1722),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF172332),
                                width: 1,
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Center(
                              child: TextField(
                                controller: _tagIdController,
                                textCapitalization: TextCapitalization.characters,
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w500,
                                  letterSpacing: 0.5,
                                ),
                                decoration: InputDecoration(
                                  hintText: 'E.G. FNR78451236',
                                  hintStyle: TextStyle(
                                    color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF3F5064),
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    letterSpacing: 0.5,
                                  ),
                                  border: InputBorder.none,
                                  isDense: true,
                                  contentPadding: EdgeInsets.zero,
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 36),

                          // Continue Cyan Pill Button matching Image 1
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: ElevatedButton(
                              onPressed: _onContinue,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryColor,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(26),
                                ),
                              ),
                              child: const Text(
                                'Continue',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Custom painter for the 4 cyan corner brackets framing the QR code
class _CornerBracketsPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;
  final double cornerLength;

  _CornerBracketsPainter({
    required this.color,
    required this.strokeWidth,
    required this.cornerLength,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final w = size.width;
    final h = size.height;

    // Top-Left ⌜
    canvas.drawLine(const Offset(0, 0), Offset(cornerLength, 0), paint);
    canvas.drawLine(const Offset(0, 0), Offset(0, cornerLength), paint);

    // Top-Right ⌝
    canvas.drawLine(Offset(w, 0), Offset(w - cornerLength, 0), paint);
    canvas.drawLine(Offset(w, 0), Offset(w, cornerLength), paint);

    // Bottom-Left ⌞
    canvas.drawLine(Offset(0, h), Offset(cornerLength, h), paint);
    canvas.drawLine(Offset(0, h), Offset(0, h - cornerLength), paint);

    // Bottom-Right ⌟
    canvas.drawLine(Offset(w, h), Offset(w - cornerLength, h), paint);
    canvas.drawLine(Offset(w, h), Offset(w, h - cornerLength), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
