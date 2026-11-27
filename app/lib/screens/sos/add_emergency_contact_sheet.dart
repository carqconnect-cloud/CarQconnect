import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_toggle_switch.dart';

class SosContactModel {
  final String id;
  final String name;
  final String phone;
  final String? relationship;
  final bool isPrimary;

  const SosContactModel({
    required this.id,
    required this.name,
    required this.phone,
    this.relationship,
    this.isPrimary = false,
  });

  SosContactModel copyWith({
    String? id,
    String? name,
    String? phone,
    String? relationship,
    bool? isPrimary,
  }) {
    return SosContactModel(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      relationship: relationship ?? this.relationship,
      isPrimary: isPrimary ?? this.isPrimary,
    );
  }
}

/// Modal Bottom Sheet matching Image 3: Add/Edit Emergency Contact
class AddEmergencyContactSheet extends StatefulWidget {
  final SosContactModel? initialContact;

  const AddEmergencyContactSheet({
    super.key,
    this.initialContact,
  });

  @override
  State<AddEmergencyContactSheet> createState() =>
      _AddEmergencyContactSheetState();
}

class _AddEmergencyContactSheetState extends State<AddEmergencyContactSheet> {
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  String _relationship = 'Parent';
  bool _isPrimary = false;

  final List<String> _relations = [
    'Parent',
    'Spouse',
    'Sibling',
    'Friend',
    'Guardian',
    'Colleague',
    'Other',
  ];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(
      text: widget.initialContact?.name ?? '',
    );
    _phoneController = TextEditingController(
      text: widget.initialContact?.phone ?? '',
    );
    _relationship = widget.initialContact?.relationship ?? 'Parent';
    if (!_relations.contains(_relationship)) {
      _relationship = 'Other';
    }
    _isPrimary = widget.initialContact?.isPrimary ?? false;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _onSave() {
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF2A1215),
          content: Text(
            'Please enter contact name',
            style: TextStyle(color: Color(0xFFFF5252)),
          ),
        ),
      );
      return;
    }

    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF2A1215),
          content: Text(
            'Please enter phone number',
            style: TextStyle(color: Color(0xFFFF5252)),
          ),
        ),
      );
      return;
    }

    final result = SosContactModel(
      id: widget.initialContact?.id ?? '',
      name: name,
      phone: phone,
      relationship: _relationship,
      isPrimary: _isPrimary,
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
            color: isLight ? Colors.white : const Color(0xFF0F1A2E),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            border: Border.all(
              color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
              width: 1,
            ),
          ),
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Column(
              mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with Title and Close X
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    widget.initialContact != null
                        ? 'Edit emergency contact'
                        : 'Add emergency contact',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.close_rounded,
                      color: isLight ? const Color(0xFF64748B) : Colors.white,
                      size: 22,
                    ),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Name Field Label
              Text(
                'Full Name',
                style: TextStyle(
                  color: isLight ? const Color(0xFF475569) : const Color(0xFF94A3B8),
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),

              // Name Input
              Container(
                height: 48,
                decoration: BoxDecoration(
                  color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF131D2D),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1D2F47),
                  ),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: TextField(
                  controller: _nameController,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                  ),
                  decoration: const InputDecoration(
                    hintText: 'e.g. Rahul Sharma',
                    hintStyle: TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 14,
                    ),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Contact Number Field Label
              Text(
                'Contact Phone Number',
                style: TextStyle(
                  color: isLight ? const Color(0xFF475569) : const Color(0xFF94A3B8),
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),

              // Contact Number Input
              Container(
                height: 48,
                decoration: BoxDecoration(
                  color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF131D2D),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1D2F47),
                  ),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                  ),
                  decoration: const InputDecoration(
                    hintText: 'e.g. +91 98765 43210',
                    hintStyle: TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 14,
                    ),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Relationship Dropdown
              Text(
                'Relationship',
                style: TextStyle(
                  color: isLight ? const Color(0xFF475569) : const Color(0xFF94A3B8),
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                height: 48,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF131D2D),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1D2F47),
                  ),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _relationship,
                    isExpanded: true,
                    dropdownColor: isLight ? Colors.white : const Color(0xFF131D2D),
                    icon: Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: isLight ? const Color(0xFF64748B) : Colors.white,
                    ),
                    items: _relations.map((rel) {
                      return DropdownMenuItem<String>(
                        value: rel,
                        child: Text(
                          rel,
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                            fontSize: 14,
                          ),
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _relationship = val);
                      }
                    },
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Mark as Primary Switch Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Primary Contact',
                        style: TextStyle(
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        'Alert this person first during SOS',
                        style: TextStyle(
                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                          fontSize: 11.5,
                        ),
                      ),
                    ],
                  ),
                  AppToggleSwitch(
                    value: _isPrimary,
                    onChanged: (val) {
                      setState(() => _isPrimary = val);
                    },
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Save Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _onSave,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFED3833),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(26),
                    ),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Save Contact',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
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
}
