import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../globals.dart';
import 'active_trip_screen.dart';
import '../bottom_navigation_screen.dart';
import 'trip_service.dart';
import 'interactive_trip_map.dart';
import 'full_screen_map_screen.dart';
import 'place_search_modal.dart';
import '../../utils/app_icons.dart';
import '../../widgets/animated_back_arrow.dart';
import 'package:intl/intl.dart';
import 'route_options_screen.dart';
import 'fuel_rate_service.dart';

/// Screen 4: Trip Overview matching Screenshot 4 with real Map & Backend Integration
class TripOverviewScreen extends StatefulWidget {
  final String fromLocation;
  final String toLocation;
  final LatLng fromLatLng;
  final LatLng toLatLng;
  final String duration;
  final String distance;
  final String viaRoute;
  final List<LatLng> routePoints;
  final String preference;
  final bool avoidTolls;
  final bool avoidHighways;
  final Map<String, dynamic>? vehicle;
  final List<PlaceSearchResult> stops;
  final List<RouteStep>? steps;

  const TripOverviewScreen({
    super.key,
    this.fromLocation = 'Current Location',
    this.toLocation = '',
    this.fromLatLng = const LatLng(20.5937, 78.9629),
    this.toLatLng = const LatLng(0.0, 0.0),
    this.duration = '--',
    this.distance = '--',
    this.viaRoute = 'via Highway',
    this.routePoints = const [],
    this.preference = 'Fastest',
    this.avoidTolls = false,
    this.avoidHighways = false,
    this.vehicle,
    this.stops = const [],
    this.steps,
  });

  @override
  State<TripOverviewScreen> createState() => _TripOverviewScreenState();
}

class _TripOverviewScreenState extends State<TripOverviewScreen> {
  String? _selectedCategory;
  bool _isSaving = false;
  bool _showNearbyStops = false;
  late String _currentDistance;
  late String _currentDuration;
  late List<PlaceSearchResult> _stops;
  late List<LatLng> _routePoints;
  List<RouteStep>? _stepsList;
  Map<String, dynamic>? _selectedVehicle;
  List<Map<String, dynamic>> _userVehicles = [];

  @override
  void initState() {
    super.initState();
    _currentDistance = widget.distance;
    _currentDuration = widget.duration;
    _stops = List.from(widget.stops);
    _routePoints = List.from(widget.routePoints);
    _stepsList = widget.steps != null ? List.from(widget.steps!) : null;
    if ((_currentDistance.isEmpty || _currentDistance == '--' || _currentDistance == '0 km') && _routePoints.length >= 2) {
      final km = TripService.calculatePathDistanceKm(_routePoints);
      _currentDistance = TripService.formatDistance(km);
      _currentDuration = TripService.formatDuration((km / 55.0) * 60.0);
    }
    _selectedVehicle = widget.vehicle;
    _loadUserVehicles();
    if (_stops.isNotEmpty) {
      _recalculateRouteWithStops();
    }
  }

