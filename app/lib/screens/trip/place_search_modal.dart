import 'dart:async';
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../globals.dart';
import '../../services/vehicle_type_service.dart';
import 'trip_service.dart';

class PlaceSearchModal extends StatefulWidget {
  final String title;
  final String currentQuery;
  final Function(PlaceSearchResult)? onSelected;
  final Function(List<PlaceSearchResult>)? onMultiSelected;
  final List<PlaceSearchResult> initialSelected;
  final String? initialCategory;
  final Map<String, dynamic>? vehicle;
  final bool? isEV;
  final String? fromLocation;
  final String? toLocation;
  final LatLng? fromLatLng;
  final LatLng? toLatLng;
  final List<LatLng>? routePoints;

  const PlaceSearchModal({
    super.key,
    required this.title,
    this.currentQuery = '',
    this.onSelected,
    this.onMultiSelected,
    this.initialSelected = const [],
    this.initialCategory,
    this.vehicle,
    this.isEV,
    this.fromLocation,
    this.toLocation,
    this.fromLatLng,
    this.toLatLng,
    this.routePoints,
  });

  /// Single place selection modal (e.g. for Starting point or Destination)
  static Future<PlaceSearchResult?> show(
    BuildContext context, {
    required String title,
    required String currentQuery,
    String? initialCategory,
    Map<String, dynamic>? vehicle,
    bool? isEV,
    String? fromLocation,
    String? toLocation,
    LatLng? fromLatLng,
    LatLng? toLatLng,
    List<LatLng>? routePoints,
  }) {
    final isLight = AppTheme.isLightNotifier.value;

    return showModalBottomSheet<PlaceSearchResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0C131D),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => PlaceSearchModal(
        title: title,
        currentQuery: currentQuery,
        initialCategory: initialCategory,
        vehicle: vehicle,
        isEV: isEV,
        fromLocation: fromLocation,
        toLocation: toLocation,
        fromLatLng: fromLatLng,
        toLatLng: toLatLng,
        routePoints: routePoints,
        onSelected: (result) => Navigator.pop(context, result),
      ),
    );
  }

  /// Multi-stop selection modal (e.g. choose multiple stops like Fuel, Food, EV along route)
  static Future<List<PlaceSearchResult>?> showMulti(
    BuildContext context, {
    required String title,
    List<PlaceSearchResult> initialSelected = const [],
    String? initialCategory,
    Map<String, dynamic>? vehicle,
    bool? isEV,
    String? fromLocation,
    String? toLocation,
    LatLng? fromLatLng,
    LatLng? toLatLng,
    List<LatLng>? routePoints,
  }) {
    final isLight = AppTheme.isLightNotifier.value;

    return showModalBottomSheet<List<PlaceSearchResult>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0C131D),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => PlaceSearchModal(
        title: title,
        initialSelected: initialSelected,
        initialCategory: initialCategory,
        vehicle: vehicle,
        isEV: isEV,
        fromLocation: fromLocation,
        toLocation: toLocation,
        fromLatLng: fromLatLng,
        toLatLng: toLatLng,
        routePoints: routePoints,
        onMultiSelected: (results) => Navigator.pop(context, results),
      ),
    );
  }

  @override
  State<PlaceSearchModal> createState() => _PlaceSearchModalState();
}

class _PlaceSearchModalState extends State<PlaceSearchModal> {
  late TextEditingController _searchController;
  Timer? _debounceTimer;
  List<PlaceSearchResult> _results = [];
  bool _isLoading = false;
  bool _isGettingLocation = false;
  String? _selectedCategory;
  late List<PlaceSearchResult> _selectedStops;

  bool get _isMultiMode => widget.onMultiSelected != null;
  bool get _isStopMode {
    if (_isMultiMode) return true;
    if (widget.initialCategory != null && widget.initialCategory!.isNotEmpty) return true;
    final t = widget.title.toLowerCase().trim();
    if (t.contains('start') || t.contains('starting point') || t.contains('from')) {
      return false;
    }
    if (t == 'select destination' || t == 'destination' || t == 'choose destination') {
      return false;
    }
    if (t.contains('stop') ||
        t.contains('find') ||
        t.contains('fuel') ||
        t.contains('pump') ||
        t.contains('ev') ||
        t.contains('charging') ||
        t.contains('cng') ||
        t.contains('restaurant') ||
        t.contains('dhaba') ||
        t.contains('food') ||
        t.contains('hotel') ||
        t.contains('stay') ||
        t.contains('emergency') ||
        t.contains('atm') ||
        t.contains('along route') ||
        t.contains('route')) {
      return true;
    }
    return false;
  }

