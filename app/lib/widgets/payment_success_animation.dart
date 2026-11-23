import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Google Pay & PhonePe style payment success badge with elastic pop-up,
/// expanding sonar ripple waves, glowing green circle, bouncy checkmark,
/// celebratory confetti burst, and haptic feedback.
class GooglePaySuccessBadge extends StatefulWidget {
  final double size;
  final double circleDiameter;
  final Color primaryColor;
  final Color checkColor;
  final IconData icon;
  final bool showRipples;
  final bool showConfetti;
  final bool enableHaptics;
  final VoidCallback? onAnimationComplete;

  const GooglePaySuccessBadge({
    super.key,
    this.size = 170,
    this.circleDiameter = 82,
    this.primaryColor = const Color(0xFF00C853),
    this.checkColor = Colors.white,
    this.icon = Icons.check_rounded,
    this.showRipples = true,
    this.showConfetti = true,
    this.enableHaptics = true,
    this.onAnimationComplete,
  });

  @override
  State<GooglePaySuccessBadge> createState() => _GooglePaySuccessBadgeState();
}

class _GooglePaySuccessBadgeState extends State<GooglePaySuccessBadge>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _circleScaleAnim;
  late final Animation<double> _ripple1ScaleAnim;
  late final Animation<double> _ripple1OpacityAnim;
  late final Animation<double> _ripple2ScaleAnim;
  late final Animation<double> _ripple2OpacityAnim;
  late final Animation<double> _checkScaleAnim;
  late final Animation<double> _checkRotateAnim;
  late final Animation<double> _confettiAnim;

  bool _hasTriggeredHaptic = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );

    // 1. Central Circle: Pops up with energetic spring/elastic curve
    _circleScaleAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.08, 0.62, curve: Curves.elasticOut),
      ),
    );

    // 2. Ripple 1: Expanding Sonar Ring
    _ripple1ScaleAnim = Tween<double>(begin: 0.8, end: 1.85).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.22, 0.78, curve: Curves.easeOutCubic),
      ),
    );
    _ripple1OpacityAnim = Tween<double>(begin: 0.65, end: 0.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.22, 0.78, curve: Curves.easeOut),
      ),
    );

    // 3. Ripple 2: Secondary Sonar Ring
    _ripple2ScaleAnim = Tween<double>(begin: 0.7, end: 2.1).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.32, 0.92, curve: Curves.easeOutCubic),
      ),
    );
    _ripple2OpacityAnim = Tween<double>(begin: 0.45, end: 0.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.32, 0.92, curve: Curves.easeOut),
      ),
    );

    // 4. White Checkmark: Bouncy entrance after circle appears
    _checkScaleAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.38, 0.82, curve: Curves.easeOutBack),
      ),
    );
    _checkRotateAnim = Tween<double>(begin: -0.25, end: 0.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.38, 0.75, curve: Curves.easeOut),
      ),
    );

    // 5. Confetti explosion burst
    _confettiAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.25, 0.95, curve: Curves.easeOutCubic),
      ),
    );

    _controller.addListener(() {
      if (widget.enableHaptics && !_hasTriggeredHaptic && _controller.value >= 0.3) {
        _hasTriggeredHaptic = true;
        HapticFeedback.mediumImpact();
      }
    });

    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        widget.onAnimationComplete?.call();
      }
    });

    // Start after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final double radius = widget.circleDiameter / 2;

    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Stack(
            alignment: Alignment.center,
            clipBehavior: Clip.none,
            children: [
              // Confetti burst particles
              if (widget.showConfetti)
                _buildConfettiParticles(_confettiAnim.value),

              // Expanding Ripple Wave 2 (Outer)
              if (widget.showRipples && _ripple2OpacityAnim.value > 0.01)
                Transform.scale(
                  scale: _ripple2ScaleAnim.value,
                  child: Container(
                    width: widget.circleDiameter,
                    height: widget.circleDiameter,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: widget.primaryColor.withValues(
                          alpha: _ripple2OpacityAnim.value.clamp(0.0, 1.0),
                        ),
                        width: 2.2,
                      ),
                    ),
                  ),
                ),

              // Expanding Ripple Wave 1 (Inner)
              if (widget.showRipples && _ripple1OpacityAnim.value > 0.01)
                Transform.scale(
                  scale: _ripple1ScaleAnim.value,
                  child: Container(
                    width: widget.circleDiameter,
                    height: widget.circleDiameter,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: widget.primaryColor.withValues(
                        alpha: (_ripple1OpacityAnim.value * 0.28).clamp(0.0, 1.0),
                      ),
                      border: Border.all(
                        color: widget.primaryColor.withValues(
                          alpha: _ripple1OpacityAnim.value.clamp(0.0, 1.0),
                        ),
                        width: 2.8,
                      ),
                    ),
                  ),
                ),

              // Central Vibrant Glowing Green Circle
              Transform.scale(
                scale: _circleScaleAnim.value.clamp(0.0, 1.4),
                child: Container(
                  width: widget.circleDiameter,
                  height: widget.circleDiameter,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        widget.primaryColor,
                        HSLColor.fromColor(widget.primaryColor)
                            .withLightness(
                              (HSLColor.fromColor(widget.primaryColor).lightness - 0.08)
                                  .clamp(0.0, 1.0),
                            )
                            .toColor(),
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: widget.primaryColor.withValues(
                          alpha: (_circleScaleAnim.value * 0.5).clamp(0.0, 0.6),
                        ),
                        blurRadius: 32,
                        spreadRadius: 4,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Transform.rotate(
                      angle: _checkRotateAnim.value,
                      child: Transform.scale(
                        scale: _checkScaleAnim.value.clamp(0.0, 1.5),
                        child: Icon(
                          widget.icon,
                          color: widget.checkColor,
                          size: radius * 1.05,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildConfettiParticles(double progress) {
    if (progress <= 0.01) return const SizedBox.shrink();

    // 12 particles positioned radially
    const colors = [
      Color(0xFFFBBF24), // Gold
      Color(0xFF00C2FF), // Cyan
      Color(0xFFF87171), // Coral
      Color(0xFF34D399), // Mint
      Color(0xFFA855F7), // Purple
      Color(0xFFFB923C), // Orange
      Color(0xFF60A5FA), // Sky blue
      Color(0xFFF43F5E), // Rose
      Color(0xFFFDE047), // Yellow
      Color(0xFF10B981), // Emerald
      Color(0xFFC084FC), // Lavender
      Color(0xFF38BDF8), // Light Cyan
    ];

    final isPill = [
      true, false, true, false, true, false,
      true, false, true, false, true, false,
    ];

    final children = <Widget>[];

    for (int i = 0; i < 12; i++) {
      final angle = (i * (2 * math.pi / 12)) + 0.2;
      // Burst outwards from center to radius ~56..78
      final baseDist = 38.0 + (i % 3) * 14.0;
      final currentDist = baseDist * progress;
      final x = math.cos(angle) * currentDist;
      final y = math.sin(angle) * currentDist;
      final opacity = (1.0 - progress * 0.5).clamp(0.0, 1.0);
      final rotation = angle + (progress * math.pi * 0.5);

      children.add(
        Transform.translate(
          offset: Offset(x, y),
          child: Transform.rotate(
            angle: rotation,
            child: Opacity(
              opacity: opacity,
              child: isPill[i]
                  ? Container(
                      width: 5 + (i % 3) * 2.0,
                      height: 10 + (i % 2) * 4.0,
                      decoration: BoxDecoration(
                        color: colors[i % colors.length],
                        borderRadius: BorderRadius.circular(3),
                      ),
                    )
                  : Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: colors[i % colors.length],
                        shape: BoxShape.circle,
                      ),
                    ),
            ),
          ),
        ),
      );
    }

    return Stack(alignment: Alignment.center, children: children);
  }
}

/// Staggered Slide + Pop animation for payment success contents
/// (e.g. "Payment Successful!" text, amount, details card, buttons).
class StaggeredPopUp extends StatefulWidget {
  final Widget child;
  final Duration delay;
  final Duration duration;
  final Offset slideOffset;
  final Curve curve;

  const StaggeredPopUp({
    super.key,
    required this.child,
    this.delay = const Duration(milliseconds: 250),
    this.duration = const Duration(milliseconds: 650),
    this.slideOffset = const Offset(0, 0.12),
    this.curve = Curves.easeOutBack,
  });

  @override
  State<StaggeredPopUp> createState() => _StaggeredPopUpState();
}

class _StaggeredPopUpState extends State<StaggeredPopUp>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animController;
  late final Animation<double> _scaleAnimation;
  late final Animation<double> _opacityAnimation;
  late final Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: widget.duration,
    );

    _scaleAnimation = Tween<double>(begin: 0.90, end: 1.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: widget.curve,
      ),
    );

    _opacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.0, 0.65, curve: Curves.easeOut),
      ),
    );

    _slideAnimation = Tween<Offset>(
      begin: widget.slideOffset,
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _animController,
        curve: Curves.easeOutCubic,
      ),
    );

    Future.delayed(widget.delay, () {
      if (mounted) _animController.forward();
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animController,
      builder: (context, child) {
        return SlideTransition(
          position: _slideAnimation,
          child: Transform.scale(
            scale: _scaleAnimation.value,
            child: Opacity(
              opacity: _opacityAnimation.value.clamp(0.0, 1.0),
              child: child,
            ),
          ),
        );
      },
      child: widget.child,
    );
  }
}

