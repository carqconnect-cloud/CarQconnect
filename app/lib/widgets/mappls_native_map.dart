import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:latlong2/latlong.dart' as ll;
import 'package:mappls_gl/mappls_gl.dart' as mappls;
import 'navigation_intro_controller.dart';

/// Marker Icon Utility to render sharp hardware bitmaps for Mappls Native Vector Map
class MapplsMarkerHelper {
  static Uint8List? _cachedCarBytes;

  static Future<Uint8List> createCarMarkerBytes({
    double size = 96.0,
    Color carColor = const Color(0xFF0091FF),
  }) async {
    if (_cachedCarBytes != null) return _cachedCarBytes!;

    try {
      final raw = await rootBundle.load('assets/images/car_scan_frame_0.png');
      final codec = await ui.instantiateImageCodec(
        raw.buffer.asUint8List(),
        targetHeight: (size * 0.78).round(),
      );
      final frame = await codec.getNextFrame();
      final carImg = frame.image;

      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder, Rect.fromLTWH(0, 0, size, size));
      final center = Offset(size / 2, size / 2);

      // Soft forward LED headlight glow cone
      final beamPaint = Paint()
        ..shader = ui.Gradient.radial(
          Offset(center.dx, center.dy - size * 0.16),
          size * 0.44,
          [
            const Color(0xFF38BDF8).withValues(alpha: 0.42),
            const Color(0xFF38BDF8).withValues(alpha: 0.0),
          ],
        );
      canvas.drawCircle(Offset(center.dx, center.dy - size * 0.14), size * 0.36, beamPaint);

      // Subtle ground contact oval under vehicle
      final shadowPaint = Paint()
        ..color = Colors.black.withValues(alpha: 0.35)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5.0);
      canvas.drawOval(
        Rect.fromCenter(
          center: Offset(center.dx, center.dy + 2),
          width: carImg.width * 0.92,
          height: carImg.height * 0.95,
        ),
        shadowPaint,
      );

      final dstRect = Rect.fromCenter(
        center: center,
        width: carImg.width.toDouble(),
        height: carImg.height.toDouble(),
      );
      canvas.drawImageRect(
        carImg,
        Rect.fromLTWH(0, 0, carImg.width.toDouble(), carImg.height.toDouble()),
        dstRect,
        Paint()..filterQuality = FilterQuality.high,
      );

