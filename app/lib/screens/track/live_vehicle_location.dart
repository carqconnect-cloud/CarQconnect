import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:mappls_gl/mappls_gl.dart' as mappls;

import '../../globals.dart';
import '../../utils/map_config.dart';
import '../../widgets/mappls_native_map.dart';
import '../trip/trip_service.dart';
import 'track_models.dart';
import 'track_service.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../utils/app_icons.dart';
import '../../services/screen_refresh_service.dart';
import '../../widgets/animated_back_arrow.dart';

class LiveVehicleLocationScreen extends StatefulWidget {
  final Map<String, dynamic>? vehicle;
  final LatLng? initialPosition;

  const LiveVehicleLocationScreen({
    super.key,
    this.vehicle,
    this.initialPosition,
  });

  @override
  State<LiveVehicleLocationScreen> createState() =>
      _LiveVehicleLocationScreenState();
}

class _LiveVehicleLocationScreenState extends State<LiveVehicleLocationScreen>
    with
        SingleTickerProviderStateMixin,
        RefreshOnRouteReturn<LiveVehicleLocationScreen> {
  late final MapController _mapController;
  mappls.MapplsMapController? _nativeMapplsController;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  late LatLng _currentPos;
  String _address = 'Loading location...';
  String _lastUpdated = 'Just now';
  int _speed = 0;
  final String _direction = 'N';
  String _status = 'Parked & Secured';
  bool _isRefreshing = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
    _currentPos = widget.initialPosition ?? const LatLng(22.7196, 75.8577);

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    _pulseAnimation = Tween<double>(begin: 0.85, end: 1.3).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _loadRealLocation();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _animateMapTo(LatLng pos, [double zoom = 16.0]) {
    try {
      if (_nativeMapplsController != null) {
        _nativeMapplsController?.animateCamera(
          mappls.CameraUpdate.newLatLngZoom(
            mappls.LatLng(pos.latitude, pos.longitude),
            zoom,
          ),
        );
      } else {
        _mapController.move(pos, zoom);
      }
    } catch (e) {
      debugPrint('Map animate camera error: $e');
    }
  }

  Future<void> _loadRealLocation() async {
    setState(() => _isLoading = true);
    try {
      final pos = await TrackService.getLivePosition();
      final addr = await TrackService.getLiveAddress(pos);

      if (mounted) {
        setState(() {
          _currentPos = pos;
          _address = addr;
          _status = 'Stationary • Protected';
          _speed = 0;
          _lastUpdated = 'Just now';
          _isLoading = false;
        });
        _animateMapTo(pos, 16.0);
      }
    } catch (e) {
      debugPrint('Error loading real location: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _address = 'Location Unavailable';
        });
      }
    }
  }

  Future<void> _refreshTelemetry() async {
    setState(() => _isRefreshing = true);
    try {
      final pos = await TrackService.getLivePosition();
      final addr = await TrackService.getLiveAddress(pos);

      if (mounted) {
        final isLight = AppTheme.isLightNotifier.value;
        setState(() {
          _currentPos = pos;
          _address = addr;
          _lastUpdated = 'Just now';
          _isRefreshing = false;
        });
        _animateMapTo(pos, 16.0);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: isLight
                ? const Color(0xFF0F172A)
                : const Color(0xFF101726),
            content: const Row(
              children: [
                Icon(Icons.check_circle, color: Color(0xFF00E676), size: 18),
                SizedBox(width: 8),
                Text(
                  'Live GPS telemetry updated',
                  style: TextStyle(color: Colors.white),
                ),
              ],
            ),
            duration: const Duration(seconds: 1),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
      }
    } catch (_) {
      if (mounted) setState(() => _isRefreshing = false);
    }
  }

  @override
  Future<void> refreshOnRouteReturn() => _refreshTelemetry();

  @override
  Widget build(BuildContext context) {
    final vehicleName =
        widget.vehicle?['name'] ??
        (Globals.vehicleModel.isNotEmpty ? Globals.vehicleModel : 'Vehicle');
    final vehicleReg =
        widget.vehicle?['regNumber'] ?? Globals.vehicleRegistration;

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Scaffold(
          backgroundColor: isLight
              ? const Color(0xFFF8FAFC)
              : const Color(0xFF090E17),
          body: _isLoading
              ? Center(
                  child: AppLoadingSpinner(
                    size: 80,
                    primaryColor: isLight
                        ? const Color(0xFF0066FF)
                        : const Color(0xFF00C2FF),
                  ),
                )
              : SizedBox.expand(
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      // 1. Real Interactive Mappls Native Vector Map on Mobile, FlutterMap on Web
                      if (!kIsWeb &&
                          (defaultTargetPlatform == TargetPlatform.android ||
                              defaultTargetPlatform == TargetPlatform.iOS))
                        Positioned.fill(
                          child: MapplsNativeMap(
                            initialCenter: _currentPos,
                            initialZoom: 16.0,
                            currentLocation: _currentPos,
                            isDark: !isLight,
                            interactive: true,
                            onMapCreated: (ctrl) {
                              _nativeMapplsController = ctrl;
                            },
                          ),
                        )
                    else
                      Positioned.fill(
                        child: FlutterMap(
                        mapController: _mapController,
                        options: MapOptions(
                          initialCenter: _currentPos,
                          initialZoom: 16.0,
                          minZoom: 4.0,
                          maxZoom: 19.0,
                        ),
                        children: [
                          MapConfig.buildTileLayer(
                            userAgentPackageName: 'com.carqconnect.app',
                            maxZoom: 20,
                          ),
                          MarkerLayer(
                            markers: [
                              Marker(
                                point: _currentPos,
                                width: 100,
                                height: 100,
                                child: Stack(
                                  alignment: Alignment.center,
                                  children: [
                                    // Animated Outer Pulse Glow
                                    AnimatedBuilder(
                                      animation: _pulseAnimation,
                                      builder: (context, child) {
                                        final ringColor = isLight
                                            ? const Color(0xFF0066FF)
                                            : const Color(0xFF00C2FF);
                                        return Container(
                                          width: 85 * _pulseAnimation.value,
                                          height: 85 * _pulseAnimation.value,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: ringColor.withValues(
                                              alpha:
                                                  (0.35 / _pulseAnimation.value)
                                                      .clamp(0.0, 1.0),
                                            ),
                                            border: Border.all(
                                              color: ringColor.withValues(
                                                alpha:
                                                    (0.6 /
                                                            _pulseAnimation
                                                                .value)
                                                        .clamp(0.0, 1.0),
                                              ),
                                              width: 1.5,
                                            ),
                                          ),
                                        );
                                      },
                                    ),

                                    // Inner Solid Cyan/Blue Ring
                                    Container(
                                      width: 54,
                                      height: 54,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color:
                                            (isLight
                                                    ? const Color(0xFF0066FF)
                                                    : const Color(0xFF00C2FF))
                                                .withValues(alpha: 0.25),
                                        border: Border.all(
                                          color: isLight
                                              ? const Color(0xFF0066FF)
                                              : const Color(0xFF00C2FF),
                                          width: 2.2,
                                        ),
                                      ),
                                    ),

                                    // Vehicle Marker (Bike or Car)
                                    vehicleName.toLowerCase().contains(
                                              'splendor',
                                            ) ||
                                            vehicleName.toLowerCase().contains(
                                              'bike',
                                            ) ||
                                            vehicleName.toLowerCase().contains(
                                              'motorcycle',
                                            )
                                        ? Container(
                                            width: 38,
                                            height: 38,
                                            decoration: BoxDecoration(
                                              color: isLight
                                                  ? const Color(0xFF0066FF)
                                                  : const Color(0xFF00C2FF),
                                              shape: BoxShape.circle,
                                            ),
                                            child: const Center(
                                              child: Icon(
                                                Icons.two_wheeler_rounded,
                                                color: Colors.white,
                                                size: 24,
                                              ),
                                            ),
                                          )
                                        : const TopViewCarWidget(
                                            width: 26,
                                            height: 46,
                                            showGlow: true,
                                          ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // 2. Top Header Bar Over Map
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        padding: EdgeInsets.fromLTRB(
                          16,
                          MediaQuery.of(context).padding.top + 8,
                          16,
                          12,
                        ),
                        decoration: BoxDecoration(
                          color: isLight
                              ? Colors.white.withValues(alpha: 0.95)
                              : const Color(0xFF090E17).withValues(alpha: 0.95),
                          border: Border(
                            bottom: BorderSide(
                              color: isLight
                                  ? const Color(0xFFE2E8F0)
                                  : const Color(0xFF1C273C),
                              width: 1,
                            ),
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 42,
                              height: 42,
                              decoration: BoxDecoration(
                                color: isLight
                                    ? const Color(0xFFF1F5F9)
                                    : const Color(0xFF101726),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isLight
                                      ? const Color(0xFFCBD5E1)
                                      : const Color(0xFF1E2B40),
                                ),
                              ),
                              child: Center(
                                child: AnimatedBackArrowButton(
                                  onTap: () => Navigator.pop(context),
                                  color: isLight
                                      ? const Color(0xFF0F172A)
                                      : Colors.white,
                                ),
                              ),
                            ),
                            Expanded(
                              child: Text(
                                'Live Vehicle Location',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: isLight
                                      ? const Color(0xFF0F172A)
                                      : Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.2,
                                ),
                              ),
                            ),
                            InkWell(
                              onTap: _refreshTelemetry,
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  color: isLight
                                      ? const Color(0xFFF1F5F9)
                                      : const Color(0xFF101726),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isLight
                                        ? const Color(0xFFCBD5E1)
                                        : const Color(0xFF1E2B40),
                                  ),
                                ),
                                child: Center(
                                  child: _isRefreshing
                                      ? SizedBox(
                                          width: 18,
                                          height: 18,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: isLight
                                                ? const Color(0xFF0066FF)
                                                : const Color(0xFF00C2FF),
                                          ),
                                        )
                                      : Icon(
                                          Icons.refresh_rounded,
                                          color: isLight
                                              ? const Color(0xFF0F172A)
                                              : Colors.white,
                                          size: 20,
                                        ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // 3. Floating Map Controls (Right Side)
                    Positioned(
                      top: MediaQuery.of(context).padding.top + 76,
                      right: 16,
                      child: Column(
                        children: [
                          _buildMapControlBtn(
                            icon: Icons.zoom_in_rounded,
                            isLight: isLight,
                            onTap: () {
                              if (_nativeMapplsController != null) {
                                _nativeMapplsController?.animateCamera(mappls.CameraUpdate.zoomIn());
                              } else {
                                try {
                                  final zoom = _mapController.camera.zoom;
                                  _mapController.move(_currentPos, zoom + 1);
                                } catch (_) {}
                              }
                            },
                          ),
                          const SizedBox(height: 10),
                          _buildMapControlBtn(
                            icon: Icons.zoom_out_rounded,
                            isLight: isLight,
                            onTap: () {
                              if (_nativeMapplsController != null) {
                                _nativeMapplsController?.animateCamera(mappls.CameraUpdate.zoomOut());
                              } else {
                                try {
                                  final zoom = _mapController.camera.zoom;
                                  _mapController.move(_currentPos, zoom - 1);
                                } catch (_) {}
                              }
                            },
                          ),
                          const SizedBox(height: 10),
                          _buildMapControlBtn(
                            svgAsset: AppIcons.navigation,
                            isLight: isLight,
                            onTap: () {
                              _animateMapTo(_currentPos, 16.5);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  backgroundColor: isLight
                                      ? const Color(0xFF0F172A)
                                      : const Color(0xFF101726),
                                  content: const Text(
                                    'Centered on vehicle location',
                                    style: TextStyle(color: Colors.white),
                                  ),
                                  duration: const Duration(seconds: 1),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),

                    // 4. Bottom Tracking Telemetry Sheet
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: Container(
                        padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
                        decoration: BoxDecoration(
                          color: isLight
                              ? Colors.white
                              : const Color(0xFF090E17),
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(24),
                          ),
                          border: Border(
                            top: BorderSide(
                              color: isLight
                                  ? const Color(0xFFE2E8F0)
                                  : const Color(0xFF1C273C),
                              width: 1.2,
                            ),
                          ),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Handle Bar
                            Center(
                              child: Container(
                                width: 40,
                                height: 4,
                                decoration: BoxDecoration(
                                  color: isLight
                                      ? const Color(0xFFCBD5E1)
                                      : const Color(0xFF26354D),
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),

                            // Tracking Status Row & Vehicle Name
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 10,
                                      height: 10,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFF00E676),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '$vehicleName ($vehicleReg)',
                                      style: TextStyle(
                                        color: isLight
                                            ? const Color(0xFF0F172A)
                                            : Colors.white,
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  'Updated $_lastUpdated',
                                  style: TextStyle(
                                    color: isLight
                                        ? const Color(0xFF64748B)
                                        : const Color(0xFF8E9BAE),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 14),

                            // Address Card Row
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? const Color(0xFFEFF6FF)
                                        : const Color(0xFF142238),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Center(
                                    child: Icon(
                                      Icons.location_on,
                                      color: isLight
                                          ? const Color(0xFF0066FF)
                                          : const Color(0xFF00C2FF),
                                      size: 22,
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
                                        _address.split(',').first,
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
                                        _address.contains(',')
                                            ? _address
                                                  .substring(
                                                    _address.indexOf(',') + 1,
                                                  )
                                                  .trim()
                                            : _address,
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF64748B)
                                              : const Color(0xFF8E9BAE),
                                          fontSize: 12.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 18),

                            // 3 Telemetry Metrics (Speed, Direction, Status)
                            Row(
                              children: [
                                Expanded(
                                  child: _buildMetricTile(
                                    icon: Icons.speed_rounded,
                                    value: '$_speed km/h',
                                    label: 'Current Speed',
                                    isLight: isLight,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _buildMetricTile(
                                    svgAsset: AppIcons.navigation,
                                    value: _direction,
                                    label: 'Direction',
                                    isLight: isLight,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _buildMetricTile(
                                    svgAsset: AppIcons.route,
                                    value: _status.split('•').first.trim(),
                                    label: 'Status',
                                    isLight: isLight,
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 18),

                            // Two Action Buttons: Refresh & Recenter
                            Row(
                              children: [
                                Expanded(
                                  child: SizedBox(
                                    height: 50,
                                    child: OutlinedButton.icon(
                                      onPressed: _refreshTelemetry,
                                      style: OutlinedButton.styleFrom(
                                        backgroundColor: isLight
                                            ? Colors.white
                                            : const Color(0xFF101726),
                                        side: BorderSide(
                                          color: isLight
                                              ? const Color(0xFFCBD5E1)
                                              : const Color(0xFF1E2B40),
                                        ),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(
                                            25,
                                          ),
                                        ),
                                      ),
                                      icon: _isRefreshing
                                          ? SizedBox(
                                              width: 16,
                                              height: 16,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: isLight
                                                    ? const Color(0xFF0066FF)
                                                    : Colors.white,
                                              ),
                                            )
                                          : AppIcons.svg(
                                              AppIcons.refresh,
                                              color: isLight
                                                  ? const Color(0xFF0F172A)
                                                  : Colors.white,
                                              width: 17,
                                              height: 17,
                                            ),
                                      label: Text(
                                        'Refresh',
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF0F172A)
                                              : Colors.white,
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: SizedBox(
                                    height: 50,
                                    child: ElevatedButton.icon(
                                      onPressed: () async {
                                        _animateMapTo(_currentPos, 17.0);
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: const Row(
                                              children: [
                                                SizedBox(
                                                  width: 16,
                                                  height: 16,
                                                  child: CircularProgressIndicator(
                                                    strokeWidth: 2,
                                                    color: Colors.white,
                                                  ),
                                                ),
                                                SizedBox(width: 12),
                                                Text('Opening turn-by-turn navigation...'),
                                              ],
                                            ),
                                            duration: const Duration(seconds: 2),
                                            behavior: SnackBarBehavior.floating,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                          ),
                                        );
                                        final launched = await TripService.launchMapplsNavigation(
                                          toLat: _currentPos.latitude,
                                          toLng: _currentPos.longitude,
                                          destinationName: widget.vehicle?['regNumber'] ?? 'Vehicle Location',
                                        );
                                        if (!launched && mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: const Text('Could not open map navigation application.'),
                                              backgroundColor: Colors.red,
                                              behavior: SnackBarBehavior.floating,
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(12),
                                              ),
                                            ),
                                          );
                                        }
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: isLight
                                            ? const Color(0xFF0066FF)
                                            : const Color(0xFF00C2FF),
                                        foregroundColor: isLight
                                            ? Colors.white
                                            : Colors.black,
                                        elevation: 0,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(
                                            25,
                                          ),
                                        ),
                                      ),
                                      icon: AppIcons.svg(
                                        AppIcons.navigation,
                                        color: isLight
                                            ? Colors.white
                                            : Colors.black,
                                        width: 17,
                                        height: 17,
                                      ),
                                      label: Text(
                                        'Navigate',
                                        style: TextStyle(
                                          color: isLight
                                              ? Colors.white
                                              : Colors.black,
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
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

  Widget _buildMetricTile({
    IconData? icon,
    String? svgAsset,
    required String value,
    required String label,
    required bool isLight,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF101726),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Column(
        children: [
          svgAsset != null
              ? AppIcons.svg(
                  svgAsset,
                  color: isLight
                      ? const Color(0xFF0066FF)
                      : const Color(0xFF00C2FF),
                  width: 20,
                  height: 20,
                )
              : Icon(
                  icon,
                  color: isLight
                      ? const Color(0xFF0066FF)
                      : const Color(0xFF00C2FF),
                  size: 20,
                ),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: isLight
                  ? const Color(0xFF64748B)
                  : const Color(0xFF8E9BAE),
              fontSize: 10.5,
            ),
          ),
        ],
      ),
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
              ? Colors.white.withValues(alpha: 0.95)
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
