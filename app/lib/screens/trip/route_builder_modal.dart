import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'place_search_modal.dart';
import 'trip_service.dart';

class RouteBuilderResult {
  final String fromLocation;
  final LatLng? fromLatLng;
  final String toLocation;
  final LatLng? toLatLng;
  final List<PlaceSearchResult> stops;
  final bool isDoubleRoute;
  final String duration;
  final String distance;

  RouteBuilderResult({
    required this.fromLocation,
    this.fromLatLng,
    required this.toLocation,
    this.toLatLng,
    required this.stops,
    required this.isDoubleRoute,
    required this.duration,
    required this.distance,
  });
}

/// Inline Route Builder Widget matching 1st screenshot.
/// Renders directly underneath the From/To container in the screen (no separate dialog).
class RouteBuilderInlineWidget extends StatefulWidget {
  final String fromLocation;
  final LatLng? fromLatLng;
  final String toLocation;
  final LatLng? toLatLng;
  final List<PlaceSearchResult> initialStops;
  final bool isDoubleRoute;
  final Map<String, dynamic>? vehicle;
  final Function(List<PlaceSearchResult> stops, bool isDoubleRoute)? onChanged;
  final VoidCallback? onDone;
  final VoidCallback? onClose;

  const RouteBuilderInlineWidget({
    super.key,
    required this.fromLocation,
    this.fromLatLng,
    required this.toLocation,
    this.toLatLng,
    this.initialStops = const [],
    this.isDoubleRoute = false,
    this.vehicle,
    this.onChanged,
    this.onDone,
    this.onClose,
  });

  @override
  State<RouteBuilderInlineWidget> createState() => _RouteBuilderInlineWidgetState();
}

class _RouteBuilderInlineWidgetState extends State<RouteBuilderInlineWidget> {
  late List<PlaceSearchResult> _stops;
  late bool _isDoubleRoute;

  String _durationStr = '--';
  String _distanceStr = '--';
  bool _isCalculating = false;

  @override
  void initState() {
    super.initState();
    _isDoubleRoute = widget.isDoubleRoute;
    _stops = List.from(widget.initialStops);

    // If stops are empty, prefill destination as Stop A (e.g. Ujjain)
    if (_stops.isEmpty && widget.toLocation.isNotEmpty) {
      _stops.add(
        PlaceSearchResult(
          displayName: widget.toLocation,
          lat: widget.toLatLng?.latitude ?? 23.1765,
          lon: widget.toLatLng?.longitude ?? 75.7885,
        ),
      );
    }

    _calculateTripSummary();
  }

