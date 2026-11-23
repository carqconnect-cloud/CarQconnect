import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../theme/app_theme.dart';
import '../../loading.dart';
import 'trips_screen.dart';
import '../bottom_navigation_screen.dart';
import 'trip_service.dart';
import '../../utils/app_icons.dart';
import '../../services/vehicle_type_service.dart';
import '../../widgets/animated_back_arrow.dart';

class TripCompletedScreen extends StatefulWidget {
  final String? tripId;
  final String? startedAt;
  final String fromLocation;
  final String toLocation;
  final LatLng fromLatLng;
  final LatLng toLatLng;
  final String? dateTimeRange;
  final String distance;
  final String duration;
  final String? avgSpeed;
  final String? fuelUsed;
  final Map<String, dynamic>? vehicle;
  final String? viaRoute;
  final List<LatLng> routePoints;

  const TripCompletedScreen({
    super.key,
    this.tripId,
    this.startedAt,
    required this.fromLocation,
    required this.toLocation,
    this.fromLatLng = const LatLng(22.7196, 75.8577),
    this.toLatLng = const LatLng(0.0, 0.0),
    this.dateTimeRange,
    this.distance = '0 km',
    this.duration = '0m',
    this.avgSpeed,
    this.fuelUsed,
    this.vehicle,
    this.viaRoute,
    this.routePoints = const [],
  });

  @override
  State<TripCompletedScreen> createState() => _TripCompletedScreenState();
}

class _TripCompletedScreenState extends State<TripCompletedScreen> {
  bool _isSaving = false;
  bool _isSaved = false;

  LatLng get _effectiveFromLatLng {
    if (widget.fromLatLng.latitude != 0.0) return widget.fromLatLng;
    if (widget.routePoints.isNotEmpty && widget.routePoints.first.latitude != 0.0) return widget.routePoints.first;
    return const LatLng(22.7196, 75.8577);
  }

  LatLng get _effectiveToLatLng {
    if (widget.toLatLng.latitude != 0.0) return widget.toLatLng;
    if (widget.routePoints.isNotEmpty && widget.routePoints.last.latitude != 0.0) return widget.routePoints.last;
    return const LatLng(23.1765, 75.7885);
  }

  String get _computedDate {
    if (widget.dateTimeRange != null && widget.dateTimeRange!.isNotEmpty) {
      return widget.dateTimeRange!;
    }
    final now = DateTime.now();
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${now.day} ${months[now.month - 1]} ${now.year}';
  }

  String get _computedAvgSpeed {
    if (widget.avgSpeed != null && widget.avgSpeed!.isNotEmpty) {
      return widget.avgSpeed!;
    }
    final distNum =
        double.tryParse(widget.distance.replaceAll(RegExp(r'[^0-9.]'), '')) ??
        0.0;
    int totalMins = 0;
    final hourMatch = RegExp(r'(\d+)\s*h').firstMatch(widget.duration);
    final minMatch = RegExp(r'(\d+)\s*m').firstMatch(widget.duration);
    if (hourMatch != null || minMatch != null) {
      final h = hourMatch != null ? int.tryParse(hourMatch.group(1)!) ?? 0 : 0;
      final m = minMatch != null ? int.tryParse(minMatch.group(1)!) ?? 0 : 0;
      totalMins = (h * 60) + m;
    }
    if (distNum > 0 && totalMins > 0) {
      final speed = (distNum / (totalMins / 60.0)).round();
      return '$speed km/h';
    }
    return '48 km/h';
  }

  String get _fuelType {
    final serverType = (widget.vehicle?['type'] ?? widget.vehicle?['fuel'])?.toString().trim();
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

    final name = (widget.vehicle?['name'] ?? widget.vehicle?['model'] ?? '').toString().trim();
    if (name.isNotEmpty) {
      return VehicleTypeService.detectFuelType(name);
    }

    if (serverType != null && serverType.isNotEmpty) {
      return serverType;
    }

    return 'Petrol';
  }

  bool get _isEV => _fuelType.toUpperCase() == 'EV' || _fuelType.toUpperCase() == 'ELECTRIC' || _computedFuelUsed.contains('kWh');
  bool get _isDiesel => _fuelType.toUpperCase() == 'DIESEL';
  bool get _isCNG => _fuelType.toUpperCase() == 'CNG' || _computedFuelUsed.contains('kg');
  bool get _isHybrid => _fuelType.toUpperCase() == 'HYBRID';

