import 'package:flutter/material.dart';

/// Pixel-perfect Toggle Switch matching Figma specification:
/// - Track: 44px × 24px, Radius: 9999px
/// - Off Color: #9AA0A6 (color/grey/63)
/// - On Color: #00C2FF
/// - Thumb: 20px × 20px, #FFFFFF, Drop shadow (0, 1, 2, 0.2 alpha)
/// - Padding: 2px around thumb
class AppToggleSwitch extends StatelessWidget {
  final bool value;
  final ValueChanged<bool>? onChanged;
  final Color activeTrackColor;
  final Color inactiveTrackColor;
  final Color thumbColor;
  final double width;
  final double height;
  final double thumbSize;

  const AppToggleSwitch({
    super.key,
    required this.value,
    required this.onChanged,
    this.activeTrackColor = const Color(0xFF00C2FF),
    this.inactiveTrackColor = const Color(0xFF9AA0A6),
    this.thumbColor = Colors.white,
    this.width = 44.0,
    this.height = 24.0,
    this.thumbSize = 20.0,
  });

  @override
  Widget build(BuildContext context) {
    final double padding = (height - thumbSize) / 2; // (24 - 20) / 2 = 2.0px

    return Semantics(
      toggled: value,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onChanged != null ? () => onChanged!(!value) : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          width: width,
          height: height,
          padding: EdgeInsets.all(padding),
          decoration: BoxDecoration(
            color: value ? activeTrackColor : inactiveTrackColor,
            borderRadius: BorderRadius.circular(height / 2),
          ),
          child: AnimatedAlign(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            alignment: value ? Alignment.centerRight : Alignment.centerLeft,
            child: Container(
              width: thumbSize,
              height: thumbSize,
              decoration: BoxDecoration(
                color: thumbColor,
                shape: BoxShape.circle,
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x33000000), // Drop shadow X:0, Y:1, Blur:2
                    blurRadius: 2,
                    offset: Offset(0, 1),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
