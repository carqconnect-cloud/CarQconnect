import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'vehicle_dashboard.dart';
import 'vehicle_health.dart';
import 'vehicle_livedata.dart';
import 'vehicle_details.dart';
import 'vehicle_setting.dart';
import '../../widgets/animated_back_arrow.dart';

class VehicleTabsScreen extends StatefulWidget {
  final int initialTabIndex;
  final String vehicleName;
  final String vehiclePlate;
  final Map<String, dynamic>? vehicleData;
  final bool isObdConnected;

  const VehicleTabsScreen({
    super.key,
    this.initialTabIndex = 0,
    this.vehicleName = '',
    this.vehiclePlate = '',
    this.vehicleData,
    this.isObdConnected = false,
  });

  @override
  State<VehicleTabsScreen> createState() => _VehicleTabsScreenState();
}

class _VehicleTabsScreenState extends State<VehicleTabsScreen> {
  late int _selectedTabIndex;
  late final PageController _pageController;

  final List<String> _tabs = [
    'Overview',
    'Health',
    'Live Data',
    'Info',
  ];

  @override
  void initState() {
    super.initState();
    _selectedTabIndex = widget.initialTabIndex.clamp(0, 3);
    _pageController = PageController(initialPage: _selectedTabIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onTabTapped(int index) {
    if (index == _selectedTabIndex) return;
    setState(() {
      _selectedTabIndex = index;
    });
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeInOutCubic,
    );
  }

  void _onPageChanged(int index) {
    setState(() {
      _selectedTabIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            gradient: AppTheme.bgGradient,
          ),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            body: SafeArea(
              child: Column(
                children: [
                  // 1. Header Bar: Back Button, Vehicle Title, Settings/Edit Button
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        // Back Button
                        AnimatedBackArrowButton(onTap: () {
                            if (Navigator.canPop(context)) {
                              Navigator.pop(context);
                            }
                          }),

                        // Title + Plate in Center
                        Expanded(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                widget.vehicleName,
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: -0.2,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                widget.vehiclePlate,
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Right Action: Settings / Edit
                        InkWell(
                          onTap: () {
                            if (_selectedTabIndex == 3) {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => VehicleDetailsScreen(
                                    isStandalone: true,
                                    vehicleName: widget.vehicleName,
                                    vehiclePlate: widget.vehiclePlate,
                                    vehicleData: widget.vehicleData,
                                  ),
                                ),
                              );
                            } else {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => VehicleSettingsScreen(
                                    vehicleName: widget.vehicleName,
                                    vehiclePlate: widget.vehiclePlate,
                                    vehicleData: widget.vehicleData,
                                    isObdConnected: widget.isObdConnected,
                                  ),
                                ),
                              );
                            }
                          },
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            child: Icon(
                              _selectedTabIndex == 3
                                  ? Icons.edit_outlined
                                  : Icons.settings_outlined,
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              size: 22,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6),

                  // 2. Persistent Navigation Pill Tabs
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: isLight ? Colors.white : const Color(0xFF0F1A2E),
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(
                        color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                        width: 1.0,
                      ),
                      boxShadow: isLight ? AppTheme.cardShadow : null,
                    ),
                    child: Row(
                      children: List.generate(_tabs.length, (index) {
                        final isSelected = _selectedTabIndex == index;
                        return Expanded(
                          child: GestureDetector(
                            onTap: () => _onTabTapped(index),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(vertical: 9),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? const Color(0xFF0066FF)
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(24),
                              ),
                              child: Text(
                                _tabs[index],
                                style: TextStyle(
                                  color: isSelected
                                      ? Colors.white
                                      : (isLight
                                          ? const Color(0xFF64748B)
                                          : const Color(0xFF94A3B8)),
                                  fontSize: 13,
                                  fontWeight: isSelected
                                      ? FontWeight.bold
                                      : FontWeight.w500,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // 3. Tab Views (Page View for swipe & tap navigation)
                  Expanded(
                    child: PageView(
                      controller: _pageController,
                      onPageChanged: _onPageChanged,
                      physics: const BouncingScrollPhysics(),
                      children: [
                        VehicleDashboardScreen(
                          onNavigateTab: _onTabTapped,
                          vehicleName: widget.vehicleName,
                          vehiclePlate: widget.vehiclePlate,
                          vehicleData: widget.vehicleData,
                          isObdConnected: widget.isObdConnected,
                        ),
                        VehicleHealthScreen(
                          onNavigateTab: _onTabTapped,
                          isObdConnected: widget.isObdConnected,
                        ),
                        VehicleLiveDataScreen(
                          onNavigateTab: _onTabTapped,
                          isObdConnected: widget.isObdConnected,
                        ),
                        VehicleDetailsScreen(
                          onNavigateTab: _onTabTapped,
                          vehicleName: widget.vehicleName,
                          vehiclePlate: widget.vehiclePlate,
                          vehicleData: widget.vehicleData,
                        ),
                      ],
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
}
