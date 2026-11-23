import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../utils/app_icons.dart';
import '../../utils/api_config.dart';
import '../../globals.dart';
import '../../services/auth_storage_service.dart';
import '../../services/localization_service.dart';
import '../login_screen.dart';
import 'contact_support_screen.dart';
import 'privacy_policy_screen.dart';
import 'terms_of_service_screen.dart';
import '../../widgets/animated_back_arrow.dart';
import '../../widgets/app_logo.dart';

/// Screen 2: About CarQConnect Screen
class AboutScreen extends StatefulWidget {
  const AboutScreen({super.key});

  @override
  State<AboutScreen> createState() => _AboutScreenState();
}

class _AboutScreenState extends State<AboutScreen> {
  bool _isDeletingAccount = false;

  Future<void> _handleDeleteAccount() async {
    setState(() => _isDeletingAccount = true);

    try {
      final url = ApiConfig.uri('/app-profile/account');
      final response = await http.delete(
        url,
        headers: {
          'Content-Type': 'application/json',
          if (Globals.accessToken.isNotEmpty)
            'Authorization': 'Bearer ${Globals.accessToken}',
        },
        body: jsonEncode({
          'reason': 'User requested self-service account deletion via mobile app',
        }),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        // Clear all auth sessions & global state
        await AuthStorageService.clearSession();

        if (mounted) {
          setState(() => _isDeletingAccount = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: Color(0xFF101726),
              content: Text(
                'Your account and data have been permanently deleted.',
                style: TextStyle(
                  color: Color(0xFFFF5252),
                  fontWeight: FontWeight.bold,
                ),
              ),
              behavior: SnackBarBehavior.floating,
            ),
          );
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => const LogInScreen()),
            (route) => false,
          );
        }
      } else {
        if (mounted) {
          setState(() => _isDeletingAccount = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFF2A1215),
              content: Text(
                'Could not delete account (HTTP ${response.statusCode}). Please contact support.',
                style: const TextStyle(color: Color(0xFFFF5252)),
              ),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isDeletingAccount = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF2A1215),
            content: Text(
              'Network error: $e',
              style: const TextStyle(color: Color(0xFFFF5252)),
            ),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showDeleteAccountDialog() {
    final isLight = AppTheme.isLightNotifier.value;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isLight ? Colors.white : const Color(0xFF0F1728),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
          ),
        ),
        title: Text(
          'Delete Account?',
          style: TextStyle(
            color: isLight ? const Color(0xFF0F172A) : Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Text(
          'Deleting your account will permanently remove your profile, vehicle data, linked QR codes, and subscription access. This action cannot be undone.',
          style: TextStyle(
            color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
            fontSize: 13.5,
            height: 1.4,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _handleDeleteAccount();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFF3B30),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Delete Account'),
          ),
        ],
      ),
    );
  }

  void _showLicenses() {
    showLicensePage(
      context: context,
      applicationName: 'CarQConnect',
      applicationVersion: ApiConfig.appVersion,
      applicationLegalese: '© 2026 CarQConnect Technologies Inc. All rights reserved.',
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Stack(
          children: [
            Container(
              decoration: BoxDecoration(
                gradient: AppTheme.bgGradient,
              ),
              child: Scaffold(
                backgroundColor: Colors.transparent,
                appBar: AppBar(
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                  centerTitle: true,
                  leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                  title: Text(
                    'About CarQConnect'.tr,
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 18.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  actions: [
                    IconButton(
                      icon: AppIcons.svg(
                        AppIcons.customerSupport,
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        width: 22,
                        height: 22,
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const ContactSupportScreen(),
                          ),
                        );
                      },
                    ),
                  ],
                ),
                body: SafeArea(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                    children: [
                      const SizedBox(height: 10),

                      // Logo & Header
                      Center(
                        child: Column(
                          children: [
                            Container(
                              width: 68,
                              height: 68,
                              decoration: BoxDecoration(
                                color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF0A1B33),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: const Color(0xFF0066FF).withValues(alpha: isLight ? 0.3 : 0.4),
                                  width: 1.5,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF0066FF).withValues(alpha: isLight ? 0.12 : 0.2),
                                    blurRadius: 18,
                                  ),
                                ],
                              ),
                              child: Center(
                                child: AppLogo(
                                  width: 44,
                                  height: 36,
                                  isLight: isLight,
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'CarQConnect',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Drive Smarter. Live Safer.',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                fontSize: 13.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Version ${ApiConfig.appVersion}',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Description & Mission Card
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: isLight ? Colors.white : const Color(0xFF0F1728),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
                            width: 1,
                          ),
                          boxShadow: isLight ? AppTheme.cardShadow : null,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'CarQConnect is a smart connected vehicle safety and mobility ecosystem. From encrypted QR emergency contact tags and real-time GPS telemetry to automated document expiration management and roadside SOS dispatch, CarQConnect unifies vehicle intelligence in a single protected application.',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                                fontSize: 13,
                                height: 1.45,
                              ),
                            ),
                            const SizedBox(height: 20),

                            // Our Mission
                            _buildPillarItem(
                              isLight: isLight,
                              icon: Icons.track_changes_outlined,
                              title: 'Our Mission',
                              desc: 'To create safer roads and privacy-first connected automotive solutions for every driver.',
                            ),
                            const SizedBox(height: 16),

                            // Our Vision
                            _buildPillarItem(
                              isLight: isLight,
                              icon: Icons.visibility_outlined,
                              title: 'Our Vision',
                              desc: 'To be India\'s most trusted automotive platform for vehicle safety, connectivity, and telemetry.',
                            ),
                            const SizedBox(height: 16),

                            // Our Values
                            _buildPillarItem(
                              isLight: isLight,
                              icon: Icons.groups_outlined,
                              title: 'Our Values',
                              desc: 'Safety • Privacy • Innovation • Reliability',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Settings & Legal Links Card
                      Container(
                        decoration: BoxDecoration(
                          color: isLight ? Colors.white : const Color(0xFF0F1728),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
                            width: 1,
                          ),
                          boxShadow: isLight ? AppTheme.cardShadow : null,
                        ),
                        child: Column(
                          children: [
                            _buildLinkTile(
                              isLight: isLight,
                              icon: Icons.description_outlined,
                              title: 'App Version',
                              trailingText: ApiConfig.appVersion,
                              onTap: () {},
                            ),
                            Divider(
                              color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
                              height: 1,
                            ),
                            _buildLinkTile(
                              isLight: isLight,
                              icon: Icons.info_outline_rounded,
                              title: 'Open Source Licenses',
                              onTap: _showLicenses,
                            ),
                            Divider(
                              color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
                              height: 1,
                            ),
                            _buildLinkTile(
                              isLight: isLight,
                              svgAsset: AppIcons.privacy,
                              icon: Icons.shield_outlined,
                              title: 'Privacy Policy',
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => const PrivacyPolicyScreen(),
                                  ),
                                );
                              },
                            ),
                            Divider(
                              color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
                              height: 1,
                            ),
                            _buildLinkTile(
                              isLight: isLight,
                              svgAsset: AppIcons.terms,
                              icon: Icons.description_outlined,
                              title: 'Terms of Service',
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => const TermsOfServiceScreen(),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Delete Account Container
                      Container(
                        decoration: BoxDecoration(
                          color: isLight ? const Color(0xFFFFF1F2) : const Color(0xFF191017),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFFFF3B30).withValues(alpha: isLight ? 0.25 : 0.3),
                            width: 1,
                          ),
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: _isDeletingAccount ? null : _showDeleteAccountDialog,
                            borderRadius: BorderRadius.circular(16),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  AppIcons.svg(
                                    AppIcons.delete,
                                    color: const Color(0xFFFF3B30),
                                    width: 17,
                                    height: 17,
                                  ),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'Delete Account',
                                    style: TextStyle(
                                      color: Color(0xFFFF3B30),
                                      fontSize: 14.5,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Blocking loading overlay when deleting account
            if (_isDeletingAccount)
              Container(
                color: Colors.black54,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 22),
                    decoration: BoxDecoration(
                      color: isLight ? Colors.white : const Color(0xFF0F1728),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black26,
                          blurRadius: 16,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const AppLoadingSpinner(
                          size: 60,
                          primaryColor: Color(0xFFFF3B30),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Permanently deleting account...',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildPillarItem({
    required bool isLight,
    required IconData icon,
    required String title,
    required String desc,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(
            icon,
            color: const Color(0xFF00C0F0),
            size: 24,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 14.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                desc,
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                  fontSize: 12.5,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLinkTile({
    required bool isLight,
    IconData? icon,
    String? svgAsset,
    required String title,
    String? trailingText,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
          child: Row(
            children: [
              if (svgAsset != null)
                AppIcons.svg(
                  svgAsset,
                  width: 19,
                  height: 19,
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                )
              else if (icon != null)
                Icon(
                  icon,
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                  size: 20,
                ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              if (trailingText != null) ...[
                Text(
                  trailingText,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(width: 6),
              ],
              Icon(
                Icons.chevron_right_rounded,
                color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
