import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart' hide Path;
import 'package:mappls_gl/mappls_gl.dart' as mappls;

import '../../theme/app_theme.dart';
import 'trip_completed_screen.dart';
import 'trip_service.dart';
import 'interactive_trip_map.dart';
import 'plan_trip_screen.dart';
import 'trips_screen.dart';
import '../bottom_navigation_screen.dart';
import '../../utils/app_icons.dart';
import '../../widgets/animated_back_arrow.dart';

/// Screen 5 / Tab 1: Active Trip screen matching Screenshot 3 ("No Active Trip" State)
/// and live navigation view when actively navigating.
class ActiveTripScreen extends StatefulWidget {
  final bool isNavigating;
  final String? tripId;
  final String? startedAt;
  final String fromLocation;
  final String toLocation;
  final LatLng fromLatLng;
  final LatLng toLatLng;
  final String duration;
  final String distance;
  final String viaRoute;
  final List<LatLng> routePoints;
  final Map<String, dynamic>? vehicle;
  final String? fuelEstimate;
  final List<PlaceSearchResult> stops;
  final List<RouteStep>? steps;

  const ActiveTripScreen({
    super.key,
    this.isNavigating = true,
    this.tripId,
    this.startedAt,
    this.fromLocation = 'Current Location',
    this.toLocation = '',
    this.fromLatLng = const LatLng(20.5937, 78.9629),
    this.toLatLng = const LatLng(0.0, 0.0),
    this.duration = '--',
    this.distance = '--',
    this.viaRoute = 'via Highway',
    this.routePoints = const [],
    this.vehicle,
    this.fuelEstimate,
    this.stops = const [],
    this.steps,
  });

