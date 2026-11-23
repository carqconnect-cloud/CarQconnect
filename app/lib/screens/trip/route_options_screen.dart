import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';

import '../../globals.dart';
import '../../theme/app_theme.dart';
import '../../services/vehicle_type_service.dart';
import '../../loading.dart';
import 'trip_overview_screen.dart';
import '../bottom_navigation_screen.dart';
import 'trip_service.dart';
import 'interactive_trip_map.dart';
import 'full_screen_map_screen.dart';
import '../../services/screen_refresh_service.dart';
import '../../widgets/animated_back_arrow.dart';

/// Screen 3: Route Options with Real OSRM Routing Engine
class RouteOptionsScreen extends StatefulWidget {
  final String fromLocation;
  final String toLocation;
  final LatLng fromLatLng;
  final LatLng toLatLng;
  final String preference;
  final bool avoidTolls;
  final bool avoidHighways;
  final Map<String, dynamic>? vehicle;
  final List<PlaceSearchResult> stops;

  const RouteOptionsScreen({
    super.key,
    this.fromLocation = 'Indore, Madhya Pradesh',
    this.toLocation = 'Dewas, Madhya Pradesh',
    this.fromLatLng = const LatLng(22.7196, 75.8577),
    this.toLatLng = const LatLng(22.9636, 76.0548),
    this.preference = 'Fastest',
    this.avoidTolls = false,
    this.avoidHighways = false,
    this.vehicle,
    this.stops = const [],
  });

