import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../utils/app_icons.dart';
import '../../theme/app_theme.dart';
import '../../widgets/animated_back_arrow.dart';

/// Screen displayed when the vehicle's GPS is not connected.
/// Supports both dynamic Light and Dark themes.
class NoGpsScreen extends StatelessWidget {
  final VoidCallback? onBack;
  final VoidCallback? onSwitchVehicle;
  final VoidCallback? onConnectGps;
  final VoidCallback? onNotificationTap;
  final String vehicleName;
  final String vehicleRegNumber;
  final String lastSyncedText;
  final String? vehicleImageUrl;

  const NoGpsScreen({
    super.key,
    this.onBack,
    this.onSwitchVehicle,
    this.onConnectGps,
    this.onNotificationTap,
    this.vehicleName = 'Hyundai Creta',
    this.vehicleRegNumber = 'MP 09 AB 1234',
    this.lastSyncedText = 'Last synced 2 min ago',
    this.vehicleImageUrl,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final textPrimary =
            isLight ? const Color(0xFF0F172A) : Colors.white;
        final textSecondary =
            isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE);
        final cardBg =
            isLight ? Colors.white : const Color(0xFF09121E);
        final cardBorder =
            isLight ? const Color(0xFFE2E8F0) : const Color(0xFF16253A);
        final primaryColor =
            isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF);