  Future<void> _loadUserVehicles() async {
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
            (v) =>
                (v['regNumber'] != null &&
                    v['regNumber'] == _selectedVehicle?['regNumber']) ||
                (v['name'] != null &&
                    v['name'] == _selectedVehicle?['name']),
          );
          if (match.isNotEmpty) {
            _selectedVehicle = match.first;
          }
        }
      });
    }
  }

  void _recalculateRouteWithStops() async {
    final validStops = _stops.where((s) => s.lat != 0.0 && s.lon != 0.0).toList();
    if (validStops.isEmpty) return;
    try {
      final routes = await TripService.getRoutes(
        start: widget.fromLatLng,
        end: widget.toLatLng,
        waypoints: validStops.map((s) => LatLng(s.lat, s.lon)).toList(),
      );
      if (routes.isNotEmpty && mounted) {
        setState(() {
          _routePoints = routes.first.points;
          _stepsList = routes.first.steps;
          _currentDistance = TripService.formatDistance(routes.first.distanceKm);
          _currentDuration = TripService.formatDuration(routes.first.durationMinutes);
        });
      }
    } catch (_) {}
  }

  Map<String, dynamic>? get _effectiveVehicle => _selectedVehicle ?? widget.vehicle;

  String get _effectiveVehicleName {
    final v = _effectiveVehicle;
    var name = (v?['name'] ?? v?['model'] ?? Globals.vehicleModel).toString().trim();
    if (name.isEmpty) {
      name = _isTwoWheeler ? 'Two-Wheeler' : 'Standard Car';
    }
    return RouteOptionsScreen.toTitleCase(name);
  }

  String get _effectiveVehicleReg {
    final v = _effectiveVehicle;
    return (v?['regNumber'] ?? v?['registration'] ?? Globals.vehicleRegistration).toString().trim();
  }

  bool get _isTwoWheeler => RouteOptionsScreen.isTwoWheelerVehicle(_effectiveVehicle, _effectiveVehicleName);

  String get _fuelType => RouteOptionsScreen.resolveFuelType(_effectiveVehicle, _effectiveVehicleName);

  bool get _isEV => _fuelType.toUpperCase() == 'EV' || _fuelType.toUpperCase() == 'ELECTRIC';
  bool get _isDiesel => _fuelType.toUpperCase() == 'DIESEL';
  bool get _isCNG => _fuelType.toUpperCase() == 'CNG';
  bool get _isHybrid => _fuelType.toUpperCase() == 'HYBRID';

  double get _numericDistanceKm {
    if (_routePoints.length >= 2) {
      return TripService.calculatePathDistanceKm(_routePoints);
    }
    final match = RegExp(r'(\d+(\.\d+)?)').firstMatch(_currentDistance);
    final parsed = double.tryParse(match?.group(1) ?? '');
    if (parsed != null && parsed > 0) return parsed;

    final pts = <LatLng>[];
    if (widget.fromLatLng.latitude != 0.0) pts.add(widget.fromLatLng);
    for (final s in _stops) {
      if (s.lat != 0.0 && s.lon != 0.0) pts.add(LatLng(s.lat, s.lon));
    }
    if (widget.toLatLng.latitude != 0.0) pts.add(widget.toLatLng);
    if (pts.length >= 2) {
      return TripService.calculatePathDistanceKm(pts) * 1.25;
    }
    return 0.0;
  }

  String? _selectedStateOverride;

  String get _effectiveState =>
      _selectedStateOverride ??
      FuelRateService.detectState(
        toLocation: widget.toLocation,
        fromLocation: widget.fromLocation,
        vehicleReg: _effectiveVehicleReg,
        coordinates: widget.toLatLng.latitude != 0.0 ? widget.toLatLng : widget.fromLatLng,
      );

  double get _mileage => RouteOptionsScreen.getVehicleMileage(_effectiveVehicle, _fuelType, _isTwoWheeler);

  double get _fuelPrice => RouteOptionsScreen.getFuelPrice(
        _fuelType,
        state: _effectiveState,
        toLocation: widget.toLocation,
        fromLocation: widget.fromLocation,
        vehicleReg: _effectiveVehicleReg,
      );

  String get _fuelUnit => RouteOptionsScreen.getFuelUnit(_fuelType);

  String get _mileageUnit => RouteOptionsScreen.getMileageUnit(_fuelType);

  double get _fuelNeeded => _mileage > 0 ? (_numericDistanceKm / _mileage) : 0.0;

  String get _estimatedConsumption => '${_fuelNeeded.toStringAsFixed(1)} $_fuelUnit';

  String get _estimatedFuel => _estimatedConsumption;

  double get _baseFuelCost => (_fuelNeeded * _fuelPrice).roundToDouble();
  double get _fuelCostLow => (_baseFuelCost * 0.95).roundToDouble();
  double get _fuelCostHigh => (_baseFuelCost * 1.10).roundToDouble();

  bool get _isTollExempt => _isTwoWheeler || widget.avoidTolls;

  double get _tollBase {
    if (_isTollExempt) return 0.0;
    final tollLow = (_numericDistanceKm * 1.2).roundToDouble();
    final tollHigh = (_numericDistanceKm * 1.8).roundToDouble();
    return ((tollLow + tollHigh) / 2).roundToDouble();
  }

  double get _tollLow => _isTollExempt ? 0.0 : (_numericDistanceKm * 1.2).roundToDouble();
  double get _tollHigh => _isTollExempt ? 0.0 : (_numericDistanceKm * 1.8).roundToDouble();

  double get _estimatedTotal => _baseFuelCost + _tollBase;
  double get _totalCostLow => _fuelCostLow + _tollLow;
  double get _totalCostHigh => _fuelCostHigh + _tollHigh;

  String _cleanCity(String name) {
    if (name.isEmpty) return '';
    final firstPart = name.split(',').first.trim();
    return firstPart.isNotEmpty ? firstPart : name.trim();
  }

  List<String> get _routeLocations {
    final list = <String>[_cleanCity(widget.fromLocation)];
    for (final s in _stops) {
      final name = _cleanCity(s.shortTitle.isNotEmpty ? s.shortTitle : s.displayName);
      if (name.isNotEmpty) {
        list.add(name);
      }
    }
    list.add(_cleanCity(widget.toLocation));
    return list;
  }

  String get _consumptionLabel {
    if (_isEV) return 'Est. Energy';
    if (_isDiesel) return 'Est. Diesel';
    if (_isCNG) return 'Est. CNG';
    if (_isHybrid) return 'Est. Hybrid';
    return 'Est. Fuel';
  }

  IconData get _consumptionIcon {
    if (_isEV) return Icons.bolt_rounded;
    if (_isCNG) return Icons.local_gas_station_rounded;
    if (_isHybrid) return Icons.eco_rounded;
    return Icons.local_gas_station_rounded;
  }

  Color get _consumptionIconColor {
    if (_isEV) return const Color(0xFF00C2FF);
    if (_isCNG) return const Color(0xFF0EA5E9);
    if (_isHybrid) return const Color(0xFF10B981);
    return const Color(0xFFFF9800);
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
            maxHeight: MediaQuery.of(ctx).size.height * 0.65,
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Select Vehicle for Trip',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.close_rounded,
                      size: 20,
                      color: isLight ? const Color(0xFF64748B) : Colors.white70,
                    ),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              if (_userVehicles.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Text(
                      'No other vehicles found',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : Colors.white60,
                        fontSize: 14,
                      ),
                    ),
                  ),
                )
              else
                Expanded(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: _userVehicles.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (ctx, i) {
                      final v = _userVehicles[i];
                      final isSelected = (_effectiveVehicle?['regNumber'] == v['regNumber']) ||
                          (_effectiveVehicle?['name'] == v['name'] && _effectiveVehicle?['name'] != null);
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
                              color: isSelected
                                  ? primaryColor
                                  : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1F3045)),
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

  void _showStatePickerModal() {
    final isLight = AppTheme.isLightNotifier.value;
    final primaryColor = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF);
    final searchController = TextEditingController();
    final allStates = FuelRateService.allStates;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            final query = searchController.text.trim().toLowerCase();
            final filtered = query.isEmpty
                ? allStates
                : allStates.where((s) =>
                    s.stateName.toLowerCase().contains(query) ||
                    s.stateCode.toLowerCase().contains(query)).toList();

            return Container(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(ctx).size.height * 0.75,
              ),
              decoration: BoxDecoration(
                color: isLight ? Colors.white : const Color(0xFF0C131D),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 20),
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'State Fuel & Tariff Rates',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Benchmark rates (November 2026)',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                      if (_selectedStateOverride != null)
                        TextButton(
                          onPressed: () {
                            setState(() => _selectedStateOverride = null);
                            Navigator.pop(ctx);
                          },
                          child: Text(
                            'Auto-detect',
                            style: TextStyle(color: primaryColor, fontSize: 13, fontWeight: FontWeight.bold),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: searchController,
                    onChanged: (_) => setModalState(() {}),
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 14,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Search state or union territory...',
                      hintStyle: TextStyle(
                        color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        fontSize: 13.5,
                      ),
                      prefixIcon: Icon(
                        Icons.search,
                        color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        size: 20,
                      ),
                      suffixIcon: searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                searchController.clear();
                                setModalState(() {});
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF141F2D),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1F3045),
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1F3045),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, idx) {
                        final item = filtered[idx];
                        final isCurrent = item.stateName == _effectiveState;

                        return InkWell(
                          onTap: () {
                            setState(() => _selectedStateOverride = item.stateName);
                            Navigator.pop(ctx);
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isCurrent
                                  ? primaryColor.withValues(alpha: 0.12)
                                  : (isLight ? const Color(0xFFF8FAFC) : const Color(0xFF131D2A)),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isCurrent
                                    ? primaryColor
                                    : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1F2D3E)),
                                width: isCurrent ? 1.5 : 1.0,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Row(
                                        children: [
                                          Text(
                                            item.stateName,
                                            style: TextStyle(
                                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                              fontSize: 14,
                                              fontWeight: isCurrent ? FontWeight.bold : FontWeight.w600,
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                            decoration: BoxDecoration(
                                              color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF223042),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              item.stateCode,
                                              style: TextStyle(
                                                color: isLight ? const Color(0xFF475569) : const Color(0xFF94A3B8),
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (isCurrent)
                                      Icon(Icons.check_circle_rounded, color: primaryColor, size: 18),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    _buildRateBadge('Petrol', '₹${item.petrolRate.toStringAsFixed(2)}/L', isLight),
                                    _buildRateBadge('Diesel', '₹${item.dieselRate.toStringAsFixed(2)}/L', isLight),
                                    _buildRateBadge('CNG', '₹${item.cngRate.toStringAsFixed(2)}/kg', isLight),
                                    _buildRateBadge('EV', '₹${item.evHomeTariff.toStringAsFixed(2)}/u', isLight),
                                  ],
                                ),
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
      },
    );
  }

  Widget _buildRateBadge(String label, String value, bool isLight) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: isLight ? const Color(0xFFEDF2F7) : const Color(0xFF192534),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
              fontSize: 9.5,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCostDetailRow(
    String label,
    String value,
    Color color, {
    bool bold = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: bold ? 13.5 : 12.5,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: bold ? 14.5 : 12.5,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildDetailedTripCostCard({
    required bool isLight,
    required Color primaryColor,
  }) {
    final currency = NumberFormat.currency(
      locale: 'en_IN',
      symbol: '₹',
      decimalDigits: 0,
    );
    final cardBg = isLight ? Colors.white : const Color(0xFF0C131D);
    final innerBg = isLight ? const Color(0xFFF8FAFC) : const Color(0xFF141F2D);
    final borderColor = isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E3046);
    final textColor = isLight ? const Color(0xFF0F172A) : Colors.white;
    final subTextColor = isLight ? const Color(0xFF64748B) : const Color(0xFF8E9EB0);

    final mileageStr = _mileage.truncateToDouble() == _mileage
        ? _mileage.toStringAsFixed(0)
        : _mileage.toStringAsFixed(1);
    final fuelPriceStr = _fuelPrice.truncateToDouble() == _fuelPrice
        ? _fuelPrice.toStringAsFixed(0)
        : _fuelPrice.toStringAsFixed(1);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderColor, width: 1),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Title & Change Vehicle Button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: primaryColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Icons.account_balance_wallet_outlined,
                        size: 15,
                        color: primaryColor,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Trip Cost & Vehicle Details',
                        style: TextStyle(
                          color: textColor,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  GestureDetector(
                    onTap: _showStatePickerModal,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: primaryColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: primaryColor.withValues(alpha: 0.35),
                          width: 0.8,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.location_on_rounded, size: 12, color: primaryColor),
                          const SizedBox(width: 3),
                          Text(
                            _effectiveState,
                            style: TextStyle(
                              color: primaryColor,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 2),
                          Icon(Icons.arrow_drop_down_rounded, size: 14, color: primaryColor),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: _showVehiclePickerModal,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: primaryColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: primaryColor.withValues(alpha: 0.35),
                          width: 0.8,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.swap_horiz_rounded, size: 14, color: primaryColor),
                          const SizedBox(width: 3),
                          Text(
                            'Vehicle',
                            style: TextStyle(
                              color: primaryColor,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),

          // 1. Full Route Itinerary Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: innerBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.route_outlined, size: 14, color: primaryColor),
                    const SizedBox(width: 6),
                    Text(
                      'Route Itinerary',
                      style: TextStyle(
                        color: subTextColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const Spacer(),
                    Flexible(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: primaryColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '$_currentDistance • $_currentDuration',
                          style: TextStyle(
                            color: primaryColor,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 6,
                  runSpacing: 4,
                  children: [
                    for (int i = 0; i < _routeLocations.length; i++) ...[
                      Text(
                        _routeLocations[i],
                        style: TextStyle(
                          color: textColor,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (i < _routeLocations.length - 1)
                        Icon(
                          Icons.arrow_forward_rounded,
                          size: 12,
                          color: primaryColor,
                        ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // 2. Selected Vehicle Info Card
          Container(
            padding: const EdgeInsets.all(11),
            decoration: BoxDecoration(
              color: innerBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: primaryColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    _isTwoWheeler
                        ? Icons.two_wheeler_rounded
                        : Icons.directions_car_rounded,
                    color: primaryColor,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _effectiveVehicleReg.isNotEmpty
                            ? '$_effectiveVehicleName ($_effectiveVehicleReg)'
                            : _effectiveVehicleName,
                        style: TextStyle(
                          color: textColor,
                          fontSize: 13.5,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$_fuelType • Avg: $mileageStr $_mileageUnit • ₹$fuelPriceStr/$_fuelUnit ($_effectiveState)',
                        style: TextStyle(
                          color: subTextColor,
                          fontSize: 11.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // 3. Itemized Cost Calculation Rows
          _buildCostDetailRow(
            '$_consumptionLabel (${_fuelNeeded.toStringAsFixed(1)} $_fuelUnit @ ₹$fuelPriceStr/$_fuelUnit)',
            currency.format(_baseFuelCost),
            textColor,
          ),
          const SizedBox(height: 6),
          _buildCostDetailRow(
            'Tolls',
            _isTwoWheeler
                ? '₹0 (Two-Wheeler Toll Exempt)'
                : (_tollLow == 0 && _tollHigh == 0)
                    ? '₹0 (Toll-Free)'
                    : 'Estimated ${currency.format(_tollLow)}–${currency.format(_tollHigh)}',
            _isTwoWheeler
                ? (isLight ? const Color(0xFF16A34A) : const Color(0xFF4ADE80))
                : textColor,
          ),
          const SizedBox(height: 8),

          Divider(height: 1, color: borderColor),
          const SizedBox(height: 8),

          // 4. Total and Variance
          if (_tollLow == _tollHigh) ...[
            _buildCostDetailRow(
              'Estimated Total',
              currency.format(_estimatedTotal),
              primaryColor,
              bold: true,
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    '±10% speed/traffic variance',
                    style: TextStyle(
                      color: subTextColor,
                      fontSize: 11,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${currency.format(_totalCostLow)}–${currency.format(_totalCostHigh)}',
                  style: TextStyle(
                    color: subTextColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ] else ...[
            _buildCostDetailRow(
              'Estimated Total',
              '${currency.format(_baseFuelCost + _tollLow)}–${currency.format(_baseFuelCost + _tollHigh)}',
              primaryColor,
              bold: true,
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'Base estimate (Fuel + Toll)',
                    style: TextStyle(
                      color: subTextColor,
                      fontSize: 11,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  currency.format(_estimatedTotal),
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

          // 5. Mathematical Formula Footnote
          Text(
            '* Math: ${_numericDistanceKm.round()} km ÷ ${_mileage.toStringAsFixed(0)} $_mileageUnit = ${_fuelNeeded.toStringAsFixed(1)} $_fuelUnit × ₹$fuelPriceStr/$_fuelUnit ($_effectiveState benchmark) = ${currency.format(_baseFuelCost)}${_isTwoWheeler ? " (Toll exempt)" : " + Tolls (${currency.format(_tollBase)})"}. Actual costs vary with traffic and driving conditions.',
            style: TextStyle(
              color: subTextColor.withValues(alpha: 0.85),
              fontSize: 10.5,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _onCategoryTapped(String title) async {
    String catId = _isEV ? 'ev' : (_isCNG ? 'cng' : 'fuel');
    final lower = title.toLowerCase();
    if (lower.contains('ev')) {
      catId = 'ev';
    } else if (lower.contains('cng')) {
      catId = 'cng';
    } else if (lower.contains('fuel') || lower.contains('diesel')) {
      catId = 'fuel';
    } else if (lower.contains('food')) {
      catId = 'food';
    } else if (lower.contains('hotel')) {
      catId = 'hotel';
    } else if (lower.contains('rest')) {
      catId = 'rest';
    } else if (lower.contains('emergency')) {
      catId = 'emergency';
    } else if (lower.contains('atm') || lower.contains('cash')) {
      catId = 'atm';
    }

    final res = await PlaceSearchModal.showMulti(
      context,
      title: 'Add $title Stops',
      initialSelected: _stops,
      initialCategory: catId,
      vehicle: widget.vehicle,
      isEV: _isEV,
      fromLocation: widget.fromLocation,
      toLocation: widget.toLocation,
      fromLatLng: widget.fromLatLng,
      toLatLng: widget.toLatLng,
      routePoints: _routePoints,
    );
    if (res != null && mounted) {
      setState(() {
        _stops = res;
      });
      _recalculateRouteWithStops();
      final isLight = AppTheme.isLightNotifier.value;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: isLight
              ? const Color(0xFF0F172A)
              : const Color(0xFF101C2B),
          content: Text(
            '${_stops.length} ${_stops.length == 1 ? "stop" : "stops"} on your route',
          ),
        ),
      );
    }
  }

  Future<void> _onAddStopTapped() async {
    final res = await PlaceSearchModal.showMulti(
      context,
      title: 'Add Stops to Route',
      initialSelected: _stops,
      vehicle: widget.vehicle,
      fromLocation: widget.fromLocation,
      toLocation: widget.toLocation,
      fromLatLng: widget.fromLatLng,
      toLatLng: widget.toLatLng,
      routePoints: _routePoints,
    );
    if (res != null && mounted) {
      setState(() {
        _stops = res;
      });
      _recalculateRouteWithStops();
      final isLight = AppTheme.isLightNotifier.value;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: isLight
              ? const Color(0xFF0F172A)
              : const Color(0xFF101C2B),
          content: Text(
            '${_stops.length} ${_stops.length == 1 ? "stop" : "stops"} on your route',
          ),
        ),
      );
    }
  }

  Future<void> _startNavigation() async {
    setState(() => _isSaving = true);

    try {
      final savedTrip = await TripService.saveTripToBackend(
        fromName: widget.fromLocation,
        fromLat: widget.fromLatLng.latitude,
        fromLng: widget.fromLatLng.longitude,
        toName: widget.toLocation,
        toLat: widget.toLatLng.latitude,
        toLng: widget.toLatLng.longitude,
        distance: _currentDistance,
        duration: _currentDuration,
        viaRoute: widget.viaRoute,
        preference: widget.preference,
        avoidTolls: widget.avoidTolls,
        avoidHighways: widget.avoidHighways,
        routePoints: _routePoints,
        status: 'ACTIVE',
      );

      final tripId = savedTrip != null && savedTrip['id'] != null
          ? savedTrip['id'].toString()
          : 'trip_${DateTime.now().millisecondsSinceEpoch}';
      final startedAt = savedTrip != null && savedTrip['startedAt'] != null
          ? savedTrip['startedAt'].toString()
          : DateTime.now().toIso8601String();

      await TripService.saveActiveTrip(
        tripId: tripId,
        fromName: widget.fromLocation,
        fromLat: widget.fromLatLng.latitude,
        fromLng: widget.fromLatLng.longitude,
        toName: widget.toLocation,
        toLat: widget.toLatLng.latitude,
        toLng: widget.toLatLng.longitude,
        distance: _currentDistance,
        duration: _currentDuration,
        viaRoute: widget.viaRoute,
        vehicle: _effectiveVehicle,
        routePoints: _routePoints,
        startedAt: startedAt,
      );

      if (!mounted) return;
      setState(() => _isSaving = false);

      // Directly open in-app ActiveTripScreen with Mappls map and live navigation
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ActiveTripScreen(
            isNavigating: true,
            tripId: tripId,
            startedAt: startedAt,
            fromLocation: widget.fromLocation,
            toLocation: widget.toLocation,
            fromLatLng: widget.fromLatLng,
            toLatLng: widget.toLatLng,
            duration: _currentDuration,
            distance: _currentDistance,
            viaRoute: widget.viaRoute,
            routePoints: _routePoints,
            vehicle: _effectiveVehicle,
            fuelEstimate: _estimatedFuel,
            stops: _stops,
            steps: _stepsList ?? widget.steps,
          ),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _isSaving = false);

      // Resilient fallback: seamlessly start navigation even if backend is offline
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ActiveTripScreen(
            isNavigating: true,
            tripId: 'local_${DateTime.now().millisecondsSinceEpoch}',
            startedAt: DateTime.now().toIso8601String(),
            fromLocation: widget.fromLocation,
            toLocation: widget.toLocation,
            fromLatLng: widget.fromLatLng,
            toLatLng: widget.toLatLng,
            duration: _currentDuration,
            distance: _currentDistance,
            viaRoute: widget.viaRoute,
            routePoints: _routePoints,
            vehicle: _effectiveVehicle,
            fuelEstimate: _estimatedFuel,
            stops: _stops,
            steps: _stepsList ?? widget.steps,
          ),
        ),
      );
    }
  }

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
                'Trip Overview',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              centerTitle: true,
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Top Interactive Map View with Enlarge capability
                          GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => FullScreenMapScreen(
                                    startLocation: widget.fromLatLng,
                                    endLocation: widget.toLatLng,
                                    stopLocations: _stops
                                        .map((s) => LatLng(s.lat, s.lon))
                                        .toList(),
                                    stopLabels: _stops
                                        .map((s) => s.shortTitle)
                                        .toList(),
                                    routePoints: _routePoints,
                                    startLabel: widget.fromLocation,
                                    endLabel: widget.toLocation,
                                    distance: _currentDistance,
                                    duration: _currentDuration,
                                    viaRoute: widget.viaRoute,
                                  ),
                                ),
                              );
                            },
                            child: Stack(
                              children: [
                                SizedBox(
                                  width: double.infinity,
                                  height: 250,
                                  child: InteractiveTripMap(
                                    startLocation: widget.fromLatLng,
                                    endLocation: widget.toLatLng,
                                    stopLocations: _stops
                                        .map((s) => LatLng(s.lat, s.lon))
                                        .toList(),
                                    stopLabels: _stops
                                        .map((s) => s.shortTitle)
                                        .toList(),
                                    startLabel: widget.fromLocation,
                                    endLabel: widget.toLocation,
                                    routePoints: widget.routePoints,
                                    interactive: true,
                                  ),
                                ),
                                Positioned(
                                  bottom: 12,
                                  right: 12,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isLight
                                          ? Colors.white.withValues(alpha: 0.92)
                                          : const Color(0xFF0C131D)
                                                .withValues(alpha: 0.9),
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(
                                        color: isLight
                                            ? const Color(0xFFE2E8F0)
                                            : const Color(0xFF1E3046),
                                        width: 1,
                                      ),
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
                                            fontSize: 11.5,
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

                          // Details Section
                          Padding(
                            padding: const EdgeInsets.all(18),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Trip Title Row with "Edit" Button
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    Expanded(
                                      child: Wrap(
                                        crossAxisAlignment:
                                            WrapCrossAlignment.center,
                                        spacing: 6,
                                        runSpacing: 4,
                                        children: [
                                          for (int i = 0;
                                              i < _routeLocations.length;
                                              i++) ...[
                                            Text(
                                              _routeLocations[i],
                                              style: TextStyle(
                                                color: isLight
                                                    ? const Color(0xFF0F172A)
                                                    : Colors.white,
                                                fontSize: 18,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            if (i < _routeLocations.length - 1)
                                              AppIcons.svg(
                                                AppIcons.arrow,
                                                color: primaryColor,
                                                width: 12,
                                                height: 12,
                                              ),
                                          ],
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    GestureDetector(
                                      onTap: _handleBack,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 10,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: isLight
                                              ? const Color(0xFFEBF5FF)
                                              : const Color(0xFF132234),
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                          border: Border.all(
                                            color: isLight
                                                ? const Color(0xFFB9E6FE)
                                                : const Color(0xFF1D3550),
                                            width: 1,
                                          ),
                                        ),
                                        child: Text(
                                          'Edit',
                                          style: TextStyle(
                                            color: primaryColor,
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 16),

                                // 3 Metric Cards: Duration, Distance, Fuel Estimate
                                Row(
                                  children: [
                                    // 1. Duration
                                    Expanded(
                                      child: _buildMetricCard(
                                        icon: Icons.timer_outlined,
                                        iconColor: const Color(0xFF00C2FF),
                                        value: _currentDuration,
                                        label: 'Duration',
                                        isLight: isLight,
                                      ),
                                    ),
                                    const SizedBox(width: 10),

                                    // 2. Distance
                                    Expanded(
                                      child: _buildMetricCard(
                                        icon: Icons.route_outlined,
                                        iconColor: const Color(0xFF00E676),
                                        value: _currentDistance,
                                        label: 'Distance',
                                        isLight: isLight,
                                      ),
                                    ),
                                    const SizedBox(width: 10),

                                    // 3. Fuel / Energy Estimate
                                    Expanded(
                                      child: _buildMetricCard(
                                        icon: _consumptionIcon,
                                        iconColor: _consumptionIconColor,
                                        value: _estimatedConsumption,
                                        label: _consumptionLabel,
                                        isLight: isLight,
                                      ),
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 20),

                                // Route Details Box
                                Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? Colors.white
                                        : const Color(0xFF0C131D),
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(
                                      color: isLight
                                          ? const Color(0xFFE2E8F0)
                                          : const Color(0xFF182232),
                                      width: 1,
                                    ),
                                    boxShadow: isLight
                                        ? AppTheme.cardShadow
                                        : null,
                                  ),
                                  child: Column(
                                    children: [
                                      Row(
                                        children: [
                                          Icon(
                                            Icons.alt_route_rounded,
                                            color: primaryColor,
                                            size: 18,
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              widget.viaRoute,
                                              style: TextStyle(
                                                color: isLight
                                                    ? const Color(0xFF0F172A)
                                                    : Colors.white,
                                                fontSize: 13.5,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      Divider(
                                        color: isLight
                                            ? const Color(0xFFE2E8F0)
                                            : const Color(0xFF1B283A),
                                        height: 1,
                                      ),
                                      const SizedBox(height: 12),
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            'Road Condition',
                                            style: TextStyle(
                                              color: isLight
                                                  ? const Color(0xFF64748B)
                                                  : const Color(0xFF7E8E9F),
                                              fontSize: 12,
                                            ),
                                          ),
                                          Row(
                                            children: [
                                              Container(
                                                width: 8,
                                                height: 8,
                                                decoration: const BoxDecoration(
                                                  color: Color(0xFF00E676),
                                                  shape: BoxShape.circle,
                                                ),
                                              ),
                                              const SizedBox(width: 6),
                                              Text(
                                                'Good Condition',
                                                style: TextStyle(
                                                  color: isLight
                                                      ? const Color(0xFF0F172A)
                                                      : Colors.white,
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),

                                const SizedBox(height: 18),

                                // Detailed Trip Cost & Vehicle Calculation Card
                                _buildDetailedTripCostCard(
                                  isLight: isLight,
                                  primaryColor: primaryColor,
                                ),

                                // Stops on Your Route (if user has stops added)
                                if (_stops.isNotEmpty) ...[
                                  const SizedBox(height: 18),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Stops on Your Route (${_stops.length})',
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF0F172A)
                                              : Colors.white,
                                          fontSize: 14.5,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      GestureDetector(
                                        onTap: () {
                                          setState(() => _showNearbyStops = !_showNearbyStops);
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 9,
                                            vertical: 4,
                                          ),
                                          decoration: BoxDecoration(
                                            color: primaryColor.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(
                                              color: primaryColor.withValues(alpha: 0.35),
                                              width: 0.8,
                                            ),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(
                                                _showNearbyStops
                                                    ? Icons.close_rounded
                                                    : Icons.add_location_alt_outlined,
                                                size: 13,
                                                color: primaryColor,
                                              ),
                                              const SizedBox(width: 4),
                                              Text(
                                                _showNearbyStops ? 'Close' : '+ Add Stops',
                                                style: TextStyle(
                                                  color: primaryColor,
                                                  fontSize: 11.5,
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
                                  ..._stops.asMap().entries.map((entry) {
                                    final idx = entry.key;
                                    final stop = entry.value;
                                    return Container(
                                      margin: const EdgeInsets.only(bottom: 8),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 14,
                                        vertical: 12,
                                      ),
                                      decoration: BoxDecoration(
                                        color: isLight
                                            ? Colors.white
                                            : const Color(0xFF0C131D),
                                        borderRadius: BorderRadius.circular(16),
                                        border: Border.all(
                                          color: isLight
                                              ? const Color(0xFFE2E8F0)
                                              : const Color(0xFF1B283A),
                                        ),
                                        boxShadow: isLight
                                            ? AppTheme.cardShadow
                                            : null,
                                      ),
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 30,
                                            height: 30,
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
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 12.5,
                                                ),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  stop.shortTitle,
                                                  style: TextStyle(
                                                    color: isLight
                                                        ? const Color(
                                                            0xFF0F172A,
                                                          )
                                                        : Colors.white,
                                                    fontWeight: FontWeight.w600,
                                                    fontSize: 13.5,
                                                  ),
                                                  maxLines: 1,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                                if (stop.displayName.contains(','))
                                                  Text(
                                                    stop.displayName.split(',').sublist(1).join(',').trim(),
                                                    style: TextStyle(
                                                      color: isLight
                                                          ? const Color(
                                                              0xFF64748B,
                                                            )
                                                          : const Color(
                                                              0xFF7E8E9F,
                                                            ),
                                                      fontSize: 11,
                                                    ),
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                  ),
                                              ],
                                            ),
                                          ),
                                          GestureDetector(
                                            onTap: () {
                                              setState(() {
                                                _stops.removeAt(idx);
                                              });
                                              _recalculateRouteWithStops();
                                            },
                                            child: Container(
                                              padding: const EdgeInsets.all(4),
                                              decoration: BoxDecoration(
                                                color: isLight
                                                    ? const Color(0xFFF1F5F9)
                                                    : const Color(0xFF1B2838),
                                                shape: BoxShape.circle,
                                              ),
                                              child: Icon(
                                                Icons.close_rounded,
                                                color: isLight
                                                    ? const Color(0xFF64748B)
                                                    : Colors.white70,
                                                size: 16,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  }),
                                ],

                                // Trigger button to add stops when no stops exist & container is collapsed
                                if (!_showNearbyStops && _stops.isEmpty) ...[
                                  const SizedBox(height: 16),
                                  GestureDetector(
                                    onTap: () {
                                      setState(() => _showNearbyStops = true);
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 14,
                                        vertical: 13,
                                      ),
                                      decoration: BoxDecoration(
                                        color: isLight
                                            ? Colors.white
                                            : const Color(0xFF0C131D),
                                        borderRadius: BorderRadius.circular(16),
                                        border: Border.all(
                                          color: isLight
                                              ? const Color(0xFFE2E8F0)
                                              : const Color(0xFF1B283A),
                                          width: 1,
                                        ),
                                        boxShadow: isLight
                                            ? AppTheme.cardShadow
                                            : null,
                                      ),
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 36,
                                            height: 36,
                                            decoration: BoxDecoration(
                                              color: isLight
                                                  ? const Color(0xFFEBF5FF)
                                                  : const Color(0xFF0B2133),
                                              shape: BoxShape.circle,
                                              border: Border.all(
                                                color: isLight
                                                    ? const Color(0xFFB9E6FE)
                                                    : const Color(0xFF143F62),
                                                width: 1,
                                              ),
                                            ),
                                            child: Center(
                                              child: AppIcons.svg(
                                                AppIcons.plus,
                                                color: primaryColor,
                                                width: 14,
                                                height: 14,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  'Add Stops Along Route',
                                                  style: TextStyle(
                                                    color: isLight
                                                        ? const Color(0xFF0F172A)
                                                        : Colors.white,
                                                    fontSize: 14.5,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  'Find fuel, food, hotels and rest stops',
                                                  style: TextStyle(
                                                    color: isLight
                                                        ? const Color(0xFF64748B)
                                                        : const Color(0xFF7E8E9F),
                                                    fontSize: 11.5,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          Icon(
                                            Icons.chevron_right_rounded,
                                            color: isLight
                                                ? const Color(0xFF94A3B8)
                                                : const Color(0xFF7E8E9F),
                                            size: 20,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],

                                // 2nd Screenshot Container: Nearby Stops (Shown ONLY when user taps Add Stops)
                                if (_showNearbyStops) ...[
                                  const SizedBox(height: 18),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Nearby Stops',
                                            style: TextStyle(
                                              color: isLight
                                                  ? const Color(0xFF0F172A)
                                                  : Colors.white,
                                              fontSize: 15.5,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Find useful stops along your route.',
                                            style: TextStyle(
                                              color: isLight
                                                  ? const Color(0xFF64748B)
                                                  : const Color(0xFF7E8E9F),
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                      GestureDetector(
                                        onTap: () {
                                          setState(() => _showNearbyStops = false);
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 9,
                                            vertical: 4,
                                          ),
                                          decoration: BoxDecoration(
                                            color: isLight
                                                ? const Color(0xFFF1F5F9)
                                                : const Color(0xFF1E293B),
                                            borderRadius:
                                                BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            'Close',
                                            style: TextStyle(
                                              color: isLight
                                                  ? const Color(0xFF64748B)
                                                  : const Color(0xFF94A3B8),
                                              fontSize: 11.5,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 14),

                                  // 6 items in 2 rows of 3
                                  Row(
                                    children: [
                                      Expanded(
                                        child: _isEV
                                            ? _buildStopSquareTile(
                                                title: 'EV Charging',
                                                svgAsset: AppIcons.evCharging,
                                                iconColor: const Color(
                                                  0xFF00C2FF,
                                                ),
                                                isLight: isLight,
                                                primaryColor: primaryColor,
                                              )
                                            : (_isCNG
                                                ? _buildStopSquareTile(
                                                    title: 'CNG Station',
                                                    svgAsset: AppIcons.fuel,
                                                    iconColor: const Color(
                                                      0xFF0EA5E9,
                                                    ),
                                                    isLight: isLight,
                                                    primaryColor: primaryColor,
                                                  )
                                                : _buildStopSquareTile(
                                                    title: _isDiesel ? 'Diesel' : 'Fuel',
                                                    svgAsset: AppIcons.fuel,
                                                    iconColor: const Color(
                                                      0xFF00E676,
                                                    ),
                                                    isLight: isLight,
                                                    primaryColor: primaryColor,
                                                  )),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: _buildStopSquareTile(
                                          title: 'Food',
                                          svgAsset: AppIcons.restaurants,
                                          iconColor: const Color(0xFFFFB300),
                                          isLight: isLight,
                                          primaryColor: primaryColor,
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: _buildStopSquareTile(
                                          title: 'Hotels',
                                          svgAsset: AppIcons.hotel,
                                          iconColor: const Color(0xFFB388FF),
                                          isLight: isLight,
                                          primaryColor: primaryColor,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: _buildStopSquareTile(
                                          title: 'Rest Stops',
                                          svgAsset: AppIcons.restStops,
                                          iconColor: const Color(0xFF448AFF),
                                          isLight: isLight,
                                          primaryColor: primaryColor,
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: _buildStopSquareTile(
                                          title: 'Emergency',
                                          svgAsset: AppIcons.emergency,
                                          iconColor: const Color(0xFFFF5252),
                                          isLight: isLight,
                                          primaryColor: primaryColor,
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: _buildStopSquareTile(
                                          title: 'ATM / Cash',
                                          icon: Icons.atm_rounded,
                                          iconColor: const Color(0xFF6366F1),
                                          isLight: isLight,
                                          primaryColor: primaryColor,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),

                                  // Search Any Custom Stop Button
                                  GestureDetector(
                                    onTap: _onAddStopTapped,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 14,
                                        vertical: 12,
                                      ),
                                      decoration: BoxDecoration(
                                        color: isLight
                                            ? const Color(0xFFF8FAFC)
                                            : const Color(0xFF141F2D),
                                        borderRadius: BorderRadius.circular(14),
                                        border: Border.all(
                                          color: isLight
                                              ? const Color(0xFFE2E8F0)
                                              : const Color(0xFF1E2D3E),
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            Icons.search_rounded,
                                            size: 16,
                                            color: primaryColor,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            'Search Any Custom Stop',
                                            style: TextStyle(
                                              color: primaryColor,
                                              fontSize: 12.5,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],

                                const SizedBox(height: 32),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Fixed Button: "Start Navigation ->"
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 14,
                    ),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _isSaving ? null : _startNavigation,
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
                        child: _isSaving
                            ? const AppLoadingSpinner(size: 22)
                            : Center(
                                child: Text(
                                  'Start Navigation',
                                  style: TextStyle(
                                    color: isLight
                                        ? Colors.white
                                        : Colors.black,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
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
      );
    },
  );
  }

  Widget _buildMetricCard({
    required IconData icon,
    required Color iconColor,
    required String value,
    required String label,
    required bool isLight,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0C131D),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF182232),
          width: 1,
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor, size: 18),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: isLight
                  ? const Color(0xFF64748B)
                  : const Color(0xFF6B7C91),
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStopSquareTile({
    required String title,
    IconData? icon,
    String? svgAsset,
    required Color iconColor,
    required bool isLight,
    required Color primaryColor,
  }) {
    final isSelected = _selectedCategory == title;
    return GestureDetector(
      onTap: () => _onCategoryTapped(title),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isSelected
              ? (isLight ? const Color(0xFFEBF5FF) : const Color(0xFF0F2538))
              : (isLight ? Colors.white : const Color(0xFF0C131D)),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? primaryColor
                : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF182232)),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: isLight ? 0.15 : 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: svgAsset != null
                    ? AppIcons.svg(
                        svgAsset,
                        color: iconColor,
                        width: 20,
                        height: 20,
                      )
                    : Icon(icon, color: iconColor, size: 20),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: isSelected
                    ? primaryColor
                    : (isLight ? const Color(0xFF0F172A) : Colors.white),
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
