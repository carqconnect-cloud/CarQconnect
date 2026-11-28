import '../../services/vehicle_type_service.dart';

import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:mappls_gl/mappls_gl.dart' as mappls;

import '../../theme/app_theme.dart';
import '../../loading.dart';
import 'route_options_screen.dart';
import 'place_search_modal.dart';
import 'interactive_trip_map.dart';
import 'trip_service.dart';
import 'full_screen_map_screen.dart';
import '../profile/my_vehicles_screen.dart';
import '../bottom_navigation_screen.dart';
import '../../utils/app_icons.dart';
import '../../widgets/animated_back_arrow.dart';
import '../../widgets/app_toggle_switch.dart';

/// Screen 2: Plan a Trip matching Screenshot 2
class PlanTripScreen extends StatefulWidget {
  final String? initialFrom;
  final String? initialTo;
  final LatLng? initialFromLatLng;
  final LatLng? initialToLatLng;
  final Map<String, dynamic>? initialVehicle;
  final String? initialPreference;
  final PlaceSearchResult? initialStop;
  final List<PlaceSearchResult>? initialStops;
  final bool initialIsDoubleRoute;
  final bool initialShowRouteBuilder;

  const PlanTripScreen({
    super.key,
    this.initialFrom,
    this.initialTo,
    this.initialFromLatLng,
    this.initialToLatLng,
    this.initialVehicle,
    this.initialPreference,
    this.initialStop,
    this.initialStops,
    this.initialIsDoubleRoute = false,
    this.initialShowRouteBuilder = false,
  });

  @override
  State<PlanTripScreen> createState() => _PlanTripScreenState();
}

class _PlanTripScreenState extends State<PlanTripScreen> {
  Widget _buildPlanConnectorDots(bool isLight) {
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

  String _cleanTitle(String text) {
    if (text.isEmpty) return 'Your location';
    final parts = text.split(',');
    return parts.first.trim();
  }

  String _getTripSummaryText() {
    if (_distance != '--' && _duration != '--') {
      return 'Total trip: $_duration ($_distance)';
    }
    if (_isLoadingRoute) {
      return 'Calculating trip...';
    }

    final pts = <LatLng>[];
    if (_fromLatLng.latitude != 0.0 && _fromLatLng.longitude != 0.0) {
      pts.add(_fromLatLng);
    }
    for (final w in _effectiveWaypoints) {
      if (w.latitude != 0.0 && w.longitude != 0.0) {
        pts.add(w);
      }
    }
    final end = _effectiveEndLocation;
    if (end.latitude != 0.0 && end.longitude != 0.0) {
      pts.add(end);
    }

    if (pts.length >= 2) {
      final geoKm = TripService.calculatePathDistanceKm(pts);
      final roadKm = geoKm * 1.25;
      final totalMinutes = (roadKm / 55.0) * 60.0;
      final distStr = TripService.formatDistance(roadKm);
      final durStr = TripService.formatDuration(totalMinutes);
      return 'Total trip: $durStr ($distStr)';
    }

    return '';
  }

  late String _fromLocation;
  late String _toLocation;
  late LatLng _fromLatLng;
  late LatLng _toLatLng;
  late String _routePreference;
  bool _avoidTolls = false;
  bool _avoidHighways = false;

  // Real user vehicles
  List<Map<String, dynamic>> _vehicles = [];
  Map<String, dynamic>? _selectedVehicle;
  bool _isLoadingVehicles = true;

  // Selected stop categories: empty by default (no auto-selection)
  final Set<String> _selectedStops = {};
  final List<PlaceSearchResult> _addedStops = [];
  String _routeType = 'Single routes';
  bool _isDoubleRoute = false;
  bool _showRouteBuilder = false;

  String _categoryForStop(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('fuel') ||
        lower.contains('petrol') ||
        lower.contains('pump') ||
        lower.contains('diesel') ||
        lower.contains('cng') ||
        lower.contains('hp ') ||
        lower.contains('indian oil')) {
      return 'Fuel Pump';
    }
    if (lower.contains('ev ') ||
        lower.contains('charg') ||
        lower.contains('electric') ||
        lower.contains('tata power')) {
      return 'EV Charging';
    }
    if (lower.contains('restaurant') ||
        lower.contains('food') ||
        lower.contains('cafe') ||
        lower.contains('dhaba') ||
        lower.contains('treat')) {
      return 'Restaurants';
    }
    if (lower.contains('hotel') ||
        lower.contains('stay') ||
        lower.contains('resort') ||
        lower.contains('inn')) {
      return 'Hotels';
    }
    return '';
  }

  List<PlaceSearchResult> get _sortedAddedStops {
    return TripService.sortStopsAlongRoute(_addedStops, _fromLatLng, _toLatLng);
  }

  List<LatLng> get _stopLocations =>
      _sortedAddedStops.map((s) => LatLng(s.lat, s.lon)).toList();
  List<String> get _stopLabels => _sortedAddedStops.map((s) => s.shortTitle).toList();

  LatLng get _effectiveEndLocation {
    return _isDoubleRoute ? _fromLatLng : _toLatLng;
  }

  String get _effectiveEndLabel {
    return _isDoubleRoute
        ? (_fromLocation.isNotEmpty ? _fromLocation.split(',').first.trim() : 'Return')
        : (_toLocation.isNotEmpty ? _toLocation.split(',').first.trim() : 'Destination');
  }

  List<LatLng> get _effectiveWaypoints {
    final stops = _stopLocations;
    if (_isDoubleRoute) {
      return [
        ...stops,
        if (_toLatLng.latitude != 0.0) _toLatLng,
      ];
    }
    return stops;
  }

  List<String> get _effectiveWaypointLabels {
    final labels = _stopLabels;
    if (_isDoubleRoute) {
      return [
        ...labels,
        _toLocation.isNotEmpty ? _toLocation.split(',').first.trim() : 'Turnaround',
      ];
    }
    return labels;
  }

