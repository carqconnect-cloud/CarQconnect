import 'package:flutter/material.dart';

import 'dart:async';
import 'dart:convert';

import '../../globals.dart';
import '../../services/screen_refresh_service.dart';
import '../../services/auth_storage_service.dart';
import '../../theme/app_theme.dart';

import 'vehicle_tabs.dart';
import 'obd_connection.dart';
import 'vehicle_alerts.dart';
import 'car_scan_animation_screen.dart';
import '../../widgets/animated_back_arrow.dart';

export 'vehicle_tabs.dart';
export 'vehicle_dashboard.dart';
export 'vehicle_health.dart';
export 'vehicle_livedata.dart';
export 'vehicle_details.dart';
export 'vehicle_setting.dart';
export 'obd_connection.dart';
export 'connecting_obd_screen.dart';
export 'vehicle_alerts.dart';
export 'car_scan_animation_screen.dart';

class GarageScreen extends StatefulWidget {
  final VoidCallback? onBackToHome;

  const GarageScreen({super.key, this.onBackToHome});

  @override
  State<GarageScreen> createState() => _GarageScreenState();
}

class _GarageScreenState extends State<GarageScreen>
    with RefreshOnRouteReturn<GarageScreen> {
  bool _isObdConnected = true;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _refreshGarage();
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) {
        _refreshGarage();
      }
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _refreshGarage() async {
    if (Globals.accessToken.isNotEmpty) {
      try {
        final response = await AuthStorageService.authenticatedGet('/app-qr/vehicles');
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          if (data['success'] == true &&
              data['data'] != null &&
              (data['data'] as List).isNotEmpty) {
            final list = data['data'] as List;
            if (mounted) {
              setState(() {
                final first = list[0];
                if (first['name'] != null &&
                    first['name'].toString().isNotEmpty) {
                  _vehicles[0]['name'] = first['name'];
                }

                if (first['regNumber'] != null &&
                    first['regNumber'].toString().isNotEmpty) {
                  _vehicles[0]['plate'] = first['regNumber'];
                }
                _vehicles[0]['lastSynced'] = 'Just now';
              });
            }
          }
        }
      } catch (e) {
        debugPrint('Error syncing garage vehicles: $e');
      }
    }
    if (mounted) {
      setState(() {
        if (_isObdConnected && _vehicles.isNotEmpty) {
          _vehicles[0]['lastSynced'] = 'Just now';
        }
      });
    }
  }

  void _openCarScanAnimation(Map<String, dynamic> car) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CarScanAnimationScreen(
          vehicleName: car['name'] as String? ?? 'Hyundai Creta',
          vehiclePlate: car['plate'] as String? ?? 'MP 09 AB 1234',
          onScanComplete: () {
            setState(() {
              car['lastSynced'] = 'Just now';
              car['engineHealth'] = 98;
            });
          },
        ),
      ),
    );
  }

  void _navigateToObdConnection() async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (context) => const ObdConnectionScreen()),
    );

    if (result == true && mounted) {
      setState(() {
        _isObdConnected = true;
        _vehicles[0]['connected'] = true;
        _vehicles[0]['lastSynced'] = 'Just now';
      });
    }
  }

  void _disconnectObd() {
    setState(() {
      _isObdConnected = false;
      _vehicles[0]['connected'] = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('OBD device disconnected'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _showConnectionOptionsSheet() {
    final isLight = AppTheme.isLightNotifier.value;
    showModalBottomSheet(
      context: context,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'OBD Device Options',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: Icon(
                      Icons.close,
                      color: isLight
                          ? const Color(0xFF64748B)
                          : const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFDCFCE7)
                        : const Color(0xFF070B18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.bluetooth_connected,
                    color: Color(0xFF10B981),
                  ),
                ),
                title: Text(
                  'CarQConnect OBD Pro Connected',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                subtitle: const Text(
                  'Telemetry and live diagnosis active.',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
              ),
              Divider(
                color: isLight
                    ? const Color(0xFFE2E8F0)
                    : const Color(0xFF1E2D4A),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFE0F2FE)
                        : const Color(0xFF070B18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.settings_outlined,
                    color: Color(0xFF00C2FF),
                  ),
                ),
                title: Text(
                  'OBD Device Details & Settings',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                  ),
                ),
                trailing: Icon(
                  Icons.chevron_right,
                  color: isLight
                      ? const Color(0xFF94A3B8)
                      : const Color(0xFF64748B),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const ObdConnectionScreen(),
                    ),
                  );
                },
              ),
              Divider(
                color: isLight
                    ? const Color(0xFFE2E8F0)
                    : const Color(0xFF1E2D4A),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFFEE2E2)
                        : const Color(0xFF450A0A),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.bluetooth_disabled,
                    color: Color(0xFFEF4444),
                  ),
                ),
                title: const Text(
                  'Disconnect Device',
                  style: TextStyle(
                    color: Color(0xFFEF4444),
                    fontSize: 14.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                subtitle: const Text(
                  'Switch back to unconnected OBD state.',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _disconnectObd();
                },
              ),
              Divider(
                color: isLight
                    ? const Color(0xFFE2E8F0)
                    : const Color(0xFF1E2D4A),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFE0F2FE)
                        : const Color(0xFF070B18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.help_outline_rounded,
                    color: Color(0xFF00C2FF),
                  ),
                ),
                title: Text(
                  'Help & Diagnostics Troubleshooting',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                  ),
                ),
                subtitle: const Text(
                  'Common pairing questions & OBD guides.',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
                trailing: Icon(
                  Icons.chevron_right,
                  color: isLight
                      ? const Color(0xFF94A3B8)
                      : const Color(0xFF64748B),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _showHelpSheet();
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showHelpSheet() {
    final isLight = AppTheme.isLightNotifier.value;
    showModalBottomSheet(
      context: context,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Need Help?',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: Icon(
                      Icons.close,
                      color: isLight
                          ? const Color(0xFF64748B)
                          : const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFE0F2FE)
                        : const Color(0xFF070B18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.bluetooth_searching,
                    color: Color(0xFF00C2FF),
                  ),
                ),
                title: Text(
                  'OBD device not discovering',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                  ),
                ),
                subtitle: const Text(
                  'Ensure car ignition is ON and Bluetooth is enabled on your phone.',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
              ),
              Divider(
                color: isLight
                    ? const Color(0xFFE2E8F0)
                    : const Color(0xFF1E2D4A),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFDCFCE7)
                        : const Color(0xFF070B18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.support_agent_rounded,
                    color: Color(0xFF10B981),
                  ),
                ),
                title: Text(
                  'Contact Customer Support',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                  ),
                ),
                subtitle: const Text(
                  '24/7 dedicated support for vehicle pairing and diagnosis.',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Connecting to 24/7 support...'),
                    ),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  // Vehicle list state for interactivity
  final List<Map<String, dynamic>> _vehicles = [
    {
      'id': '1',
      'name': 'Hyundai Creta',
      'plate': 'MP 09 AB 1234',
      'type': 'car',
      'image': 'assets/homescreensicons/carimage.png',
      'connected': true,
      'lastSynced': 'Last synced 2 min ago',
      'engineHealth': 76,
      'battery': '12.4 V',
      'drivingScore': 'Good',
    },
    {
      'id': '2',
      'name': 'Royal Enfield Classic 350',
      'plate': 'MP 09 CD 5678',
      'type': 'bike',
      'image': 'assets/homescreensicons/bikeimage.png',
      'connected': false,
      'lastSynced': '',
      'engineHealth': null,
      'battery': null,
      'drivingScore': null,
    },
  ];

  void _handleBack() {
    if (Navigator.canPop(context)) {
      Navigator.pop(context);
    } else if (widget.onBackToHome != null) {
      widget.onBackToHome!();
    }
  }

  void _showAddVehicleModal() {
    final isLight = AppTheme.isLightNotifier.value;
    final nameController = TextEditingController();
    final plateController = TextEditingController();
    String selectedType = 'Car';
    String selectedFuel = 'Petrol';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Add New Vehicle',
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF0F172A)
                              : Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        icon: Icon(
                          Icons.close,
                          color: isLight
                              ? const Color(0xFF64748B)
                              : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Vehicle Type Selector (Car / Bike)
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () =>
                              setModalState(() => selectedType = 'Car'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: selectedType == 'Car'
                                  ? (isLight
                                        ? const Color(0xFF0066FF)
                                              .withValues(alpha: 0.1)
                                        : const Color(0xFF04C9FB)
                                              .withValues(alpha: 0.15))
                                  : (isLight
                                        ? const Color(0xFFF8FAFC)
                                        : const Color(0xFF0A1222)),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: selectedType == 'Car'
                                    ? (isLight
                                          ? const Color(0xFF0066FF)
                                          : const Color(0xFF04C9FB))
                                    : (isLight
                                          ? const Color(0xFFE2E8F0)
                                          : const Color(0xFF1E2D4A)),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.directions_car_rounded,
                                  color: selectedType == 'Car'
                                      ? (isLight
                                            ? const Color(0xFF0066FF)
                                            : const Color(0xFF04C9FB))
                                      : const Color(0xFF64748B),
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Car',
                                  style: TextStyle(
                                    color: selectedType == 'Car'
                                        ? (isLight
                                              ? const Color(0xFF0066FF)
                                              : Colors.white)
                                        : (isLight
                                              ? const Color(0xFF64748B)
                                              : const Color(0xFF94A3B8)),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: () =>
                              setModalState(() => selectedType = 'Bike'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: selectedType == 'Bike'
                                  ? (isLight
                                        ? const Color(0xFF0066FF)
                                              .withValues(alpha: 0.1)
                                        : const Color(0xFF04C9FB)
                                              .withValues(alpha: 0.15))
                                  : (isLight
                                        ? const Color(0xFFF8FAFC)
                                        : const Color(0xFF0A1222)),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: selectedType == 'Bike'
                                    ? (isLight
                                          ? const Color(0xFF0066FF)
                                          : const Color(0xFF04C9FB))
                                    : (isLight
                                          ? const Color(0xFFE2E8F0)
                                          : const Color(0xFF1E2D4A)),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.two_wheeler_rounded,
                                  color: selectedType == 'Bike'
                                      ? (isLight
                                            ? const Color(0xFF0066FF)
                                            : const Color(0xFF04C9FB))
                                      : const Color(0xFF64748B),
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Bike',
                                  style: TextStyle(
                                    color: selectedType == 'Bike'
                                        ? (isLight
                                              ? const Color(0xFF0066FF)
                                              : Colors.white)
                                        : (isLight
                                              ? const Color(0xFF64748B)
                                              : const Color(0xFF94A3B8)),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Brand & Model
                  TextField(
                    controller: nameController,
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    ),
                    decoration: InputDecoration(
                      labelText: 'Vehicle Brand & Model (e.g. Tata Nexon)',
                      labelStyle: TextStyle(
                        color: isLight
                            ? const Color(0xFF64748B)
                            : const Color(0xFF64748B),
                      ),
                      filled: true,
                      fillColor: isLight
                          ? const Color(0xFFF8FAFC)
                          : const Color(0xFF0A1222),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF1E2D4A),
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF1E2D4A),
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(
                          color: isLight
                              ? const Color(0xFF0066FF)
                              : const Color(0xFF04C9FB),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Registration Number
                  TextField(
                    controller: plateController,
                    textCapitalization: TextCapitalization.characters,
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    ),
                    decoration: InputDecoration(
                      labelText: 'Registration Number (e.g. MP 09 ZZ 9999)',
                      labelStyle: TextStyle(
                        color: isLight
                            ? const Color(0xFF64748B)
                            : const Color(0xFF64748B),
                      ),
                      filled: true,
                      fillColor: isLight
                          ? const Color(0xFFF8FAFC)
                          : const Color(0xFF0A1222),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF1E2D4A),
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF1E2D4A),
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(
                          color: isLight
                              ? const Color(0xFF0066FF)
                              : const Color(0xFF04C9FB),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Fuel Type
                  Text(
                    'Fuel Type',
                    style: TextStyle(
                      color: isLight
                          ? const Color(0xFF64748B)
                          : const Color(0xFF64748B),
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: ['Petrol', 'Diesel', 'Electric', 'CNG'].map((
                      fuel,
                    ) {
                      final isSelected = selectedFuel == fuel;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () => setModalState(() => selectedFuel = fuel),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? (isLight
                                        ? const Color(0xFF0066FF)
                                              .withValues(alpha: 0.1)
                                        : const Color(0xFF04C9FB)
                                              .withValues(alpha: 0.15))
                                  : (isLight
                                        ? const Color(0xFFF8FAFC)
                                        : const Color(0xFF0A1222)),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected
                                    ? (isLight
                                          ? const Color(0xFF0066FF)
                                          : const Color(0xFF04C9FB))
                                    : (isLight
                                          ? const Color(0xFFE2E8F0)
                                          : const Color(0xFF1E2D4A)),
                              ),
                            ),
                            child: Text(
                              fuel,
                              style: TextStyle(
                                color: isSelected
                                    ? (isLight
                                          ? const Color(0xFF0066FF)
                                          : const Color(0xFF04C9FB))
                                    : (isLight
                                          ? const Color(0xFF64748B)
                                          : const Color(0xFF94A3B8)),
                                fontSize: 12,
                                fontWeight: isSelected
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),

                  // Add Button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: () {
                        if (nameController.text.trim().isNotEmpty) {
                          setState(() {
                            _vehicles.add({
                              'id': DateTime.now().millisecondsSinceEpoch
                                  .toString(),
                              'name': nameController.text.trim(),
                              'plate': plateController.text.trim().isEmpty
                                  ? 'MP 09 XY 0000'
                                  : plateController.text.trim().toUpperCase(),
                              'type': selectedType.toLowerCase(),
                              'fuel': selectedFuel,
                              'image': selectedType == 'Car'
                                  ? 'assets/homescreensicons/carimage.png'
                                  : 'assets/homescreensicons/bikeimage.png',
                              'connected': false,
                              'lastSynced': '',
                              'engineHealth': null,
                              'battery': null,
                              'drivingScore': null,
                            });
                          });
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                '${nameController.text.trim()} added to your garage!',
                                style: const TextStyle(color: Colors.white),
                              ),
                              backgroundColor: isLight
                                  ? const Color(0xFF0F172A)
                                  : const Color(0xFF0F1A2E),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isLight
                            ? const Color(0xFF0066FF)
                            : const Color(0xFF04C9FB),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: Text(
                        'Add Vehicle',
                        style: TextStyle(
                          color: isLight
                              ? Colors.white
                              : const Color(0xFF070B18),
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
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

  void _showBikeOptions(BuildContext context, Map<String, dynamic> bike) {
    final isLight = AppTheme.isLightNotifier.value;
    showModalBottomSheet(
      context: context,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isLight
                      ? const Color(0xFFE2E8F0)
                      : const Color(0xFF1E2D4A),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Image.asset(
                    bike['image'] as String,
                    width: 60,
                    height: 40,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          bike['name'] as String,
                          style: TextStyle(
                            color: isLight
                                ? const Color(0xFF0F172A)
                                : Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          bike['plate'] as String,
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFE0F2FE)
                        : const Color(0xFF04C9FB).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.bluetooth_connected_rounded,
                    color: isLight
                        ? const Color(0xFF0066FF)
                        : const Color(0xFF04C9FB),
                    size: 22,
                  ),
                ),
                title: Text(
                  'Connect OBD Dongle',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: const Text(
                  'Pair with Bluetooth OBD device to track bike health',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
                trailing: Icon(
                  Icons.chevron_right,
                  color: isLight
                      ? const Color(0xFF94A3B8)
                      : const Color(0xFF64748B),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const ObdConnectionScreen(),
                    ),
                  );
                },
              ),
              Divider(
                color: isLight
                    ? const Color(0xFFE2E8F0)
                    : const Color(0xFF1E2D4A),
                height: 20,
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFDCFCE7)
                        : const Color(0xFF10B981).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.dashboard_outlined,
                    color: Color(0xFF10B981),
                    size: 22,
                  ),
                ),
                title: Text(
                  'Open Vehicle Dashboard',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: const Text(
                  'View health, specs, and details',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
                trailing: Icon(
                  Icons.chevron_right,
                  color: isLight
                      ? const Color(0xFF94A3B8)
                      : const Color(0xFF64748B),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => VehicleTabsScreen(
                        vehicleName: bike['name'] as String,
                        vehiclePlate: bike['plate'] as String,
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Future<void> refreshOnRouteReturn() => _refreshGarage();

  @override
  Widget build(BuildContext context) {
    final primaryCar = _vehicles.firstWhere(
      (v) => v['name'] == 'Hyundai Creta',
      orElse: () => _vehicles.first,
    );
    final secondaryBike = _vehicles.firstWhere(
      (v) => v['name'] == 'Royal Enfield Classic 350',
      orElse: () => _vehicles.length > 1 ? _vehicles[1] : _vehicles.first,
    );

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(gradient: AppTheme.bgGradient),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            body: SafeArea(
              child: Column(
                children: [
                  // 1. Top App Bar: Back Button, 'Garage' Title, Alerts Triangle Icon
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: Row(
                      children: [
                        // Back Button
                        AnimatedBackArrowButton(onTap: _handleBack),

                        // Garage Title in Center
                        Expanded(
                          child: Center(
                            child: Text(
                              'Garage',
                              style: TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 19,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.2,
                              ),
                            ),
                          ),
                        ),

                        // Alert Icon on Right (Navigates to VehicleAlertsScreen)
                        InkWell(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    const VehicleAlertsScreen(),
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            child: Icon(
                              Icons.warning_amber_rounded,
                              color: AppTheme.textPrimary,
                              size: 24,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // 2. Main Content
                  Expanded(
                    child: RefreshIndicator(
                      color: AppTheme.primaryColor,
                      backgroundColor: AppTheme.cardBg,
                      onRefresh: _refreshGarage,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(
                          parent: BouncingScrollPhysics(),
                        ),
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // --- Vehicle 1: Hyundai Creta Card ---
                            _buildCretaCard(primaryCar),

                            const SizedBox(height: 14),

                            // --- Vehicle 2: Royal Enfield Bike Card ---
                            _buildBikeCard(secondaryBike),

                            // Render any additional added vehicles
                            ..._vehicles
                                .where(
                                  (v) =>
                                      v['id'] != primaryCar['id'] &&
                                      v['id'] != secondaryBike['id'],
                                )
                                .map(
                                  (v) => Padding(
                                    padding: const EdgeInsets.only(top: 14),
                                    child: _buildGenericVehicleCard(v),
                                  ),
                                ),

                            const SizedBox(height: 16),

                            // --- '+ Add New Vehicle' Button ---
                            _buildAddVehicleButton(),

                            const SizedBox(height: 16),

                            // --- 'Connect your OBD device' Glowing Card ---
                            _buildObdBannerCard(),
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
    );
  }

  // Widget for Hyundai Creta with 3 Metric Cards inside
  Widget _buildCretaCard(Map<String, dynamic> car) {
    final isConnected = _isObdConnected && (car['connected'] as bool? ?? false);
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => VehicleTabsScreen(
              vehicleName: car['name'] as String,
              vehiclePlate: car['plate'] as String,
              initialTabIndex: 0,
            ),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.cardBorder, width: 1.0),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Column(
          children: [
            // Top Row: Car Image, Name, Plate, Status, Chevron
            Row(
              children: [
                // Car Image
                SizedBox(
                  width: 90,
                  height: 56,
                  child: Image.asset(
                    car['image'] as String,
                    fit: BoxFit.contain,
                  ),
                ),
                const SizedBox(width: 14),

                // Name & Plate & Status
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        car['name'] as String,
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 16.5,
                          fontWeight: FontWeight.bold,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        car['plate'] as String,
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Connected Badge + Last synced
                      Row(
                        children: [
                          GestureDetector(
                            onTap: _showConnectionOptionsSheet,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: isConnected
                                    ? const Color(0xFF064E3B)
                                          .withValues(alpha: 0.5)
                                    : const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isConnected
                                      ? const Color(0xFF10B981)
                                            .withValues(alpha: 0.4)
                                      : const Color(0xFF334155),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: BoxDecoration(
                                      color: isConnected
                                          ? const Color(0xFF10B981)
                                          : const Color(0xFF64748B),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    isConnected ? 'Connected' : 'Not Connected',
                                    style: TextStyle(
                                      color: isConnected
                                          ? Colors.white
                                          : const Color(0xFF94A3B8),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              car['lastSynced'] as String? ?? '',
                              style: const TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 11,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Chevron Right
                const Icon(
                  Icons.chevron_right_rounded,
                  color: Color(0xFF64748B),
                  size: 24,
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Bottom Row: 3 Metric Cards (Engine Health, Battery, Driving Score)
            Row(
              children: [
                // 1. Engine Health (76%) -> Tapping opens Health Tab
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => VehicleTabsScreen(
                            vehicleName: car['name'] as String,
                            vehiclePlate: car['plate'] as String,
                            initialTabIndex: 1, // Health tab
                          ),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        vertical: 12,
                        horizontal: 6,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF091224),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: const Color(0xFF182642),
                          width: 1.0,
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 44,
                            height: 44,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                CircularProgressIndicator(
                                  value:
                                      (car['engineHealth'] as num? ?? 76) /
                                      100.0,
                                  strokeWidth: 3.5,
                                  backgroundColor: const Color(0xFF1A2942),
                                  valueColor:
                                      const AlwaysStoppedAnimation<Color>(
                                        Color(0xFF04C9FB),
                                      ),
                                ),
                                Text(
                                  '${car['engineHealth'] ?? 76}%',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Engine Health',
                            style: TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),

                // 2. Battery (12.4 V) -> Tapping opens Live Data Tab
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => VehicleTabsScreen(
                            vehicleName: car['name'] as String,
                            vehiclePlate: car['plate'] as String,
                            initialTabIndex: 2, // Live data tab
                          ),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        vertical: 12,
                        horizontal: 6,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF091224),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: const Color(0xFF182642),
                          width: 1.0,
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFF04C9FB)
                                  .withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: const Color(0xFF04C9FB)
                                    .withValues(alpha: 0.3),
                              ),
                            ),
                            child: const Icon(
                              Icons.battery_charging_full_rounded,
                              color: Color(0xFF04C9FB),
                              size: 18,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            car['battery'] as String? ?? '12.4 V',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Battery',
                            style: TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),

                // 3. Driving Score (Good) -> Tapping opens Overview
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => VehicleTabsScreen(
                            vehicleName: car['name'] as String,
                            vehiclePlate: car['plate'] as String,
                            initialTabIndex: 0,
                          ),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        vertical: 12,
                        horizontal: 6,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF091224),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: const Color(0xFF182642),
                          width: 1.0,
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981)
                                  .withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: const Color(0xFF10B981)
                                    .withValues(alpha: 0.3),
                              ),
                            ),
                            child: const Icon(
                              Icons.shield_outlined,
                              color: Color(0xFF10B981),
                              size: 18,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            car['drivingScore'] as String? ?? 'Good',
                            style: const TextStyle(
                              color: Color(0xFF10B981),
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Driving Score',
                            style: TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Vibrant Cyan 'Scan for Live Data →' Pill Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () => _openCarScanAnimation(car),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00C2FF),
                  foregroundColor: Colors.black,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Text(
                      'Scan for Live Data',
                      style: TextStyle(
                        color: Colors.black,
                        fontSize: 15.5,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.2,
                      ),
                    ),
                    SizedBox(width: 8),
                    Icon(
                      Icons.arrow_forward_rounded,
                      color: Colors.black,
                      size: 19,
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

  // Widget for Royal Enfield Bike Card
  Widget _buildBikeCard(Map<String, dynamic> bike) {
    return GestureDetector(
      onTap: () => _showBikeOptions(context, bike),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.cardBorder, width: 1.0),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Row(
          children: [
            // Bike Image
            SizedBox(
              width: 90,
              height: 56,
              child: Image.asset(bike['image'] as String, fit: BoxFit.contain),
            ),
            const SizedBox(width: 14),

            // Name & Plate & Not Connected
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    bike['name'] as String,
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 15.5,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    bike['plate'] as String,
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Not Connected Pill
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: Color(0xFF64748B),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 5),
                        const Text(
                          'Not Connected',
                          style: TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Chevron Right
            const Icon(
              Icons.chevron_right_rounded,
              color: Color(0xFF64748B),
              size: 24,
            ),
          ],
        ),
      ),
    );
  }

  // Generic vehicle card for newly added vehicles
  Widget _buildGenericVehicleCard(Map<String, dynamic> v) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => VehicleTabsScreen(
              vehicleName: v['name'] as String,
              vehiclePlate: v['plate'] as String,
            ),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF0F1A2E),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFF1E2D4A), width: 1.0),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 80,
              height: 50,
              child: Image.asset(v['image'] as String, fit: BoxFit.contain),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    v['name'] as String,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    v['plate'] as String,
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              color: Color(0xFF64748B),
              size: 24,
            ),
          ],
        ),
      ),
    );
  }

  // '+ Add New Vehicle' Button Widget
  Widget _buildAddVehicleButton() {
    return InkWell(
      onTap: _showAddVehicleModal,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.cardBorder, width: 1.2),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add, color: AppTheme.primaryColor, size: 20),
            const SizedBox(width: 8),
            Text(
              'Add New Vehicle',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 14.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 'Connect your OBD device' Banner Widget
  Widget _buildObdBannerCard() {
    return GestureDetector(
      onTap: _navigateToObdConnection,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0D2554), Color(0xFF0F2040), Color(0xFF173D82)],
          ),
          border: Border.all(
            color: const Color(0xFF1E4082).withValues(alpha: 0.7),
            width: 1.0,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // OBD Dongle Image
              Image.asset(
                'assets/homescreensicons/carqconnect_obd_dongle_crop.png',
                width: 50,
                height: 50,
                fit: BoxFit.contain,
              ),
              const SizedBox(width: 16),

              // Title and Description
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Connect your OBD device',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Get real-time vehicle health, alerts and insights.',
                      style: TextStyle(
                        color: Color(0xFF93C5FD),
                        fontSize: 12.5,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