        return Scaffold(
          backgroundColor:
              isLight ? const Color(0xFFF8FAFC) : const Color(0xFF090E17),
          body: Container(
            decoration: BoxDecoration(
              gradient: isLight ? AppTheme.bgGradient : null,
              color: isLight ? null : const Color(0xFF090E17),
            ),
            child: SafeArea(
              child: Column(
                children: [
                  // 1. Top App Bar: Back, "Track", Notification Bell
                  _buildTopAppBar(context, isLight, textPrimary, primaryColor),

                  // 2. Scrollable Body
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 10),

                          // Top Vehicle Card
                          _buildVehicleCard(
                            context,
                            isLight,
                            cardBg,
                            cardBorder,
                            textPrimary,
                            textSecondary,
                          ),

                          const SizedBox(height: 38),

                          // Center Disconnected GPS Illustration
                          _buildNoGpsIllustration(isLight),

                          const SizedBox(height: 22),

                          // Heading
                          _buildHeading(textPrimary),

                          const SizedBox(height: 8),

                          // Subtitle
                          _buildSubtitle(textSecondary),

                          const SizedBox(height: 26),

                          // Connect GPS Button
                          _buildConnectGpsButton(context, isLight, primaryColor),

                          const SizedBox(height: 36),

                          // "What you'll get" Header
                          Padding(
                            padding: const EdgeInsets.only(left: 4, bottom: 14),
                            child: Text(
                              "What you'll get",
                              style: TextStyle(
                                color: textPrimary,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.2,
                              ),
                            ),
                          ),

                          // 3 Feature Cards
                          _buildFeatureCards(
                            isLight,
                            cardBg,
                            cardBorder,
                            primaryColor,
                            textPrimary,
                            textSecondary,
                          ),

                          const SizedBox(height: 24),
                        ],
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

  /// Top App Bar: Back button, "Track" title, Notification bell with dot
  Widget _buildTopAppBar(
    BuildContext context,
    bool isLight,
    Color textPrimary,
    Color primaryColor,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Back Button
          AnimatedBackArrowButton(onTap: () {
              if (onBack != null) {
                onBack!();
              } else if (Navigator.canPop(context)) {
                Navigator.pop(context);
              }
            }),

          // Title: "Track"
          Text(
            'Track',
            style: TextStyle(
              color: textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.3,
            ),
          ),

          // Notification Bell
          IconButton(
            icon: Stack(
              children: [
                AppIcons.svg(
                  AppIcons.notification,
                  color: textPrimary,
                  width: 24,
                  height: 24,
                ),
                Positioned(
                  top: 2,
                  right: 2,
                  child: Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: primaryColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ],
            ),
            splashRadius: 22,
            onPressed: () {
              if (onNotificationTap != null) {
                onNotificationTap!();
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: isLight
                        ? const Color(0xFF0F172A)
                        : const Color(0xFF0F1A2A),
                    content: const Text(
                      'GPS notifications active. Turn on GPS to receive live tracking and geofence alerts.',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                );
              }
            },
          ),
        ],
      ),
    );
  }

  /// Vehicle Card matching the top card in the user screenshot
  Widget _buildVehicleCard(
    BuildContext context,
    bool isLight,
    Color cardBg,
    Color cardBorder,
    Color textPrimary,
    Color textSecondary,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cardBorder),
        boxShadow: isLight
            ? AppTheme.cardShadow
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.5),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Vehicle Image
          SizedBox(
            width: 80,
            height: 56,
            child: Image.asset(
              vehicleImageUrl ?? 'assets/homescreensicons/carimage.png',
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return Center(
                  child: AppIcons.svg(
                    AppIcons.car,
                    color: isLight
                        ? AppTheme.primaryBlue
                        : const Color(0xFF00C2FF),
                    width: 38,
                    height: 38,
                  ),
                );
              },
            ),
          ),

          const SizedBox(width: 14),

          // Vehicle Details & Red "GPS not Connected" Badge
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Vehicle Name
                Text(
                  vehicleName,
                  style: TextStyle(
                    color: textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.2,
                  ),
                ),

                const SizedBox(height: 2),

                // Vehicle Registration Plate
                Text(
                  vehicleRegNumber,
                  style: TextStyle(
                    color: textSecondary,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),

                const SizedBox(height: 6),

                // Red Pill Badge: "• GPS not Connected"
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFFEE2E2)
                        : const Color(0xFF280B0B),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isLight
                          ? const Color(0xFFFECACA)
                          : const Color(0xFF5A1515),
                      width: 0.9,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.circle,
                        size: 6,
                        color: isLight
                            ? const Color(0xFFEF4444)
                            : const Color(0xFFFF3B30),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        'GPS not Connected',
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFFDC2626)
                              : const Color(0xFFFF4D4D),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 5),

                // Last synced text
                Text(
                  lastSyncedText,
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF94A3B8)
                        : const Color(0xFF6B7B8F),
                    fontSize: 10.5,
                  ),
                ),
              ],
            ),
          ),

          // Switch Vehicle Button (⇄)
          GestureDetector(
            onTap: onSwitchVehicle,
            child: Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: isLight
                    ? const Color(0xFFF1F5F9)
                    : const Color(0xFF101B2E),
                borderRadius: BorderRadius.circular(11),
                border: Border.all(
                  color: isLight
                      ? const Color(0xFFCBD5E1)
                      : const Color(0xFF1E2D44),
                ),
              ),
              child: Center(
                child: Icon(
                  Icons.swap_horiz_rounded,
                  color: textPrimary,
                  size: 20,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Center Graphic: Disconnected GPS Pin
  Widget _buildNoGpsIllustration(bool isLight) {
    return Center(
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Subtle shadow underneath
          Positioned(
            bottom: 4,
            child: Container(
              width: 140,
              height: 12,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: (isLight
                            ? const Color(0xFF94A3B8)
                            : const Color(0xFF1E2A38))
                        .withValues(alpha: 0.25),
                    blurRadius: 18,
                    spreadRadius: 4,
                  ),
                ],
              ),
            ),
          ),

          Image.asset(
            'assets/icons/NoGPS.png',
            width: 164,
            height: 129,
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) {
              return SvgPicture.asset(
                'assets/icons/NoGPS.svg',
                width: 164,
                height: 129,
                fit: BoxFit.contain,
              );
            },
          ),
        ],
      ),
    );
  }

  /// Heading: "No GPS Device Connected"
  Widget _buildHeading(Color textPrimary) {
    return Center(
      child: Text(
        'No GPS Device Connected',
        textAlign: TextAlign.center,
        style: TextStyle(
          color: textPrimary,
          fontSize: 20,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.2,
        ),
      ),
    );
  }

  /// Subtitle: "Connect your CarQConnect GPS device to track your vehicle live..."
  Widget _buildSubtitle(Color textSecondary) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Text(
          'Connect your CarQConnect GPS device to track\nyour vehicle live and access all location\nfeatures.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: textSecondary,
            fontSize: 13.5,
            fontWeight: FontWeight.w400,
            height: 1.45,
          ),
        ),
      ),
    );
  }

  /// "Connect GPS 🔗" Pill CTA Button
  Widget _buildConnectGpsButton(
    BuildContext context,
    bool isLight,
    Color primaryColor,
  ) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: onConnectGps,
        style: ElevatedButton.styleFrom(
          backgroundColor:
              isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF),
          foregroundColor: isLight ? Colors.white : Colors.black,
          elevation: isLight ? 2 : 4,
          shadowColor: primaryColor.withValues(alpha: 0.4),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
          padding: const EdgeInsets.symmetric(vertical: 13),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Connect GPS',
              style: TextStyle(
                color: isLight ? Colors.white : Colors.black,
                fontSize: 16.5,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.3,
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              Icons.link_rounded,
              color: isLight ? Colors.white : Colors.black,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  /// 3 Feature Cards under "What you'll get"
  Widget _buildFeatureCards(
    bool isLight,
    Color cardBg,
    Color cardBorder,
    Color primaryColor,
    Color textPrimary,
    Color textSecondary,
  ) {
    return Row(
      children: [
        // Card 1: Live Tracking
        Expanded(
          child: _buildFeatureCard(
            isLight: isLight,
            cardBg: cardBg,
            cardBorder: cardBorder,
            primaryColor: primaryColor,
            textPrimary: textPrimary,
            textSecondary: textSecondary,
            icon: Icons.location_on_outlined,
            title: 'Live Tracking',
            description: 'Track your vehicle\nin real-time',
          ),
        ),
        const SizedBox(width: 10),

        // Card 2: Location History
        Expanded(
          child: _buildFeatureCard(
            isLight: isLight,
            cardBg: cardBg,
            cardBorder: cardBorder,
            primaryColor: primaryColor,
            textPrimary: textPrimary,
            textSecondary: textSecondary,
            icon: Icons.alt_route_rounded,
            title: 'Location History',
            description: 'View past trips and\nroutes',
          ),
        ),
        const SizedBox(width: 10),

        // Card 3: Geofence Alerts
        Expanded(
          child: _buildFeatureCard(
            isLight: isLight,
            cardBg: cardBg,
            cardBorder: cardBorder,
            primaryColor: primaryColor,
            textPrimary: textPrimary,
            textSecondary: textSecondary,
            icon: Icons.notifications_active_outlined,
            title: 'Geofence Alerts',
            description: 'Get notified when\nyour vehicle leaves\na safezone',
          ),
        ),
      ],
    );
  }

  Widget _buildFeatureCard({
    required bool isLight,
    required Color cardBg,
    required Color cardBorder,
    required Color primaryColor,
    required Color textPrimary,
    required Color textSecondary,
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Container(
      height: 148,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Squircle Icon
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: isLight
                  ? const Color(0xFFEFF6FF)
                  : const Color(0xFF0F1E32),
              borderRadius: BorderRadius.circular(11),
              border: Border.all(
                color: isLight
                    ? const Color(0xFFBFDBFE)
                    : const Color(0xFF00C2FF).withValues(alpha: 0.35),
                width: 1,
              ),
            ),
            child: Icon(
              icon,
              color: primaryColor,
              size: 20,
            ),
          ),

          const Spacer(),

          // Title
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: textPrimary,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 4),

          // Description
          Text(
            description,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: textSecondary,
              fontSize: 10.5,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}
