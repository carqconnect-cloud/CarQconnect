import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'emergency_contacts_screen.dart';
import '../../theme/app_theme.dart';
import '../../widgets/animated_back_arrow.dart';
import '../../widgets/app_toggle_switch.dart';
import '../../utils/app_validators.dart';

/// Screen 2: Edit / Add Contact Screen
class EditContactScreen extends StatefulWidget {
  final bool isNew;
  final EmergencyContactItem? contact;

  const EditContactScreen({
    super.key,
    this.isNew = false,
    this.contact,
  });

  @override
  State<EditContactScreen> createState() => _EditContactScreenState();
}

class _EditContactScreenState extends State<EditContactScreen> {
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  late TextEditingController _emailController;

  String _selectedRelationship = 'Parent (Father / Mother)';
  bool _isPrimary = true;
  bool _sendSmsGps = true;
  bool _shareTelemetry = true;

  final List<String> _relationshipOptions = [
    'Parent (Father / Mother)',
    'Spouse / Partner',
    'Sibling (Brother / Sister)',
    'Child (Son / Daughter)',
    'Friend',
    'Colleague',
    'Other Relative',
  ];

  @override
  void initState() {
    super.initState();
    final c = widget.contact;
    _nameController = TextEditingController(
      text: c?.name ?? '',
    );

    // Strip leading +91 or format
    String phoneRaw = (c?.phone ?? '').trim();
    if (phoneRaw.startsWith('+91 ')) {
      phoneRaw = phoneRaw.substring(4).trim();
    } else if (phoneRaw.startsWith('+91')) {
      phoneRaw = phoneRaw.substring(3).trim();
    }
    _phoneController = TextEditingController(text: phoneRaw);

    _emailController = TextEditingController(
      text: c?.email ?? '',
    );

    if (c != null) {
      if (c.relationship != null && c.relationship!.trim().isNotEmpty) {
        final rel = c.relationship!.trim();
        if (_relationshipOptions.contains(rel)) {
          _selectedRelationship = rel;
        } else {
          final lower = rel.toLowerCase();
          if (lower.contains('father') || lower.contains('mother') || lower.contains('parent')) {
            _selectedRelationship = 'Parent (Father / Mother)';
          } else if (lower.contains('spouse') || lower.contains('wife') || lower.contains('husband') || lower.contains('partner')) {
            _selectedRelationship = 'Spouse / Partner';
          } else if (lower.contains('brother') || lower.contains('sister') || lower.contains('sibling')) {
            _selectedRelationship = 'Sibling (Brother / Sister)';
          } else if (lower.contains('child') || lower.contains('son') || lower.contains('daughter')) {
            _selectedRelationship = 'Child (Son / Daughter)';
          } else if (lower.contains('friend')) {
            _selectedRelationship = 'Friend';
          } else if (lower.contains('colleague') || lower.contains('coworker')) {
            _selectedRelationship = 'Colleague';
          } else {
            if (!_relationshipOptions.contains(rel)) {
              _relationshipOptions.add(rel);
            }
            _selectedRelationship = rel;
          }
        }
      }
      _isPrimary = c.isPrimary;
      _sendSmsGps = c.sendSmsGps;
      _shareTelemetry = c.shareTelemetry;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _saveContact() {
    final name = _nameController.text.trim();
    String phone = _phoneController.text.trim();
    final email = _emailController.text.trim();

    final nameErr = AppValidators.validateName(name, label: 'Contact name');
    if (nameErr != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF2A1215),
          content: Text(
            nameErr,
            style: const TextStyle(color: Color(0xFFFF5252)),
          ),
        ),
      );
      return;
    }

