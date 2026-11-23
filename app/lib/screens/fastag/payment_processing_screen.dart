import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'fastag_models.dart';
import 'recharge_success_screen.dart';
import '../../widgets/animated_back_arrow.dart';

class PaymentProcessingScreen extends StatefulWidget {
  final FastagAccount account;
  final int amount;

  const PaymentProcessingScreen({
    super.key,
    required this.account,
    required this.amount,
  });

  @override
  State<PaymentProcessingScreen> createState() =>
      _PaymentProcessingScreenState();
}

class _PaymentProcessingScreenState extends State<PaymentProcessingScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat();

    // Simulate secure NPCI payment processing, then navigate to Success screen
    _timer = Timer(const Duration(milliseconds: 2600), () {
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => RechargeSuccessScreen(
            account: widget.account,
            amount: widget.amount,
          ),
        ),
      );
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            gradient: isLight ? AppTheme.bgGradient : null,
            color: isLight ? null : const Color(0xFF090E17),
          ),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            appBar: AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              centerTitle: true,
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
              title: Text(
                'Recharge FASTag',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            body: SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(minHeight: constraints.maxHeight),
                      child: IntrinsicHeight(
                        child: Column(
                          children: [
                            const SizedBox(height: 12),

                  // Top Status Capsule: FASTAG RE-SYNC • MH 12 RN 8820 [green dot]
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isLight ? Colors.white : const Color(0xFF131D2D),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1D2F47),
                        ),
                        boxShadow: isLight ? AppTheme.cardShadow : null,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color: isLight ? const Color(0xFFE0F2FE) : const Color(0xFF1C2C42),
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Icon(
                                Icons.grid_view_rounded,
                                size: 11,
                                color: isLight ? AppTheme.primaryColor : const Color(0xFF00C2FF),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'FASTAG RE-SYNC • ${widget.account.vehicleNumber.isNotEmpty ? widget.account.vehicleNumber : 'MH 12 RN 8820'}',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.6,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              color: const Color(0xFF00E676),
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF00E676).withValues(alpha: 0.8),
                                  blurRadius: 6,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const Spacer(flex: 2),

                  // Center Cyber Animated Loader Graphic
                  Center(
                    child: SizedBox(
                      width: 220,
                      height: 220,
                      child: AnimatedBuilder(
                        animation: _animController,
                        builder: (context, child) {
                          return CustomPaint(
                            painter: _CyberLoaderPainter(
                              progress: _animController.value,
                              isLight: isLight,
                            ),
                          );
                        },
                      ),
                    ),
                  ),

                  const SizedBox(height: 36),

                  // Title & Subtitle
                  Text(
                    'Processing Payment',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.2,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Please wait... We are processing your\npayment securely.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                      fontSize: 14,
                      height: 1.45,
                    ),
                  ),

                  const Spacer(flex: 3),

                  // Bottom 256-Bit Bank Grade Encryption Card
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: isLight ? Colors.white : const Color(0xFF101726),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                        ),
                        boxShadow: isLight ? AppTheme.cardShadow : null,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF14243B),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Center(
                              child: Icon(
                                Icons.lock_rounded,
                                color: isLight ? AppTheme.primaryColor : const Color(0xFF00C2FF),
                                size: 20,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '256-Bit Bank Grade Encryption',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  'This may take a few seconds.',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Do not close app or tap back button warning
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.info_outline_rounded,
                        color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        size: 14,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Do not close the app or tap the back button.',
                        style: TextStyle(
                          color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),
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

/// Custom painter rendering concentric dashed/pulsing rings and glowing cyan sweep
class _CyberLoaderPainter extends CustomPainter {
  final double progress;
  final bool isLight;

  _CyberLoaderPainter({required this.progress, this.isLight = false});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final center = Offset(cx, cy);

    // Background radial glow
    final glowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          (isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF))
              .withValues(alpha: isLight ? 0.12 : 0.16),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: center, radius: size.width * 0.45));
    canvas.drawCircle(center, size.width * 0.45, glowPaint);

    // 1. Outer dashed ring
    final dashedPaint = Paint()
      ..color = isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1E3A55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;

    const segmentCount = 12;
    const gapRatio = 0.45;
    const sweep = (2 * math.pi / segmentCount) * (1 - gapRatio);
    final outerRadius = size.width * 0.42;

    for (int i = 0; i < segmentCount; i++) {
      final startAngle = i * (2 * math.pi / segmentCount);
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: outerRadius),
        startAngle,
        sweep,
        false,
        dashedPaint,
      );
    }

    // 2. Middle track (dark/light base)
    final trackRadius = size.width * 0.33;
    final trackPaint = Paint()
      ..color = isLight ? const Color(0xFFE2E8F0) : const Color(0xFF14243A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5.0;
    canvas.drawCircle(center, trackRadius, trackPaint);

    // 3. Middle animated glowing cyan/blue sweep arc
    final rotationAngle = progress * 2 * math.pi;
    final arcPaint = Paint()
      ..color = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5.5
      ..strokeCap = StrokeCap.round
      ..maskFilter = const MaskFilter.blur(BlurStyle.solid, 2.0);

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: trackRadius),
      rotationAngle,
      1.7, // ~100 degrees
      false,
      arcPaint,
    );

    // 4. Inner circle track
    final innerPaint = Paint()
      ..color = isLight ? const Color(0xFFEDF2F7) : const Color(0xFF0F1A2A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;
    canvas.drawCircle(center, size.width * 0.24, innerPaint);
  }

  @override
  bool shouldRepaint(covariant _CyberLoaderPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.isLight != isLight;
}

