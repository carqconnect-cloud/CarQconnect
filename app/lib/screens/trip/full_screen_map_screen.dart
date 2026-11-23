import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart' as ll;
import 'package:mappls_gl/mappls_gl.dart' as mappls;
import '../../theme/app_theme.dart';
import '../bottom_navigation_screen.dart';
import 'interactive_trip_map.dart';

/// Fullscreen Interactive Map Viewer with zoom, layers, and route fitting
class FullScreenMapScreen extends StatefulWidget {
  final ll.LatLng startLocation;
  final ll.LatLng endLocation;
  final List<ll.LatLng> routePoints;
  final List<ll.LatLng> stopLocations;
  final List<String> stopLabels;
  final String startLabel;
  final String endLabel;
  final String? distance;
  final String? duration;
  final String? viaRoute;

  const FullScreenMapScreen({
    super.key,
    required this.startLocation,
    required this.endLocation,
    required this.routePoints,
    this.stopLocations = const [],
    this.stopLabels = const [],
    this.startLabel = 'Start',
    this.endLabel = 'Destination',
    this.distance,
    this.duration,
    this.viaRoute,
  });

  @override
  State<FullScreenMapScreen> createState() => _FullScreenMapScreenState();
}

class _FullScreenMapScreenState extends State<FullScreenMapScreen> {
  mappls.MapplsMapController? _mapplsController;

  String get _routeTitle {
    final startName = widget.startLabel.split(',').first.trim();
    final endName = widget.endLabel.split(',').first.trim();
    if (widget.stopLabels.isEmpty) {
      return '$startName → $endName';
    }
    final stopNames = widget.stopLabels
        .map((s) => s.split(',').first.trim())
        .where((s) => s.isNotEmpty)
        .toList();
    if (stopNames.isEmpty) {
      return '$startName → $endName';
    }
    return '$startName → ${stopNames.join(' → ')} → $endName';
  }

  List<ll.LatLng> get _effectivePoints {
    final validRoute = widget.routePoints
        .where((p) => p.latitude != 0.0 && p.longitude != 0.0)
        .toList();
    if (validRoute.isNotEmpty) {
      return [
        ...validRoute,
        ...widget.stopLocations.where((p) => p.latitude != 0.0 && p.longitude != 0.0),
      ];
    }
    final pts = <ll.LatLng>[];
    if (widget.startLocation.latitude != 0.0 && widget.startLocation.longitude != 0.0) {
      pts.add(widget.startLocation);
    }
    if (widget.endLocation.latitude != 0.0 && widget.endLocation.longitude != 0.0) {
      pts.add(widget.endLocation);
    }
    pts.addAll(widget.stopLocations.where((p) => p.latitude != 0.0 && p.longitude != 0.0));
    return pts;
  }

  void _fitRoute() {
    if (_mapplsController == null) return;
    final points = _effectivePoints;
    if (points.length < 2) return;

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

    if ((maxLat - minLat).abs() < 0.0001 && (maxLng - minLng).abs() < 0.0001) {
      _mapplsController?.animateCamera(
        mappls.CameraUpdate.newLatLngZoom(mappls.LatLng(minLat, minLng), 14.0),
      );
      return;
    }

    _mapplsController?.animateCamera(
      mappls.CameraUpdate.newLatLngBounds(
        mappls.LatLngBounds(
          southwest: mappls.LatLng(minLat, minLng),
          northeast: mappls.LatLng(maxLat, maxLng),
        ),
        left: 56,
        top: 110,
        right: 56,
        bottom: 90,
      ),
    );
  }

  void _zoomIn() {
    _mapplsController?.animateCamera(mappls.CameraUpdate.zoomIn());
  }

  void _zoomOut() {
    _mapplsController?.animateCamera(mappls.CameraUpdate.zoomOut());
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
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _handleBack();
      },
      child: ValueListenableBuilder<bool>(
        valueListenable: AppTheme.isLightNotifier,
        builder: (context, isLight, _) {
          final primaryColor = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF);

          return Scaffold(
            backgroundColor: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF080E16),
            body: SizedBox.expand(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // 1. Fullscreen Map Engine (Mappls Native on Android / FlutterMap on Web)
                  Positioned.fill(
                    child: InteractiveTripMap(
                      startLocation: widget.startLocation,
                      endLocation: widget.endLocation,
                      routePoints: widget.routePoints,
                      stopLocations: widget.stopLocations,
                      stopLabels: widget.stopLabels,
                      startLabel: widget.startLabel,
                      endLabel: widget.endLabel,
                      initialZoom: 12.0,
                      interactive: true,
                      onMapplsMapCreated: (ctrl) {
                        _mapplsController = ctrl;
                        Future.delayed(const Duration(milliseconds: 300), _fitRoute);
                      },
                    ),
                  ),

                  // 2. Top Header Floating Island
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    child: SafeArea(
                      bottom: false,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: isLight
                                ? Colors.white.withValues(alpha: 0.95)
                                : const Color(0xFF0C131D).withValues(alpha: 0.92),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D3E),
                              width: 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: isLight ? 0.08 : 0.4),
                                blurRadius: 16,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              // Back / Close Button
                              GestureDetector(
                                onTap: _handleBack,
                                child: Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF152232),
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF22364E),
                                    ),
                                  ),
                                  child: Icon(
                                    Icons.close_rounded,
                                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    size: 20,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),

                              // Title & Route Info
                              Expanded(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _routeTitle,
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    if (widget.viaRoute != null && widget.viaRoute!.isNotEmpty)
                                      Text(
                                        widget.viaRoute!,
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF7E8E9F),
                                          fontSize: 11.5,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                  ],
                                ),
                              ),

                              if (widget.distance != null)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? const Color(0xFFEFF6FF)
                                        : const Color(0xFF00C2FF).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: isLight
                                          ? const Color(0xFFBFDBFE)
                                          : const Color(0xFF00C2FF).withValues(alpha: 0.3),
                                    ),
                                  ),
                                  child: Text(
                                    widget.distance!,
                                    style: TextStyle(
                                      color: primaryColor,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),

                  // 3. Floating Map Controls (Right Side)
                  Positioned(
                    right: 18,
                    bottom: 40,
                    child: SafeArea(
                      top: false,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Re-center / Fit bounds
                          _buildMapButton(
                            icon: Icons.center_focus_strong_rounded,
                            tooltip: 'Fit Route',
                            color: primaryColor,
                            isLight: isLight,
                            onTap: _fitRoute,
                          ),
                          const SizedBox(height: 10),

                          // Zoom In
                          _buildMapButton(
                            icon: Icons.add_rounded,
                            tooltip: 'Zoom In',
                            isLight: isLight,
                            onTap: _zoomIn,
                          ),
                          const SizedBox(height: 8),

                          // Zoom Out
                          _buildMapButton(
                            icon: Icons.remove_rounded,
                            tooltip: 'Zoom Out',
                            isLight: isLight,
                            onTap: _zoomOut,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildMapButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
    required bool isLight,
    Color? color,
  }) {
    final effectiveColor = color ?? (isLight ? const Color(0xFF0F172A) : Colors.white);

    return GestureDetector(
      onTap: onTap,
      child: Tooltip(
        message: tooltip,
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: isLight
                ? Colors.white.withValues(alpha: 0.95)
                : const Color(0xFF0C131D).withValues(alpha: 0.92),
            shape: BoxShape.circle,
            border: Border.all(
              color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D3E),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isLight ? 0.08 : 0.35),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Icon(icon, color: effectiveColor, size: 22),
        ),
      ),
    );
  }
}
