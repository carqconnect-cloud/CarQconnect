import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme/app_theme.dart';

class AnimatedBackArrowButton extends StatefulWidget {
  final VoidCallback? onTap;
  final Color? color;
  final double staticWidth;
  final double staticHeight;
  final double width;
  final double height;
  final double spacing;
  final double trailGap;
  final double trailOpacity;
  final String semanticsLabel;
  final Duration animationDuration;

  const AnimatedBackArrowButton({
    super.key,
    this.onTap,
    this.color,
    this.staticWidth = 23.0,
    this.staticHeight = 23.0,
    this.width = 23.0,
    this.height = 23.5,
    this.spacing = 0.1,
    this.semanticsLabel = 'Back',
    this.trailGap = 10.0,
    this.trailOpacity = 0.85,
    this.animationDuration = const Duration(milliseconds: 400),
  });

  @override
  State<AnimatedBackArrowButton> createState() =>
      _AnimatedBackArrowButtonState();
}

class _AnimatedBackArrowButtonState extends State<AnimatedBackArrowButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  bool _isAnimating = false;
  bool _isHandlingTap = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.animationDuration,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTap() {
    if (_isHandlingTap) return;
    _isHandlingTap = true;

    setState(() {
      _isAnimating = true;
    });

    _controller.forward(from: 0.0);

    // Allow the leftward wave animation to play before navigation
    Future.delayed(widget.animationDuration, () {
      if (!mounted) return;

      if (widget.onTap != null) {
        widget.onTap!();
      } else if (Navigator.canPop(context)) {
        Navigator.pop(context);
      }

      // Reset back to static state so future visits to this screen start static
      Future.delayed(const Duration(milliseconds: 300), () {
        if (mounted) {
          setState(() {
            _isAnimating = false;
            _isHandlingTap = false;
          });
          _controller.reset();
        }
      });
    });
  }

  Widget _buildStaticArrow(Color activeColor) {
    return SizedBox(
      key: const ValueKey('static_back_arrow'),
      width: widget.staticWidth,
      height: widget.staticHeight,
      child: Center(
        child: SvgPicture.asset(
          'assets/icons/Back Arrow.svg',
          width: widget.staticWidth,
          height: widget.staticHeight,
          fit: BoxFit.contain,
          colorFilter: ColorFilter.mode(activeColor, BlendMode.srcIn),
        ),
      ),
    );
  }

  Widget _buildChevron(int index, bool isLight, Color activeColor) {
    // index 0 = leftmost, 1 = middle, 2 = rightmost.
    // The wave pulses from right to left: 2 -> 1 -> 0.
    final double peak = 0.20 + (2 - index) * 0.25;
    const double window = 0.22;
    final double t = _controller.value;
    final double diff = (t - peak).abs();

    double curved = 0.0;
    if (diff < window) {
      final double progress = 1.0 - (diff / window);
      curved = (1.0 - math.cos(progress * math.pi)) / 2.0;
    }

    // Lead chevron reaches 1.0, trailing chevrons reach trailOpacity
    final double peakOpacity = index == 0 ? 1.0 : widget.trailOpacity;
    final double opacity =
        (0.25 + (peakOpacity - 0.25) * curved).clamp(0.0, 1.0);
    final double scale = 1.0 + 0.10 * curved;

    return Transform.scale(
      scale: scale,
      child: SizedBox(
        width: widget.width,
        height: widget.height,
        child: Stack(
          alignment: Alignment.center,
          clipBehavior: Clip.none,
          children: [
            // Soft cyan bloom glow behind chevron during peak pulse in dark mode
            if (!isLight && curved > 0.05)
              Transform.scale(
                scale: 1.25,
                child: Opacity(
                  opacity: (0.65 * curved).clamp(0.0, 1.0),
                  child: SvgPicture.asset(
                    'assets/icons/Back Arrow.svg',
                    width: widget.width,
                    height: widget.height,
                    fit: BoxFit.contain,
                    colorFilter: const ColorFilter.mode(
                      Color(0xFF00E5FF),
                      BlendMode.srcIn,
                    ),
                  ),
                ),
              ),
            // Sharp foreground chevron
            Opacity(
              opacity: opacity,
              child: SvgPicture.asset(
                'assets/icons/Back Arrow.svg',
                width: widget.width,
                height: widget.height,
                fit: BoxFit.contain,
                colorFilter: ColorFilter.mode(activeColor, BlendMode.srcIn),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAnimatedChevrons(bool isLight, Color activeColor) {
    final double animWidth = widget.trailGap > 0
        ? widget.width + 2 * widget.trailGap
        : 3 * widget.width + 2 * widget.spacing;

    return SizedBox(
      key: const ValueKey('animated_back_chevrons'),
      width: animWidth,
      height: math.max(widget.staticHeight, widget.height),
      child: Center(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            if (widget.trailGap > 0) {
              return SizedBox(
                width: animWidth,
                height: widget.height,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned(
                      left: widget.trailGap * 2,
                      top: 0,
                      child: _buildChevron(2, isLight, activeColor),
                    ),
                    Positioned(
                      left: widget.trailGap,
                      top: 0,
                      child: _buildChevron(1, isLight, activeColor),
                    ),
                    Positioned(
                      left: 0,
                      top: 0,
                      child: _buildChevron(0, isLight, activeColor),
                    ),
                  ],
                ),
              );
            }

            return Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildChevron(0, isLight, activeColor),
                SizedBox(width: widget.spacing),
                _buildChevron(1, isLight, activeColor),
                SizedBox(width: widget.spacing),
                _buildChevron(2, isLight, activeColor),
              ],
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final Color activeColor = widget.color ?? AppTheme.textPrimary;

        final double containerWidth = math.max(
          widget.staticWidth,
          widget.trailGap > 0
              ? widget.width + 2 * widget.trailGap
              : 3 * widget.width + 2 * widget.spacing,
        );
        final double containerHeight =
            math.max(widget.staticHeight, widget.height);

        return Semantics(
          button: true,
          label: widget.semanticsLabel,
          child: Tooltip(
            message: widget.semanticsLabel,
            child: Material(
              color: Colors.transparent,
              child: InkResponse(
                onTap: _handleTap,
                radius: math.max(containerWidth, containerHeight) / 2 + 4,
                containedInkWell: false,
                customBorder: const CircleBorder(),
                splashColor: const Color(0xFF00E5FF).withValues(alpha: 0.2),
                highlightColor: const Color(0xFF00E5FF).withValues(alpha: 0.1),
                child: SizedBox(
                  width: containerWidth,
                  height: containerHeight,
                  child: Center(
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 200),
                      switchInCurve: Curves.easeOut,
                      switchOutCurve: Curves.easeIn,
                      transitionBuilder: (child, animation) {
                        return FadeTransition(
                          opacity: animation,
                          child: ScaleTransition(
                            scale: Tween<double>(
                              begin: 0.90,
                              end: 1.0,
                            ).animate(animation),
                            child: child,
                          ),
                        );
                      },
                      child: _isAnimating
                          ? _buildAnimatedChevrons(isLight, activeColor)
                          : _buildStaticArrow(activeColor),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
