import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:mappls_gl/mappls_gl.dart' as mappls;
import '../../utils/map_config.dart';
import '../../widgets/mappls_native_map.dart';
import 'track_models.dart';
import 'alert_settings.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_icons.dart';
import '../../widgets/animated_back_arrow.dart';

class SetGeofenceScreen extends StatefulWidget {
  final String initialName;
  final String initialAddress;
  final double initialRadius;

  final LatLng? initialPosition;

  const SetGeofenceScreen({
    super.key,
    this.initialName = 'My Zone',
    this.initialAddress = '',
    this.initialRadius = 500,
    this.initialPosition,
  });

  @override
  State<SetGeofenceScreen> createState() => _SetGeofenceScreenState();
}

class _SetGeofenceScreenState extends State<SetGeofenceScreen> {
  late String _name;
  late String _address;
  late double _radiusMeters;
  late LatLng _centerPos;
  final MapController _mapController = MapController();
  mappls.MapplsMapController? _nativeMapplsController;

  // Preset steps: 100m, 500m, 1000m, 2000m, 5000m
  final List<double> _steps = [100, 500, 1000, 2000, 5000];
  final List<String> _stepLabels = ['100 m', '500 m', '1 km', '2 km', '5 km'];

  @override
  void initState() {
    super.initState();
    _name = widget.initialName;
    _address = widget.initialAddress;
    _radiusMeters = widget.initialRadius;
    _centerPos = widget.initialPosition ?? const LatLng(22.7196, 75.8577);
  }

  double _zoomForRadius(double radiusMeters) {
    if (radiusMeters <= 200) return 16.5;
    if (radiusMeters <= 500) return 15.5;
    if (radiusMeters <= 1000) return 14.5;
    if (radiusMeters <= 2000) return 13.5;
    return 12.0;
  }

  void _updateRadius(double newRadius) {
    setState(() {
      _radiusMeters = newRadius;
    });
    try {
      _mapController.move(_centerPos, _zoomForRadius(newRadius));
    } catch (_) {}
  }

  int get _closestStepIndex {
    int closest = 0;
    double minDiff = double.infinity;
    for (int i = 0; i < _steps.length; i++) {
      final diff = (_steps[i] - _radiusMeters).abs();
      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    }
    return closest;
  }

  String get _formattedRadius {
    if (_radiusMeters >= 1000) {
      final km = _radiusMeters / 1000;
      return '${km.toStringAsFixed(km.truncateToDouble() == km ? 0 : 1)} km';
    }
    return '${_radiusMeters.toInt()} m';
  }