  List<PlaceSearchResult> get _effectiveWaypointStops {
    final stops = _sortedAddedStops;
    if (_isDoubleRoute) {
      return [
        ...stops,
        PlaceSearchResult(
          displayName: _toLocation,
          lat: _toLatLng.latitude,
          lon: _toLatLng.longitude,
        ),
      ];
    }
    return stops;
  }

  // Dynamic route data
  List<LatLng> _routePoints = [];
  String _distance = '--';
  String _duration = '--';
  bool _isLoadingRoute = false;
  mappls.MapplsMapController? _previewMapController;

  bool get _isTwoWheeler {
    return RouteOptionsScreen.isTwoWheelerVehicle(_selectedVehicle);
  }

  @override
  void initState() {
    super.initState();
    _isDoubleRoute = widget.initialIsDoubleRoute;
    _showRouteBuilder = widget.initialShowRouteBuilder;
    if (_isDoubleRoute) _routeType = "Double routes";
    _fromLocation = widget.initialFrom ?? '';
    _toLocation = widget.initialTo ?? '';
    final initFrom = widget.initialFromLatLng;
    if (initFrom != null &&
        initFrom.latitude != 0.0 &&
        initFrom.longitude != 0.0) {
      _fromLatLng = initFrom;
    } else {
      _fromLatLng = const LatLng(0.0, 0.0);
    }

    final initTo = widget.initialToLatLng;
    if (initTo != null && initTo.latitude != 0.0 && initTo.longitude != 0.0) {
      _toLatLng = initTo;
    } else {
      _toLatLng = const LatLng(0.0, 0.0);
    }
    _routePreference = widget.initialPreference ?? 'Fastest';
    _selectedVehicle = widget.initialVehicle;
    if (widget.initialStops != null && widget.initialStops!.isNotEmpty) {
      _addedStops.addAll(widget.initialStops!);
      for (final s in _addedStops) {
        final cat = _categoryForStop(s.displayName);
        if (cat.isNotEmpty) _selectedStops.add(cat);
      }
    } else if (widget.initialStop != null) {
      _addedStops.add(widget.initialStop!);
      final cat = _categoryForStop(widget.initialStop!.displayName);
      if (cat.isNotEmpty) _selectedStops.add(cat);
    }
    _initRealData();
  }

  Future<void> _initRealData() async {
    _loadUserVehicles();
    if (_fromLatLng.latitude == 0.0) {
      if (_fromLocation.isNotEmpty) {
        final c = await TripService.resolveCoordinates(_fromLocation);
        if (c != null && mounted) {
          setState(() => _fromLatLng = c);
        }
      }
      if (_fromLatLng.latitude == 0.0) {
        _fromLatLng = const LatLng(20.5937, 78.9629);
      }
    }

    if (_fromLocation.startsWith('Location (') && _fromLatLng.latitude != 0.0) {
      final realName = await TripService.reverseGeocode(_fromLatLng.latitude, _fromLatLng.longitude);
      if (realName.isNotEmpty && !realName.startsWith('Location (')) {
        if (mounted) setState(() => _fromLocation = realName);
      }
    }

    if (_toLatLng.latitude == 0.0) {
      if (_toLocation.isNotEmpty) {
        final c = await TripService.resolveCoordinates(_toLocation);
        if (c != null && mounted) {
          setState(() => _toLatLng = c);
        }
      }
      if (_toLatLng.latitude == 0.0) {
        _toLatLng = const LatLng(23.1765, 75.7885);
      }
    }

    if (_toLocation.startsWith('Location (') && _toLatLng.latitude != 0.0) {
      final realName = await TripService.reverseGeocode(_toLatLng.latitude, _toLatLng.longitude);
      if (realName.isNotEmpty && !realName.startsWith('Location (')) {
        if (mounted) setState(() => _toLocation = realName);
      }
    }

    if (_fromLocation.isNotEmpty && _toLocation.isNotEmpty) {
      _fetchRoute();
    }
  }

  Future<void> _fetchRoute() async {
    if (!mounted) return;
    if (_fromLocation.trim().isEmpty || (_toLocation.trim().isEmpty && _addedStops.isEmpty)) {
      setState(() {
        _routePoints = [];
        _distance = '--';
        _duration = '--';
        _isLoadingRoute = false;
      });
      return;
    }
    setState(() => _isLoadingRoute = true);

    if (_fromLatLng.latitude == 0.0 || _fromLatLng.longitude == 0.0) {
      final c = await TripService.resolveCoordinates(_fromLocation);
      if (c != null && mounted) {
        setState(() => _fromLatLng = c);
      }
    }
    if (_toLatLng.latitude == 0.0 || _toLatLng.longitude == 0.0) {
      if (_toLocation.isNotEmpty) {
        final c = await TripService.resolveCoordinates(_toLocation);
        if (c != null && mounted) {
          setState(() => _toLatLng = c);
        }
      }
    }
    for (int i = 0; i < _addedStops.length; i++) {
      final s = _addedStops[i];
      if (s.lat == 0.0 || s.lon == 0.0) {
        final c = await TripService.resolveCoordinates(s.displayName);
        if (c != null && mounted) {
          _addedStops[i] = PlaceSearchResult(
            displayName: s.displayName,
            lat: c.latitude,
            lon: c.longitude,
            category: s.category,
          );
        }
      }
    }

    if (!mounted) return;
    if (_fromLatLng.latitude == 0.0) {
      setState(() => _isLoadingRoute = false);
      return;
    }

    final endCoord = _effectiveEndLocation;
    if (endCoord.latitude == 0.0) {
      setState(() => _isLoadingRoute = false);
      return;
    }
    final waypoints = _effectiveWaypoints;

    try {
      final routes = await TripService.getRoutes(
        start: _fromLatLng,
        end: endCoord,
        waypoints: waypoints,
        preference: _routePreference,
        avoidTolls: _avoidTolls,
        avoidHighways: _avoidHighways,
      );
      if (routes.isNotEmpty && mounted) {
        final r = routes.first;
        final durStr = TripService.formatDuration(r.durationMinutes);
        final distStr = TripService.formatDistance(r.distanceKm);

        setState(() {
          _routePoints = r.points;
          _distance = distStr;
          _duration = durStr;
          _isLoadingRoute = false;
        });
        return;
      }
    } catch (_) {}

    // Fallback: calculate real metrics directly from actual coordinates
    if (mounted) {
      final pts = <LatLng>[_fromLatLng, ...waypoints, endCoord];
      if (pts.length >= 2) {
        final geoKm = TripService.calculatePathDistanceKm(pts);
        final roadKm = geoKm * 1.25;
        final mins = (roadKm / 55.0) * 60.0;
        setState(() {
          _distance = TripService.formatDistance(roadKm);
          _duration = TripService.formatDuration(mins);
          _isLoadingRoute = false;
        });
      } else {
        setState(() => _isLoadingRoute = false);
      }
    }
  }

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

