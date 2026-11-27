import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class VehicleHealthScreen extends StatelessWidget {
  final Function(int index)? onNavigateTab;

  const VehicleHealthScreen({super.key, this.onNavigateTab});

  @override
  Widget build(BuildContext context) {
    final List<Map<String, dynamic>> systems = [
      {'title': 'Engine', 'icon': Icons.directions_car_outlined},
      {'title': 'Battery', 'icon': Icons.battery_charging_full_rounded},
      {'title': 'Transmission', 'icon': Icons.alt_route_rounded},
      {'title': 'Brake System', 'icon': Icons.adjust_outlined},
      {'title': 'Emission System', 'icon': Icons.cloud_outlined},
      {'title': 'ABS', 'icon': Icons.album_outlined},
      {'title': 'Airbag', 'icon': Icons.airline_seat_recline_normal_rounded},
    ];

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            children: [
              // 1. Overall Health Circular Gauge Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
                decoration: BoxDecoration(
                  color: isLight ? Colors.white : const Color(0xFF0F1A2E),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                    width: 1.0,
                  ),
                ),
                child: Column(
                  children: [
                    // Circular Progress Ring
                    SizedBox(
                      width: 160,
                      height: 160,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Radial background glow
                          Container(
                            width: 110,
                            height: 110,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                            ),
                          ),
                          CustomPaint(
                            size: const Size(160, 160),
                            painter: _HealthGaugePainter(progress: 0.76, isLight: isLight),
                          ),
                          Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.baseline,
                                textBaseline: TextBaseline.alphabetic,
                                children: [
                                  Text(
                                    '76',
                                    style: TextStyle(
                                      fontSize: 38,
                                      fontWeight: FontWeight.bold,
                                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                      letterSpacing: -1,
                                    ),
                                  ),
                                  Text(
                                    '%',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: isLight ? const Color(0xFF64748B) : Colors.white70,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Overall Health',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Good Condition',
                      style: TextStyle(
                        color: Color(0xFF10B981),
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      'All key systems are working properly.',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                        fontSize: 13,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 2. Systems List Items
              ...systems.map((item) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                  decoration: BoxDecoration(
                    color: isLight ? Colors.white : const Color(0xFF0F1A2E),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                      width: 1.0,
                    ),
                    boxShadow: isLight ? AppTheme.cardShadow : null,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        item['icon'] as IconData,
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                        size: 20,
                      ),
                      const SizedBox(width: 14),
                      Text(
                        item['title'] as String,
                        style: TextStyle(
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const Spacer(),
                      // Green Good status pill
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isLight
                              ? const Color(0xFFD1FAE5)
                              : const Color(0xFF064E3B).withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isLight
                                ? const Color(0xFFA7F3D0)
                                : const Color(0xFF10B981).withValues(alpha: 0.4),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.check,
                              color: isLight ? const Color(0xFF059669) : const Color(0xFF10B981),
                              size: 13,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Good',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF059669) : const Color(0xFF10B981),
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(
                        Icons.chevron_right,
                        color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        size: 18,
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }
}

class _HealthGaugePainter extends CustomPainter {
  final double progress;
  final bool isLight;

  _HealthGaugePainter({required this.progress, required this.isLight});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - 24) / 2;
    const strokeWidth = 14.0;

    // Background track
    final trackPaint = Paint()
      ..color = isLight ? const Color(0xFFE2E8F0) : const Color(0xFF17263C)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, trackPaint);

    // Active progress arc
    final sweepAngle = 2 * math.pi * progress;
    final rect = Rect.fromCircle(center: center, radius: radius);
    final gradient = SweepGradient(
      startAngle: -math.pi / 2,
      endAngle: 3 * math.pi / 2,
      colors: const [
        Color(0xFF0066FF),
        Color(0xFF00C2FF),
        Color(0xFF10B981),
      ],
      stops: const [0.0, 0.45, 1.0],
    );

    final progressPaint = Paint()
      ..shader = gradient.createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      rect,
      -math.pi / 2,
      sweepAngle,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _HealthGaugePainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.isLight != isLight;
}
