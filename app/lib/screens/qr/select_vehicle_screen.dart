import '../../services/vehicle_type_service.dart';
import 'package:flutter/material.dart';

import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../globals.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import 'set_contact_privacy_screen.dart';
import 'active_qr_tag_screen.dart';
import 'link_qr_tag_screen.dart';
import '../bottom_navigation_screen.dart';
import '../../utils/app_validators.dart';
import '../../utils/api_config.dart';
import '../../services/screen_refresh_service.dart';
import '../../services/auth_storage_service.dart';
import '../trip/trip_service.dart';
import '../../widgets/animated_back_arrow.dart';

class VehicleModel {
  final String id;
  final String name;
  final String regNumber;
  final String imagePath;
  final String? tagId;
  final Map<String, dynamic>? tagData;

  const VehicleModel({
    required this.id,
    required this.name,
    required this.regNumber,
    this.imagePath = '',
    this.tagId,
    this.tagData,
  });

  factory VehicleModel.fromJson(
    Map<String, dynamic> json, [
    Map<String, dynamic>? tagData,
  ]) {
    return VehicleModel(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? json['model'] ?? 'Vehicle',
      regNumber: json['regNumber'] ?? json['reg'] ?? '',
      imagePath: json['imagePath'] ?? '',
      tagId: tagData?['tagId'] ?? tagData?['code'] ?? json['tagId'],
      tagData: tagData,
    );
  }
}

/// QR Tag Screen matching Figma screenshot
class SelectVehicleScreen extends StatefulWidget {
  final bool linkExistingTag;
  final bool onlyActivated;
  final bool showAddVehicle;
  final String title;

  const SelectVehicleScreen({
    super.key,
    this.linkExistingTag = false,
    this.onlyActivated = false,
    this.showAddVehicle = true,
    this.title = 'QR Tag',
  });

  @override
  State<SelectVehicleScreen> createState() => _SelectVehicleScreenState();
}