  @override
  void didUpdateWidget(covariant RouteBuilderInlineWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.isDoubleRoute != widget.isDoubleRoute) {
      _isDoubleRoute = widget.isDoubleRoute;
      _calculateTripSummary();
    }
  }

  Future<void> _calculateTripSummary() async {
    if (!mounted) return;
    setState(() => _isCalculating = true);

    final start = widget.fromLatLng ?? const LatLng(20.5937, 78.9629);
    final LatLng end;
    final List<LatLng> waypoints;

    if (_isDoubleRoute) {
      end = start;
      waypoints = _stops
          .where((s) => s.lat != 0.0 && s.lon != 0.0)
          .map((s) => LatLng(s.lat, s.lon))
          .toList();
    } else if (_stops.isNotEmpty) {
      end = LatLng(_stops.last.lat, _stops.last.lon);
      waypoints = _stops.length > 1
          ? _stops
              .sublist(0, _stops.length - 1)
              .where((s) => s.lat != 0.0 && s.lon != 0.0)
              .map((s) => LatLng(s.lat, s.lon))
              .toList()
          : <LatLng>[];
    } else {
      end = widget.toLatLng ?? const LatLng(23.1765, 75.7885);
      waypoints = <LatLng>[];
    }

    try {
      final routes = await TripService.getRoutes(
        start: start,
        end: end,
        waypoints: waypoints,
      );

      if (routes.isNotEmpty && mounted) {
        final r = routes.first;
        setState(() {
          _durationStr = TripService.formatDuration(r.durationMinutes);
          _distanceStr = TripService.formatDistance(r.distanceKm);
          _isCalculating = false;
        });
        return;
      }
    } catch (_) {}

    // Fallback: calculate real metrics directly from actual coordinates
    if (mounted) {
      final pts = <LatLng>[start, ...waypoints, end];
      if (pts.length >= 2) {
        final geoKm = TripService.calculatePathDistanceKm(pts);
        final roadKm = geoKm * 1.25;
        final mins = (roadKm / 55.0) * 60.0;

        setState(() {
          _distanceStr = TripService.formatDistance(roadKm);
          _durationStr = TripService.formatDuration(mins);
          _isCalculating = false;
        });
      } else {
        setState(() => _isCalculating = false);
      }
    }
  }

  void _addNewStop() async {
    final result = await PlaceSearchModal.show(
      context,
      title: 'Choose destination / stop',
      currentQuery: '',
      fromLocation: widget.fromLocation,
      toLocation: widget.toLocation,
      fromLatLng: widget.fromLatLng,
      toLatLng: widget.toLatLng,
    );

    if (result != null && mounted) {
      setState(() {
        _stops.add(result);
      });
      widget.onChanged?.call(_stops, _isDoubleRoute);
      _calculateTripSummary();
    }
  }

  void _removeStop(int index) {
    if (index >= 0 && index < _stops.length) {
      setState(() {
        _stops.removeAt(index);
      });
      widget.onChanged?.call(_stops, _isDoubleRoute);
      _calculateTripSummary();
    }
  }

  String _cleanTitle(String text) {
    if (text.isEmpty) return 'Your location';
    final parts = text.split(',');
    return parts.first.trim();
  }

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final cardBg = isLight ? Colors.white : const Color(0xFF101726);
    final borderColor = isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C);
    final textDark = isLight ? const Color(0xFF1E293B) : Colors.white;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 10),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with Back Arrow Button
          Padding(
            padding: const EdgeInsets.only(left: 8, top: 8, bottom: 2, right: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: Icon(
                    Icons.arrow_back_rounded,
                    color: isLight ? Colors.black87 : Colors.white,
                    size: 22,
                  ),
                  onPressed: widget.onClose,
                ),
                Text(
                  'Route Builder',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF475569) : const Color(0xFF94A3B8),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),

          // Route Points List (Screenshot 1 matching)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Column(
              children: [
                // 1. Origin Row (Your location / Indore)
                _buildWaypointRow(
                  leading: _buildLocationDot(),
                  title: _cleanTitle(widget.fromLocation),
                  isBlueText: true,
                  showRemove: false,
                  onRemove: () {},
                ),

                // Connector dots
                _buildConnectorDots(isLight),

                // 2. Intermediate Stops (A, B, C...)
                ..._stops.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final stop = entry.value;
                  final letter = String.fromCharCode(65 + idx); // A, B, C...

                  return Column(
                    children: [
                      _buildWaypointRow(
                        leading: _buildLetterBadge(letter, isLight),
                        title: stop.shortTitle.isNotEmpty
                            ? stop.shortTitle
                            : _cleanTitle(stop.displayName),
                        isBlueText: false,
                        showRemove: true,
                        onRemove: () => _removeStop(idx),
                      ),
                      _buildConnectorDots(isLight),
                    ],
                  );
                }),

                // 3. Return Leg (If Double Route: Your location)
                if (_isDoubleRoute) ...[
                  _buildWaypointRow(
                    leading: _buildLocationDot(),
                    title: _cleanTitle(widget.fromLocation),
                    isBlueText: true,
                    showRemove: true,
                    onRemove: () {
                      setState(() => _isDoubleRoute = false);
                      widget.onChanged?.call(_stops, false);
                      _calculateTripSummary();
                    },
                  ),
                  _buildConnectorDots(isLight),
                ],

                // 4. Destination / Add Next Stop Row
                _buildWaypointRow(
                  leading: const Icon(
                    Icons.location_on,
                    color: Color(0xFFEA4335),
                    size: 22,
                  ),
                  title: 'Choose destination',
                  isBlueText: false,
                  isPlaceholder: true,
                  showRemove: false,
                  onTap: _addNewStop,
                ),
              ],
            ),
          ),

          const SizedBox(height: 2),
          Divider(height: 1, color: borderColor),

          // Bottom Bar: Total trip + Done Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Total trip: 1h 19m (79 km)
                Expanded(
                  child: Text(
                    _isCalculating
                        ? 'Calculating...'
                        : 'Total trip: $_durationStr ($_distanceStr)',
                    style: TextStyle(
                      color: textDark,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.2,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),

                // Done Button
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    widget.onDone?.call();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    child: const Text(
                      'Done',
                      style: TextStyle(
                        color: Color(0xFF00897B), // Teal / Google Maps Green
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
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

  Widget _buildWaypointRow({
    required Widget leading,
    required String title,
    bool isBlueText = false,
    bool isPlaceholder = false,
    bool showRemove = true,
    VoidCallback? onRemove,
    VoidCallback? onTap,
  }) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final primaryTextColor = isBlueText
        ? const Color(0xFF1A73E8)
        : (isPlaceholder
            ? (isLight ? const Color(0xFF5F6368) : const Color(0xFF94A3B8))
            : (isLight ? const Color(0xFF202124) : Colors.white));

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4.0),
        child: Row(
          children: [
            // Left Icon / Badge
            SizedBox(
              width: 28,
              height: 28,
              child: Center(child: leading),
            ),
            const SizedBox(width: 14),

            // Title
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  color: primaryTextColor,
                  fontSize: 15.5,
                  fontWeight: (isBlueText || !isPlaceholder)
                      ? FontWeight.w500
                      : FontWeight.normal,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),

            // Drag Handle (=)
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

            // Remove Button (x)
            if (showRemove)
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
                  onPressed: onRemove,
                ),
              )
            else
              const SizedBox(width: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationDot() {
    return Container(
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
    );
  }

  Widget _buildLetterBadge(String letter, bool isLight) {
    return Container(
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
    );
  }

  Widget _buildConnectorDots(bool isLight) {
    return Padding(
      padding: const EdgeInsets.only(left: 3.0),
      child: Align(
        alignment: Alignment.centerLeft,
        child: SizedBox(
          width: 22,
          child: Center(
            child: Column(
              children: List.generate(
                3,
                (index) => Container(
                  width: 2,
                  height: 2.5,
                  margin: const EdgeInsets.symmetric(vertical: 1.2),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFF9AA0A6)
                        : const Color(0xFF475569),
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Fallback wrapper for dialog modal support if needed.
class RouteBuilderModal {
  static Future<RouteBuilderResult?> show(
    BuildContext context, {
    required String initialFrom,
    LatLng? initialFromLatLng,
    required String initialTo,
    LatLng? initialToLatLng,
    List<PlaceSearchResult> initialStops = const [],
    bool isDoubleRoute = false,
    Map<String, dynamic>? vehicle,
  }) {
    return showDialog<RouteBuilderResult>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.55),
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 24),
        child: RouteBuilderInlineWidget(
          fromLocation: initialFrom,
          fromLatLng: initialFromLatLng,
          toLocation: initialTo,
          toLatLng: initialToLatLng,
          initialStops: initialStops,
          isDoubleRoute: isDoubleRoute,
          vehicle: vehicle,
          onDone: () => Navigator.pop(ctx),
          onClose: () => Navigator.pop(ctx),
        ),
      ),
    );
  }
}
