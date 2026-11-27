import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'dart:async';

import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart';

import '../../globals.dart';
import '../../utils/map_config.dart';
import '../../widgets/mappls_native_map.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../trip/plan_trip_screen.dart';
import 'no_gps_screen.dart';
import 'track_models.dart';
import 'track_service.dart';
import 'live_vehicle_location.dart';
import 'geofence_screen.dart';
import 'parking_history.dart';
import '../../utils/app_icons.dart';
import '../../services/screen_refresh_service.dart';
import '../../widgets/animated_back_arrow.dart';

export 'no_gps_screen.dart';
export 'live_vehicle_location.dart';
export 'geofence_screen.dart';
export 'set_geofence.dart';
export 'alert_settings.dart';
export 'geofence_created.dart';
export 'parking_history.dart';
export 'track_models.dart';
export 'track_service.dart';

class TrackScreen extends StatefulWidget {
  const TrackScreen({super.key});

  @override
  State<TrackScreen> createState() => _TrackScreenState();
}

class _TrackScreenState extends State<TrackScreen>
    with RefreshOnRouteReturn<TrackScreen>, WidgetsBindingObserver {
  List<Map<String, dynamic>> _vehicles = [];
  Map<String, dynamic>? _selectedVehicle;
  LatLng _currentPos = const LatLng(22.7196, 75.8577);
  String _currentAddress = 'Fetching live location...';
  List<Map<String, String>> _locationHistory = [];
  bool _isLoading = true;
  bool _isGpsConnected = false;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    AppTheme.isLightNotifier.addListener(_onThemeChanged);
    _loadRealData(showSpinner: true);
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (mounted) {
        _loadRealData(showSpinner: false);
      }
    });
  }

  void _onThemeChanged() {
    if (mounted) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadRealData(showSpinner: false);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    AppTheme.isLightNotifier.removeListener(_onThemeChanged);
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadRealData({bool showSpinner = false}) async {
    if (showSpinner) {
      setState(() => _isLoading = true);
    }

    // Fetch user vehicles, live GPS position and trip history concurrently
    final vehiclesFuture = TrackService.getUserVehicles();
    final posFuture = TrackService.getLivePosition();
    final historyFuture = TrackService.getLocationHistory();

    final vList = await vehiclesFuture;
    final pos = await posFuture;
    final history = await historyFuture;
    final addr = await TrackService.getLiveAddress(pos);

    final sel = _selectedVehicle ?? (vList.isNotEmpty ? vList.first : null);
    final reg = sel?['regNumber'] ?? Globals.vehicleRegistration;
    final prefs = await SharedPreferences.getInstance();
    final savedGpsStatus = prefs.getBool('gps_connected_$reg');

    // Check device location service and permission
    final bool isLocationEnabled = await Geolocator.isLocationServiceEnabled();
    final LocationPermission permission = await Geolocator.checkPermission();
    final bool hasPermission =
        permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;

    bool connected = false;
    if (isLocationEnabled && hasPermission) {
      if (savedGpsStatus != null) {
        connected = savedGpsStatus;
      } else if (sel != null &&
          (sel['isGpsConnected'] == true || sel['gpsConnected'] == true)) {
        connected = true;
      } else {
        connected = true;
      }
    } else {
      // User has not turned on their location or granted permission -> show NoGpsScreen
      connected = false;
    }

    if (mounted) {
      setState(() {
        _vehicles = vList;
        _selectedVehicle = sel;
        _isGpsConnected = connected;
        _currentPos = pos;
        _currentAddress = addr;
        _locationHistory = history;
        if (showSpinner) _isLoading = false;
      });
    }
  }

  Future<void> _turnOnGpsDirectly() async {
    final messenger = ScaffoldMessenger.of(context);
    final reg = _selectedVehicle?['regNumber'] ?? Globals.vehicleRegistration;
    final vehicleName =
        _selectedVehicle?['name'] ??
        (Globals.vehicleModel.isNotEmpty ? Globals.vehicleModel : 'Vehicle');

    try {
      final pos = await TrackService.getLivePosition();
      final addr = await TrackService.getLiveAddress(pos);

      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('gps_connected_$reg', true);

      if (mounted) {
        setState(() {
          _isGpsConnected = true;
          _currentPos = pos;
          _currentAddress = addr;
          if (_selectedVehicle != null) {
            _selectedVehicle!['status'] = 'GPS Connected';
            _selectedVehicle!['isGpsConnected'] = true;
          }
        });

        final isLight = AppTheme.isLightNotifier.value;
        messenger.showSnackBar(
          SnackBar(
            backgroundColor: isLight
                ? const Color(0xFF0F172A)
                : const Color(0xFF0B2133),
            content: Row(
              children: [
                const Icon(
                  Icons.check_circle_rounded,
                  color: Color(0xFF00E676),
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'GPS Connected! Live tracking active for $vehicleName.',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        messenger.showSnackBar(
          SnackBar(content: Text('Could not get live location: $e')),
        );
      }
    }
  }

  void _showTurnOnGpsModal(BuildContext context) {
    final vehicleName =
        _selectedVehicle?['name'] ??
        (Globals.vehicleModel.isNotEmpty ? Globals.vehicleModel : 'Vehicle');
    final vehicleReg =
        _selectedVehicle?['regNumber'] ?? Globals.vehicleRegistration;

    final isLight = AppTheme.isLightNotifier.value;
    final primaryColor = isLight
        ? const Color(0xFF0066FF)
        : const Color(0xFF00C2FF);
    final cardBg = isLight ? Colors.white : const Color(0xFF0C1422);
    final textPrimary = isLight ? const Color(0xFF0F172A) : Colors.white;
    final textSecondary =
        isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE);
    final pillBg = isLight ? const Color(0xFFF1F5F9) : const Color(0xFF131F33);
    final pillBorder =
        isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2F4A);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      builder: (ctx) {
        bool isActivating = false;
        return StatefulBuilder(
          builder: (modalContext, setModalState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(
                24,
                16,
                24,
                MediaQuery.of(ctx).viewInsets.bottom + 28,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Handle bar
                  Center(
                    child: Container(
                      width: 42,
                      height: 4.5,
                      decoration: BoxDecoration(
                        color: isLight
                            ? const Color(0xFFCBD5E1)
                            : const Color(0xFF26354D),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),

                  // Circular GPS / Location Icon Badge
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: primaryColor.withValues(
                        alpha: isLight ? 0.12 : 0.15,
                      ),
                      border: Border.all(
                        color: primaryColor.withValues(alpha: 0.35),
                        width: 1.5,
                      ),
                    ),
                    child: Center(
                      child: Icon(
                        Icons.gps_fixed_rounded,
                        color: primaryColor,
                        size: 34,
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Title: "Turn on GPS"
                  Text(
                    'Turn on GPS',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: textPrimary,
                      fontSize: 21,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.2,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Subtitle
                  Text(
                    'To track $vehicleName live on the map and view real-time location and speed, please turn on your device GPS.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: textSecondary,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w400,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Vehicle Info Pill
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: pillBg,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: pillBorder),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: primaryColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            Icons.directions_car_rounded,
                            color: primaryColor,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                vehicleName,
                                style: TextStyle(
                                  color: textPrimary,
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                vehicleReg,
                                style: TextStyle(
                                  color: textSecondary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(
                              0xFFEF4444,
                            ).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: const Color(
                                0xFFEF4444,
                              ).withValues(alpha: 0.3),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(
                                Icons.circle,
                                size: 6,
                                color: Color(0xFFEF4444),
                              ),
                              SizedBox(width: 4),
                              Text(
                                'GPS Off',
                                style: TextStyle(
                                  color: Color(0xFFEF4444),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Primary Button: "Turn on GPS"
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      onPressed: isActivating
                          ? null
                          : () async {
                              final messenger = ScaffoldMessenger.of(context);
                              setModalState(() => isActivating = true);
                              try {
                                bool isLocationEnabled =
                                    await Geolocator.isLocationServiceEnabled();
                                if (!isLocationEnabled) {
                                  await Geolocator.openLocationSettings();
                                  await Future.delayed(
                                    const Duration(milliseconds: 1200),
                                  );
                                  isLocationEnabled =
                                      await Geolocator.isLocationServiceEnabled();
                                  if (!isLocationEnabled) {
                                    if (modalContext.mounted) {
                                      setModalState(
                                        () => isActivating = false,
                                      );
                                    }
                                    if (mounted) {
                                      messenger.showSnackBar(
                                        SnackBar(
                                          backgroundColor: isLight
                                              ? const Color(0xFF0F172A)
                                              : const Color(0xFF1E293B),
                                          content: const Text(
                                            'Please turn on Location / GPS in your device settings to continue.',
                                          ),
                                        ),
                                      );
                                    }
                                    return;
                                  }
                                }

                                LocationPermission permission =
                                    await Geolocator.checkPermission();
                                if (permission == LocationPermission.denied) {
                                  permission =
                                      await Geolocator.requestPermission();
                                }

                                if (permission ==
                                    LocationPermission.deniedForever) {
                                  if (modalContext.mounted) {
                                    Navigator.pop(modalContext);
                                  }
                                  if (mounted) {
                                    messenger.showSnackBar(
                                      const SnackBar(
                                        backgroundColor: Color(0xFF280B0B),
                                        content: Text(
                                          'Location permission is permanently denied. Please allow it in Settings.',
                                        ),
                                      ),
                                    );
                                  }
                                  await Geolocator.openAppSettings();
                                  return;
                                }

                                if (permission ==
                                        LocationPermission.whileInUse ||
                                    permission == LocationPermission.always) {
                                  final pos =
                                      await TrackService.getLivePosition();
                                  final addr =
                                      await TrackService.getLiveAddress(pos);

                                  final reg =
                                      _selectedVehicle?['regNumber'] ??
                                      Globals.vehicleRegistration;
                                  final prefs =
                                      await SharedPreferences.getInstance();
                                  await prefs.setBool(
                                    'gps_connected_$reg',
                                    true,
                                  );

                                  if (modalContext.mounted) {
                                    Navigator.pop(modalContext);
                                  }

                                  if (mounted) {
                                    setState(() {
                                      _isGpsConnected = true;
                                      _currentPos = pos;
                                      _currentAddress = addr;
                                      if (_selectedVehicle != null) {
                                        _selectedVehicle!['status'] =
                                            'GPS Connected';
                                        _selectedVehicle!['isGpsConnected'] =
                                            true;
                                      }
                                    });

                                    messenger.showSnackBar(
                                      SnackBar(
                                        backgroundColor: isLight
                                            ? const Color(0xFF0F172A)
                                            : const Color(0xFF0B2133),
                                        content: Row(
                                          children: [
                                            const Icon(
                                              Icons.check_circle_rounded,
                                              color: Color(0xFF00E676),
                                              size: 20,
                                            ),
                                            const SizedBox(width: 10),
                                            Expanded(
                                              child: Text(
                                                'GPS Connected! Live tracking active for $vehicleName.',
                                                style: const TextStyle(
                                                  color: Colors.white,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        duration: const Duration(seconds: 3),
                                        behavior: SnackBarBehavior.floating,
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(14),
                                        ),
                                      ),
                                    );
                                  }
                                } else {
                                  if (modalContext.mounted) {
                                    setModalState(() => isActivating = false);
                                  }
                                }
                              } catch (e) {
                                if (modalContext.mounted) {
                                  setModalState(() => isActivating = false);
                                }
                                if (mounted) {
                                  messenger.showSnackBar(
                                    SnackBar(
                                      content:
                                          Text('Could not activate GPS: $e'),
                                    ),
                                  );
                                }
                              }
                            },
                      icon: isActivating
                          ? SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.2,
                                color: isLight ? Colors.white : Colors.black,
                              ),
                            )
                          : const Icon(Icons.my_location_rounded, size: 20),
                      label: Text(
                        isActivating ? 'Connecting GPS...' : 'Turn on GPS',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: isLight
                              ? Colors.white
                              : const Color(0xFF03101C),
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: isLight ? Colors.white : Colors.black,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(25),
                        ),
                        elevation: isLight ? 2 : 4,
                        shadowColor: primaryColor.withValues(alpha: 0.4),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Cancel / Not Now Button
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: TextButton(
                      onPressed: () => Navigator.pop(modalContext),
                      style: TextButton.styleFrom(
                        foregroundColor: textSecondary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(22),
                        ),
                      ),
                      child: Text(
                        'Not Now',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: textSecondary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _connectGps() async {
    final bool isLocationEnabled = await Geolocator.isLocationServiceEnabled();
    final LocationPermission permission = await Geolocator.checkPermission();
    final bool hasPermission =
        permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;

    if (isLocationEnabled && hasPermission) {
      await _turnOnGpsDirectly();
    } else {
      if (mounted) {
        _showTurnOnGpsModal(context);
      }
    }
  }

  Future<void> _disconnectGps() async {
    final messenger = ScaffoldMessenger.of(context);
    final reg = _selectedVehicle?['regNumber'] ?? Globals.vehicleRegistration;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('gps_connected_$reg', false);

    if (mounted) {
      setState(() {
        _isGpsConnected = false;
        if (_selectedVehicle != null) {
          _selectedVehicle!['status'] = 'GPS not Connected';
          _selectedVehicle!['isGpsConnected'] = false;
        }
      });

      final isLight = AppTheme.isLightNotifier.value;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: isLight
              ? const Color(0xFF0F172A)
              : const Color(0xFF280B0B),
          content: Text(
            'GPS disconnected.',
            style: TextStyle(
              color: isLight ? Colors.white : const Color(0xFFFF5252),
              fontWeight: FontWeight.w600,
            ),
          ),
          duration: const Duration(seconds: 3),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      );
    }
  }

  void _showGpsStatusModal() {
    final isLight = AppTheme.isLightNotifier.value;
    final cardBg = isLight ? Colors.white : const Color(0xFF0C1422);
    final textPrimary = isLight ? const Color(0xFF0F172A) : Colors.white;
    final textSecondary =
        isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE);

    showModalBottomSheet(
      context: context,
      backgroundColor: cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: isLight
                      ? const Color(0xFFCBD5E1)
                      : const Color(0xFF26354D),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'GPS Settings',
              style: TextStyle(
                color: textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Connected to Live GPS Tracking for ${_selectedVehicle?['name'] ?? 'Vehicle'}',
              style: TextStyle(color: textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  _disconnectGps();
                },
                icon: const Icon(
                  Icons.location_off_rounded,
                  color: Color(0xFFFF4D4D),
                ),
                label: const Text(
                  'Turn off GPS Tracking',
                  style: TextStyle(
                    color: Color(0xFFFF4D4D),
                    fontWeight: FontWeight.bold,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(
                    color: isLight
                        ? const Color(0xFFFECACA)
                        : const Color(0xFF5A1515),
                  ),
                  backgroundColor: isLight
                      ? const Color(0xFFFEF2F2)
                      : const Color(0xFF1E1014),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _switchVehicleModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.isLight
                      ? const Color(0xFFCBD5E1)
                      : const Color(0xFF26354D),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Select Tracked Vehicle',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ..._vehicles.map((v) {
              final isSelected =
                  _selectedVehicle?['regNumber'] == v['regNumber'];
              return ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(
                    color: isSelected
                        ? AppTheme.primaryColor
                        : Colors.transparent,
                  ),
                ),
                tileColor: isSelected
                    ? (AppTheme.isLight
                          ? const Color(0xFFEDF4FF)
                          : const Color(0xFF14243B))
                    : Colors.transparent,
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.isLight
                        ? const Color(0xFFEDF4FF)
                        : const Color(0xFF19253A),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: AppIcons.svg(
                      AppIcons.car,
                      color: AppTheme.primaryColor,
                      width: 22,
                      height: 22,
                    ),
                  ),
                ),
                title: Text(
                  v['name'] ?? 'Vehicle',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                subtitle: Text(
                  '${v['regNumber'] ?? ''} • ${v['type'] ?? 'Petrol'}',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                ),
                trailing: isSelected
                    ? Icon(
                        Icons.check_circle_rounded,
                        color: AppTheme.primaryColor,
                      )
                    : null,
                onTap: () async {
                  Navigator.pop(ctx);
                  final reg = v['regNumber'] ?? '';
                  final prefs = await SharedPreferences.getInstance();
                  final savedGpsStatus = prefs.getBool('gps_connected_$reg');
                  final bool isLocationEnabled =
                      await Geolocator.isLocationServiceEnabled();
                  final LocationPermission permission =
                      await Geolocator.checkPermission();
                  final bool hasPermission =
                      permission == LocationPermission.always ||
                      permission == LocationPermission.whileInUse;

                  bool connected = false;
                  if (isLocationEnabled && hasPermission) {
                    connected = savedGpsStatus ??
                        (v['isGpsConnected'] == true ||
                            v['gpsConnected'] == true);
                  }
                  setState(() {
                    _selectedVehicle = v;
                    _isGpsConnected = connected;
                  });
                },
              );
            }),
          ],
        ),
      ),
    );
  }

  void _openLocationHistory() {
    final isLight = AppTheme.isLightNotifier.value;
    final primaryColor = isLight
        ? const Color(0xFF0066FF)
        : const Color(0xFF00C2FF);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF090E17),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
            const SizedBox(height: 16),
            Text(
              'Location History',
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Recent trips and route playback for ${_selectedVehicle?['name'] ?? Globals.vehicleModel ?? 'Vehicle'}',
              style: TextStyle(
                color: isLight
                    ? const Color(0xFF64748B)
                    : const Color(0xFF8E9BAE),
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 16),
            if (_locationHistory.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isLight
                      ? const Color(0xFFF8FAFC)
                      : const Color(0xFF101726),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isLight
                        ? const Color(0xFFE2E8F0)
                        : const Color(0xFF1C273C),
                  ),
                ),
                child: Column(
                  children: [
                    Icon(
                      Icons.route_outlined,
                      color: isLight
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF6B7C91),
                      size: 36,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'No Recorded Trips Yet',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Your completed navigation trips will show up here.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: isLight
                            ? const Color(0xFF64748B)
                            : const Color(0xFF8E9BAE),
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 14),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.pop(ctx);
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
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Plan a Trip Now',
                            style: TextStyle(
                              color: isLight ? Colors.white : Colors.black,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Icon(
                            Icons.arrow_forward_rounded,
                            color: isLight ? Colors.white : Colors.black,
                            size: 16,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              )
            else
              ..._locationHistory
                  .take(5)
                  .map(
                    (h) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _buildHistoryItem(
                        title: h['title'] ?? 'Trip',
                        subtitle: h['subtitle'] ?? 'Route',
                        duration: h['duration'] ?? '45m',
                        isLight: isLight,
                      ),
                    ),
                  ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => LiveVehicleLocationScreen(
                        vehicle: _selectedVehicle,
                        initialPosition: _currentPos,
                      ),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: isLight ? Colors.white : Colors.black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'View On Live Map',
                      style: TextStyle(
                        color: isLight ? Colors.white : Colors.black,
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      Icons.arrow_forward_rounded,
                      color: isLight ? Colors.white : Colors.black,
                      size: 18,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryItem({
    required String title,
    required String subtitle,
    required String duration,
    required bool isLight,
  }) {
    final primaryColor = isLight
        ? const Color(0xFF0066FF)
        : const Color(0xFF00C2FF);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF101726),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: isLight
                  ? const Color(0xFFEFF6FF)
                  : const Color(0xFF142238),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(
              child: Icon(Icons.route_outlined, color: primaryColor, size: 20),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 13.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF64748B)
                        : const Color(0xFF8E9BAE),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Text(
            duration,
            style: TextStyle(
              color: primaryColor,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Future<void> refreshOnRouteReturn() => _loadRealData(showSpinner: false);

  @override
  Widget build(BuildContext context) {
    final vehicleName =
        _selectedVehicle?['name'] ??
        (Globals.vehicleModel.isNotEmpty
            ? Globals.vehicleModel
            : 'Hyundai Creta');
    final vehicleReg =
        _selectedVehicle?['regNumber'] ??
        (Globals.vehicleRegistration.isNotEmpty
            ? Globals.vehicleRegistration
            : 'MP 09 AB 1234');

    // If user's GPS is not connected, display the NoGpsScreen matching design
    if (!_isGpsConnected && !_isLoading) {
      return NoGpsScreen(
        vehicleName: vehicleName,
        vehicleRegNumber: vehicleReg,
        lastSyncedText: 'Last synced 2 min ago',
        onBack: () {
          if (Navigator.canPop(context)) {
            Navigator.pop(context);
          }
        },
        onSwitchVehicle: _switchVehicleModal,
        onConnectGps: _connectGps,
      );
    }

    return Container(
      decoration: BoxDecoration(gradient: AppTheme.bgGradient),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
          leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () {
              if (Navigator.canPop(context)) {
                Navigator.pop(context);
              }
            }),
          title: Text(
            'Track',
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 19,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.2,
            ),
          ),
          actions: [
            IconButton(
              icon: Stack(
                children: [
                  AppIcons.svg(
                    AppIcons.notification,
                    color: AppTheme.textPrimary,
                    width: 24,
                    height: 24,
                  ),
                  Positioned(
                    top: 2,
                    right: 2,
                    child: Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: AppTheme.cardBg,
                    content: Text(
                      'All vehicle motion & geofence alerts are active',
                      style: TextStyle(color: AppTheme.textPrimary),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
        body: SafeArea(
          child: _isLoading
              ? Center(
                  child: AppLoadingSpinner(
                    size: 80,
                    primaryColor: AppTheme.primaryColor,
                  ),
                )
              : RefreshIndicator(
                  color: AppTheme.primaryColor,
                  backgroundColor: AppTheme.cardBg,
                  onRefresh: () => _loadRealData(showSpinner: false),
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 8),

                        // 1. Real Vehicle Card matching Screen 3 Figma
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 14,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.cardBg,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: AppTheme.cardBorder),
                            boxShadow: AppTheme.cardShadow,
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 60,
                                height: 52,
                                decoration: BoxDecoration(
                                  color: AppTheme.isLight
                                      ? const Color(0xFFEDF4FF)
                                      : const Color(0xFF142238),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: AppTheme.isLight
                                        ? const Color(0xFFD0E1FD)
                                        : const Color(0xFF1E2D44),
                                  ),
                                ),
                                child: Center(
                                  child: AppIcons.svg(
                                    AppIcons.car,
                                    color: AppTheme.primaryColor,
                                    width: 28,
                                    height: 28,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              // Details
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      vehicleName,
                                      style: TextStyle(
                                        color: AppTheme.textPrimary,
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      vehicleReg,
                                      style: TextStyle(
                                        color: AppTheme.textSecondary,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    // GPS Connected pill badge
                                    GestureDetector(
                                      onTap: _showGpsStatusModal,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 3,
                                        ),
                                        decoration: BoxDecoration(
                                          color: AppTheme.isLight
                                              ? const Color(0xFFE6F9F0)
                                              : const Color(0xFF0B2B24),
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                          border: Border.all(
                                            color: AppTheme.isLight
                                                ? const Color(0xFFA7F3D0)
                                                : const Color(0xFF104A3A),
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              Icons.circle,
                                              size: 6,
                                              color: AppTheme.isLight
                                                  ? const Color(0xFF059669)
                                                  : const Color(0xFF00E676),
                                            ),
                                            const SizedBox(width: 5),
                                            Text(
                                              'GPS Active • Real-time',
                                              style: TextStyle(
                                                color: AppTheme.isLight
                                                    ? const Color(0xFF059669)
                                                    : const Color(0xFF00E676),
                                                fontSize: 11,
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
                              // Switch vehicle button
                              GestureDetector(
                                onTap: _switchVehicleModal,
                                child: Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: AppTheme.isLight
                                        ? const Color(0xFFF1F5F9)
                                        : const Color(0xFF1A2337),
                                    shape: BoxShape.rectangle,
                                    borderRadius: const BorderRadius.all(
                                      Radius.circular(12),
                                    ),
                                    border: Border.all(
                                      color: AppTheme.cardBorder,
                                    ),
                                  ),
                                  child: Center(
                                    child: Icon(
                                      Icons.swap_horiz_rounded,
                                      color: AppTheme.textPrimary,
                                      size: 20,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 18),

                        // 2. Real Live Location Radar Preview Card matching Screen 3 Figma
                        GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => LiveVehicleLocationScreen(
                                  vehicle: _selectedVehicle,
                                  initialPosition: _currentPos,
                                ),
                              ),
                            );
                          },
                          child: Container(
                            height: 185,
                            decoration: BoxDecoration(
                              color: AppTheme.cardBg,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppTheme.cardBorder),
                              boxShadow: AppTheme.cardShadow,
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: Stack(
                              children: [
                                // Real Interactive Map (Light/Dark according to theme)
                                Positioned.fill(
                                  child: IgnorePointer(
                                    child: (!kIsWeb &&
                                            (defaultTargetPlatform == TargetPlatform.android ||
                                                defaultTargetPlatform == TargetPlatform.iOS))
                                        ? MapplsNativeMap(
                                            initialCenter: _currentPos,
                                            initialZoom: 15.5,
                                            interactive: false,
                                            isDark: !AppTheme.isLight,
                                          )
                                        : FlutterMap(
                                            options: MapOptions(
                                              initialCenter: _currentPos,
                                              initialZoom: 15.5,
                                            ),
                                            children: [
                                              MapConfig.buildTileLayer(
                                                userAgentPackageName: 'com.carqconnect.app',
                                                maxZoom: 20,
                                              ),
                                            ],
                                          ),
                                  ),
                                ),

                                // Radar Concentric Circles in Center with Real Vehicle Icon
                                Center(
                                  child: Stack(
                                    alignment: Alignment.center,
                                    children: [
                                      Container(
                                        width: 105,
                                        height: 105,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: AppTheme.primaryColor
                                                .withValues(alpha: 0.3),
                                            width: 1.2,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        width: 75,
                                        height: 75,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: AppTheme.primaryColor
                                                .withValues(alpha: 0.5),
                                            width: 1.4,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        width: 50,
                                        height: 50,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: AppTheme.primaryColor
                                              .withValues(alpha: 0.25),
                                          border: Border.all(
                                            color: AppTheme.primaryColor,
                                            width: 1.8,
                                          ),
                                        ),
                                      ),
                                      vehicleName.toLowerCase().contains(
                                                'splendor',
                                              ) ||
                                              vehicleName
                                                  .toLowerCase()
                                                  .contains('bike') ||
                                              vehicleName
                                                  .toLowerCase()
                                                  .contains('motorcycle')
                                          ? Container(
                                              width: 32,
                                              height: 32,
                                              decoration: BoxDecoration(
                                                color: AppTheme.primaryColor,
                                                shape: BoxShape.circle,
                                              ),
                                              child: const Center(
                                                child: Icon(
                                                  Icons.two_wheeler_rounded,
                                                  color: Colors.white,
                                                  size: 20,
                                                ),
                                              ),
                                            )
                                          : const TopViewCarWidget(
                                              width: 20,
                                              height: 36,
                                              showGlow: true,
                                            ),
                                    ],
                                  ),
                                ),

                                // Top Row: Pin + Live Location and Expand Icon
                                Positioned(
                                  top: 14,
                                  left: 14,
                                  right: 14,
                                  child: Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          Container(
                                            width: 32,
                                            height: 32,
                                            decoration: BoxDecoration(
                                              color: AppTheme.isLight
                                                  ? Colors.white.withValues(
                                                      alpha: 0.9,
                                                    )
                                                  : const Color(0xFF142238),
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                              boxShadow: AppTheme.cardShadow,
                                            ),
                                            child: Center(
                                              child: Icon(
                                                Icons.location_on,
                                                color: AppTheme.primaryColor,
                                                size: 18,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 10),
                                          Text(
                                            'Live Location',
                                            style: TextStyle(
                                              color: AppTheme.textPrimary,
                                              fontSize: 15,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                      Container(
                                        width: 32,
                                        height: 32,
                                        decoration: BoxDecoration(
                                          color: AppTheme.isLight
                                              ? Colors.white.withValues(
                                                  alpha: 0.9,
                                                )
                                              : const Color(0xFF101726)
                                                    .withValues(alpha: 0.8),
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                          border: Border.all(
                                            color: AppTheme.cardBorder,
                                          ),
                                          boxShadow: AppTheme.cardShadow,
                                        ),
                                        child: Center(
                                          child: Icon(
                                            Icons.open_in_full_rounded,
                                            color: AppTheme.textPrimary,
                                            size: 15,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                // Bottom Real Address Bar
                                Positioned(
                                  bottom: 10,
                                  left: 14,
                                  right: 14,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppTheme.isLight
                                          ? Colors.white.withValues(alpha: 0.92)
                                          : const Color(0xFF080F1B)
                                                .withValues(alpha: 0.85),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(
                                        color: AppTheme.cardBorder,
                                      ),
                                      boxShadow: AppTheme.cardShadow,
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.near_me_rounded,
                                          color: AppTheme.primaryColor,
                                          size: 14,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            _currentAddress,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              color: AppTheme.textPrimary,
                                              fontSize: 11.5,
                                              fontWeight: FontWeight.w500,
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
                        ),

                        const SizedBox(height: 18),

                        // 3. 2x2 Features Grid
                        Row(
                          children: [
                            Expanded(
                              child: _buildFeatureCard(
                                svgAsset: AppIcons.navigation,
                                title: 'Live Location',
                                subtitle: 'Track in real-time',
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          LiveVehicleLocationScreen(
                                            vehicle: _selectedVehicle,
                                            initialPosition: _currentPos,
                                          ),
                                    ),
                                  );
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildFeatureCard(
                                icon: Icons.access_time_rounded,
                                title: 'Location History',
                                subtitle: 'View past routes',
                                onTap: _openLocationHistory,
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 12),

                        Row(
                          children: [
                            Expanded(
                              child: _buildFeatureCard(
                                icon: Icons.my_location_rounded,
                                title: 'Geofence',
                                subtitle: 'Create & manage',
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => GeofenceScreen(
                                        vehicle: _selectedVehicle,
                                        initialPosition: _currentPos,
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildFeatureCard(
                                icon: Icons.local_parking_rounded,
                                title: 'Parked Vehicle',
                                subtitle: 'Find your vehicle',
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          VehicleHistoryScreen(
                                            vehicle: _selectedVehicle,
                                            currentAddress: _currentAddress,
                                          ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 18),

                        // 4. Bottom Protection Banner Card
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                          decoration: BoxDecoration(
                            gradient: AppTheme.isLight
                                ? const LinearGradient(
                                    colors: [
                                      Color(0xFFEFF6FF),
                                      Color(0xFFDBEAFE),
                                    ],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  )
                                : const LinearGradient(
                                    colors: [
                                      Color(0xFF0D254F),
                                      Color(0xFF09142A),
                                    ],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: AppTheme.isLight
                                  ? const Color(0xFFBFDBFE)
                                  : const Color(0xFF1E3A6E),
                              width: 1.2,
                            ),
                            boxShadow: AppTheme.isLight
                                ? AppTheme.cardShadow
                                : null,
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: AppTheme.isLight
                                      ? const Color(0xFFEFF6FF)
                                      : const Color(0xFF0C2B54),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: AppTheme.isLight
                                        ? const Color(0xFF0066FF)
                                        : const Color(0xFF00C2FF),
                                    width: 1.4,
                                  ),
                                ),
                                child: Center(
                                  child: Icon(
                                    Icons.shield_rounded,
                                    color: AppTheme.isLight
                                        ? const Color(0xFF0066FF)
                                        : const Color(0xFF00C2FF),
                                    size: 24,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Your Vehicle, Always in Sight',
                                      style: TextStyle(
                                        color: AppTheme.textPrimary,
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Real-time tracking for a safer tomorrow.',
                                      style: TextStyle(
                                        color: AppTheme.textSecondary,
                                        fontSize: 11.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Icon(
                                Icons.chevron_right_rounded,
                                color: AppTheme.textSecondary,
                                size: 22,
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildFeatureCard({
    IconData? icon,
    String? svgAsset,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    final isLight = AppTheme.isLight;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        height: 125,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppTheme.cardBorder),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: isLight
                    ? const Color(0xFFEDF4FF)
                    : const Color(0xFF142238),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: svgAsset != null
                    ? AppIcons.svg(
                        svgAsset,
                        color: AppTheme.primaryColor,
                        width: 22,
                        height: 22,
                      )
                    : Icon(icon, color: AppTheme.primaryColor, size: 22),
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 14.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 11.5,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
