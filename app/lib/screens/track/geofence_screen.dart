import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../theme/app_theme.dart';
import '../../utils/map_config.dart';
import '../../widgets/mappls_native_map.dart';
import '../../loading.dart';
import 'track_models.dart';
import 'track_service.dart';
import 'set_geofence.dart';
import '../../utils/app_icons.dart';
import '../../services/screen_refresh_service.dart';
import '../../widgets/animated_back_arrow.dart';

class GeofenceScreen extends StatefulWidget {
  final bool initialEmptyState;
  final Map<String, dynamic>? vehicle;
  final LatLng? initialPosition;

  const GeofenceScreen({
    super.key,
    this.initialEmptyState = false,
    this.vehicle,
    this.initialPosition,
  });

  @override
  State<GeofenceScreen> createState() => _GeofenceScreenState();
}

class _GeofenceScreenState extends State<GeofenceScreen>
    with RefreshOnRouteReturn<GeofenceScreen> {
  late final MapController _mapController;
  late LatLng _currentPos;
  bool _isLoading = true;
  List<GeofenceItem> _geofences = [];
  GeofenceItem? _selectedGeofence;

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
    _currentPos =
        widget.initialPosition ?? const LatLng(22.7533, 75.8937); // Vijay Nagar
    _loadGeofences();
  }

  Future<void> _loadGeofences({bool showSpinner = true}) async {
    if (showSpinner) setState(() => _isLoading = true);
    final items = await TrackService.getGeofences();
    if (mounted) {
      setState(() {
        _geofences = items;
        if (items.isNotEmpty) {
          _selectedGeofence = items.first;
        }

        _isLoading = false;
      });
    }
  }

  void _toggleGeofence(GeofenceItem item, bool val) async {
    setState(() {
      item.isEnabled = val;
    });
    await TrackService.toggleGeofence(item.id, val);
  }

  void _deleteGeofence(GeofenceItem item) async {
    final isLight = AppTheme.isLightNotifier.value;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
          ),
        ),
        title: Text(
          'Delete Geofence',
          style: TextStyle(
            color: isLight ? const Color(0xFF0F172A) : Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Text(
          'Are you sure you want to remove "${item.name}"?',
          style: TextStyle(
            color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: isLight
                    ? const Color(0xFF64748B)
                    : const Color(0xFF8E9BAE),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await TrackService.deleteGeofence(item.id);
      _loadGeofences();
    }
  }

  void _navigateToAddGeofence() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => SetGeofenceScreen(
          initialAddress: _selectedGeofence?.address ?? '',
          initialPosition: _currentPos,
        ),
      ),
    );
    if (result == true) {
      _loadGeofences();
    }
  }

  @override
  Future<void> refreshOnRouteReturn() => _loadGeofences(showSpinner: false);

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        if (_isLoading) {
          return Scaffold(
            backgroundColor: isLight
                ? const Color(0xFFF8FAFC)
                : const Color(0xFF090E17),
            body: Center(
              child: AppLoadingSpinner(
                size: 80,
                primaryColor: isLight
                    ? const Color(0xFF0066FF)
                    : const Color(0xFF00C2FF),
              ),
            ),
          );
        }

        if (_geofences.isEmpty) {
          return _buildEmptyStateView(isLight);
        }
        return _buildActiveGeofencesView(isLight);
      },
    );
  }

  /// Empty State View
  Widget _buildEmptyStateView(bool isLight) {
    return Container(
      decoration: BoxDecoration(
        gradient: isLight ? AppTheme.bgGradient : null,
        color: isLight ? null : const Color(0xFF090E17),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
          leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
          title: Text(
            'Geofence',
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 19,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.2,
            ),
          ),
          actions: [
            IconButton(
              icon: Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: isLight ? Colors.white : const Color(0xFF101726),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isLight
                        ? const Color(0xFFE2E8F0)
                        : const Color(0xFF1E2B40),
                  ),
                  boxShadow: isLight ? AppTheme.cardShadow : null,
                ),
                child: Center(
                  child: AppIcons.svg(
                    AppIcons.plus,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    width: 14,
                    height: 14,
                  ),
                ),
              ),
              onPressed: _navigateToAddGeofence,
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const SizedBox(height: 36),

                      // Holographic 3D Geofence Graphic
                      Center(
                        child: SizedBox(
                          width: 220,
                          height: 220,
                          child: CustomPaint(
                            painter: GeofenceHologramPainter(isLight: isLight),
                          ),
                        ),
                      ),

                      const SizedBox(height: 32),

                      // Headings
                      Text(
                        'No Geofences Yet',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF0F172A)
                              : Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.2,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Create virtual boundaries to get instant alerts whenever your vehicle enters or exits designated security zones.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF64748B)
                              : const Color(0xFF8E9BAE),
                          fontSize: 14,
                          height: 1.45,
                        ),
                      ),

                      const SizedBox(height: 36),

                      // Add Geofence Button
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _navigateToAddGeofence,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isLight
                                ? const Color(0xFF0066FF)
                                : const Color(0xFF00C2FF),
                            foregroundColor: isLight
                                ? Colors.white
                                : Colors.black,
                            elevation: isLight ? 2 : 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(26),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              AppIcons.svg(
                                AppIcons.plus,
                                color: isLight ? Colors.white : Colors.black,
                                width: 15,
                                height: 15,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Add Geofence',
                                style: TextStyle(
                                  color: isLight ? Colors.white : Colors.black,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Bottom Tip Card
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isLight
                              ? Colors.white
                              : const Color(0xFF101726),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isLight
                                ? const Color(0xFFE2E8F0)
                                : const Color(0xFF1C273C),
                          ),
                          boxShadow: isLight ? AppTheme.cardShadow : null,
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: isLight
                                    ? const Color(0xFFFEF3C7)
                                    : const Color(0xFF2E240D),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: isLight
                                      ? const Color(0xFFFDE68A)
                                      : const Color(0xFF5A4112),
                                ),
                              ),
                              child: Center(
                                child: Icon(
                                  Icons.lightbulb_outline_rounded,
                                  color: isLight
                                      ? const Color(0xFFD97706)
                                      : const Color(0xFFFFB020),
                                  size: 20,
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Text(
                                'Set up geofences for home, office or parking lots to prevent unauthorized movement.',
                                style: TextStyle(
                                  color: isLight
                                      ? const Color(0xFF334155)
                                      : const Color(0xFFCBD5E1),
                                  fontSize: 13,
                                  height: 1.35,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Active Geofences List View with Live Map Circle
  Widget _buildActiveGeofencesView(bool isLight) {
    final activeRadius = _selectedGeofence?.radiusMeters ?? 500;

    return Scaffold(
      backgroundColor: isLight
          ? const Color(0xFFF8FAFC)
          : const Color(0xFF090E17),
      body: Stack(
        children: [
          // 1. Interactive FlutterMap with Geofence Circle Overlay
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: MediaQuery.of(context).size.height * 0.52,
            child: Stack(
              children: [
                if (!kIsWeb &&
                    (defaultTargetPlatform == TargetPlatform.android ||
                        defaultTargetPlatform == TargetPlatform.iOS))
                  Positioned.fill(
                    child: MapplsNativeMap(
                      initialCenter: _currentPos,
                      initialZoom: 15.0,
                      circleCenter: _currentPos,
                      circleRadiusMeters: activeRadius,
                      currentLocation: _currentPos,
                      isDark: !isLight,
                    ),
                  )
                else
                  Positioned.fill(
                    child: FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: _currentPos,
                      initialZoom: 15.0,
                    ),
                    children: [
                      MapConfig.buildTileLayer(
                        userAgentPackageName: 'com.carqconnect.app',
                        maxZoom: 20,
                      ),
                      CircleLayer(
                        circles: [
                          CircleMarker(
                            point: _currentPos,
                            radius: activeRadius,
                            useRadiusInMeter: true,
                            color:
                                (isLight
                                        ? const Color(0xFF0066FF)
                                        : const Color(0xFF00C2FF))
                                    .withValues(alpha: 0.16),
                            borderColor: isLight
                                ? const Color(0xFF0066FF)
                                : const Color(0xFF00C2FF),
                            borderStrokeWidth: 2.2,
                          ),
                        ],
                      ),
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: _currentPos,
                            width: 100,
                            height: 70,
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? const Color(0xFF0066FF)
                                        : const Color(0xFF00C2FF),
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color:
                                            (isLight
                                                    ? const Color(0xFF0066FF)
                                                    : const Color(0xFF00C2FF))
                                                .withValues(alpha: 0.4),
                                        blurRadius: 14,
                                      ),
                                    ],
                                  ),
                                  child: Center(
                                    child: Icon(
                                      _selectedGeofence?.icon ??
                                          Icons.home_rounded,
                                      color: Colors.white,
                                      size: 22,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? Colors.white.withValues(alpha: 0.95)
                                        : const Color(0xFF101726)
                                              .withValues(alpha: 0.95),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: isLight
                                          ? const Color(0xFF0066FF)
                                          : const Color(0xFF00C2FF),
                                    ),
                                    boxShadow: isLight
                                        ? AppTheme.cardShadow
                                        : null,
                                  ),
                                  child: Text(
                                    _selectedGeofence?.name ?? 'Geofence',
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF0F172A)
                                          : Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
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
                ),

                // Floating Map Controls
                Positioned(
                  top: 96,
                  right: 16,
                  child: Column(
                    children: [
                      _buildMapControlBtn(
                        icon: Icons.zoom_in_rounded,
                        isLight: isLight,
                        onTap: () {
                          _mapController.move(
                            _currentPos,
                            _mapController.camera.zoom + 1,
                          );
                        },
                      ),
                      const SizedBox(height: 10),
                      _buildMapControlBtn(
                        icon: Icons.zoom_out_rounded,
                        isLight: isLight,
                        onTap: () {
                          _mapController.move(
                            _currentPos,
                            _mapController.camera.zoom - 1,
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // 2. Top Header Over Map
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                child: Row(
                  children: [
                    AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: isLight
                              ? Colors.white.withValues(alpha: 0.92)
                              : const Color(0xFF101726).withValues(alpha: 0.88),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isLight
                                ? const Color(0xFFE2E8F0)
                                : const Color(0xFF1E2B40),
                          ),
                          boxShadow: isLight ? AppTheme.cardShadow : null,
                        ),
                        child: Text(
                          'Geofence',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: isLight
                                ? const Color(0xFF0F172A)
                                : Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    InkWell(
                      onTap: _navigateToAddGeofence,
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: isLight
                              ? Colors.white.withValues(alpha: 0.92)
                              : const Color(0xFF101726).withValues(alpha: 0.88),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isLight
                                ? const Color(0xFFE2E8F0)
                                : const Color(0xFF1E2B40),
                          ),
                          boxShadow: isLight ? AppTheme.cardShadow : null,
                        ),
                        child: Center(
                          child: AppIcons.svg(
                            AppIcons.plus,
                            color: isLight
                                ? const Color(0xFF0F172A)
                                : Colors.white,
                            width: 14,
                            height: 14,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // 3. Bottom Sheet with Real Geofences
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            top: MediaQuery.of(context).size.height * 0.48,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
              decoration: BoxDecoration(
                color: isLight ? Colors.white : const Color(0xFF090E17),
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
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isLight ? 0.08 : 0.6),
                    blurRadius: 24,
                    offset: const Offset(0, -6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Your Geofences',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF0F172A)
                                  : Colors.white,
                              fontSize: 16.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Tap zone to preview on map',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF8E9BAE),
                              fontSize: 12.5,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        '${_geofences.length} ${_geofences.length == 1 ? "Zone" : "Zones"}',
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF0066FF)
                              : const Color(0xFF00C2FF),
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Geofence Items List
                  Expanded(
                    child: ListView.separated(
                      padding: EdgeInsets.zero,
                      itemCount: _geofences.length,
                      separatorBuilder: (context, index) =>
                          const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final item = _geofences[index];
                        final isSelected = _selectedGeofence?.id == item.id;

                        return InkWell(
                          onTap: () {
                            setState(() {
                              _selectedGeofence = item;
                            });
                          },
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 12,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? (isLight
                                        ? const Color(0xFFEFF6FF)
                                        : const Color(0xFF14243C))
                                  : (isLight
                                        ? const Color(0xFFF8FAFC)
                                        : const Color(0xFF101726)),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isSelected
                                    ? (isLight
                                          ? const Color(0xFF0066FF)
                                          : const Color(0xFF00C2FF))
                                    : (isLight
                                          ? const Color(0xFFE2E8F0)
                                          : const Color(0xFF1C273C)),
                                width: isSelected ? 1.5 : 1.0,
                              ),
                              boxShadow: isLight && !isSelected
                                  ? AppTheme.cardShadow
                                  : null,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? (isLight
                                              ? const Color(0xFFDBEAFE)
                                              : const Color(0xFF00C2FF)
                                                    .withValues(alpha: 0.2))
                                        : (isLight
                                              ? const Color(0xFFE2E8F0)
                                              : const Color(0xFF142238)),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Center(
                                    child: Icon(
                                      item.icon,
                                      color: isLight
                                          ? const Color(0xFF0066FF)
                                          : const Color(0xFF00C2FF),
                                      size: 22,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.name,
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
                                        item.address,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF64748B)
                                              : const Color(0xFF8E9BAE),
                                          fontSize: 12.5,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Radius: ${item.radiusFormatted}',
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF94A3B8)
                                              : const Color(0xFF64748B),
                                          fontSize: 11.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(
                                    Icons.delete_outline_rounded,
                                    color: Color(0xFFEF4444),
                                    size: 20,
                                  ),
                                  onPressed: () => _deleteGeofence(item),
                                  tooltip: 'Delete zone',
                                ),
                                Switch(
                                  value: item.isEnabled,
                                  activeTrackColor: isLight
                                      ? const Color(0xFF0066FF)
                                      : const Color(0xFF00C2FF),
                                  activeThumbColor: Colors.white,
                                  inactiveThumbColor: isLight
                                      ? const Color(0xFF94A3B8)
                                      : const Color(0xFF8E9BAE),
                                  inactiveTrackColor: isLight
                                      ? const Color(0xFFE2E8F0)
                                      : const Color(0xFF1C273C),
                                  onChanged: (val) =>
                                      _toggleGeofence(item, val),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _navigateToAddGeofence,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isLight
                            ? const Color(0xFF0066FF)
                            : const Color(0xFF00C2FF),
                        foregroundColor: isLight ? Colors.white : Colors.black,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          AppIcons.svg(
                            AppIcons.plus,
                            color: isLight ? Colors.white : Colors.black,
                            width: 14,
                            height: 14,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Add Geofence',
                            style: TextStyle(
                              color: isLight ? Colors.white : Colors.black,
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
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
              ? Colors.white.withValues(alpha: 0.92)
              : const Color(0xFF101726).withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2B40),
          ),
          boxShadow: [
            BoxShadow(
              color: (isLight ? Colors.black12 : Colors.black).withValues(
                alpha: isLight ? 0.08 : 0.35,
              ),
              blurRadius: 8,
            ),
          ],
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
