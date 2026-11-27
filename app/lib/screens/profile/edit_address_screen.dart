import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../widgets/animated_back_arrow.dart';
import '../../widgets/app_toggle_switch.dart';

class AddressModel {
  final String id;
  final String type; // 'Home', 'Work', 'Mom\'s Place', etc.
  final String address;
  final String landmark;
  final String city;
  final String state;
  final String pincode;
  final bool isDefault;

  const AddressModel({
    required this.id,
    required this.type,
    required this.address,
    this.landmark = '',
    this.city = 'Indore',
    this.state = 'Madhya Pradesh',
    this.pincode = '452010',
    this.isDefault = false,
  });

  AddressModel copyWith({
    String? id,
    String? type,
    String? address,
    String? landmark,
    String? city,
    String? state,
    String? pincode,
    bool? isDefault,
  }) {
    return AddressModel(
      id: id ?? this.id,
      type: type ?? this.type,
      address: address ?? this.address,
      landmark: landmark ?? this.landmark,
      city: city ?? this.city,
      state: state ?? this.state,
      pincode: pincode ?? this.pincode,
      isDefault: isDefault ?? this.isDefault,
    );
  }
}

class EditAddressScreen extends StatefulWidget {
  final AddressModel? initialAddress;
  final bool isNew;

  const EditAddressScreen({
    super.key,
    this.initialAddress,
    this.isNew = false,
  });

  @override
  State<EditAddressScreen> createState() => _EditAddressScreenState();
}

class _EditAddressScreenState extends State<EditAddressScreen> {
  String _selectedCategory = 'Home';
  late TextEditingController _addressController;
  late TextEditingController _landmarkController;
  late TextEditingController _cityController;
  late TextEditingController _stateController;
  late TextEditingController _pincodeController;
  bool _isDefault = true;

  @override
  void initState() {
    super.initState();
    final a = widget.initialAddress;
    _selectedCategory = a?.type ?? 'Home';
    _addressController = TextEditingController(
      text: a?.address ?? '',
    );
    _landmarkController = TextEditingController(
      text: a?.landmark ?? '',
    );
    _cityController = TextEditingController(text: a?.city ?? '');
    _stateController =
        TextEditingController(text: a?.state ?? '');
    _pincodeController = TextEditingController(text: a?.pincode ?? '');
    _isDefault = a?.isDefault ?? false;
  }

  @override
  void dispose() {
    _addressController.dispose();
    _landmarkController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pincodeController.dispose();
    super.dispose();
  }