  bool get _hasRoute {
    final toLoc = widget.toLocation?.trim() ?? '';
    final hasValidToText = toLoc.isNotEmpty &&
        toLoc.toLowerCase() != 'select destination' &&
        toLoc.toLowerCase() != 'destination' &&
        toLoc.toLowerCase() != 'enter destination';
    final hasValidToCoord = widget.toLatLng != null &&
        widget.toLatLng!.latitude != 0.0 &&
        widget.toLatLng!.longitude != 0.0;
    return hasValidToText || hasValidToCoord;
  }

  String get _fuelType {
    final veh = widget.vehicle;
    final serverType = (veh?['type'] ?? veh?['fuel'])?.toString().trim();
    if (serverType != null &&
        serverType.isNotEmpty &&
        serverType.toUpperCase() != 'PETROL') {
      final upper = serverType.toUpperCase();
      if (upper == 'ELECTRIC' || upper == 'EV') return 'EV';
      if (upper == 'DIESEL') return 'Diesel';
      if (upper == 'CNG') return 'CNG';
      if (upper == 'HYBRID') return 'Hybrid';
      return serverType;
    }
    final name = (veh?['name'] ?? veh?['model'] ?? Globals.vehicleModel).toString().trim();
    if (name.isNotEmpty) {
      return VehicleTypeService.detectFuelType(name);
    }
    return 'Petrol';
  }

  bool get _isElectricVehicle {
    if (widget.isEV != null) return widget.isEV!;
    return _fuelType.toUpperCase() == 'EV' || _fuelType.toUpperCase() == 'ELECTRIC';
  }

  bool get _isCNGVehicle => _fuelType.toUpperCase() == 'CNG';

  List<Map<String, dynamic>> get _availableCategories {
    if (_isElectricVehicle) {
      return _stopCategories.where((c) => c['id'] != 'fuel' && c['id'] != 'cng').toList();
    } else if (_isCNGVehicle) {
      return _stopCategories.where((c) => c['id'] != 'ev').toList();
    } else {
      return _stopCategories.where((c) => c['id'] != 'ev' && c['id'] != 'cng').toList();
    }
  }

  static final List<Map<String, dynamic>> _stopCategories = [
    {
      'id': 'fuel',
      'name': 'Fuel / Petrol',
      'query': 'Petrol Pump',
      'icon': Icons.local_gas_station_rounded,
      'color': const Color(0xFF10B981),
    },
    {
      'id': 'cng',
      'name': 'CNG Station',
      'query': 'CNG Station',
      'icon': Icons.local_gas_station_rounded,
      'color': const Color(0xFF0EA5E9),
    },
    {
      'id': 'ev',
      'name': 'EV Charging',
      'query': 'EV Charging Station',
      'icon': Icons.ev_station_rounded,
      'color': const Color(0xFF0284C7),
    },
    {
      'id': 'food',
      'name': 'Food & Dhaba',
      'query': 'Restaurant Dhaba',
      'icon': Icons.restaurant_rounded,
      'color': const Color(0xFFF59E0B),
    },
    {
      'id': 'hotel',
      'name': 'Hotels & Stay',
      'query': 'Hotel Highway Lodge',
      'icon': Icons.hotel_rounded,
      'color': const Color(0xFF8B5CF6),
    },
    {
      'id': 'rest',
      'name': 'Rest Stops',
      'query': 'Rest Area Washroom',
      'icon': Icons.local_cafe_rounded,
      'color': const Color(0xFF0D9488),
    },
    {
      'id': 'emergency',
      'name': 'Emergency',
      'query': 'Hospital Medical Emergency',
      'icon': Icons.emergency_rounded,
      'color': const Color(0xFFEF4444),
    },
    {
      'id': 'atm',
      'name': 'ATM / Cash',
      'query': 'ATM Bank',
      'icon': Icons.atm_rounded,
      'color': const Color(0xFF6366F1),
    },
  ];

