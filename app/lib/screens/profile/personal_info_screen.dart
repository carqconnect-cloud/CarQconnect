import 'package:flutter/material.dart';
import 'dart:convert';
import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import '../../globals.dart';
import '../../utils/api_config.dart';
import '../../utils/app_icons.dart';
import '../../theme/app_theme.dart';
import '../../widgets/animated_back_arrow.dart';

class PersonalInfoScreen extends StatefulWidget {
  final String initialName;
  final String initialPhone;
  final String initialEmail;
  final String initialDob;

  const PersonalInfoScreen({
    super.key,
    this.initialName = '',
    this.initialPhone = '',
    this.initialEmail = '',
    this.initialDob = '',
  });

  @override
  State<PersonalInfoScreen> createState() => _PersonalInfoScreenState();
}

class _PersonalInfoScreenState extends State<PersonalInfoScreen> {
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  late TextEditingController _emailController;
  late TextEditingController _dobController;
  Uint8List? _avatarBytes;

  @override
  void initState() {
    super.initState();
    final fullName = '${Globals.firstName} ${Globals.lastName}'.trim();
    final resolvedName = widget.initialName.isNotEmpty
        ? widget.initialName
        : fullName;
    final resolvedPhone = widget.initialPhone.isNotEmpty
        ? widget.initialPhone
        : Globals.phone;
    final resolvedEmail = widget.initialEmail.isNotEmpty
        ? widget.initialEmail
        : Globals.email;

    _nameController = TextEditingController(text: resolvedName);
    _phoneController = TextEditingController(text: resolvedPhone);
    _emailController = TextEditingController(text: resolvedEmail);
    _dobController = TextEditingController(text: widget.initialDob);

    _loadSavedAvatar();
  }