  void _editLocation() {
    final isLight = AppTheme.isLightNotifier.value;
    final controller = TextEditingController(text: _name);
    final addrController = TextEditingController(text: _address);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Edit Geofence Details',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(ctx),
                  icon: Icon(Icons.close, color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white),
              decoration: InputDecoration(
                labelText: 'Geofence Name',
                labelStyle: TextStyle(color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE)),
                filled: true,
                fillColor: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF142238),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: addrController,
              style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white),
              decoration: InputDecoration(
                labelText: 'Location / Address',
                labelStyle: TextStyle(color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE)),
                filled: true,
                fillColor: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF142238),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () {
                  setState(() {
                    _name = controller.text.trim();
                    _address = addrController.text.trim();
                  });
                  Navigator.pop(ctx);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                  foregroundColor: isLight ? Colors.white : Colors.black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
                child: Text(
                  'Save',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isLight ? Colors.white : Colors.black,
                  ),
                ),
              ),
            ),
          ],
        ),
        ),
      ),
    );
  }

  void _saveGeofence() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AlertSettingsScreen(
          geofenceName: _name,
          address: _address,
          radiusMeters: _radiusMeters,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Scaffold(
          backgroundColor: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF090E17),
          body: SizedBox.expand(
            child: Stack(
              fit: StackFit.expand,
              children: [
                // 1. Real Interactive Mappls Native Vector Map on Mobile, FlutterMap on Web
                if (!kIsWeb &&
                    (defaultTargetPlatform == TargetPlatform.android ||
                        defaultTargetPlatform == TargetPlatform.iOS))
                  Positioned.fill(
                    child: MapplsNativeMap(
                      initialCenter: _centerPos,
                      initialZoom: _zoomForRadius(_radiusMeters),
                      circleCenter: _centerPos,
                      circleRadiusMeters: _radiusMeters,
                      currentLocation: _centerPos,
                      isDark: !isLight,
                      onMapCreated: (ctrl) {
                        _nativeMapplsController = ctrl;
                      },
                      onMapClick: (point) {
                        setState(() {
                          _centerPos = point;
                        });
                      },
                    ),
                  )
              else
                Positioned.fill(
                  child: FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _centerPos,
                    initialZoom: _zoomForRadius(_radiusMeters),
                    minZoom: 4.0,
                    maxZoom: 19.0,
                    onPositionChanged: (pos, hasGesture) {
                      if (hasGesture) {
                        _centerPos = pos.center;
                      }
                    },
                  ),
                  children: [
                    MapConfig.buildTileLayer(
                      userAgentPackageName: 'com.carqconnect.app',
                      maxZoom: 20,
                    ),
                    CircleLayer(
                      circles: [
                        CircleMarker(
                          point: _centerPos,
                          radius: _radiusMeters,
                          useRadiusInMeter: true,
                          color: (isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF))
                              .withValues(alpha: 0.18),
                          borderColor: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                          borderStrokeWidth: 2.5,
                        ),
                      ],
                    ),
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: _centerPos,
                          width: 44,
                          height: 44,
                          child: Center(
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2.5),
                              ),
                              child: const Icon(
                                Icons.location_on,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // 3. Top Header Bar Over Map
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                        Expanded(
                          child: Text(
                            'Set Geofence',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ),
                        const SizedBox(width: 44),
                      ],
                    ),
                  ),
                ),
              ),

              // 4. Floating Location Card (Top)
              Positioned(
                top: 100,
                left: 16,
                right: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isLight
                        ? Colors.white
                        : const Color(0xFF101726).withValues(alpha: 0.95),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2B40),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF142238),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Icon(
                            Icons.home_rounded,
                            color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                            size: 22,
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _name,
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _address,
                              style: TextStyle(
                                color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                fontSize: 12.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: _editLocation,
                        icon: Icon(
                          Icons.edit_outlined,
                          color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                          size: 20,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // 5. Floating Map Controls (Right Side)
              Positioned(
                top: 180,
                right: 16,
                child: Column(
                  children: [
                    _buildMapControlBtn(
                      svgAsset: AppIcons.navigation,
                      isLight: isLight,
                      onTap: () {
                        if (_nativeMapplsController != null) {
                          _nativeMapplsController?.animateCamera(
                            mappls.CameraUpdate.newLatLngZoom(
                              mappls.LatLng(_centerPos.latitude, _centerPos.longitude),
                              _zoomForRadius(_radiusMeters),
                            ),
                          );
                        } else {
                          _mapController.move(_centerPos, _zoomForRadius(_radiusMeters));
                        }
                      },
                    ),
                    const SizedBox(height: 10),
                    _buildMapControlBtn(
                      icon: Icons.add,
                      isLight: isLight,
                      onTap: () {
                        if (_nativeMapplsController != null) {
                          _nativeMapplsController?.animateCamera(mappls.CameraUpdate.zoomIn());
                        } else {
                          final z = _mapController.camera.zoom;
                          _mapController.move(_centerPos, (z + 1).clamp(4.0, 19.0));
                        }
                      },
                    ),
                    const SizedBox(height: 10),
                    _buildMapControlBtn(
                      icon: Icons.remove,
                      isLight: isLight,
                      onTap: () {
                        if (_nativeMapplsController != null) {
                          _nativeMapplsController?.animateCamera(mappls.CameraUpdate.zoomOut());
                        } else {
                          final z = _mapController.camera.zoom;
                          _mapController.move(_centerPos, (z - 1).clamp(4.0, 19.0));
                        }
                      },
                    ),
                  ],
                ),
              ),

              // 6. Bottom Radius Controller Sheet
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
                  decoration: BoxDecoration(
                    color: isLight ? Colors.white : const Color(0xFF090E17),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                    border: Border(
                      top: BorderSide(
                        color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                        width: 1.2,
                      ),
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Radius Header Row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Radius',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                              fontSize: 14.5,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            _formattedRadius,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // Step Labels Row: 100 m, 500 m, 1 km, 2 km, 5 km
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: List.generate(_stepLabels.length, (idx) {
                            final isSelected = idx == _closestStepIndex;
                            return InkWell(
                              onTap: () {
                                _updateRadius(_steps[idx]);
                              },
                              child: Text(
                                _stepLabels[idx],
                                style: TextStyle(
                                  color: isSelected
                                      ? (isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF))
                                      : (isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                                  fontSize: 12,
                                  fontWeight: isSelected
                                      ? FontWeight.bold
                                      : FontWeight.w500,
                                ),
                              ),
                            );
                          }),
                        ),
                      ),

                      const SizedBox(height: 14),

                      // Custom Car Slider Track
                      _buildCarSlider(isLight: isLight),

                      const SizedBox(height: 24),

                      // Bottom Next Button
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _saveGeofence,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                            foregroundColor: isLight ? Colors.white : Colors.black,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(26),
                            ),
                          ),
                          child: Center(
                            child: Text(
                              'Next',
                              style: TextStyle(
                                color: isLight ? Colors.white : Colors.black,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.2,
                              ),
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
        ),
      );
    },
  );
}

  Widget _buildCarSlider({required bool isLight}) {
    final activeFraction = (_closestStepIndex / (_steps.length - 1)).clamp(0.0, 1.0);

    return LayoutBuilder(
      builder: (context, constraints) {
        final trackWidth = constraints.maxWidth;
        final thumbOffset = activeFraction * (trackWidth - 44);

        return GestureDetector(
          onHorizontalDragUpdate: (details) {
            final localX = (details.localPosition.dx).clamp(0.0, trackWidth);
            final fraction = localX / trackWidth;
            final targetStep = (fraction * (_steps.length - 1)).round();
            _updateRadius(_steps[targetStep]);
          },
          onTapDown: (details) {
            final fraction = (details.localPosition.dx / trackWidth).clamp(0.0, 1.0);
            final targetStep = (fraction * (_steps.length - 1)).round();
            _updateRadius(_steps[targetStep]);
          },
          child: SizedBox(
            height: 44,
            child: Stack(
              alignment: Alignment.centerLeft,
              children: [
                // Inactive Background Track
                Container(
                  width: trackWidth,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),

                // Active Progress Track
                Container(
                  width: thumbOffset + 20,
                  height: 4,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: isLight
                          ? [const Color(0xFF0066FF), const Color(0xFF3B82F6)]
                          : [const Color(0xFF00C2FF), const Color(0xFF00E5FF)],
                    ),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),

                // Car Thumb with Halo
                Positioned(
                  left: thumbOffset,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                    ),
                    child: Transform.rotate(
                      angle: 1.5708, // 90 degrees horizontal facing forward
                      child: const TopViewCarWidget(
                        width: 18,
                        height: 34,
                        showGlow: false,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMapControlBtn({
    IconData? icon,
    String? svgAsset,
    required VoidCallback onTap,
    required bool isLight,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: isLight
              ? Colors.white
              : const Color(0xFF101726).withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1E2B40),
          ),
        ),
        child: Center(
          child: svgAsset != null
              ? AppIcons.svg(
                  svgAsset,
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  width: 20,
                  height: 20,
                )
              : Icon(
                  icon,
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  size: 20,
                ),
        ),
      ),
    );
  }
}
