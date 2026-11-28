import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../widgets/animated_back_arrow.dart';

class VehicleDetailsScreen extends StatefulWidget {
  final Function(int index)? onNavigateTab;
  final bool isStandalone;
  final String vehicleName;
  final String vehiclePlate;
  final Map<String, dynamic>? vehicleData;

  const VehicleDetailsScreen({
    super.key,
    this.onNavigateTab,
    this.isStandalone = false,
    this.vehicleName = '',
    this.vehiclePlate = '',
    this.vehicleData,
  });

  @override
  State<VehicleDetailsScreen> createState() => _VehicleDetailsScreenState();
}

class _VehicleDetailsScreenState extends State<VehicleDetailsScreen> {
  late String _brand;
  late String _model;
  late String _year;
  late String _color;
  late String _registrationNumber;
  late String _chassisNumber;
  late String _engineNumber;

  @override
  void initState() {
    super.initState();
    final data = widget.vehicleData ?? {};
    final fullName = (widget.vehicleName.isNotEmpty
            ? widget.vehicleName
            : (data['name'] ?? '').toString())
        .trim();
    final parts = fullName.isEmpty
        ? const <String>[]
        : fullName.split(RegExp(r'\s+'));
    final storedBrand = (data['brand'] ?? '').toString().trim();
    final storedModel = (data['model'] ?? '').toString().trim();
    _brand = storedBrand.isNotEmpty
        ? storedBrand
        : (parts.isNotEmpty ? parts.first : '—');
    _model = storedModel.isNotEmpty
        ? storedModel
        : (parts.length > 1 ? parts.sublist(1).join(' ') : (fullName.isNotEmpty ? fullName : '—'));
    final storedYear = (data['year'] ?? '').toString().trim();
    _year = storedYear.isNotEmpty ? storedYear : '—';
    final storedColor = (data['color'] ?? '').toString().trim();
    _color = storedColor.isNotEmpty ? storedColor : '—';
    final reg = widget.vehiclePlate.isNotEmpty
        ? widget.vehiclePlate
        : (data['plate'] ?? data['regNumber'] ?? '').toString().trim();
    _registrationNumber = reg.isNotEmpty ? reg : '—';
    final chassis = (data['chassisNumber'] ?? '').toString().trim();
    _chassisNumber = chassis.isNotEmpty ? chassis : '—';
    final engine = (data['engineNumber'] ?? '').toString().trim();
    _engineNumber = engine.isNotEmpty ? engine : '—';
  }