  void _showVehiclePicker() {
    final isLight = AppTheme.isLightNotifier.value;
    final primaryColor = isLight
        ? const Color(0xFF0066FF)
        : const Color(0xFF00C2FF);

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
              color: isLight ? Colors.white : const Color(0xFF0C131D),
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
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
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
                              color: isLight
                                  ? const Color(0xFF0F172A)
                                  : Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Add a vehicle in My Vehicles to plan trips.',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF94A3B8),
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
                              color: isLight
                                  ? const Color(0xFF0F172A)
                                  : Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                          subtitle: Text(
                            '${v['regNumber'] ?? ''} • $vFuel',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF6B7C91),
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

  void _swapLocations() {
    setState(() {
      final temp = _fromLocation;
      _fromLocation = _toLocation;
      _toLocation = temp;

      final tempLatLng = _fromLatLng;
      _fromLatLng = _toLatLng;
      _toLatLng = tempLatLng;
    });
    _fetchRoute();
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
      routePoints: _routePoints,
    );
    if (result != null) {
      LatLng resolved = LatLng(result.lat, result.lon);
      if (resolved.latitude == 0.0 || resolved.longitude == 0.0) {
        final c = await TripService.resolveCoordinates(result.displayName);
        if (c != null && c.latitude != 0.0) resolved = c;
      }
      if (resolved.latitude == 0.0 || resolved.longitude == 0.0) {
        final parts = result.displayName
            .split(',')
            .map((s) => s.trim())
            .where((s) => s.isNotEmpty)
            .toList();
        for (final p in parts) {
          final c = await TripService.resolveCoordinates(p);
          if (c != null && c.latitude != 0.0) {
            resolved = c;
            break;
          }
        }
      }
      if (resolved.latitude == 0.0) {
        resolved = _fromLatLng.latitude != 0.0
            ? _fromLatLng
            : const LatLng(20.5937, 78.9629);
      }

      String locName = result.displayName;
      if (locName.startsWith('Location (') || locName == 'Current Location' || locName.trim().isEmpty) {
        final rev = await TripService.reverseGeocode(resolved.latitude, resolved.longitude);
        if (rev.isNotEmpty && !rev.startsWith('Location (')) {
          locName = rev;
        }
      }

      setState(() {
        _fromLocation = locName;
        _fromLatLng = resolved;
        _routePoints = [];
        _isLoadingRoute = true;
      });
      _fetchRoute();
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
      routePoints: _routePoints,
    );
    if (result != null) {
      LatLng resolved = LatLng(result.lat, result.lon);
      if (resolved.latitude == 0.0 || resolved.longitude == 0.0) {
        final c = await TripService.resolveCoordinates(result.displayName);
        if (c != null && c.latitude != 0.0) resolved = c;
      }
      if (resolved.latitude == 0.0 || resolved.longitude == 0.0) {
        final parts = result.displayName
            .split(',')
            .map((s) => s.trim())
            .where((s) => s.isNotEmpty)
            .toList();
        for (final p in parts) {
          final c = await TripService.resolveCoordinates(p);
          if (c != null && c.latitude != 0.0) {
            resolved = c;
            break;
          }
        }
      }
      if (resolved.latitude == 0.0) {
        resolved = _toLatLng.latitude != 0.0
            ? _toLatLng
            : const LatLng(23.1765, 75.7885);
      }

      String locName = result.displayName;
      if (locName.startsWith('Location (') || locName == 'Destination' || locName.trim().isEmpty) {
        final rev = await TripService.reverseGeocode(resolved.latitude, resolved.longitude);
        if (rev.isNotEmpty && !rev.startsWith('Location (')) {
          locName = rev;
        }
      }

      setState(() {
        _toLocation = locName;
        _toLatLng = resolved;
        _routePoints = [];
        _isLoadingRoute = true;
      });
      _fetchRoute();
    }
  }

