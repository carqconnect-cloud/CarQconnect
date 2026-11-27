import 'dart:async';
import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class ConnectingObdScreen extends StatefulWidget {
  final ValueChanged<bool>? onConnectionComplete;

  const ConnectingObdScreen({
    super.key,
    this.onConnectionComplete,
  });

  @override
  State<ConnectingObdScreen> createState() => _ConnectingObdScreenState();
}

class _ConnectingObdScreenState extends State<ConnectingObdScreen>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _dotsController;
  Timer? _stepTimer1;
  Timer? _stepTimer2;
  Timer? _stepTimer3;
  Timer? _finishTimer;

  // Connection steps: 0 = Searching, 1 = Pairing, 2 = Vehicle, 3 = Monitoring, 4 = Done
  int _currentStep = 1;
  bool _isCancelled = false;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    _dotsController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();

    _startConnectionSimulation();
  }

  void _startConnectionSimulation() {
    _stepTimer1 = Timer(const Duration(milliseconds: 2500), () {
      if (mounted && !_isCancelled) {
        setState(() => _currentStep = 2);
      }
    });

    _stepTimer2 = Timer(const Duration(milliseconds: 4500), () {
      if (mounted && !_isCancelled) {
        setState(() => _currentStep = 3);
      }
    });

    _stepTimer3 = Timer(const Duration(milliseconds: 6200), () {
      if (mounted && !_isCancelled) {
        setState(() => _currentStep = 4);
      }
    });

    _finishTimer = Timer(const Duration(milliseconds: 7200), () {
      if (mounted && !_isCancelled) {
        _handleSuccess();
      }
    });
  }

  void _handleSuccess() {
    widget.onConnectionComplete?.call(true);
    if (mounted) {
      final isLight = AppTheme.isLightNotifier.value;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 20),
              const SizedBox(width: 10),
              Text(
                'OBD device connected successfully!',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          duration: const Duration(seconds: 2),
        ),
      );
      Navigator.pop(context, true);
    }
  }

  void _handleCancel() {
    _isCancelled = true;
    _stepTimer1?.cancel();
    _stepTimer2?.cancel();
    _stepTimer3?.cancel();
    _finishTimer?.cancel();
    widget.onConnectionComplete?.call(false);
    Navigator.pop(context, false);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _dotsController.dispose();
    _stepTimer1?.cancel();
    _stepTimer2?.cancel();
    _stepTimer3?.cancel();
    _finishTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            gradient: AppTheme.bgGradient,
          ),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            body: SafeArea(
              child: Column(
                children: [
                  const SizedBox(height: 12),

                  // Center Illustration & Header
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        children: [
                          const SizedBox(height: 28),

                          // Circular Neon Ring Graphic with 3D OBD Device
                          _buildGlowingDeviceRing(isLight),

                          const SizedBox(height: 36),

                          // Title: Connecting to OBD device...
                          Text(
                            'Connecting to OBD device...',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              letterSpacing: -0.3,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 10),

                          // Subtitle
                          Text(
                            'Make sure your device is powered on\nand nearby.',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8B9CB5),
                              fontSize: 14,
                              height: 1.4,
                            ),
                            textAlign: TextAlign.center,
                          ),

                          const SizedBox(height: 36),

                          // Stepper Connection Progress Card
                          _buildProgressCard(isLight),

                          const SizedBox(height: 20),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Cancel Connection Button
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _handleCancel,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isLight ? Colors.white : const Color(0xFF0A1224),
                          foregroundColor: isLight ? const Color(0xFF0F172A) : Colors.white,
                          elevation: isLight ? 1 : 0,
                          side: BorderSide(
                            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B2B4C),
                            width: 1.0,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(26),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.bluetooth,
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Cancel Connection',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.1,
                              ),
                            ),
                          ],
                        ),
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

  // Circular Neon Ring with Angled OBD Dongle
  Widget _buildGlowingDeviceRing(bool isLight) {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        final scale = 1.0 + (_pulseController.value * 0.025);

        return Stack(
          alignment: Alignment.center,
          children: [
            // Ambient ring
            Container(
              width: 190 * scale,
              height: 190 * scale,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
              ),
            ),

            // High-resolution cropped OBD Ring from Figma
            Image.asset(
              'assets/homescreensicons/obd_ring_perfect.png',
              width: 210,
              height: 210,
              fit: BoxFit.contain,
            ),
          ],
        );
      },
    );
  }

  // 4-Step Stepper Progress Card
  Widget _buildProgressCard(bool isLight) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF081226).withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1A2846),
          width: 1.0,
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Column(
        children: [
          // Step 1: Searching for device
          _buildStepRow(
            isLight: isLight,
            stepIndex: 0,
            title: 'Searching for device',
            trailing: const Icon(
              Icons.bluetooth,
              color: Color(0xFF0066FF),
              size: 20,
            ),
          ),

          // Connecting line 1 -> 2
          _buildVerticalConnectingLine(isDone: _currentStep >= 1, isLight: isLight),

          // Step 2: Pairing with OBD device
          _buildStepRow(
            isLight: isLight,
            stepIndex: 1,
            title: 'Pairing with OBD device',
            trailing: _buildThreeDots(),
          ),

          // Connecting line 2 -> 3
          _buildVerticalConnectingLine(isDone: _currentStep >= 2, isLight: isLight),

          // Step 3: Connecting to vehicle
          _buildStepRow(
            isLight: isLight,
            stepIndex: 2,
            title: 'Connecting to vehicle',
            trailing: Icon(
              Icons.directions_car_outlined,
              color: _currentStep >= 2
                  ? const Color(0xFF0066FF)
                  : (isLight ? const Color(0xFFCBD5E1) : const Color(0xFF384B66)),
              size: 20,
            ),
          ),

          // Connecting line 3 -> 4
          _buildVerticalConnectingLine(isDone: _currentStep >= 3, isLight: isLight),

          // Step 4: Setting up real-time monitoring
          _buildStepRow(
            isLight: isLight,
            stepIndex: 3,
            title: 'Setting up real-time monitoring',
            trailing: Icon(
              Icons.bar_chart_rounded,
              color: _currentStep >= 3
                  ? const Color(0xFF0066FF)
                  : (isLight ? const Color(0xFFCBD5E1) : const Color(0xFF384B66)),
              size: 20,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepRow({
    required bool isLight,
    required int stepIndex,
    required String title,
    required Widget trailing,
  }) {
    final bool isCompleted = _currentStep > stepIndex;
    final bool isActive = _currentStep == stepIndex;

    return Row(
      children: [
        // Left Indicator Icon
        SizedBox(
          width: 26,
          height: 26,
          child: Center(
            child: isCompleted
                ? Container(
                    width: 24,
                    height: 24,
                    decoration: const BoxDecoration(
                      color: Color(0xFF0066FF),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check,
                      color: Colors.white,
                      size: 15,
                    ),
                  )
                : isActive
                    ? Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: const Color(0xFF0066FF),
                            width: 2.2,
                          ),
                        ),
                        child: Center(
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Color(0xFF0066FF),
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      )
                    : Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF22314E),
                            width: 1.8,
                          ),
                        ),
                      ),
          ),
        ),

        const SizedBox(width: 14),

        // Title
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              color: isCompleted || isActive
                  ? (isLight ? const Color(0xFF0F172A) : Colors.white)
                  : (isLight ? const Color(0xFF94A3B8) : const Color(0xFF6B7E99)),
              fontSize: 14.5,
              fontWeight:
                  isCompleted || isActive ? FontWeight.w500 : FontWeight.w400,
            ),
          ),
        ),

        // Trailing status indicator
        trailing,
      ],
    );
  }

  Widget _buildVerticalConnectingLine({required bool isDone, required bool isLight}) {
    return Container(
      margin: const EdgeInsets.only(left: 12),
      alignment: Alignment.centerLeft,
      child: Container(
        width: 2,
        height: 22,
        color: isDone
            ? const Color(0xFF0066FF)
            : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B2B44)),
      ),
    );
  }

  Widget _buildThreeDots() {
    if (_currentStep != 1) {
      return const Icon(
        Icons.check,
        color: Color(0xFF0066FF),
        size: 20,
      );
    }

    return AnimatedBuilder(
      animation: _dotsController,
      builder: (context, child) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (index) {
            final double phase = (_dotsController.value * 3 - index) % 3;
            final double opacity = phase < 1.0 ? 0.3 + 0.7 * phase : 0.3;
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 2),
              width: 5,
              height: 5,
              decoration: BoxDecoration(
                color: const Color(0xFF0066FF).withValues(alpha: opacity.clamp(0.2, 1.0)),
                shape: BoxShape.circle,
              ),
            );
          }),
        );
      },
    );
  }
}