  String get _computedFuelUsed {
    if (widget.fuelUsed != null && widget.fuelUsed!.isNotEmpty) {
      return widget.fuelUsed!;
    }
    final distNum =
        double.tryParse(widget.distance.replaceAll(RegExp(r'[^0-9.]'), '')) ??
        0.0;
    final vehName = (widget.vehicle?['name'] ?? '').toString().toLowerCase();
    final isTwoWheeler =
        vehName.contains('splendor') ||
        vehName.contains('bike') ||
        vehName.contains('motorcycle') ||
        vehName.contains('activa');

    if (_fuelType.toUpperCase() == 'EV' || _fuelType.toUpperCase() == 'ELECTRIC') {
      final kwh = isTwoWheeler ? (distNum * 0.04) : (distNum * 0.15);
      return '${kwh.toStringAsFixed(1)} kWh';
    }
    if (_fuelType.toUpperCase() == 'CNG') {
      final kg = (distNum / 25.0);
      return '${kg.toStringAsFixed(1)} kg';
    }
    if (_fuelType.toUpperCase() == 'DIESEL') {
      final liters = (distNum / 14.5);
      return '${liters.toStringAsFixed(1)} L';
    }
    if (_fuelType.toUpperCase() == 'HYBRID') {
      final liters = (distNum / 22.0);
      return '${liters.toStringAsFixed(1)} L';
    }

    if (isTwoWheeler) {
      return '${(distNum / 55.0).toStringAsFixed(1)} L';
    }
    final liters = (distNum / 15.0).toStringAsFixed(1);
    return '$liters L';
  }

  String get _consumptionMetricLabel {
    if (_isEV) return 'ENERGY USED';
    if (_isDiesel) return 'DIESEL USED';
    if (_isCNG) return 'CNG USED';
    if (_isHybrid) return 'HYBRID USED';
    return 'FUEL USED';
  }

  IconData get _consumptionMetricIcon {
    if (_isEV) return Icons.bolt_rounded;
    if (_isCNG) return Icons.local_gas_station_rounded;
    if (_isHybrid) return Icons.eco_rounded;
    return Icons.science_outlined;
  }

  String get _shareText {
    final veh = widget.vehicle?['name'] ?? 'Vehicle';
    final fuelLabel = _isEV
        ? '⚡ *Energy Used:*'
        : (_isDiesel
            ? '⛽ *Diesel Used:*'
            : (_isCNG ? '⛽ *CNG Used:*' : '⛽ *Fuel Used:*'));
    return '''🚗 *CarQConnect Trip Summary*
📍 *Route:* ${widget.fromLocation} ➔ ${widget.toLocation}
📏 *Distance:* ${widget.distance}
⏱️ *Duration:* ${widget.duration}
⚡ *Avg. Speed:* $_computedAvgSpeed
$fuelLabel $_computedFuelUsed
🚘 *Vehicle:* $veh
📅 *Date:* $_computedDate

Completed safely via CarQConnect.''';
  }

