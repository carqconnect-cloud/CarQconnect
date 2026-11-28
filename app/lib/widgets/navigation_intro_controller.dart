import 'dart:math' as math;
import 'dart:typed_data';

import 'package:latlong2/latlong.dart';
import 'package:mappls_gl/mappls_gl.dart' as mappls;
import 'mappls_native_map.dart';

/// Google-Maps-style navigation intro for the native Mappls map.
///
/// 1. Overview of the whole route (already visible).
/// 2. Camera flies in: zoom 17, tilt 60, bearing = route direction.
/// 3. Vehicle icon (bike / car) is shown and followed.
///
/// Usage inside MapplsNativeMap state:
///   final _nav = NavigationIntroController();
///   onMapCreated      -> _nav.attach(controller);
///   onStyleLoaded     -> _nav.playIntro(...)
///   currentLocation   -> _nav.follow(...)
///   dispose           -> _nav.dispose();
class NavigationIntroController {
  static const String carAsset = 'assets/images/car_scan_frame_0.png';
  static const String bikeAsset = 'assets/vehicles/bike_top.png';

  static const double navZoom = 17.5;
  static const double navTilt = 58.0;

  mappls.MapplsMapController? _ctrl;
  mappls.Symbol? _vehicle;
  bool _introPlayed = false;
  bool _disposed = false;

  bool get introPlayed => _introPlayed;

  void attach(mappls.MapplsMapController controller) {
    _ctrl = controller;
  }

  /// Call again if the navigation screen is re-opened with the same map.
  void reset() {
    _introPlayed = false;
    _vehicle = null;
  }

  /// Plays the fly-in animation. Safe to call more than once; runs only once
  /// until [reset] is called.
  Future<void> playIntro({
    required LatLng start,
    required List<LatLng> routePoints,
    required bool isTwoWheeler,
    double? heading,
    LatLng? end,
    List<LatLng>? stops,
    Duration overviewHold = const Duration(milliseconds: 900),
    Duration flyDuration = const Duration(milliseconds: 2200),
  }) async {
    final c = _ctrl;
    if (c == null || _introPlayed || _disposed) return;
    _introPlayed = true;

    try {
      final bearing = _initialBearing(start, routePoints, heading);
      await _addVehicle(c, start, isTwoWheeler, bearing);

      // 1. Gather all points that define the complete trip route overview (Screenshot 1)
      final List<mappls.LatLng> overviewPoints = [];
      for (final p in routePoints) {
        if (p.latitude != 0.0 || p.longitude != 0.0) {
          overviewPoints.add(mappls.LatLng(p.latitude, p.longitude));
        }
      }
      if (overviewPoints.isEmpty) {
        overviewPoints.add(mappls.LatLng(start.latitude, start.longitude));
        if (end != null && (end.latitude != 0.0 || end.longitude != 0.0)) {
          overviewPoints.add(mappls.LatLng(end.latitude, end.longitude));
        }
      }
      if (stops != null) {
        for (final s in stops) {
          if (s.latitude != 0.0 || s.longitude != 0.0) {
            overviewPoints.add(mappls.LatLng(s.latitude, s.longitude));
          }
        }
      }

      if (overviewPoints.length >= 2) {
        double minLat = overviewPoints.first.latitude;
        double maxLat = overviewPoints.first.latitude;
        double minLng = overviewPoints.first.longitude;
        double maxLng = overviewPoints.first.longitude;

        for (final p in overviewPoints) {
          if (p.latitude < minLat) minLat = p.latitude;
          if (p.latitude > maxLat) maxLat = p.latitude;
          if (p.longitude < minLng) minLng = p.longitude;
          if (p.longitude > maxLng) maxLng = p.longitude;
        }

        // Set wide route overview (Screenshot 1)
        await c.animateCamera(
          mappls.CameraUpdate.newLatLngBounds(
            mappls.LatLngBounds(
              southwest: mappls.LatLng(minLat, minLng),
              northeast: mappls.LatLng(maxLat, maxLng),
            ),
            left: 56,
            top: 110,
            right: 56,
            bottom: 140,
          ),
          duration: const Duration(milliseconds: 350),
        );
      }

      // 2. Let the user see the wide route for a moment (Screenshot 1)
      await Future.delayed(overviewHold);
      if (_disposed) return;

      // 3. Smooth fly-in zoom & 3D tilt directly to vehicle at exact navigation zoom (Screenshot 2)
      await c.animateCamera(
        mappls.CameraUpdate.newCameraPosition(
          mappls.CameraPosition(
            target: mappls.LatLng(start.latitude, start.longitude),
            zoom: navZoom,
            tilt: navTilt,
            bearing: bearing,
          ),
        ),
        duration: flyDuration,
      );
    } catch (_) {
      // Never crash navigation because of a visual effect.
    }
  }