  @override
  void initState() {
    super.initState();
    _selectedStops = List.from(widget.initialSelected);

    if (widget.initialCategory != null && widget.initialCategory!.isNotEmpty) {
      var cat = widget.initialCategory!;
      if (!_isElectricVehicle && cat == 'ev') cat = _isCNGVehicle ? 'cng' : 'fuel';
      if (_isElectricVehicle && (cat == 'fuel' || cat == 'cng')) cat = 'ev';
      _selectedCategory = cat;
    } else {
      _selectedCategory = null; // Auto-select removed - categories start completely unselected
    }

    final isPlaceholder = widget.currentQuery == 'Current Location' ||
        widget.currentQuery == 'Select Destination' ||
        widget.currentQuery.trim().isEmpty;

    final initialText = isPlaceholder ? '' : widget.currentQuery;
    _searchController = TextEditingController(text: initialText);
    _searchController.addListener(_onSearchInputChanged);

    if (initialText.trim().length >= 2) {
      _performSearch(initialText);
    } else if (_isStopMode && _hasRoute) {
      _performSearch(_selectedCategory ?? 'fuel');
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.removeListener(_onSearchInputChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchInputChanged() {
    _debounceTimer?.cancel();
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      setState(() {
        _results = [];
        _isLoading = false;
      });
      return;
    }

    if (query.length >= 2) {
      setState(() => _isLoading = true);
      _debounceTimer = Timer(const Duration(milliseconds: 450), () {
        _performSearch(query);
      });
    }
  }

  Future<void> _performSearch(String query) async {
    final cleanQuery = query.trim();
    if (cleanQuery.isEmpty) return;

    if (_isStopMode && !_hasRoute) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFFEF4444),
            content: Text('1st select route (Please choose destination first)'),
            duration: Duration(seconds: 2),
          ),
        );
      }
      return;
    }

    setState(() => _isLoading = true);

    List<PlaceSearchResult> results;
    if (_isStopMode && _hasRoute) {
      results = await TripService.searchStopsAlongRoute(
        query: cleanQuery,
        categoryId: _selectedCategory,
        fromLocation: widget.fromLocation,
        toLocation: widget.toLocation,
        fromLatLng: widget.fromLatLng,
        toLatLng: widget.toLatLng,
        routePoints: widget.routePoints,
      );
    } else {
      results = await TripService.searchPlaces(cleanQuery);
    }

    if (mounted) {
      setState(() {
        _results = results;
        _isLoading = false;
      });
    }
  }

  bool _isStopSelected(PlaceSearchResult stop) {
    return _selectedStops.any((s) =>
        s.displayName == stop.displayName ||
        (s.shortTitle == stop.shortTitle && (s.lat - stop.lat).abs() < 0.001));
  }

  Future<void> _handleSelectStop(PlaceSearchResult stop) async {
    if (_isMultiMode) {
      setState(() {
        final idx = _selectedStops.indexWhere((s) =>
            s.displayName == stop.displayName ||
            (s.shortTitle == stop.shortTitle && (s.lat - stop.lat).abs() < 0.001));
        if (idx >= 0) {
          _selectedStops.removeAt(idx);
        } else {
          _selectedStops.add(stop);
        }
      });

      // Asynchronously resolve coordinates if stop has 0.0 coordinates
      if (stop.lat == 0.0 || stop.lon == 0.0) {
        final coords = await TripService.resolveCoordinates(stop.displayName);
        if (coords != null && coords.latitude != 0.0 && mounted) {
          setState(() {
            final pos = _selectedStops.indexWhere(
              (s) => s.displayName == stop.displayName || s.shortTitle == stop.shortTitle,
            );
            if (pos >= 0) {
              _selectedStops[pos] = PlaceSearchResult(
                displayName: stop.displayName,
                lat: coords.latitude,
                lon: coords.longitude,
                category: stop.category,
              );
            }
          });
        }
      }
    } else {
      PlaceSearchResult finalStop = stop;
      if (stop.lat == 0.0 || stop.lon == 0.0) {
        setState(() => _isLoading = true);
        final coords = await TripService.resolveCoordinates(stop.displayName);
        if (mounted) setState(() => _isLoading = false);
        if (coords != null && coords.latitude != 0.0) {
          finalStop = PlaceSearchResult(
            displayName: stop.displayName,
            lat: coords.latitude,
            lon: coords.longitude,
            category: stop.category,
          );
        }
      }
      widget.onSelected?.call(finalStop);
    }
  }

  Future<void> _useCurrentLocation() async {
    setState(() => _isGettingLocation = true);
    try {
      final pos = await TripService.getCurrentLocation();
      if (pos != null) {
        String name = await TripService.reverseGeocode(pos.latitude, pos.longitude);
        if (name.trim().isEmpty || name.startsWith('Location (')) {
          name = 'Current Location';
        }
        final result = PlaceSearchResult(
          displayName: name,
          lat: pos.latitude,
          lon: pos.longitude,
        );
        if (mounted) {
          _handleSelectStop(result);
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: Color(0xFF1E293B),
              content: Text('GPS permission not allowed. Please select your city from the list below.'),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF1E293B),
            content: Text('Location error: $e'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isGettingLocation = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final screenHeight = MediaQuery.of(context).size.height;

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final primaryColor = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF);

        return Container(
          constraints: BoxConstraints(maxHeight: screenHeight * 0.88),
          padding: EdgeInsets.only(
            left: 18,
            right: 18,
            top: 16,
            bottom: bottomInset + (_isMultiMode ? 4 : 12),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Header Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.title,
                        style: TextStyle(
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (_isMultiMode)
                        Text(
                          'Select one or multiple stops to add to your trip',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF64748B) : const Color(0xFF7E8E9F),
                            fontSize: 11.5,
                          ),
                        ),
                    ],
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.close_rounded,
                      color: isLight ? const Color(0xFF64748B) : Colors.white70,
                    ),
                    onPressed: () {
                      if (_isMultiMode) {
                        Navigator.pop(context, _selectedStops);
                      } else {
                        Navigator.pop(context);
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Search Field
              TextField(
                controller: _searchController,
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                ),
                autofocus: !_isMultiMode,
                textInputAction: TextInputAction.search,
                onSubmitted: _performSearch,
                decoration: InputDecoration(
                  hintText: 'Search city, stop, fuel, food or landmark...',
                  hintStyle: TextStyle(
                    color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF6B7C91),
                  ),
                  filled: true,
                  fillColor: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF131D2A),
                  prefixIcon: Icon(Icons.search_rounded, color: primaryColor),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: Icon(
                            Icons.clear,
                            color: isLight ? const Color(0xFF64748B) : Colors.white60,
                          ),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _results = []);
                          },
                        )
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D3E),
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D3E),
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: primaryColor),
                  ),
                ),
              ),
              const SizedBox(height: 8),

              // "Use Current Location" button (Geolocator) - only for Starting point or Destination
              if (!_isStopMode) ...[
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: isLight
                          ? const Color(0xFFEFF6FF)
                          : const Color(0xFF00C2FF).withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: _isGettingLocation
                        ? Padding(
                            padding: const EdgeInsets.all(10),
                            child: CircularProgressIndicator(strokeWidth: 2, color: primaryColor),
                          )
                        : Icon(Icons.my_location_rounded, color: primaryColor, size: 20),
                  ),
                  title: Text(
                    'Use My Current Location',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  subtitle: Text(
                    'Using GPS device location',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF6B7C91),
                      fontSize: 11,
                    ),
                  ),
                  onTap: _isGettingLocation ? null : _useCurrentLocation,
                ),
                Divider(
                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D3E),
                ),
              ] else ...[
                const SizedBox(height: 6),
              ],

              // In stop mode: Category Chips are always visible above results
              if (_isStopMode) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Choose Stops by Category',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF6B7C91),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      _isElectricVehicle
                          ? 'EV, Food, Hotels, Rest'
                          : (_isCNGVehicle
                              ? 'CNG, Food, Hotels, Rest'
                              : (_fuelType.toUpperCase() == 'DIESEL'
                                  ? 'Diesel, Food, Hotels, Rest'
                                  : 'Fuel, Food, Hotels, Rest')),
                      style: TextStyle(
                        color: primaryColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: _availableCategories.map((cat) {
                      final isSelected = _selectedCategory == cat['id'];
                      final catColor = cat['color'] as Color;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: InkWell(
                          onTap: () {
                            if (!_hasRoute) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  backgroundColor: Color(0xFFEF4444),
                                  content: Text('1st select route (Please choose destination first)'),
                                  duration: Duration(seconds: 2),
                                ),
                              );
                              return;
                            }
                            final catId = cat['id'] as String;
                            if (_selectedCategory == catId) {
                              setState(() {
                                _selectedCategory = null;
                                _results = [];
                              });
                              _searchController.clear();
                              return;
                            }
                            setState(() {
                              _selectedCategory = catId;
                            });
                            final q = (cat['query'] as String?) ?? (cat['name'] as String);
                            _searchController.text = q;
                            _performSearch(q);
                          },
                          borderRadius: BorderRadius.circular(20),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? catColor.withValues(alpha: 0.16)
                                  : (isLight ? const Color(0xFFF1F5F9) : const Color(0xFF131D2A)),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isSelected
                                    ? catColor
                                    : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D3E)),
                                width: isSelected ? 1.5 : 1.0,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  cat['icon'] as IconData,
                                  size: 15,
                                  color: isSelected ? catColor : (isLight ? const Color(0xFF64748B) : Colors.white70),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  cat['name'] as String,
                                  style: TextStyle(
                                    color: isSelected
                                        ? (isLight ? const Color(0xFF0F172A) : Colors.white)
                                        : (isLight ? const Color(0xFF475569) : Colors.white70),
                                    fontSize: 12.5,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 10),
              ],

              // Search results or Category Presets
              if (_isLoading)
                Expanded(
                  child: Center(
                    child: AppLoadingSpinner(
                      size: 70,
                      primaryColor: primaryColor,
                    ),
                  ),
                )
              else if (_isStopMode && !_hasRoute)
                Expanded(
                  child: Center(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      child: Container(
                        width: double.infinity,
                        margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
                        padding: const EdgeInsets.all(22),
                        decoration: BoxDecoration(
                          color: isLight ? const Color(0xFFFEF2F2) : const Color(0xFF1E1418),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isLight ? const Color(0xFFFECACA) : const Color(0xFF831843),
                            width: 1.2,
                          ),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 54,
                              height: 54,
                              decoration: BoxDecoration(
                                color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.alt_route_rounded,
                                color: Color(0xFFEF4444),
                                size: 28,
                              ),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              '1st Select Route',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 17.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Please select your starting point and destination first.\nStops can only be searched along an active route.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                fontSize: 12.5,
                                height: 1.45,
                              ),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                              label: const Text('Set Destination First'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFEF4444),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              onPressed: () => Navigator.pop(context),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                )
              else if (_results.isEmpty)
                Expanded(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _searchController.text.trim().isEmpty
                                ? (_isStopMode ? Icons.touch_app_outlined : Icons.search_rounded)
                                : Icons.location_off_outlined,
                            size: 44,
                            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _searchController.text.trim().isEmpty
                                ? (_isStopMode
                                    ? 'Tap a category above or search to find real stops along your route.'
                                    : 'Search for a city, landmark, or address.')
                                : (_isStopMode
                                    ? 'No matching stops found along this route corridor.'
                                    : 'No matching locations found.'),
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF7E8E9F),
                              fontSize: 13,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              else
                Expanded(
                  child: ListView.separated(
                    physics: const BouncingScrollPhysics(),
                    itemCount: _results.length,
                    separatorBuilder: (_, _) => Divider(
                      color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF152230),
                      height: 1,
                    ),
                    itemBuilder: (context, index) {
                      final item = _results[index];
                      final isSelected = _isStopSelected(item);

                      // Determine icon & color based on category/name
                      IconData itemIcon = Icons.location_on_outlined;
                      Color itemColor = primaryColor;
                      final cLower = (item.category ?? '').toLowerCase();
                      final tLower = item.shortTitle.toLowerCase();
                      if (cLower == 'fuel' || tLower.contains('petrol') || tLower.contains('fuel') || tLower.contains('diesel') || tLower.contains('pump')) {
                        itemIcon = Icons.local_gas_station_rounded;
                        itemColor = const Color(0xFF10B981);
                      } else if (cLower == 'cng' || tLower.contains('cng')) {
                        itemIcon = Icons.local_gas_station_rounded;
                        itemColor = const Color(0xFF0EA5E9);
                      } else if (cLower == 'ev' || tLower.contains('ev') || tLower.contains('charging')) {
                        itemIcon = Icons.ev_station_rounded;
                        itemColor = const Color(0xFF0284C7);
                      } else if (cLower == 'food' || cLower == 'restaurant' || tLower.contains('dhaba') || tLower.contains('restaurant')) {
                        itemIcon = Icons.restaurant_rounded;
                        itemColor = const Color(0xFFF59E0B);
                      } else if (cLower == 'hotel' || tLower.contains('hotel') || tLower.contains('resort')) {
                        itemIcon = Icons.hotel_rounded;
                        itemColor = const Color(0xFF8B5CF6);
                      } else if (cLower == 'atm' || tLower.contains('atm')) {
                        itemIcon = Icons.atm_rounded;
                        itemColor = const Color(0xFF6366F1);
                      } else if (cLower == 'rest' || tLower.contains('rest') || tLower.contains('washroom')) {
                        itemIcon = Icons.local_cafe_rounded;
                        itemColor = const Color(0xFF0D9488);
                      } else if (cLower == 'emergency' || tLower.contains('hospital') || tLower.contains('trauma')) {
                        itemIcon = Icons.emergency_rounded;
                        itemColor = const Color(0xFFEF4444);
                      }

                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        leading: Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: isSelected
                                ? primaryColor.withValues(alpha: 0.2)
                                : itemColor.withValues(alpha: 0.12),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isSelected ? Icons.check_circle_rounded : itemIcon,
                            color: isSelected ? primaryColor : itemColor,
                            size: 18,
                          ),
                        ),
                        title: Text(
                          item.shortTitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: isSelected
                                ? primaryColor
                                : (isLight ? const Color(0xFF0F172A) : Colors.white),
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        subtitle: item.subtitle.isNotEmpty
                            ? Text(
                                item.subtitle,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF7E8E9F),
                                  fontSize: 11.5,
                                ),
                              )
                            : null,
                        trailing: _isMultiMode
                            ? Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: isSelected ? primaryColor : primaryColor.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  isSelected ? 'Selected' : '+ Add',
                                  style: TextStyle(
                                    color: isSelected
                                        ? (isLight ? Colors.white : Colors.black)
                                        : primaryColor,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              )
                            : null,
                        onTap: () => _handleSelectStop(item),
                      );
                    },
                  ),
                ),

              // Bottom Confirmation Bar for Multi-Select Mode
              if (_isMultiMode) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF101726),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _selectedStops.isEmpty
                                  ? 'No stops chosen yet'
                                  : '${_selectedStops.length} ${_selectedStops.length == 1 ? "Stop" : "Stops"} Selected',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13.5,
                              ),
                            ),
                            const SizedBox(height: 1),
                            Text(
                              _selectedStops.isEmpty
                                  ? 'Tap stops or categories above to select multiple'
                                  : _selectedStops.map((s) => s.shortTitle).join(', '),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: _selectedStops.isEmpty
                                    ? (isLight ? const Color(0xFF64748B) : const Color(0xFF7E8E9F))
                                    : primaryColor,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      ElevatedButton(
                        onPressed: () async {
                          final resolvedList = <PlaceSearchResult>[];
                          for (final stop in _selectedStops) {
                            if (stop.lat == 0.0 || stop.lon == 0.0) {
                              final c = await TripService.resolveCoordinates(stop.displayName);
                              if (c != null && c.latitude != 0.0) {
                                resolvedList.add(PlaceSearchResult(
                                  displayName: stop.displayName,
                                  lat: c.latitude,
                                  lon: c.longitude,
                                  category: stop.category,
                                ));
                                continue;
                              }
                            }
                            resolvedList.add(stop);
                          }
                          widget.onMultiSelected?.call(resolvedList);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryColor,
                          foregroundColor: isLight ? Colors.white : Colors.black,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(
                          _selectedStops.isEmpty ? 'Done' : 'Add ${_selectedStops.length} Stops',
                          style: TextStyle(
                            color: isLight ? Colors.white : Colors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