  Future<void> _onSaveTrip() async {
    final isLight = AppTheme.isLightNotifier.value;
    final primaryColor = isLight
        ? const Color(0xFF0066FF)
        : const Color(0xFF00C2FF);

    if (_isSaving) return;
    if (_isSaved) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: isLight
              ? const Color(0xFF0F172A)
              : const Color(0xFF0C1B2A),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          content: const Row(
            children: [
              Icon(
                Icons.check_circle_rounded,
                color: Color(0xFF00E676),
                size: 20,
              ),
              SizedBox(width: 10),
              Text(
                'Trip is already saved in your Trip History!',
                style: TextStyle(color: Colors.white, fontSize: 13),
              ),
            ],
          ),
          action: SnackBarAction(
            label: 'View',
            textColor: primaryColor,
            onPressed: () {
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(
                  builder: (context) => const TripsScreen(initialTab: 2),
                ),
                (route) => route.isFirst,
              );
            },
          ),
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

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
        viaRoute: widget.viaRoute,
        avgSpeed: _computedAvgSpeed,
        fuelUsed: _computedFuelUsed,
        vehicle: widget.vehicle,
        routePoints: widget.routePoints,
        startedAt: widget.startedAt,
      );
      if (mounted) {
        setState(() {
          _isSaved = true;
          _isSaving = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: isLight
                ? const Color(0xFF1B5E20)
                : const Color(0xFF0A2218),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFF1E523A), width: 1),
            ),
            content: const Row(
              children: [
                Icon(
                  Icons.check_circle_rounded,
                  color: Color(0xFF00E676),
                  size: 22,
                ),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Trip saved successfully to your Trip History!',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            action: SnackBarAction(
              label: 'View History',
              textColor: const Color(0xFF00E676),
              onPressed: () {
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const TripsScreen(initialTab: 2),
                  ),
                  (route) => route.isFirst,
                );
              },
            ),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFF2C1014),
            content: Text(
              'Failed to save trip. Please try again.',
              style: TextStyle(color: Colors.white),
            ),
          ),
        );
      }
    }
  }

  void _onShareTrip() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => _buildShareBottomSheet(ctx),
    );
  }

  Widget _buildShareBottomSheet(BuildContext ctx) {
    final isLight = AppTheme.isLightNotifier.value;
    final primaryColor = isLight
        ? const Color(0xFF0066FF)
        : const Color(0xFF00C2FF);

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0B1420),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: isLight ? Border.all(color: const Color(0xFFE2E8F0)) : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isLight ? 0.15 : 0.54),
            blurRadius: 20,
            spreadRadius: 4,
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(bottom: 18),
              decoration: BoxDecoration(
                color: isLight
                    ? const Color(0xFFE2E8F0)
                    : const Color(0xFF243346),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: isLight
                      ? const Color(0xFFEBF5FF)
                      : const Color(0xFF00C2FF).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.share_rounded, color: primaryColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Share Trip Summary',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(ctx),
                icon: Icon(
                  Icons.close_rounded,
                  color: isLight
                      ? const Color(0xFF64748B)
                      : const Color(0xFF6B7C91),
                  size: 22,
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Trip Preview Box
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isLight
                  ? const Color(0xFFF8FAFC)
                  : const Color(0xFF101B28),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isLight
                    ? const Color(0xFFE2E8F0)
                    : const Color(0xFF1E2E42),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.navigation_rounded,
                      color: primaryColor,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${widget.fromLocation} ➔ ${widget.toLocation}',
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF0F172A)
                              : Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _buildShareMiniChip(
                      Icons.straighten_rounded,
                      widget.distance,
                      isLight,
                      primaryColor,
                    ),
                    const SizedBox(width: 8),
                    _buildShareMiniChip(
                      Icons.access_time_rounded,
                      widget.duration,
                      isLight,
                      primaryColor,
                    ),
                    const SizedBox(width: 8),
                    _buildShareMiniChip(
                      Icons.local_gas_station_rounded,
                      _computedFuelUsed,
                      isLight,
                      primaryColor,
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Share Options
          _buildShareOptionTile(
            icon: Icons.chat_rounded,
            iconColor: const Color(0xFF25D366),
            title: 'Share on WhatsApp',
            subtitle: 'Send trip report directly to friends or family',
            isLight: isLight,
            onTap: () async {
              Navigator.pop(ctx);
              final encoded = Uri.encodeComponent(_shareText);
              final waUrl = Uri.parse('https://wa.me/?text=$encoded');
              try {
                final launched = await launchUrl(
                  waUrl,
                  mode: LaunchMode.externalApplication,
                );
                if (!launched) {
                  await Clipboard.setData(ClipboardData(text: _shareText));
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: const Text(
                          'Copied trip summary to clipboard!',
                        ),
                        backgroundColor: primaryColor,
                      ),
                    );
                  }
                }
              } catch (_) {
                await Clipboard.setData(ClipboardData(text: _shareText));
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: const Text('Copied trip summary to clipboard!'),
                      backgroundColor: primaryColor,
                    ),
                  );
                }
              }
            },
          ),

          const SizedBox(height: 10),

          _buildShareOptionTile(
            icon: Icons.copy_rounded,
            iconColor: primaryColor,
            title: 'Copy to Clipboard',
            subtitle: 'Copy full summary to paste in any app',
            isLight: isLight,
            onTap: () async {
              Navigator.pop(ctx);
              await Clipboard.setData(ClipboardData(text: _shareText));
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: isLight
                        ? const Color(0xFF0F172A)
                        : const Color(0xFF0C1B2A),
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    content: Row(
                      children: [
                        Icon(
                          Icons.check_circle_rounded,
                          color: primaryColor,
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        const Text(
                          'Trip summary copied to clipboard! Ready to paste.',
                        ),
                      ],
                    ),
                  ),
                );
              }
            },
          ),

          const SizedBox(height: 10),

          _buildShareOptionTile(
            icon: Icons.sms_rounded,
            iconColor: const Color(0xFFFFB300),
            title: 'Share via SMS / Messages',
            subtitle: 'Send SMS with route & distance summary',
            isLight: isLight,
            onTap: () async {
              Navigator.pop(ctx);
              final encoded = Uri.encodeComponent(_shareText);
              final smsUrl = Uri.parse('sms:?body=$encoded');
              try {
                await launchUrl(smsUrl);
              } catch (_) {
                await Clipboard.setData(ClipboardData(text: _shareText));
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildShareMiniChip(
    IconData icon,
    String label,
    bool isLight,
    Color primaryColor,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF162536),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: primaryColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShareOptionTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required bool isLight,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF101B28),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isLight
                  ? const Color(0xFFE2E8F0)
                  : const Color(0xFF19283A),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: isLight
                            ? const Color(0xFF64748B)
                            : const Color(0xFF6B7C91),
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.arrow_forward_ios_rounded,
                color: isLight
                    ? const Color(0xFF94A3B8)
                    : const Color(0xFF4C5E72),
                size: 14,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _onDone() {
    // If not saved yet, auto-save in background so it appears in history
    if (!_isSaved && widget.tripId == null) {
      TripService.saveCompletedTrip(
        tripId: widget.tripId,
        fromName: widget.fromLocation,
        fromLat: _effectiveFromLatLng.latitude,
        fromLng: _effectiveFromLatLng.longitude,
        toName: widget.toLocation,
        toLat: _effectiveToLatLng.latitude,
        toLng: _effectiveToLatLng.longitude,
        distance: widget.distance,
        duration: widget.duration,
        viaRoute: widget.viaRoute,
        avgSpeed: _computedAvgSpeed,
        fuelUsed: _computedFuelUsed,
        vehicle: widget.vehicle,
        routePoints: widget.routePoints,
        startedAt: widget.startedAt,
      );
    }

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const TripsScreen(initialTab: 2)),
      (route) => route.isFirst,
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
          child: Container(
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
              title: Text(
                'Trip Overview',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              centerTitle: true,
              actions: [
                IconButton(
                  icon: Icon(
                    Icons.search_rounded,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    size: 22,
                  ),
                  onPressed: () {},
                ),
              ],
            ),
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Column(
                  children: [
                    Expanded(
                      child: SingleChildScrollView(
                        physics: const BouncingScrollPhysics(),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Column(
                          children: [
                            const SizedBox(height: 12),

                            // Celebration Checkmark Badge with Confetti
                            Stack(
                              alignment: Alignment.center,
                              clipBehavior: Clip.none,
                              children: [
                                // Confetti 1: Top-Left Yellow Tilted Rectangle
                                Positioned(
                                  top: -8,
                                  left: -24,
                                  child: Transform.rotate(
                                    angle: -0.6,
                                    child: Container(
                                      width: 12,
                                      height: 6,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFFCA28),
                                        borderRadius: BorderRadius.circular(3),
                                      ),
                                    ),
                                  ),
                                ),

                                // Confetti 2: Top White Dot
                                Positioned(
                                  top: -12,
                                  child: Container(
                                    width: 6,
                                    height: 6,
                                    decoration: BoxDecoration(
                                      color: isLight
                                          ? const Color(0xFF64748B)
                                          : Colors.white,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ),

                                // Confetti 3: Top-Right Cyan Tilted Square
                                Positioned(
                                  top: -1,
                                  right: -24,
                                  child: Transform.rotate(
                                    angle: 0.5,
                                    child: Container(
                                      width: 9,
                                      height: 9,
                                      decoration: BoxDecoration(
                                        color: primaryColor,
                                        borderRadius: BorderRadius.circular(2),
                                      ),
                                    ),
                                  ),
                                ),

                                // Confetti 4: Right Yellow Tilted Square
                                Positioned(
                                  top: 26,
                                  right: -36,
                                  child: Transform.rotate(
                                    angle: 0.7,
                                    child: Container(
                                      width: 9,
                                      height: 9,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFFD54F),
                                        borderRadius: BorderRadius.circular(2),
                                      ),
                                    ),
                                  ),
                                ),

                                // Confetti 5: Bottom-Right Mint Green Tilted Rectangle
                                Positioned(
                                  bottom: 2,
                                  right: -26,
                                  child: Transform.rotate(
                                    angle: 0.8,
                                    child: Container(
                                      width: 12,
                                      height: 5,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF26A69A),
                                        borderRadius: BorderRadius.circular(2),
                                      ),
                                    ),
                                  ),
                                ),

                                // Confetti 6: Left Pink Tilted Rectangle
                                Positioned(
                                  top: 22,
                                  left: -32,
                                  child: Transform.rotate(
                                    angle: 0.3,
                                    child: Container(
                                      width: 12,
                                      height: 5,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFF6E85),
                                        borderRadius: BorderRadius.circular(2),
                                      ),
                                    ),
                                  ),
                                ),

                                // Confetti 7: Bottom-Left Yellow Dot
                                Positioned(
                                  bottom: -2,
                                  left: -20,
                                  child: Container(
                                    width: 7,
                                    height: 7,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFFFFB300),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ),

                                // Core Checkmark Circle
                                Container(
                                  width: 82,
                                  height: 82,
                                  decoration: BoxDecoration(
                                    color: primaryColor,
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: primaryColor.withValues(
                                          alpha: 0.35,
                                        ),
                                        blurRadius: 24,
                                        spreadRadius: 4,
                                      ),
                                    ],
                                  ),
                                  child: Center(
                                    child: Icon(
                                      Icons.check_rounded,
                                      color: isLight
                                          ? Colors.white
                                          : Colors.black,
                                      size: 46,
                                    ),
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 20),

                            // Headline: "Trip Completed!"
                            Text(
                              'Trip Completed!',
                              style: TextStyle(
                                color: isLight
                                    ? const Color(0xFF0F172A)
                                    : Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.2,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Great drive! Hope you had a safe and\ncomfortable journey.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: isLight
                                    ? const Color(0xFF64748B)
                                    : const Color(0xFF7E8E9F),
                                fontSize: 13,
                                height: 1.4,
                              ),
                            ),

                            const SizedBox(height: 24),

                            // Trip Route Summary Card
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: isLight
                                    ? Colors.white
                                    : const Color(0xFF0C131D),
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(
                                  color: isLight
                                      ? const Color(0xFFE2E8F0)
                                      : const Color(0xFF182232),
                                  width: 1,
                                ),
                                boxShadow: isLight ? AppTheme.cardShadow : null,
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: isLight
                                          ? const Color(0xFFEBF5FF)
                                          : const Color(0xFF102436),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: isLight
                                            ? const Color(0xFFB9E6FE)
                                            : const Color(0xFF183850),
                                        width: 1,
                                      ),
                                    ),
                                    child: Center(
                                      child: AppIcons.svg(
                                        AppIcons.route,
                                        color: primaryColor,
                                        width: 20,
                                        height: 20,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              widget.fromLocation,
                                              style: TextStyle(
                                                color: isLight
                                                    ? const Color(0xFF0F172A)
                                                    : Colors.white,
                                                fontSize: 15,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(width: 6),
                                            AppIcons.svg(
                                              AppIcons.arrow,
                                              color: primaryColor,
                                              width: 12,
                                              height: 12,
                                            ),
                                            const SizedBox(width: 6),
                                            Text(
                                              widget.toLocation,
                                              style: TextStyle(
                                                color: isLight
                                                    ? const Color(0xFF0F172A)
                                                    : Colors.white,
                                                fontSize: 15,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          _computedDate,
                                          style: TextStyle(
                                            color: isLight
                                                ? const Color(0xFF64748B)
                                                : const Color(0xFF6B7C91),
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 14),

                            // 4 Grid Metric Cards (2x2)
                            Row(
                              children: [
                                Expanded(
                                  child: _buildMetricCard(
                                    svgAsset: AppIcons.distance,
                                    label: 'DISTANCE',
                                    value: widget.distance,
                                    isLight: isLight,
                                    primaryColor: primaryColor,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _buildMetricCard(
                                    icon: Icons.access_time_rounded,
                                    label: 'DURATION',
                                    value: widget.duration,
                                    isLight: isLight,
                                    primaryColor: primaryColor,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: _buildMetricCard(
                                    icon: Icons.bolt_rounded,
                                    label: 'AVG. SPEED',
                                    value: _computedAvgSpeed,
                                    isLight: isLight,
                                    primaryColor: primaryColor,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _buildMetricCard(
                                    icon: _consumptionMetricIcon,
                                    label: _consumptionMetricLabel,
                                    value: _computedFuelUsed,
                                    isLight: isLight,
                                    primaryColor: primaryColor,
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 16),

                            // Action 1: "Save Trip"
                            _buildActionItem(
                              icon: _isSaved
                                  ? Icons.check_circle_rounded
                                  : Icons.bookmark_outline_rounded,
                              iconColor: _isSaved
                                  ? const Color(0xFF00E676)
                                  : const Color(0xFFFFB300),
                              bgColor: _isSaved
                                  ? (isLight
                                        ? const Color(0xFFE8F5E9)
                                        : const Color(0xFF0D281E))
                                  : (isLight
                                        ? const Color(0xFFFFF8E1)
                                        : const Color(0xFF262010)),
                              borderColor: _isSaved
                                  ? (isLight
                                        ? const Color(0xFFA5D6A7)
                                        : const Color(0xFF1E523A))
                                  : (isLight
                                        ? const Color(0xFFFFE082)
                                        : const Color(0xFF3E3215)),
                              title: _isSaved ? 'Trip Saved!' : 'Save Trip',
                              subtitle: _isSaved
                                  ? 'Saved in your trip history'
                                  : 'Add to your trip history',
                              isLoading: _isSaving,
                              onTap: _onSaveTrip,
                              isLight: isLight,
                            ),

                            const SizedBox(height: 12),

                            // Action 2: "Share Trip"
                            _buildActionItem(
                              svgAsset: AppIcons.share,
                              iconColor: primaryColor,
                              bgColor: isLight
                                  ? const Color(0xFFEBF5FF)
                                  : const Color(0xFF102638),
                              borderColor: isLight
                                  ? const Color(0xFFB9E6FE)
                                  : const Color(0xFF163952),
                              title: 'Share Trip',
                              subtitle: 'Share with friends or family',
                              onTap: _onShareTrip,
                              isLight: isLight,
                            ),

                            const SizedBox(height: 16),
                          ],
                        ),
                      ),
                    ),

                    // Bottom Button: "Done"
                    Padding(
                      padding: const EdgeInsets.only(top: 8, bottom: 20),
                      child: SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _onDone,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: primaryColor,
                            foregroundColor: isLight
                                ? Colors.white
                                : Colors.black,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(26),
                            ),
                          ),
                          child: Center(
                            child: Text(
                              'Done',
                              style: TextStyle(
                                color: isLight ? Colors.white : Colors.black,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
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
          ),
        ),
      );
    },
  );
  }

  Widget _buildMetricCard({
    IconData? icon,
    String? svgAsset,
    required String label,
    required String value,
    required bool isLight,
    required Color primaryColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0C131D),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF182232),
          width: 1,
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isLight
                  ? const Color(0xFFEBF5FF)
                  : const Color(0xFF102638),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: svgAsset != null
                  ? AppIcons.svg(
                      svgAsset,
                      color: primaryColor,
                      width: 22,
                      height: 22,
                    )
                  : Icon(icon, color: primaryColor, size: 22),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF64748B)
                        : const Color(0xFF6B7C91),
                    fontSize: 10.5,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.6,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionItem({
    IconData? icon,
    String? svgAsset,
    required Color iconColor,
    required Color bgColor,
    required Color borderColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required bool isLight,
    bool isLoading = false,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        splashColor: iconColor.withValues(alpha: 0.1),
        highlightColor: iconColor.withValues(alpha: 0.05),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isLight ? Colors.white : const Color(0xFF0C131D),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isLight
                  ? const Color(0xFFE2E8F0)
                  : const Color(0xFF182232),
              width: 1,
            ),
            boxShadow: isLight ? AppTheme.cardShadow : null,
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: borderColor, width: 1),
                ),
                child: isLoading
                    ? const Center(
                        child: AppLoadingSpinner(size: 18),
                      )
                    : Center(
                        child: svgAsset != null
                            ? AppIcons.svg(
                                svgAsset,
                                color: iconColor,
                                width: 20,
                                height: 20,
                              )
                            : Icon(icon, color: iconColor, size: 20),
                      ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 14.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: isLight
                            ? const Color(0xFF64748B)
                            : const Color(0xFF6B7C91),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                _isSaved && title.contains('Saved')
                    ? Icons.check_rounded
                    : Icons.chevron_right_rounded,
                color: _isSaved && title.contains('Saved')
                    ? const Color(0xFF00E676)
                    : (isLight
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF6B7C91)),
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
