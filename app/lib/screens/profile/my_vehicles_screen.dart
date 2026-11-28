import '../../services/vehicle_type_service.dart';
import 'package:flutter/material.dart';

import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../globals.dart';
import '../../utils/api_config.dart';
import '../../utils/app_validators.dart';
import '../../services/screen_refresh_service.dart';
import '../../services/auth_storage_service.dart';
import '../trip/trip_service.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../utils/app_icons.dart';
import '../../widgets/animated_back_arrow.dart';

class VehicleProfileItem {
  final String id;
  final String name;
  final String regNumber;
  final String fuelAndYear;
  final String imagePath;
  final bool isSelected;

  const VehicleProfileItem({
    required this.id,
    required this.name,
    required this.regNumber,
    required this.fuelAndYear,
    required this.imagePath,
    this.isSelected = false,
  });

  VehicleProfileItem copyWith({
    String? id,
    String? name,
    String? regNumber,
    String? fuelAndYear,
    String? imagePath,
    bool? isSelected,
  }) {
    return VehicleProfileItem(
      id: id ?? this.id,
      name: name ?? this.name,
      regNumber: regNumber ?? this.regNumber,
      fuelAndYear: fuelAndYear ?? this.fuelAndYear,
      imagePath: imagePath ?? this.imagePath,
      isSelected: isSelected ?? this.isSelected,
    );
  }
}

class MyVehiclesScreen extends StatefulWidget {
  const MyVehiclesScreen({super.key});

  @override
  State<MyVehiclesScreen> createState() => _MyVehiclesScreenState();
}