      final picture = recorder.endRecording();
      final img = await picture.toImage(size.toInt(), size.toInt());
      final byteData = await img.toByteData(format: ui.ImageByteFormat.png);
      _cachedCarBytes = byteData!.buffer.asUint8List();
      return _cachedCarBytes!;
    } catch (_) {
      // Vector fallback if bundle asset cannot be decoded
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder, Rect.fromLTWH(0, 0, size, size));
      final center = Offset(size / 2, size / 2);
      final bodyRect = Rect.fromCenter(center: center, width: 22, height: 42);
      canvas.drawRRect(
        RRect.fromRectAndRadius(bodyRect, const Radius.circular(8)),
        Paint()..color = carColor,
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(bodyRect, const Radius.circular(8)),
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.6,
      );
      final picture = recorder.endRecording();
      final img = await picture.toImage(size.toInt(), size.toInt());
      final byteData = await img.toByteData(format: ui.ImageByteFormat.png);
      return byteData!.buffer.asUint8List();
    }
  }

  static Future<Uint8List> createBikeMarkerBytes({
    double size = 52.0,
    Color bikeColor = const Color(0xFF00C2FF),
  }) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder, Rect.fromLTWH(0, 0, size, size));
    final center = Offset(size / 2, size / 2);

    // 1. Forward Headlight Beam Glow
    final beamPaint = Paint()
      ..shader = ui.Gradient.radial(
        Offset(center.dx, center.dy - 10),
        size * 0.45,
        [
          const Color(0xFFFFF9C4).withValues(alpha: 0.55),
          const Color(0xFFFFF9C4).withValues(alpha: 0.0),
        ],
      );
    final beamPath = Path()
      ..moveTo(center.dx - 4, center.dy - 12)
      ..lineTo(center.dx - 14, 2)
      ..lineTo(center.dx + 14, 2)
      ..lineTo(center.dx + 4, center.dy - 12)
      ..close();
    canvas.drawPath(beamPath, beamPaint);

    // 2. Drop Shadow
    final shadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.35)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4.0);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: center + const Offset(0, 2), width: 14, height: 38),
        const Radius.circular(6),
      ),
      shadowPaint,
    );

    // 3. Handlebars
    final barPaint = Paint()
      ..color = const Color(0xFF334155)
      ..strokeWidth = 3.5
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(center.dx - 11, center.dy - 8),
      Offset(center.dx + 11, center.dy - 8),
      barPaint,
    );
    final mirrorPaint = Paint()..color = Colors.white;
    canvas.drawCircle(Offset(center.dx - 11, center.dy - 10), 2.0, mirrorPaint);
    canvas.drawCircle(Offset(center.dx + 11, center.dy - 10), 2.0, mirrorPaint);

    // 4. Bike Body Frame
    final bodyPaint = Paint()..color = bikeColor;
    final bodyPath = Path()
      ..moveTo(center.dx, center.dy - 18)
      ..lineTo(center.dx - 5.5, center.dy - 8)
      ..lineTo(center.dx - 4.5, center.dy + 8)
      ..lineTo(center.dx - 2.5, center.dy + 18)
      ..lineTo(center.dx + 2.5, center.dy + 18)
      ..lineTo(center.dx + 4.5, center.dy + 8)
      ..lineTo(center.dx + 5.5, center.dy - 8)
      ..close();
    canvas.drawPath(bodyPath, bodyPaint);

    final borderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    canvas.drawPath(bodyPath, borderPaint);

    // 5. Rider Helmet
    final helmetPaint = Paint()..color = Colors.white;
    canvas.drawCircle(Offset(center.dx, center.dy - 1), 5.5, helmetPaint);
    final visorPaint = Paint()..color = const Color(0xFF0F172A);
    final visorPath = Path()
      ..moveTo(center.dx - 4, center.dy - 3)
      ..lineTo(center.dx + 4, center.dy - 3)
      ..lineTo(center.dx + 3.5, center.dy - 1)
      ..lineTo(center.dx - 3.5, center.dy - 1)
      ..close();
    canvas.drawPath(visorPath, visorPaint);

    // 6. Headlight
    final lightPaint = Paint()..color = const Color(0xFFFFF9C4);
    canvas.drawCircle(Offset(center.dx, center.dy - 16), 2.5, lightPaint);

    // 7. Red Tail Brake Light
    final tailPaint = Paint()..color = const Color(0xFFEF4444);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(center.dx, center.dy + 18), width: 4.5, height: 2),
        const Radius.circular(1),
      ),
      tailPaint,
    );

    // 8. Front Direction Arrow
    final arrowPaint = Paint()..color = Colors.white;
    final arrowPath = Path()
      ..moveTo(center.dx, center.dy - 22)
      ..lineTo(center.dx - 3.5, center.dy - 18)
      ..lineTo(center.dx + 3.5, center.dy - 18)
      ..close();
    canvas.drawPath(arrowPath, arrowPaint);

    final picture = recorder.endRecording();
    final img = await picture.toImage(size.toInt(), size.toInt());
    final byteData = await img.toByteData(format: ui.ImageByteFormat.png);
    return byteData!.buffer.asUint8List();
  }

  static Future<Uint8List> createCircleMarkerBytes({
    required Color fillColor,
    required Color strokeColor,
    double size = 48.0,
    double strokeWidth = 3.5,
  }) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder, Rect.fromLTWH(0, 0, size, size));

    final shadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.3)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4.0);

    final center = Offset(size / 2, size / 2);
    final radius = (size / 2) - strokeWidth - 2;

    // Drop Shadow
    canvas.drawCircle(center + const Offset(0, 2), radius, shadowPaint);

    // Main Fill
    final fillPaint = Paint()..color = fillColor;
    canvas.drawCircle(center, radius, fillPaint);

    // White Core or Dot
    final corePaint = Paint()..color = Colors.white;
    canvas.drawCircle(center, radius * 0.35, corePaint);

    // Outer Stroke
    final strokePaint = Paint()
      ..color = strokeColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    canvas.drawCircle(center, radius, strokePaint);

    final picture = recorder.endRecording();
    final img = await picture.toImage(size.toInt(), size.toInt());
    final byteData = await img.toByteData(format: ui.ImageByteFormat.png);
    return byteData!.buffer.asUint8List();
  }

  static Future<Uint8List> createStopMarkerBytes({
    required int stopNumber,
    double size = 44.0,
  }) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder, Rect.fromLTWH(0, 0, size, size));

    final center = Offset(size / 2, size / 2);
    final radius = (size / 2) - 4;

    // Amber circle
    final fillPaint = Paint()..color = const Color(0xFFF59E0B);
    canvas.drawCircle(center, radius, fillPaint);

    // White border
    final strokePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;
    canvas.drawCircle(center, radius, strokePaint);

    // Number text painter
    final textPainter = TextPainter(
      text: TextSpan(
        text: '$stopNumber',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    textPainter.paint(
      canvas,
      Offset(center.dx - (textPainter.width / 2), center.dy - (textPainter.height / 2)),
    );

    final picture = recorder.endRecording();
    final img = await picture.toImage(size.toInt(), size.toInt());
    final byteData = await img.toByteData(format: ui.ImageByteFormat.png);
    return byteData!.buffer.asUint8List();
  }
}