class _SelectVehicleScreenState extends State<SelectVehicleScreen>
    with RefreshOnRouteReturn<SelectVehicleScreen> {
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  List<VehicleModel> _vehicles = [];
  String? _selectedVehicleId;
  final Map<String, Map<String, dynamic>> _vehicleTags = {};
  final Map<String, String> _resolvedVehicleImages = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchVehicles();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchVehicles() async {
    try {
      final cachedVehicles = await TripService.loadCachedUserVehicles();
      if (mounted && cachedVehicles.isNotEmpty) {
        setState(() {
          _vehicles = cachedVehicles
              .map((vehicle) => VehicleModel.fromJson(vehicle))
              .toList();
          _selectedVehicleId ??= _vehicles.first.id;
        });
      }

      if (Globals.accessToken.isNotEmpty) {
        // Fetch tags and vehicles in parallel for lightning-fast loading
        try {
          final tagsFuture = AuthStorageService.authenticatedGet('/app-qr/tags');
          final vehiclesFuture = TripService.getUserVehicles();

          // A failure to load tag status must not hide vehicles that loaded
          // successfully. Await the two concurrent requests independently.
          final vehicles = await vehiclesFuture;
          if (vehicles.isNotEmpty && mounted) {
            setState(() {
              _vehicles = vehicles
                  .map((vehicle) => VehicleModel.fromJson(vehicle))
                  .toList();
              _selectedVehicleId ??= _vehicles.first.id;
            });
          }

          try {
            final tagRes = await tagsFuture;
            if (tagRes.statusCode == 200) {
              final tagBody = jsonDecode(tagRes.body);
              if (tagBody['data'] is List) {
                for (final t in tagBody['data']) {
                  if (t['vehicleId'] != null) {
                    _vehicleTags[t['vehicleId'].toString()] =
                        Map<String, dynamic>.from(t);
                  }
                }
              }
            }
          } catch (error) {
            debugPrint('QR status could not be loaded: $error');
          }

          if (vehicles.isNotEmpty && mounted) {
            setState(() {
              _vehicles = vehicles.map((vehicle) {
                final vehicleId = vehicle['id']?.toString() ?? '';
                return VehicleModel.fromJson(
                  vehicle,
                  _vehicleTags[vehicleId],
                );
              }).toList();
              _selectedVehicleId ??= _vehicles.first.id;
            });
          }
        } catch (e) {
          debugPrint('Error parallel fetching vehicles and tags: $e');
        }
      } else if (cachedVehicles.isNotEmpty && mounted) {
        setState(() {
          _vehicles = cachedVehicles
              .map((vehicle) => VehicleModel.fromJson(vehicle))
              .toList();
        });
      }
    } catch (e) {
      debugPrint('Error fetching vehicles: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  bool _hasUsableVehicleImage(VehicleModel vehicle) {
    final imagePath = vehicle.imagePath.trim();
    if (imagePath.isEmpty ||
        imagePath.contains('white_creta.jpg') ||
        imagePath.contains('wikimedia.org') ||
        imagePath.contains('wikipedia.org')) {
      return false;
    }

    final lowerName = vehicle.name.toLowerCase();
    final lowerPath = imagePath.toLowerCase();
    final isTwoWheeler = _isTwoWheeler(lowerName);
    if (isTwoWheeler && lowerPath.contains('carimage.png')) return false;

    if ((lowerName.contains('pulsar') &&
            (lowerPath.contains('splendor') ||
                lowerPath.contains('uqkb0n2xuqdi8f40mwgh'))) ||
        (lowerName.contains('activa') && !lowerPath.contains('activa')) ||
        (lowerName.contains('splendor') &&
            !lowerPath.contains('splendor') &&
            !lowerPath.contains('uqkb0n2xuqdi8f40mwgh'))) {
      return false;
    }

    return imagePath.startsWith('http://') ||
        imagePath.startsWith('https://') ||
        imagePath.startsWith('assets/');
  }

  bool _isTwoWheeler(String name) {
    const keywords = [
      'activa',
      'ninja',
      'kawasaki',
      'hayabusa',
      'zx',
      'superbike',
      'bike',
      'motorcycle',
      'scooter',
      'scooty',
      'dio',
      'jupiter',
      'access',
      'pleasure',
      'ntorq',
      'ola',
      'ather',
      'chetak',
      'destini',
      'ray',
      'grazia',
      'burgman',
      'fascino',
      'vespa',
      'aerox',
      'vida',
      'iqube',
      'splendor',
      'passion',
      'shine',
      'platina',
      'hf deluxe',
      'ct 100',
      'glamour',
      'pulsar',
      'apache',
      'bullet',
      'classic',
      'duke',
      'ktm',
      'r15',
      'mt 15',
      'fz',
      'hunter',
      'meteor',
      'avenger',
      'himalayan',
      'harley',
      'cbr',
      'panigale',
      'ducati',
      's1000rr',
      'daytona',
      'gsx',
      'sp 125',
      'raider',
      'ronin',
    ];
    return keywords.any(name.contains);
  }

  void _onVehicleTap(VehicleModel vehicle) {
    setState(() => _selectedVehicleId = vehicle.id);
    if (widget.linkExistingTag) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => LinkQrTagScreen(
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            vehicleReg: vehicle.regNumber,
          ),
        ),
      );
      return;
    }

    final tag = _vehicleTags[vehicle.id] ?? vehicle.tagData;
    final resolvedTagId = tag?['tagId'] ?? tag?['code'] ?? vehicle.tagId;

    if (resolvedTagId != null && resolvedTagId.toString().isNotEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ActiveQrTagScreen(
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            vehicleReg: vehicle.regNumber,
            tagId: resolvedTagId.toString(),
            callOwner: tag?['callOwner'] ?? true,
            sendMessage: tag?['sendMessage'] ?? true,
            bloodGroupVisibility: tag?['bloodGroupVisibility'] ?? false,
            emergencyContact: tag?['emergencyContact'] ?? true,
          ),
        ),
      ).then((_) => _fetchVehicles());
    } else {
      // If tag not yet generated, open privacy screen to activate/generate QR
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => SetContactPrivacyScreen(
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            vehicleReg: vehicle.regNumber,
          ),
        ),
      ).then((_) => _fetchVehicles());
    }
  }

  void _onAddNewVehicle() {
    final isLight = AppTheme.isLight;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A26),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        final nameController = TextEditingController();
        final regController = TextEditingController();
        String selectedFuel = 'Petrol';
        bool isAdding = false;
        List<String> suggestions = [];

        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(
                20,
                24,
                20,
                MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Add New Vehicle',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: nameController,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      ),
                      onChanged: (val) {
                        final autoFuel = VehicleTypeService.detectFuelType(val);
                        final newSugg = VehicleTypeService.getSuggestions(val);
                        setModalState(() {
                          selectedFuel = autoFuel;
                          suggestions = newSugg;
                        });
                        VehicleTypeService.lookup(val).then((res) {
                          if (modalCtx.mounted && nameController.text.trim() == val.trim()) {
                            setModalState(() {
                              selectedFuel = res.detectedFuel;
                              if (res.suggestions.isNotEmpty) {
                                suggestions = res.suggestions;
                              }
                            });
                          }
                        });
                      },
                      decoration: InputDecoration(
                        hintText: 'Vehicle Model (e.g. Hyundai Creta, BE 6)',
                        hintStyle: TextStyle(
                          color: isLight
                              ? const Color(0xFF94A3B8)
                              : const Color(0xFF6B7C91),
                        ),
                        filled: true,
                        fillColor: isLight
                            ? const Color(0xFFF8FAFC)
                            : const Color(0xFF090E15),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(
                            color: isLight
                                ? const Color(0xFFE2E8F0)
                                : const Color(0xFF192535),
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(
                            color: isLight
                                ? const Color(0xFFE2E8F0)
                                : const Color(0xFF192535),
                          ),
                        ),
                      ),
                    ),
                    if (suggestions.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: suggestions.map((sugg) {
                            return Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: GestureDetector(
                                behavior: HitTestBehavior.opaque,
                                onTap: () {
                                  nameController.value = TextEditingValue(
                                    text: sugg,
                                    selection: TextSelection.collapsed(
                                      offset: sugg.length,
                                    ),
                                    composing: TextRange.empty,
                                  );
                                  final autoFuel =
                                      VehicleTypeService.detectFuelType(sugg);
                                  FocusScope.of(modalCtx).unfocus();
                                  setModalState(() {
                                    selectedFuel = autoFuel;
                                    suggestions = [];
                                  });
                                  VehicleTypeService.lookup(sugg).then((res) {
                                    if (modalCtx.mounted &&
                                        nameController.text.trim() ==
                                            sugg.trim()) {
                                      setModalState(() {
                                        selectedFuel = res.detectedFuel;
                                      });
                                    }
                                  });
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 7,
                                  ),
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? const Color(0xFFEFF6FF)
                                        : const Color(0xFF131F30),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: isLight
                                          ? const Color(0xFFBFDBFE)
                                          : const Color(0xFF1E3A5F),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.directions_car_rounded,
                                        size: 14,
                                        color: isLight
                                            ? AppTheme.primaryBlue
                                            : const Color(0xFF00C2FF),
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        sugg,
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                          color: isLight
                                              ? const Color(0xFF0F172A)
                                              : Colors.white,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    TextField(
                      controller: regController,
                      inputFormatters: AppValidators.vehicleNumberFormatters,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      ),
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'Registration Number (e.g. DL 01 AB 1234)',
                        hintStyle: TextStyle(
                          color: isLight
                              ? const Color(0xFF94A3B8)
                              : const Color(0xFF6B7C91),
                        ),
                        filled: true,
                        fillColor: isLight
                            ? const Color(0xFFF8FAFC)
                            : const Color(0xFF090E15),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(
                            color: isLight
                                ? const Color(0xFFE2E8F0)
                                : const Color(0xFF192535),
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(
                            color: isLight
                                ? const Color(0xFFE2E8F0)
                                : const Color(0xFF192535),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Text(
                          "Vehicle Type:",
                          style: TextStyle(
                            color: isLight
                                ? const Color(0xFF64748B)
                                : const Color(0xFF8E9BAE),
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: selectedFuel == 'EV'
                                ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                : (selectedFuel == 'CNG'
                                    ? const Color(0xFF0EA5E9).withValues(alpha: 0.15)
                                    : AppTheme.primaryColor.withValues(alpha: 0.15)),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'Auto: $selectedFuel',
                            style: TextStyle(
                              color: selectedFuel == 'EV'
                                  ? const Color(0xFF059669)
                                  : (selectedFuel == 'CNG'
                                      ? const Color(0xFF0284C7)
                                      : AppTheme.primaryColor),
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: VehicleTypeService.fuelTypes.map((fuel) {
                        final isSel = selectedFuel == fuel;
                        return GestureDetector(
                          onTap: () =>
                              setModalState(() => selectedFuel = fuel),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 7,
                            ),
                            decoration: BoxDecoration(
                              color: isSel
                                  ? (isLight
                                      ? AppTheme.primaryBlue
                                      : const Color(0xFF00C2FF))
                                  : (isLight
                                      ? const Color(0xFFF1F5F9)
                                      : const Color(0xFF162232)),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isSel
                                    ? Colors.transparent
                                    : (isLight
                                        ? const Color(0xFFE2E8F0)
                                        : const Color(0xFF223246)),
                              ),
                            ),
                            child: Text(
                              fuel,
                              style: TextStyle(
                                color: isSel
                                    ? (isLight ? Colors.white : Colors.black)
                                    : (isLight
                                        ? const Color(0xFF475569)
                                        : const Color(0xFF94A3B8)),
                                fontSize: 12.5,
                                fontWeight: isSel
                                    ? FontWeight.bold
                                    : FontWeight.w500,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: isAdding
                            ? null
                            : () async {
                                final newName = nameController.text.trim();
                                final newReg = regController.text
                                    .trim()
                                    .toUpperCase();

                                final nameErr = AppValidators.validateVehicleName(newName);
                                if (nameErr != null) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(nameErr),
                                      backgroundColor: Colors.red,
                                    ),
                                  );
                                  return;
                                }

                                final regErr = AppValidators.validateVehicleNumber(newReg);
                                if (regErr != null) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(regErr),
                                      backgroundColor: Colors.red,
                                    ),
                                  );
                                  return;
                                }

                                setModalState(() => isAdding = true);

                                try {
                                  if (Globals.accessToken.isNotEmpty) {
                                    final res = await http.post(
                                      ApiConfig.uri('/app-qr/vehicles'),
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization':
                                            'Bearer ${Globals.accessToken}',
                                      },
                                      body: jsonEncode({
                                        'name': newName,
                                        'regNumber': newReg,
                                        'fuel': selectedFuel,
                                        'type': selectedFuel,
                                        'imagePath': '',
                                      }),
                                    );

                                    if (res.statusCode == 200 || res.statusCode == 201) {
                                      final data = jsonDecode(res.body)['data'];
                                      Globals.vehicleModel = newName;
                                      Globals.vehicleRegistration = newReg;

                                      if (ctx.mounted) {
                                        Navigator.pop(ctx);
                                      }
                                      if (!mounted) return;

                                      final newModel = VehicleModel.fromJson(data);
                                      setState(() {
                                        _vehicles.insert(0, newModel);
                                      });
                                      _fetchVehicles();
                                      return;
                                    }
                                  } else {
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Please sign in to add a vehicle.'),
                                        ),
                                      );
                                    }
                                    return;
                                  }
                                } catch (e) {
                                  debugPrint('Error adding vehicle: $e');
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('Could not add vehicle: $e'),
                                      ),
                                    );
                                  }
                                } finally {
                                  if (ctx.mounted) {
                                    setModalState(() => isAdding = false);
                                  }
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isLight
                              ? AppTheme.primaryBlue
                              : const Color(0xFF00C2FF),
                          foregroundColor: isLight ? Colors.white : Colors.black,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(25),
                          ),
                        ),
                        child: isAdding
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Add Vehicle',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
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
      },
    );
  }

  Widget _buildVehicleImage(VehicleModel vehicle, bool isLight) {
    final lower = vehicle.name.toLowerCase();

    final resolvedImage = _resolvedVehicleImages[vehicle.id];
    if (resolvedImage != null) {
      return _imageFromPath(resolvedImage, lower, isLight);
    }

    if (_hasUsableVehicleImage(vehicle)) {
      return _imageFromPath(vehicle.imagePath, lower, isLight);
    }

    // Two-wheeler detection: ensure scooters and bikes don't display generic car asset
    final isScooter =
        lower.contains('activa') ||
        lower.contains('jupiter') ||
        lower.contains('scooter') ||
        lower.contains('dio') ||
        lower.contains('access') ||
        lower.contains('pleasure') ||
        lower.contains('ntorq') ||
        lower.contains('ola') ||
        lower.contains('ather') ||
        lower.contains('iqube') ||
        lower.contains('vida') ||
        lower.contains('chetak');

    final isBike =
        lower.contains('classic') ||
        lower.contains('bullet') ||
        lower.contains('enfield') ||
        lower.contains('pulsar') ||
        lower.contains('apache') ||
        lower.contains('fz') ||
        lower.contains('ktm') ||
        lower.contains('bike') ||
        lower.contains('splendor');

    if (isScooter || isBike) {
      return _buildFallbackAsset(lower, isLight);
    }

    return _buildFallbackAsset(lower, isLight);
  }

  Widget _imageFromPath(String imagePath, String lower, bool isLight) {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return Image.network(
        imagePath,
        fit: BoxFit.contain,
        errorBuilder: (_, _, _) => _buildFallbackAsset(lower, isLight),
      );
    }

    return Image.asset(
      imagePath,
      fit: BoxFit.contain,
      errorBuilder: (_, _, _) => _buildFallbackAsset(lower, isLight),
    );
  }

  Widget _buildFallbackAsset(String lower, bool isLight) {
    // Scooters (Activa, Jupiter, etc.)
    if (lower.contains('activa') ||
        lower.contains('jupiter') ||
        lower.contains('scooter') ||
        lower.contains('dio') ||
        lower.contains('access') ||
        lower.contains('pleasure') ||
        lower.contains('ntorq') ||
        lower.contains('ola') ||
        lower.contains('ather') ||
        lower.contains('iqube') ||
        lower.contains('vida') ||
        lower.contains('chetak')) {
      return Image.asset(
        'assets/homescreensicons/activa_trans.png',
        fit: BoxFit.contain,
      );
    }

    // Commuter bikes have a different silhouette from performance bikes.
    if (lower.contains('splendor') ||
        lower.contains('passion') ||
        lower.contains('shine') ||
        lower.contains('platina') ||
        lower.contains('hf deluxe') ||
        lower.contains('ct 100')) {
      return Image.asset(
        'assets/homescreensicons/splendor_trans.png',
        fit: BoxFit.contain,
        errorBuilder: (_, _, _) => Image.asset(
          'assets/homescreensicons/bikeimage.png',
          fit: BoxFit.contain,
        ),
      );
    }

    // Bikes (Classic 350, Bullet, Pulsar, etc.)
    if (lower.contains('classic') ||
        lower.contains('bullet') ||
        lower.contains('enfield') ||
        lower.contains('pulsar') ||
        lower.contains('apache') ||
        lower.contains('fz') ||
        lower.contains('ktm') ||
        lower.contains('bike') ||
        lower.contains('splendor')) {
      return Image.asset(
        'assets/homescreensicons/pulsar_trans.png',
        fit: BoxFit.contain,
        errorBuilder: (_, _, _) => Image.asset(
          'assets/homescreensicons/bikeimage.png',
          fit: BoxFit.contain,
        ),
      );
    }

    // Cars (Creta, Swift, etc.)
    return Image.asset(
      'assets/homescreensicons/carimage.png',
      fit: BoxFit.contain,
      errorBuilder: (_, _, _) => Icon(
        Icons.directions_car_rounded,
        color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF6B7C91),
        size: 32,
      ),
    );
  }

  @override
  Future<void> refreshOnRouteReturn() => _fetchVehicles();

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final filteredVehicles = _vehicles.where((v) {
          if (widget.onlyActivated) {
            final tag = _vehicleTags[v.id] ?? v.tagData;
            final resolvedTagId = tag?['tagId'] ?? tag?['code'] ?? v.tagId;
            final isActivated = resolvedTagId != null &&
                resolvedTagId.toString().trim().isNotEmpty;
            if (!isActivated) return false;
          }
          if (_searchQuery.isEmpty) return true;
          return v.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
              v.regNumber.toLowerCase().contains(_searchQuery.toLowerCase());
        }).toList();

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
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () {
                  if (Navigator.canPop(context)) {
                    Navigator.pop(context);
                  } else {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const BottomNavigationScreen(),
                      ),
                    );
                  }
                }),
              centerTitle: true,
              title: Text(
                widget.title,
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            body: SafeArea(
              child: Column(
                children: [
                  // Search Box matching Screenshot
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 12,
                    ),
                    child: Container(
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: isLight ? Colors.white : const Color(0xFF0F1826),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF192535),
                          width: 1,
                        ),
                        boxShadow: isLight ? AppTheme.cardShadow : null,
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.search_rounded,
                            color: isLight
                                ? const Color(0xFF94A3B8)
                                : const Color(0xFF6B7C91),
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: _searchController,
                              onChanged: (val) {
                                setState(() {
                                  _searchQuery = val;
                                });
                              },
                              style: TextStyle(
                                color: isLight
                                    ? const Color(0xFF0F172A)
                                    : Colors.white,
                                fontSize: 14.5,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Search your vehicle',
                                hintStyle: TextStyle(
                                  color: isLight
                                      ? const Color(0xFF94A3B8)
                                      : const Color(0xFF6B7C91),
                                  fontSize: 14,
                                ),
                                border: InputBorder.none,
                                isDense: true,
                                contentPadding: EdgeInsets.zero,
                              ),
                            ),
                          ),
                          if (_searchQuery.isNotEmpty)
                            GestureDetector(
                              onTap: () {
                                _searchController.clear();
                                setState(() {
                                  _searchQuery = '';
                                });
                              },
                              child: Icon(
                                Icons.close_rounded,
                                color: isLight
                                    ? const Color(0xFF94A3B8)
                                    : const Color(0xFF6B7C91),
                                size: 18,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),

                  // Vehicle List matching Screenshot
                  Expanded(
                    child: _isLoading
                        ? Center(
                            child: AppLoadingSpinner(
                              size: 70,
                              primaryColor: isLight
                                  ? AppTheme.primaryBlue
                                  : const Color(0xFF00C2FF),
                            ),
                          )
                        : RefreshIndicator(
                            color: isLight
                                ? AppTheme.primaryBlue
                                : const Color(0xFF00C2FF),
                            backgroundColor: isLight
                                ? Colors.white
                                : const Color(0xFF0F1A26),
                            onRefresh: _fetchVehicles,
                            child: filteredVehicles.isEmpty
                                ? LayoutBuilder(
                                    builder: (context, constraints) =>
                                        SingleChildScrollView(
                                          physics:
                                              const AlwaysScrollableScrollPhysics(),
                                          child: ConstrainedBox(
                                            constraints: BoxConstraints(
                                              minHeight: constraints.maxHeight,
                                            ),
                                            child: Center(
                                              child: Column(
                                                mainAxisSize: MainAxisSize.min,
                                                mainAxisAlignment:
                                                    MainAxisAlignment.center,
                                                children: [
                                                  Icon(
                                                    Icons.qr_code_2_rounded,
                                                    size: 52,
                                                    color: isLight
                                                        ? const Color(0xFF94A3B8)
                                                        : const Color(0xFF6B7C91),
                                                  ),
                                                  const SizedBox(height: 12),
                                                  Text(
                                                    _searchQuery.isNotEmpty
                                                        ? 'No matching vehicles found'
                                                        : (widget.onlyActivated
                                                            ? 'No active QR tags found'
                                                            : 'No vehicles added yet'),
                                                    style: TextStyle(
                                                      color: isLight
                                                          ? const Color(0xFF0F172A)
                                                          : Colors.white,
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.w600,
                                                    ),
                                                  ),
                                                  if (widget.onlyActivated &&
                                                      _searchQuery.isEmpty) ...[
                                                    const SizedBox(height: 6),
                                                    Text(
                                                      'Vehicles with activated QR tags will appear here',
                                                      style: TextStyle(
                                                        color: isLight
                                                            ? const Color(0xFF64748B)
                                                            : const Color(0xFF7B8C9F),
                                                        fontSize: 13,
                                                      ),
                                                      textAlign: TextAlign.center,
                                                    ),
                                                  ],
                                                ],
                                              ),
                                            ),
                                          ),
                                        ),
                                  )
                                : ListView.separated(
                                    physics:
                                        const AlwaysScrollableScrollPhysics(),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 20,
                                      vertical: 8,
                                    ),
                                    itemCount: filteredVehicles.length,
                                    separatorBuilder: (ctx, index) =>
                                        const SizedBox(height: 14),
                                    itemBuilder: (ctx, index) {
                                      final vehicle = filteredVehicles[index];
                                      final tag = _vehicleTags[vehicle.id] ?? vehicle.tagData;
                                      final resolvedTagId = tag?['tagId'] ?? tag?['code'] ?? vehicle.tagId;
                                      final isActivated = resolvedTagId != null && resolvedTagId.toString().trim().isNotEmpty;

                                      return GestureDetector(
                                        onTap: () => _onVehicleTap(vehicle),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 16,
                                            vertical: 14,
                                          ),
                                          decoration: BoxDecoration(
                                            color: isLight
                                                ? Colors.white
                                                : const Color(0xFF0F1826),
                                            borderRadius: BorderRadius.circular(
                                              18,
                                            ),
                                            border: Border.all(
                                              color: isLight
                                                  ? const Color(0xFFE2E8F0)
                                                  : const Color(0xFF162332),
                                              width: 1.0,
                                            ),
                                            boxShadow: isLight
                                                ? AppTheme.cardShadow
                                                : null,
                                          ),
                                          child: Row(
                                            children: [
                                              // Vehicle Thumbnail
                                              Container(
                                                width: 88,
                                                height: 58,
                                                alignment: Alignment.center,
                                                child: _buildVehicleImage(
                                                  vehicle,
                                                  isLight,
                                                ),
                                              ),
                                              const SizedBox(width: 16),

                                              // Vehicle Title and Reg Number
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      vehicle.name,
                                                      style: TextStyle(
                                                        color: isLight
                                                            ? const Color(
                                                                0xFF0F172A,
                                                              )
                                                            : Colors.white,
                                                        fontSize: 16,
                                                        fontWeight:
                                                            FontWeight.w600,
                                                      ),
                                                    ),
                                                    const SizedBox(height: 5),
                                                    Text(
                                                      vehicle.regNumber,
                                                      style: TextStyle(
                                                        color: isLight
                                                            ? const Color(
                                                                0xFF64748B,
                                                              )
                                                            : const Color(
                                                                0xFF7B8C9F,
                                                              ),
                                                        fontSize: 13.5,
                                                        fontWeight:
                                                            FontWeight.w500,
                                                      ),
                                                    ),
                                                    const SizedBox(height: 7),
                                                    Container(
                                                      padding: const EdgeInsets.symmetric(
                                                        horizontal: 9,
                                                        vertical: 4,
                                                      ),
                                                      decoration: BoxDecoration(
                                                        color: isLight
                                                            ? (isActivated
                                                                ? const Color(0xFFECFDF5)
                                                                : const Color(0xFFFEF2F2))
                                                            : (isActivated
                                                                ? const Color(0xFF064E3B).withValues(alpha: 0.35)
                                                                : const Color(0xFF7F1D1D).withValues(alpha: 0.35)),
                                                        borderRadius: BorderRadius.circular(20),
                                                        border: Border.all(
                                                          color: isLight
                                                              ? (isActivated
                                                                  ? const Color(0xFFA7F3D0)
                                                                  : const Color(0xFFFECACA))
                                                              : (isActivated
                                                                  ? const Color(0xFF059669).withValues(alpha: 0.45)
                                                                  : const Color(0xFFDC2626).withValues(alpha: 0.45)),
                                                          width: 1.0,
                                                        ),
                                                      ),
                                                      child: Row(
                                                        mainAxisSize: MainAxisSize.min,
                                                        children: [
                                                          Container(
                                                            width: 6.5,
                                                            height: 6.5,
                                                            decoration: BoxDecoration(
                                                              color: isActivated
                                                                  ? const Color(0xFF10B981)
                                                                  : const Color(0xFFEF4444),
                                                              shape: BoxShape.circle,
                                                            ),
                                                          ),
                                                          const SizedBox(width: 6),
                                                          Text(
                                                            isActivated
                                                                ? 'QR Activated'
                                                                : 'QR is not activated',
                                                            style: TextStyle(
                                                              color: isLight
                                                                  ? (isActivated
                                                                      ? const Color(0xFF047857)
                                                                      : const Color(0xFFB91C1C))
                                                                  : (isActivated
                                                                      ? const Color(0xFF34D399)
                                                                      : const Color(0xFFF87171)),
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
                                            ],
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                          ),
                  ),

                  // Bottom "+ Add New Vehicle" Button matching Screenshot
                  if (widget.showAddVehicle)
                    SafeArea(
                      top: false,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
                        child: SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton(
                            onPressed: _onAddNewVehicle,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isLight
                                  ? AppTheme.primaryBlue
                                  : const Color(0xFF00C2FF),
                              foregroundColor: isLight
                                  ? Colors.white
                                  : Colors.black,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(28),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.add,
                                  color: isLight ? Colors.white : Colors.black,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Add New Vehicle',
                                  style: TextStyle(
                                    color: isLight ? Colors.white : Colors.black,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
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
}
