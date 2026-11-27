import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum ThemeModeSetting {
  autoTime, // 6:00 AM to 6:00 PM Light, 6:00 PM to 6:00 AM Dark
  light,
  dark,
}

/// Central Theme Engine with automatic time-based switching:
/// - 6:00 AM (06:00) to 6:00 PM (18:00): Light Theme
/// - 6:00 PM (18:00) to 6:00 AM (06:00): Dark Theme
/// Exact Light Theme Figma Gradient:
/// - Stops: 0% (#A3B7FF), 19% (#D2DCFF), 67% (#F7F9FC), 100% (#F7F9FC)
class AppTheme {
  static final ValueNotifier<bool> isLightNotifier = ValueNotifier<bool>(false);
  static bool get isLight => isLightNotifier.value;

  static ThemeModeSetting currentSetting = ThemeModeSetting.autoTime;
  static ThemeModeSetting get mode => currentSetting;
  static Timer? _timer;

  /// Check whether the current time is between 6:00 AM and 6:00 PM
  static bool isDayTime([DateTime? time]) {
    final now = time ?? DateTime.now();
    return now.hour >= 6 && now.hour < 18;
  }

  /// Initialize theme engine from SharedPreferences and schedule auto-timer
  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedMode = prefs.getString('theme_mode_setting');
      if (savedMode == 'light') {
        currentSetting = ThemeModeSetting.light;
      } else if (savedMode == 'dark') {
        currentSetting = ThemeModeSetting.dark;
      } else {
        currentSetting = ThemeModeSetting.autoTime;
      }
    } catch (_) {
      currentSetting = ThemeModeSetting.autoTime;
    }

    _applyTheme();

    // Check every 30 seconds to automatically trigger theme transition on time change
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (currentSetting == ThemeModeSetting.autoTime) {
        final shouldBeLight = isDayTime();
        if (isLightNotifier.value != shouldBeLight) {
          isLightNotifier.value = shouldBeLight;
        }
      }
    });
  }

  static void _applyTheme() {
    switch (currentSetting) {
      case ThemeModeSetting.light:
        isLightNotifier.value = true;
        break;
      case ThemeModeSetting.dark:
        isLightNotifier.value = false;
        break;
      case ThemeModeSetting.autoTime:
        isLightNotifier.value = isDayTime();
        break;
    }
  }

  static Future<void> setThemeSetting(ThemeModeSetting setting) async {
    currentSetting = setting;
    _applyTheme();
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = setting == ThemeModeSetting.light
          ? 'light'
          : setting == ThemeModeSetting.dark
              ? 'dark'
              : 'auto';
      await prefs.setString('theme_mode_setting', str);
    } catch (_) {}
  }

  static Future<void> toggleTheme() async {
    if (isLight) {
      await setThemeSetting(ThemeModeSetting.dark);
    } else {
      await setThemeSetting(ThemeModeSetting.light);
    }
  }

  // --- Design Tokens matching Figma Design ---

  /// Exact Figma linear gradient stops for Light mode:
  /// 0%: A3B7FF, 19%: D2DCFF, 67%: F7F9FC, 100%: F7F9FC
  static const LinearGradient lightBgGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment(0.0, -0.06),
    colors: [
      Color(0xFFA3B7FF), // 0%
      Color(0xFFD2DCFF), // 19%
      Color(0xFFF7F9FC), // 67%
      Color(0xFFF7F9FC), // 100%
    ],
    stops: [0.0, 0.19, 0.67, 1.0],
  );

  /// Dark mode background gradient:
  static const LinearGradient darkBgGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment(0.0, -0.06),
    colors: [
      Color(0xFF111936), // 0%
      Color(0xFF0B1022), // 19%
      Color(0xFF000000), // 67%
      Color(0xFF000000), // 100%
    ],
    stops: [0.0, 0.19, 0.67, 1.0],
  );

  /// Dynamic Top Background Gradient
  static LinearGradient get bgGradient =>
      isLight ? lightBgGradient : darkBgGradient;

  /// Dynamic Scaffold / Body background
  static Color get scaffoldBg =>
      isLight ? const Color(0xFFF7F9FC) : const Color(0xFF0D1117);

  /// Dynamic Surface / Card background
  static Color get cardBg =>
      isLight ? Colors.white : const Color(0xFF101726);

  /// Dynamic Card border
  static Color get cardBorder =>
      isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C);

  /// Dynamic Text Colors
  static Color get textPrimary =>
      isLight ? const Color(0xFF0F172A) : Colors.white;
  static Color get textSecondary =>
      isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE);
  static Color get textMuted =>
      isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

  /// Dynamic Primary Blue Accent
  static Color get primaryColor =>
      isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF);
  static Color get primaryBlue => primaryColor;

  /// Dynamic Bottom Navigation Bar colors
  static Color get navBg =>
      isLight ? Colors.white : const Color(0xFF0B0F12);
  static Color get navUnselected =>
      isLight ? const Color(0xFF64748B) : const Color(0xFF9DB2CE);
  static Color get navSelected =>
      isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF);

  /// Dynamic Input Styling
  static Color get inputBg =>
      isLight ? const Color(0xFFF8FAFC) : const Color(0xFF101726);
  static Color get inputBorder =>
      isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C);

  /// Dynamic Pill / Badge Styling
  static Color get pillBg =>
      isLight ? const Color(0xFFF1F5F9) : const Color(0xFF14243B);
  static Color get pillBorder =>
      isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2E48);

  /// Subtle soft shadow for cards in light mode
  static List<BoxShadow> get cardShadow => isLight
      ? const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 14,
            offset: Offset(0, 4),
          ),
        ]
      : const [];

  /// Settings / Menu Option Card Styling (Color: 0D1728, Shadow: 15233D)
  static Color get settingsCardBg =>
      isLight ? Colors.white : const Color(0xFF0D1728);

  static List<BoxShadow> get settingsCardShadow => isLight
      ? cardShadow
      : const [
          BoxShadow(
            color: Color(0xFF15233D),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ];

  /// Theme Data for MaterialApp
  static ThemeData get lightTheme => ThemeData(
        brightness: Brightness.light,
        scaffoldBackgroundColor: const Color(0xFFF7F9FC),
        fontFamily: 'Inter',
        typography: Typography.material2021(platform: TargetPlatform.android),
        textTheme: Typography.material2021(platform: TargetPlatform.android)
            .black
            .apply(fontFamily: 'Inter'),
        colorScheme: const ColorScheme.light(
          primary: Color(0xFF0066FF),
          secondary: Color(0xFF3875F6),
          surface: Colors.white,
        ),
      );

  static ThemeData get darkTheme => ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF040A18),
        fontFamily: 'Inter',
        typography: Typography.material2021(platform: TargetPlatform.android),
        textTheme: Typography.material2021(platform: TargetPlatform.android)
            .white
            .apply(fontFamily: 'Inter'),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF3875F6),
          secondary: Color(0xFF9E8FFF),
          surface: Color(0xFF101726),
        ),
      );

  /// Show interactive Theme Mode selection dialog
  static void showThemeDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final current = currentSetting;
            final isDay = isDayTime();

            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: isLight
                              ? const Color(0xFFCBD5E1)
                              : const Color(0xFF26354D),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: primaryColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            Icons.brightness_medium_rounded,
                            color: primaryColor,
                            size: 22,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'App Theme',
                              style: TextStyle(
                                color: textPrimary,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Automatic time schedule or manual mode',
                              style: TextStyle(
                                color: textSecondary,
                                fontSize: 12.5,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // Option 1: Automatic
                    _buildThemeDialogOption(
                      title: 'Automatic (Time-wise)',
                      subtitle:
                          '6:00 AM - 6:00 PM (Light) • 6:00 PM - 6:00 AM (Dark)',
                      badgeText: isDay ? 'Currently: Light' : 'Currently: Dark',
                      icon: Icons.schedule_rounded,
                      isSelected: current == ThemeModeSetting.autoTime,
                      onTap: () {
                        setThemeSetting(ThemeModeSetting.autoTime);
                        Navigator.pop(ctx);
                      },
                    ),
                    const SizedBox(height: 10),

                    // Option 2: Always Light
                    _buildThemeDialogOption(
                      title: 'Light Theme',
                      subtitle: 'Always active with Figma light aesthetics',
                      icon: Icons.wb_sunny_rounded,
                      isSelected: current == ThemeModeSetting.light,
                      onTap: () {
                        setThemeSetting(ThemeModeSetting.light);
                        Navigator.pop(ctx);
                      },
                    ),
                    const SizedBox(height: 10),

                    // Option 3: Always Dark
                    _buildThemeDialogOption(
                      title: 'Dark Theme',
                      subtitle: 'Always active with sleek dark aesthetics',
                      icon: Icons.nightlight_round,
                      isSelected: current == ThemeModeSetting.dark,
                      onTap: () {
                        setThemeSetting(ThemeModeSetting.dark);
                        Navigator.pop(ctx);
                      },
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  static Widget _buildThemeDialogOption({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
    String? badgeText,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? (isLight ? const Color(0xFFEDF4FF) : const Color(0xFF13233A))
              : (isLight ? const Color(0xFFF8FAFC) : const Color(0xFF0C1422)),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? primaryColor
                : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B283A)),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? primaryColor : textSecondary,
              size: 22,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 6,
                    runSpacing: 2,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          color: textPrimary,
                          fontSize: 13.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (badgeText != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: primaryColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            badgeText,
                            style: TextStyle(
                              color: primaryColor,
                              fontSize: 9.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: textSecondary,
                      fontSize: 11.5,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected) ...[
              const SizedBox(width: 6),
              Icon(
                Icons.check_circle_rounded,
                color: primaryColor,
                size: 20,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Responsive Scaling System calibrated to Oppo Reno 10 (392.7 dp baseline width).
/// Guarantees identical visual proportions (cards, icons, text, spacing) across
/// Google Pixel, Samsung, Motorola, and other Android devices.
class AppScale {
  /// Reference screen width of Oppo Reno 10 (1080px / 2.75x density ≈ 392.7 dp)
  static const double baselineWidth = 392.7;
  static const double baselineHeight = 877.0;

  /// Returns the width scale factor clamped within safe mobile bounds (0.92 to 1.15)
  static double factor(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width <= 0) return 1.0;
    return (width / baselineWidth).clamp(0.92, 1.15);
  }

  /// Scales a dimension (e.g. card height, icon size) proportionally
  static double scale(BuildContext context, double value) {
    return (value * factor(context)).roundToDouble();
  }

  /// Helper to get screen width
  static double width(BuildContext context) => MediaQuery.sizeOf(context).width;

  /// Helper to get screen height
  static double height(BuildContext context) => MediaQuery.sizeOf(context).height;
}