/// Unified Production Mappls Native Vector Map Widget (mappls_gl)
/// Renders 60 FPS hardware-accelerated Mappls vector tiles with routes, markers & geofences.
class MapplsNativeMap extends StatefulWidget {
  final ll.LatLng initialCenter;
  final double initialZoom;
  final List<ll.LatLng> routePoints;
  final ll.LatLng? startLocation;
  final ll.LatLng? endLocation;
  final List<ll.LatLng> stopLocations;
  final List<String> stopLabels;
  final ll.LatLng? currentLocation;
  final double? heading;
  final ll.LatLng? circleCenter;
  final double? circleRadiusMeters;
  final bool isNavigationMode;
  final bool isTwoWheeler;
  final bool interactive;
  final bool isDark;
  final void Function(mappls.MapplsMapController controller)? onMapCreated;
  final void Function(ll.LatLng point)? onMapClick;
  final Widget? overlay;

  const MapplsNativeMap({
    super.key,
    required this.initialCenter,
    this.initialZoom = 14.5,
    this.routePoints = const [],
    this.startLocation,
    this.endLocation,
    this.stopLocations = const [],
    this.stopLabels = const [],
    this.currentLocation,
    this.heading,
    this.circleCenter,
    this.circleRadiusMeters,
    this.isNavigationMode = false,
    this.isTwoWheeler = false,
    this.interactive = true,
    this.isDark = false,
    this.onMapCreated,
    this.onMapClick,
    this.overlay,
  });

  @override
  State<MapplsNativeMap> createState() => _MapplsNativeMapState();
}

class _MapplsNativeMapState extends State<MapplsNativeMap> {
  mappls.MapplsMapController? _controller;
  final NavigationIntroController _navIntro = NavigationIntroController();
  bool _styleLoaded = false;
  bool _imagesRegistered = false;
  mappls.Line? _routeLine;
  mappls.Circle? _geofenceCircle;
  mappls.Symbol? _vehicleSymbol;
  final List<mappls.Symbol> _symbols = [];

  static const String _iconStart = 'carq_start_marker';
  static const String _iconEnd = 'carq_end_marker';
  static const String _iconVehicleCar = 'carq_vehicle_car';
  static const String _iconVehicleBike = 'carq_vehicle_bike';

  @override
  void dispose() {
    _navIntro.dispose();
    super.dispose();
  }

  Future<void> _applyMapplsThemeStyle() async {
    // Theme style is bound via mapplsStyle on MapplsMap initialization
  }

  @override
  void didUpdateWidget(covariant MapplsNativeMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_styleLoaded || _controller == null) return;

    if (oldWidget.isDark != widget.isDark) {
      _applyMapplsThemeStyle();
    }

    final routeChanged = !listEquals(oldWidget.routePoints, widget.routePoints) ||
        oldWidget.startLocation != widget.startLocation ||
        oldWidget.endLocation != widget.endLocation ||
        !listEquals(oldWidget.stopLocations, widget.stopLocations) ||
        oldWidget.circleCenter != widget.circleCenter ||
        oldWidget.circleRadiusMeters != widget.circleRadiusMeters ||
        oldWidget.isTwoWheeler != widget.isTwoWheeler;