  /// Move the vehicle icon and keep the camera behind it (heading-up).
  Future<void> follow(LatLng position, double heading) async {
    final c = _ctrl;
    if (c == null || _disposed || !_introPlayed) return;
    final pos = mappls.LatLng(position.latitude, position.longitude);

    try {
      final v = _vehicle;
      if (v != null) {
        await c.updateSymbol(
          v,
          mappls.SymbolOptions(
            geometry: pos,
            iconRotate: heading,
          ),
        );
      }
      await c.animateCamera(
        mappls.CameraUpdate.newCameraPosition(
          mappls.CameraPosition(
            target: pos,
            zoom: navZoom,
            tilt: navTilt,
            bearing: heading,
          ),
        ),
        duration: const Duration(milliseconds: 800),
      );
    } catch (_) {}
  }

  /// Re-center camera behind the vehicle
  Future<void> recenter(LatLng position, double heading) async {
    final c = _ctrl;
    if (c == null || _disposed) return;
    final pos = mappls.LatLng(position.latitude, position.longitude);
    try {
      await c.animateCamera(
        mappls.CameraUpdate.newCameraPosition(
          mappls.CameraPosition(
            target: pos,
            zoom: navZoom,
            tilt: navTilt,
            bearing: heading,
          ),
        ),
      );
    } catch (_) {}
  }

  /// Switch icon if the vehicle type changes while the map is alive.
  Future<void> changeVehicle(LatLng position, bool isTwoWheeler) async {
    final c = _ctrl;
    if (c == null || _disposed) return;
    try {
      if (_vehicle != null) {
        await c.removeSymbol(_vehicle!);
        _vehicle = null;
      }
      await _addVehicle(c, position, isTwoWheeler, 0.0);
    } catch (_) {}
  }

  Future<void> _addVehicle(
    mappls.MapplsMapController c,
    LatLng at,
    bool isTwoWheeler,
    double initialBearing,
  ) async {
    final imageName = isTwoWheeler ? 'carq_vehicle_bike' : 'carq_vehicle_car';

    final Uint8List bytes = isTwoWheeler
        ? await MapplsMarkerHelper.createBikeMarkerBytes()
        : await MapplsMarkerHelper.createCarMarkerBytes();

    try {
      await c.addImage(imageName, bytes);
    } catch (_) {}

    try {
      if (_vehicle != null) {
        await c.removeSymbol(_vehicle!);
        _vehicle = null;
      }
      _vehicle = await c.addSymbol(
        mappls.SymbolOptions(
          geometry: mappls.LatLng(at.latitude, at.longitude),
          iconImage: imageName,
          iconSize: isTwoWheeler ? 1.05 : 1.15,
          iconRotate: initialBearing,
        ),
      );
    } catch (_) {}
  }

  /// Uses a route point ~20 m ahead for a stable direction.
  double _initialBearing(LatLng start, List<LatLng> route, double? heading) {
    if (route.length >= 2) {
      final from = route.first;
      for (final p in route.skip(1)) {
        final dLat = (p.latitude - from.latitude) * 111320;
        final dLon = (p.longitude - from.longitude) *
            111320 *
            math.cos(from.latitude * math.pi / 180);
        if (math.sqrt(dLat * dLat + dLon * dLon) > 20) {
          return bearingBetween(
            from.latitude,
            from.longitude,
            p.latitude,
            p.longitude,
          );
        }
      }
      final last = route.last;
      return bearingBetween(
        from.latitude,
        from.longitude,
        last.latitude,
        last.longitude,
      );
    }
    return heading ?? 0;
  }

  static double bearingBetween(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    final p1 = lat1 * math.pi / 180;
    final p2 = lat2 * math.pi / 180;
    final dl = (lon2 - lon1) * math.pi / 180;
    final y = math.sin(dl) * math.cos(p2);
    final x = math.cos(p1) * math.sin(p2) -
        math.sin(p1) * math.cos(p2) * math.cos(dl);
    return (math.atan2(y, x) * 180 / math.pi + 360) % 360;
  }

  void dispose() {
    _disposed = true;
    _ctrl = null;
    _vehicle = null;
  }
}
