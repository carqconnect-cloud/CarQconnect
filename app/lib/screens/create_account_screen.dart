import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'otp_screen.dart';
import 'bottom_navigation_screen.dart';
import '../globals.dart';
import '../utils/api_config.dart';
import '../utils/app_icons.dart';
import '../theme/app_theme.dart';
import '../loading.dart';
import '../widgets/app_logo.dart';
import '../utils/app_validators.dart';


class CreateAccountScreen extends StatefulWidget {
  const CreateAccountScreen({super.key});

  @override
  State<CreateAccountScreen> createState() => _CreateAccountScreenState();
}

class _CreateAccountScreenState extends State<CreateAccountScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _submitted = false;
  bool _agreeTerms = false;
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _mobileController = TextEditingController();
  final _emailController = TextEditingController();
  final _passController = TextEditingController();
  final _confirmPassController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isLoading = false;

  static const String _googleClientId =
      '413549874609-55r88a0qrek9on8onsvcntkls9e9624b.apps.googleusercontent.com';
  static bool _googleInitialized = false;

  static Future<void> _ensureGoogleInitialized() async {
    if (_googleInitialized) return;
    try {
      await GoogleSignIn.instance.initialize(
        clientId: kIsWeb ? _googleClientId : null,
        serverClientId: kIsWeb ? null : _googleClientId,
      );
      _googleInitialized = true;
    } catch (_) {}
  }

  @override
  void initState() {
    super.initState();
    ApiConfig.prewarm();
    _ensureGoogleInitialized();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _mobileController.dispose();
    _emailController.dispose();
    _passController.dispose();
    _confirmPassController.dispose();
    super.dispose();
  }

  void _submitForm() async {
    if (_isLoading) return;
    setState(() => _submitted = true);
    if (_formKey.currentState!.validate()) {
      if (!_agreeTerms) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('You must agree to the Terms of Service.'),
            backgroundColor: Colors.redAccent,
          ),
        );
        return;
      }

      setState(() => _isLoading = true);

      try {
        final email = _emailController.text.trim().toLowerCase();
        final rawPhone = _mobileController.text.trim();
        final cleanPhone = rawPhone.replaceAll(RegExp(r'[^0-9]'), '');
        final phone = cleanPhone.length > 10 && cleanPhone.startsWith('91')
            ? cleanPhone.substring(2)
            : (cleanPhone.length > 10 && cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone);

        final endpoints = ApiConfig.candidateBaseUrls
            .map((b) => '$b/auth/send-otp')
            .toList();

        http.Response? response;
        for (final endpoint in endpoints) {
          try {
            final res = await http
                .post(
                  Uri.parse(endpoint),
                  headers: {'Content-Type': 'application/json'},
                  body: jsonEncode({
                    'phone': phone,
                    'channel': 'sms',
                    'purpose': 'register',
                  }),
                )
                .timeout(const Duration(seconds: 15));
            response = res;
            if (res.statusCode == 200) break;
          } catch (_) {}
        }

        if (response != null && response.statusCode == 200) {
          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) {
                  return OtpScreen(
                    firstName: _firstNameController.text.trim(),
                    lastName: _lastNameController.text.trim(),
                    phone: phone,
                    email: email,
                    password: _passController.text,
                  );
                },
              ),
            );
          }
        } else {
          String message = 'Failed to send OTP';
          if (response != null) {
            try {
              final data = jsonDecode(response.body);
              final error = data['error'];
              if (error is Map && error['message'] != null) {
                message = error['message'].toString();
              } else if (error is String) {
                message = error;
              }
            } catch (_) {}
          }
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(message), backgroundColor: Colors.redAccent),
            );
          }
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to connect to server. Please try again.'),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
      } finally {
        if (mounted) {
          setState(() => _isLoading = false);
        }
      }
    }
  }

  Future<void> _handleGoogleSignIn() async {
    if (_isLoading) return;
    setState(() => _isLoading = true);

    try {
      await _ensureGoogleInitialized();
      try {
        await GoogleSignIn.instance.signOut();
      } catch (_) {}

      final GoogleSignInAccount account =
          await GoogleSignIn.instance.authenticate();

      final GoogleSignInAuthentication auth = account.authentication;
      final String? idToken = auth.idToken;

      if (idToken == null || idToken.isEmpty) {
        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to retrieve Google credentials.'),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
        return;
      }

      final Map<String, dynamic> bodyData = {
        'email': account.email,
        'displayName': account.displayName,
        'photoUrl': account.photoUrl,
        'idToken': idToken,
      };

      final response = await http
          .post(
            ApiConfig.uri('/auth/app/google'),
            headers: {
              'Content-Type': 'application/json',
              'X-Portal-Type': 'app',
            },
            body: jsonEncode(bodyData),
          )
          .timeout(const Duration(seconds: 15));

      if (!mounted) return;

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['data'] != null && data['data']['tokens'] != null) {
          Globals.accessToken = data['data']['tokens']['accessToken'] ?? '';
        }
        if (data['data'] != null && data['data']['user'] != null) {
          Globals.firstName = data['data']['user']['firstName'] ??
              account.displayName?.split(' ').first ??
              'User';
          Globals.lastName = data['data']['user']['lastName'] ?? '';
          Globals.email = data['data']['user']['email'] ?? account.email;
          if (data['data']['user']['phone'] != null &&
              data['data']['user']['phone'].toString().isNotEmpty) {
            Globals.phone = data['data']['user']['phone'];
          }
        }

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const BottomNavigationScreen(),
          ),
        );
      } else {
        setState(() => _isLoading = false);
        final errData = jsonDecode(response.body);
        final error = errData['error'];
        final message = error is Map
            ? (error['message'] ?? 'Google sign-in failed')
            : (error ?? 'Google sign-in failed');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: Colors.redAccent),
        );
      }
    } catch (e) {
      if (e.toString().contains('canceled') || e.toString().contains('interrupted')) {
        if (mounted) setState(() => _isLoading = false);
        return;
      }
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Google Sign-In Error: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  void _handleAppleSignIn() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Apple Sign-In is configured for iOS devices with an active Apple ID.'),
        backgroundColor: Color(0xFF0F172A),
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
            body: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 40.0),
                child: Form(
                  key: _formKey,
                  autovalidateMode: _submitted
                      ? AutovalidateMode.onUserInteraction
                      : AutovalidateMode.disabled,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Official CarQConnect Logo (clean, without container box)
                      AppLogo(
                        width: 64,
                        height: 64,
                        isLight: isLight,
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Create Account',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Form Fields
                      _buildTextField(
                        isLight: isLight,
                        label: 'First Name',
                        hint: 'Enter first name',
                        icon: Icons.person_outline,
                        controller: _firstNameController,
                        inputFormatters: AppValidators.nameFormatters,
                        validator: (v) => AppValidators.validateName(v, label: 'First name'),
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        isLight: isLight,
                        label: 'Last Name',
                        hint: 'Doe',
                        icon: Icons.person_outline,
                        controller: _lastNameController,
                        inputFormatters: AppValidators.nameFormatters,
                        validator: (v) => AppValidators.validateName(v, label: 'Last name'),
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        isLight: isLight,
                        label: 'Mobile*',
                        hint: '9876543210',
                        icon: Icons.phone_android,
                        keyboardType: TextInputType.phone,
                        controller: _mobileController,
                        inputFormatters: AppValidators.phoneFormatters,
                        validator: AppValidators.validatePhone,
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        isLight: isLight,
                        label: 'Email',
                        hint: 'you@example.com',
                        icon: Icons.email_outlined,
                        keyboardType: TextInputType.emailAddress,
                        controller: _emailController,
                        inputFormatters: AppValidators.emailFormatters,
                        validator: AppValidators.validateEmail,
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        isLight: isLight,
                        label: 'Password',
                        hint: '••••••••',
                        prefixWidget: Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: AppIcons.svg(
                            AppIcons.password,
                            color: isLight
                                ? AppTheme.primaryBlue
                                : const Color(0xFF00C2FF),
                            width: 20,
                            height: 20,
                          ),
                        ),
                        isPassword: true,
                        obscureText: _obscurePassword,
                        onToggleVisibility: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                        controller: _passController,
                        validator: (v) {
                          if (v == null || v.isEmpty) {
                            return 'Password is required';
                          }
                          if (v.length < 6) {
                            return 'Password must be at least 6 characters';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        isLight: isLight,
                        label: 'Confirm password',
                        hint: 'supersecretpassword',
                        prefixWidget: Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: AppIcons.svg(
                            AppIcons.password,
                            color: isLight
                                ? AppTheme.primaryBlue
                                : const Color(0xFF00C2FF),
                            width: 20,
                            height: 20,
                          ),
                        ),
                        isPassword: true,
                        obscureText: _obscureConfirmPassword,
                        onToggleVisibility: () {
                          setState(() {
                            _obscureConfirmPassword = !_obscureConfirmPassword;
                          });
                        },
                        controller: _confirmPassController,
                        validator: (v) {
                          if (v == null || v.isEmpty) {
                            return 'Please confirm your password';
                          }
                          if (v != _passController.text) {
                            return 'Passwords do not match';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Terms & Conditions
                      Row(
                        children: [
                          SizedBox(
                            width: 24,
                            height: 24,
                            child: Checkbox(
                              value: _agreeTerms,
                              onChanged: (value) => setState(() => _agreeTerms = value ?? false),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              side: BorderSide(
                                color: isLight
                                    ? const Color(0xFF94A3B8)
                                    : Colors.white54,
                              ),
                              activeColor: isLight
                                  ? AppTheme.primaryBlue
                                  : const Color(0xFF00C2FF),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'I agree to the ',
                            style: TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 14,
                            ),
                          ),
                          Text(
                            'Terms of Service',
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Create Account Button
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _submitForm,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isLight
                                ? AppTheme.primaryBlue
                                : const Color(0xFF00C2FF),
                            foregroundColor:
                                isLight ? Colors.white : Colors.black,
                            elevation: isLight ? 2 : 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(28),
                            ),
                          ),
                          child: _isLoading
                              ? const AppLoadingSpinner(
                                  size: 24,
                                  primaryColor: Colors.white,
                                  showGlow: false,
                                )
                              : Text(
                                  'Create Account',
                                  style: TextStyle(
                                    color: isLight ? Colors.white : Colors.black,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Divider and Socials
                      Row(
                        children: [
                          Expanded(
                            child: Divider(
                              color: isLight
                                  ? const Color(0xFFE2E8F0)
                                  : Colors.white.withValues(alpha: 0.1),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              'Or Create with',
                              style: TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Divider(
                              color: isLight
                                  ? const Color(0xFFE2E8F0)
                                  : Colors.white.withValues(alpha: 0.1),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      _buildSocialButton(
                        isLight: isLight,
                        imageAsset: 'assets/images/googleicon.png',
                        text: 'Log In with Google',
                        onPressed: _handleGoogleSignIn,
                      ),
                      const SizedBox(height: 16),
                      _buildSocialButton(
                        isLight: isLight,
                        imageAsset: 'assets/images/appleicon.png',
                        text: 'Log In with Apple',
                        onPressed: _handleAppleSignIn,
                      ),

                      const SizedBox(height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            "Do you have an account? ",
                            style: TextStyle(color: AppTheme.textSecondary),
                          ),
                          GestureDetector(
                            onTap: () => Navigator.pop(context),
                            child: Text(
                              'Log In',
                              style: TextStyle(
                                color: isLight
                                    ? AppTheme.primaryBlue
                                    : const Color(0xFF00C2FF),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
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

  Widget _buildTextField({
    required bool isLight,
    required String label,
    required String hint,
    IconData? icon,
    Widget? prefixWidget,
    bool isPassword = false,
    bool obscureText = false,
    VoidCallback? onToggleVisibility,
    TextInputType? keyboardType,
    TextEditingController? controller,
    String? Function(String?)? validator,
    List<TextInputFormatter>? inputFormatters,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: isPassword ? obscureText : false,
      keyboardType: keyboardType,
      validator: validator,
      inputFormatters: inputFormatters,
      style: TextStyle(color: AppTheme.textPrimary),
      decoration: InputDecoration(
        filled: true,
        fillColor: isLight ? Colors.white : const Color(0xFF161B22),
        labelText: label,
        labelStyle: TextStyle(
          color: isLight
              ? const Color(0xFF64748B)
              : Colors.white.withValues(alpha: 0.5),
          fontSize: 14,
        ),
        hintText: hint,
        hintStyle: TextStyle(
          color: isLight
              ? const Color(0xFF94A3B8)
              : Colors.white.withValues(alpha: 0.3),
        ),
        prefixIcon: prefixWidget ??
            (icon != null
                ? Icon(
                    icon,
                    color: isLight
                        ? AppTheme.primaryBlue
                        : const Color(0xFF00C2FF),
                    size: 20,
                  )
                : null),
        suffixIcon: isPassword
            ? IconButton(
                icon: Icon(
                  obscureText ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                  color: obscureText
                      ? (isLight
                          ? const Color(0xFF94A3B8)
                          : Colors.white.withValues(alpha: 0.5))
                      : (isLight
                          ? AppTheme.primaryBlue
                          : const Color(0xFF00C2FF)),
                  size: 20,
                ),
                onPressed: onToggleVisibility,
                splashRadius: 20,
              )
            : null,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(
            color: isLight
                ? const Color(0xFFCBD5E1)
                : Colors.white.withValues(alpha: 0.1),
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(
            color: isLight
                ? const Color(0xFFCBD5E1)
                : Colors.white.withValues(alpha: 0.1),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(
            color: isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF),
            width: 1.5,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Colors.redAccent),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Colors.redAccent),
        ),
      ),
    );
  }

  Widget _buildSocialButton({
    required bool isLight,
    required String imageAsset,
    required String text,
    required VoidCallback onPressed,
  }) {
    final bool isApple = imageAsset.contains('apple');
    final Color? iconColor = isApple
        ? (isLight ? Colors.black : Colors.white)
        : null;

    return SizedBox(
      width: double.infinity,
      height: 56,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: isLight ? Colors.white : const Color(0xFF161B22),
          side: BorderSide(
            color: isLight
                ? const Color(0xFFE2E8F0)
                : Colors.white.withValues(alpha: 0.1),
          ),
          elevation: isLight ? 1 : 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(
              imageAsset,
              width: 20,
              height: 20,
              fit: BoxFit.contain,
              color: iconColor,
              errorBuilder: (context, error, stackTrace) => Icon(
                Icons.account_circle,
                color: AppTheme.textPrimary,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              text,
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