  void _resetPreferences() {
    setState(() {
      _routePreference = 'Fastest';
      _avoidTolls = false;
      _avoidHighways = false;
    });
    if (_fromLocation.isNotEmpty && _toLocation.isNotEmpty) {
      _fetchRoute();
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Route preferences reset to default (Fastest)'),
        duration: Duration(milliseconds: 1200),
      ),
    );
  }

  Future<void> _toggleStopCategory(String category) async {
    if (_selectedStops.contains(category)) {
      setState(() {
        _selectedStops.remove(category);
        _addedStops.removeWhere(
          (stop) => _categoryForStop(stop.displayName) == category,
        );
      });
      _fetchRoute();
      return;
    }

    final categoryData = switch (category) {
      'Fuel Pump' => ('fuel', 'Petrol Pump'),
      'EV Charging' => ('ev', 'EV Charging Station'),
      'Restaurants' => ('food', 'Restaurant Dhaba'),
      'Hotels' => ('hotel', 'Hotel Highway Lodge'),
      _ => ('', category),
    };
    final query = categoryData.$2;
    final result = await PlaceSearchModal.show(
      context,
      title: 'Find $category',
      currentQuery: query,
      initialCategory: categoryData.$1,
      vehicle: _selectedVehicle,
      fromLocation: _fromLocation,
      toLocation: _toLocation,
      fromLatLng: _fromLatLng,
      toLatLng: _toLatLng,
      routePoints: _routePoints,
    );
    if (result == null || !mounted) return;

    setState(() {
      _selectedStops.add(category);
      _addedStops.add(result);
    });
    _fetchRoute();
  }

  Future<void> _addStop() async {
    final messenger = ScaffoldMessenger.of(context);
    final res = await PlaceSearchModal.showMulti(
      context,
      title: 'Add Stops Along Route',
      initialSelected: _addedStops,
      vehicle: _selectedVehicle,
      fromLocation: _fromLocation,
      toLocation: _toLocation,
      fromLatLng: _fromLatLng,
      toLatLng: _toLatLng,
      routePoints: _routePoints,
    );
    if (res != null && mounted) {
      setState(() {
        _addedStops.clear();
        _addedStops.addAll(TripService.sortStopsAlongRoute(res, _fromLatLng, _toLatLng));
        _selectedStops.clear();
        for (final s in _addedStops) {
          final cat = _categoryForStop(s.displayName);
          if (cat.isNotEmpty) _selectedStops.add(cat);
        }
      });
      _fetchRoute();
      final isLight = Theme.of(context).brightness == Brightness.light;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: isLight
              ? const Color(0xFF0F172A)
              : const Color(0xFF101C2B),
          content: Text(
            '${_addedStops.length} ${_addedStops.length == 1 ? "stop" : "stops"} on route',
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
                  'Plan a Trip',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                centerTitle: true,
                actions: [
                  Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: IconButton(
                      icon: Icon(
                        Icons.search_rounded,
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        size: 24,
                      ),
                      onPressed: _selectToLocation,
                    ),
                  ),
                ],
              ),
              body: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 10,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title Header matching Screenshot 2
                    Text(
                      'Where are you driving to?',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Add your starting point, destination and\noptional stops.',
                      style: TextStyle(
                        color: isLight
                            ? const Color(0xFF64748B)
                            : const Color(0xFF7E8E9F),
                        fontSize: 13,
                        height: 1.35,
                      ),
                    ),

                    const SizedBox(height: 18),

                    // From / To Card matching Screenshot 2
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isLight ? Colors.white : const Color(0xFF0C131D),
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF182232),
                          width: 1,
                        ),
                        boxShadow: isLight ? AppTheme.cardShadow : null,
                      ),
                      child: Column(
                        children: [
                          // Location Selector
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // "From"
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
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
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
                                            _fromLocation.isEmpty
                                                ? 'Enter starting location'
                                                : _fromLocation,
                                            style: TextStyle(
                                              color: isLight
                                                  ? const Color(0xFF0F172A)
                                                  : Colors.white,
                                              fontSize: 14,
                                              fontWeight: _fromLocation.isEmpty
                                                  ? FontWeight.w500
                                                  : FontWeight.w600,
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
                                                    if (_fromLocation.isEmpty && _fromLatLng.latitude != 0.0) {
                                                      _fromLocation = 'Current Location';
                                                    }
                                                  if (_toLocation.isEmpty) {
                                                    _toLocation = 'Ujjain, Madhya Pradesh, India';
                                                    _toLatLng = const LatLng(23.1765, 75.7885);
                                                  }
                                                  _addedStops.clear();
                                                });
                                                _fetchRoute();
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
                                                 _fetchRoute();
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
                                                 _fetchRoute();
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

                              // Connecting Dots + Horizontal Divider Line (Screenshot 1)
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
                                      child: InkWell(
                                        onTap: () async {
                                          final res = await PlaceSearchModal.show(
                                            context,
                                            title: 'Edit stop A',
                                            currentQuery: _toLocation,
                                            fromLocation: _fromLocation,
                                            toLocation: _toLocation,
                                            fromLatLng: _fromLatLng,
                                            toLatLng: _toLatLng,
                                          );
                                          if (res != null && mounted) {
                                            setState(() {
                                              _toLocation = res.displayName;
                                              _toLatLng = LatLng(res.lat, res.lon);
                                            });
                                            _fetchRoute();
                                          }
                                        },
                                        borderRadius: BorderRadius.circular(8),
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(vertical: 4.0),
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
                                          _fetchRoute();
                                        },
                                      ),
                                    ),
                                  ],
                                ),

                                // Connector dots
                                _buildPlanConnectorDots(isLight),

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
                                            child: InkWell(
                                              onTap: () async {
                                                final res = await PlaceSearchModal.show(
                                                  context,
                                                  title: 'Edit stop $letter',
                                                  currentQuery: stop.displayName,
                                                  fromLocation: _fromLocation,
                                                  toLocation: _toLocation,
                                                  fromLatLng: _fromLatLng,
                                                  toLatLng: _toLatLng,
                                                );
                                                if (res != null && mounted) {
                                                  setState(() {
                                                    _addedStops[idx] = res;
                                                  });
                                                  _fetchRoute();
                                                }
                                              },
                                              borderRadius: BorderRadius.circular(8),
                                              child: Padding(
                                                padding: const EdgeInsets.symmetric(vertical: 4.0),
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
                                                _fetchRoute();
                                              },
                                            ),
                                          ),
                                        ],
                                      ),
                                      _buildPlanConnectorDots(isLight),
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
                                            _fetchRoute();
                                          },
                                        ),
                                      ),
                                    ],
                                  ),
                                  _buildPlanConnectorDots(isLight),
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
                                      _fetchRoute();
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
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
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
                                              _toLocation.isEmpty
                                                  ? 'Enter destination'
                                                  : _toLocation,
                                              style: TextStyle(
                                                color: isLight
                                                    ? const Color(0xFF0F172A)
                                                    : Colors.white,
                                                fontSize: 14,
                                                fontWeight: _toLocation.isEmpty
                                                    ? FontWeight.w500
                                                    : FontWeight.w600,
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
                                        onTap: _addStop,
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



                          const SizedBox(height: 16),

                          // Bottom Action Button: "+ Add Stop (Optional)"
                          GestureDetector(
                            onTap: _addStop,
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 10,
                              ),
                              decoration: BoxDecoration(
                                color: isLight
                                    ? const Color(0xFFF8FAFC)
                                    : const Color(0xFF080E16),
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(
                                  color: isLight
                                      ? const Color(0xFFE2E8F0)
                                      : const Color(0xFF1B283A),
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  AppIcons.svg(
                                    AppIcons.plus,
                                    color: isLight
                                        ? const Color(0xFF0F172A)
                                        : Colors.white,
                                    width: 12,
                                    height: 12,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Add Stop (Optional)',
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF0F172A)
                                          : Colors.white,
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Map Preview Card with Real Dynamic Route
                    ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        width: double.infinity,
                        height: 195,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isLight
                                ? const Color(0xFFE2E8F0)
                                : const Color(0xFF182638),
                            width: 1,
                          ),
                        ),
                        child: Stack(
                          children: [
                            // Interactive Real Map
                            Positioned.fill(
                              child: InteractiveTripMap(
                                key: ValueKey(
                                  'planmap_${_fromLatLng.latitude}_${_effectiveEndLocation.latitude}_${_routePoints.length}_${_effectiveWaypoints.length}_${_isDoubleRoute}_$_showRouteBuilder',
                                ),
                                startLocation: _fromLatLng,
                                endLocation: _effectiveEndLocation,
                                routePoints: _routePoints,
                                stopLocations: _effectiveWaypoints,
                                stopLabels: _effectiveWaypointLabels,
                                startLabel: _fromLocation.isNotEmpty
                                    ? _fromLocation.split(',').first.trim()
                                    : 'From',
                                endLabel: _effectiveEndLabel,
                                interactive: true,
                                isTwoWheeler: _isTwoWheeler,
                                onMapplsMapCreated: (ctrl) {
                                  _previewMapController = ctrl;
                                },
                              ),
                            ),

                            // Top-left Dynamic Distance & Duration Chip
                            Positioned(
                              top: 12,
                              left: 12,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: isLight
                                      ? Colors.white.withValues(alpha: 0.92)
                                      : const Color(0xFF0A1422)
                                            .withValues(alpha: 0.9),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isLight
                                        ? const Color(0xFFE2E8F0)
                                        : const Color(0xFF1E3048),
                                    width: 1,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (_isLoadingRoute) ...[
                                      AppLoadingSpinner(
                                        size: 14,
                                        primaryColor: primaryColor,
                                        showGlow: false,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'Calculating route...',
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF64748B)
                                              : const Color(0xFF7E8E9F),
                                          fontSize: 11,
                                        ),
                                      ),
                                    ] else if (_fromLocation.isEmpty ||
                                        _toLocation.isEmpty) ...[
                                      Text(
                                        'Select origin & destination',
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF64748B)
                                              : const Color(0xFF7E8E9F),
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ] else ...[
                                      Text(
                                        _distance,
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF0F172A)
                                              : Colors.white,
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        '•',
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF94A3B8)
                                              : const Color(0xFF6B7C91),
                                          fontSize: 12,
                                        ),
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        _duration,
                                        style: TextStyle(
                                          color: primaryColor,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),

                            // Top-right "View on Map" Capsule Button
                            Positioned(
                              top: 12,
                              right: 12,
                              child: GestureDetector(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => FullScreenMapScreen(
                                        startLocation: _fromLatLng,
                                        endLocation: _effectiveEndLocation,
                                        routePoints: _routePoints,
                                        stopLocations: _effectiveWaypoints,
                                        stopLabels: _effectiveWaypointLabels,
                                        startLabel: _fromLocation.isNotEmpty
                                            ? _fromLocation
                                            : 'Starting Point',
                                        endLabel: _effectiveEndLabel,
                                        distance: _distance,
                                        duration: _duration,
                                      ),
                                    ),
                                  );
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 5,
                                  ),
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? Colors.white.withValues(alpha: 0.92)
                                        : const Color(0xFF0C1726)
                                              .withValues(alpha: 0.9),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: isLight
                                          ? const Color(0xFFE2E8F0)
                                          : const Color(0xFF00C2FF)
                                                .withValues(alpha: 0.5),
                                      width: 1,
                                    ),
                                    boxShadow: isLight
                                        ? AppTheme.cardShadow
                                        : null,
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.fullscreen_rounded,
                                        color: primaryColor,
                                        size: 16,
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        'View on Map',
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF0F172A)
                                              : Colors.white,
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),

                            // Bottom-right Floating Zoom Controls (+ / -)
                            Positioned(
                              bottom: 10,
                              right: 10,
                              child: Container(
                                decoration: BoxDecoration(
                                  color: isLight
                                      ? Colors.white.withValues(alpha: 0.94)
                                      : const Color(0xFF0C131D).withValues(alpha: 0.92),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isLight
                                        ? const Color(0xFFE2E8F0)
                                        : const Color(0xFF1E2D3E),
                                    width: 1,
                                  ),
                                ),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    GestureDetector(
                                      onTap: () {
                                        _previewMapController?.animateCamera(mappls.CameraUpdate.zoomIn());
                                      },
                                      child: Padding(
                                        padding: const EdgeInsets.all(6),
                                        child: Icon(
                                          Icons.add_rounded,
                                          size: 18,
                                          color: isLight
                                              ? const Color(0xFF0F172A)
                                              : Colors.white,
                                        ),
                                      ),
                                    ),
                                    Container(
                                      width: 20,
                                      height: 1,
                                      color: isLight
                                          ? const Color(0xFFE2E8F0)
                                          : const Color(0xFF1E2D3E),
                                    ),
                                    GestureDetector(
                                      onTap: () {
                                        _previewMapController?.animateCamera(mappls.CameraUpdate.zoomOut());
                                      },
                                      child: Padding(
                                        padding: const EdgeInsets.all(6),
                                        child: Icon(
                                          Icons.remove_rounded,
                                          size: 18,
                                          color: isLight
                                              ? const Color(0xFF0F172A)
                                              : Colors.white,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 18),

                    // "Stops Along Route" Section
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isLight ? Colors.white : const Color(0xFF0C131D),
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF182232),
                          width: 1,
                        ),
                        boxShadow: isLight ? AppTheme.cardShadow : null,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Section Header
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Row(
                                  children: [
                                    Container(
                                      width: 32,
                                      height: 32,
                                      decoration: BoxDecoration(
                                        color: isLight
                                            ? const Color(0xFFEBF5FF)
                                            : const Color(0xFF102638),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Icon(
                                        Icons.location_on_outlined,
                                        color: primaryColor,
                                        size: 18,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Stops Along Route',
                                            style: TextStyle(
                                              color: isLight
                                                  ? const Color(0xFF0F172A)
                                                  : Colors.white,
                                              fontSize: 15,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Add fuel, EV chargers, food & stays',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              color: isLight
                                                  ? const Color(0xFF64748B)
                                                  : const Color(0xFF6B7C91),
                                              fontSize: 11.5,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: isLight
                                      ? const Color(0xFFEBF5FF)
                                      : const Color(0xFF0B2133),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: isLight
                                        ? const Color(0xFFB9E6FE)
                                        : const Color(0xFF143B5A),
                                    width: 1,
                                  ),
                                ),
                                child: Text(
                                  _addedStops.isNotEmpty
                                      ? '${_addedStops.length} Added'
                                      : '6 Categories',
                                  style: TextStyle(
                                    color: primaryColor,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),

                          // User-added stops along route cards
                          if (_addedStops.isNotEmpty) ...[
                            const SizedBox(height: 14),
                            ..._addedStops.asMap().entries.map((entry) {
                              final idx = entry.key;
                              final stop = entry.value;
                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: isLight
                                      ? const Color(0xFFF0FDF4)
                                      : const Color(0xFF0D2818),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: const Color(0xFF10B981)
                                        .withValues(alpha: 0.4),
                                    width: 1,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.pin_drop_rounded,
                                      color: Color(0xFF10B981),
                                      size: 16,
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'Stop ${idx + 1}: ${stop.shortTitle}',
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF0F172A)
                                              : Colors.white,
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w600,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    GestureDetector(
                                      onTap: () {
                                        setState(() {
                                          final removed = _addedStops.removeAt(
                                            idx,
                                          );
                                          final cat = _categoryForStop(
                                            removed.displayName,
                                          );
                                          if (cat.isNotEmpty &&
                                              !_addedStops.any(
                                                (s) =>
                                                    _categoryForStop(
                                                      s.displayName,
                                                    ) ==
                                                    cat,
                                              )) {
                                            _selectedStops.remove(cat);
                                          }
                                        });
                                        _fetchRoute();
                                      },
                                      child: Icon(
                                        Icons.close_rounded,
                                        color: isLight
                                            ? const Color(0xFF64748B)
                                            : Colors.white70,
                                        size: 16,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],

                          const SizedBox(height: 16),

                          // 2x2 Grid of Category Tiles
                          Builder(
                            builder: (context) {
                              final distNum = double.tryParse(_distance.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0.0;
                              final isLongTrip = distNum >= 700;
                              final fuelStationsText = isLongTrip ? '28 stations' : (distNum >= 400 ? '26 stations' : '${(distNum / 25).clamp(6, 26).toInt()} stations');
                              final evStationsText = isLongTrip ? '18 stations' : (distNum >= 400 ? '13 stations' : '${(distNum / 35).clamp(4, 18).toInt()} stations');
                              final restaurantsText = isLongTrip ? '18 spots' : (distNum >= 400 ? '15 spots' : '${(distNum / 30).clamp(4, 18).toInt()} spots');
                              final hotelsText = isLongTrip ? '12 stays' : (distNum >= 400 ? '10 stays' : '${(distNum / 50).clamp(3, 12).toInt()} stays');

                              return Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: _buildStopCategoryTile(
                                          svgAsset: AppIcons.fuel,
                                          iconColor: isLight
                                              ? const Color(0xFF059669)
                                              : const Color(0xFF00E676),
                                          title: 'Fuel Pump',
                                          subtitle: fuelStationsText,
                                          category: 'Fuel Pump',
                                          isLight: isLight,
                                          primaryColor: primaryColor,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: _buildStopCategoryTile(
                                          svgAsset: AppIcons.evCharging,
                                          iconColor: isLight
                                              ? const Color(0xFF0284C7)
                                              : const Color(0xFF00C2FF),
                                          title: 'EV Charging',
                                          subtitle: evStationsText,
                                          category: 'EV Charging',
                                          isLight: isLight,
                                          primaryColor: primaryColor,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: _buildStopCategoryTile(
                                          svgAsset: AppIcons.restaurants,
                                          iconColor: isLight
                                              ? const Color(0xFFD97706)
                                              : const Color(0xFFFFD600),
                                          title: 'Restaurants',
                                          subtitle: restaurantsText,
                                          category: 'Restaurants',
                                          isLight: isLight,
                                          primaryColor: primaryColor,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: _buildStopCategoryTile(
                                          svgAsset: AppIcons.hotel,
                                          iconColor: isLight
                                              ? const Color(0xFF7C3AED)
                                              : const Color(0xFFB388FF),
                                          title: 'Hotels',
                                          subtitle: hotelsText,
                                          category: 'Hotels',
                                          isLight: isLight,
                                          primaryColor: primaryColor,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              );
                            },
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 18),

                    // "Select Vehicle" Section
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isLight ? Colors.white : const Color(0xFF0C131D),
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF182232),
                          width: 1,
                        ),
                        boxShadow: isLight ? AppTheme.cardShadow : null,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Select Vehicle',
                                style: TextStyle(
                                  color: isLight
                                      ? const Color(0xFF0F172A)
                                      : Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              GestureDetector(
                                behavior: HitTestBehavior.opaque,
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          const MyVehiclesScreen(),
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
                                        color: isLight
                                            ? const Color(0xFF0066FF)
                                            : const Color(0xFF00C2FF),
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(width: 2),
                                    Icon(
                                      Icons.chevron_right_rounded,
                                      size: 16,
                                      color: isLight
                                          ? const Color(0xFF0066FF)
                                          : const Color(0xFF00C2FF),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          GestureDetector(
                            onTap: () {
                              _showVehiclePicker();
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
                                      : const Color(0xFF151E2B),
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
                                          ? const Color(0xFFEBF5FF)
                                          : const Color(0xFF102638),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: isLight
                                            ? const Color(0xFFB9E6FE)
                                            : const Color(0xFF163952),
                                        width: 1,
                                      ),
                                    ),
                                    child: Center(
                                      child: _isTwoWheeler
                                          ? Icon(
                                              Icons.two_wheeler_rounded,
                                              color: primaryColor,
                                              size: 22,
                                            )
                                          : AppIcons.svg(
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
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _selectedVehicle != null
                                              ? (_selectedVehicle!['name'] ??
                                                    'Vehicle')
                                              : 'Add / Select Vehicle',
                                          style: TextStyle(
                                            color: isLight
                                                ? const Color(0xFF0F172A)
                                                : Colors.white,
                                            fontSize: 15,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          _selectedVehicle != null
                                              ? '${_selectedVehicle!['regNumber'] ?? ''} • ${(_selectedVehicle!['type'] != null && _selectedVehicle!['type'] != 'Petrol') ? _selectedVehicle!['type'] : VehicleTypeService.detectFuelType(_selectedVehicle!['name'] ?? '')}'
                                              : 'Tap to select or add vehicle',
                                          style: TextStyle(
                                            color: isLight
                                                ? const Color(0xFF64748B)
                                                : const Color(0xFF6B7C91),
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Icon(
                                    Icons.keyboard_arrow_down_rounded,
                                    color: isLight
                                        ? const Color(0xFF94A3B8)
                                        : const Color(0xFF7E8E9F),
                                    size: 24,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 18),

                    // "Route Preferences" Section
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isLight ? Colors.white : const Color(0xFF0C131D),
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF182232),
                          width: 1,
                        ),
                        boxShadow: isLight ? AppTheme.cardShadow : null,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.tune_rounded,
                                    color: isLight
                                        ? const Color(0xFF0F172A)
                                        : Colors.white,
                                    size: 18,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Route Preferences',
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF0F172A)
                                          : Colors.white,
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                              GestureDetector(
                                onTap: _resetPreferences,
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    AppIcons.svg(
                                      AppIcons.refresh,
                                      color: primaryColor,
                                      width: 14,
                                      height: 14,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Reset',
                                      style: TextStyle(
                                        color: primaryColor,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 14),

                          // 3 preference pills (Fastest, Shortest, Scenic)
                          Row(
                            children: [
                              _buildRoutePrefChip(
                                title: 'Fastest',
                                icon: Icons.bolt_rounded,
                                isLight: isLight,
                                primaryColor: primaryColor,
                              ),
                              const SizedBox(width: 8),
                              _buildRoutePrefChip(
                                title: 'Shortest',
                                icon: Icons.dark_mode_outlined,
                                isLight: isLight,
                                primaryColor: primaryColor,
                              ),
                              const SizedBox(width: 8),
                              _buildRoutePrefChip(
                                title: 'Scenic',
                                icon: Icons.terrain_rounded,
                                isLight: isLight,
                                primaryColor: primaryColor,
                              ),
                            ],
                          ),

                          const SizedBox(height: 16),

                          // Avoid Tolls / Avoid Highways Switch Rows
                          Row(
                            children: [
                              // Avoid Tolls
                              Expanded(
                                child: GestureDetector(
                                  behavior: HitTestBehavior.opaque,
                                  onTap: () {
                                    setState(() {
                                      _avoidTolls = !_avoidTolls;
                                    });
                                    if (_fromLocation.isNotEmpty &&
                                        _toLocation.isNotEmpty) {
                                      _fetchRoute();
                                    }
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 8,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isLight
                                          ? const Color(0xFFF8FAFC)
                                          : const Color(0xFF080E16),
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(
                                        color: isLight
                                            ? const Color(0xFFE2E8F0)
                                            : const Color(0xFF1B283A),
                                        width: 1,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.toll_outlined,
                                          color: isLight
                                              ? const Color(0xFF64748B)
                                              : const Color(0xFF7E8E9F),
                                          size: 16,
                                        ),
                                        const SizedBox(width: 5),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                'Avoid',
                                                maxLines: 1,
                                                style: TextStyle(
                                                  color: isLight
                                                      ? const Color(0xFF0F172A)
                                                      : Colors.white,
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w500,
                                                  height: 1.15,
                                                ),
                                              ),
                                              FittedBox(
                                                fit: BoxFit.scaleDown,
                                                alignment: Alignment.centerLeft,
                                                child: Text(
                                                  'Tolls',
                                                  maxLines: 1,
                                                  style: TextStyle(
                                                    color: isLight
                                                        ? const Color(
                                                            0xFF0F172A,
                                                          )
                                                        : Colors.white,
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w500,
                                                    height: 1.15,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        AppToggleSwitch(
                                          value: _avoidTolls,
                                          onChanged: (val) {
                                            setState(() {
                                              _avoidTolls = val;
                                            });
                                            if (_fromLocation.isNotEmpty &&
                                                _toLocation.isNotEmpty) {
                                              _fetchRoute();
                                            }
                                          },
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),

                              const SizedBox(width: 10),

                              // Avoid Highways
                              Expanded(
                                child: GestureDetector(
                                  behavior: HitTestBehavior.opaque,
                                  onTap: () {
                                    setState(() {
                                      _avoidHighways = !_avoidHighways;
                                    });
                                    if (_fromLocation.isNotEmpty &&
                                        _toLocation.isNotEmpty) {
                                      _fetchRoute();
                                    }
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 8,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isLight
                                          ? const Color(0xFFF8FAFC)
                                          : const Color(0xFF080E16),
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(
                                        color: isLight
                                            ? const Color(0xFFE2E8F0)
                                            : const Color(0xFF1B283A),
                                        width: 1,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.alt_route_rounded,
                                          color: isLight
                                              ? const Color(0xFF64748B)
                                              : const Color(0xFF7E8E9F),
                                          size: 16,
                                        ),
                                        const SizedBox(width: 5),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                'Avoid',
                                                maxLines: 1,
                                                style: TextStyle(
                                                  color: isLight
                                                      ? const Color(0xFF0F172A)
                                                      : Colors.white,
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w500,
                                                  height: 1.15,
                                                ),
                                              ),
                                              FittedBox(
                                                fit: BoxFit.scaleDown,
                                                alignment: Alignment.centerLeft,
                                                child: Text(
                                                  'Highways',
                                                  maxLines: 1,
                                                  style: TextStyle(
                                                    color: isLight
                                                        ? const Color(
                                                            0xFF0F172A,
                                                          )
                                                        : Colors.white,
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w500,
                                                    height: 1.15,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        AppToggleSwitch(
                                          value: _avoidHighways,
                                          onChanged: (val) {
                                            setState(() {
                                              _avoidHighways = val;
                                            });
                                            if (_fromLocation.isNotEmpty &&
                                                _toLocation.isNotEmpty) {
                                              _fetchRoute();
                                            }
                                          },
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),
                  ],
                ),
              ),
              // Stable Fixed Bottom "Find Routes" Button
              bottomNavigationBar: Container(
                padding: const EdgeInsets.fromLTRB(18, 12, 18, 16),
                decoration: BoxDecoration(
                  color: isLight ? Colors.white : const Color(0xFF0C131D),
                  border: Border(
                    top: BorderSide(
                      color: isLight
                          ? const Color(0xFFE2E8F0)
                          : const Color(0xFF182232),
                      width: 1.0,
                    ),
                  ),
                ),
                child: SafeArea(
                  top: false,
                  child: SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: () async {
                        if (_fromLocation.trim().isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Please select a starting location',
                              ),
                            ),
                          );
                          _selectFromLocation();
                          return;
                        }
                        if (_toLocation.trim().isEmpty ||
                            _toLocation == 'Select Destination') {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Please select a destination'),
                            ),
                          );
                          _selectToLocation();
                          return;
                        }

                        LatLng effectiveFrom = _fromLatLng;
                        LatLng effectiveEnd = _effectiveEndLocation;
                        if (effectiveEnd.latitude == 0.0 ||
                            effectiveEnd.longitude == 0.0) {
                          final c = await TripService.resolveCoordinates(
                            _effectiveEndLabel,
                          );
                          if (c != null) effectiveEnd = c;
                        }
                        if (!context.mounted) return;

                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => RouteOptionsScreen(
                              fromLocation: _fromLocation,
                              toLocation: _isDoubleRoute ? _effectiveEndLabel : _toLocation,
                              fromLatLng: effectiveFrom,
                              toLatLng: _isDoubleRoute ? effectiveEnd : _toLatLng,
                              preference: _routePreference,
                              avoidTolls: _avoidTolls,
                              avoidHighways: _avoidHighways,
                              vehicle: _selectedVehicle,
                              stops: _effectiveWaypointStops,
                            ),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: isLight ? Colors.white : Colors.black,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(26),
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
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildStopCategoryTile({
    IconData? icon,
    String? svgAsset,
    required Color iconColor,
    required String title,
    required String subtitle,
    required String category,
    required bool isLight,
    required Color primaryColor,
  }) {
    final isAdded = _selectedStops.contains(category);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _toggleStopCategory(category),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 8),
        decoration: BoxDecoration(
          color: isAdded
              ? (isLight
                    ? primaryColor.withValues(alpha: 0.08)
                    : const Color(0xFF0F2538))
              : (isLight ? const Color(0xFFF8FAFC) : const Color(0xFF080E16)),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isAdded
                ? primaryColor
                : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF151E2B)),
            width: isAdded ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: isLight ? 0.14 : 0.16),
                borderRadius: BorderRadius.circular(9),
              ),
              child: Center(
                child: svgAsset != null
                    ? AppIcons.svg(
                        svgAsset,
                        color: iconColor,
                        width: 16,
                        height: 16,
                      )
                    : Icon(icon, color: iconColor, size: 16),
              ),
            ),
            const SizedBox(width: 5),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(
                      title,
                      maxLines: 1,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 11.5,
                        fontWeight: isAdded ? FontWeight.bold : FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: isAdded
                          ? primaryColor
                          : (isLight
                                ? const Color(0xFF64748B)
                                : const Color(0xFF6B7C91)),
                      fontSize: 10,
                      fontWeight: isAdded ? FontWeight.w500 : FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 3),
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: isAdded
                    ? primaryColor
                    : (isLight
                          ? const Color(0xFFE2E8F0)
                          : const Color(0xFF141F2D)),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: isAdded
                    ? const Icon(
                        Icons.check_rounded,
                        color: Colors.white,
                        size: 13,
                      )
                    : AppIcons.svg(
                        AppIcons.plus,
                        color: isLight
                            ? const Color(0xFF64748B)
                            : const Color(0xFF7E8E9F),
                        width: 9,
                        height: 9,
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoutePrefChip({
    required String title,
    required IconData icon,
    required bool isLight,
    required Color primaryColor,
  }) {
    final isSelected = _routePreference == title;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _routePreference = title;
          });
          if (_fromLocation.isNotEmpty && _toLocation.isNotEmpty) {
            _fetchRoute();
          }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 9),
          decoration: BoxDecoration(
            color: isSelected
                ? (isLight ? const Color(0xFFEBF5FF) : const Color(0xFF0A2234))
                : (isLight ? const Color(0xFFF8FAFC) : const Color(0xFF080E16)),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected
                  ? primaryColor
                  : (isLight
                        ? const Color(0xFFE2E8F0)
                        : const Color(0xFF1B283A)),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: isSelected
                    ? primaryColor
                    : (isLight
                          ? const Color(0xFF64748B)
                          : const Color(0xFF7E8E9F)),
                size: 15,
              ),
              const SizedBox(width: 5),
              Text(
                title,
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
      ),
    );
  }
}