class _MyVehiclesScreenState extends State<MyVehiclesScreen>
    with RefreshOnRouteReturn<MyVehiclesScreen> {
  static bool _isTwoWheeler(String name) {
    final lower = name.toLowerCase();
    return lower.contains('activa') ||
        lower.contains('splendor') ||
        lower.contains('pulsar') ||
        lower.contains('bullet') ||
        lower.contains('classic') ||
        lower.contains('ninja') ||
        lower.contains('bike') ||
        lower.contains('scooter') ||
        lower.contains('scooty') ||
        lower.contains('jupiter') ||
        lower.contains('access') ||
        lower.contains('r15') ||
        lower.contains('ktm') ||
        lower.contains('duke') ||
        lower.contains('himalayan') ||
        lower.contains('hunter') ||
        lower.contains('meteor') ||
        lower.contains('apache') ||
        lower.contains('shine') ||
        lower.contains('passion') ||
        lower.contains('platina') ||
        lower.contains('dio') ||
        lower.contains('ntorq') ||
        lower.contains('iqube') ||
        lower.contains('ather') ||
        lower.contains('ola') ||
        lower.contains('chetak') ||
        lower.contains('vida') ||
        lower.contains('aerox') ||
        lower.contains('burgman') ||
        lower.contains('fascino') ||
        lower.contains('tvs') ||
        lower.contains('yamaha') ||
        lower.contains('kawasaki') ||
        lower.contains('suzuki') ||
        lower.contains('hero') ||
        lower.contains('bajaj') ||
        lower.contains('royal enfield');
  }

  static String formatRegistrationNumber(String input) {
    final clean = input.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toUpperCase();
    if (clean.length == 10) {
      return '${clean.substring(0, 2)} ${clean.substring(2, 4)} ${clean.substring(4, 6)} ${clean.substring(6, 10)}';
    } else if (clean.length == 9) {
      return '${clean.substring(0, 2)} ${clean.substring(2, 4)} ${clean.substring(4, 5)} ${clean.substring(5, 9)}';
    }
    return input.trim().toUpperCase();
  }

  List<VehicleProfileItem> _vehicles = [];
  bool _isLoading = true;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _fetchVehicles(showSpinner: true);
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) _fetchVehicles(showSpinner: false);
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchVehicles({bool showSpinner = false}) async {
    if (showSpinner) {
      setState(() => _isLoading = true);
    }

    if (Globals.accessToken.isNotEmpty) {
      try {
        final response = await AuthStorageService.authenticatedGet('/app-qr/vehicles');

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          if (data['success'] == true) {
            final items = data['data'] as List;
            await TripService.cacheUserVehicles(
              items.map((item) => Map<String, dynamic>.from(item)).toList(),
            );
            if (mounted) {
              setState(() {
                _vehicles = items
                    .map((v) {
                      final vName = (v['name'] ?? 'Unknown Vehicle').toString();
                      final serverFuel = (v['type'] ?? v['fuel'])?.toString().trim();
                      final detected = VehicleTypeService.detectFuelType(vName);
                      final finalFuel = (serverFuel != null &&
                              serverFuel.isNotEmpty &&
                              serverFuel.toLowerCase() != 'petrol')
                          ? (serverFuel.toUpperCase() == 'ELECTRIC'
                              ? 'EV'
                              : (serverFuel.toUpperCase() == 'CNG'
                                  ? 'CNG'
                                  : serverFuel))
                          : detected;

                      final reg = (v['regNumber'] ?? '').toString();
                      final isCurrentActive = reg == Globals.vehicleRegistration ||
                          (Globals.vehicleRegistration.isEmpty && vName == Globals.vehicleModel);

                      return VehicleProfileItem(
                        id: v['id'] ?? '',
                        name: vName,
                        regNumber: reg,
                        fuelAndYear: finalFuel,
                        imagePath: v['imagePath'] ?? '',
                        isSelected: isCurrentActive,
                      );
                    })
                    .toList();
              });
            }
          }
        }
      } catch (e) {
        debugPrint('Error fetching vehicles: $e');
      }
    }

    // Fallback: If server has no vehicles or empty, check Globals so vehicle is never lost
    if (mounted && _vehicles.isEmpty && Globals.vehicleModel.isNotEmpty) {
      final detected = VehicleTypeService.detectFuelType(Globals.vehicleModel);
      setState(() {
        _vehicles = [
          VehicleProfileItem(
            id: 'v_primary',
            name: Globals.vehicleModel,
            regNumber: Globals.vehicleRegistration.isNotEmpty
                ? Globals.vehicleRegistration
                : 'REGISTERED',
            fuelAndYear: detected,
            imagePath: '',
            isSelected: true,
          ),
        ];
      });
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  
  void _onAddNewVehicle() {
    final isLight = AppTheme.isLightNotifier.value;
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
                      "Add New Vehicle",
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
                        hintText: "Vehicle Model (e.g. Hyundai Creta, BE 6)",
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
                      onChanged: (val) {
                        final cleanReg = val.replaceAll(' ', '').toUpperCase();
                        if (cleanReg.length >= 4 && nameController.text.trim().isEmpty) {
                          // Auto fill from known vehicle matching this registration
                          final match = _vehicles.firstWhere(
                            (v) => v.regNumber.replaceAll(' ', '').toUpperCase() == cleanReg,
                            orElse: () => const VehicleProfileItem(
                              id: '',
                              name: '',
                              regNumber: '',
                              fuelAndYear: '',
                              imagePath: '',
                            ),
                          );
                          if (match.name.isNotEmpty) {
                            nameController.text = match.name;
                            final autoFuel = VehicleTypeService.detectFuelType(match.name);
                            setModalState(() {
                              selectedFuel = autoFuel;
                            });
                          }
                        }
                      },
                      decoration: InputDecoration(
                        hintText: "Registration Number (e.g. DL 01 AB 1234)",
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

                                final nameErr = AppValidators.validateVehicleName(newName, label: 'Vehicle model/name');
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

                                final formattedReg = formatRegistrationNumber(newReg);

                                setModalState(() => isAdding = true);

                                try {
                                  if (Globals.accessToken.isNotEmpty) {
                                    final res = await http.post(
                                      ApiConfig.uri("/app-qr/vehicles"),
                                      headers: {
                                        "Content-Type": "application/json",
                                        'Authorization':
                                            'Bearer ${Globals.accessToken}',
                                      },
                                      body: jsonEncode({
                                        "name": newName,
                                        "regNumber": formattedReg,
                                        "fuel": selectedFuel,
                                        "type": selectedFuel,
                                        "imagePath": "",
                                      }),
                                    );

                                    if (res.statusCode == 200 ||
                                        res.statusCode == 201) {
                                      Globals.vehicleModel = newName;
                                      Globals.vehicleRegistration = formattedReg;

                                      if (ctx.mounted) {
                                        Navigator.pop(ctx);
                                      }
                                      if (!mounted) return;

                                      _fetchVehicles(showSpinner: false);
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Vehicle added successfully'),
                                          duration: Duration(seconds: 2),
                                        ),
                                      );
                                      return;
                                    }
                                  } else {
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Please log in to add a vehicle.'),
                                          duration: Duration(seconds: 2),
                                        ),
                                      );
                                    }
                                    return;
                                  }
                                } catch (e) {
                                  debugPrint('Error adding vehicle: $e');
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
                                "Add Vehicle",
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

  @override
  Future<void> refreshOnRouteReturn() => _fetchVehicles(showSpinner: false);

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
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
                'My Vehicles',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                ),
              ),
              actions: [
                IconButton(
                  icon: AppIcons.svg(
                    AppIcons.plus,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    width: 20,
                    height: 20,
                  ),
                  onPressed: _onAddNewVehicle,
                ),
              ],
            ),
            body: SafeArea(
              child: RefreshIndicator(
                color: AppTheme.primaryColor,
                backgroundColor: isLight
                    ? Colors.white
                    : const Color(0xFF101726),
                onRefresh: () => _fetchVehicles(showSpinner: false),
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  child: Column(
                    children: [
                      if (_isLoading)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 40),
                          child: Center(
                            child: AppLoadingSpinner(
                              size: 70,
                              primaryColor: AppTheme.primaryColor,
                            ),
                          ),
                        )
                      else if (_vehicles.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            vertical: 48,
                            horizontal: 24,
                          ),
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 72,
                                  height: 72,
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? const Color(0xFFEFF6FF)
                                        : const Color(0xFF131D2D),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    Icons.directions_car_outlined,
                                    size: 36,
                                    color: isLight
                                        ? AppTheme.primaryBlue
                                        : const Color(0xFF00C2FF),
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No vehicles added yet',
                                  style: TextStyle(
                                    color: isLight
                                        ? const Color(0xFF0F172A)
                                        : Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  'Add your vehicle to view and manage it here.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: isLight
                                        ? const Color(0xFF64748B)
                                        : const Color(0xFF8E9BAE),
                                    fontSize: 13.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      else
                        ..._vehicles.map((vehicle) {
                          return _buildVehicleCard(vehicle, isLight);
                        }),
                      const SizedBox(height: 20),

                      // + Add New Vehicle Link
                      InkWell(
                        onTap: _onAddNewVehicle,
                        borderRadius: BorderRadius.circular(20),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 10,
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              AppIcons.svg(
                                AppIcons.plus,
                                color: isLight
                                    ? AppTheme.primaryColor
                                    : const Color(0xFF8E9BAE),
                                width: 16,
                                height: 16,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Add New Vehicle',
                                style: TextStyle(
                                  color: isLight
                                      ? AppTheme.primaryColor
                                      : const Color(0xFF8E9BAE),
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
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

  Widget _buildVehicleCard(VehicleProfileItem vehicle, bool isLight) {
    final isCurrentActive = vehicle.regNumber == Globals.vehicleRegistration ||
        (Globals.vehicleRegistration.isEmpty && vehicle.name == Globals.vehicleModel);

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            setState(() {
              Globals.vehicleModel = vehicle.name;
              Globals.vehicleRegistration = vehicle.regNumber;
              _vehicles = _vehicles
                  .map((v) => v.copyWith(isSelected: v.id == vehicle.id))
                  .toList();
            });
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('${vehicle.name} set as active vehicle'),
                duration: const Duration(seconds: 2),
                backgroundColor: isLight
                    ? const Color(0xFF0F172A)
                    : const Color(0xFF1E293B),
              ),
            );
          },
          borderRadius: BorderRadius.circular(18),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: isLight ? Colors.white : const Color(0xFF101726),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isCurrentActive
                    ? (isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF))
                    : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C)),
                width: isCurrentActive ? 1.6 : 1.0,
              ),
              boxShadow: isLight ? AppTheme.cardShadow : null,
            ),
            child: Row(
              children: [
                // Vehicle Image Preview
                Container(
                  width: 96,
                  height: 64,
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFF1F5F9)
                        : const Color(0xFF0D1424),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: () {
                      final isBike = _isTwoWheeler(vehicle.name);
                      final fallbackIcon = isBike
                          ? Icons.two_wheeler_rounded
                          : Icons.directions_car_rounded;
                      final hasValidImage =
                          vehicle.imagePath.isNotEmpty &&
                          !(isBike &&
                              (vehicle.imagePath.contains('carimage') ||
                                  vehicle.imagePath.contains('white_creta')));

                      if (hasValidImage) {
                        return vehicle.imagePath.startsWith('http')
                            ? Image.network(
                                vehicle.imagePath,
                                fit: BoxFit.contain,
                                errorBuilder: (ctx, err, stack) => Center(
                                  child: Icon(
                                    fallbackIcon,
                                    color: AppTheme.primaryColor,
                                    size: 32,
                                  ),
                                ),
                              )
                            : Image.asset(
                                vehicle.imagePath,
                                fit: BoxFit.contain,
                                errorBuilder: (ctx, err, stack) => Center(
                                  child: Icon(
                                    fallbackIcon,
                                    color: AppTheme.primaryColor,
                                    size: 32,
                                  ),
                                ),
                              );
                      }
                      return Center(
                        child: isBike
                            ? Icon(
                                Icons.two_wheeler_rounded,
                                color: AppTheme.primaryColor,
                                size: 32,
                              )
                            : AppIcons.svg(
                                AppIcons.car,
                                color: AppTheme.primaryColor,
                                width: 32,
                                height: 32,
                              ),
                      );
                    }(),
                  ),
                ),
                const SizedBox(width: 14),

                // Info Column
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              vehicle.name,
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          if (isCurrentActive)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: (isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF)).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                'Active',
                                style: TextStyle(
                                  color: isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF),
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        vehicle.regNumber,
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF64748B)
                              : const Color(0xFF8E9BAE),
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        vehicle.fuelAndYear,
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
              ],
            ),
          ),
        ),
      ),
    );
  }
}
