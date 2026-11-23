import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'qr_code_widget.dart';
import 'active_qr_tag_screen.dart';
import '../../utils/api_config.dart';
import '../../widgets/animated_back_arrow.dart';

/// Screen: QR Activated Successfully! matching Image 2
class QrActivatedScreen extends StatelessWidget {
  final String tagId;
  final String vehicleName;
  final String vehicleReg;
  final String vehicleId;

  const QrActivatedScreen({
    super.key,
    required this.vehicleId,
    this.tagId = 'FN78451236',
    this.vehicleName = 'Tata Nexon',
    this.vehicleReg = 'MH 12 AB 4521',
  });

  void _onViewQrTag(BuildContext context) {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => ActiveQrTagScreen(
          tagId: tagId,
          vehicleId: vehicleId,
          vehicleName: vehicleName,
          vehicleReg: vehicleReg,
        ),
      ),
    );
  }

  void _onBackToHome(BuildContext context) {
    Navigator.popUntil(context, (route) => route.isFirst);
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
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minHeight: constraints.maxHeight,
                      ),
                      child: IntrinsicHeight(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Column(
                            children: [
                              const SizedBox(height: 8),

                              // Top App Bar with back arrow matching Image 2
                              Align(
                                alignment: Alignment.centerLeft,
                                child: AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                              ),

                              const Spacer(flex: 1),
                              const SizedBox(height: 8),

                              // Celebration Green Checkmark Badge with Confetti Particles (Image 2)
                              Stack(
                                alignment: Alignment.center,
                                clipBehavior: Clip.none,
                                children: [
                                  // Confetti 1: Top-Left Cyan Rectangle
                                  Positioned(
                                    top: -10,
                                    left: -24,
                                    child: Transform.rotate(
                                      angle: -0.6,
                                      child: Container(
                                        width: 13,
                                        height: 6,
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF00C2FF),
                                          borderRadius: BorderRadius.circular(3),
                                        ),
                                      ),
                                    ),
                                  ),

                                  // Confetti 2: Top-Right Golden Yellow Dot
                                  Positioned(
                                    top: -12,
                                    right: -10,
                                    child: Container(
                                      width: 8,
                                      height: 8,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFFFFCA28),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ),

                                  // Confetti 3: Left Yellow Dot
                                  Positioned(
                                    top: 24,
                                    left: -32,
                                    child: Container(
                                      width: 8,
                                      height: 8,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFFFDD835),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ),

                                  // Confetti 4: Bottom-Left Blue Square
                                  Positioned(
                                    bottom: 0,
                                    left: -28,
                                    child: Transform.rotate(
                                      angle: 0.4,
                                      child: Container(
                                        width: 9,
                                        height: 9,
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF2979FF),
                                          borderRadius: BorderRadius.circular(2),
                                        ),
                                      ),
                                    ),
                                  ),

                                  // Confetti 5: Right Pink/Coral Rectangle
                                  Positioned(
                                    top: 20,
                                    right: -28,
                                    child: Transform.rotate(
                                      angle: 0.3,
                                      child: Container(
                                        width: 12,
                                        height: 5,
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFF6E85),
                                          borderRadius: BorderRadius.circular(2),
                                        ),
                                      ),
                                    ),
                                  ),

                                  // Confetti 6: Bottom-Right Mint Diamond
                                  Positioned(
                                    bottom: -2,
                                    right: -24,
                                    child: Transform.rotate(
                                      angle: 0.8,
                                      child: Container(
                                        width: 9,
                                        height: 9,
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF26A69A),
                                          borderRadius: BorderRadius.circular(2),
                                        ),
                                      ),
                                    ),
                                  ),

                                  // Core Green Checkmark Circle
                                  Container(
                                    width: 82,
                                    height: 82,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF00C853),
                                      shape: BoxShape.circle,
                                      boxShadow: [
                                        BoxShadow(
                                          color: const Color(0xFF00C853).withValues(alpha: 0.35),
                                          blurRadius: 24,
                                          spreadRadius: 4,
                                        ),
                                      ],
                                    ),
                                    child: const Center(
                                      child: Icon(
                                        Icons.check_rounded,
                                        color: Colors.white,
                                        size: 46,
                                      ),
                                    ),
                                  ),
                                ],
                              ),

                              const SizedBox(height: 20),

                              // Title matching Image 2: "QR Activated Successfully!"
                              Text(
                                'QR Activated\nSuccessfully!',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  height: 1.25,
                                ),
                              ),

                              const SizedBox(height: 22),

                              // QR Display Card matching Image 2
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                                decoration: BoxDecoration(
                                  color: isLight ? Colors.white : const Color(0xFF141A22),
                                  borderRadius: BorderRadius.circular(28),
                                  border: Border.all(
                                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1D2633),
                                    width: 1,
                                  ),
                                  boxShadow: isLight
                                      ? AppTheme.cardShadow
                                      : [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.35),
                                            blurRadius: 20,
                                            offset: const Offset(0, 8),
                                          ),
                                        ],
                                ),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'SMART SAFETY',
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        letterSpacing: 1.5,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    QrCodeWidget(
                                      size: 200,
                                      darkColor: Colors.black,
                                      lightColor: Colors.white,
                                      data: ApiConfig.getQrScanUrl(tagId),
                                      isEncrypted: true,
                                    ),
                                    const SizedBox(height: 18),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          'Tag ID: ',
                                          style: TextStyle(
                                            color: isLight ? const Color(0xFF64748B) : const Color(0xFF7A8B9E),
                                            fontSize: 13.5,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 10,
                                            vertical: 5,
                                          ),
                                          decoration: BoxDecoration(
                                            color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF121C2B),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(
                                              color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1F2E45),
                                              width: 1,
                                            ),
                                          ),
                                          child: Text(
                                            tagId,
                                            style: TextStyle(
                                              color: isLight ? const Color(0xFF0F172A) : const Color(0xFFD6E2F0),
                                              fontSize: 13,
                                              fontWeight: FontWeight.w600,
                                              letterSpacing: 0.5,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),

                              const Spacer(flex: 2),
                              const SizedBox(height: 16),

                              // Button 1: View QR Tag matching Image 2
                              SizedBox(
                                width: double.infinity,
                                height: 52,
                                child: ElevatedButton(
                                  onPressed: () => _onViewQrTag(context),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.primaryColor,
                                    foregroundColor: Colors.white,
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(26),
                                    ),
                                  ),
                                  child: const Text(
                                    'View QR Tag',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),

                              const SizedBox(height: 12),

                              // Button 2: Back to Home matching Image 2
                              SizedBox(
                                width: double.infinity,
                                height: 52,
                                child: OutlinedButton(
                                  onPressed: () => _onBackToHome(context),
                                  style: OutlinedButton.styleFrom(
                                    backgroundColor: isLight ? Colors.white : const Color(0xFF0D1520),
                                    foregroundColor: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    side: BorderSide(
                                      color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1A2738),
                                      width: 1.2,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(26),
                                    ),
                                  ),
                                  child: Text(
                                    'Back to Home',
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),

                              const SizedBox(height: 20),
                            ],
                          ),
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
