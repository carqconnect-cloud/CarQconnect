import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'home_screen.dart';
import 'trip/trips_screen.dart';
import 'store/store.dart';
import 'profile/profile.dart';
import 'sos/sos.dart';
import 'qr/qr.dart';
import '../services/localization_service.dart';
import '../theme/app_theme.dart';
import '../services/screen_refresh_service.dart';

/// Standalone Screen for Bottom Navigation handling all tab switching and navigation.
class BottomNavigationScreen extends StatefulWidget {
  final int initialIndex;

  const BottomNavigationScreen({super.key, this.initialIndex = 0});

  @override
  State<BottomNavigationScreen> createState() => _BottomNavigationScreenState();
}

// Alias for convenience
typedef MainNavigationScreen = BottomNavigationScreen;
typedef BottomNavScreen = BottomNavigationScreen;

class _BottomNavigationScreenState extends State<BottomNavigationScreen> {
  late int _selectedIndex;
  final List<Widget?> _tabPages = List<Widget?>.filled(4, null);

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialIndex;
    AppTheme.isLightNotifier.addListener(_onThemeChanged);
    LocalizationService.currentCodeNotifier.addListener(_onThemeChanged);
  }

  @override
  void dispose() {
    AppTheme.isLightNotifier.removeListener(_onThemeChanged);
    LocalizationService.currentCodeNotifier.removeListener(_onThemeChanged);
    super.dispose();
  }

  void _onThemeChanged() {
    if (mounted) setState(() {});
  }

  DateTime? _lastBackPressTime;

  void _handleBackPress() {
    // If user is on any other tab (Trips, SOS, Account), back button redirects to Home tab!
    if (_selectedIndex != 0) {
      _onItemTapped(0);
      return;
    }

    // If on Home tab, require 2nd tap within 2 seconds to exit app
    final now = DateTime.now();
    if (_lastBackPressTime == null ||
        now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
      _lastBackPressTime = now;
      ScaffoldMessenger.of(context).removeCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text(
            'Tap again to exit',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
          backgroundColor: const Color(0xFF1E293B),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          margin: const EdgeInsets.fromLTRB(50, 0, 50, 24),
          duration: const Duration(seconds: 2),
        ),
      );
    } else {
      SystemNavigator.pop();
    }
  }

  void _onItemTapped(int index) {
    if (index >= 0 && index < 4) {
      setState(() {
        _selectedIndex = index;
      });
    }
  }

  Widget _buildTabPage(int index) {
    switch (index) {
      case 0:
        return HomeScreen(
          hasBottomNav: true,
          onOpenStore: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const StoreScreen()),
            );
          },
          onNavigateTab: _onItemTapped,
        );
      case 1:
        return SosScreen(
          hasBottomNav: false,
          onBackToHome: () => _onItemTapped(0),
        );
      case 2:
        return TripsScreen(
          initialTab: 0,
          hasBottomNav: true,
          onBackToHome: () => _onItemTapped(0),
        );
      case 3:
        return AccountScreen(
          hasBottomNav: true,
          onBackToHome: () => _onItemTapped(0),
        );
      default:
        throw RangeError.index(index, _tabPages);
    }
  }

  @override
  Widget build(BuildContext context) {
    _tabPages[_selectedIndex] ??= _buildTabPage(_selectedIndex);
    final isSosActive = _selectedIndex == 1;
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return PopScope(
          canPop: false,
          onPopInvokedWithResult: (didPop, result) {
            if (didPop) return;
            _handleBackPress();
          },
          child: Scaffold(
            backgroundColor: isSosActive
                ? const Color(0xFFD61A1A)
                : (isLight
                      ? const Color(0xFFF1F5F9)
                      : const Color(0xFF090E17)),
            body: Stack(
              children: [
                SafeArea(
                  top: !isSosActive,
                  bottom: false,
                  child: IndexedStack(
                    index: _selectedIndex,
                    children: List.generate(
                      _tabPages.length,
                      (index) => TabVisibilityScope(
                        isActive: index == _selectedIndex,
                        child: _tabPages[index] ?? const SizedBox.shrink(),
                      ),
                    ),
                  ),
                ),
                if (!isSosActive)
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: _buildCustomBottomNav(isLight),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCustomBottomNav(bool isLight) {
    final bottomInset = MediaQuery.of(context).padding.bottom;
    final navBg = isLight ? Colors.white : const Color(0xFF0A0F1C);

    const double barHeight = 68.0;
    const double qrDiameter = 74.0;
    final double totalHeight = barHeight + 36.0 + bottomInset;

    return SizedBox(
      height: totalHeight,
      child: Stack(
        alignment: Alignment.bottomCenter,
        clipBehavior: Clip.none,
        children: [
          // Background Bar extending all the way to screen bottom (covers area behind Android 3-button keys)
          Container(
            height: barHeight + bottomInset,
            padding: EdgeInsets.only(bottom: bottomInset),
            decoration: BoxDecoration(
              color: navBg,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(24),
                topRight: Radius.circular(24),
              ),
              boxShadow: isLight
                  ? [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 16,
                        offset: const Offset(0, -4),
                      ),
                    ]
                  : [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.4),
                        blurRadius: 12,
                        offset: const Offset(0, -2),
                      ),
                    ],
            ),
            child: SizedBox(
              height: barHeight,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildNavItem(
                    normalAsset: 'assets/bottomnavigation/home.png',
                    filledAsset: 'assets/bottomnavigation/homefillded.png',
                    label: 'Home'.tr,
                    index: 0,
                    isLight: isLight,
                    iconSize: 24.0,
                  ),
                  _buildNavItem(
                    normalAsset: 'assets/bottomnavigation/sos_icon.png',
                    filledAsset: 'assets/bottomnavigation/sosfillded_icon.png',
                    label: 'SOS'.tr,
                    index: 1,
                    isLight: isLight,
                    iconSize: 25.0,
                  ),
                  const SizedBox(
                    width: 78,
                  ), // Space for enlarged center QR button
                  _buildNavItem(
                    normalAsset: 'assets/bottomnavigation/plaintrip.png',
                    filledAsset: 'assets/bottomnavigation/plaintripfillded.png',
                    label: 'Plan Trip'.tr,
                    index: 2,
                    isLight: isLight,
                    iconSize: 22.0,
                  ),
                  _buildNavItem(
                    normalAsset: 'assets/bottomnavigation/user.png',
                    filledAsset: 'assets/bottomnavigation/Profilefillded.png',
                    label: 'Profile'.tr,
                    index: 3,
                    isLight: isLight,
                    iconSize: 25.0,
                  ),
                ],
              ),
            ),
          ),

          // Enlarged Center QR Scanner Button (Floats smoothly above navigation bar)
          Positioned(
            bottom: bottomInset + (barHeight - (qrDiameter / 2) - 3),
            child: GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const QrScannerScreen(),
                  ),
                );
              },
              child: Container(
                width: qrDiameter,
                height: qrDiameter,
                decoration: BoxDecoration(
                  color: isLight ? Colors.white : const Color(0xFF0C1322),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isLight
                        ? const Color(0xFFE2E8F0)
                        : Colors.white.withValues(alpha: 0.14),
                    width: 1.4,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(
                        alpha: isLight ? 0.12 : 0.55,
                      ),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                    if (!isLight)
                      BoxShadow(
                        color: const Color(0xFF00C2FF).withValues(alpha: 0.16),
                        blurRadius: 12,
                        spreadRadius: 1,
                      ),
                  ],
                ),
                child: Center(
                  child: Icon(
                    Icons.qr_code_scanner_rounded,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    size: 34,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem({
    required String normalAsset,
    String? filledAsset,
    required String label,
    required int index,
    required bool isLight,
    double iconSize = 24.0,
  }) {
    final bool isSelected = _selectedIndex == index;
    final Color selectedColor = isLight
        ? const Color(0xFF0066FF)
        : const Color(0xFF00C2FF);
    final Color unselectedColor = isLight
        ? const Color(0xFF64748B)
        : const Color(0xFF7E8E9F);
    final Color labelColor = isSelected ? selectedColor : unselectedColor;

    return GestureDetector(
      onTap: () => _onItemTapped(index),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 64,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 28,
              height: 28,
              child: Center(
                child: Image.asset(
                  (isSelected && filledAsset != null)
                      ? filledAsset
                      : normalAsset,
                  width: iconSize,
                  height: iconSize,
                  fit: BoxFit.contain,
                  color: (isSelected && filledAsset != null)
                      ? null // Keep original filled icon colors (e.g. cyan home, cyan profile)
                      : (isSelected ? selectedColor : unselectedColor),
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: labelColor,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
