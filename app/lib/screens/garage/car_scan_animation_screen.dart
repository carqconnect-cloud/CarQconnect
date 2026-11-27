import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'vehicle_tabs.dart';
import '../../widgets/animated_back_arrow.dart';

/// Screen displaying the exact "Checking Vehicle Health" scan interface
/// with concentric radar rings, rotating glowing cyan scanner arc,
/// real-time car x-ray laser scan animation, and live status.
class CarScanAnimationScreen extends StatefulWidget {
  final String vehicleName;
  final String vehiclePlate;
  final VoidCallback? onScanComplete;

  const CarScanAnimationScreen({
    super.key,
    this.vehicleName = 'Hyundai Creta',
    this.vehiclePlate = 'MP 09 AB 1234',
    this.onScanComplete,
  });

  @override
  State<CarScanAnimationScreen> createState() => _CarScanAnimationScreenState();
}

class _CarScanAnimationScreenState extends State<CarScanAnimationScreen>
    with TickerProviderStateMixin {
  // 1. Controller for rotating the glowing cyan radar arc around the car
  late AnimationController _rotationController;

  // 2. Controller for laser sweep moving up and down across the car
  late AnimationController _laserController;
  late Animation<double> _laserAnimation;

  // 3. Controller for overall scan progress from 0% to 100%
  late AnimationController _scanProgressController;

  bool _isScanFinished = false;

  final List<String> _frameAssets = [
    'assets/images/car_scan_frame_0.png', // Exterior solid car
    'assets/images/car_scan_frame_1.png', // Translucent
    'assets/images/car_scan_frame_2.png', // Glass/interior
    'assets/images/car_scan_frame_3.png', // Chassis
    'assets/images/car_scan_frame_4.png', // Drivetrain/x-ray
    'assets/images/car_scan_frame_5.png', // Laser x-ray
  ];

  @override
  void initState() {
    super.initState();

    // 1. Continuous smooth rotation for the cyan scanner arc (3 seconds per full loop)
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3200),
    )..repeat();

    // 2. Oscillating laser beam sweeping from hood to trunk
    _laserController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );
    _laserAnimation = Tween<double>(begin: 0.05, end: 0.95).animate(
      CurvedAnimation(parent: _laserController, curve: Curves.easeInOut),
    );
    _laserController.repeat(reverse: true);

    // 3. Overall scan progress (completes in ~4.5 seconds)
    _scanProgressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4500),
    );

    _scanProgressController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        setState(() {
          _isScanFinished = true;
        });
        if (widget.onScanComplete != null) {
          widget.onScanComplete!();
        }
      }
    });

    _scanProgressController.forward();
  }

  @override
  void dispose() {
    _rotationController.dispose();
    _laserController.dispose();
    _scanProgressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            gradient: isLight
                ? AppTheme.bgGradient
                : const RadialGradient(
                    center: Alignment(0.0, 0.05),
                    radius: 0.85,
                    colors: [
                      Color(0xFF0A1326),
                      Color(0xFF060913),
                    ],
                    stops: [0.0, 1.0],
                  ),
          ),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            body: SafeArea(
              child: Column(
                children: [
                  // 1. Top Bar: Subtle Back / Close button
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                        const Spacer(),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // 2. Headline: "Checking Vehicle Health"
                  RichText(
                    textAlign: TextAlign.center,
                    text: TextSpan(
                      children: [
                        TextSpan(
                          text: 'Checking ',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.4,
                          ),
                        ),
                        const TextSpan(
                          text: 'Vehicle Health',
                          style: TextStyle(
                            color: Color(0xFF0066FF),
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),

                  // 3. Subhead: "Analyzing your Vehicle data to get everything ready."
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 36),
                    child: Text(
                      'Analyzing your Vehicle data to get everything ready.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF7A899C),
                        fontSize: 14.5,
                        height: 1.35,
                        letterSpacing: -0.1,
                      ),
                    ),
                  ),

                  // 4. Center Stage: Concentric Radar Rings + Rotating Cyan Arc + Top-down Car with Laser Scan
                  Expanded(
                    child: Center(
                      child: LayoutBuilder(
                        builder: (context, constraints) {
                          final stageSize = math.min(constraints.maxWidth, constraints.maxHeight) * 0.95;
                          final carHeight = math.min(320.0, stageSize * 0.78);
                          final carWidth = carHeight * (170.0 / 295.0);

                          return SizedBox(
                            width: stageSize,
                            height: stageSize,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                // Concentric Radar Rings & Rotating Cyan Arc
                                AnimatedBuilder(
                                  animation: _rotationController,
                                  builder: (context, _) {
                                    return CustomPaint(
                                      size: Size(stageSize, stageSize),
                                      painter: _RadarConcentricPainter(
                                        rotationAngle: _rotationController.value * 2 * math.pi,
                                        isLight: isLight,
                                      ),
                                    );
                                  },
                                ),

                                // Top-down Car with Real-time Laser X-Ray Scan
                                AnimatedBuilder(
                                  animation: _laserAnimation,
                                  builder: (context, _) {
                                    final laserY = _laserAnimation.value;

                                    return SizedBox(
                                      width: carWidth,
                                      height: carHeight,
                                      child: Stack(
                                        alignment: Alignment.center,
                                        children: [
                                          // Layer 1: Exterior Solid Car (Frame 0)
                                          Image.asset(
                                            _frameAssets[0],
                                            width: carWidth,
                                            height: carHeight,
                                            fit: BoxFit.contain,
                                          ),

                                          // Layer 2: Revealing X-Ray Layer (Frame 4) clipped under the laser line
                                          ClipRect(
                                            clipper: _VerticalLaserClipper(fraction: laserY),
                                            child: Image.asset(
                                              _frameAssets[4],
                                              width: carWidth,
                                              height: carHeight,
                                              fit: BoxFit.contain,
                                            ),
                                          ),

                                          // Layer 3: Vibrant Glowing Laser Beam Line
                                          Positioned(
                                            top: (carHeight * laserY) - 4,
                                            left: -8,
                                            right: -8,
                                            child: _buildLaserBeamWidget(),
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ),

                  // 5. Bottom Status Area: "This may take a few moments" OR Completion Card
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 36),
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 350),
                      child: _isScanFinished
                          ? _buildScanFinishedContent(isLight)
                          : _buildScanningMomentsRow(isLight),
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

  // Bottom row while scanning: "⌛ This may take a few moments"
  Widget _buildScanningMomentsRow(bool isLight) {
    return Row(
      key: const ValueKey('scanning_state'),
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.hourglass_empty_rounded,
          color: isLight ? const Color(0xFF64748B) : const Color(0xFF6B7C93),
          size: 16,
        ),
        const SizedBox(width: 8),
        Text(
          'This may take a few moments',
          style: TextStyle(
            color: isLight ? const Color(0xFF64748B) : const Color(0xFF6B7C93),
            fontSize: 13.5,
            fontWeight: FontWeight.w400,
            letterSpacing: 0.1,
          ),
        ),
      ],
    );
  }

  // Bottom action buttons when scan reaches 100%
  Widget _buildScanFinishedContent(bool isLight) {
    return Column(
      key: const ValueKey('finished_state'),
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(
              Icons.check_circle_rounded,
              color: Color(0xFF10B981),
              size: 18,
            ),
            SizedBox(width: 8),
            Text(
              'Vehicle Health: 100% Optimal',
              style: TextStyle(
                color: Color(0xFF10B981),
                fontSize: 14.5,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (context) => VehicleTabsScreen(
                          vehicleName: widget.vehicleName,
                          vehiclePlate: widget.vehiclePlate,
                          initialTabIndex: 2,
                        ),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0066FF),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'View Live Telemetry',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(width: 6),
                      Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            SizedBox(
              height: 48,
              child: OutlinedButton(
                onPressed: () => Navigator.pop(context),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
                child: Text(
                  'Done',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // Glowing laser sweep bar with electric gradient flare
  Widget _buildLaserBeamWidget() {
    return Container(
      height: 7,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.transparent,
            const Color(0xFF0066FF).withValues(alpha: 0.35),
            const Color(0xFF00C2FF),
            Colors.white,
            const Color(0xFF00C2FF),
            const Color(0xFF0066FF).withValues(alpha: 0.35),
            Colors.transparent,
          ],
          stops: const [0.0, 0.15, 0.42, 0.5, 0.58, 0.85, 1.0],
        ),
      ),
    );
  }
}

/// Custom vertical clipper for laser sweep: reveals top down to the laser line
class _VerticalLaserClipper extends CustomClipper<Rect> {
  final double fraction;

  _VerticalLaserClipper({required this.fraction});

  @override
  Rect getClip(Size size) {
    return Rect.fromLTRB(0, 0, size.width, size.height * fraction);
  }

  @override
  bool shouldReclip(_VerticalLaserClipper oldClipper) {
    return oldClipper.fraction != fraction;
  }
}

/// Custom painter for the concentric dashed rings and the rotating glowing arc tracer
class _RadarConcentricPainter extends CustomPainter {
  final double rotationAngle;
  final bool isLight;

  _RadarConcentricPainter({required this.rotationAngle, required this.isLight});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    // 3 Concentric Ring Radii
    final r1 = size.width * 0.28;
    final r2 = size.width * 0.40;
    final r3 = size.width * 0.51;

    void drawDashedCircle(double radius, Color color, double strokeWidth) {
      final paint = Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth;

      const dashWidth = 3.5;
      const dashSpace = 4.5;
      final circumference = 2 * math.pi * radius;
      final dashCount = (circumference / (dashWidth + dashSpace)).floor();
      final sweepAngle = (dashWidth / circumference) * 2 * math.pi;

      for (int i = 0; i < dashCount; i++) {
        final startAngle = i * ((dashWidth + dashSpace) / circumference) * 2 * math.pi;
        canvas.drawArc(
          Rect.fromCircle(center: center, radius: radius),
          startAngle,
          sweepAngle,
          false,
          paint,
        );
      }
    }

    // 1. Draw 3 concentric dashed rings
    drawDashedCircle(r1, isLight ? const Color(0xFFCBD5E1) : const Color(0xFF101B2E), 1.0);
    drawDashedCircle(r2, isLight ? const Color(0xFF94A3B8) : const Color(0xFF14243D), 1.2);
    drawDashedCircle(r3, isLight ? const Color(0xFFE2E8F0) : const Color(0xFF0C1628), 1.0);

    // 2. Draw rotating glowing scanner arc on middle circle (r2)
    final arcRect = Rect.fromCircle(center: center, radius: r2);
    const arcSweep = math.pi * 0.42;

    final glowPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.8
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5)
      ..shader = SweepGradient(
        startAngle: 0,
        endAngle: arcSweep,
        colors: [
          Colors.transparent,
          const Color(0xFF0066FF).withValues(alpha: isLight ? 0.4 : 0.7),
          const Color(0xFF00C2FF),
        ],
        stops: const [0.0, 0.65, 1.0],
        transform: GradientRotation(rotationAngle),
      ).createShader(arcRect);

    canvas.drawArc(arcRect, rotationAngle, arcSweep, false, glowPaint);

    final corePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..shader = SweepGradient(
        startAngle: 0,
        endAngle: arcSweep,
        colors: [
          Colors.transparent,
          const Color(0xFF0066FF),
          Colors.white,
        ],
        stops: const [0.0, 0.75, 1.0],
        transform: GradientRotation(rotationAngle),
      ).createShader(arcRect);

    canvas.drawArc(arcRect, rotationAngle, arcSweep, false, corePaint);
  }

  @override
  bool shouldRepaint(_RadarConcentricPainter oldDelegate) {
    return oldDelegate.rotationAngle != rotationAngle || oldDelegate.isLight != isLight;
  }
}