  void _onSave() {
    final result = AddressModel(
      id: widget.initialAddress?.id ??
          DateTime.now().millisecondsSinceEpoch.toString(),
      type: _selectedCategory,
      address: _addressController.text.trim(),
      landmark: _landmarkController.text.trim(),
      city: _cityController.text.trim(),
      state: _stateController.text.trim(),
      pincode: _pincodeController.text.trim(),
      isDefault: _isDefault,
    );
    Navigator.pop(context, result);
  }

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
                widget.isNew ? 'Add Address' : 'Edit Address',
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
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 12),

                          // Section 1: SAVE ADDRESS AS
                          Text(
                            'SAVE ADDRESS AS',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.6,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                              ),
                            ),
                            child: Row(
                              children: [
                                _buildCategoryTab(
                                  title: 'Home',
                                  icon: Icons.home_rounded,
                                  isLight: isLight,
                                ),
                                _buildCategoryTab(
                                  title: 'Office',
                                  icon: Icons.apartment_rounded,
                                  isLight: isLight,
                                ),
                                _buildCategoryTab(
                                  title: 'Other',
                                  icon: Icons.location_on_outlined,
                                  isLight: isLight,
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 18),

                          // Section 2: GPS Auto-Detected Banner
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                              gradient: isLight
                                  ? null
                                  : const LinearGradient(
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                      colors: [
                                        Color(0xFF0D1B2E),
                                        Color(0xFF0A1324),
                                      ],
                                    ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 42,
                                  height: 42,
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryColor.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: AppTheme.primaryColor.withValues(alpha: 0.25),
                                    ),
                                  ),
                                  child: Icon(
                                    Icons.my_location_rounded,
                                    color: AppTheme.primaryColor,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Container(
                                            width: 7,
                                            height: 7,
                                            decoration: const BoxDecoration(
                                              color: Color(0xFF00E676),
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          const Text(
                                            'GPS Auto-Detected',
                                            style: TextStyle(
                                              color: Color(0xFF00E676),
                                              fontSize: 11.5,
                                              fontWeight: FontWeight.bold,
                                              letterSpacing: 0.3,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        'Vijay Nagar, Scheme 78, Indore',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                InkWell(
                                  onTap: () {
                                    setState(() {
                                      _cityController.text = 'Indore';
                                      _stateController.text = 'Madhya Pradesh';
                                      _pincodeController.text = '452010';
                                      if (_addressController.text.isEmpty ||
                                          _addressController.text.contains('12, Maple Street')) {
                                        _addressController.text =
                                            'Flat 402, Sapphire Heights, Scheme 78,\nVijay Nagar';
                                      }
                                    });
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                                        content: Text(
                                          'GPS location applied',
                                          style: TextStyle(
                                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                          ),
                                        ),
                                        duration: const Duration(seconds: 1),
                                      ),
                                    );
                                  },
                                  borderRadius: BorderRadius.circular(8),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryColor.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: AppTheme.primaryColor.withValues(alpha: 0.35),
                                      ),
                                    ),
                                    child: Text(
                                      'Use GPS',
                                      style: TextStyle(
                                        color: AppTheme.primaryColor,
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 18),

                          // Section 3: Full Address
                          _buildIconLabel(
                            icon: Icons.apartment_outlined,
                            label: 'Full Address',
                            isLight: isLight,
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _addressController,
                                    maxLines: 2,
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                      fontSize: 14.5,
                                      height: 1.35,
                                    ),
                                    decoration: const InputDecoration(
                                      border: InputBorder.none,
                                      isDense: true,
                                      contentPadding: EdgeInsets.symmetric(vertical: 4),
                                    ),
                                  ),
                                ),
                                IconButton(
                                  icon: Icon(
                                    Icons.cancel_outlined,
                                    color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                    size: 18,
                                  ),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  onPressed: () => _addressController.clear(),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 18),

                          // Section 4: Landmark
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _buildIconLabel(
                                icon: Icons.flag_outlined,
                                label: 'Landmark',
                                isLight: isLight,
                              ),
                              Text(
                                'OPTIONAL',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Container(
                            height: 50,
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _landmarkController,
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                      fontSize: 14.5,
                                    ),
                                    decoration: InputDecoration(
                                      hintText: 'Nearby landmark...',
                                      hintStyle: TextStyle(
                                        color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                        fontSize: 14,
                                      ),
                                      border: InputBorder.none,
                                    ),
                                  ),
                                ),
                                Icon(
                                  Icons.storefront_outlined,
                                  color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                  size: 18,
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 18),

                          // Section 5: City & State Row
                          Row(
                            children: [
                              // City
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildIconLabel(
                                      icon: Icons.location_city_outlined,
                                      label: 'City',
                                      isLight: isLight,
                                    ),
                                    const SizedBox(height: 8),
                                    Container(
                                      height: 50,
                                      padding: const EdgeInsets.symmetric(horizontal: 14),
                                      decoration: BoxDecoration(
                                        color: isLight ? Colors.white : const Color(0xFF101726),
                                        borderRadius: BorderRadius.circular(14),
                                        border: Border.all(
                                          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                                        ),
                                        boxShadow: isLight ? AppTheme.cardShadow : null,
                                      ),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: TextField(
                                              controller: _cityController,
                                              style: TextStyle(
                                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                                fontSize: 14.5,
                                              ),
                                              decoration: const InputDecoration(
                                                border: InputBorder.none,
                                                isDense: true,
                                              ),
                                            ),
                                          ),
                                          Icon(
                                            Icons.unfold_more_rounded,
                                            color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                            size: 18,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 14),
                              // State
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildIconLabel(
                                      icon: Icons.map_outlined,
                                      label: 'State',
                                      isLight: isLight,
                                    ),
                                    const SizedBox(height: 8),
                                    Container(
                                      height: 50,
                                      padding: const EdgeInsets.symmetric(horizontal: 14),
                                      decoration: BoxDecoration(
                                        color: isLight ? Colors.white : const Color(0xFF101726),
                                        borderRadius: BorderRadius.circular(14),
                                        border: Border.all(
                                          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                                        ),
                                        boxShadow: isLight ? AppTheme.cardShadow : null,
                                      ),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: TextField(
                                              controller: _stateController,
                                              style: TextStyle(
                                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                                fontSize: 14.5,
                                              ),
                                              decoration: const InputDecoration(
                                                border: InputBorder.none,
                                                isDense: true,
                                              ),
                                            ),
                                          ),
                                          Icon(
                                            Icons.keyboard_arrow_down_rounded,
                                            color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                            size: 20,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 18),

                          // Section 6: Pincode / Postal Code with Verified Zone Badge
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _buildIconLabel(
                                icon: Icons.numbers_rounded,
                                label: 'Pincode / Postal Code',
                                isLight: isLight,
                              ),
                              const Row(
                                children: [
                                  Icon(
                                    Icons.check_circle_outline_rounded,
                                    color: Color(0xFF00E676),
                                    size: 14,
                                  ),
                                  SizedBox(width: 4),
                                  Text(
                                    'Verified Zone',
                                    style: TextStyle(
                                      color: Color(0xFF00E676),
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Container(
                            height: 50,
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _pincodeController,
                                    keyboardType: TextInputType.number,
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                      fontSize: 14.5,
                                    ),
                                    decoration: const InputDecoration(
                                      border: InputBorder.none,
                                    ),
                                  ),
                                ),
                                const Icon(
                                  Icons.verified_outlined,
                                  color: Color(0xFF00E676),
                                  size: 18,
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 20),

                          // Section 7: Set as default address Card
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF14243B),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    Icons.star_outline_rounded,
                                    color: AppTheme.primaryColor,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Set as default address',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                          fontSize: 14.5,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Default dispatch for CarQConnect roadside assistance',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                AppToggleSwitch(
                                  value: _isDefault,
                                  onChanged: (val) =>
                                      setState(() => _isDefault = val),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),

                  // Bottom CTA: Save Address Button
                  Container(
                    padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
                    decoration: BoxDecoration(
                      color: isLight ? Colors.white : const Color(0xFF090E17),
                      border: Border(
                        top: BorderSide(
                          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                        ),
                      ),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton(
                            onPressed: _onSave,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Save Address',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.2,
                                  ),
                                ),
                                SizedBox(width: 8),
                                Icon(
                                  Icons.arrow_forward_rounded,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Encrypted end-to-end for mobility dispatch',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            fontSize: 11.5,
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
      },
    );
  }

  Widget _buildCategoryTab({
    required String title,
    required IconData icon,
    required bool isLight,
  }) {
    final isSelected = _selectedCategory == title;

    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedCategory = title),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 9),
          decoration: BoxDecoration(
            color: isSelected
                ? AppTheme.primaryColor
                : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: isSelected
                    ? Colors.white
                    : (isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE)),
                size: 16,
              ),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  color: isSelected
                      ? Colors.white
                      : (isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE)),
                  fontSize: 13.5,
                  fontWeight:
                      isSelected ? FontWeight.bold : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildIconLabel({
    required IconData icon,
    required String label,
    required bool isLight,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
          size: 16,
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            color: isLight ? const Color(0xFF475569) : const Color(0xFF8E9BAE),
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