  /// Capitalizes vehicle model to Title Case (e.g. "splendor" -> "Splendor", "tvs jupiter" -> "TVS Jupiter")
  static String toTitleCase(String text) {
    if (text.isEmpty) return text;
    const uppercaseWords = {
      'tvs', 'bmw', 'ktm', 'mg', 'byd', 'ev', 'cng', 'suv', 'mpv', 'rc', 'hf',
      'i10', 'i20', 'fz', 'mt', 'r15', 'ns', 'rs', 'xl',
    };
    return text.split(RegExp(r'\s+')).map((word) {
      if (word.isEmpty) return word;
      final lower = word.toLowerCase();
      if (uppercaseWords.contains(lower)) {
        return lower.toUpperCase();
      }
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
  }

  /// Comprehensive detection for Indian two-wheelers (bikes, scooters, mopeds)
  static bool isTwoWheelerVehicle(Map<String, dynamic>? vehicle, [String? fallbackName]) {
    final name = (vehicle?['name'] ?? vehicle?['model'] ?? fallbackName ?? Globals.vehicleModel)
        .toString()
        .trim()
        .toLowerCase();
    final type = (vehicle?['type'] ?? vehicle?['vehicleType'] ?? '')
        .toString()
        .trim()
        .toLowerCase();

    // 1. Explicit 4-wheeler keywords
    if (type.contains('car') ||
        type.contains('four') ||
        type.contains('4-wheeler') ||
        type.contains('suv') ||
        type.contains('sedan') ||
        type.contains('hatchback')) {
      return false;
    }

    // 2. Explicit 2-wheeler keywords
    if (type.contains('bike') ||
        type.contains('scooter') ||
        type.contains('two') ||
        type.contains('2-wheeler') ||
        type.contains('motorcycle') ||
        type.contains('moped')) {
      return true;
    }

    // 3. Indian two-wheeler models and brand keywords
    const twoWheelerKeywords = [
      'bike', 'scooter', 'motorcycle', 'moped', 'scooty',
      'activa', 'jupiter', 'access', 'pleasure', 'fascino', 'dio', 'burgman',
      'grazia', 'rayzr', 'ntorq', 'aviator', 'destini', 'maestro', 'pep', 'zest',
      'splendor', 'platina', 'hf deluxe', 'ct100', 'ct 100', 'shine', 'passion',
      'star city', 'radeon', 'discover', 'glamour', 'super splendor', 'livo', 'dream',
      'pulsar', 'apache', 'raider', 'ronin', 'fz', 'hornet', 'unicorn', 'xtreme',
      'xpulse', 'gixxer', 'mt-15', 'r15', 'duke', 'rc 200', 'rc 390', 'adventure 390',
      'royal enfield', 'bullet', 'classic 350', 'hunter 350', 'meteor', 'himalayan',
      'interceptor', 'continental gt', 'dominar', 'jawa', 'yezdi', 'speed 400',
      'scrambler', 'crux', 'xl100', 'xl 100', 'sport',
      'iqube', 'ather', 'ola s1', 's1 pro', 's1 air', 's1 x', 'chetak', 'vida v1',
      'revolt', 'rv400', 'ultraviolette', 'f77', 'tork kratos', 'aerox',
      'tvs',
    ];

    for (final kw in twoWheelerKeywords) {
      if (name.contains(kw)) return true;
    }

    return false;
  }

  /// Resolves the effective fuel type (Petrol, Diesel, CNG, EV, Hybrid)
  static String resolveFuelType(Map<String, dynamic>? vehicle, [String? fallbackName]) {
    final explicit = (vehicle?['fuel'] ?? vehicle?['type'] ?? vehicle?['fuelType'] ?? '')
        .toString()
        .trim();
    final lower = explicit.toLowerCase();
    if (lower == 'petrol' || lower.contains('petrol')) return 'Petrol';
    if (lower == 'diesel' || lower.contains('diesel')) return 'Diesel';
    if (lower == 'cng' || lower.contains('cng')) return 'CNG';
    if (lower == 'ev' || lower.contains('electric')) return 'EV';
    if (lower == 'hybrid' || lower.contains('hybrid')) return 'Hybrid';

    final name = (vehicle?['name'] ?? vehicle?['model'] ?? fallbackName ?? Globals.vehicleModel)
        .toString()
        .trim();
    return VehicleTypeService.detectFuelType(name);
  }

  /// Current Indian market fuel rates per unit (₹/L, ₹/kg, ₹/kWh)
  static double getFuelPrice(String fuelType) {
    switch (fuelType.toLowerCase()) {
      case 'diesel':
        return 100.00; // Current diesel rate (₹/L)
      case 'cng':
        return 85.00; // Current CNG rate (₹/kg)
      case 'ev':
      case 'electric':
        return 12.00; // Average EV charging rate (₹/kWh)
      case 'hybrid':
        return 110.00; // Petrol hybrid rate (₹/L)
      case 'petrol':
      default:
        return 110.00; // Current India / MP standard petrol rate (₹/L)
    }
  }

  static String getFuelUnit(String fuelType) {
    switch (fuelType.toLowerCase()) {
      case 'cng':
        return 'kg';
      case 'ev':
      case 'electric':
        return 'kWh';
      default:
        return 'L';
    }
  }

  static String getMileageUnit(String fuelType) {
    switch (fuelType.toLowerCase()) {
      case 'cng':
        return 'km/kg';
      case 'ev':
      case 'electric':
        return 'km/kWh';
      default:
        return 'km/L';
    }
  }

  /// Calculates realistic average / mileage based on vehicle model & fuel type
  static double getVehicleMileage(
    Map<String, dynamic>? vehicle,
    String fuelType,
    bool isTwoWheeler,
  ) {
    final explicit = vehicle?['mileage'] ?? vehicle?['average'];
    if (explicit != null) {
      final parsed = double.tryParse(explicit.toString());
      if (parsed != null && parsed > 0) return parsed;
    }

    final name = (vehicle?['name'] ?? vehicle?['model'] ?? Globals.vehicleModel)
        .toString()
        .trim()
        .toLowerCase();

    if (isTwoWheeler) {
      if (fuelType == 'EV') return 32.0;

      // 100-110cc commuter bikes
      if (name.contains('splendor') ||
          name.contains('platina') ||
          name.contains('hf deluxe') ||
          name.contains('ct100') ||
          name.contains('ct 100') ||
          name.contains('passion') ||
          name.contains('shine') ||
          name.contains('star city') ||
          name.contains('radeon') ||
          name.contains('livo') ||
          name.contains('dream')) {
        return 55.0;
      }

      // Scooters (110-125cc)
      if (name.contains('activa') ||
          name.contains('jupiter') ||
          name.contains('access') ||
          name.contains('pleasure') ||
          name.contains('fascino') ||
          name.contains('dio') ||
          name.contains('burgman') ||
          name.contains('grazia') ||
          name.contains('rayzr') ||
          name.contains('ntorq') ||
          name.contains('aviator') ||
          name.contains('destini') ||
          name.contains('maestro')) {
        return 45.0;
      }

      // Cruisers & High-CC bikes (350cc+)
      if (name.contains('bullet') ||
          name.contains('classic 350') ||
          name.contains('hunter') ||
          name.contains('meteor') ||
          name.contains('himalayan') ||
          name.contains('interceptor') ||
          name.contains('continental') ||
          name.contains('royal enfield') ||
          name.contains('dominar') ||
          name.contains('duke') ||
          name.contains('rc 390') ||
          name.contains('jawa') ||
          name.contains('yezdi')) {
        return 32.0;
      }

      // Sport / 125-160cc commuters
      if (name.contains('raider') ||
          name.contains('apache') ||
          name.contains('pulsar') ||
          name.contains('fz') ||
          name.contains('unicorn') ||
          name.contains('hornet') ||
          name.contains('xtreme') ||
          name.contains('ronin')) {
        return 45.0;
      }

      return 45.0;
    }

    // Four-wheelers
    if (fuelType == 'EV') {
      if (name.contains('comet') || name.contains('tiago ev')) return 8.5;
      if (name.contains('zs ev') || name.contains('ioniq') || name.contains('byd') || name.contains('be 6') || name.contains('curvv ev')) return 6.2;
      return 7.0;
    }

    if (fuelType == 'CNG') {
      if (name.contains('ertiga') || name.contains('brezza') || name.contains('fronx') || name.contains('punch')) return 23.0;
      return 26.0;
    }

    if (fuelType == 'Hybrid') {
      return 22.5;
    }

    if (fuelType == 'Diesel') {
      if (name.contains('thar') ||
          name.contains('scorpio') ||
          name.contains('bolero') ||
          name.contains('fortuner') ||
          name.contains('innova') ||
          name.contains('crysta') ||
          name.contains('safari') ||
          name.contains('harrier') ||
          name.contains('xuv700') ||
          name.contains('gloster') ||
          name.contains('endeavour')) {
        return 12.5;
      }
      if (name.contains('creta') || name.contains('seltos') || name.contains('alcazar')) {
        return 16.5;
      }
      if (name.contains('nexon') || name.contains('venue') || name.contains('sonet') || name.contains('brezza')) {
        return 18.5;
      }
      return 15.0;
    }

    // Petrol Cars
    if (name.contains('thar') ||
        name.contains('scorpio') ||
        name.contains('xuv700') ||
        name.contains('fortuner') ||
        name.contains('innova') ||
        name.contains('safari') ||
        name.contains('harrier')) {
      return 10.5;
    }
    if (name.contains('creta') ||
        name.contains('seltos') ||
        name.contains('kushaq') ||
        name.contains('taigun') ||
        name.contains('vitara') ||
        name.contains('elevate') ||
        name.contains('city') ||
        name.contains('verna') ||
        name.contains('virtus') ||
        name.contains('slavia') ||
        name.contains('hector')) {
      return 13.5;
    }
    if (name.contains('brezza') ||
        name.contains('nexon') ||
        name.contains('venue') ||
        name.contains('sonet') ||
        name.contains('punch') ||
        name.contains('exter') ||
        name.contains('fronx')) {
      return 15.5;
    }
    if (name.contains('baleno') ||
        name.contains('i20') ||
        name.contains('altroz') ||
        name.contains('glanza') ||
        name.contains('dzire') ||
        name.contains('amaze') ||
        name.contains('aura') ||
        name.contains('tigor')) {
      return 17.5;
    }
    if (name.contains('alto') ||
        name.contains('kwid') ||
        name.contains('spresso') ||
        name.contains('s-presso') ||
        name.contains('celerio') ||
        name.contains('tiago') ||
        name.contains('wagon') ||
        name.contains('swift') ||
        name.contains('ignis') ||
        name.contains('i10')) {
      return 19.0;
    }

    return 15.0;
  }

  @override
  State<RouteOptionsScreen> createState() => _RouteOptionsScreenState();
}

class _RouteOptionsScreenState extends State<RouteOptionsScreen>
    with RefreshOnRouteReturn<RouteOptionsScreen> {
  int _selectedRouteIndex = 0;
  int _expandedRouteIndex = 0;
  bool _isLoading = true;
  List<OSRMRouteResult> _routes = [];
  late String _preference;
  late bool _avoidTolls;
  late bool _avoidHighways;
  late LatLng _effectiveFrom;
  late LatLng _effectiveTo;
  Map<String, dynamic>? _selectedVehicle;
  List<Map<String, dynamic>> _userVehicles = [];

  @override
  void initState() {
    super.initState();
    _selectedVehicle = widget.vehicle;
    _preference = widget.preference;
    _avoidTolls = widget.avoidTolls;
    _avoidHighways = widget.avoidHighways;
    _effectiveFrom = (widget.fromLatLng.latitude != 0.0 && widget.fromLatLng.longitude != 0.0)
        ? widget.fromLatLng
        : const LatLng(22.7196, 75.8577);
    _effectiveTo = (widget.toLatLng.latitude != 0.0 && widget.toLatLng.longitude != 0.0)
        ? widget.toLatLng
        : const LatLng(0.0, 0.0);
    _fetchRoutes();
    _loadVehicles();
  }

  Future<void> _loadVehicles() async {
    final cached = await TripService.loadCachedUserVehicles();
    if (mounted && cached.isNotEmpty) {
      setState(() {
        _userVehicles = cached;
        _selectedVehicle ??= cached.first;
      });
    }
    final list = await TripService.getUserVehicles();
    if (mounted && list.isNotEmpty) {
      setState(() {
        _userVehicles = list;
        if (_selectedVehicle == null) {
          _selectedVehicle = list.first;
        } else {
          final match = list.where(
            (v) => (v['regNumber'] != null && v['regNumber'] == _selectedVehicle?['regNumber']) ||
                (v['name'] != null && v['name'] == _selectedVehicle?['name']),
          );
          if (match.isNotEmpty) {
            _selectedVehicle = match.first;
          }
        }
      });
    }
  }

  Future<void> _fetchRoutes() async {
    setState(() => _isLoading = true);

    if (_effectiveFrom.latitude == 0.0 || _effectiveFrom.longitude == 0.0) {
      final c = await TripService.resolveCoordinates(widget.fromLocation);
      if (c != null && mounted) _effectiveFrom = c;
    }
    if (_effectiveTo.latitude == 0.0 || _effectiveTo.longitude == 0.0) {
      final c = await TripService.resolveCoordinates(widget.toLocation);
      if (c != null && mounted) _effectiveTo = c;
    }
    if (_effectiveTo.latitude == 0.0) {
      _effectiveTo = const LatLng(23.1765, 75.7885);
    }

    final stopWaypoints = widget.stops
        .where((s) => s.lat != 0.0 && s.lon != 0.0)
        .map((s) => LatLng(s.lat, s.lon))
        .toList();
    final results = await TripService.getRoutes(
      start: _effectiveFrom,
      end: _effectiveTo,
      waypoints: stopWaypoints,
      preference: _preference,
      avoidTolls: _avoidTolls,
      avoidHighways: _avoidHighways,
    );

    if (mounted) {
      final defaultIndex = _preference == 'Fastest' ? 0 : _recommendedRouteIndex(results);
      setState(() {
        _routes = results;
        _isLoading = false;
        _selectedRouteIndex = defaultIndex;
        _expandedRouteIndex = defaultIndex;
      });
    }
  }

  int _recommendedRouteIndex(List<OSRMRouteResult> routes) {
    if (routes.length < 2) return 0;

    final costs = routes.map((route) {
      final estimate = _estimateCost(route);
      return estimate.estimatedTotal;
    }).toList();
    final durations = routes.map((route) => route.durationMinutes).toList();
    final minCost = costs.reduce((a, b) => a < b ? a : b);
    final maxCost = costs.reduce((a, b) => a > b ? a : b);
    final minDuration = durations.reduce((a, b) => a < b ? a : b);
    final maxDuration = durations.reduce((a, b) => a > b ? a : b);

    var bestIndex = 0;
    var bestScore = double.infinity;
    for (var index = 0; index < routes.length; index++) {
      final costScore = maxCost == minCost
          ? 0.0
          : (costs[index] - minCost) / (maxCost - minCost);
      final timeScore = maxDuration == minDuration
          ? 0.0
          : (durations[index] - minDuration) / (maxDuration - minDuration);
      final score = (costScore + timeScore) / 2;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  bool _isVehicleTollExempt() {
    return RouteOptionsScreen.isTwoWheelerVehicle(_selectedVehicle ?? widget.vehicle);
  }

  _RouteCostEstimate _estimateCost(OSRMRouteResult route) {
    final vehicle = _selectedVehicle ?? widget.vehicle;
    var vehicleName = (vehicle?['name'] ?? vehicle?['model'] ?? Globals.vehicleModel).toString().trim();
    final vehicleReg = (vehicle?['regNumber'] ?? vehicle?['registration'] ?? Globals.vehicleRegistration).toString().trim();
    final twoWheeler = RouteOptionsScreen.isTwoWheelerVehicle(vehicle, vehicleName);

    if (vehicleName.isEmpty) {
      vehicleName = twoWheeler ? 'Two-Wheeler' : 'Standard Car';
    } else {
      vehicleName = RouteOptionsScreen.toTitleCase(vehicleName);
    }

    final fuelType = RouteOptionsScreen.resolveFuelType(vehicle, vehicleName);
    final fuelPrice = RouteOptionsScreen.getFuelPrice(fuelType);
    final fuelUnit = RouteOptionsScreen.getFuelUnit(fuelType);
    final mileageUnit = RouteOptionsScreen.getMileageUnit(fuelType);
    final mileage = RouteOptionsScreen.getVehicleMileage(vehicle, fuelType, twoWheeler);

    final distance = route.distanceKm;
    final fuelNeeded = mileage > 0 ? (distance / mileage) : 0.0;
    final baseFuelCost = (fuelNeeded * fuelPrice).roundToDouble();
    final fuelCostLow = (baseFuelCost * 0.95).roundToDouble();
    final fuelCostHigh = (baseFuelCost * 1.10).roundToDouble();

    final tollApplies = !twoWheeler && !_avoidTolls && (!route.tollStatusAvailable || route.hasTolls);
    final double tollBase;
    final double tollLow;
    final double tollHigh;

    if (tollApplies) {
      tollLow = (distance * 1.2).roundToDouble();
      tollHigh = (distance * 1.8).roundToDouble();
      tollBase = ((tollLow + tollHigh) / 2).roundToDouble();
    } else {
      tollBase = 0.0;
      tollLow = 0.0;
      tollHigh = 0.0;
    }

    final estimatedTotal = baseFuelCost + tollBase;
    final totalCostLow = fuelCostLow + tollLow;
    final totalCostHigh = fuelCostHigh + tollHigh;

    return _RouteCostEstimate(
      estimatedTotal: estimatedTotal,
      totalCostLow: totalCostLow,
      totalCostHigh: totalCostHigh,
      fuelCost: baseFuelCost,
      fuelCostLow: fuelCostLow,
      fuelCostHigh: fuelCostHigh,
      fuelNeeded: fuelNeeded,
      fuelUnit: fuelUnit,
      fuelType: fuelType,
      fuelPrice: fuelPrice,
      mileage: mileage,
      mileageUnit: mileageUnit,
      vehicleName: vehicleName,
      vehicleReg: vehicleReg,
      isTwoWheeler: twoWheeler,
      tollBase: tollBase,
      tollLow: tollLow,
      tollHigh: tollHigh,
      tollStatusAvailable: twoWheeler ? true : route.tollStatusAvailable,
    );
  }

  void _showVehiclePickerModal() {
    final isLight = AppTheme.isLightNotifier.value;
    final primaryColor = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(ctx).size.height * 0.6,
          ),
          decoration: BoxDecoration(
            color: isLight ? Colors.white : const Color(0xFF0C131D),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D3E),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Text(
                'Select Vehicle for Trip',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _userVehicles.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (ctx, i) {
                    final v = _userVehicles[i];
                    final isSelected = (_selectedVehicle?['regNumber'] == v['regNumber']) ||
                        (_selectedVehicle?['name'] == v['name'] && _selectedVehicle?['name'] != null);
                    final is2W = RouteOptionsScreen.isTwoWheelerVehicle(v);
                    final fuel = RouteOptionsScreen.resolveFuelType(v);
                    final avg = RouteOptionsScreen.getVehicleMileage(v, fuel, is2W);
                    final unit = RouteOptionsScreen.getMileageUnit(fuel);

                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedVehicle = v;
                        });
                        Navigator.pop(ctx);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? primaryColor.withValues(alpha: 0.1)
                              : (isLight ? const Color(0xFFF8FAFC) : const Color(0xFF141F2D)),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? primaryColor : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1F3045)),
                            width: isSelected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: primaryColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                is2W ? Icons.two_wheeler_rounded : Icons.directions_car_rounded,
                                color: primaryColor,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    RouteOptionsScreen.toTitleCase(v['name'] ?? 'Vehicle'),
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${v['regNumber'] ?? ''} • $fuel • Avg: ${avg.toStringAsFixed(0)} $unit',
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9EB0),
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (isSelected)
                              Icon(Icons.check_circle_rounded, color: primaryColor, size: 22),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildRouteCostSummary({
    required OSRMRouteResult route,
    required bool isLight,
    required Color primaryColor,
  }) {
    final estimate = _estimateCost(route);
    final currency = NumberFormat.currency(
      locale: 'en_IN',
      symbol: '₹',
      decimalDigits: 0,
    );
    final textColor = isLight ? const Color(0xFF334155) : Colors.white70;
    final cardBg = isLight ? const Color(0xFFF8FAFC) : const Color(0xFF101A28);
    final innerBg = isLight ? const Color(0xFFFFFFFF) : const Color(0xFF152233);
    final borderColor = isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E3046);
    final subTextColor = isLight ? const Color(0xFF64748B) : const Color(0xFF8E9EB0);

    final mileageStr = estimate.mileage.truncateToDouble() == estimate.mileage
        ? estimate.mileage.toStringAsFixed(0)
        : estimate.mileage.toStringAsFixed(1);
    final fuelPriceStr = estimate.fuelPrice.truncateToDouble() == estimate.fuelPrice
        ? estimate.fuelPrice.toStringAsFixed(0)
        : estimate.fuelPrice.toStringAsFixed(1);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Title & Manage Vehicle action
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Estimated trip cost',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
              ),
              if (_userVehicles.isNotEmpty)
                GestureDetector(
                  onTap: _showVehiclePickerModal,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: primaryColor.withValues(alpha: 0.3),
                        width: 0.8,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.swap_horiz_rounded, size: 14, color: primaryColor),
                        const SizedBox(width: 3),
                        Text(
                          'Change',
                          style: TextStyle(
                            color: primaryColor,
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
          const SizedBox(height: 10),

          // Vehicle Banner Card
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: innerBg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: primaryColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    estimate.isTwoWheeler
                        ? Icons.two_wheeler_rounded
                        : Icons.directions_car_rounded,
                    color: primaryColor,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        estimate.vehicleReg.isNotEmpty
                            ? '${estimate.vehicleName} (${estimate.vehicleReg})'
                            : estimate.vehicleName,
                        style: TextStyle(
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${estimate.fuelType} • Avg: $mileageStr ${estimate.mileageUnit} • Rate: ₹$fuelPriceStr/${estimate.fuelUnit}',
                        style: TextStyle(
                          color: subTextColor,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Fuel / Energy row
          _costRow(
            'Fuel (${estimate.fuelNeeded.toStringAsFixed(1)} ${estimate.fuelUnit} @ ₹$fuelPriceStr/${estimate.fuelUnit})',
            currency.format(estimate.fuelCost),
            textColor,
          ),
          const SizedBox(height: 6),

          // Tolls row
          _costRow(
            'Tolls',
            estimate.isTwoWheeler
                ? '₹0 (Two-Wheeler Exempt)'
                : (estimate.tollLow == 0 && estimate.tollHigh == 0)
                    ? '₹0 (Toll-Free)'
                    : 'Estimated ${currency.format(estimate.tollLow)}–${currency.format(estimate.tollHigh)}',
            estimate.isTwoWheeler
                ? (isLight ? const Color(0xFF16A34A) : const Color(0xFF4ADE80))
                : textColor,
          ),
          const SizedBox(height: 8),

          Divider(height: 1, color: borderColor),
          const SizedBox(height: 8),

          // Total row
          if (estimate.tollLow == estimate.tollHigh) ...[
            _costRow(
              'Estimated total',
              currency.format(estimate.estimatedTotal),
              primaryColor,
              bold: true,
            ),
            const SizedBox(height: 3),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '±10% speed/traffic variance',
                  style: TextStyle(
                    color: subTextColor,
                    fontSize: 11,
                  ),
                ),
                Text(
                  '${currency.format(estimate.totalCostLow)}–${currency.format(estimate.totalCostHigh)}',
                  style: TextStyle(
                    color: subTextColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ] else ...[
            _costRow(
              'Estimated total',
              '${currency.format(estimate.fuelCost + estimate.tollLow)}–${currency.format(estimate.fuelCost + estimate.tollHigh)}',
              primaryColor,
              bold: true,
            ),
            const SizedBox(height: 3),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Base estimate (Fuel + Toll)',
                  style: TextStyle(
                    color: subTextColor,
                    fontSize: 11,
                  ),
                ),
                Text(
                  currency.format(estimate.estimatedTotal),
                  style: TextStyle(
                    color: subTextColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 8),

          // Detail footnote
          Text(
            '* Calculated as: ${route.distanceKm.round()} km ÷ ${estimate.mileage.toStringAsFixed(0)} ${estimate.mileageUnit} = ${estimate.fuelNeeded.toStringAsFixed(1)} ${estimate.fuelUnit} × ₹$fuelPriceStr/${estimate.fuelUnit} = ${currency.format(estimate.fuelCost)}${estimate.isTwoWheeler ? " (Toll exempt)" : " + Tolls (${currency.format(estimate.tollBase)})"}. Actual costs vary with traffic and driving conditions.',
            style: TextStyle(
              color: subTextColor.withValues(alpha: 0.85),
              fontSize: 10.5,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _costRow(String label, String value, Color color, {bool bold = false}) =>
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(color: color, fontSize: 12),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          Text(value, style: TextStyle(color: color, fontSize: 12, fontWeight: bold ? FontWeight.w700 : FontWeight.w500)),
        ],
      );

  String _formatDuration(double minutes) {
    final hrs = minutes ~/ 60;
    final mins = (minutes % 60).round();
    if (hrs > 0) {
      return '${hrs}h ${mins}m';
    }
    return '${mins}m';
  }

  @override
  Future<void> refreshOnRouteReturn() => _fetchRoutes();

  void _handleBack() {
    if (Navigator.canPop(context)) {
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
        final recommendedRouteIndex = _recommendedRouteIndex(_routes);
        final primaryColor = isLight
            ? const Color(0xFF0066FF)
            : const Color(0xFF00C2FF);

        return PopScope(
          canPop: false,
          onPopInvokedWithResult: (didPop, result) {
            if (didPop) return;
            _handleBack();
          },
          child: Container(
            decoration: BoxDecoration(
              gradient: isLight ? AppTheme.bgGradient : null,
              color: isLight ? null : const Color(0xFF080E16),
            ),
            child: Scaffold(
              backgroundColor: Colors.transparent,
              appBar: AppBar(
                backgroundColor: Colors.transparent,
                elevation: 0,
                leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: _handleBack),
              title: Text(
                'Route Options',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              centerTitle: true,
              actions: [
                IconButton(
                  icon: Icon(
                    Icons.refresh_rounded,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    size: 22,
                  ),
                  onPressed: _fetchRoutes,
                ),
              ],
            ),
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Column(
                  children: [
                    Expanded(
                      child: _isLoading
                          ? Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  AppLoadingSpinner(
                                    size: 78,
                                    primaryColor: primaryColor,
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    'Calculating best routes with Mappls...',
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF64748B)
                                          : const Color(0xFF7E8E9F),
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : SingleChildScrollView(
                              physics: const BouncingScrollPhysics(),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Header Headline
                                  Text(
                                    '${_routes.length} route${_routes.length > 1 ? 's' : ''} found',
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF0F172A)
                                          : Colors.white,
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.2,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    () {
                                      final from = widget.fromLocation.split(',').first.trim();
                                      final to = widget.toLocation.split(',').first.trim();
                                      if (widget.stops.isEmpty) return '$from → $to';
                                      final intermediate = widget.stops.map((s) => s.shortTitle).where((s) => s.isNotEmpty).join(' → ');
                                      return intermediate.isNotEmpty ? '$from → $intermediate → $to' : '$from → $to';
                                    }(),
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF64748B)
                                          : const Color(0xFF7E8E9F),
                                      fontSize: 13,
                                    ),
                                  ),

                                  const SizedBox(height: 14),

                                  // Quick Preference Filter Tabs
                                  SingleChildScrollView(
                                    scrollDirection: Axis.horizontal,
                                    physics: const BouncingScrollPhysics(),
                                    child: Row(
                                      children: [
                                        _buildFilterChip('Fastest', Icons.bolt_rounded, isLight, primaryColor),
                                        const SizedBox(width: 8),
                                        _buildFilterChip('Shortest', Icons.dark_mode_outlined, isLight, primaryColor),
                                        const SizedBox(width: 8),
                                        _buildFilterChip('Scenic', Icons.terrain_rounded, isLight, primaryColor),
                                        const SizedBox(width: 8),
                                        GestureDetector(
                                          onTap: () {
                                            setState(() => _avoidTolls = !_avoidTolls);
                                            _fetchRoutes();
                                          },
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                            decoration: BoxDecoration(
                                              color: _avoidTolls
                                                  ? (isLight ? const Color(0xFFEBF5FF) : const Color(0xFF0A2234))
                                                  : (isLight ? const Color(0xFFF1F5F9) : const Color(0xFF0F1B2B)),
                                              borderRadius: BorderRadius.circular(16),
                                              border: Border.all(
                                                color: _avoidTolls ? primaryColor : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D40)),
                                                width: 1,
                                              ),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(Icons.toll_outlined, size: 14, color: _avoidTolls ? primaryColor : (isLight ? const Color(0xFF64748B) : Colors.white70)),
                                                const SizedBox(width: 4),
                                                Text(
                                                  'Avoid Tolls',
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: _avoidTolls ? FontWeight.bold : FontWeight.w500,
                                                    color: _avoidTolls ? primaryColor : (isLight ? const Color(0xFF0F172A) : Colors.white),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),

                                  const SizedBox(height: 18),

                                  // Dynamic OSRM Route Cards
                                  ...List.generate(_routes.length, (index) {
                                    final r = _routes[index];
                                    final isRecommended = index == recommendedRouteIndex;
                                    final durationStr = _formatDuration(
                                      r.durationMinutes,
                                    );
                                    final distanceStr =
                                        '${r.distanceKm.toStringAsFixed(0)} km';

                                    final tags = <_RouteTag>[];
                                    if (isRecommended) {
                                      tags.add(
                                        _RouteTag(
                                          label: 'Recommended',
                                          isHighlighted: true,
                                        ),
                                      );
                                    } else {
                                      tags.add(
                                        _RouteTag(
                                          label: r.tags.isNotEmpty ? r.tags.first : 'Alternate route',
                                        ),
                                      );
                                    }

                                    final isTollExempt = _isVehicleTollExempt();
                                    if (!r.tollStatusAvailable && !isTollExempt) {
                                      tags.add(_RouteTag(label: 'Estimated Toll'));
                                    } else if (!r.tollStatusAvailable && isTollExempt) {
                                      tags.add(_RouteTag(
                                        label: 'Two-Wheeler Toll Exempt',
                                        isGreen: true,
                                      ));
                                    } else if (!r.hasTolls || isTollExempt) {
                                      tags.add(_RouteTag(
                                        label: isTollExempt
                                            ? 'Two-Wheeler Toll Exempt'
                                            : 'Toll-Free',
                                        isGreen: true,
                                      ));
                                    } else {
                                      tags.add(_RouteTag(label: 'Tolls Apply'));
                                    }

                                    if (r.tags.any((tag) => tag.toLowerCase().contains('less traffic'))) {
                                      tags.add(_RouteTag(label: 'Less Traffic', isGreen: true));
                                    }

                                    return Padding(
                                      padding: const EdgeInsets.only(
                                        bottom: 14,
                                      ),
                                      child: _buildRouteCard(
                                        index: index,
                                        route: r,
                                        duration: durationStr,
                                        distance: distanceStr,
                                        via: () {
                                          var s = r.summary.trim();
                                          // Strip any leading 'via ' prefix (case-insensitive) before adding our own
                                          while (s.toLowerCase().startsWith('via ')) {
                                            s = s.substring(4).trim();
                                          }
                                          return 'Via $s';
                                        }(),
                                        isRecommended: isRecommended,
                                        tags: tags,
                                        points: r.points,
                                        isLight: isLight,
                                        primaryColor: primaryColor,
                                      ),
                                    );
                                  }),

                                  const SizedBox(height: 16),
                                ],
                              ),
                            ),
                    ),

                    // Bottom Fixed Button: "Start Trip"
                    Padding(
                      padding: const EdgeInsets.only(top: 8, bottom: 20),
                      child: SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _routes.isEmpty
                              ? null
                              : () {
                                  final selected =
                                      _routes[_selectedRouteIndex.clamp(
                                        0,
                                        _routes.length - 1,
                                      )];
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => TripOverviewScreen(
                                        fromLocation: widget.fromLocation
                                            .split(',')
                                            .first,
                                        toLocation: widget.toLocation
                                            .split(',')
                                            .first,
                                        fromLatLng: _effectiveFrom,
                                        toLatLng: _effectiveTo,
                                        duration: TripService.formatDuration(
                                          selected.durationMinutes,
                                        ),
                                        distance: TripService.formatDistance(selected.distanceKm),
                                        viaRoute: selected.summary.trim().toLowerCase().startsWith('via ')
                                            ? selected.summary.trim()
                                            : 'via ${selected.summary.trim()}',
                                        routePoints: selected.points,
                                        preference: _preference,
                                        avoidTolls: _avoidTolls,
                                        avoidHighways: _avoidHighways,
                                        vehicle: _selectedVehicle ?? widget.vehicle,
                                        stops: widget.stops,
                                        steps: selected.steps,
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
                              borderRadius: BorderRadius.circular(26),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Start Trip',
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
        ),
      );
    },
  );
  }

  Widget _buildFilterChip(String label, IconData icon, bool isLight, Color primaryColor) {
    final isSelected = _preference == label;
    return GestureDetector(
      onTap: () {
        setState(() => _preference = label);
        _fetchRoutes();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? (isLight ? const Color(0xFFEBF5FF) : const Color(0xFF0A2234))
              : (isLight ? const Color(0xFFF1F5F9) : const Color(0xFF0F1B2B)),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? primaryColor : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D40)),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: isSelected ? primaryColor : (isLight ? const Color(0xFF64748B) : Colors.white70)),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? primaryColor : (isLight ? const Color(0xFF0F172A) : Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRouteCard({
    required int index,
    required OSRMRouteResult route,
    required String duration,
    required String distance,
    required String via,
    bool isRecommended = false,
    required List<_RouteTag> tags,
    required List<LatLng> points,
    required bool isLight,
    required Color primaryColor,
  }) {
    final isSelected = _selectedRouteIndex == index;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedRouteIndex = index;
          _expandedRouteIndex = index;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isLight ? Colors.white : const Color(0xFF0C131D),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? primaryColor
                : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF182232)),
            width: isSelected ? 1.5 : 1,
          ),
          boxShadow: isLight
              ? (isSelected
                    ? [
                        BoxShadow(
                          color: primaryColor.withValues(alpha: 0.18),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : AppTheme.cardShadow)
              : (isSelected
                    ? [
                        BoxShadow(
                          color: const Color(0xFF00C2FF)
                              .withValues(alpha: 0.12),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : null),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (isRecommended)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: primaryColor,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Recommended',
                      style: TextStyle(
                        color: isLight ? Colors.white : Colors.black,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  )
                else
                  Text(
                    duration,
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),

                // Distance + Radio Selector
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      distance,
                      style: TextStyle(
                        color: isLight
                            ? (isSelected
                                  ? const Color(0xFF0F172A)
                                  : const Color(0xFF64748B))
                            : (isSelected
                                  ? Colors.white
                                  : const Color(0xFF7E8E9F)),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isSelected ? primaryColor : Colors.transparent,
                        border: Border.all(
                          color: isSelected
                              ? primaryColor
                              : (isLight
                                    ? const Color(0xFFCBD5E1)
                                    : const Color(0xFF334B68)),
                          width: 1.5,
                        ),
                      ),
                      child: isSelected
                          ? Center(
                              child: Container(
                                width: 7,
                                height: 7,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isLight
                                      ? Colors.white
                                      : const Color(0xFF080E16),
                                ),
                              ),
                            )
                          : null,
                    ),
                  ],
                ),
              ],
            ),

            if (isRecommended) ...[
              const SizedBox(height: 8),
              Text(
                duration,
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],

            const SizedBox(height: 3),
            Text(
              via,
              style: TextStyle(
                color: isLight
                    ? const Color(0xFF64748B)
                    : const Color(0xFF7E8E9F),
                fontSize: 12.5,
              ),
            ),

            const SizedBox(height: 12),

            // Tags Row
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: tags
                  .map((tag) => _buildTagWidget(tag, isLight, primaryColor))
                  .toList(),
            ),

            const SizedBox(height: 14),

            // Mini Route Map Box with real interactive map tiles & Enlarge feature
            GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => FullScreenMapScreen(
                      startLocation: _effectiveFrom,
                      endLocation: _effectiveTo,
                      stopLocations: widget.stops
                          .map((s) => LatLng(s.lat, s.lon))
                          .toList(),
                      stopLabels: widget.stops
                          .map((s) => s.shortTitle)
                          .toList(),
                      routePoints: points,
                      startLabel: widget.fromLocation,
                      endLabel: widget.toLocation,
                      distance: distance,
                      duration: duration,
                      viaRoute: via,
                    ),
                  ),
                );
              },
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      width: double.infinity,
                      height: 145,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isSelected
                              ? primaryColor.withValues(alpha: 0.5)
                              : (isLight
                                    ? const Color(0xFFE2E8F0)
                                    : const Color(0xFF1E2D3E)),
                          width: 1.2,
                        ),
                      ),
                      child: IgnorePointer(
                        ignoring: true,
                        child: InteractiveTripMap(
                          key: ValueKey('routemap_${index}_${points.length}'),
                          startLocation: _effectiveFrom,
                          endLocation: _effectiveTo,
                          startLabel: widget.fromLocation,
                          endLabel: widget.toLocation,
                          stopLocations: widget.stops
                              .map((s) => LatLng(s.lat, s.lon))
                              .toList(),
                          stopLabels: widget.stops
                              .map((s) => s.shortTitle)
                              .toList(),
                          routePoints: points,
                          interactive: false,
                        ),
                      ),
                    ),
                  ),

                  // Top right "Enlarge Map" pill badge
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: isLight
                            ? Colors.white.withValues(alpha: 0.92)
                            : const Color(0xFF0C131D).withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF1E3046),
                          width: 1,
                        ),
                        boxShadow: isLight
                            ? AppTheme.cardShadow
                            : [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.3),
                                  blurRadius: 6,
                                ),
                              ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.fullscreen_rounded,
                            color: primaryColor,
                            size: 16,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Enlarge Map',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF0F172A)
                                  : Colors.white,
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
            ),
            if (_expandedRouteIndex == index) ...[
              const SizedBox(height: 12),
              _buildRouteCostSummary(
                route: route,
                isLight: isLight,
                primaryColor: primaryColor,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTagWidget(_RouteTag tag, bool isLight, Color primaryColor) {
    if (tag.isHighlighted) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isLight
              ? const Color(0xFFEBF5FF)
              : const Color(0xFF00C2FF).withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isLight
                ? const Color(0xFFB9E6FE)
                : const Color(0xFF00C2FF).withValues(alpha: 0.35),
            width: 1,
          ),
        ),
        child: Text(
          tag.label,
          style: TextStyle(
            color: primaryColor,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    if (tag.isGreen) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isLight
              ? const Color(0xFFE8F5E9)
              : const Color(0xFF00E676).withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isLight
                ? const Color(0xFFA5D6A7)
                : const Color(0xFF00E676).withValues(alpha: 0.35),
            width: 1,
          ),
        ),
        child: Text(
          tag.label,
          style: TextStyle(
            color: isLight ? const Color(0xFF2E7D32) : const Color(0xFF00E676),
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF141F2D),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1F3045),
          width: 1,
        ),
      ),
      child: Text(
        tag.label,
        style: TextStyle(
          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9EB0),
          fontSize: 11,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _RouteTag {
  final String label;
  final bool isHighlighted;
  final bool isGreen;

  _RouteTag({
    required this.label,
    this.isHighlighted = false,
    this.isGreen = false,
  });
}

class _RouteCostEstimate {
  final double estimatedTotal;
  final double totalCostLow;
  final double totalCostHigh;
  final double fuelCost;
  final double fuelCostLow;
  final double fuelCostHigh;
  final double fuelNeeded;
  final String fuelUnit;
  final String fuelType;
  final double fuelPrice;
  final double mileage;
  final String mileageUnit;
  final String vehicleName;
  final String vehicleReg;
  final bool isTwoWheeler;
  final double tollBase;
  final double tollLow;
  final double tollHigh;
  final bool tollStatusAvailable;

  const _RouteCostEstimate({
    required this.estimatedTotal,
    required this.totalCostLow,
    required this.totalCostHigh,
    required this.fuelCost,
    required this.fuelCostLow,
    required this.fuelCostHigh,
    required this.fuelNeeded,
    required this.fuelUnit,
    required this.fuelType,
    required this.fuelPrice,
    required this.mileage,
    required this.mileageUnit,
    required this.vehicleName,
    required this.vehicleReg,
    required this.isTwoWheeler,
    required this.tollBase,
    required this.tollLow,
    required this.tollHigh,
    required this.tollStatusAvailable,
  });
}