  @override
  State<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends State<ActiveTripScreen> {
  bool _isEnding = false;
  late List<PlaceSearchResult> _stops;
  late List<LatLng> _routePoints;
  late List<RouteStep> _steps;
  late final MapController _mapController;
  LatLng? _currentLocation;
  double _currentHeading = 0.0;
  StreamSubscription<Position>? _positionStreamSub;

  // Live Turn-by-Turn Navigation State
  int _currentStepIndex = 0;
  double _distanceToNextStep = 450.0;
  bool _isSimulating = false;
  final int _simulationSpeedMultiplier = 2; // 1x, 2x, 5x
  Timer? _simulationTimer;
  int _routePolylineIndex = 0;
  double _remainingDistanceKm = 0.0;
  int _remainingDurationMins = 0;
  PlaceSearchResult? _approachingStop;
  bool _arrivedAtDestination = false;
  late LatLng _effectiveFromLatLng;
  late LatLng _effectiveToLatLng;
  mappls.MapplsMapController? _mapplsController;

  bool get _isTwoWheeler {
    final name = (widget.vehicle?['name'] ?? widget.vehicle?['model'] ?? '').toString().toLowerCase();
    final type = (widget.vehicle?['type'] ?? widget.vehicle?['vehicleType'] ?? '').toString().toLowerCase();
    return type.contains('bike') ||
        type.contains('scooter') ||
        type.contains('two') ||
        name.contains('iqube') ||
        name.contains('activa') ||
        name.contains('jupiter') ||
        name.contains('access') ||
        name.contains('pulsar') ||
        name.contains('splendor') ||
        name.contains('chetak') ||
        name.contains('ather') ||
        name.contains('ola') ||
        name.contains('bike') ||
        name.contains('motorcycle') ||
        name.contains('scooter');
  }

  @override
  void initState() {
    super.initState();
    _stops = List.from(widget.stops);
    _routePoints = List.from(widget.routePoints);
    _steps = List.from(widget.steps ?? []);
    _mapController = MapController();

    final wFrom = widget.fromLatLng;
    final wTo = widget.toLatLng;
    _effectiveFromLatLng = (wFrom.latitude != 0.0 && wFrom.longitude != 0.0)
        ? wFrom
        : (_routePoints.isNotEmpty ? _routePoints.first : const LatLng(20.5937, 78.9629));
    _effectiveToLatLng = (wTo.latitude != 0.0 && wTo.longitude != 0.0)
        ? wTo
        : (_routePoints.isNotEmpty ? _routePoints.last : const LatLng(23.1765, 75.7885));

    _currentLocation = _effectiveFromLatLng;
    _remainingDistanceKm = _totalDistanceKm;
    _remainingDurationMins = _parseTotalMinutes(widget.duration);

    if (wFrom.latitude == 0.0 || wFrom.longitude == 0.0 || wTo.latitude == 0.0 || wTo.longitude == 0.0) {
      _resolveMissingCoordinates();
    } else {
      if (_steps.isEmpty) {
        _steps = [
          RouteStep(
            instruction: 'Head north on ${widget.viaRoute.isNotEmpty ? widget.viaRoute : 'E 17th Ave'} toward ${widget.toLocation.split(',').first}',
            roadName: widget.viaRoute.isNotEmpty ? widget.viaRoute : 'E 17th Ave',
            maneuverType: 'straight',
            modifier: 'straight',
            distanceMeters: 450,
            durationSeconds: 120,
            location: _effectiveFromLatLng,
          ),
          RouteStep(
            instruction: 'Turn right toward ${widget.toLocation.split(',').first}',
            roadName: widget.viaRoute.isNotEmpty ? widget.viaRoute : 'Victor St',
            maneuverType: 'turn',
            modifier: 'right',
            distanceMeters: 300,
            durationSeconds: 80,
            location: LatLng(_effectiveFromLatLng.latitude + 0.003, _effectiveFromLatLng.longitude + 0.003),
          ),
          RouteStep(
            instruction: 'Continue toward destination',
            roadName: widget.toLocation.split(',').first,
            maneuverType: 'turn',
            modifier: 'left',
            distanceMeters: 550,
            durationSeconds: 150,
            location: LatLng(_effectiveFromLatLng.latitude + 0.006, _effectiveFromLatLng.longitude + 0.006),
          ),
          RouteStep(
            instruction: 'Your destination is on seen right. Have a good day!',
            roadName: widget.toLocation,
            maneuverType: 'arrive',
            modifier: 'right',
            distanceMeters: 50,
            durationSeconds: 20,
            location: _effectiveToLatLng,
          ),
        ];
        _distanceToNextStep = 450.0;
        _loadSteps();
      } else {
        _distanceToNextStep = _steps.first.distanceMeters > 0 ? _steps.first.distanceMeters : 450.0;
      }

      if (_routePoints.isEmpty) {
        const count = 35;
        for (int i = 0; i <= count; i++) {
          final t = i / count;
          final curve = math.sin(t * math.pi) * 0.0035;
          final lat = _effectiveFromLatLng.latitude + (_effectiveToLatLng.latitude - _effectiveFromLatLng.latitude) * t + curve;
          final lng = _effectiveFromLatLng.longitude + (_effectiveToLatLng.longitude - _effectiveFromLatLng.longitude) * t + (curve * 0.4);
          _routePoints.add(LatLng(lat, lng));
        }
      }
    }

    if (_stops.isNotEmpty) {
      _recalculateRouteWithStops();
    }
    _initLiveTracking();

    // Auto-start drive simulation matching video when entering navigation (after overview & fly-in intro completes)
    if (widget.isNavigating) {
      Future.delayed(const Duration(milliseconds: 3200), () {
        if (mounted && !_isSimulating) {
          _isSimulating = true;
          _startSimulation();
        }
      });
    }
  }

  Future<void> _resolveMissingCoordinates() async {
    bool updated = false;
    LatLng from = _effectiveFromLatLng;
    LatLng to = _effectiveToLatLng;

    if (widget.fromLatLng.latitude == 0.0 || widget.fromLatLng.longitude == 0.0) {
      final res = await TripService.resolveCoordinates(widget.fromLocation);
      if (res != null) {
        from = res;
        updated = true;
      }
    }
    if (widget.toLatLng.latitude == 0.0 || widget.toLatLng.longitude == 0.0) {
      final res = await TripService.resolveCoordinates(widget.toLocation);
      if (res != null) {
        to = res;
        updated = true;
      }
    }

    if (updated && mounted) {
      setState(() {
        _effectiveFromLatLng = from;
        _effectiveToLatLng = to;
        _currentLocation = from;
      });
      _loadSteps();
    }
  }

  @override
  void dispose() {
    _simulationTimer?.cancel();
    _positionStreamSub?.cancel();
    super.dispose();
  }

  void _loadSteps() async {
    try {
      final routes = await TripService.getRoutes(
        start: _effectiveFromLatLng,
        end: _effectiveToLatLng,
        waypoints: _stops.where((s) => s.lat != 0.0 && s.lon != 0.0).map((s) => LatLng(s.lat, s.lon)).toList(),
      );
      if (routes.isNotEmpty && mounted) {
        setState(() {
          _steps = routes.first.steps;
          if (_routePoints.isEmpty || _routePoints.length < 2) {
            _routePoints = routes.first.points;
            _remainingDistanceKm = _totalDistanceKm;
          }
          if (_steps.isNotEmpty) {
            _distanceToNextStep = _steps.first.distanceMeters > 0 ? _steps.first.distanceMeters : 450.0;
          }
        });
      }
    } catch (_) {}
  }

  void _initLiveTracking() async {
    try {
      final pos = await TripService.getCurrentLocation();
      if (pos != null && mounted) {
        setState(() {
          _currentLocation = LatLng(pos.latitude, pos.longitude);
          _currentHeading = pos.heading;
        });
      }
      _positionStreamSub = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10,
        ),
      ).listen(
        (pos) {
          if (!mounted || _isSimulating) return;
          _updateNavigationProgress(
            LatLng(pos.latitude, pos.longitude),
            pos.heading,
          );
        },
        onError: (err) {
          debugPrint('[ActiveTripScreen] GPS position stream: $err');
        },
      );
    } catch (_) {}
  }

  void _updateNavigationProgress(LatLng newLoc, double heading) {
    if (!mounted) return;
    setState(() {
      _currentLocation = newLoc;
      if (heading != 0.0) _currentHeading = heading;

      // Recalculate remaining distance along remaining route points
      if (_routePoints.isNotEmpty) {
        int closestIdx = 0;
        double minDist = double.infinity;
        for (int i = 0; i < _routePoints.length; i++) {
          final d = const Distance().as(LengthUnit.Meter, newLoc, _routePoints[i]);
          if (d < minDist) {
            minDist = d;
            closestIdx = i;
          }
        }
        final progress = closestIdx / (_routePoints.length > 1 ? _routePoints.length - 1 : 1);
        _remainingDistanceKm = (_totalDistanceKm * (1.0 - progress)).clamp(0.0, _totalDistanceKm);
        final totalMins = _parseTotalMinutes(widget.duration);
        _remainingDurationMins = (totalMins * (1.0 - progress)).round().clamp(0, totalMins);
      }

      // Turn maneuvers countdown & auto-advance
      if (_steps.isNotEmpty && _currentStepIndex < _steps.length) {
        final targetStepLoc = _steps[_currentStepIndex].location;
        final distToStep = const Distance().as(LengthUnit.Meter, newLoc, targetStepLoc);
        _distanceToNextStep = distToStep.toDouble();
        if (distToStep < 60 && _currentStepIndex < _steps.length - 1) {
          _currentStepIndex++;
        }
      }

      // Check approaching stops along route
      for (final stop in _stops) {
        if (stop.lat != 0.0 && stop.lon != 0.0) {
          final distToStop = const Distance().as(LengthUnit.Meter, newLoc, LatLng(stop.lat, stop.lon));
          if (distToStop < 650 && _approachingStop != stop) {
            _approachingStop = stop;
            break;
          }
        }
      }
    });

    try {
      _mapController.move(newLoc, 16.2);
    } catch (_) {}
  }

  void _recalculateRouteWithStops() async {
    final validStops = _stops.where((s) => s.lat != 0.0 && s.lon != 0.0).toList();
    if (validStops.isEmpty) return;
    try {
      final routes = await TripService.getRoutes(
        start: _effectiveFromLatLng,
        end: _effectiveToLatLng,
        waypoints: validStops.map((s) => LatLng(s.lat, s.lon)).toList(),
      );
      if (routes.isNotEmpty && mounted) {
        setState(() {
          _routePoints = routes.first.points;
          if (routes.first.steps.isNotEmpty) {
            _steps = routes.first.steps;
            _currentStepIndex = 0;
            _distanceToNextStep = _steps.first.distanceMeters > 0 ? _steps.first.distanceMeters : 450.0;
          }
        });
      }
    } catch (_) {}
  }

  double _calculateBearing(LatLng start, LatLng end) {
    final lat1 = start.latitude * (math.pi / 180.0);
    final lon1 = start.longitude * (math.pi / 180.0);
    final lat2 = end.latitude * (math.pi / 180.0);
    final lon2 = end.longitude * (math.pi / 180.0);
    final dLon = lon2 - lon1;
    final y = math.sin(dLon) * math.cos(lat2);
    final x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dLon);
    final rad = math.atan2(y, x);
    final deg = rad * (180.0 / math.pi);
    return (deg + 360.0) % 360.0;
  }


  void _startSimulation() {
    _simulationTimer?.cancel();
    _simulationTimer = Timer.periodic(const Duration(milliseconds: 700), (timer) {
      if (!mounted || _routePoints.isEmpty) {
        timer.cancel();
        return;
      }

      if (_routePolylineIndex >= _routePoints.length - 1) {
        timer.cancel();
        setState(() {
          _isSimulating = false;
          _arrivedAtDestination = true;
          _remainingDistanceKm = 0.0;
          _remainingDurationMins = 0;
        });
        _showArrivalModal();
        return;
      }

      final stepIncrement = 1 * _simulationSpeedMultiplier;
      final nextIdx = (_routePolylineIndex + stepIncrement).clamp(0, _routePoints.length - 1);
      final currentP = _routePoints[_routePolylineIndex];
      final nextP = _routePoints[nextIdx];
      final bearing = _calculateBearing(currentP, nextP);

      setState(() {
        _routePolylineIndex = nextIdx;
        _currentLocation = nextP;
        _currentHeading = bearing;

        final progress = _routePolylineIndex / (_routePoints.length > 1 ? _routePoints.length - 1 : 1);
        _remainingDistanceKm = (_totalDistanceKm * (1.0 - progress)).clamp(0.0, _totalDistanceKm);
        final totalMins = _parseTotalMinutes(widget.duration);
        _remainingDurationMins = (totalMins * (1.0 - progress)).round().clamp(0, totalMins);

        // Turn maneuvers countdown
        if (_steps.isNotEmpty && _currentStepIndex < _steps.length) {
          final targetStepLoc = _steps[_currentStepIndex].location;
          final distToStep = const Distance().as(LengthUnit.Meter, _currentLocation!, targetStepLoc);
          _distanceToNextStep = distToStep.toDouble();
          if (distToStep < 60 && _currentStepIndex < _steps.length - 1) {
            _currentStepIndex++;
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                backgroundColor: AppTheme.isLightNotifier.value ? const Color(0xFF0F172A) : const Color(0xFF102638),
                duration: const Duration(seconds: 2),
                content: Row(
                  children: [
                    const Icon(Icons.navigation_rounded, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _steps[_currentStepIndex].instruction,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }
        }

        // Check approaching stops along route
        for (final stop in _stops) {
          if (stop.lat != 0.0 && stop.lon != 0.0) {
            final distToStop = const Distance().as(LengthUnit.Meter, _currentLocation!, LatLng(stop.lat, stop.lon));
            if (distToStop < 650 && _approachingStop != stop) {
              _approachingStop = stop;
              break;
            }
          }
        }
      });

      // Smooth camera follow on both map engines (matching Screenshot 2 zoom & 3D tilt)
      _mapController.move(_currentLocation!, 17.5);
      if (_mapplsController != null) {
        try {
          _mapplsController!.animateCamera(
            mappls.CameraUpdate.newCameraPosition(
              mappls.CameraPosition(
                target: mappls.LatLng(_currentLocation!.latitude, _currentLocation!.longitude),
                zoom: 17.5,
                tilt: 58.0,
                bearing: _currentHeading,
              ),
            ),
          );
        } catch (_) {}
      }
    });
  }

  void _showArrivalModal() {
    showModalBottomSheet(
      context: context,
      isDismissible: false,
      backgroundColor: AppTheme.isLightNotifier.value ? Colors.white : const Color(0xFF0C131D),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        final isLight = AppTheme.isLightNotifier.value;
        final primaryColor = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: const Color(0xFF00E676).withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(Icons.flag_rounded, color: Color(0xFF00E676), size: 32),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Destination Reached!',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'You have arrived at ${widget.toLocation}. Trip completed successfully.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13.5,
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF7E8E9F),
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _onEndTrip();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: isLight ? Colors.white : Colors.black,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                    ),
                    child: const Text('View Trip Summary', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  IconData _getManeuverIcon(RouteStep? step) {
    if (step == null) return Icons.navigation_rounded;
    final mType = step.maneuverType.toLowerCase();
    final mMod = (step.modifier ?? '').toLowerCase();
    final instr = step.instruction.toLowerCase();

    if (mType == 'arrive' || instr.contains('arrive') || instr.contains('destination') || instr.contains('reached')) {
      return Icons.flag_rounded;
    }
    if (mType.contains('roundabout') || mType.contains('rotary') || instr.contains('roundabout') || instr.contains('rotary')) {
      return Icons.roundabout_right_rounded;
    }
    if (mType == 'fork' || instr.contains('fork')) {
      return (mMod.contains('left') || instr.contains('left'))
          ? Icons.fork_left_rounded
          : Icons.fork_right_rounded;
    }
    if (mMod.contains('sharp left') || instr.contains('sharp left')) {
      return Icons.turn_sharp_left_rounded;
    }
    if (mMod.contains('sharp right') || instr.contains('sharp right')) {
      return Icons.turn_sharp_right_rounded;
    }
    if (mMod.contains('slight left') || instr.contains('slight left') || instr.contains('keep left') || instr.contains('bear left')) {
      return Icons.turn_slight_left_rounded;
    }
    if (mMod.contains('slight right') || instr.contains('slight right') || instr.contains('keep right') || instr.contains('bear right')) {
      return Icons.turn_slight_right_rounded;
    }
    if (mMod.contains('u-turn') || mMod.contains('uturn') || instr.contains('u-turn') || instr.contains('uturn')) {
      return (mMod.contains('right') || instr.contains('right'))
          ? Icons.u_turn_right_rounded
          : Icons.u_turn_left_rounded;
    }
    if (mMod.contains('left') || instr.contains('turn left') || instr.contains('left')) {
      return Icons.turn_left_rounded;
    }
    if (mMod.contains('right') || instr.contains('turn right') || instr.contains('right')) {
      return Icons.turn_right_rounded;
    }
    if (instr.contains('straight') || instr.contains('continue') || instr.contains('head')) {
      return Icons.straight_rounded;
    }
    return Icons.straight_rounded;
  }

  int _parseTotalMinutes(String durationStr) {
    int totalMins = 45;
    final hourMatch = RegExp(r'(\d+)\s*h').firstMatch(durationStr);
    final minMatch = RegExp(r'(\d+)\s*m').firstMatch(durationStr);
    if (hourMatch != null || minMatch != null) {
      final h = hourMatch != null ? int.tryParse(hourMatch.group(1)!) ?? 0 : 0;
      final m = minMatch != null ? int.tryParse(minMatch.group(1)!) ?? 0 : 0;
      totalMins = (h * 60) + m;
    }
    return totalMins;
  }

  void _recenterMap() {
    final target = _currentLocation ?? _effectiveFromLatLng;
    _mapController.move(target, 17.5);
    if (_mapplsController != null) {
      try {
        _mapplsController!.animateCamera(
          mappls.CameraUpdate.newCameraPosition(
            mappls.CameraPosition(
              target: mappls.LatLng(target.latitude, target.longitude),
              zoom: 17.5,
              tilt: 58.0,
              bearing: _currentHeading,
            ),
          ),
        );
      } catch (_) {}
    }
  }

  Map<String, dynamic> _getStopVisual(PlaceSearchResult stop, int index) {
    final name = stop.displayName.toLowerCase();
    final cat = (stop.category ?? '').toLowerCase();

    if (cat == 'fuel' ||
        name.contains('petrol') ||
        name.contains('fuel') ||
        name.contains('hp ') ||
        name.contains('indian oil') ||
        name.contains('bpcl') ||
        name.contains('shell')) {
      return {'svg': AppIcons.fuel, 'color': const Color(0xFF00E676)};
    } else if (cat == 'ev' ||
        name.contains('ev') ||
        name.contains('charge') ||
        name.contains('charging') ||
        name.contains('tata power')) {
      return {'svg': AppIcons.evCharging, 'color': const Color(0xFF00C2FF)};
    } else if (cat == 'hotel' ||
        name.contains('hotel') ||
        name.contains('stay') ||
        name.contains('resort') ||
        name.contains('inn') ||
        name.contains('lodge')) {
      return {'svg': AppIcons.hotel, 'color': const Color(0xFFB388FF)};
    } else if (cat == 'food' ||
        name.contains('food') ||
        name.contains('dhaba') ||
        name.contains('restaurant') ||
        name.contains('dining') ||
        name.contains('treat')) {
      return {'svg': AppIcons.restaurants, 'color': const Color(0xFFFFB300)};
    } else if (cat == 'rest' ||
        name.contains('rest') ||
        name.contains('tea') ||
        name.contains('chai') ||
        name.contains('cafe')) {
      return {'svg': AppIcons.restStops, 'color': const Color(0xFF0D9488)};
    } else if (cat == 'emergency' ||
        name.contains('hospital') ||
        name.contains('medical') ||
        name.contains('trauma') ||
        name.contains('pharmacy')) {
      return {'svg': AppIcons.emergency, 'color': const Color(0xFFFF5252)};
    }

    final colors = [
      const Color(0xFF00E676),
      const Color(0xFF00C2FF),
      const Color(0xFFB388FF),
      const Color(0xFFFFB300),
      const Color(0xFF0D9488),
    ];
    final svgs = [
      AppIcons.fuel,
      AppIcons.evCharging,
      AppIcons.hotel,
      AppIcons.restaurants,
      AppIcons.restStops,
    ];
    return {
      'svg': svgs[index % svgs.length],
      'color': colors[index % colors.length],
    };
  }

  String get _arrival24h {
    final etaTime = DateTime.now().add(
      Duration(minutes: _remainingDurationMins > 0 ? _remainingDurationMins : 5),
    );
    final h = etaTime.hour.toString().padLeft(2, '0');
    final m = etaTime.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  double get _totalDistanceKm {
    if (_routePoints.length >= 2) {
      final polyDist = TripService.calculatePathDistanceKm(_routePoints);
      if (polyDist > 0.1) return polyDist;
    }
    final numMatch = RegExp(r'(\d+(\.\d+)?)').firstMatch(widget.distance);
    final parsed = numMatch != null ? double.tryParse(numMatch.group(1)!) : null;
    if (parsed != null && parsed > 0) return parsed;

    final pts = <LatLng>[];
    if (_effectiveFromLatLng.latitude != 0.0) pts.add(_effectiveFromLatLng);
    for (final s in _stops) {
      if (s.lat != 0.0 && s.lon != 0.0) pts.add(LatLng(s.lat, s.lon));
    }
    if (_effectiveToLatLng.latitude != 0.0) pts.add(_effectiveToLatLng);
    if (pts.length >= 2) {
      return TripService.calculatePathDistanceKm(pts) * 1.25;
    }
    return 0.0;
  }

  String _formatDistanceToStop(PlaceSearchResult stop) {
    if (stop.lat != 0.0 && stop.lon != 0.0) {
      final distKm = const Distance().as(
        LengthUnit.Kilometer,
        _effectiveFromLatLng,
        LatLng(stop.lat, stop.lon),
      );
      if (distKm < 0.1) {
        return 'Nearby';
      } else if (distKm < 1.0) {
        return '${(distKm * 1000).round()} m';
      } else if (distKm < 10.0) {
        return '${distKm.toStringAsFixed(1)} km';
      } else {
        return '${distKm.toStringAsFixed(0)} km';
      }
    }
    return '${(_totalDistanceKm * 0.5).toStringAsFixed(0)} km';
  }

  Future<void> _onEndTrip() async {
    if (_isEnding) return;
    setState(() => _isEnding = true);
    _simulationTimer?.cancel();
    _positionStreamSub?.cancel();

    try {
      await TripService.saveCompletedTrip(
        tripId: widget.tripId,
        fromName: widget.fromLocation,
        fromLat: _effectiveFromLatLng.latitude,
        fromLng: _effectiveFromLatLng.longitude,
        toName: widget.toLocation,
        toLat: _effectiveToLatLng.latitude,
        toLng: _effectiveToLatLng.longitude,
        distance: widget.distance,
        duration: widget.duration,
        fuelUsed: widget.fuelEstimate,
        vehicle: widget.vehicle,
        viaRoute: widget.viaRoute,
        routePoints: _routePoints.isNotEmpty ? _routePoints : widget.routePoints,
        startedAt: widget.startedAt,
      ).timeout(const Duration(seconds: 3), onTimeout: () {
        debugPrint('[ActiveTrip] saveCompletedTrip timed out, proceeding to completion UI');
        return {};
      });
    } catch (error) {
      debugPrint('[ActiveTrip] Note during saveCompletedTrip: $error');
    }

    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => TripCompletedScreen(
          tripId: widget.tripId,
          startedAt: widget.startedAt,
          fromLocation: widget.fromLocation,
          toLocation: widget.toLocation,
          fromLatLng: _effectiveFromLatLng,
          toLatLng: _effectiveToLatLng,
          distance: widget.distance,
          duration: widget.duration,
          fuelUsed: widget.fuelEstimate,
          vehicle: widget.vehicle,
          viaRoute: widget.viaRoute,
          routePoints: _routePoints.isNotEmpty ? _routePoints : widget.routePoints,
          dateTimeRange: 'Today, Live Driving Completed',
        ),
      ),
    );
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
          child: !widget.isNavigating
              ? _buildNoActiveTripScreen(isLight, primaryColor)
              : _buildLiveNavigationScreen(isLight, primaryColor),
        );
      },
    );
  }

  /// Exact layout matching Screenshot 3
  Widget _buildNoActiveTripScreen(bool isLight, Color primaryColor) {
    return Container(
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
          title: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Trips',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Plan. Drive. Explore.',
                style: TextStyle(
                  color: isLight
                      ? const Color(0xFF64748B)
                      : const Color(0xFF7E8E9F),
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
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
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
          child: Column(
            children: [
              // Top 3-pill tab switcher matching Screenshot 3
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 8,
                ),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFF1F5F9)
                        : const Color(0xFF0F1A26),
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(
                      color: isLight
                          ? const Color(0xFFE2E8F0)
                          : const Color(0xFF1B2A3D),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      // Plan a Trip
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    const TripsScreen(initialTab: 0),
                              ),
                            );
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: Colors.transparent,
                              borderRadius: BorderRadius.circular(24),
                            ),
                            child: Center(
                              child: Text(
                                'Plan a Trip',
                                style: TextStyle(
                                  color: isLight
                                      ? const Color(0xFF64748B)
                                      : const Color(0xFF8E9EB0),
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),

                      // Active Trip (Selected Pill)
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: primaryColor,
                            borderRadius: BorderRadius.circular(24),
                          ),
                          child: Center(
                            child: Text(
                              'Active Trip',
                              style: TextStyle(
                                color: isLight ? Colors.white : Colors.black,
                                fontSize: 13.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),

                      // Trip History
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    const TripsScreen(initialTab: 2),
                              ),
                            );
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: Colors.transparent,
                              borderRadius: BorderRadius.circular(24),
                            ),
                            child: Center(
                              child: Text(
                                'Trip History',
                                style: TextStyle(
                                  color: isLight
                                      ? const Color(0xFF64748B)
                                      : const Color(0xFF8E9EB0),
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w500,
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

              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      child: ConstrainedBox(
                        constraints: BoxConstraints(minHeight: constraints.maxHeight),
                        child: IntrinsicHeight(
                          child: Column(
                            children: [
                              const Spacer(flex: 2),

                              // 3D Folded Map illustration with floating pin
                              FoldedMapIllustration(width: 250, height: 210, isLight: isLight),

                              const SizedBox(height: 28),

                              // Title matching Screenshot 3
                              Text(
                                'No Active Trip',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.2,
                                ),
                              ),

                              const SizedBox(height: 12),

                              // Description matching Screenshot 3
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 32),
                                child: Text(
                                  "You don't have any ongoing trip right now.\nPlan a new trip to get the best routes,\nlive navigation and real-time updates.",
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: isLight
                                        ? const Color(0xFF64748B)
                                        : const Color(0xFF7E8E9F),
                                    fontSize: 13.5,
                                    height: 1.45,
                                  ),
                                ),
                              ),

                              const Spacer(flex: 3),

                              // Bottom Button "Plan a Trip ->" matching Screenshot 3
                              Padding(
                                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                                child: SizedBox(
                                  width: double.infinity,
                                  height: 52,
                                  child: ElevatedButton(
                                    onPressed: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) => const PlanTripScreen(),
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
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Live Map Navigation Interface matching dark theme navigation in Images 1 & 2
  Widget _buildLiveNavigationScreen(bool isLight, Color primaryColor) {
    final curStep = _steps.isNotEmpty && _currentStepIndex < _steps.length
        ? _steps[_currentStepIndex]
        : null;
    final nextStep = _steps.isNotEmpty && _currentStepIndex + 1 < _steps.length
        ? _steps[_currentStepIndex + 1]
        : null;

    final roadTitle = curStep != null && curStep.roadName.isNotEmpty
        ? curStep.roadName
        : (curStep != null && curStep.instruction.isNotEmpty
            ? curStep.instruction
            : (widget.viaRoute.isNotEmpty ? widget.viaRoute : 'Head toward destination'));

    final subInstruction = curStep != null && curStep.instruction.isNotEmpty
        ? (_distanceToNextStep < 50
            ? 'Turn now • ${curStep.instruction}'
            : curStep.instruction)
        : 'toward ${widget.toLocation.split(',').first}';

    final safeTop = MediaQuery.of(context).padding.top;
    final safeBottom = MediaQuery.of(context).padding.bottom;
    final hudSurface = isLight
        ? Colors.white.withValues(alpha: 0.96)
        : const Color(0xFF161B22).withValues(alpha: 0.95);
    final controlSurface = isLight ? Colors.white : const Color(0xFF212631);
    final foreground = isLight ? const Color(0xFF0F172A) : Colors.white;
    final secondaryForeground = isLight
        ? const Color(0xFF64748B)
        : const Color(0xFF94A3B8);
    final hudBorder = isLight
        ? const Color(0xFFE2E8F0)
        : Colors.white.withValues(alpha: 0.12);

    return Scaffold(
      backgroundColor: isLight ? const Color(0xFFE8EEF5) : const Color(0xFF0C1017),
      body: Stack(
        children: [
          // 1. Fullscreen Dark Navigation Map
          Positioned.fill(
            child: InteractiveTripMap(
              controller: _mapController,
              currentLocation: _currentLocation,
              heading: _currentHeading,
              isNavigationMode: true,
              isTwoWheeler: _isTwoWheeler,
              onMapplsMapCreated: (ctrl) {
                _mapplsController = ctrl;
              },
              startLocation: _effectiveFromLatLng,
              endLocation: _effectiveToLatLng,
              stopLocations: _stops
                  .where((s) => s.lat != 0.0 && s.lon != 0.0)
                  .map((s) => LatLng(s.lat, s.lon))
                  .toList(),
              stopLabels: _stops
                  .where((s) => s.lat != 0.0 && s.lon != 0.0)
                  .map((s) => s.shortTitle)
                  .toList(),
              startLabel: widget.fromLocation,
              endLabel: widget.toLocation,
              routePoints: _routePoints,
              interactive: true,
            ),
          ),

          // Top Vignette gradient for high contrast
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: safeTop + 140,
            child: IgnorePointer(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      (isLight ? Colors.white : const Color(0xFF080C12)).withValues(alpha: 0.78),
                      (isLight ? Colors.white : const Color(0xFF080C12)).withValues(alpha: 0.24),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Bottom Vignette gradient
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            height: safeBottom + 160,
            child: IgnorePointer(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      (isLight ? Colors.white : const Color(0xFF080C12)).withValues(alpha: 0.82),
                      (isLight ? Colors.white : const Color(0xFF080C12)).withValues(alpha: 0.32),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),

          // 2. Top Maneuver Banner & "Then" Badge (Images 1 & 2)
          Positioned(
            top: safeTop + 10,
            left: 16,
            right: 16,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Main Turn Instruction Card
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: hudSurface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: hudBorder,
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      // High-Visibility Back Button (Bright White on Dark HUD)
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: isLight
                              ? const Color(0xFFF1F5F9)
                              : Colors.white.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: hudBorder,
                            width: 1,
                          ),
                        ),
                        child: Center(
                          child: AnimatedBackArrowButton(
                            onTap: _handleBack,
                            color: foreground,
                            staticWidth: 24,
                            staticHeight: 24,
                            width: 24,
                            height: 24,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),

                      // Cyan/Electric Blue Maneuver Arrow
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0091FF).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Icon(
                            _arrivedAtDestination
                                ? Icons.flag_rounded
                                : _getManeuverIcon(curStep),
                            color: _arrivedAtDestination
                                ? const Color(0xFF00E676)
                                : const Color(0xFF0091FF),
                            size: 28,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Road Title & Direction Details (E 17th Ave / toward Victor St)
                      Expanded(
                        child: _arrivedAtDestination
                            ? Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'Your destination is on seen right.',
                                    style: TextStyle(
                                      color: foreground,
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: -0.2,
                                    ),
                                  ),
                                  SizedBox(height: 2),
                                  Text(
                                    'Have a good day!',
                                    style: TextStyle(
                                      color: Color(0xFF00E676),
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              )
                            : Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    roadTitle,
                                    style: TextStyle(
                                      color: foreground,
                                      fontSize: 17,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: -0.2,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    subInstruction,
                                    style: TextStyle(
                                      color: secondaryForeground,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w400,
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

                // Attached "Then ↱" Badge (Images 1 & 2)
                if (!_arrivedAtDestination) ...[
                  const SizedBox(height: 6),
                  Container(
                    margin: const EdgeInsets.only(left: 60),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: hudSurface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: hudBorder,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Then',
                          style: TextStyle(
                            color: foreground,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          nextStep != null ? _getManeuverIcon(nextStep) : Icons.turn_right_rounded,
                          color: foreground,
                          size: 14,
                        ),
                        if (nextStep != null && nextStep.roadName.isNotEmpty) ...[
                          const SizedBox(width: 4),
                          Text(
                            nextStep.roadName,
                            style: TextStyle(
                              color: secondaryForeground,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],

                // Approaching Stop Notification (if any)
                if (_approachingStop != null)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.pin_drop_rounded, color: Colors.white, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text(
                                'Approaching Stop Ahead',
                                style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                _approachingStop!.shortTitle,
                                style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.bold),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        GestureDetector(
                          onTap: () => setState(() => _approachingStop = null),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text('Dismiss', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          // 3. Right Floating Circular Action Buttons (Images 1 & 2)
          Positioned(
            right: 16,
            top: safeTop + 140,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Switch the map and navigation controls between light and dark.
                GestureDetector(
                  onTap: AppTheme.toggleTheme,
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: controlSurface,
                      shape: BoxShape.circle,
                      border: Border.all(color: hudBorder, width: 1),
                    ),
                    child: Icon(
                      isLight ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                      color: foreground,
                      size: 20,
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                // 2. Working Real-time Rotating Compass Button (Re-orient North-up on Tap)
                GestureDetector(
                  onTap: () {
                    setState(() {
                      _currentHeading = 0.0;
                    });
                    _mapController.rotate(0.0);
                    if (_mapplsController != null) {
                      try {
                        _mapplsController!.animateCamera(
                          mappls.CameraUpdate.bearingTo(0.0),
                        );
                      } catch (_) {}
                    }
                    ScaffoldMessenger.of(context).hideCurrentSnackBar();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        backgroundColor: isLight ? const Color(0xFF0F172A) : const Color(0xFF161B22),
                        duration: const Duration(milliseconds: 900),
                        content: const Text('Camera aligned North-up (0°)'),
                      ),
                    );
                  },
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: controlSurface,
                      shape: BoxShape.circle,
                      border: Border.all(color: hudBorder, width: 1.2),
                    ),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Compass "N" marker at top
                        Positioned(
                          top: 4,
                          child: Text(
                            'N',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFFEF4444),
                              letterSpacing: 0.2,
                            ),
                          ),
                        ),
                        // Real-time Rotating Compass Needle
                        Transform.rotate(
                          angle: -(_currentHeading * (math.pi / 180.0)),
                          child: SizedBox(
                            width: 22,
                            height: 22,
                            child: CustomPaint(
                              painter: _CompassNeedlePainter(),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 12),
                // 3. Recenter / Target Crosshair Button (⌖)
                GestureDetector(
                  onTap: () {
                    _recenterMap();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        backgroundColor: isLight ? const Color(0xFF0F172A) : const Color(0xFF161B22),
                        duration: const Duration(milliseconds: 800),
                        content: const Text('Re-centered on vehicle location'),
                      ),
                    );
                  },
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: controlSurface,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: hudBorder,
                        width: 1,
                      ),
                    ),
                    child: Center(
                      child: Icon(
                        Icons.my_location_rounded,
                        color: foreground,
                        size: 20,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 4. Bottom Navigation Sheet with 3 Metrics & Red "End" Pill Button (Image 2)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: EdgeInsets.fromLTRB(20, 12, 20, safeBottom + 16),
              decoration: BoxDecoration(
                color: isLight ? Colors.white : const Color(0xFF161B22),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                border: Border(
                  top: BorderSide(
                    color: hudBorder,
                    width: 1,
                  ),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Drag Handle
                  Center(
                    child: Container(
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                        color: isLight
                            ? const Color(0xFFCBD5E1)
                            : Colors.white24,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),

                  // Stop Badges (if stops added)
                  if (_stops.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(),
                      child: Row(
                        children: _stops.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final stop = entry.value;
                          final visual = _getStopVisual(stop, idx);
                          final distanceStr = _formatDistanceToStop(stop);
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: _buildUpcomingStopBadge(
                              svgPath: visual['svg'] as String,
                              label: stop.shortTitle,
                              distanceText: distanceStr,
                              color: visual['color'] as Color,
                              isLight: isLight,
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),

                  // 3 Metric Columns: [18:20 arrival] | [5 min] | [1.2 km] (Matching Image 2)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      // 1. Arrival Time
                      Expanded(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _arrival24h,
                              style: TextStyle(
                                color: foreground,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'arrival',
                              style: TextStyle(
                                color: secondaryForeground,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Subtle Vertical Divider
                      Container(
                        width: 1,
                        height: 26,
                        color: hudBorder,
                      ),

                      // 2. Remaining Minutes
                      Expanded(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '$_remainingDurationMins',
                              style: TextStyle(
                                color: foreground,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'min',
                              style: TextStyle(
                                color: secondaryForeground,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Subtle Vertical Divider
                      Container(
                        width: 1,
                        height: 26,
                        color: hudBorder,
                      ),

                      // 3. Remaining Kilometers
                      Expanded(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _remainingDistanceKm < 10
                                  ? _remainingDistanceKm.toStringAsFixed(1)
                                  : _remainingDistanceKm.round().toString(),
                              style: TextStyle(
                                color: foreground,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'km',
                              style: TextStyle(
                                color: secondaryForeground,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 18),

                  // Red Pill "End" Button (Matching Image 2)
                  Center(
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: _isEnding ? null : _onEndTrip,
                      child: Container(
                        height: 42,
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        decoration: BoxDecoration(
                          color: const Color(0xFFB91C1C),
                          borderRadius: BorderRadius.circular(21),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (_isEnding)
                              const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            else ...[
                              const Icon(
                                Icons.stop_rounded,
                                color: Colors.white,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              const Text(
                                'End',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.3,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingStopBadge({
    IconData? icon,
    String? svgPath,
    required String label,
    required String distanceText,
    required Color color,
    required bool isLight,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF0C131D),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF182232),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          svgPath != null
              ? AppIcons.svg(svgPath, color: color, width: 16, height: 16)
              : Icon(icon, color: color, size: 16),
          const SizedBox(width: 6),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 10.5,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  distanceText,
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF64748B)
                        : const Color(0xFF6B7C91),
                    fontSize: 9.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 3D Folded Map with floating location pin Custom Painter matching Screenshot 3
class FoldedMapIllustration extends StatelessWidget {
  final double width;
  final double height;
  final bool isLight;

  const FoldedMapIllustration({
    super.key,
    this.width = 240,
    this.height = 200,
    this.isLight = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: height,
      child: CustomPaint(painter: _FoldedMapPainter(isLight: isLight)),
    );
  }
}

class _FoldedMapPainter extends CustomPainter {
  final bool isLight;

  _FoldedMapPainter({this.isLight = false});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // 1. Ambient dots (stars/particles)
    final dotPaint = Paint()..style = PaintingStyle.fill;

    dotPaint.color = isLight
        ? const Color(0xFF94A3B8).withValues(alpha: 0.3)
        : const Color(0xFF6B82A8).withValues(alpha: 0.25);
    canvas.drawCircle(Offset(w * 0.14, h * 0.32), 3.0, dotPaint);

    dotPaint.color = isLight
        ? const Color(0xFF94A3B8).withValues(alpha: 0.22)
        : const Color(0xFF6B82A8).withValues(alpha: 0.18);
    canvas.drawCircle(Offset(w * 0.08, h * 0.44), 4.0, dotPaint);

    dotPaint.color = isLight
        ? const Color(0xFF94A3B8).withValues(alpha: 0.25)
        : const Color(0xFF6B82A8).withValues(alpha: 0.22);
    canvas.drawCircle(Offset(w * 0.88, h * 0.48), 3.5, dotPaint);

    // 2. Soft contact shadow beneath the folded map
    final shadowPaint = Paint()
      ..shader =
          RadialGradient(
            colors: [
              Colors.black.withValues(alpha: isLight ? 0.20 : 0.70),
              Colors.black.withValues(alpha: 0.0),
            ],
          ).createShader(
            Rect.fromCenter(
              center: Offset(w * 0.50, h * 0.84),
              width: w * 0.75,
              height: h * 0.28,
            ),
          );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w * 0.50, h * 0.84),
        width: w * 0.75,
        height: h * 0.24,
      ),
      shadowPaint,
    );

    // 3. Folded 3D Map (3 accordion panels)
    final borderPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0
      ..color = isLight
          ? const Color(0xFF94A3B8).withValues(alpha: 0.4)
          : const Color(0xFF6E819E).withValues(alpha: 0.35);

    // Panel 1: Left
    final pathLeft = Path()
      ..moveTo(w * 0.18, h * 0.44)
      ..lineTo(w * 0.39, h * 0.36)
      ..lineTo(w * 0.39, h * 0.80)
      ..lineTo(w * 0.18, h * 0.88)
      ..close();

    final paintLeft = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: isLight
            ? const [Color(0xFFE2E8F0), Color(0xFFCBD5E1), Color(0xFF94A3B8)]
            : const [Color(0xFF5A6980), Color(0xFF323B4A), Color(0xFF1F2633)],
        stops: const [0.0, 0.6, 1.0],
      ).createShader(Rect.fromLTWH(w * 0.18, h * 0.36, w * 0.21, h * 0.52));
    canvas.drawPath(pathLeft, paintLeft);
    canvas.drawPath(pathLeft, borderPaint);

    // Panel 2: Center (sloping down, darker shadow fold)
    final pathCenter = Path()
      ..moveTo(w * 0.39, h * 0.36)
      ..lineTo(w * 0.61, h * 0.44)
      ..lineTo(w * 0.61, h * 0.88)
      ..lineTo(w * 0.39, h * 0.80)
      ..close();

    final paintCenter = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: isLight
            ? const [Color(0xFFCBD5E1), Color(0xFF94A3B8), Color(0xFF64748B)]
            : const [Color(0xFF283445), Color(0xFF17202C), Color(0xFF0F151E)],
      ).createShader(Rect.fromLTWH(w * 0.39, h * 0.36, w * 0.22, h * 0.52));
    canvas.drawPath(pathCenter, paintCenter);
    canvas.drawPath(pathCenter, borderPaint);

    // Panel 3: Right (sloping up, lighted fold)
    final pathRight = Path()
      ..moveTo(w * 0.61, h * 0.44)
      ..lineTo(w * 0.82, h * 0.36)
      ..lineTo(w * 0.82, h * 0.80)
      ..lineTo(w * 0.61, h * 0.88)
      ..close();

    final paintRight = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topRight,
        end: Alignment.bottomLeft,
        colors: isLight
            ? const [Color(0xFFF1F5F9), Color(0xFFE2E8F0), Color(0xFFCBD5E1)]
            : const [Color(0xFF6B7E98), Color(0xFF3D4A5E), Color(0xFF242E3C)],
      ).createShader(Rect.fromLTWH(w * 0.61, h * 0.36, w * 0.21, h * 0.52));
    canvas.drawPath(pathRight, paintRight);
    canvas.drawPath(pathRight, borderPaint);

    // 4. Pin Shadow on map surface
    final pinShadow = Paint()
      ..shader =
          RadialGradient(
            colors: [
              Colors.black.withValues(alpha: isLight ? 0.3 : 0.7),
              Colors.black.withValues(alpha: 0.0),
            ],
          ).createShader(
            Rect.fromCenter(
              center: Offset(w * 0.50, h * 0.51),
              width: 32,
              height: 14,
            ),
          );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w * 0.50, h * 0.51),
        width: 32,
        height: 12,
      ),
      pinShadow,
    );

    // 5. Floating Location Pin (Teardrop shape)
    final pinCenterX = w * 0.50;
    final pinCenterY = h * 0.25;
    const pinRadius = 23.0;
    final pinTipY = h * 0.44;

    final pinPath = Path()
      ..moveTo(pinCenterX, pinTipY)
      ..cubicTo(
        pinCenterX - pinRadius * 0.95,
        pinTipY - 12,
        pinCenterX - pinRadius,
        pinCenterY + 8,
        pinCenterX - pinRadius,
        pinCenterY,
      )
      ..arcToPoint(
        Offset(pinCenterX + pinRadius, pinCenterY),
        radius: const Radius.circular(pinRadius),
        clockwise: true,
      )
      ..cubicTo(
        pinCenterX + pinRadius,
        pinCenterY + 8,
        pinCenterX + pinRadius * 0.95,
        pinTipY - 12,
        pinCenterX,
        pinTipY,
      )
      ..close();

    final pinPaint = Paint()
      ..shader =
          LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isLight
                ? const [
                    Color(0xFFEBF5FF),
                    Color(0xFF93C5FD),
                    Color(0xFF3B82F6),
                    Color(0xFF1D4ED8),
                  ]
                : const [
                    Color(0xFFE6F7FF),
                    Color(0xFF9DE0FF),
                    Color(0xFF45C0F5),
                    Color(0xFF009FD6),
                  ],
            stops: const [0.0, 0.35, 0.75, 1.0],
          ).createShader(
            Rect.fromLTWH(
              pinCenterX - pinRadius,
              pinCenterY - pinRadius,
              pinRadius * 2,
              pinTipY - (pinCenterY - pinRadius),
            ),
          );

    // Outer glow for the pin
    final glowPaint = Paint()
      ..maskFilter = const MaskFilter.blur(BlurStyle.outer, 8)
      ..color = (isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF))
          .withValues(alpha: 0.4);
    canvas.drawPath(pinPath, glowPaint);

    // Fill pin
    canvas.drawPath(pinPath, pinPaint);

    // Top highlight rim on pin
    final rimPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2
      ..color = Colors.white.withValues(alpha: 0.7);
    canvas.drawPath(pinPath, rimPaint);

    // Inner eye concentric circles
    final innerEyeDark = Paint()
      ..color = isLight ? Colors.white : const Color(0xFF0A1524)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(pinCenterX, pinCenterY - 1), 8.5, innerEyeDark);

    final innerEyeRim = Paint()
      ..color = isLight
          ? const Color(0xFF0066FF).withValues(alpha: 0.85)
          : Colors.white.withValues(alpha: 0.85)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    canvas.drawCircle(Offset(pinCenterX, pinCenterY - 1), 8.5, innerEyeRim);

    final innerEyeCyan = Paint()
      ..color = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(pinCenterX, pinCenterY - 1), 3.5, innerEyeCyan);
  }

  @override
  bool shouldRepaint(covariant _FoldedMapPainter oldDelegate) =>
      oldDelegate.isLight != isLight;
}

class _CompassNeedlePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // North Pointer (Red Diamond / Arrow)
    final northPaint = Paint()..color = const Color(0xFFEF4444);
    final northPath = Path()
      ..moveTo(cx, 1)
      ..lineTo(cx + 4.5, cy)
      ..lineTo(cx - 4.5, cy)
      ..close();
    canvas.drawPath(northPath, northPaint);

    // South Pointer (White / Silver Diamond)
    final southPaint = Paint()..color = const Color(0xFFE2E8F0);
    final southPath = Path()
      ..moveTo(cx, size.height - 1)
      ..lineTo(cx + 4.5, cy)
      ..lineTo(cx - 4.5, cy)
      ..close();
    canvas.drawPath(southPath, southPaint);

    // Center Pivot Pin
    final pivotShadow = Paint()..color = Colors.black45;
    canvas.drawCircle(Offset(cx, cy), 2.5, pivotShadow);
    final pivotPaint = Paint()..color = Colors.white;
    canvas.drawCircle(Offset(cx, cy), 1.8, pivotPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
