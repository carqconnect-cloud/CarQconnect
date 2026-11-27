import 'package:flutter/material.dart';

import 'dart:async';

import '../../theme/app_theme.dart';
import '../../utils/app_icons.dart';
import '../login_screen.dart';
import 'personal_info_screen.dart';
import 'my_vehicles_screen.dart';
import 'my_qr_tags_screen.dart';
import 'saved_address_screen.dart';
import 'emergency_contacts_screen.dart';
import 'notification_settings_screen.dart';
import 'help_support_screen.dart';
import 'order_history_screen.dart';
import 'membership_screen.dart';
import 'language_screen.dart';
import 'about_screen.dart';
import 'privacy_policy_screen.dart';
import 'terms_of_service_screen.dart';
import '../../globals.dart';

import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../services/localization_service.dart';
import '../../services/auth_storage_service.dart';
import '../../services/screen_refresh_service.dart';
import '../../widgets/animated_back_arrow.dart';

class AccountScreen extends StatefulWidget {
  final bool hasBottomNav;
  final VoidCallback? onBackToHome;

  const AccountScreen({
    super.key,
    this.hasBottomNav = false,
    this.onBackToHome,
  });

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen>
    with RefreshOnRouteReturn<AccountScreen> {
  String _userName = '${Globals.firstName} ${Globals.lastName}'.trim();
  String _userPhone = Globals.phone;
  String _userEmail = Globals.email;
  String _selectedLanguage = 'English (India)';
  String _membershipTier = Globals.currentPlan;

  int _profileCompletionPercent = 20;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _membershipTier = Globals.currentPlan;
    Globals.currentPlanNotifier.addListener(_onPlanNotifierChanged);
    _refreshAccountData();
    LocalizationService.currentCodeNotifier.addListener(_onLocaleChanged);
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted && isTabActive) _refreshAccountData();
    });
  }

  @override
  void dispose() {
    Globals.currentPlanNotifier.removeListener(_onPlanNotifierChanged);
    LocalizationService.currentCodeNotifier.removeListener(_onLocaleChanged);
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  void _onPlanNotifierChanged() {
    if (mounted) {
      setState(() {
        _membershipTier = Globals.currentPlan;
      });
    }
  }

  void _onLocaleChanged() {
    if (mounted) {
      setState(() {
        _selectedLanguage = LocalizationService.currentLanguage;
      });
    }
  }

  Future<void> _refreshAccountData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedLang = prefs.getString('app_selected_language');
      if (savedLang != null && savedLang.isNotEmpty && mounted) {
        setState(() {
          _selectedLanguage = savedLang;
        });
      }

      final avatarKey = Globals.email.isNotEmpty
          ? 'carq_profile_avatar_${Globals.email}'
          : 'carq_profile_avatar_default';
      final savedAvatar = prefs.getString(avatarKey);
      if (savedAvatar != null && savedAvatar.isNotEmpty) {
        Globals.profileImageBase64 = savedAvatar;
      }
    } catch (_) {}

    if (mounted) {
      setState(() {
        final fullName = '${Globals.firstName} ${Globals.lastName}'.trim();
        if (fullName.isNotEmpty) _userName = fullName;
        if (Globals.phone.isNotEmpty) _userPhone = Globals.phone;
        if (Globals.email.isNotEmpty) _userEmail = Globals.email;
        _membershipTier = Globals.currentPlan;
      });
    }
    await _calculateProfileCompletion();
  }

  Future<void> _calculateProfileCompletion() async {
    int percent = 0;
    if (_userName.trim().isNotEmpty) percent += 20;
    if (_userEmail.trim().isNotEmpty) percent += 20;
    if (_userPhone.trim().isNotEmpty) percent += 20;

    final addressesRequest = AuthStorageService.authenticatedGet('/app-profile/addresses');
    final contactsRequest = AuthStorageService.authenticatedGet('/app-profile/emergency-contacts');

    // Fetch addresses
    try {
      final addrRes = await addressesRequest;
      if (addrRes.statusCode == 200) {
        final data = jsonDecode(addrRes.body);
        if (data is Map &&
            data['success'] == true &&
            data['data'] != null &&
            (data['data'] as List).isNotEmpty) {
          percent += 20;
        }
      }
    } catch (e) {
      debugPrint('Error fetching addresses for completion: $e');
    }

    // Fetch emergency contacts
    try {
      final contactRes = await contactsRequest;
      if (contactRes.statusCode == 200) {
        final data = jsonDecode(contactRes.body);
        if (data is Map &&
            data['success'] == true &&
            data['data'] != null &&
            (data['data'] as List).isNotEmpty) {
          percent += 20;
        }
      }
    } catch (e) {
      debugPrint('Error fetching contacts for completion: $e');
    }

    if (mounted) {
      setState(() {
        _profileCompletionPercent = percent;
      });
    }
  }

  Future<void> _openPersonalInfo() async {
    final updated = await Navigator.push<Map<String, String>>(
      context,
      MaterialPageRoute(
        builder: (context) => PersonalInfoScreen(
          initialName: _userName,
          initialPhone: _userPhone.replaceAll('+91 ', ''),
          initialEmail: _userEmail,
        ),
      ),
    );

    if (updated != null && mounted) {
      setState(() {
        if (updated['name']?.isNotEmpty == true) {
          _userName = updated['name']!;
        }
        if (updated['phone']?.isNotEmpty == true) {
          _userPhone = updated['phone']!;
        }
        if (updated['email']?.isNotEmpty == true) {
          _userEmail = updated['email']!;
        }
      });
    }
  }

  Future<void> _openMyVehicles() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const MyVehiclesScreen()),
    );
    if (mounted) {
      _refreshAccountData();
    }
  }

  Future<void> _openSavedAddress() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SavedAddressScreen()),
    );
    if (mounted) {
      _refreshAccountData();
    }
  }

  void _onLogout() {
    final isLight = AppTheme.isLightNotifier.value;
    showModalBottomSheet(
      context: context,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0D1424),
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        side: BorderSide(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
        ),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Red logout icon box matching Image 5
              Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: isLight
                      ? const Color(0xFFFEE2E2)
                      : const Color(0xFF261014),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(
                    color: isLight
                        ? const Color(0xFFFECACA)
                        : const Color(0xFF5A1A22),
                    width: 1.5,
                  ),
                ),
                child: const Center(
                  child: Icon(
                    Icons.logout_rounded,
                    color: Color(0xFFFF3B30),
                    size: 36,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Title
              Text(
                'Are you sure you want to log out?',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),

              // Subtitle
              Text(
                'You will need to login again to access\nyour account.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isLight
                      ? const Color(0xFF64748B)
                      : const Color(0xFF8E9BAE),
                  fontSize: 14,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 28),

              // Red Log Out Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    await AuthStorageService.clearSession();
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        backgroundColor: isLight
                            ? Colors.white
                            : const Color(0xFF101726),
                        content: const Text(
                          'Logged out successfully',
                          style: TextStyle(color: Color(0xFF00C2FF)),
                        ),
                      ),
                    );
                    Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const LogInScreen(),
                      ),
                      (route) => false,
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF3B30),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(26),
                    ),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Log Out',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Cancel Button
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text(
                  'Cancel',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Future<void> refreshOnRouteReturn() => _refreshAccountData();

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(gradient: AppTheme.bgGradient),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            appBar: AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              centerTitle: true,
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(
                onTap: () {
                  if (widget.onBackToHome != null) {
                    widget.onBackToHome!();
                  } else if (Navigator.canPop(context)) {
                    Navigator.pop(context);
                  }
                },
              ),
              title: Text(
                'Account',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            body: SafeArea(
              child: RefreshIndicator(
                color: AppTheme.primaryColor,
                backgroundColor: AppTheme.cardBg,
                onRefresh: _refreshAccountData,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: EdgeInsets.fromLTRB(
                    16,
                    8,
                    16,
                    widget.hasBottomNav
                        ? (105.0 + MediaQuery.of(context).padding.bottom)
                        : (28.0 + MediaQuery.of(context).padding.bottom),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // User Profile Card
                      InkWell(
                        onTap: _openPersonalInfo,
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppTheme.cardBg,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppTheme.cardBorder),
                          ),
                          child: Row(
                            children: [
                              // User Avatar with Camera/Edit Badge
                              Stack(
                                clipBehavior: Clip.none,
                                alignment: Alignment.center,
                                children: [
                                  SizedBox(
                                    width: 64,
                                    height: 64,
                                    child: CircularProgressIndicator(
                                      value: _profileCompletionPercent / 100.0,
                                      backgroundColor: isLight
                                          ? const Color(0xFFE2E8F0)
                                          : const Color(0xFF1E2E48),
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        AppTheme.primaryColor,
                                      ),
                                      strokeWidth: 3,
                                    ),
                                  ),
                                  Container(
                                    width: 56,
                                    height: 56,
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                    ),
                                    child: ClipOval(
                                      child:
                                          Globals.profileImageBase64.isNotEmpty
                                          ? Image.memory(
                                              base64Decode(
                                                Globals.profileImageBase64,
                                              ),
                                              fit: BoxFit.cover,
                                              errorBuilder:
                                                  (
                                                    context,
                                                    error,
                                                    stackTrace,
                                                  ) => Container(
                                                    color: isLight
                                                        ? const Color(
                                                            0xFFEFF6FF,
                                                          )
                                                        : const Color(
                                                            0xFF14243B,
                                                          ),
                                                    child: Icon(
                                                      Icons.person,
                                                      color:
                                                          AppTheme.primaryColor,
                                                      size: 32,
                                                    ),
                                                  ),
                                            )
                                          : Image.asset(
                                              'assets/images/user_avatar.jpg',
                                              fit: BoxFit.cover,
                                              errorBuilder:
                                                  (
                                                    context,
                                                    error,
                                                    stackTrace,
                                                  ) => Container(
                                                    color: isLight
                                                        ? const Color(
                                                            0xFFEFF6FF,
                                                          )
                                                        : const Color(
                                                            0xFF14243B,
                                                          ),
                                                    child: Icon(
                                                      Icons.person,
                                                      color:
                                                          AppTheme.primaryColor,
                                                      size: 32,
                                                    ),
                                                  ),
                                            ),
                                    ),
                                  ),
                                  Positioned(
                                    bottom: -6,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primaryColor,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        '$_profileCompletionPercent%',
                                        style: TextStyle(
                                          color: isLight
                                              ? Colors.white
                                              : Colors.black,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(width: 14),

                              // User Info
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _userName.isNotEmpty ? _userName : 'User'.tr,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: AppTheme.textPrimary,
                                        fontSize: 17.5,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      _userPhone.isNotEmpty ? _userPhone : 'No phone linked'.tr,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: AppTheme.textSecondary,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _userEmail.isNotEmpty ? _userEmail : 'No email linked'.tr,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: AppTheme.textSecondary,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              // Open External / Edit Icon
                              Icon(
                                Icons.open_in_new_rounded,
                                color: AppTheme.textSecondary,
                                size: 18,
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Section: My Account
                      Text(
                        'Account Settings'.tr,
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // 3 Horizontal Cards: My Vehicles, Saved Address, Orders
                      IntrinsicHeight(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _buildQuickActionCard(
                            title: 'My Vehicles'.tr,
                            icon: Icons.directions_car_rounded,
                            svgAsset: AppIcons.car,
                            onTap: _openMyVehicles,
                            isLight: isLight,
                          ),
                          const SizedBox(width: 10),
                          _buildQuickActionCard(
                            title: 'Saved Addresses'.tr,
                            icon: Icons.location_on_outlined,
                            onTap: _openSavedAddress,
                            isLight: isLight,
                          ),
                          const SizedBox(width: 10),
                          _buildQuickActionCard(
                            title: 'Order History'.tr,
                            icon: Icons.receipt_long_outlined,
                            svgAsset: AppIcons.invoice,
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) =>
                                      const OrderHistoryScreen(),
                                ),
                              );
                            },
                            isLight: isLight,
                          ),
                        ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Section: App Settings (Group 1)
                      Text(
                        'App Settings'.tr,
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),

                      _buildSettingsTile(
                        icon: Icons.qr_code_2_rounded,
                        iconColor: AppTheme.primaryColor,
                        title: 'My QR Tag',
                        subtitle: 'Manage active tags and contact privacy',
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const MyQrTagsScreen(),
                            ),
                          );
                        },
                        isLight: isLight,
                      ),
                      const SizedBox(height: 10),

                      // Emergency Contacts
                      _buildSettingsTile(
                        icon: Icons.favorite_border_rounded,
                        svgAsset: AppIcons.emergencyContacts,
                        iconColor: AppTheme.primaryColor,
                        title: 'Emergency Contacts'.tr,
                        subtitle: 'Add and manage emergency contacts'.tr,
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) =>
                                  const EmergencyContactsScreen(),
                            ),
                          );
                          if (mounted) {
                            _refreshAccountData();
                          }
                        },
                        isLight: isLight,
                      ),
                      const SizedBox(height: 10),
                      _buildSettingsTile(
                        icon: Icons.workspace_premium_rounded,
                        iconColor: const Color(0xFFFFB300),
                        title: 'Membership'.tr,
                        subtitle: 'Manage your plan and benefits'.tr,
                        trailingText: _membershipTier,
                        onTap: () async {
                          final updatedPlan = await Navigator.push<String>(
                            context,
                            MaterialPageRoute(
                              builder: (context) => MembershipScreen(
                                currentPlan: _membershipTier,
                              ),
                            ),
                          );
                          if (updatedPlan != null && mounted) {
                            await Globals.saveCurrentPlan(updatedPlan);
                            setState(() {
                              _membershipTier = updatedPlan;
                            });
                          }
                        },
                        isLight: isLight,
                      ),
                      const SizedBox(height: 10),
                      _buildSettingsTile(
                        icon: Icons.notifications_none_rounded,
                        svgAsset: AppIcons.notification,
                        iconColor: AppTheme.primaryColor,
                        title: 'Notification Settings'.tr,
                        subtitle: 'Manage your notification preferences'.tr,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) =>
                                  const NotificationSettingsScreen(),
                            ),
                          );
                        },
                        isLight: isLight,
                      ),
                      const SizedBox(height: 10),
                      _buildSettingsTile(
                        icon: Icons.chat_bubble_outline_rounded,
                        svgAsset: AppIcons.language,
                        iconColor: AppTheme.primaryColor,
                        title: 'Language'.tr,
                        subtitle: 'Select your preferred language'.tr,
                        trailingText: _selectedLanguage,
                        onTap: () async {
                          final result = await Navigator.push<String>(
                            context,
                            MaterialPageRoute(
                              builder: (context) => LanguageScreen(
                                currentLanguage: _selectedLanguage,
                              ),
                            ),
                          );
                          if (result != null && mounted) {
                            setState(() {
                              _selectedLanguage = result;
                            });
                          }
                        },
                        isLight: isLight,
                      ),
                      const SizedBox(height: 10),

                      // Theme & Display (Moved to the bottom after Language)
                      _buildSettingsTile(
                        icon: Icons.brightness_6_rounded,
                        iconColor: AppTheme.primaryColor,
                        title: 'Theme & Display',
                        subtitle: 'Auto (6 AM - 6 PM), Light or Dark',
                        trailingText: AppTheme.mode == ThemeModeSetting.autoTime
                            ? 'Auto'
                            : AppTheme.mode == ThemeModeSetting.light
                            ? 'Light'
                            : 'Dark',
                        onTap: () => AppTheme.showThemeDialog(context),
                        isLight: isLight,
                      ),

                      const SizedBox(height: 24),

                      // Section: Support & Legal (Group 2)
                      Text(
                        'Support & Legal'.tr,
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),

                      _buildSettingsTile(
                        icon: Icons.headset_mic_outlined,
                        svgAsset: AppIcons.customerSupport,
                        iconColor: AppTheme.primaryColor,
                        title: 'Help & Support'.tr,
                        subtitle: 'Get help or contact our team'.tr,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const HelpSupportScreen(),
                            ),
                          );
                        },
                        isLight: isLight,
                      ),
                      const SizedBox(height: 10),
                      _buildSettingsTile(
                        icon: Icons.shield_outlined,
                        svgAsset: AppIcons.privacy,
                        iconColor: AppTheme.primaryColor,
                        title: 'Privacy Policy'.tr,
                        subtitle: 'How we protect your data'.tr,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const PrivacyPolicyScreen(),
                            ),
                          );
                        },
                        isLight: isLight,
                      ),
                      const SizedBox(height: 10),
                      _buildSettingsTile(
                        icon: Icons.info_outline_rounded,
                        svgAsset: AppIcons.about,
                        iconColor: AppTheme.primaryColor,
                        title: 'About CarQConnect'.tr,
                        subtitle: 'App version, license and more'.tr,
                        trailingText: 'v1.0.0',
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const AboutScreen(),
                            ),
                          );
                        },
                        isLight: isLight,
                      ),
                      const SizedBox(height: 10),
                      _buildSettingsTile(
                        icon: Icons.description_outlined,
                        svgAsset: AppIcons.terms,
                        iconColor: AppTheme.primaryColor,
                        title: 'Terms of Service'.tr,
                        subtitle: 'Rules and guidelines'.tr,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) =>
                                  const TermsOfServiceScreen(),
                            ),
                          );
                        },
                        isLight: isLight,
                      ),

                      const SizedBox(height: 24),

                      // Log Out Button
                      InkWell(
                        onTap: _onLogout,
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          width: double.infinity,
                          height: 52,
                          decoration: BoxDecoration(
                            color: isLight
                                ? const Color(0xFFFEF2F2)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isLight
                                  ? const Color(0xFFFCA5A5)
                                  : const Color(0xFF4A1820),
                              width: 1.2,
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.logout_rounded,
                                color: Color(0xFFFF5252),
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Log Out'.tr,
                                style: const TextStyle(
                                  color: Color(0xFFFF5252),
                                  fontSize: 15.5,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildQuickActionCard({
    required String title,
    required IconData icon,
    String? svgAsset,
    required VoidCallback onTap,
    required bool isLight,
  }) {
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 14),
          decoration: BoxDecoration(
            color: AppTheme.cardBg,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppTheme.cardBorder),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isLight
                      ? const Color(0xFFEFF6FF)
                      : const Color(0xFF14243B),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(
                  child: svgAsset != null
                      ? AppIcons.svg(
                          svgAsset,
                          color: AppTheme.primaryColor,
                          width: 22,
                          height: 22,
                        )
                      : Icon(icon, color: AppTheme.primaryColor, size: 22),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: Text(
                  title,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    height: 1.25,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSettingsTile({
    required IconData icon,
    String? svgAsset,
    required Color iconColor,
    required String title,
    required String subtitle,
    String? trailingText,
    required VoidCallback onTap,
    required bool isLight,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: AppTheme.settingsCardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isLight ? AppTheme.cardBorder : const Color(0xFF1C273C),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: isLight
                    ? const Color(0xFFEFF6FF)
                    : const Color(0xFF14243B),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: svgAsset != null
                    ? AppIcons.svg(
                        svgAsset,
                        color: iconColor,
                        width: 22,
                        height: 22,
                      )
                    : Icon(icon, color: iconColor, size: 21),
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
                      color: AppTheme.textPrimary,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            if (trailingText != null) ...[
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 120),
                child: Text(
                  trailingText,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 12.5),
                ),
              ),
              const SizedBox(width: 4),
            ],
            Icon(
              Icons.chevron_right_rounded,
              color: AppTheme.textSecondary,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
