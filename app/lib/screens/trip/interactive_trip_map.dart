import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:mappls_gl/mappls_gl.dart' as mappls;

import '../../theme/app_theme.dart';
import '../../utils/map_config.dart';
import '../../widgets/mappls_native_map.dart';

class InteractiveTripMap extends StatefulWidget {
  final LatLng startLocation;
  final LatLng endLocation;
  final List<LatLng> routePoints;
  final List<LatLng> stopLocations;
  final List<String> stopLabels;
  final String startLabel;
  final String endLabel;
  final double initialZoom;
  final bool isNavigationMode;
  final bool isTwoWheeler;
  final bool interactive;
  final MapController? controller;
  final LatLng? currentLocation;
  final double? heading;
  final void Function(mappls.MapplsMapController controller)? onMapplsMapCreated;

  const InteractiveTripMap({
    super.key,
    required this.startLocation,
    required this.endLocation,
    this.routePoints = const [],
    this.stopLocations = const [],
    this.stopLabels = const [],
    this.startLabel = 'From',
    this.endLabel = 'To',
    this.initialZoom = 10.5,
    this.isNavigationMode = false,
    this.isTwoWheeler = false,
    this.interactive = true,
    this.controller,
    this.currentLocation,
    this.heading,
    this.onMapplsMapCreated,
  });

  @override
  State<InteractiveTripMap> createState() => _InteractiveTripMapState();
}

class _InteractiveTripMapState extends State<InteractiveTripMap> {
  late final MapController _mapController;

  bool _flutterMapIntroPlayed = false;

