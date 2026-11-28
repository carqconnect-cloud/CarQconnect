import 'package:flutter/material.dart';
import 'notification_models.dart';
import 'notifications_screen.dart';
import '../../services/app_notification_service.dart';
import '../../theme/app_theme.dart';

class TurnOnNotificationsScreen extends StatelessWidget {
  const TurnOnNotificationsScreen({super.key});

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
            body: SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(minHeight: constraints.maxHeight),
                      child: IntrinsicHeight(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 32),

                    // Title: Turn on notifications
                    RichText(
                      text: TextSpan(
                        children: [
                          TextSpan(
                            text: 'Turn on\n',
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: 34,
                              fontWeight: FontWeight.bold,
                              height: 1.15,
                              letterSpacing: -0.5,
                            ),
                          ),
                          TextSpan(
                            text: 'notifications',
                            style: TextStyle(
                              color: AppTheme.primaryBlue,
                              fontSize: 34,
                              fontWeight: FontWeight.bold,
                              height: 1.15,
                              letterSpacing: -0.5,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Subtitle
                    Text(
                      'Stay updated on your vehicle, reminders,\ndocuments, FASTag, and important safety\nalerts — all in one place.',
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 14.5,
                        height: 1.45,
                      ),
                    ),

                    const Spacer(),

                    // Center 3D Illustration matching Screen 1
                    const Center(
                      child: TurnOnNotificationsIllustration(),
                    ),

                    const Spacer(flex: 2),

                    // Primary Button: Turn on notifications
                    SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: ElevatedButton(
                        onPressed: () async {
                          await AppNotificationService.instance
                              .requestPermissionAndEnable(showWelcomeBanner: true);

                          if (!context.mounted) return;
                          Navigator.pushReplacement(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const NotificationsScreen(),
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryBlue,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(27),
                          ),
                        ),
                        child: const Text(
                          'Turn on notifications',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Secondary Action: Not Now
                    Center(
                      child: TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text(
                          'Not Now',
                          style: TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 14.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 18),
                  ],
                ),
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