  void _editField(String title, String currentValue, Function(String) onSave) {
    final isLight = AppTheme.isLightNotifier.value;
    final controller = TextEditingController(text: currentValue);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        side: BorderSide(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
        ),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Edit $title',
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
                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                autofocus: true,
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 16,
                ),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF070B18),
                  hintText: 'Enter $title',
                  hintStyle: TextStyle(
                    color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: Color(0xFF0066FF)),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () {
                    final text = controller.text.trim();
                    if (text.isNotEmpty) {
                      setState(() {
                        onSave(text);
                      });
                    }
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          '$title updated successfully',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          ),
                        ),
                        backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0066FF),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text(
                    'Save Changes',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final content = SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            children: [
              // 1. Car Showcase Card
              Container(
                width: double.infinity,
                height: 190,
                decoration: BoxDecoration(
                  color: isLight ? Colors.white : const Color(0xFF0F1A2E),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                    width: 1.0,
                  ),
                  boxShadow: isLight ? AppTheme.cardShadow : null,
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Builder(
                      builder: (_) {
                        final img = (widget.vehicleData?['image'] ?? '').toString().trim();
                        if (img.startsWith('http')) {
                          return Image.network(
                            img,
                            height: 170,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => Image.asset(
                              'assets/homescreensicons/carimage.png',
                              height: 170,
                              fit: BoxFit.contain,
                            ),
                          );
                        }
                        return Image.asset(
                          img.isNotEmpty ? img : 'assets/homescreensicons/carimage.png',
                          height: 170,
                          fit: BoxFit.contain,
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 2. Specifications Details Card
              Container(
                decoration: BoxDecoration(
                  color: isLight ? Colors.white : const Color(0xFF0F1A2E),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                    width: 1.0,
                  ),
                  boxShadow: isLight ? AppTheme.cardShadow : null,
                ),
                child: Column(
                  children: [
                    // Item 1: Vehicle Brand
                    _buildClickableTile(
                      isLight: isLight,
                      label: 'Vehicle Brand',
                      child: Row(
                        children: [
                          Container(
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF64748B),
                              ),
                            ),
                            child: Center(
                              child: Icon(
                                Icons.directions_car_rounded,
                                size: 13,
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            _brand,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Spacer(),
                          Icon(
                            Icons.chevron_right,
                            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            size: 20,
                          ),
                        ],
                      ),
                      onTap: () => _editField('Vehicle Brand', _brand, (val) => _brand = val),
                    ),
                    Divider(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                      height: 1,
                    ),

                    // Item 2: Model
                    _buildClickableTile(
                      isLight: isLight,
                      label: 'Model',
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _model,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Icon(
                            Icons.chevron_right,
                            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            size: 20,
                          ),
                        ],
                      ),
                      onTap: () => _editField('Model', _model, (val) => _model = val),
                    ),
                    Divider(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                      height: 1,
                    ),

                    // Item 3: Year
                    _buildClickableTile(
                      isLight: isLight,
                      label: 'Year',
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _year,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Icon(
                            Icons.chevron_right,
                            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            size: 20,
                          ),
                        ],
                      ),
                      onTap: () => _editField('Year', _year, (val) => _year = val),
                    ),
                    Divider(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                      height: 1,
                    ),

                    // Item 4: Color
                    _buildClickableTile(
                      isLight: isLight,
                      label: 'Color',
                      child: Row(
                        children: [
                          Container(
                            width: 14,
                            height: 14,
                            decoration: BoxDecoration(
                              color: _color.toLowerCase() == 'black'
                                  ? Colors.black
                                  : _color.toLowerCase() == 'white'
                                      ? Colors.white
                                      : _color.toLowerCase() == 'red'
                                          ? Colors.red
                                          : _color.toLowerCase() == 'blue'
                                              ? Colors.blue
                                              : const Color(0xFF0066FF),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                width: 1.5,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _color,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Spacer(),
                          Icon(
                            Icons.chevron_right,
                            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            size: 20,
                          ),
                        ],
                      ),
                      onTap: () => _editField('Color', _color, (val) => _color = val),
                    ),
                    Divider(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                      height: 1,
                    ),

                    // Item 5: Registration Number
                    _buildClickableTile(
                      isLight: isLight,
                      label: 'Registration Number',
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _registrationNumber,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.3,
                            ),
                          ),
                          Icon(
                            Icons.chevron_right,
                            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            size: 20,
                          ),
                        ],
                      ),
                      onTap: () => _editField(
                        'Registration Number',
                        _registrationNumber,
                        (val) => _registrationNumber = val,
                      ),
                    ),
                    Divider(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                      height: 1,
                    ),

                    // Item 6: Chassis Number (VIN)
                    _buildClickableTile(
                      isLight: isLight,
                      label: 'Chassis Number (VIN)',
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _chassisNumber,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                          Icon(
                            Icons.chevron_right,
                            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            size: 20,
                          ),
                        ],
                      ),
                      onTap: () => _editField(
                        'Chassis Number (VIN)',
                        _chassisNumber,
                        (val) => _chassisNumber = val,
                      ),
                    ),
                    Divider(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                      height: 1,
                    ),

                    // Item 7: Engine Number
                    _buildClickableTile(
                      isLight: isLight,
                      label: 'Engine Number',
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _engineNumber,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                          Icon(
                            Icons.chevron_right,
                            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            size: 20,
                          ),
                        ],
                      ),
                      onTap: () => _editField(
                        'Engine Number',
                        _engineNumber,
                        (val) => _engineNumber = val,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );

        if (!widget.isStandalone) {
          return content;
        }

        return Container(
          decoration: BoxDecoration(
            gradient: AppTheme.bgGradient,
          ),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            body: SafeArea(
              child: Column(
                children: [
                  // Standalone App Bar
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                        Expanded(
                          child: Center(
                            child: Text(
                              'Vehicle Details',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.2,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 36),
                      ],
                    ),
                  ),
                  Expanded(child: content),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildClickableTile({
    required bool isLight,
    required String label,
    required Widget child,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 6),
            child,
          ],
        ),
      ),
    );
  }
}
