import 'package:flutter/material.dart';

import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

import 'create_account_screen.dart';
import 'forgotpassword.dart';
import 'bottom_navigation_screen.dart';
import '../utils/api_config.dart';
import '../utils/app_icons.dart';
import '../theme/app_theme.dart';
import '../loading.dart';
import '../services/auth_storage_service.dart';
import '../widgets/app_logo.dart';

class LogInScreen extends StatefulWidget {
  const LogInScreen({super.key});

  @override
  State<LogInScreen> createState() => _LogInScreenState();
}

class _LogInScreenState extends State<LogInScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _rememberMe = false;
  bool _obscurePassword = true;
  bool _isLoading = false;

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  static const String _googleClientId =
      '330567894204-lniefe7bn6vq9nothu4j7bcfsc6gtds4.apps.googleusercontent.com';
  static Completer<void>? _googleInitCompleter;

  static Future<void> _ensureGoogleInitialized() async {
    if (_googleInitCompleter != null) {
      return _googleInitCompleter!.future;
    }
    _googleInitCompleter = Completer<void>();
    try {
      await GoogleSignIn.instance.initialize(
        clientId: kIsWeb ? _googleClientId : null,
        serverClientId: kIsWeb ? null : _googleClientId,
      );
      _googleInitCompleter!.complete();
    } catch (e) {
      debugPrint('[GoogleSignIn] init notice: $e');
      _googleInitCompleter!.complete();
    }
    return _googleInitCompleter!.future;
  }

  @override
  void initState() {
    super.initState();
    // Warm up backend cloud instance in background so it's awake before user taps Log In
    ApiConfig.prewarm();
    _ensureGoogleInitialized();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submitForm() async {
    if (_isLoading) return;
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    const maxAttempts = 2;
    http.Response? response;

    final requestBody = jsonEncode({
      'email': _emailController.text.trim(),
      'password': _passwordController.text,
      'portal': 'app',
    });

    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
      if (!mounted) return;

      try {
        response = await http
            .post(
              ApiConfig.uri('/auth/app/login'),
              headers: {
                'Content-Type': 'application/json',
                'X-Portal-Type': 'app',
              },
              body: requestBody,
            )
            .timeout(const Duration(seconds: 25));

        // If Render is waking up and returns reverse-proxy gateway error (502, 503, 504), wait and retry
        if ((response.statusCode == 502 || response.statusCode == 503 || response.statusCode == 504) &&
            attempt < maxAttempts) {
          await Future.delayed(const Duration(milliseconds: 400));
          continue;
        }

        // If explicit success or standard authentication error (400, 401, 403), do not retry
        break;
      } catch (e) {
        if (attempt < maxAttempts) {
          await Future.delayed(const Duration(milliseconds: 400));
          continue;
        }
      }
    }

    if (!mounted) return;

    if (response != null && response.statusCode == 200) {
      try {
        final data = jsonDecode(response.body);
        final tokens = data['data']?['tokens'];
        final user = data['data']?['user'];

        final accessToken = tokens?['accessToken'] ?? '';
        final refreshToken = tokens?['refreshToken'];
        final firstName = user?['firstName'] ?? 'User';
        final lastName = user?['lastName'] ?? '';
        final email = user?['email'] ?? _emailController.text.trim();
        final phone = user?['phone']?.toString();

        await AuthStorageService.saveSession(
          accessToken: accessToken,
          refreshToken: refreshToken,
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
        );

        if (!mounted) return;

        // Instant navigation to Home Screen!
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const BottomNavigationScreen(),
          ),
        );
        return;
      } catch (_) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to process login data. Please try again.'),
            backgroundColor: Colors.redAccent,
          ),
        );
        return;
      }
    }

    setState(() => _isLoading = false);

    if (response != null) {
      String message = 'Invalid email or password';
      try {
        final errorData = jsonDecode(response.body);
        final error = errorData['error'];
        if (error is Map && error['message'] != null) {
          message = error['message'].toString();
        } else if (error is String) {
          message = error;
        } else if (response.statusCode >= 500) {
          message = 'Server is currently initializing. Please try again in a moment.';
        }
      } catch (_) {
        if (response.statusCode >= 500) {
          message = 'Server is currently waking up. Please try again in a few seconds.';
        } else {
          message = 'Login failed (${response.statusCode}). Please check your credentials.';
        }
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: Colors.redAccent),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to reach server. Please check your internet connection and try again.'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  Future<void> _handleGoogleSignIn() async {
    if (_isLoading) return;

    // Google Sign-In SDK (v7.x) uses native Credential Manager on Android / iOS builds.
    // On Web browsers, Google strictly enforces GIS iframe renderButton, so authenticate() throws UnimplementedError.
    if (kIsWeb && !GoogleSignIn.instance.supportsAuthenticate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Google Sign-In is configured for Mobile (Android APK). Please test in the Android build.',
          ),
          backgroundColor: Colors.blueGrey,
          duration: Duration(seconds: 4),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      await _ensureGoogleInitialized();
      try {
        await GoogleSignIn.instance.signOut();
      } catch (_) {}

      GoogleSignInAccount? account;
      try {
        account = await GoogleSignIn.instance.authenticate();
      } catch (e) {
        debugPrint('[GoogleSignIn] authenticate failed: $e');
        if (mounted) {
          setState(() => _isLoading = false);
          final errStr = e.toString().toLowerCase();
          if (!errStr.contains('cancel') && !errStr.contains('interrupted')) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Google Sign-in: $e'),
                backgroundColor: Colors.redAccent,
                duration: const Duration(seconds: 4),
              ),
            );
          }
        }
        return;
      }

      if (account == null) {
        if (mounted) setState(() => _isLoading = false);
        return;
      }

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
          .timeout(const Duration(seconds: 35));

      if (!mounted) return;

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final tokens = data['data']?['tokens'];
        final user = data['data']?['user'];

        final accessToken = tokens?['accessToken'] ?? '';
        final refreshToken = tokens?['refreshToken'];
        final firstName = user?['firstName'] ??
            account.displayName?.split(' ').first ??
            'User';
        final lastName = user?['lastName'] ?? '';
        final email = user?['email'] ?? account.email;
        final phone = user?['phone']?.toString();

        await AuthStorageService.saveSession(
          accessToken: accessToken,
          refreshToken: refreshToken,
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
        );

        if (!mounted) return;

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const BottomNavigationScreen(),
          ),
        );
      } else {
        setState(() => _isLoading = false);
        String message = 'Google sign-in failed';
        try {
          final errData = jsonDecode(response.body);
          final error = errData['error'];
          if (error is Map && error['message'] != null) {
            message = error['message'].toString();
          } else if (error is String) {
            message = error;
          }
        } catch (_) {}
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
                padding: const EdgeInsets.symmetric(
                  horizontal: 24.0,
                  vertical: 40.0,
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Official CarQConnect Logo (without badge container background)
                      const AppLogo(width: 64, height: 52),
                      const SizedBox(height: 24),
                      Text(
                        'Log In',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 40),

                      // Email Field
                      _buildTextField(
                        label: 'Email',
                        hint: 'jamesbond123@gmail.com',
                        icon: Icons.email_outlined,
                        keyboardType: TextInputType.emailAddress,
                        controller: _emailController,
                        validator: (v) {
                          final val = v?.trim() ?? '';
                          if (val.isEmpty) {
                            return 'Email is required';
                          }
                          final emailRegex = RegExp(
                            r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
                          );
                          if (!emailRegex.hasMatch(val)) {
                            return 'Please enter a valid email address';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Password Field
                      _buildTextField(
                        label: 'Password',
                        hint: 'supersecretpassword',
                        prefixWidget: Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: AppIcons.svg(
                            AppIcons.password,
                            color: AppTheme.primaryBlue,
                            width: 20,
                            height: 20,
                          ),
                        ),
                        isPassword: true,
                        obscureText: _obscurePassword,
                        controller: _passwordController,
                        onToggleVisibility: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
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

                      // Remember Me & Forgot Password
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              SizedBox(
                                width: 24,
                                height: 24,
                                child: Checkbox(
                                  value: _rememberMe,
                                  onChanged: (value) => setState(
                                    () => _rememberMe = value ?? false,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  side: BorderSide(
                                    color: AppTheme.textSecondary,
                                  ),
                                  activeColor: AppTheme.primaryBlue,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Remember Me',
                                style: TextStyle(
                                  color: AppTheme.textPrimary,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ForgotPasswordScreen(
                                    initialEmail:
                                        _emailController.text.trim().isNotEmpty
                                        ? _emailController.text.trim()
                                        : null,
                                  ),
                                ),
                              );
                            },
                            child: Text(
                              'Forgot Password?',
                              style: TextStyle(
                                color: AppTheme.primaryBlue,
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Log In Button
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _submitForm,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryBlue,
                            foregroundColor: Colors.white,
                            disabledBackgroundColor: AppTheme.primaryBlue
                                .withValues(alpha: 0.7),
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
                              : const Text(
                                  'Log In',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Divider and Social Logins
                      Row(
                        children: [
                          Expanded(child: Divider(color: AppTheme.cardBorder)),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              'Or Log In with',
                              style: TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          Expanded(child: Divider(color: AppTheme.cardBorder)),
                        ],
                      ),
                      const SizedBox(height: 32),

                      _buildSocialButton(
                        imageAsset: 'assets/images/googleicon.png',
                        text: 'Log In with Google',
                        onPressed: _handleGoogleSignIn,
                      ),
                      const SizedBox(height: 16),
                      _buildSocialButton(
                        imageAsset: 'assets/images/appleicon.png',
                        text: 'Log In with Apple',
                        onPressed: _handleAppleSignIn,
                      ),

                      const SizedBox(height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            "Don't have an account? ",
                            style: TextStyle(color: AppTheme.textSecondary),
                          ),
                          GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) =>
                                      const CreateAccountScreen(),
                                ),
                              );
                            },
                            child: Text(
                              'Create Account',
                              style: TextStyle(
                                color: AppTheme.primaryBlue,
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
  }) {
    return TextFormField(
      controller: controller,
      obscureText: isPassword ? obscureText : false,
      keyboardType: keyboardType,
      validator: validator,
      style: TextStyle(color: AppTheme.textPrimary),
      decoration: InputDecoration(
        filled: true,
        fillColor: AppTheme.inputBg,
        labelText: label,
        labelStyle: TextStyle(color: AppTheme.textSecondary, fontSize: 14),
        hintText: hint,
        hintStyle: TextStyle(color: AppTheme.textMuted),
        prefixIcon:
            prefixWidget ??
            (icon != null
                ? Icon(icon, color: AppTheme.primaryBlue, size: 20)
                : null),
        suffixIcon: isPassword
            ? IconButton(
                icon: Icon(
                  obscureText
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  color: obscureText
                      ? AppTheme.textMuted
                      : AppTheme.primaryBlue,
                  size: 20,
                ),
                onPressed: onToggleVisibility,
                splashRadius: 20,
              )
            : null,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppTheme.inputBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppTheme.inputBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppTheme.primaryBlue),
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
    required String imageAsset,
    required String text,
    required VoidCallback onPressed,
  }) {
    final bool isApple = imageAsset.contains('apple');
    final Color? iconColor = isApple
        ? (AppTheme.isLight ? Colors.black : Colors.white)
        : null;

    return SizedBox(
      width: double.infinity,
      height: 56,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: AppTheme.cardBg,
          side: BorderSide(color: AppTheme.cardBorder),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
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
