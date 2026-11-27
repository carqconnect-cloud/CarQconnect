import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../globals.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import 'active_qr_tag_screen.dart';
import 'qr_activated_screen.dart';
import 'my_qr_screen.dart';
import '../../utils/api_config.dart';
import '../../utils/app_icons.dart';
import '../../widgets/animated_back_arrow.dart';

/// Screen 3: Set Contact & Privacy (Step 2 of 2 matching Screenshot 3)
class SetContactPrivacyScreen extends StatefulWidget {
  final String vehicleId;
  final String vehicleName;
  final String vehicleReg;

  const SetContactPrivacyScreen({
    super.key,
    required this.vehicleId,
    required this.vehicleName,
    required this.vehicleReg,
  });

  @override
  State<SetContactPrivacyScreen> createState() =>
      _SetContactPrivacyScreenState();
}

class _SetContactPrivacyScreenState extends State<SetContactPrivacyScreen> {
  late TextEditingController _phoneController;
  late TextEditingController _bloodGroupController;
  late TextEditingController _emergencyContactController;
  final TextEditingController _medicalNotesController = TextEditingController();

  // 4 Switches matching Screenshot 3 (all ON by default)
  bool _allowCall = true;
  bool _allowMessage = true;
  bool _showEmergencyContact = true;
  bool _showCarQConnectSupport = true;
  bool _isSaving = false;
  String? _phoneError;
  String? _emergencyError;

  Future<void> _saveEmergencyContactToBackend(String name, String phone) async {
    if (phone.isEmpty && name.isEmpty) return;
    for (final base in ApiConfig.candidateBaseUrls) {
      final cleanBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
      try {
        await http.post(
          Uri.parse('$cleanBase/sos/contacts'),
          headers: {
            'Content-Type': 'application/json',
            if (Globals.accessToken.isNotEmpty) 'Authorization': 'Bearer ${Globals.accessToken}',
          },
          body: jsonEncode({
            'name': name.isNotEmpty ? name : 'Emergency Contact',
            'phone': phone,
            'relationship': 'Emergency Contact',
            'isPrimary': true,
            'userEmail': Globals.email,
            'userPhone': Globals.phone,
          }),
        ).timeout(const Duration(seconds: 3));
        break;
      } catch (_) {}
    }
  }

  @override
  void initState() {
    super.initState();
    String initialPhone = Globals.phone.replaceAll(RegExp(r'\D'), '');
    if (initialPhone.length > 10) {
      initialPhone = initialPhone.substring(initialPhone.length - 10);
    }
    _phoneController = TextEditingController(text: initialPhone);
    _bloodGroupController = TextEditingController(text: 'B+');
    
    String emContact = '';
    if (Globals.emergencyContacts.isNotEmpty) {
      emContact = Globals.emergencyContacts.first['phone'] ?? '';
    }
    _emergencyContactController = TextEditingController(text: emContact);
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _bloodGroupController.dispose();
    _emergencyContactController.dispose();
    _medicalNotesController.dispose();
    super.dispose();
  }