    final phoneErr = AppValidators.validatePhone(phone);
    if (phoneErr != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF2A1215),
          content: Text(
            phoneErr,
            style: const TextStyle(color: Color(0xFFFF5252)),
          ),
        ),
      );
      return;
    }

    if (email.isNotEmpty) {
      final emailErr = AppValidators.validateEmail(email);
      if (emailErr != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF2A1215),
            content: Text(
              emailErr,
              style: const TextStyle(color: Color(0xFFFF5252)),
            ),
          ),
        );
        return;
      }
    }

    // Clean phone number: remove any redundant +91
    if (phone.startsWith('+91 ')) {
      phone = phone.substring(4).trim();
    } else if (phone.startsWith('+91')) {
      phone = phone.substring(3).trim();
    }

    final fullPhone = phone.startsWith('+') ? phone : '+91 $phone';

    final parts = name.split(' ');
    String initials = 'EM';
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      initials = '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (name.isNotEmpty) {
      initials = name.substring(0, name.length >= 2 ? 2 : 1).toUpperCase();
    }

    final result = EmergencyContactItem(
      id: widget.contact?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
      name: name,
      phone: fullPhone,
      initials: initials,
      isPrimary: _isPrimary,
      email: _emailController.text.trim(),
      relationship: _selectedRelationship,
      sendSmsGps: _sendSmsGps,
      shareTelemetry: _shareTelemetry,
    );

    Navigator.pop(context, result);
  }

  void _showRelationshipPicker(bool isLight) {
    showModalBottomSheet(
      context: context,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1728),
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        side: BorderSide(color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  'Select Relationship',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 16.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Divider(
                color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1E2A44),
                height: 1,
              ),
              ..._relationshipOptions.map((rel) {
                final isSelected = rel == _selectedRelationship;
                return ListTile(
                  title: Text(
                    rel,
                    style: TextStyle(
                      color: isSelected
                          ? AppTheme.primaryColor
                          : (isLight ? const Color(0xFF0F172A) : Colors.white),
                      fontWeight:
                          isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                  trailing: isSelected
                      ? Icon(
                          Icons.check_circle_rounded,
                          color: AppTheme.primaryColor,
                          size: 20,
                        )
                      : null,
                  onTap: () {
                    setState(() {
                      _selectedRelationship = rel;
                    });
                    Navigator.pop(context);
                  },
                );
              }),
              const SizedBox(height: 12),
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
            color: isLight ? null : const Color(0xFF090D16),
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
                widget.isNew ? 'Add Contact' : 'Edit Contact',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 18.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Profile Photo Avatar Section
                          Center(
                            child: Column(
                              children: [
                                Stack(
                                  clipBehavior: Clip.none,
                                  children: [
                                    Container(
                                      width: 92,
                                      height: 92,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: isLight
                                              ? const Color(0xFFE2E8F0)
                                              : const Color(0xFF1E2D4A),
                                          width: 2.5,
                                        ),
                                      ),
                                      child: ClipOval(
                                        child: Image.asset(
                                          'assets/images/user_avatar.jpg',
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stackTrace) =>
                                              Container(
                                            color: isLight
                                                ? const Color(0xFFEFF6FF)
                                                : const Color(0xFF14243B),
                                            child: Icon(
                                              Icons.person,
                                              color: AppTheme.primaryColor,
                                              size: 48,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                    Positioned(
                                      right: 0,
                                      bottom: 0,
                                      child: Container(
                                        width: 28,
                                        height: 28,
                                        decoration: BoxDecoration(
                                          color: AppTheme.primaryColor,
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: isLight ? Colors.white : const Color(0xFF090D16),
                                            width: 2,
                                          ),
                                        ),
                                        child: const Icon(
                                          Icons.camera_alt_rounded,
                                          color: Colors.white,
                                          size: 14.5,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                InkWell(
                                  onTap: () async {
                                    try {
                                      await ImagePicker().pickImage(
                                        source: ImageSource.gallery,
                                      );
                                    } catch (_) {}
                                  },
                                  child: Text(
                                    'Change Photo',
                                    style: TextStyle(
                                      color: AppTheme.primaryColor,
                                      fontSize: 14.5,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),

                          // FULL NAME* Field
                          _buildFieldLabel('FULL NAME*', isLight),
                          const SizedBox(height: 8),
                          _buildInputField(
                            controller: _nameController,
                            hintText: 'Enter full name',
                            inputFormatters: AppValidators.nameFormatters,
                            isLight: isLight,
                          ),
                          const SizedBox(height: 18),

                          // PHONE NUMBER* Field
                          _buildFieldLabel('PHONE NUMBER*', isLight),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              // Country Code prefix
                              Container(
                                height: 50,
                                padding: const EdgeInsets.symmetric(horizontal: 14),
                                decoration: BoxDecoration(
                                  color: isLight ? Colors.white : const Color(0xFF0F1728),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
                                    width: 1,
                                  ),
                                  boxShadow: isLight ? AppTheme.cardShadow : null,
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.phone_outlined,
                                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                      size: 17,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '+91',
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 10),
                              // Number Input
                              Expanded(
                                child: _buildInputField(
                                  controller: _phoneController,
                                  hintText: '9876543210',
                                  keyboardType: TextInputType.phone,
                                  inputFormatters: AppValidators.phoneFormatters,
                                  isLight: isLight,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 18),

                          // EMAIL ADDRESS (OPTIONAL)
                          _buildFieldLabel('EMAIL ADDRESS (OPTIONAL)', isLight),
                          const SizedBox(height: 8),
                          _buildInputField(
                            controller: _emailController,
                            hintText: 'name@example.com',
                            keyboardType: TextInputType.emailAddress,
                            inputFormatters: AppValidators.emailFormatters,
                            isLight: isLight,
                          ),
                          const SizedBox(height: 18),

                          // RELATIONSHIP Field
                          _buildFieldLabel('RELATIONSHIP', isLight),
                          const SizedBox(height: 8),
                          InkWell(
                            onTap: () => _showRelationshipPicker(isLight),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              height: 50,
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              decoration: BoxDecoration(
                                color: isLight ? Colors.white : const Color(0xFF0F1728),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
                                  width: 1,
                                ),
                                boxShadow: isLight ? AppTheme.cardShadow : null,
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      _selectedRelationship,
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                  Icon(
                                    Icons.keyboard_arrow_down_rounded,
                                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                    size: 22,
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),

                          // EMERGENCY PROTOCOL SETTINGS Card
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF0F1728),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
                                width: 1,
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'EMERGENCY PROTOCOL SETTINGS',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                                const SizedBox(height: 14),

                                // Toggle 1: Primary Contact
                                _buildProtocolSwitchTile(
                                  title: 'Set as Primary Contact',
                                  subtitle:
                                      'Contact will be dialed first and prioritized in instant SOS triggers.',
                                  value: _isPrimary,
                                  isLight: isLight,
                                  onChanged: (val) {
                                    setState(() {
                                      _isPrimary = val;
                                    });
                                  },
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  child: Divider(
                                    color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1E2A44),
                                    height: 1,
                                  ),
                                ),

                                // Toggle 2: Send SOS SMS
                                _buildProtocolSwitchTile(
                                  title: 'Send SOS SMS with GPS Alert',
                                  subtitle:
                                      'Dispatches real-time crash / emergency text coordinates.',
                                  value: _sendSmsGps,
                                  isLight: isLight,
                                  onChanged: (val) {
                                    setState(() {
                                      _sendSmsGps = val;
                                    });
                                  },
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  child: Divider(
                                    color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1E2A44),
                                    height: 1,
                                  ),
                                ),

                                // Toggle 3: Live Telemetry
                                _buildProtocolSwitchTile(
                                  title: 'Share Live Vehicle Telemetry',
                                  subtitle:
                                      'Allows contact to track route when crash alert is active.',
                                  value: _shareTelemetry,
                                  isLight: isLight,
                                  onChanged: (val) {
                                    setState(() {
                                      _shareTelemetry = val;
                                    });
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Save Changes Button
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _saveContact,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(30),
                          ),
                          elevation: 0,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              widget.isNew ? 'Add Contact' : 'Save Changes',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(
                              Icons.arrow_forward_rounded,
                              color: Colors.white,
                              size: 20,
                            ),
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

  Widget _buildFieldLabel(String text, bool isLight) {
    return Text(
      text,
      style: TextStyle(
        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
        fontSize: 11.5,
        fontWeight: FontWeight.bold,
        letterSpacing: 0.6,
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hintText,
    required bool isLight,
    TextInputType keyboardType = TextInputType.text,
    List<TextInputFormatter>? inputFormatters,
  }) {
    return Container(
      height: 50,
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
          width: 1,
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        inputFormatters: inputFormatters,
        style: TextStyle(
          color: isLight ? const Color(0xFF0F172A) : Colors.white,
          fontSize: 15,
          fontWeight: FontWeight.w500,
        ),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: TextStyle(
            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF475569),
            fontSize: 14,
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _buildProtocolSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    required bool isLight,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
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
              const SizedBox(height: 3),
              Text(
                subtitle,
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                  fontSize: 12,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        AppToggleSwitch(
          value: value,
          onChanged: onChanged,
        ),
      ],
    );
  }
}