  @override
  void initState() {
    super.initState();
    _mapController = widget.controller ?? MapController();
    if (widget.isNavigationMode) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _playFlutterMapIntro();
      });
    }
  }

  void _playFlutterMapIntro() async {
    if (_flutterMapIntroPlayed) return;
    _flutterMapIntroPlayed = true;
    final target = widget.currentLocation ?? widget.startLocation;
    await Future.delayed(const Duration(milliseconds: 900));
    if (!mounted) return;
    try {
      _mapController.move(target, 17.5);
    } catch (_) {}
  }

  @override
  void didUpdateWidget(covariant InteractiveTripMap oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.isNavigationMode) {
      if (widget.currentLocation != null &&
          (oldWidget.currentLocation != widget.currentLocation ||
              oldWidget.isNavigationMode != widget.isNavigationMode)) {
        if (_flutterMapIntroPlayed) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            try {
              _mapController.move(widget.currentLocation!, 17.5);
            } catch (_) {}
          });
        }
      }
      return;
    }

    if (oldWidget.startLocation != widget.startLocation ||
        oldWidget.endLocation != widget.endLocation ||
        !listEquals(oldWidget.routePoints, widget.routePoints) ||
        !listEquals(oldWidget.stopLocations, widget.stopLocations)) {
      final validStops = widget.stopLocations
          .where(_isValidCoordinate)
          .toList();
      final points = [
        ...widget.routePoints.where(_isValidCoordinate),
        if (widget.routePoints.isEmpty &&
            _isValidCoordinate(widget.startLocation) &&
            _isValidCoordinate(widget.endLocation)) ...[
          widget.startLocation,
          widget.endLocation,
        ],
        ...validStops,
      ];
      final validPoints = points.where(_isValidCoordinate).toList();
      final bool hasSpread =
          validPoints.length >= 2 &&
          validPoints.any(
            (p) =>
                (p.latitude - validPoints.first.latitude).abs() > 0.0001 ||
                (p.longitude - validPoints.first.longitude).abs() > 0.0001,
          );

      if (hasSpread) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          try {
            _mapController.fitCamera(
              CameraFit.bounds(
                bounds: LatLngBounds.fromPoints(validPoints),
                padding: const EdgeInsets.symmetric(
                  horizontal: 28,
                  vertical: 24,
                ),
              ),
            );
          } catch (_) {}
        });
      } else if (validPoints.isNotEmpty) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          try {
            _mapController.move(validPoints.first, widget.initialZoom);
          } catch (_) {}
        });
      }
    }
  }

  static bool _isValidCoordinate(LatLng point) =>
      point.latitude.isFinite &&
      point.longitude.isFinite &&
      point.latitude.abs() <= 90 &&
      point.longitude.abs() <= 180 &&
      (point.latitude != 0.0 || point.longitude != 0.0);

  LatLng get _center {
    final lat1 = widget.startLocation.latitude;
    final lon1 = widget.startLocation.longitude;
    final lat2 = widget.endLocation.latitude;
    final lon2 = widget.endLocation.longitude;
    if (lat1 != 0.0 && lat2 != 0.0) {
      return LatLng((lat1 + lat2) / 2, (lon1 + lon2) / 2);
    }
    if (lat1 != 0.0) return widget.startLocation;
    if (lat2 != 0.0) return widget.endLocation;
    if (widget.currentLocation != null && widget.currentLocation!.latitude != 0.0) {
      return widget.currentLocation!;
    }
    return const LatLng(20.5937, 78.9629);
  }

  double get _overviewZoom {
    final points = widget.routePoints.where(_isValidCoordinate).toList();
    if (points.isEmpty && _isValidCoordinate(widget.startLocation) && _isValidCoordinate(widget.endLocation)) {
      points.add(widget.startLocation);
      points.add(widget.endLocation);
    }
    if (points.length < 2) return 10.5;
    double minLat = points.first.latitude;
    double maxLat = points.first.latitude;
    double minLng = points.first.longitude;
    double maxLng = points.first.longitude;
    for (final p in points) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    final maxSpan = math.max((maxLat - minLat).abs(), (maxLng - minLng).abs());
    if (maxSpan > 8.0) return 5.0; // Wide interstate route like Indore -> Lucknow
    if (maxSpan > 4.0) return 6.0;
    if (maxSpan > 2.0) return 7.5;
    if (maxSpan > 1.0) return 8.8;
    if (maxSpan > 0.4) return 10.0;
    if (maxSpan > 0.15) return 11.5;
    return 13.0;
  }

  List<Polyline<Object>> _buildTrafficPolylines(List<LatLng> rawPoints) {
    final points = rawPoints.where(_isValidCoordinate).toList();
    if (points.length < 2) return [];
    if (points.length < 4) {
      return [
        Polyline<Object>(
          points: points,
          strokeWidth: 8.5,
          color: const Color(0xFF00E676).withValues(alpha: 0.35),
        ),
        Polyline<Object>(
          points: points,
          strokeWidth: 4.5,
          color: const Color(0xFF00E676),
        ),
      ];
    }

    final count = points.length;
    final idx1 = (count * 0.45).round().clamp(1, count - 1);
    final idx2 = (count * 0.80).round().clamp(idx1, count - 1);

    final greenSeg = points.sublist(0, idx1 + 1);
    final amberSeg = points.sublist(idx1, idx2 + 1);
    final redSeg = points.sublist(idx2);

    final List<Polyline<Object>> polylines = [];

    // Outer glow for each traffic segment
    if (greenSeg.isNotEmpty) {
      polylines.add(
        Polyline<Object>(
          points: greenSeg,
          strokeWidth: 9.0,
          color: const Color(0xFF00E676).withValues(alpha: 0.35),
        ),
      );
    }
    if (amberSeg.isNotEmpty) {
      polylines.add(
        Polyline<Object>(
          points: amberSeg,
          strokeWidth: 9.0,
          color: const Color(0xFFF59E0B).withValues(alpha: 0.35),
        ),
      );
    }
    if (redSeg.isNotEmpty) {
      polylines.add(
        Polyline<Object>(
          points: redSeg,
          strokeWidth: 9.0,
          color: const Color(0xFFEF4444).withValues(alpha: 0.35),
        ),
      );
    }

    // Crisp inner lines for each traffic segment
    if (greenSeg.isNotEmpty) {
      polylines.add(
        Polyline<Object>(
          points: greenSeg,
          strokeWidth: 4.5,
          color: const Color(0xFF00E676),
        ),
      );
    }
    if (amberSeg.isNotEmpty) {
      polylines.add(
        Polyline<Object>(
          points: amberSeg,
          strokeWidth: 4.5,
          color: const Color(0xFFF59E0B),
        ),
      );
    }
    if (redSeg.isNotEmpty) {
      polylines.add(
        Polyline<Object>(
          points: redSeg,
          strokeWidth: 4.5,
          color: const Color(0xFFEF4444),
        ),
      );
    }

    return polylines;
  }

  @override
  Widget build(BuildContext context) {
    final validStops = widget.stopLocations
        .where(_isValidCoordinate)
        .toList();

    final bool hasValidStart = _isValidCoordinate(widget.startLocation);
    final bool hasValidEnd = _isValidCoordinate(widget.endLocation);
    final routePoints = widget.routePoints.where(_isValidCoordinate).toList();
    final bool hasValidRoute = routePoints.length >= 2;

    final effectiveStart = hasValidStart
        ? widget.startLocation
        : (routePoints.isNotEmpty ? routePoints.first : widget.startLocation);
    final effectiveEnd = hasValidEnd
        ? widget.endLocation
        : (routePoints.isNotEmpty ? routePoints.last : widget.endLocation);

    final effectiveRoutePoints = [
      if (hasValidRoute) ...routePoints,
      if (!hasValidRoute && hasValidStart && hasValidEnd) ...[
        widget.startLocation,
        widget.endLocation,
      ],
      ...validStops,
    ];
    final validEffectivePoints = effectiveRoutePoints
        .where(_isValidCoordinate)
        .toList();
    final bool hasEffectiveSpread =
        validEffectivePoints.length >= 2 &&
        validEffectivePoints.any(
          (p) =>
              (p.latitude - validEffectivePoints.first.latitude).abs() >
                  0.0001 ||
              (p.longitude - validEffectivePoints.first.longitude).abs() >
                  0.0001,
        );

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final isDarkTheme = !isLight;
        final routeColor = isLight
            ? const Color(0xFF0066FF)
            : const Color(0xFF00C2FF);

        final isMobileNative = !kIsWeb &&
            (defaultTargetPlatform == TargetPlatform.android ||
                defaultTargetPlatform == TargetPlatform.iOS);

        if (isMobileNative) {
          return Container(
            color: isDarkTheme
                ? const Color(0xFF0C1017)
                : const Color(0xFFF1F5F9),
            child: MapplsNativeMap(
              initialCenter: _center,
              initialZoom: widget.isNavigationMode ? _overviewZoom : widget.initialZoom,
              routePoints: widget.routePoints,
              startLocation: effectiveStart,
              endLocation: effectiveEnd,
              stopLocations: widget.stopLocations,
              stopLabels: widget.stopLabels,
              currentLocation: widget.currentLocation,
              heading: widget.heading,
              isNavigationMode: widget.isNavigationMode,
              isTwoWheeler: widget.isTwoWheeler,
              interactive: widget.interactive,
              isDark: isDarkTheme,
              onMapCreated: widget.onMapplsMapCreated,
            ),
          );
        }

        return Container(
          color: isDarkTheme
              ? const Color(0xFF0C1017)
              : const Color(0xFFF1F5F9),
          child: FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _center,
              initialZoom: widget.isNavigationMode ? _overviewZoom : widget.initialZoom,
              initialCameraFit: hasEffectiveSpread
                  ? CameraFit.bounds(
                      bounds: LatLngBounds.fromPoints(validEffectivePoints),
                      padding: const EdgeInsets.only(
                        left: 40,
                        right: 40,
                        top: 110,
                        bottom: 140,
                      ),
                    )
                  : null,
              interactionOptions: InteractionOptions(
                flags: widget.interactive
                    ? InteractiveFlag.all
                    : InteractiveFlag.none,
              ),
            ),
            children: [
              // Centralized Mappls (MapmyIndia) Roadmap Tiles with Resilient Fallback
              MapConfig.buildTileLayer(
                isDark: isDarkTheme,
                maxNativeZoom: 19,
                maxZoom: 22,
              ),
              // Route Polyline (Traffic-Colored Segments in Navigation Mode)
              PolylineLayer<Object>(
                polylines: (hasValidRoute || (hasValidStart && hasValidEnd))
                    ? () {
                        final rawPts = hasValidRoute
                            ? routePoints
                            : [effectiveStart, effectiveEnd];
                        final cleanPts = rawPts
                            .where(_isValidCoordinate)
                            .toList();
                        if (cleanPts.length < 2) return <Polyline<Object>>[];

                        if (widget.isNavigationMode) {
                          return _buildTrafficPolylines(cleanPts);
                        } else {
                          return <Polyline<Object>>[
                            // Outer glow shadow
                            Polyline<Object>(
                              points: cleanPts,
                              strokeWidth: 9.0,
                              color: routeColor.withValues(alpha: 0.35),
                            ),
                            // Solid crisp path
                            Polyline<Object>(
                              points: cleanPts,
                              strokeWidth: 4.5,
                              color: routeColor,
                            ),
                          ];
                        }
                      }()
                    : <Polyline<Object>>[],
              ),

              // Markers (Start, End, Added Stops Along Route, and Live Vehicle Location Puck)
              MarkerLayer(
                markers: [
                  // 1. Start Marker (Green Pulse)
                  if (_isValidCoordinate(effectiveStart))
                    Marker(
                      point: effectiveStart,
                      width: 44,
                      height: 44,
                      alignment: Alignment.center,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              color: const Color(0xFF00E676),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white,
                                width: 2.5,
                              ),
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.circle,
                                color: Colors.white,
                                size: 7,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // 2. Stops Along Route (Numbered Waypoint Badges with Titles)
                  ...widget.stopLocations
                      .asMap()
                      .entries
                      .where((entry) {
                        final loc = entry.value;
                        return _isValidCoordinate(loc);
                      })
                      .map((entry) {
                        final idx = entry.key;
                        final loc = entry.value;
                        final label = idx < widget.stopLabels.length
                            ? widget.stopLabels[idx]
                            : 'Stop ${idx + 1}';
                        return Marker(
                          point: loc,
                          width: 100,
                          height: 56,
                          alignment: Alignment.bottomCenter,
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 7,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF59E0B),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  label.split(',').first,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 1),
                              Container(
                                width: 26,
                                height: 26,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF59E0B),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.white,
                                    width: 2,
                                  ),
                                ),
                                child: Center(
                                  child: Text(
                                    '${idx + 1}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),

                  // 3. End / Destination Marker (Iconic Red GPS Destination Pin)
                  if (_isValidCoordinate(effectiveEnd))
                    Marker(
                      point: effectiveEnd,
                      width: 120,
                      height: 70,
                      alignment: Alignment.bottomCenter,
                      child: DestinationPinWidget(
                        size: 46,
                        label: widget.endLabel != 'To' && widget.endLabel.isNotEmpty
                            ? widget.endLabel.split(',').first
                            : null,
                      ),
                    ),

                  // 4. Live Vehicle Marker (Dedicated 3D Bike/Car in Navigation Mode, Pulsing Puck in Preview)
                  if (widget.currentLocation != null)
                    Marker(
                      point: widget.currentLocation!,
                      width: widget.isNavigationMode ? 64 : 56,
                      height: widget.isNavigationMode ? 64 : 56,
                      alignment: Alignment.center,
                      child: widget.isNavigationMode
                          ? NavigationVehicleMarker(
                              isTwoWheeler: widget.isTwoWheeler,
                              heading: widget.heading ?? 0.0,
                            )
                          : Stack(
                              alignment: Alignment.center,
                              children: [
                                // Soft Outer Radial Halo
                                Container(
                                  width: 52,
                                  height: 52,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: const Color(0xFF0091FF)
                                        .withValues(alpha: 0.28),
                                  ),
                                ),
                                // Middle Glow Ring
                                Container(
                                  width: 34,
                                  height: 34,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: const Color(0xFF0091FF)
                                        .withValues(alpha: 0.42),
                                  ),
                                ),
                                // Crisp Solid Blue Circle with White Border
                                Container(
                                  width: 22,
                                  height: 22,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0091FF),
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: Colors.white,
                                      width: 2.5,
                                    ),
                                  ),
                                  child: const Center(
                                    child: Icon(
                                      Icons.circle,
                                      color: Colors.white,
                                      size: 5,
                                    ),
                                  ),
                                ),
                                // Directional Pointer Beacon (when heading available)
                                if (widget.heading != null && widget.heading != 0.0)
                                  Transform.rotate(
                                    angle:
                                        ((widget.heading ?? 0.0) * (math.pi / 180)),
                                    child: Align(
                                      alignment: Alignment.topCenter,
                                      child: Container(
                                        width: 6,
                                        height: 7,
                                        decoration: const BoxDecoration(
                                          color: Colors.white,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                    ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Iconic GPS Teardrop Destination Pin with Ground Drop Shadow and White Core
class DestinationPinWidget extends StatelessWidget {
  final double size;
  final String? label;

  const DestinationPinWidget({
    super.key,
    this.size = 46.0,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.end,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        if (label != null && label!.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(bottom: 3),
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.25),
                width: 1,
              ),
            ),
            child: Text(
              label!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10.5,
                fontWeight: FontWeight.bold,
                letterSpacing: -0.2,
              ),
            ),
          ),
        SizedBox(
          width: size,
          height: size,
          child: Stack(
            alignment: Alignment.bottomCenter,
            clipBehavior: Clip.none,
            children: [
              // 1. Soft Ground Shadow Oval at the contact tip
              Positioned(
                bottom: 0,
                child: Container(
                  width: size * 0.44,
                  height: size * 0.16,
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.all(
                      Radius.elliptical(size * 0.44, size * 0.16),
                    ),
                  ),
                ),
              ),

              // 2. Custom Painted Teardrop Pin Body
              Positioned(
                bottom: 2,
                child: CustomPaint(
                  size: Size(size * 0.74, size - 2),
                  painter: _DestinationPinPainter(),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DestinationPinPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final radius = w / 2;

    // Pin outline path (smooth circle at top tapering to sharp tip at bottom)
    final path = ui.Path();
    path.moveTo(w / 2, h);
    path.cubicTo(w * 0.08, h * 0.58, 0, h * 0.38, 0, radius);
    path.arcTo(
      Rect.fromCircle(center: Offset(radius, radius), radius: radius),
      math.pi,
      math.pi,
      false,
    );
    path.cubicTo(w, h * 0.38, w * 0.92, h * 0.58, w / 2, h);
    path.close();

    // 1. Drop shadow for 3D elevation
    canvas.drawShadow(path, Colors.black, 4.5, true);

    // 2. Vivid Red/Crimson Navigation Gradient
    final gradient = const LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        Color(0xFFFF3B30), // Apple/Google Maps bright red
        Color(0xFFEA4335), // Google Maps signature destination red
        Color(0xFFB91C1C), // Deep crimson anchor
      ],
    );
    final pinPaint = Paint()
      ..shader = gradient.createShader(Rect.fromLTWH(0, 0, w, h))
      ..style = PaintingStyle.fill;
    canvas.drawPath(path, pinPaint);

    // 3. Crisp white outer stroke
    final strokePaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.90)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    canvas.drawPath(path, strokePaint);

    // 4. White Center Circle Badge
    final innerCenter = Offset(radius, radius * 0.96);
    final innerRadius = radius * 0.44;
    final whitePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawCircle(innerCenter, innerRadius, whitePaint);

    // 5. Red Bullseye Center Dot
    final redDotPaint = Paint()
      ..color = const Color(0xFFDC2626)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(innerCenter, innerRadius * 0.48, redDotPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}


/// Top-Down Navigation Vehicle Marker (Car / Bike) for Navigation Mode
class NavigationVehicleMarker extends StatelessWidget {
  final bool isTwoWheeler;
  final double heading;

  const NavigationVehicleMarker({
    super.key,
    required this.isTwoWheeler,
    required this.heading,
  });

  @override
  Widget build(BuildContext context) {
    return Transform.rotate(
      angle: heading * (math.pi / 180.0),
      child: isTwoWheeler ? _buildBikeWidget() : _buildCarWidget(),
    );
  }

  Widget _buildCarWidget() {
    return SizedBox(
      width: 52,
      height: 52,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Forward Headlight Glow
          Positioned(
            top: 0,
            child: Container(
              width: 32,
              height: 20,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.bottomCenter,
                  radius: 0.8,
                  colors: [
                    const Color(0xFFFFF9C4).withValues(alpha: 0.6),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          // Car Chassis
          Container(
            width: 22,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFF0091FF),
              borderRadius: BorderRadius.circular(7),
              border: Border.all(color: Colors.white, width: 1.5),
            ),
            child: Column(
              children: [
                const SizedBox(height: 3),
                // Front Windshield
                Container(
                  width: 15,
                  height: 5,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 2),
                // Roof
                Container(
                  width: 15,
                  height: 11,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0077D4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 2),
                // Rear Windshield
                Container(
                  width: 14,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const Spacer(),
                // Tail lights
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(width: 3.5, height: 2, color: const Color(0xFFEF4444)),
                    Container(width: 3.5, height: 2, color: const Color(0xFFEF4444)),
                  ],
                ),
                const SizedBox(height: 1),
              ],
            ),
          ),
          // Direction indicator arrow
          Positioned(
            top: 2,
            child: Icon(
              Icons.keyboard_arrow_up_rounded,
              color: Colors.white,
              size: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBikeWidget() {
    return SizedBox(
      width: 48,
      height: 48,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Forward Headlight Glow
          Positioned(
            top: 2,
            child: Container(
              width: 26,
              height: 18,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.bottomCenter,
                  radius: 0.8,
                  colors: [
                    const Color(0xFFFFF9C4).withValues(alpha: 0.7),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          // Bike Frame & Handlebars
          SizedBox(
            width: 24,
            height: 38,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Handlebar bar
                Positioned(
                  top: 9,
                  child: Container(
                    width: 22,
                    height: 3.5,
                    decoration: BoxDecoration(
                      color: const Color(0xFF334155),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                // Bike Main Body
                Container(
                  width: 12,
                  height: 32,
                  decoration: BoxDecoration(
                    color: const Color(0xFF00C2FF),
                    borderRadius: BorderRadius.circular(5),
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                ),
                // Rider Helmet
                Positioned(
                  top: 13,
                  child: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 1.2),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Direction indicator arrow
          Positioned(
            top: 2,
            child: Icon(
              Icons.keyboard_arrow_up_rounded,
              color: Colors.white,
              size: 14,
            ),
          ),
        ],
      ),
    );
  }
}