  void _showAddEmergencyContactDialog(bool isLight) {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    String? dialogError;

    final currentVal = _emergencyContactController.text.trim();
    if (currentVal.contains('(') && currentVal.contains(')')) {
      nameController.text = currentVal.split('(').first.trim();
      phoneController.text = currentVal.split('(').last.replaceAll(')', '').trim();
    } else if (RegExp(r'^[0-9]+$').hasMatch(currentVal)) {
      phoneController.text = currentVal;
    } else if (currentVal.isNotEmpty) {
      nameController.text = currentVal;
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A26),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: BorderSide(
              color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF192535),
            ),
          ),
          title: Text(
            'Add Emergency Contact',
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: nameController,
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r"[a-zA-Z\s'-]")),
                ],
                decoration: InputDecoration(
                  labelText: 'Contact Name',
                  hintText: 'e.g. Papa, John Doe',
                  labelStyle: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF7B8C9F),
                  ),
                ),
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(10),
                ],
                decoration: InputDecoration(
                  labelText: 'Phone Number (10 digits)',
                  hintText: '9876543210',
                  labelStyle: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF7B8C9F),
                  ),
                ),
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                ),
              ),
              if (dialogError != null) ...[
                const SizedBox(height: 10),
                Text(
                  dialogError!,
                  style: const TextStyle(
                    color: Colors.redAccent,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(
                'Cancel',
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF7B8C9F),
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                final name = nameController.text.trim();
                final phone = phoneController.text.trim();
                if (name.isEmpty) {
                  setDialogState(() => dialogError = 'Please enter contact name');
                  return;
                }
                if (phone.isEmpty || phone.length != 10) {
                  setDialogState(() => dialogError = 'Please enter a valid 10-digit phone number');
                  return;
                }
                final primaryPhone = _phoneController.text.trim();
                if (phone == primaryPhone) {
                  setDialogState(() => dialogError = 'Emergency contact cannot be same as primary contact');
                  return;
                }

                final displayStr = '$name ($phone)';
                setState(() {
                  _emergencyContactController.text = displayStr;
                  _emergencyError = null;
                  if (!Globals.emergencyContacts.any((c) => c['phone'] == phone || c['name'] == name)) {
                    Globals.emergencyContacts.add({
                      'name': name,
                      'phone': phone,
                      'isPrimary': true,
                    });
                  }
                });
                _saveEmergencyContactToBackend(name, phone);
                Navigator.pop(ctx);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    );
  }

  void _showBloodGroupPicker(bool isLight) {
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    showModalBottomSheet(
      context: context,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A26),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: isLight
                      ? const Color(0xFFCBD5E1)
                      : const Color(0xFF334155),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
                child: Text(
                  'Select Blood Group',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 16.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: bloodGroups.length,
                  itemBuilder: (context, index) {
                    final bg = bloodGroups[index];
                    final isSel = _bloodGroupController.text.trim() == bg;
                    return ListTile(
                      leading: Icon(
                        Icons.water_drop_outlined,
                        color: isSel
                            ? AppTheme.primaryColor
                            : (isLight
                                ? const Color(0xFF64748B)
                                : const Color(0xFF7B8C9F)),
                        size: 20,
                      ),
                      title: Text(
                        bg,
                        style: TextStyle(
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                      trailing: Icon(
                        isSel
                            ? Icons.radio_button_checked_rounded
                            : Icons.radio_button_off_rounded,
                        color: isSel
                            ? AppTheme.primaryColor
                            : (isLight
                                ? const Color(0xFFCBD5E1)
                                : const Color(0xFF475569)),
                        size: 22,
                      ),
                      onTap: () {
                        setState(() => _bloodGroupController.text = bg);
                        Navigator.pop(ctx);
                      },
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),
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
        return Container(
          decoration: BoxDecoration(
            gradient: isLight ? AppTheme.bgGradient : null,
            color: isLight ? null : const Color(0xFF090E15),
          ),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            body: SafeArea(
              child: Column(
                children: [
                  // Top App Bar matching Screenshot 3
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    child: Row(
                      children: [
                        AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                        Expanded(
                          child: Center(
                            child: Text(
                              'Set Contact & Privacy',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 18.5,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.3,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 48), // Balance leading back icon
                      ],
                    ),
                  ),

                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 8),

                          // Progress Bar: Step 2 of 2 (100% filled)
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  height: 4,
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryColor,
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Text(
                                'Step 2 of 2',
                                style: TextStyle(
                                  color: AppTheme.primaryColor,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 24),

                          // Field 1: Contact
                          Text(
                            'Contact',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF475569) : const Color(0xFF7B8C9F),
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF0E1722),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: _phoneError != null
                                    ? Colors.redAccent
                                    : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF172332)),
                                width: _phoneError != null ? 1.5 : 1,
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: TextField(
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(10),
                              ],
                              onChanged: (val) {
                                if (_phoneError != null) {
                                  setState(() => _phoneError = null);
                                }
                              },
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                              ),
                              decoration: InputDecoration(
                                prefixIcon: Icon(
                                  Icons.phone_outlined,
                                  color: isLight ? AppTheme.primaryColor : const Color(0xFF6B7C91),
                                  size: 19,
                                ),
                                suffixIcon: Icon(
                                  Icons.edit_outlined,
                                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF6B7C91),
                                  size: 18,
                                ),
                                hintText: '10-digit mobile number',
                                hintStyle: TextStyle(
                                  color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF506073),
                                  fontSize: 14,
                                ),
                                border: InputBorder.none,
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                            ),
                          ),
                          if (_phoneError != null) ...[
                            const SizedBox(height: 6),
                            Padding(
                              padding: const EdgeInsets.only(left: 4),
                              child: Text(
                                _phoneError!,
                                style: const TextStyle(
                                  color: Colors.redAccent,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],

                          const SizedBox(height: 20),

                          // Field 2: Blood Group
                          Text(
                            'Blood Group',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF475569) : const Color(0xFF7B8C9F),
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          InkWell(
                            onTap: () => _showBloodGroupPicker(isLight),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                              decoration: BoxDecoration(
                                color: isLight ? Colors.white : const Color(0xFF0E1722),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF172332),
                                  width: 1,
                                ),
                                boxShadow: isLight ? AppTheme.cardShadow : null,
                              ),
                              child: IgnorePointer(
                                child: TextField(
                                  controller: _bloodGroupController,
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  decoration: InputDecoration(
                                    prefixIcon: Icon(
                                      Icons.water_drop_outlined,
                                      color: isLight ? AppTheme.primaryColor : const Color(0xFF6B7C91),
                                      size: 19,
                                    ),
                                    suffixIcon: Icon(
                                      Icons.keyboard_arrow_down_rounded,
                                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF6B7C91),
                                      size: 22,
                                    ),
                                    border: InputBorder.none,
                                    isDense: true,
                                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                                  ),
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 20),

                          // Field 3: Emergency Contact
                          Text(
                            'Emergency Contact',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF475569) : const Color(0xFF7B8C9F),
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF0E1722),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: _emergencyError != null
                                    ? Colors.redAccent
                                    : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF172332)),
                                width: _emergencyError != null ? 1.5 : 1,
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Contact Details',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF7B8C9F),
                                    fontSize: 12,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF0A1119),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF172332),
                                      width: 1,
                                    ),
                                  ),
                                  child: TextField(
                                    controller: _emergencyContactController,
                                    onChanged: (val) {
                                      if (_emergencyError != null) {
                                        setState(() => _emergencyError = null);
                                      }
                                    },
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                    decoration: InputDecoration(
                                      hintText: 'Add emergency contact',
                                      hintStyle: TextStyle(
                                        color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF506073),
                                        fontSize: 14,
                                        fontWeight: FontWeight.normal,
                                      ),
                                      suffixIcon: Padding(
                                        padding: const EdgeInsets.all(5.0),
                                        child: Material(
                                          color: Colors.transparent,
                                          child: InkWell(
                                            onTap: () => _showAddEmergencyContactDialog(isLight),
                                            borderRadius: BorderRadius.circular(16),
                                            child: Container(
                                              width: 32,
                                              height: 32,
                                              decoration: BoxDecoration(
                                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF222F43),
                                                shape: BoxShape.circle,
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
                                          ),
                                        ),
                                      ),
                                      border: InputBorder.none,
                                      isDense: true,
                                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (_emergencyError != null) ...[
                            const SizedBox(height: 6),
                            Padding(
                              padding: const EdgeInsets.only(left: 4),
                              child: Text(
                                _emergencyError!,
                                style: const TextStyle(
                                  color: Colors.redAccent,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],

                          const SizedBox(height: 20),

                          // Field 4: Medical Notes
                          Text(
                            'Medical Notes',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF475569) : const Color(0xFF7B8C9F),
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            height: 100,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF0E1722),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF172332),
                                width: 1,
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: TextField(
                              controller: _medicalNotesController,
                              maxLines: 4,
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 14.5,
                              ),
                              decoration: InputDecoration(
                                border: InputBorder.none,
                                isDense: true,
                                contentPadding: EdgeInsets.zero,
                                hintText: 'If you have any health issue enter here...',
                                hintStyle: TextStyle(
                                  color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF5E7085),
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 24),

                          // Contact Options for Public Users
                          Text(
                            'Contact Options for Public Users',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF5E7085),
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Toggle 1: Allow Call
                          _buildToggleRow(
                            title: 'Allow Call',
                            subtitle: 'Your number stays private',
                            value: _allowCall,
                            onChanged: (val) => setState(() => _allowCall = val),
                            isLight: isLight,
                          ),

                          const SizedBox(height: 16),

                          // Toggle 2: Allow Message
                          _buildToggleRow(
                            title: 'Allow Message',
                            subtitle: 'Let people send you a message',
                            value: _allowMessage,
                            onChanged: (val) => setState(() => _allowMessage = val),
                            isLight: isLight,
                          ),

                          const SizedBox(height: 16),

                          // Toggle 3: Show Emergency Contact
                          _buildToggleRow(
                            title: 'Show Emergency Contact',
                            subtitle: 'Visible in case of emergency',
                            value: _showEmergencyContact,
                            onChanged: (val) =>
                                setState(() => _showEmergencyContact = val),
                            isLight: isLight,
                          ),

                          const SizedBox(height: 16),

                          // Toggle 4: Show CarQConnect Support
                          _buildToggleRow(
                            title: 'Show CarQConnect Support',
                            subtitle: 'Allow access to support',
                            value: _showCarQConnectSupport,
                            onChanged: (val) =>
                                setState(() => _showCarQConnectSupport = val),
                            isLight: isLight,
                          ),

                          const SizedBox(height: 32),

                          // Bottom Save & Activate Button matching Screenshot 3
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: ElevatedButton(
                              onPressed: _isSaving ? null : () async {
                                final phoneInput = _phoneController.text.trim();
                                if (phoneInput.isEmpty) {
                                  setState(() => _phoneError = 'Primary contact number is required');
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Please enter primary contact number'),
                                      backgroundColor: Colors.redAccent,
                                    ),
                                  );
                                  return;
                                }
                                if (phoneInput.length != 10 || !RegExp(r'^[0-9]{10}$').hasMatch(phoneInput)) {
                                  setState(() => _phoneError = 'Please enter a valid 10-digit mobile number');
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Please enter a valid 10-digit mobile number'),
                                      backgroundColor: Colors.redAccent,
                                    ),
                                  );
                                  return;
                                }

                                final emInput = _emergencyContactController.text.trim();
                                if (emInput.isNotEmpty) {
                                  final emDigits = emInput.replaceAll(RegExp(r'\D'), '');
                                  if (emDigits.isNotEmpty) {
                                    if (emDigits.length < 10) {
                                      setState(() => _emergencyError = 'Emergency phone must be 10 digits');
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Emergency phone number must be 10 digits'),
                                          backgroundColor: Colors.redAccent,
                                        ),
                                      );
                                      return;
                                    }
                                    final clean10 = emDigits.length > 10 ? emDigits.substring(emDigits.length - 10) : emDigits;
                                    if (clean10 == phoneInput) {
                                      setState(() => _emergencyError = 'Emergency contact cannot be same as primary contact');
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Emergency contact cannot be the same as primary contact'),
                                          backgroundColor: Colors.redAccent,
                                        ),
                                      );
                                      return;
                                    }
                                  }
                                }

                                setState(() => _isSaving = true);

                                if (phoneInput.isNotEmpty) {
                                  Globals.phone = phoneInput;
                                }

                                if (emInput.isNotEmpty) {
                                  String emName = emInput;
                                  String emPhone = emInput;
                                  if (emInput.contains('(') && emInput.contains(')')) {
                                    emName = emInput.split('(').first.trim();
                                    emPhone = emInput.split('(').last.replaceAll(')', '').trim();
                                  }
                                  if (!Globals.emergencyContacts.any((c) => c['phone'] == emPhone || c['name'] == emName)) {
                                    Globals.emergencyContacts.add({'name': emName, 'phone': emPhone, 'isPrimary': true});
                                    _saveEmergencyContactToBackend(emName, emPhone);
                                  }
                                }

                                final generatedTagId = 'FN${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}';

                                if (Globals.accessToken.isNotEmpty && widget.vehicleId.isNotEmpty) {
                                  try {
                                    await http.post(
                                      ApiConfig.uri('/app-qr/tags/link'),
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': 'Bearer ${Globals.accessToken}'
                                      },
                                      body: jsonEncode({
                                        'tagId': generatedTagId,
                                        'vehicleId': widget.vehicleId,
                                      }),
                                    ).timeout(const Duration(seconds: 4));

                                    await http.patch(
                                      ApiConfig.uri('/app-qr/tags/$generatedTagId/privacy'),
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': 'Bearer ${Globals.accessToken}'
                                      },
                                      body: jsonEncode({
                                        'callOwner': _allowCall,
                                        'sendMessage': _allowMessage,
                                        'bloodGroupVisibility': _bloodGroupController.text.trim().isNotEmpty,
                                        'emergencyContact': _showEmergencyContact,
                                      }),
                                    ).timeout(const Duration(seconds: 4));
                                  } catch (e) {
                                    debugPrint('Error linking tag: $e');
                                  }
                                }

                                MyQrScreen.cachedActiveTag = {
                                  'tagId': generatedTagId,
                                  'code': generatedTagId,
                                  'vehicleId': widget.vehicleId,
                                  'callOwner': _allowCall,
                                  'sendMessage': _allowMessage,
                                  'bloodGroupVisibility': _bloodGroupController.text.trim().isNotEmpty,
                                  'emergencyContact': _showEmergencyContact,
                                  'vehicle': {
                                    'id': widget.vehicleId,
                                    'name': widget.vehicleName,
                                    'regNumber': widget.vehicleReg,
                                  },
                                };

                                if (context.mounted) {
                                  setState(() => _isSaving = false);
                                  Navigator.pushReplacement(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => QrActivatedScreen(
                                        vehicleId: widget.vehicleId,
                                        vehicleName: widget.vehicleName,
                                        vehicleReg: widget.vehicleReg,
                                        tagId: generatedTagId,
                                      ),
                                    ),
                                  );
                                }
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryColor,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(26),
                                ),
                              ),
                              child: _isSaving
                                  ? const AppLoadingSpinner(size: 22)
                                  : const Text(
                                      'Save & Activate',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
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
      },
    );
  }

  Widget _buildToggleRow({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    required bool isLight,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 14.5,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(
                color: isLight ? const Color(0xFF64748B) : const Color(0xFF5E7085),
                fontSize: 12,
              ),
            ),
          ],
        ),
        Transform.scale(
          scale: 0.85,
          child: Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: Colors.white,
            activeTrackColor: AppTheme.primaryColor,
            inactiveTrackColor: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D3E),
            inactiveThumbColor: isLight ? const Color(0xFF94A3B8) : const Color(0xFF6B7C91),
          ),
        ),
      ],
    );
  }
}
