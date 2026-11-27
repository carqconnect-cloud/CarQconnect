import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../theme/app_theme.dart';

/// Reusable CarQConnect Logo Widget.
///
/// Automatically switches between dark mode (white + electric cyan)
/// and light mode (black + electric cyan) or allows manual override.
class AppLogo extends StatelessWidget {
  final double? width;
  final double? height;
  final BoxFit fit;
  final bool? isLight;

  const AppLogo({
    super.key,
    this.width = 44,
    this.height = 36,
    this.fit = BoxFit.contain,
    this.isLight,
  });

  @override
  Widget build(BuildContext context) {
    final light = isLight ?? (Theme.of(context).brightness == Brightness.light);
    final assetPath = light
        ? 'assets/carqconnectlogo/Logo.svg'
        : 'assets/carqconnectlogo/Logo_white.svg';

    return SvgPicture.asset(
      assetPath,
      width: width,
      height: height,
      fit: fit,
    );
  }
}

/// A glowing branded shield/squircle badge containing the [AppLogo].
/// Used prominently at the top of authentication, onboarding, and profile headers.
class AppLogoBadge extends StatelessWidget {
  final double width;
  final double height;
  final double logoWidth;
  final double logoHeight;
  final bool? isLight;
  final BorderRadiusGeometry? borderRadius;

  const AppLogoBadge({
    super.key,
    this.width = 64,
    this.height = 74,
    this.logoWidth = 44,
    this.logoHeight = 36,
    this.isLight,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final light = isLight ?? (Theme.of(context).brightness == Brightness.light);
    final primaryCyan = const Color(0xFF00C2FF);

    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: light ? const Color(0xFFEBF1FF) : const Color(0xFF071224),
        border: Border.all(
          color: light ? AppTheme.primaryBlue : primaryCyan,
          width: 2.0,
        ),
        borderRadius: borderRadius ??
            const BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
              bottomLeft: Radius.circular(32),
              bottomRight: Radius.circular(32),
            ),
      ),
      child: Center(
        child: AppLogo(
          width: logoWidth,
          height: logoHeight,
          isLight: light,
        ),
      ),
    );
  }
}