  Future<void> _loadSavedAvatar() async {
    if (Globals.profileImageBase64.isNotEmpty) {
      try {
        final decoded = base64Decode(Globals.profileImageBase64);
        setState(() {
          _avatarBytes = decoded;
        });
        return;
      } catch (_) {}
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final key = Globals.email.isNotEmpty
          ? 'carq_profile_avatar_${Globals.email}'
          : 'carq_profile_avatar_default';
      final savedBase64 = prefs.getString(key);
      if (savedBase64 != null && savedBase64.isNotEmpty) {
        final decoded = base64Decode(savedBase64);
        Globals.profileImageBase64 = savedBase64;
        if (mounted) {
          setState(() {
            _avatarBytes = decoded;
          });
        }
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _dobController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final XFile? pickedFile = await picker.pickImage(
        source: source,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );

      if (pickedFile == null) return;

      final bytes = await pickedFile.readAsBytes();
      if (bytes.isEmpty) return;

      final base64Img = base64Encode(bytes);

      setState(() {
        _avatarBytes = bytes;
      });

      Globals.profileImageBase64 = base64Img;

      // Save to SharedPreferences for persistence
      try {
        final prefs = await SharedPreferences.getInstance();
        final key = Globals.email.isNotEmpty
            ? 'carq_profile_avatar_${Globals.email}'
            : 'carq_profile_avatar_default';
        await prefs.setString(key, base64Img);
      } catch (e) {
        debugPrint('Error saving avatar to prefs: $e');
      }

      // Sync avatar to backend if authenticated
      if (Globals.accessToken.isNotEmpty) {
        try {
          final dataUrl = 'data:image/jpeg;base64,$base64Img';
          await http.put(
            ApiConfig.uri('/app-profile'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${Globals.accessToken}',
            },
            body: jsonEncode({
              'avatarUrl': dataUrl,
            }),
          );
        } catch (e) {
          debugPrint('Avatar backend sync failed: $e');
        }
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Profile photo updated successfully!'),
            backgroundColor: AppTheme.primaryColor,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to pick image: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  Future<void> _pickDate() async {
    final isLight = AppTheme.isLightNotifier.value;
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(1995, 6, 15),
      firstDate: DateTime(1950),
      lastDate: now,
      builder: (context, child) {
        if (isLight) {
          return Theme(
            data: ThemeData.light().copyWith(
              colorScheme: ColorScheme.light(
                primary: AppTheme.primaryColor,
                onPrimary: Colors.white,
                surface: Colors.white,
                onSurface: const Color(0xFF0F172A),
              ),
              dialogTheme: const DialogThemeData(
                backgroundColor: Colors.white,
              ),
            ),
            child: child!,
          );
        }
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF00C2FF),
              onPrimary: Colors.black,
              surface: Color(0xFF101726),
              onSurface: Colors.white,
            ),
            dialogTheme: const DialogThemeData(
              backgroundColor: Color(0xFF101726),
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _dobController.text =
            '${picked.day.toString().padLeft(2, '0')}/${picked.month.toString().padLeft(2, '0')}/${picked.year}';
      });
    }
  }

  void _showPhotoOptions() {
    final isLight = AppTheme.isLightNotifier.value;
    showModalBottomSheet(
      context: context,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A26),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: isLight
                      ? const Color(0xFFCBD5E1)
                      : const Color(0xFF334155),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              ListTile(
                leading: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFEFF6FF)
                        : const Color(0xFF162544),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.camera_alt_rounded,
                    color: AppTheme.primaryColor,
                    size: 22,
                  ),
                ),
                title: Text(
                  'Camera',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
                subtitle: Text(
                  'Take a new photo with camera',
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF64748B)
                        : const Color(0xFF8E9BAE),
                    fontSize: 12.5,
                  ),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.camera);
                },
              ),
              const SizedBox(height: 6),
              ListTile(
                leading: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFEFF6FF)
                        : const Color(0xFF162544),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.photo_library_rounded,
                    color: AppTheme.primaryColor,
                    size: 22,
                  ),
                ),
                title: Text(
                  'Choose from Gallery',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
                subtitle: Text(
                  'Select a photo from your gallery',
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF64748B)
                        : const Color(0xFF8E9BAE),
                    fontSize: 12.5,
                  ),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAvatarImage(bool isLight) {
    if (_avatarBytes != null && _avatarBytes!.isNotEmpty) {
      return Image.memory(
        _avatarBytes!,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) =>
            _buildDefaultAvatar(isLight),
      );
    }

    if (Globals.profileImageBase64.isNotEmpty) {
      try {
        final decoded = base64Decode(Globals.profileImageBase64);
        return Image.memory(
          decoded,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) =>
              _buildDefaultAvatar(isLight),
        );
      } catch (_) {}
    }

    return Image.asset(
      'assets/images/user_avatar.jpg',
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) =>
          _buildDefaultAvatar(isLight),
    );
  }

  Widget _buildDefaultAvatar(bool isLight) {
    return Container(
      color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF14243B),
      child: Icon(
        Icons.person_rounded,
        color: AppTheme.primaryColor,
        size: 48,
      ),
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
                'Personal Info',
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
                          const SizedBox(height: 16),

                          // Centered Profile Avatar with Camera Badge
                          Center(
                            child: Column(
                              children: [
                                GestureDetector(
                                  onTap: _showPhotoOptions,
                                  child: Stack(
                                    clipBehavior: Clip.none,
                                    children: [
                                      Container(
                                        width: 96,
                                        height: 96,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: isLight
                                                ? const Color(0xFFE2E8F0)
                                                : const Color(0xFF1E2A3E),
                                            width: 2,
                                          ),
                                        ),
                                        child: ClipOval(
                                          child: _buildAvatarImage(isLight),
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
                                              color: isLight
                                                  ? Colors.white
                                                  : const Color(0xFF090E17),
                                              width: 2,
                                            ),
                                          ),
                                          child: const Icon(
                                            Icons.camera_alt_rounded,
                                            color: Colors.white,
                                            size: 14,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),
                                TextButton(
                                  onPressed: _showPhotoOptions,
                                  style: TextButton.styleFrom(
                                    padding: EdgeInsets.zero,
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  child: Text(
                                    'Change Photo',
                                    style: TextStyle(
                                      color: AppTheme.primaryColor,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 28),

                          // Full Name
                          _buildFieldLabel('FULL NAME', isLight),
                          const SizedBox(height: 8),
                          _buildTextField(
                            controller: _nameController,
                            hintText: 'Enter your full name',
                            isLight: isLight,
                          ),

                          const SizedBox(height: 20),

                          // Phone Number
                          _buildFieldLabel('PHONE NUMBER', isLight),
                          const SizedBox(height: 8),
                          Container(
                            height: 52,
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isLight
                                    ? const Color(0xFFE2E8F0)
                                    : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: TextField(
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                              ),
                              decoration: InputDecoration(
                                prefixIcon: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 14),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.phone_outlined,
                                        color: isLight
                                            ? const Color(0xFF64748B)
                                            : const Color(0xFF8E9BAE),
                                        size: 18,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        '+91',
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF0F172A)
                                              : Colors.white,
                                          fontSize: 15,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      const SizedBox(width: 14),
                                      Container(
                                        width: 1,
                                        height: 24,
                                        color: isLight
                                            ? const Color(0xFFE2E8F0)
                                            : const Color(0xFF1C273C),
                                      ),
                                      const SizedBox(width: 14),
                                    ],
                                  ),
                                ),
                                prefixIconConstraints:
                                    const BoxConstraints(minWidth: 0, minHeight: 0),
                                contentPadding: const EdgeInsets.symmetric(
                                    vertical: 14, horizontal: 14),
                                border: InputBorder.none,
                                isDense: true,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          InkWell(
                            onTap: () {},
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                AppIcons.svg(
                                  AppIcons.refresh,
                                  color: AppTheme.primaryColor,
                                  width: 14,
                                  height: 14,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Verify new number',
                                  style: TextStyle(
                                    color: AppTheme.primaryColor,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 20),

                          // Email Address
                          _buildFieldLabel('EMAIL ADDRESS', isLight),
                          const SizedBox(height: 8),
                          _buildTextField(
                            controller: _emailController,
                            hintText: 'Enter your email address',
                            keyboardType: TextInputType.emailAddress,
                            isLight: isLight,
                          ),

                          const SizedBox(height: 20),

                          // Date of Birth
                          _buildFieldLabel('DATE OF BIRTH', isLight),
                          const SizedBox(height: 8),
                          InkWell(
                            onTap: _pickDate,
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              height: 52,
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              decoration: BoxDecoration(
                                color: isLight ? Colors.white : const Color(0xFF101726),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: isLight
                                      ? const Color(0xFFE2E8F0)
                                      : const Color(0xFF1C273C),
                                ),
                                boxShadow: isLight ? AppTheme.cardShadow : null,
                              ),
                              alignment: Alignment.centerLeft,
                              child: Text(
                                _dobController.text.isNotEmpty
                                    ? _dobController.text
                                    : 'dd/mm/yyyy',
                                style: TextStyle(
                                  color: _dobController.text.isNotEmpty
                                      ? (isLight
                                          ? const Color(0xFF0F172A)
                                          : Colors.white)
                                      : (isLight
                                          ? const Color(0xFF94A3B8)
                                          : const Color(0xFF64748B)),
                                  fontSize: 15,
                                  fontWeight: _dobController.text.isNotEmpty
                                      ? FontWeight.w500
                                      : FontWeight.normal,
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Save Changes Button
                  Container(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                    decoration: BoxDecoration(
                      color: isLight ? Colors.white : const Color(0xFF090E17),
                      border: Border(
                        top: BorderSide(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF1C273C),
                        ),
                      ),
                    ),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: () async {
                          final names = _nameController.text.trim().split(' ');
                          Globals.firstName = names.isNotEmpty ? names.first : '';
                          Globals.lastName = names.length > 1 ? names.sublist(1).join(' ') : '';
                          Globals.phone = _phoneController.text.trim().startsWith('+91')
                              ? _phoneController.text.trim()
                              : '+91 ${_phoneController.text.trim()}';
                          Globals.email = _emailController.text.trim();

                          if (Globals.accessToken.isNotEmpty) {
                            try {
                              await http.put(
                                ApiConfig.uri('/app-profile'),
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': 'Bearer ${Globals.accessToken}',
                                },
                                body: jsonEncode({
                                  'firstName': Globals.firstName,
                                  'lastName': Globals.lastName,
                                  'phone': Globals.phone,
                                  'email': Globals.email,
                                  if (Globals.profileImageBase64.isNotEmpty)
                                    'avatarUrl':
                                        'data:image/jpeg;base64,${Globals.profileImageBase64}',
                                }),
                              );
                            } catch (e) {
                              debugPrint('Sync failed: $e');
                            }
                          }

                          if (!context.mounted) return;
                          Navigator.pop(context, {
                            'name': _nameController.text.trim(),
                            'phone': Globals.phone,
                            'email': Globals.email,
                            'avatar': Globals.profileImageBase64,
                          });
                        },
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
                              'Save Changes',
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
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildFieldLabel(String label, bool isLight) {
    return Text(
      label,
      style: TextStyle(
        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
        fontSize: 12,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.6,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hintText,
    required bool isLight,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF101726),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      alignment: Alignment.centerLeft,
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        style: TextStyle(
          color: isLight ? const Color(0xFF0F172A) : Colors.white,
          fontSize: 15,
          fontWeight: FontWeight.w500,
        ),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: TextStyle(
            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            fontSize: 14.5,
          ),
          border: InputBorder.none,
          isDense: true,
          contentPadding: EdgeInsets.zero,
        ),
      ),
    );
  }
}