    if (routeChanged) {
      _syncLayers();
    } else if (widget.currentLocation != oldWidget.currentLocation ||
        widget.heading != oldWidget.heading) {
      if (widget.isNavigationMode && widget.currentLocation != null && widget.currentLocation!.latitude != 0.0) {
        _navIntro.follow(widget.currentLocation!, widget.heading ?? 0.0);
      } else {
        _updateVehiclePosition();
      }
    } else if (!widget.interactive &&
        oldWidget.initialCenter != widget.initialCenter &&
        widget.initialCenter.latitude != 0.0) {
      try {
        _controller!.animateCamera(
          mappls.CameraUpdate.newLatLngZoom(
            mappls.LatLng(widget.initialCenter.latitude, widget.initialCenter.longitude),
            widget.initialZoom,
          ),
        );
      } catch (_) {}
    }
    if (widget.isNavigationMode && oldWidget.isTwoWheeler != widget.isTwoWheeler) {
      final pos = widget.currentLocation ?? widget.startLocation ?? widget.initialCenter;
      _navIntro.changeVehicle(pos, widget.isTwoWheeler);
    }
  }

  Future<void> _updateVehiclePosition() async {
    if (_controller == null || !_styleLoaded) return;
    if (widget.currentLocation == null || widget.currentLocation!.latitude == 0.0) return;

    try {
      if (_vehicleSymbol != null) {
        await _controller!.removeSymbol(_vehicleSymbol!);
        _vehicleSymbol = null;
      }
      final iconName = widget.isTwoWheeler ? _iconVehicleBike : _iconVehicleCar;
      _vehicleSymbol = await _controller!.addSymbol(
        mappls.SymbolOptions(
          geometry: mappls.LatLng(
            widget.currentLocation!.latitude,
            widget.currentLocation!.longitude,
          ),
          iconImage: _imagesRegistered ? iconName : "marker-15",
          iconSize: widget.isTwoWheeler ? 1.05 : 1.15,
          iconRotate: widget.heading ?? 0.0,
        ),
      );
    } catch (_) {}

    if (widget.isNavigationMode) {
      try {
        await _controller!.animateCamera(
          mappls.CameraUpdate.newCameraPosition(
            mappls.CameraPosition(
              target: mappls.LatLng(
                widget.currentLocation!.latitude,
                widget.currentLocation!.longitude,
              ),
              zoom: 17.5,
              tilt: 58.0,
              bearing: widget.heading ?? 0.0,
            ),
          ),
        );
      } catch (_) {}
    }
  }

  Future<void> _registerMarkerImages() async {
    if (_imagesRegistered || _controller == null) return;
    try {
      final startBytes = await MapplsMarkerHelper.createCircleMarkerBytes(
        fillColor: const Color(0xFF00E676),
        strokeColor: Colors.white,
        size: 46,
      );
      await _controller!.addImage(_iconStart, startBytes);

      final endBytes = await MapplsMarkerHelper.createCircleMarkerBytes(
        fillColor: const Color(0xFFEF4444),
        strokeColor: Colors.white,
        size: 50,
      );
      await _controller!.addImage(_iconEnd, endBytes);

      final carBytes = await MapplsMarkerHelper.createCarMarkerBytes();
      await _controller!.addImage(_iconVehicleCar, carBytes);

      final bikeBytes = await MapplsMarkerHelper.createBikeMarkerBytes();
      await _controller!.addImage(_iconVehicleBike, bikeBytes);

      _imagesRegistered = true;
    } catch (e) {
      debugPrint('[MapplsNativeMap] Image register notice: $e');
    }
  }

  Future<void> _syncLayers() async {
    if (_controller == null || !_styleLoaded) return;

    await _registerMarkerImages();

    // 1. Clear old annotations
    try {
      if (_routeLine != null) {
        await _controller!.removeLine(_routeLine!);
        _routeLine = null;
      }
      if (_vehicleSymbol != null) {
        await _controller!.removeSymbol(_vehicleSymbol!);
        _vehicleSymbol = null;
      }
      for (final s in _symbols) {
        await _controller!.removeSymbol(s);
      }
      _symbols.clear();

      if (_geofenceCircle != null) {
        await _controller!.removeCircle(_geofenceCircle!);
        _geofenceCircle = null;
      }
    } catch (_) {}

    // 2. Draw Route Polyline
    final cleanRoute = widget.routePoints
        .where((p) => p.latitude != 0.0 && p.longitude != 0.0)
        .map((p) => mappls.LatLng(p.latitude, p.longitude))
        .toList();

    if (cleanRoute.length >= 2) {
      try {
        _routeLine = await _controller!.addLine(
          mappls.LineOptions(
            geometry: cleanRoute,
            lineColor: widget.isNavigationMode ? "#00E676" : "#0066FF",
            lineWidth: 6.0,
            lineOpacity: 0.95,
            lineJoin: "round",
          ),
        );
      } catch (e) {
        debugPrint('[MapplsNativeMap] addLine error: $e');
      }
    }

    // 3. Draw Start & End Markers with clear labels
    final bool hasValidStart = widget.startLocation != null &&
        widget.startLocation!.latitude != 0.0 &&
        widget.startLocation!.longitude != 0.0;
    final bool hasValidEnd = widget.endLocation != null &&
        widget.endLocation!.latitude != 0.0 &&
        widget.endLocation!.longitude != 0.0;

    final effectiveStart = hasValidStart
        ? widget.startLocation
        : (widget.routePoints.isNotEmpty ? widget.routePoints.first : null);
    final effectiveEnd = hasValidEnd
        ? widget.endLocation
        : (widget.routePoints.isNotEmpty ? widget.routePoints.last : null);

    if (!widget.isNavigationMode && effectiveStart != null && effectiveStart.latitude != 0.0) {
      try {
        final symbol = await _controller!.addSymbol(
          mappls.SymbolOptions(
            geometry: mappls.LatLng(effectiveStart.latitude, effectiveStart.longitude),
            iconImage: _imagesRegistered ? _iconStart : "marker-15",
            iconSize: _imagesRegistered ? 1.0 : 1.2,
            textField: "Start",
            textOffset: const Offset(0, 1.2),
            textSize: 12.0,
            textColor: "#00E676",
          ),
        );
        _symbols.add(symbol);
      } catch (_) {}
    }

    if (effectiveEnd != null && effectiveEnd.latitude != 0.0) {
      try {
        final symbol = await _controller!.addSymbol(
          mappls.SymbolOptions(
            geometry: mappls.LatLng(effectiveEnd.latitude, effectiveEnd.longitude),
            iconImage: _imagesRegistered ? _iconEnd : "marker-15",
            iconSize: _imagesRegistered ? 1.0 : 1.2,
            textField: "Destination",
            textOffset: const Offset(0, 1.2),
            textSize: 12.0,
            textColor: "#EF4444",
          ),
        );
        _symbols.add(symbol);
      } catch (_) {}
    }

    // 4. Draw Intermediate Stops with Stop Number labels
    for (int i = 0; i < widget.stopLocations.length; i++) {
      final stop = widget.stopLocations[i];
      if (stop.latitude == 0.0) continue;
      try {
        final stopImgName = 'stop_icon_$i';
        final stopBytes = await MapplsMarkerHelper.createStopMarkerBytes(stopNumber: i + 1);
        await _controller!.addImage(stopImgName, stopBytes);
        final symbol = await _controller!.addSymbol(
          mappls.SymbolOptions(
            geometry: mappls.LatLng(stop.latitude, stop.longitude),
            iconImage: stopImgName,
            iconSize: 0.9,
            textField: i < widget.stopLabels.length ? widget.stopLabels[i] : "Stop ${i + 1}",
            textOffset: const Offset(0, 1.2),
            textSize: 11.0,
            textColor: "#F59E0B",
          ),
        );
        _symbols.add(symbol);
      } catch (_) {}
    }

    // 5. Draw Live Vehicle Location Puck
    await _updateVehiclePosition();

    // 6. Draw Geofence Circle
    if (widget.circleCenter != null &&
        (widget.circleRadiusMeters ?? 0) > 0 &&
        widget.circleCenter!.latitude != 0.0) {
      try {
        _geofenceCircle = await _controller!.addCircle(
          mappls.CircleOptions(
            geometry: mappls.LatLng(
              widget.circleCenter!.latitude,
              widget.circleCenter!.longitude,
            ),
            circleRadius: (widget.circleRadiusMeters! / 8.0).clamp(15.0, 260.0),
            circleColor: "#0066FF",
            circleOpacity: 0.22,
            circleStrokeWidth: 2.2,
            circleStrokeColor: "#0066FF",
          ),
        );
      } catch (_) {}
    }

    // 7. Auto-fit camera or follow vehicle
    if (!widget.isNavigationMode) {
      final List<mappls.LatLng> targets = [];
      if (cleanRoute.length >= 2) {
        targets.addAll(cleanRoute);
      }
      if (effectiveStart != null && effectiveStart.latitude != 0.0) {
        targets.add(mappls.LatLng(effectiveStart.latitude, effectiveStart.longitude));
      }
      if (effectiveEnd != null && effectiveEnd.latitude != 0.0) {
        targets.add(mappls.LatLng(effectiveEnd.latitude, effectiveEnd.longitude));
      }
      for (final s in widget.stopLocations) {
        if (s.latitude != 0.0 && s.longitude != 0.0) {
          targets.add(mappls.LatLng(s.latitude, s.longitude));
        }
      }

      if (targets.length >= 2) {
        double minLat = targets.first.latitude;
        double maxLat = targets.first.latitude;
        double minLng = targets.first.longitude;
        double maxLng = targets.first.longitude;

        for (final p in targets) {
          if (p.latitude < minLat) minLat = p.latitude;
          if (p.latitude > maxLat) maxLat = p.latitude;
          if (p.longitude < minLng) minLng = p.longitude;
          if (p.longitude > maxLng) maxLng = p.longitude;
        }

        if ((maxLat - minLat).abs() > 0.0001 || (maxLng - minLng).abs() > 0.0001) {
          Future.delayed(const Duration(milliseconds: 250), () async {
            if (!mounted || _controller == null) return;
            try {
              await _controller!.animateCamera(
                mappls.CameraUpdate.newLatLngBounds(
                  mappls.LatLngBounds(
                    southwest: mappls.LatLng(minLat, minLng),
                    northeast: mappls.LatLng(maxLat, maxLng),
                  ),
                  left: 48,
                  top: 48,
                  right: 48,
                  bottom: 48,
                ),
              );
            } catch (_) {}
          });
        }
      } else if (targets.length == 1) {
        final singleTarget = targets.first;
        Future.delayed(const Duration(milliseconds: 250), () async {
          if (!mounted || _controller == null) return;
          try {
            await _controller!.animateCamera(
              mappls.CameraUpdate.newLatLngZoom(singleTarget, 14.5),
            );
          } catch (_) {}
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox.expand(
      child: ClipRect(
        child: Stack(
          fit: StackFit.expand,
          children: [
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              bottom: -56, // Offsets native Mappls logo watermark & (i) attribution off-screen below the viewport
              child: mappls.MapplsMap(
                mapplsStyle: widget.isDark ? 'standard_night' : 'standard_day',
                initialCameraPosition: mappls.CameraPosition(
                  target: mappls.LatLng(
                    widget.initialCenter.latitude,
                    widget.initialCenter.longitude,
                  ),
                  zoom: widget.initialZoom,
                ),
                onMapCreated: (controller) {
                  _controller = controller;
                  if (widget.isNavigationMode) {
                    _navIntro.attach(controller);
                  }
                  widget.onMapCreated?.call(controller);
                },
                onMapError: (code, message) {
                  debugPrint('[MapplsNativeMap] Map error ($code): $message');
                },
                onStyleLoadedCallback: () {
                  _styleLoaded = true;
                  _applyMapplsThemeStyle();
                  _syncLayers();
                  if (widget.isNavigationMode) {
                    final start = widget.currentLocation ??
                        widget.startLocation ??
                        (widget.routePoints.isNotEmpty ? widget.routePoints.first : widget.initialCenter);
                    _navIntro.playIntro(
                      start: start,
                      end: widget.endLocation,
                      stops: widget.stopLocations,
                      routePoints: widget.routePoints,
                      isTwoWheeler: widget.isTwoWheeler,
                      heading: widget.heading,
                    );
                  }
                },
                onMapClick: (point, coordinates) {
                  widget.onMapClick?.call(ll.LatLng(coordinates.latitude, coordinates.longitude));
                },
                myLocationEnabled: false,
                compassEnabled: false,
                enableLogoClick: false,
                logoViewMargins: const math.Point(-3000, -3000),
                attributionButtonMargins: const math.Point(-3000, -3000),
                rotateGesturesEnabled: widget.interactive,
                scrollGesturesEnabled: widget.interactive,
                zoomGesturesEnabled: widget.interactive,
                tiltGesturesEnabled: widget.interactive,
                dragEnabled: widget.interactive,
                trackCameraPosition: true,
                gestureRecognizers: widget.interactive
                    ? <Factory<OneSequenceGestureRecognizer>>{
                        Factory<OneSequenceGestureRecognizer>(
                          () => EagerGestureRecognizer(),
                        ),
                      }
                    : null,
              ),
            ),
          // Block external browser redirect when tapping Mappls / MapmyIndia logo watermark or (i) attribution button
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: 52,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () {
                // Absorbs touch so external browser redirect to MapmyIndia is never opened
              },
              child: const SizedBox.expand(),
            ),
          ),
          if (widget.overlay != null) widget.overlay!,
        ],
      ),
    ),
  );
}
}
