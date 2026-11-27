import '../../services/vehicle_type_service.dart';

import 'package:flutter/material.dart';

import 'dart:async';

import 'package:latlong2/latlong.dart';

import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../globals.dart';
import 'plan_trip_screen.dart';
import 'trip_completed_screen.dart';
import 'trip_service.dart';
import 'place_search_modal.dart';
import 'active_trip_screen.dart';
import '../profile/my_vehicles_screen.dart';
import '../bottom_navigation_screen.dart';
import '../../utils/app_icons.dart';
import '../../services/screen_refresh_service.dart';
import '../../widgets/animated_back_arrow.dart';

/// Screen 1: Trips Hub matching Screenshot 1, Image 2 (Trip History), and Image 3 (Active Trip)
class TripsScreen extends StatefulWidget {
  final int initialTab;
  final bool hasBottomNav;
  final VoidCallback? onBackToHome;

  const TripsScreen({
    super.key,
    this.initialTab = 0,
    this.hasBottomNav = false,
    this.onBackToHome,
  });

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen>
    with RefreshOnRouteReturn<TripsScreen> {
  String _cleanTitle(String text) {
    if (text.isEmpty) return 'Your location';
    final parts = text.split(',');
    return parts.first.trim();
  }

  String _getTripSummaryText() {
    final start = _fromLatLng;
    final end = _isDoubleRoute ? _fromLatLng : _toLatLng;
    final stops = _addedStops.where((s) => s.lat != 0.0 && s.lon != 0.0).toList();

    if (start == null || start.latitude == 0.0) {
      return '';
    }

    final points = <LatLng>[start];
    for (final s in stops) {
      points.add(LatLng(s.lat, s.lon));
    }
    if (end != null && end.latitude != 0.0) {
      points.add(end);
    }

    if (points.length < 2) return '';

    final geodesicKm = TripService.calculatePathDistanceKm(points);
    final roadKm = geodesicKm * 1.25;
    final totalMinutes = (roadKm / 55.0) * 60.0;

    final distStr = TripService.formatDistance(roadKm);
    final durStr = TripService.formatDuration(totalMinutes);
    return 'Total trip: $durStr ($distStr)';
  }

  Widget _buildTripConnectorDots(bool isLight) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3.0),
      child: Row(
        children: [
          SizedBox(
            width: 24,
            child: Center(
              child: Column(
                children: List.generate(
                  3,
                  (index) => Container(
                    width: 2.2,
                    height: 3,
                    margin: const EdgeInsets.symmetric(vertical: 1.5),
                    decoration: BoxDecoration(
                      color: isLight
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF475569),
                      borderRadius: BorderRadius.circular(1),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Container(
              height: 0.9,
              color: isLight
                  ? const Color(0xFFE2E8F0)
                  : const Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }
  late int _selectedTab; // 0: Plan a Trip, 1: Active Trip, 2: Trip History
  String _selectedPreference = 'Fastest';
  String _routeType = 'Single routes';
  bool _isDoubleRoute = false;
  bool _showRouteBuilder = false;
  String _fromLocation = '';
  String _toLocation = '';
  LatLng? _fromLatLng;
  LatLng? _toLatLng;
  List<PlaceSearchResult> _addedStops = [];
  List<dynamic> _backendTrips = [];
  bool _isLoadingTrips = false;
  Timer? _autoRefreshTimer;

  // Real user vehicles from backend
  List<Map<String, dynamic>> _vehicles = [];
  bool _isLoadingVehicles = true;
  Map<String, dynamic>? _selectedVehicle = Globals.vehicleModel.isNotEmpty
      ? {
          'name': Globals.vehicleModel,
          'regNumber': Globals.vehicleRegistration,
          'type': 'Petrol',
        }
      : null;

  @override
  void initState() {
    super.initState();
    _selectedTab = widget.initialTab;
    AppTheme.isLightNotifier.addListener(_onThemeChanged);
    _initRealData(showSpinner: true);
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted && isTabActive) _initRealData(showSpinner: false);
    });
  }

  void _onThemeChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    AppTheme.isLightNotifier.removeListener(_onThemeChanged);
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _initRealData({bool showSpinner = false}) async {
    _loadTrips(showSpinner: showSpinner);
    _loadUserVehicles();
    // Leave inputs empty initially as requested
  }

  @override
  Future<void> refreshOnRouteReturn() => _initRealData(showSpinner: false);

  Future<void> _loadUserVehicles() async {
    final cachedVehicles = await TripService.loadCachedUserVehicles();
    if (mounted && cachedVehicles.isNotEmpty) {
      setState(() {
        _vehicles = cachedVehicles;
        _selectedVehicle ??= cachedVehicles.first;
      });
    }

    final vList = await TripService.getUserVehicles();
    if (mounted) {
      setState(() {
        _vehicles = vList;
        if (vList.isNotEmpty && _selectedVehicle != null) {
          final matched = vList.where(
            (v) => v['regNumber'] == _selectedVehicle?['regNumber'],
          );
          _selectedVehicle = matched.isNotEmpty ? matched.first : vList.first;
        } else if (vList.isNotEmpty) {
          _selectedVehicle = vList.first;
        }
        _isLoadingVehicles = false;
      });
    }
  }

  Future<void> _loadTrips({bool showSpinner = false}) async {
    if (showSpinner) {
      setState(() => _isLoadingTrips = true);
    }
    final trips = await TripService.fetchUserTrips();
    if (mounted) {
      setState(() {
        _backendTrips = trips;
        _isLoadingTrips = false;
      });
    }
  }

  void _swapLocations() {
    setState(() {
      final temp = _fromLocation;
      _fromLocation = _toLocation;
      _toLocation = temp;

      final tempLatLng = _fromLatLng;
      _fromLatLng = _toLatLng;
      _toLatLng = tempLatLng;
    });
  }

  Future<void> _selectFromLocation() async {
    final result = await PlaceSearchModal.show(
      context,
      title: 'Select Starting Point',
      currentQuery: _fromLocation,
      fromLocation: _fromLocation,
      toLocation: _toLocation,
      fromLatLng: _fromLatLng,
      toLatLng: _toLatLng,
    );
    if (result != null) {
      LatLng coords = LatLng(result.lat, result.lon);
      if (coords.latitude == 0.0 || coords.longitude == 0.0) {
        final resolved = await TripService.resolveCoordinates(
          result.displayName,
        );
        if (resolved != null) coords = resolved;
      }
      if (coords.latitude != 0.0 && coords.longitude != 0.0) {
        String name = result.displayName;
        if (name.startsWith('Location (') || name == 'Current Location' || name.trim().isEmpty) {
          final rev = await TripService.reverseGeocode(
            coords.latitude,
            coords.longitude,
          );
          if (rev.isNotEmpty && !rev.startsWith('Location (')) {
            name = rev;
          }
        }
        setState(() {
          _fromLocation = name;
          _fromLatLng = coords;
        });
      }
    }
  }

  Future<void> _selectToLocation() async {
    final result = await PlaceSearchModal.show(
      context,
      title: 'Select Destination',
      currentQuery: _toLocation,
      fromLocation: _fromLocation,
      toLocation: _toLocation,
      fromLatLng: _fromLatLng,
      toLatLng: _toLatLng,
    );
    if (result != null) {
      LatLng coords = LatLng(result.lat, result.lon);
      if (coords.latitude == 0.0 || coords.longitude == 0.0) {
        final resolved = await TripService.resolveCoordinates(
          result.displayName,
        );
        if (resolved != null) coords = resolved;
      }
      if (coords.latitude != 0.0 && coords.longitude != 0.0) {
        String name = result.displayName;
        if (name.startsWith('Location (') || name == 'Destination' || name.trim().isEmpty) {
          final rev = await TripService.reverseGeocode(
            coords.latitude,
            coords.longitude,
          );
          if (rev.isNotEmpty && !rev.startsWith('Location (')) {
            name = rev;
          }
        }
        setState(() {
          _toLocation = name;
          _toLatLng = coords;
        });
      }
    }
  }

  void _onTabSelected(int index) {
    setState(() {
      _selectedTab = index;
    });
    if (index == 2) {
      _loadTrips();
    }
  }

  void _handleBack() {
    if (widget.onBackToHome != null) {
      widget.onBackToHome!();
    } else if (Navigator.canPop(context)) {
      Navigator.pop(context);
    } else {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(
          builder: (context) => const BottomNavigationScreen(initialIndex: 0),
        ),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final primaryColor = isLight
            ? const Color(0xFF0066FF)
            : const Color(0xFF00C2FF);
        final textPrimary = isLight ? const Color(0xFF0F172A) : Colors.white;
        final textSecondary = isLight
            ? const Color(0xFF64748B)
            : const Color(0xFF8E9BAE);

        return PopScope(
          canPop: false,
          onPopInvokedWithResult: (didPop, result) {
            if (didPop) return;
            _handleBack();
          },
          child: Container(
            decoration: BoxDecoration(
              gradient: isLight ? AppTheme.bgGradient : null,
              color: isLight ? null : const Color(0xFF090E17),
            ),
            child: Scaffold(
              backgroundColor: Colors.transparent,
              appBar: AppBar(
                backgroundColor: Colors.transparent,
                elevation: 0,
                leadingWidth: 56,
                leading: AnimatedBackArrowButton(onTap: _handleBack),
                title: Column(
                  children: [
                    Text(
                      'Trips',
                      style: TextStyle(
                        color: textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Plan. Drive. Explore.',
                      style: TextStyle(
                        color: textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                ),
                centerTitle: true,
                actions: [
                  Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: IconButton(
                      tooltip: 'Search Routes',
                      icon: Icon(
                        Icons.search_rounded,
                        color: textPrimary,
                        size: 24,
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const PlanTripScreen(),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
              body: SafeArea(
                bottom: !widget.hasBottomNav,
                child: Column(
                  children: [
                    // Top 3-pill tab switcher
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 8,
                      ),
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: isLight
                              ? Colors.white
                              : const Color(0xFF0F1A26),
                          borderRadius: BorderRadius.circular(28),
                          border: Border.all(
                            color: isLight
                                ? const Color(0xFFE2E8F0)
                                : const Color(0xFF1C273C),
                            width: 1,
                          ),
                          boxShadow: isLight ? AppTheme.cardShadow : null,
                        ),
                        child: Row(
                          children: [
                            _buildTabItem(
                              'Plan a Trip',
                              0,
                              isLight,
                              primaryColor,
                              textSecondary,
                            ),
                            _buildTabItem(
                              'Active Trip',
                              1,
                              isLight,
                              primaryColor,
                              textSecondary,
                            ),
                            _buildTabItem(
                              'Trip History',
                              2,
                              isLight,
                              primaryColor,
                              textSecondary,
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Tab Content Body
                    Expanded(
                      child: RefreshIndicator(
                        color: primaryColor,
                        backgroundColor: isLight
                            ? Colors.white
                            : const Color(0xFF101726),
                        onRefresh: () => _initRealData(showSpinner: false),
                        child: _buildCurrentTabContent(
                          isLight,
                          primaryColor,
                          textPrimary,
                          textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildTabItem(
    String title,
    int index,
    bool isLight,
    Color primaryColor,
    Color textSecondary,
  ) {
    final isSelected = _selectedTab == index;

    return Expanded(
      child: GestureDetector(
        onTap: () => _onTabSelected(index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? primaryColor : Colors.transparent,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Center(
            child: Text(
              title,
              style: TextStyle(
                color: isSelected
                    ? (isLight ? Colors.white : Colors.black)
                    : textSecondary,
                fontSize: 13.5,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCurrentTabContent(
    bool isLight,
    Color primaryColor,
    Color textPrimary,
    Color textSecondary,
  ) {
    switch (_selectedTab) {
      case 1:
        return _buildActiveTripTab(
          isLight,
          primaryColor,
          textPrimary,
          textSecondary,
        );
      case 2:
        return _buildTripHistoryTab(
          isLight,
          primaryColor,
          textPrimary,
          textSecondary,
        );
      case 0:
      default:
        return _buildPlanTripTab(
          isLight,
          primaryColor,
          textPrimary,
          textSecondary,
        );
    }
  }

  // ===========================================================================
  // TAB 0: Plan a Trip with Real Data (Screen 1 matching Screenshot 1)
  // ===========================================================================
  Widget _buildPlanTripTab(
    bool isLight,
    Color primaryColor,
    Color textPrimary,
    Color textSecondary,
  ) {
    final vehicleName =
        _selectedVehicle?['name'] ??
        (Globals.vehicleModel.isNotEmpty ? Globals.vehicleModel : 'My Vehicle');
    final vehicleReg =
        _selectedVehicle?['regNumber'] ?? Globals.vehicleRegistration;
    final vehicleFuel =
        (_selectedVehicle?['type'] != null &&
            _selectedVehicle?['type'] != 'Petrol')
        ? _selectedVehicle!['type']
        : VehicleTypeService.detectFuelType(_selectedVehicle?['name'] ?? '');

    final bottomInset = widget.hasBottomNav
        ? (112.0 + MediaQuery.of(context).padding.bottom)
        : (24.0 + MediaQuery.of(context).padding.bottom);

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(
        parent: BouncingScrollPhysics(),
      ),
      padding: EdgeInsets.fromLTRB(18, 8, 18, bottomInset),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Hero Banner Card matching Screenshot 1 Screen 1
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: isLight ? Colors.white : const Color(0xFF101726),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(
                color: isLight
                    ? const Color(0xFFE2E8F0)
                    : const Color(0xFF1C273C),
                width: 1,
              ),
              boxShadow: isLight ? AppTheme.cardShadow : null,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Castle/Mountain Image with Smart Navigation badge
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(21),
                      ),
                      child: SizedBox(
                        height: 155,
                        width: double.infinity,
                        child: Image.asset(
                          'assets/images/trip_mountains_banner.jpg',
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    // Gradient overlay at bottom of image for seamless blending
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: 40,
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              (isLight ? Colors.white : const Color(0xFF101726))
                                  .withValues(alpha: 0.95),
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Pill badge "• Smart Navigation"
                    Positioned(
                      top: 12,
                      left: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF09101C).withValues(alpha: 0.8),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.15),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Text(
                              'Smart Navigation',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),

                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      RichText(
                        text: TextSpan(
                          text: 'New Destinations ',
                          style: TextStyle(
                            color: textPrimary,
                            fontSize: 19,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.3,
                          ),
                          children: [
                            TextSpan(
                              text: 'Await',
                              style: TextStyle(
                                color: primaryColor,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Plan your trip with the best routes, stops and real-time information.',
                        style: TextStyle(
                          color: textSecondary,
                          fontSize: 12,
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Plan a Trip -> Button (Redirects to Screen 2)
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => PlanTripScreen(
                                  initialFrom: _fromLocation,
                                  initialTo: _toLocation,
                                  initialFromLatLng: _fromLatLng,
                                  initialToLatLng: _toLatLng,
                                  initialVehicle: _selectedVehicle,
                                  initialPreference: _selectedPreference,
                                  initialStops: _addedStops,
                                  initialIsDoubleRoute: _isDoubleRoute,
                                  initialShowRouteBuilder: _showRouteBuilder,
                                ),
                              ),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: primaryColor,
                            foregroundColor: isLight
                                ? Colors.white
                                : Colors.black,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(23),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Plan a Trip',
                                style: TextStyle(
                                  color: isLight ? Colors.white : Colors.black,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(width: 8),
                              AppIcons.svg(
                                AppIcons.arrow,
                                color: isLight ? Colors.white : Colors.black,
                                width: 14,
                                height: 14,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // 2. "Plan Your Trip" Container matching Screenshot 1
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isLight ? Colors.white : const Color(0xFF101726),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(
                color: isLight
                    ? const Color(0xFFE2E8F0)
                    : const Color(0xFF1C273C),
                width: 1,
              ),
              boxShadow: isLight ? AppTheme.cardShadow : null,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Plan Your Trip',
                      style: TextStyle(
                        color: textPrimary,
                        fontSize: 16.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Set your destination & preferences',
                      style: TextStyle(color: textSecondary, fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // From / To Selector with Swap
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFF8FAFC)
                        : const Color(0xFF080E16),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isLight
                          ? const Color(0xFFE2E8F0)
                          : const Color(0xFF1C273C),
                      width: 1,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // "From" Row
                      GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: _selectFromLocation,
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            SizedBox(
                              width: 24,
                              height: 24,
                              child: Center(
                                child: Container(
                                  width: 14,
                                  height: 14,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: const Color(0xFF1A73E8).withValues(alpha: 0.18),
                                  ),
                                  child: Center(
                                    child: Container(
                                      width: 7,
                                      height: 7,
                                      decoration: const BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: Color(0xFF1A73E8),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'From',
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF475569)
                                          : const Color(0xFF94A3B8),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _fromLocation.isNotEmpty
                                        ? _fromLocation
                                        : 'Enter starting location',
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF0F172A)
                                          : Colors.white,
                                      fontSize: 14,
                                      fontWeight: _fromLocation.isNotEmpty
                                          ? FontWeight.w600
                                          : FontWeight.w500,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            // Three dots in From (Screenshot 1 & 2)
                            SizedBox(
                              width: 36,
                              height: 36,
                              child: Center(
                                child: Theme(
                                  data: Theme.of(context).copyWith(
                                    cardColor: isLight
                                        ? Colors.white
                                        : const Color(0xFF1E293B),
                                    popupMenuTheme: PopupMenuThemeData(
                                      color: isLight
                                          ? Colors.white
                                          : const Color(0xFF1E293B),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(16),
                                        side: BorderSide(
                                          color: isLight
                                              ? const Color(0xFFE2E8F0)
                                              : const Color(0xFF334155),
                                          width: 0.8,
                                        ),
                                      ),
                                      elevation: 0,
                                    ),
                                  ),
                                  child: PopupMenuButton<String>(
                                    padding: EdgeInsets.zero,
                                    offset: const Offset(0, 36),
                                    constraints: const BoxConstraints(
                                      minWidth: 190,
                                      maxWidth: 230,
                                    ),
                                    icon: Icon(
                                      Icons.more_vert_rounded,
                                      color: isLight
                                          ? const Color(0xFF0F172A)
                                          : Colors.white,
                                      size: 22,
                                    ),
                                    onSelected: (val) async {
                                      if (val == 'single_routes') {
                                        setState(() {
                                          _isDoubleRoute = false;
                                          _routeType = 'Single routes';
                                          _showRouteBuilder = false;
                                          if (_fromLocation.isEmpty) {
                                            _fromLocation = 'Indore, Madhya Pradesh, India';
                                            _fromLatLng = const LatLng(22.7196, 75.8577);
                                          }
                                          if (_toLocation.isEmpty) {
                                            _toLocation = 'Ujjain, Madhya Pradesh, India';
                                            _toLatLng = const LatLng(23.1765, 75.7885);
                                          }
                                          _addedStops.clear();
                                        });
                                        final fromName = _fromLocation.split(',').first.trim();
                                        final toName = _toLocation.split(',').first.trim();
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text('Single route active ($fromName → $toName)'),
                                            duration: const Duration(seconds: 2),
                                          ),
                                        );
                                      } else if (val == 'double_routes') {
                                        setState(() {
                                          _isDoubleRoute = true;
                                          _routeType = 'Double routes';
                                          _showRouteBuilder = true;
                                        });
                                        final fromName = _fromLocation.isNotEmpty ? _fromLocation.split(',').first.trim() : 'Start';
                                        final toName = _toLocation.isNotEmpty ? _toLocation.split(',').first.trim() : 'Destination';
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text('Double route active: $fromName → $toName → $fromName'),
                                            duration: const Duration(seconds: 2),
                                          ),
                                        );
                                      } else if (val == 'add_routes') {
                                        setState(() {
                                          _showRouteBuilder = true;
                                        });
                                      }
                                    },
                                    itemBuilder: (ctx) => [
                                      PopupMenuItem<String>(
                                        value: 'single_routes',
                                        height: 44,
                                        padding: const EdgeInsets.symmetric(horizontal: 18),
                                        child: Text(
                                          'Single routes',
                                          style: TextStyle(
                                            color: isLight ? const Color(0xFF202124) : Colors.white,
                                            fontSize: 14.5,
                                            fontWeight: _routeType == 'Single routes'
                                                ? FontWeight.w600
                                                : FontWeight.w400,
                                          ),
                                        ),
                                      ),
                                      PopupMenuItem<String>(
                                        value: 'double_routes',
                                        height: 44,
                                        padding: const EdgeInsets.symmetric(horizontal: 18),
                                        child: Text(
                                          'Double routes',
                                          style: TextStyle(
                                            color: isLight ? const Color(0xFF202124) : Colors.white,
                                            fontSize: 14.5,
                                            fontWeight: _routeType == 'Double routes'
                                                ? FontWeight.w600
                                                : FontWeight.w400,
                                          ),
                                        ),
                                      ),
                                      PopupMenuItem<String>(
                                        value: 'add_routes',
                                        height: 44,
                                        padding: const EdgeInsets.symmetric(horizontal: 18),
                                        child: Text(
                                          'Add routes',
                                          style: TextStyle(
                                            color: isLight ? const Color(0xFF202124) : Colors.white,
                                            fontSize: 14.5,
                                            fontWeight: FontWeight.w400,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Connecting 3 Dots + Horizontal Divider Line (Screenshot 1)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3.0),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 24,
                              child: Center(
                                child: Column(
                                  children: List.generate(
                                    3,
                                    (index) => Container(
                                      width: 2.2,
                                      height: 3,
                                      margin: const EdgeInsets.symmetric(
                                        vertical: 1.5,
                                      ),
                                      decoration: BoxDecoration(
                                        color: isLight
                                            ? const Color(0xFF94A3B8)
                                            : const Color(0xFF475569),
                                        borderRadius: BorderRadius.circular(1),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Container(
                                height: 0.9,
                                color: isLight
                                    ? const Color(0xFFE2E8F0)
                                    : const Color(0xFF1E293B),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // "To" / Route Builder section inside the SAME container
                      if (_showRouteBuilder) ...[
                        // 1. Destination / Primary Stop (A)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Container(
                              width: 22,
                              height: 22,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isLight ? const Color(0xFF202124) : Colors.white70,
                                  width: 1.6,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  'A',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF202124) : Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Text(
                                _toLocation.isNotEmpty ? _cleanTitle(_toLocation) : 'Enter destination',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF202124) : Colors.white,
                                  fontSize: 15.5,
                                  fontWeight: FontWeight.w500,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(
                              width: 32,
                              height: 32,
                              child: Center(
                                child: Icon(
                                  Icons.drag_handle_rounded,
                                  color: Color(0xFF5F6368),
                                  size: 20,
                                ),
                              ),
                            ),
                            SizedBox(
                              width: 32,
                              height: 32,
                              child: IconButton(
                                padding: EdgeInsets.zero,
                                icon: const Icon(
                                  Icons.close_rounded,
                                  color: Color(0xFF5F6368),
                                  size: 19,
                                ),
                                onPressed: () {
                                  setState(() {
                                    if (_addedStops.isNotEmpty) {
                                      final next = _addedStops.removeAt(0);
                                      _toLocation = next.displayName;
                                      _toLatLng = LatLng(next.lat, next.lon);
                                    } else {
                                      _toLocation = '';
                                    }
                                  });
                                },
                              ),
                            ),
                          ],
                        ),

                        // Connector dots
                        _buildTripConnectorDots(isLight),

                        // 2. Extra stops (B, C...)
                        ..._addedStops.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final stop = entry.value;
                          final letter = String.fromCharCode(66 + idx); // B, C...
                          return Column(
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 22,
                                    height: 22,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: isLight ? const Color(0xFF202124) : Colors.white70,
                                        width: 1.6,
                                      ),
                                    ),
                                    child: Center(
                                      child: Text(
                                        letter,
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF202124) : Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Text(
                                      stop.shortTitle.isNotEmpty ? stop.shortTitle : _cleanTitle(stop.displayName),
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF202124) : Colors.white,
                                        fontSize: 15.5,
                                        fontWeight: FontWeight.w500,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(
                                    width: 32,
                                    height: 32,
                                    child: Center(
                                      child: Icon(
                                        Icons.drag_handle_rounded,
                                        color: Color(0xFF5F6368),
                                        size: 20,
                                      ),
                                    ),
                                  ),
                                  SizedBox(
                                    width: 32,
                                    height: 32,
                                    child: IconButton(
                                      padding: EdgeInsets.zero,
                                      icon: const Icon(
                                        Icons.close_rounded,
                                        color: Color(0xFF5F6368),
                                        size: 19,
                                      ),
                                      onPressed: () {
                                        setState(() {
                                          _addedStops.removeAt(idx);
                                        });
                                      },
                                    ),
                                  ),
                                ],
                              ),
                              _buildTripConnectorDots(isLight),
                            ],
                          );
                        }),

                        // 3. Return Leg if Double Route
                        if (_isDoubleRoute) ...[
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Container(
                                width: 18,
                                height: 18,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: const Color(0xFF1A73E8).withValues(alpha: 0.18),
                                ),
                                child: Center(
                                  child: Container(
                                    width: 8.5,
                                    height: 8.5,
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Color(0xFF1A73E8),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Text(
                                  _cleanTitle(_fromLocation),
                                  style: const TextStyle(
                                    color: Color(0xFF1A73E8),
                                    fontSize: 15.5,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(
                                width: 32,
                                height: 32,
                                child: Center(
                                  child: Icon(
                                    Icons.drag_handle_rounded,
                                    color: Color(0xFF5F6368),
                                    size: 20,
                                  ),
                                ),
                              ),
                              SizedBox(
                                width: 32,
                                height: 32,
                                child: IconButton(
                                  padding: EdgeInsets.zero,
                                  icon: const Icon(
                                    Icons.close_rounded,
                                    color: Color(0xFF5F6368),
                                    size: 19,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      _isDoubleRoute = false;
                                      _routeType = 'Single routes';
                                    });
                                  },
                                ),
                              ),
                            ],
                          ),
                          _buildTripConnectorDots(isLight),
                        ],

                        // 4. "Choose destination"
                        InkWell(
                          onTap: () async {
                            final res = await PlaceSearchModal.show(
                              context,
                              title: 'Choose destination / stop',
                              currentQuery: '',
                              fromLocation: _fromLocation,
                              toLocation: _toLocation,
                              fromLatLng: _fromLatLng,
                              toLatLng: _toLatLng,
                            );
                            if (res != null && mounted) {
                              setState(() {
                                if (_toLocation.isEmpty) {
                                  _toLocation = res.displayName;
                                  _toLatLng = LatLng(res.lat, res.lon);
                                } else {
                                  _addedStops.add(res);
                                }
                              });
                            }
                          },
                          borderRadius: BorderRadius.circular(10),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4.0),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                const SizedBox(
                                  width: 28,
                                  height: 28,
                                  child: Center(
                                    child: Icon(
                                      Icons.location_on,
                                      color: Color(0xFFEA4335),
                                      size: 22,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Text(
                                    'Choose destination',
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF5F6368) : const Color(0xFF94A3B8),
                                      fontSize: 15.5,
                                    ),
                                  ),
                                ),
                                const SizedBox(
                                  width: 32,
                                  height: 32,
                                  child: Center(
                                    child: Icon(
                                      Icons.drag_handle_rounded,
                                      color: Color(0xFF5F6368),
                                      size: 20,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 32),
                              ],
                            ),
                          ),
                        ),

                        // Divider Line
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8.0),
                          child: Divider(
                            height: 1,
                            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E293B),
                          ),
                        ),

                        // Total trip line (clean & compact, Done button removed)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 2.0),
                          child: Text(
                            _getTripSummaryText(),
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF94A3B8),
                              fontSize: 12.5,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ] else ...[
                        // Standard "To" Row
                        GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: _selectToLocation,
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              const SizedBox(
                                width: 24,
                                height: 24,
                                child: Center(
                                  child: Icon(
                                    Icons.location_on,
                                    color: Color(0xFFEA4335),
                                    size: 20,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'To',
                                      style: TextStyle(
                                        color: isLight
                                            ? const Color(0xFF475569)
                                            : const Color(0xFF94A3B8),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _toLocation.isNotEmpty
                                          ? _toLocation
                                          : 'Enter destination',
                                      style: TextStyle(
                                        color: isLight
                                            ? const Color(0xFF0F172A)
                                            : Colors.white,
                                        fontSize: 14,
                                        fontWeight: _toLocation.isNotEmpty
                                            ? FontWeight.w600
                                            : FontWeight.w500,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              // Double Arrow (Swap) button in To
                              SizedBox(
                                width: 36,
                                height: 36,
                                child: Center(
                                  child: GestureDetector(
                                    behavior: HitTestBehavior.opaque,
                                    onTap: _swapLocations,
                                    child: Icon(
                                      Icons.swap_vert_rounded,
                                      color: isLight
                                          ? const Color(0xFF0F172A)
                                          : Colors.white,
                                      size: 24,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        if (_addedStops.isNotEmpty || _isDoubleRoute) ...[
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1A73E8).withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  _isDoubleRoute
                                      ? 'Round trip • ${_addedStops.length + 1} stops'
                                      : '${_addedStops.length} stop${_addedStops.length > 1 ? "s" : ""}',
                                  style: const TextStyle(
                                    color: Color(0xFF1A73E8),
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              const Spacer(),
                              GestureDetector(
                                onTap: () => setState(() => _showRouteBuilder = true),
                                child: const Text(
                                  'Edit stops',
                                  style: TextStyle(
                                    color: Color(0xFF00897B),
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ],
                  ),
                ),

                const SizedBox(height: 16),
                // Select Vehicle
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Select Vehicle',
                      style: TextStyle(
                        color: textSecondary,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const MyVehiclesScreen(),
                          ),
                        ).then((_) {
                          if (mounted) {
                            _loadUserVehicles();
                          }
                        });
                      },
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Manage Vehicles',
                            style: TextStyle(
                              color: primaryColor,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 2),
                          Icon(
                            Icons.chevron_right_rounded,
                            size: 16,
                            color: primaryColor,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                GestureDetector(
                  onTap: () {
                    _showVehiclePicker(
                      isLight,
                      primaryColor,
                      textPrimary,
                      textSecondary,
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: isLight
                          ? const Color(0xFFF8FAFC)
                          : const Color(0xFF080E16),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isLight
                            ? const Color(0xFFE2E8F0)
                            : const Color(0xFF1C273C),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: isLight
                                ? const Color(0xFFEDF4FF)
                                : const Color(0xFF102638),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isLight
                                  ? const Color(0xFFD0E1FD)
                                  : const Color(0xFF163952),
                              width: 1,
                            ),
                          ),
                          child: Center(
                            child: AppIcons.svg(
                              AppIcons.car,
                              color: primaryColor,
                              width: 22,
                              height: 22,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                vehicleName,
                                style: TextStyle(
                                  color: textPrimary,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '$vehicleReg • $vehicleFuel',
                                style: TextStyle(
                                  color: textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          Icons.keyboard_arrow_down_rounded,
                          color: textSecondary,
                          size: 24,
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Trip Preferences
                Text(
                  'Trip Preferences',
                  style: TextStyle(
                    color: textSecondary,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _buildPreferenceChip('Fastest', isLight, primaryColor),
                    const SizedBox(width: 10),
                    _buildPreferenceChip('Shortest', isLight, primaryColor),
                    const SizedBox(width: 10),
                    _buildPreferenceChip('Eco-Friendly', isLight, primaryColor),
                  ],
                ),
                const SizedBox(height: 14),

                // "+ Add a Stop (Optional)" Row matching Screenshot 1 & 2
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFF8FAFC)
                        : const Color(0xFF080E16),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: _addedStops.isNotEmpty
                          ? primaryColor
                          : (isLight
                                ? const Color(0xFFE2E8F0)
                                : const Color(0xFF1C273C)),
                      width: _addedStops.isNotEmpty ? 1.5 : 1,
                    ),
                  ),
                  child: _addedStops.isNotEmpty
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(5),
                                      decoration: BoxDecoration(
                                        color: primaryColor.withValues(
                                          alpha: 0.15,
                                        ),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(
                                        Icons.pin_drop_rounded,
                                        color: primaryColor,
                                        size: 16,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '${_addedStops.length} ${_addedStops.length == 1 ? "Stop" : "Stops"} Added',
                                      style: TextStyle(
                                        color: primaryColor,
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                                GestureDetector(
                                  onTap: () async {
                                    final res =
                                        await PlaceSearchModal.showMulti(
                                          context,
                                          title: 'Add Stops Along Route',
                                          initialSelected: _addedStops,
                                          vehicle: _selectedVehicle,
                                          fromLocation: _fromLocation,
                                          toLocation: _toLocation,
                                          fromLatLng: _fromLatLng,
                                          toLatLng: _toLatLng,
                                        );
                                    if (res != null && mounted) {
                                      setState(() {
                                        _addedStops = res;
                                      });
                                    }
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: primaryColor.withValues(
                                        alpha: 0.12,
                                      ),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.add,
                                          color: primaryColor,
                                          size: 14,
                                        ),
                                        const SizedBox(width: 3),
                                        Text(
                                          'Add More',
                                          style: TextStyle(
                                            color: primaryColor,
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            ..._addedStops.asMap().entries.map((entry) {
                              final idx = entry.key;
                              final stop = entry.value;
                              return Container(
                                margin: const EdgeInsets.only(top: 6),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: isLight
                                      ? Colors.white
                                      : const Color(0xFF111A26),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: isLight
                                        ? const Color(0xFFE2E8F0)
                                        : const Color(0xFF1D2C3E),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 22,
                                      height: 22,
                                      decoration: BoxDecoration(
                                        color: primaryColor.withValues(
                                          alpha: 0.15,
                                        ),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Center(
                                        child: Text(
                                          '${idx + 1}',
                                          style: TextStyle(
                                            color: primaryColor,
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        stop.shortTitle,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: textPrimary,
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    GestureDetector(
                                      onTap: () {
                                        setState(() {
                                          _addedStops.removeAt(idx);
                                        });
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.all(3),
                                        decoration: BoxDecoration(
                                          color: isLight
                                              ? const Color(0xFFF1F5F9)
                                              : const Color(0xFF1B2838),
                                          shape: BoxShape.circle,
                                        ),
                                        child: Icon(
                                          Icons.close_rounded,
                                          color: textSecondary,
                                          size: 14,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],
                        )
                      : GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () async {
                            final res = await PlaceSearchModal.showMulti(
                              context,
                              title: 'Add Stops Along Route',
                              initialSelected: _addedStops,
                              vehicle: _selectedVehicle,
                              fromLocation: _fromLocation,
                              toLocation: _toLocation,
                              fromLatLng: _fromLatLng,
                              toLatLng: _toLatLng,
                            );
                            if (res != null && mounted) {
                              setState(() {
                                _addedStops = res;
                              });
                            }
                          },
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  AppIcons.svg(
                                    AppIcons.plus,
                                    color: primaryColor,
                                    width: 14,
                                    height: 14,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Add a Stop (Optional)',
                                    style: TextStyle(
                                      color: textPrimary,
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                              Text(
                                (_selectedVehicle?['type']
                                            ?.toString()
                                            .toLowerCase()
                                            .contains('ev') ==
                                        true
                                    ? 'EV, Food, Stay'
                                    : 'Fuel, Food, Stay'),
                                style: TextStyle(
                                  color: textSecondary,
                                  fontSize: 11.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                ),

                const SizedBox(height: 18),

                // "Find Routes ->" Button: Redirects to Screen 2 (PlanTripScreen)
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: () {
                      if (_fromLocation.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Please select starting location'),
                            backgroundColor: Colors.redAccent,
                          ),
                        );
                        return;
                      }
                      if (_toLocation.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Please select destination'),
                            backgroundColor: Colors.redAccent,
                          ),
                        );
                        return;
                      }

                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => PlanTripScreen(
                            initialFrom: _fromLocation,
                            initialTo: _toLocation,
                            initialFromLatLng: _fromLatLng,
                            initialToLatLng: _toLatLng,
                            initialVehicle: _selectedVehicle,
                            initialPreference: _selectedPreference,
                            initialStops: _addedStops,
                            initialIsDoubleRoute: _isDoubleRoute,
                            initialShowRouteBuilder: _showRouteBuilder,
                          ),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: isLight ? Colors.white : Colors.black,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(25),
                      ),
                    ),
                    child: Center(
                      child: Text(
                        'Find Routes',
                        style: TextStyle(
                          color: isLight ? Colors.white : Colors.black,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Real Trip History Quick Preview
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Recent Trips',
                style: TextStyle(
                  color: textPrimary,
                  fontSize: 16.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
              GestureDetector(
                onTap: () {
                  setState(() => _selectedTab = 2);
                },
                child: Text(
                  'See All',
                  style: TextStyle(
                    color: primaryColor,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          if (_backendTrips.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
              decoration: BoxDecoration(
                color: isLight ? Colors.white : const Color(0xFF101726),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isLight
                      ? const Color(0xFFE2E8F0)
                      : const Color(0xFF1F293D),
                ),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.route_outlined,
                    size: 36,
                    color: isLight
                        ? const Color(0xFF94A3B8)
                        : const Color(0xFF64748B),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'No recent trips',
                    style: TextStyle(
                      color: textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Your recent trips will appear here.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: textSecondary, fontSize: 12),
                  ),
                ],
              ),
            )
          else
            ..._backendTrips.take(3).map((bt) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _buildRecentTripItem(
                  from: (bt['fromName'] ?? 'Start').toString().split(',').first,
                  to: (bt['toName'] ?? 'Destination')
                      .toString()
                      .split(',')
                      .first,
                  date: _formatTripDateTime(bt['startedAt'], bt['createdAt']),
                  distance: bt['distance'] ?? '--',
                  duration: bt['duration'] ?? '--',
                  isLight: isLight,
                  primaryColor: primaryColor,
                  textPrimary: textPrimary,
                  textSecondary: textSecondary,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => TripCompletedScreen(
                          tripId: bt['id']?.toString(),
                          startedAt: bt['startedAt']?.toString(),
                          fromLocation: (bt['fromName'] ?? 'Start')
                              .toString()
                              .split(',')
                              .first,
                          toLocation: (bt['toName'] ?? 'Destination')
                              .toString()
                              .split(',')
                              .first,
                          distance: bt['distance'] ?? '--',
                          duration: bt['duration'] ?? '--',
                          dateTimeRange: _formatTripDateTime(
                            bt['startedAt'],
                            bt['createdAt'],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              );
            }),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  // ===========================================================================
  // TAB 1: Active Trip (Matching Screenshot 3 "No Active Trip" Layout)
  // ===========================================================================
  Widget _buildActiveTripTab(
    bool isLight,
    Color primaryColor,
    Color textPrimary,
    Color textSecondary,
  ) {
    final activeMatches = _backendTrips
        .where((t) => t['status'] == 'ACTIVE')
        .toList();
    final dynamic activeTrip = activeMatches.isNotEmpty
        ? activeMatches.first
        : null;

    if (activeTrip != null) {
      final from = (activeTrip['fromName'] ?? 'Start')
          .toString()
          .split(',')
          .first;
      final to = (activeTrip['toName'] ?? 'Destination')
          .toString()
          .split(',')
          .first;
      final dist = activeTrip['distance'] ?? '--';
      final dur = activeTrip['duration'] ?? '--';
      final via = activeTrip['viaRoute'] ?? 'Main Road';

      final bottomInset = widget.hasBottomNav
          ? (112.0 + MediaQuery.of(context).padding.bottom)
          : (24.0 + MediaQuery.of(context).padding.bottom);

      return SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        padding: EdgeInsets.fromLTRB(18, 18, 18, bottomInset),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: isLight ? Colors.white : const Color(0xFF101726),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: primaryColor, width: 1.5),
                boxShadow: isLight ? AppTheme.cardShadow : null,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: primaryColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.navigation_rounded,
                              color: primaryColor,
                              size: 14,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'TRIP IN PROGRESS',
                              style: TextStyle(
                                color: primaryColor,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      Text(
                        dur,
                        style: TextStyle(
                          color: textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '$from → $to',
                    style: TextStyle(
                      color: textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$dist • $via',
                    style: TextStyle(color: textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => ActiveTripScreen(
                              isNavigating: true,
                              tripId: activeTrip['id']?.toString(),
                              fromLocation: from,
                              toLocation: to,
                              distance: dist,
                              duration: dur,
                              viaRoute: via,
                              fromLatLng: () {
                                final lat =
                                    double.tryParse(
                                      activeTrip['fromLat']?.toString() ?? '',
                                    ) ??
                                    0.0;
                                final lng =
                                    double.tryParse(
                                      activeTrip['fromLng']?.toString() ?? '',
                                    ) ??
                                    0.0;
                                if (lat != 0.0 && lng != 0.0) {
                                  return LatLng(lat, lng);
                                }
                                final localFrom = _fromLatLng;
                                if (localFrom != null && localFrom.latitude != 0.0 && localFrom.longitude != 0.0) {
                                  return localFrom;
                                }
                                return const LatLng(22.7196, 75.8577);
                              }(),
                              toLatLng: () {
                                final lat =
                                    double.tryParse(
                                      activeTrip['toLat']?.toString() ?? '',
                                    ) ??
                                    0.0;
                                final lng =
                                    double.tryParse(
                                      activeTrip['toLng']?.toString() ?? '',
                                    ) ??
                                    0.0;
                                if (lat != 0.0 && lng != 0.0) {
                                  return LatLng(lat, lng);
                                }
                                final localTo = _toLatLng;
                                if (localTo != null && localTo.latitude != 0.0 && localTo.longitude != 0.0) {
                                  return localTo;
                                }
                                return const LatLng(23.1765, 75.7885);
                              }(),
                              vehicle: _selectedVehicle,
                              stops: _addedStops,
                            ),
                          ),
                        ).then((_) {
                          if (mounted) _loadTrips();
                        });
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: isLight ? Colors.white : Colors.black,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Resume / Complete Trip',
                            style: TextStyle(
                              color: isLight ? Colors.white : Colors.black,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(
                            Icons.arrow_forward_rounded,
                            color: isLight ? Colors.white : Colors.black,
                            size: 18,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // Exact layout matching Screenshot 3 with zero-overflow scroll protection
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: IntrinsicHeight(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    const Spacer(flex: 2),

                    // 3D Folded Map illustration with floating cyan pin
                    FoldedMapIllustration(
                      width: 250,
                      height: 210,
                      isLight: isLight,
                    ),

                    const SizedBox(height: 28),

                    // Title matching Screenshot 3
                    Text(
                      'No Active Trip',
                      style: TextStyle(
                        color: textPrimary,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.2,
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Description matching Screenshot 3
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Text(
                        "You don't have any ongoing trip right now.\nPlan a new trip to get the best routes,\nlive navigation and real-time updates.",
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: textSecondary,
                          fontSize: 13.5,
                          height: 1.45,
                        ),
                      ),
                    ),

                    const Spacer(flex: 3),

                    // Bottom Button "Plan a Trip ->" matching Screenshot 3
                    Padding(
                      padding: EdgeInsets.only(
                        bottom: widget.hasBottomNav
                            ? (112.0 + MediaQuery.of(context).padding.bottom)
                            : 24,
                      ),
                      child: SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: () {
                            setState(() => _selectedTab = 0);
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: primaryColor,
                            foregroundColor: isLight
                                ? Colors.white
                                : Colors.black,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(26),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Plan a Trip',
                                style: TextStyle(
                                  color: isLight ? Colors.white : Colors.black,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Icon(
                                Icons.arrow_forward_rounded,
                                color: isLight ? Colors.white : Colors.black,
                                size: 20,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  // ===========================================================================
  // TAB 2: Trip History (Real Backend Data Only)
  // ===========================================================================
  Widget _buildTripHistoryTab(
    bool isLight,
    Color primaryColor,
    Color textPrimary,
    Color textSecondary,
  ) {
    final bottomInset = widget.hasBottomNav
        ? (112.0 + MediaQuery.of(context).padding.bottom)
        : (24.0 + MediaQuery.of(context).padding.bottom);

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(
        parent: BouncingScrollPhysics(),
      ),
      padding: EdgeInsets.fromLTRB(18, 12, 18, bottomInset),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Recent Trips',
                style: TextStyle(
                  color: textPrimary,
                  fontSize: 16.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
              GestureDetector(
                onTap: _loadTrips,
                child: Row(
                  children: [
                    if (_isLoadingTrips)
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: AppLoadingSpinner(
                          size: 14,
                          primaryColor: primaryColor,
                          showGlow: false,
                        ),
                      ),
                    Text(
                      'Refresh',
                      style: TextStyle(
                        color: primaryColor,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          if (_backendTrips.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
              decoration: BoxDecoration(
                color: isLight ? Colors.white : const Color(0xFF101726),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isLight
                      ? const Color(0xFFE2E8F0)
                      : const Color(0xFF182232),
                ),
                boxShadow: isLight ? AppTheme.cardShadow : null,
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.history_toggle_off_rounded,
                    color: isLight
                        ? const Color(0xFF94A3B8)
                        : const Color(0xFF5B6E82),
                    size: 48,
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'No Trips Found',
                    style: TextStyle(
                      color: textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Your planned and completed trips will show up here.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: 18),
                  ElevatedButton(
                    onPressed: () => setState(() => _selectedTab = 0),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: isLight ? Colors.white : Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Plan a Trip Now',
                          style: TextStyle(
                            color: isLight ? Colors.white : Colors.black,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Icon(
                          Icons.arrow_forward_rounded,
                          color: isLight ? Colors.white : Colors.black,
                          size: 16,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            )
          else
            ..._backendTrips.map((bt) {
              final from = (bt['fromName'] ?? 'Start')
                  .toString()
                  .split(',')
                  .first;
              final to = (bt['toName'] ?? 'Destination')
                  .toString()
                  .split(',')
                  .first;
              final dist = bt['distance'] ?? '--';
              final dur = bt['duration'] ?? '--';
              final status = bt['status'] ?? 'COMPLETED';
              final dateStr = _formatTripDateTime(
                bt['startedAt'],
                bt['createdAt'],
              );

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _buildRecentTripItem(
                  from: from,
                  to: to,
                  date: '$dateStr • $status',
                  distance: dist,
                  duration: dur,
                  isLight: isLight,
                  primaryColor: primaryColor,
                  textPrimary: textPrimary,
                  textSecondary: textSecondary,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => TripCompletedScreen(
                          tripId: bt['id']?.toString(),
                          startedAt: bt['startedAt']?.toString(),
                          fromLocation: from,
                          toLocation: to,
                          distance: dist,
                          duration: dur,
                          dateTimeRange: dateStr,
                        ),
                      ),
                    );
                  },
                ),
              );
            }),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  void _showVehiclePicker(
    bool isLight,
    Color primaryColor,
    Color textPrimary,
    Color textSecondary,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final bottomPad = MediaQuery.of(ctx).viewInsets.bottom;
        return Padding(
          padding: EdgeInsets.only(bottom: bottomPad),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(ctx).size.height * 0.72,
            ),
            decoration: BoxDecoration(
              color: isLight ? Colors.white : const Color(0xFF101726),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top drag handle
                Center(
                  child: Container(
                    width: 38,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 14),
                    decoration: BoxDecoration(
                      color: isLight
                          ? const Color(0xFFE2E8F0)
                          : const Color(0xFF1E2D3E),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Select Vehicle',
                      style: TextStyle(
                        color: textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        Navigator.pop(ctx);
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const MyVehiclesScreen(),
                          ),
                        ).then((_) {
                          if (mounted) {
                            _loadUserVehicles();
                          }
                        });
                      },
                      child: Text(
                        'Manage Vehicles',
                        style: TextStyle(
                          color: primaryColor,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (_vehicles.isEmpty && _isLoadingVehicles)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 30),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_vehicles.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.directions_car_outlined,
                            size: 40,
                            color: isLight
                                ? const Color(0xFF94A3B8)
                                : const Color(0xFF64748B),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'No vehicles added yet',
                            style: TextStyle(
                              color: textPrimary,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Add a vehicle in My Vehicles to plan trips.',
                            style: TextStyle(
                              color: textSecondary,
                              fontSize: 12.5,
                            ),
                          ),
                          const SizedBox(height: 14),
                          ElevatedButton.icon(
                            onPressed: () {
                              Navigator.pop(ctx);
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) =>
                                      const MyVehiclesScreen(),
                                ),
                              ).then((_) {
                                if (mounted) _loadUserVehicles();
                              });
                            },
                            icon: const Icon(Icons.add_rounded, size: 16),
                            label: const Text('Add Vehicle'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: primaryColor,
                              foregroundColor: isLight
                                  ? Colors.white
                                  : Colors.black,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  Flexible(
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: _vehicles.length,
                      separatorBuilder: (_, _) => Divider(
                        height: 1,
                        color: isLight
                            ? const Color(0xFFF1F5F9)
                            : const Color(0xFF1E2D3E),
                      ),
                      itemBuilder: (context, i) {
                        final v = _vehicles[i];
                        final isSelected =
                            _selectedVehicle?['regNumber'] == v['regNumber'];
                        final vName = (v['name'] ?? 'Vehicle').toString();
                        final vFuel =
                            (v['type'] != null && v['type'] != 'Petrol')
                            ? v['type']
                            : VehicleTypeService.detectFuelType(vName);
                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            vertical: 4,
                          ),
                          leading: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: primaryColor.withValues(
                                alpha: isLight ? 0.08 : 0.15,
                              ),
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: AppIcons.svg(
                                AppIcons.car,
                                color: primaryColor,
                                width: 20,
                                height: 20,
                              ),
                            ),
                          ),
                          title: Text(
                            vName,
                            style: TextStyle(
                              color: textPrimary,
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                          subtitle: Text(
                            '${v['regNumber'] ?? ''} • $vFuel',
                            style: TextStyle(
                              color: textSecondary,
                              fontSize: 13,
                            ),
                          ),
                          trailing: isSelected
                              ? Icon(
                                  Icons.check_circle_rounded,
                                  color: primaryColor,
                                  size: 24,
                                )
                              : null,
                          onTap: () {
                            setState(() => _selectedVehicle = v);
                            Navigator.pop(ctx);
                          },
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _formatTripDateTime(dynamic startedAt, dynamic createdAt) {
    final timestamp = startedAt ?? createdAt;
    if (timestamp == null) return 'Recent';
    try {
      final dt = DateTime.parse(timestamp.toString()).toLocal();
      final months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final minute = dt.minute.toString().padLeft(2, '0');
      final meridiem = dt.hour >= 12 ? 'PM' : 'AM';
      return '${dt.day} ${months[dt.month - 1]} ${dt.year} • $hour:$minute $meridiem';
    } catch (_) {
      return 'Recent';
    }
  }

  Widget _buildPreferenceChip(String title, bool isLight, Color primaryColor) {
    final isSelected = _selectedPreference == title;

    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedPreference = title;
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected
                ? primaryColor
                : (isLight ? const Color(0xFFF1F5F9) : const Color(0xFF080E16)),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isSelected
                  ? primaryColor
                  : (isLight
                        ? const Color(0xFFE2E8F0)
                        : const Color(0xFF1B283A)),
              width: 1,
            ),
          ),
          child: Center(
            child: Text(
              title,
              style: TextStyle(
                color: isSelected
                    ? (isLight ? Colors.white : Colors.black)
                    : (isLight ? const Color(0xFF64748B) : Colors.white),
                fontSize: 12.5,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRecentTripItem({
    required String from,
    required String to,
    required String date,
    required String distance,
    required String duration,
    required bool isLight,
    required Color primaryColor,
    required Color textPrimary,
    required Color textSecondary,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isLight ? Colors.white : const Color(0xFF101726),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
            width: 1,
          ),
          boxShadow: isLight ? AppTheme.cardShadow : null,
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isLight
                    ? const Color(0xFFEDF4FF)
                    : const Color(0xFF102436),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isLight
                      ? const Color(0xFFD0E1FD)
                      : const Color(0xFF183850),
                  width: 1,
                ),
              ),
              child: Center(
                child: AppIcons.svg(
                  AppIcons.route,
                  color: primaryColor,
                  width: 20,
                  height: 20,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          from,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 5),
                        child: AppIcons.svg(
                          AppIcons.arrow,
                          color: primaryColor,
                          width: 12,
                          height: 12,
                        ),
                      ),
                      Flexible(
                        child: Text(
                          to,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    date,
                    style: TextStyle(color: textSecondary, fontSize: 11.5),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  distance,
                  style: TextStyle(
                    color: textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  duration,
                  style: TextStyle(color: textSecondary, fontSize: 11),
                ),
              ],
            ),
            const SizedBox(width: 8),
            Icon(Icons.chevron_right_rounded, color: textSecondary, size: 18),
          ],
        ),
      ),
    );
  }
}
