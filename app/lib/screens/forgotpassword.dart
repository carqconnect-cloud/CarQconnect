import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'otp_screen.dart';
import '../utils/api_config.dart';
import '../theme/app_theme.dart';
import '../loading.dart';
import '../widgets/animated_back_arrow.dart';
import '../widgets/app_logo.dart';


class ForgotPasswordScreen extends StatefulWidget {
  final String? initialEmail;

  const ForgotPasswordScreen({super.key, this.initialEmail});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _inputController;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    ApiConfig.prewarm();
    // Only prefill if a real email/phone is passed, otherwise keep empty so placeholder shows
    _inputController = TextEditingController(
      text: (widget.initialEmail != null &&
              widget.initialEmail!.isNotEmpty &&
              !widget.initialEmail!.contains('Mobile number'))
          ? widget.initialEmail!
          : '',
    );
  }

  @override
  void dispose() {
    _inputController.dispose();
    super.dispose();
  }

  bool _isNumeric(String s) {
    return RegExp(r'^[0-9]+$').hasMatch(s.replaceAll(RegExp(r'[\s+-]'), ''));
  }

  Future<void> _sendCode() async {
    final rawInput = _inputController.text.trim();
    final input = rawInput.contains('@') ? rawInput.toLowerCase() : rawInput;
    if (input.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
          content: Text('Please enter your mobile number or email address'),
        ),
      );
      return;
    }

    final isEmail = input.contains('@');
    final isPhone = _isNumeric(input);

    if (isEmail) {
      if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(input)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
            content: Text('Please enter a valid email address'),
          ),
        );
        return;
      }
    } else if (isPhone) {
      final cleanDigits = input.replaceAll(RegExp(r'[^0-9]'), '');
      if (cleanDigits.length < 10 || cleanDigits.length > 13) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
            content: Text('Please enter a valid 10-digit mobile number'),
          ),
        );
        return;
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
          content: Text('Please enter a valid mobile number or email address'),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final endpoints = ApiConfig.candidateBaseUrls
          .map((b) => '$b/auth/send-otp')
          .toList();

      bool sent = false;
      for (final url in endpoints) {
        try {
          final res = await http
              .post(
                Uri.parse(url),
                headers: {'Content-Type': 'application/json'},
                body: jsonEncode(isEmail
                    ? {'email': input}
                    : {'phone': input, 'email': '$input@mobile.carq'}),
              )
              .timeout(const Duration(seconds: 20));

          if (res.statusCode == 200) {
            sent = true;
            break;
          }
        } catch (_) {}
      }

      if (!mounted) return;
      setState(() => _isLoading = false);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF0F1A2E),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: Color(0xFF00C2FF), width: 0.8),
          ),
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded,
                  color: Color(0xFF00C2FF), size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  sent
                      ? '4-digit verification code sent to $input'
                      : 'Verification code sent to $input',
                  style: const TextStyle(color: Colors.white, fontSize: 13.5),
                ),
              ),
            ],
          ),
        ),
      );

      // Navigate to OTP verification screen
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => OtpScreen(
            firstName: 'User',
            lastName: '',
            phone: isPhone ? input : '',
            email: isEmail ? input : '$input@mobile.carq',
            password: '',
            isForgotPassword: true,
          ),
        ),
      );
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
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
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  children: [
                    // 1. Back button header
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                      ),
                    ),

                    // 2. Main Scrollable Content
                    Expanded(
                      child: Center(
                        child: SingleChildScrollView(
                          physics: const BouncingScrollPhysics(),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                const SizedBox(height: 10),

                                // Official CarQConnect Logo Badge
                                AppLogoBadge(isLight: isLight),

                                const SizedBox(height: 32),

                                // Title
                                Text(
                                  'Forgot Password?',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 26,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textPrimary,
                                    letterSpacing: -0.2,
                                  ),
                                ),

                                const SizedBox(height: 12),

                                // Subtitle matching screenshot
                                Text(
                                  "Enter your mobile number or email and we'll send a\n4–digit verification code instantly.",
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 14.5,
                                    color: AppTheme.textSecondary,
                                    height: 1.45,
                                  ),
                                ),

                                const SizedBox(height: 36),

                                // Clean Input Field Card (Matching screenshot)
                                Container(
                                  width: double.infinity,
                                  height: 56,
                                  padding: const EdgeInsets.symmetric(horizontal: 18),
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? Colors.white
                                        : const Color(0xFF0E1626),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: isLight
                                          ? const Color(0xFFCBD5E1)
                                          : const Color(0xFF1E2D44),
                                      width: 1.0,
                                    ),
                                  ),
                                  alignment: Alignment.centerLeft,
                                  child: TextFormField(
                                    controller: _inputController,
                                    keyboardType: TextInputType.emailAddress,
                                    style: TextStyle(
                                      color: AppTheme.textPrimary,
                                      fontSize: 15,
                                      fontWeight: FontWeight.w500,
                                    ),
                                    decoration: InputDecoration(
                                      isDense: true,
                                      contentPadding: EdgeInsets.zero,
                                      border: InputBorder.none,
                                      hintText: 'Mobile number or email address',
                                      hintStyle: TextStyle(
                                        color: isLight
                                            ? const Color(0xFF94A3B8)
                                            : Colors.white38,
                                        fontSize: 15,
                                        fontWeight: FontWeight.normal,
                                      ),
                                    ),
                                  ),
                                ),

                                const SizedBox(height: 24),

                                // Send Code Action Button
                                SizedBox(
                                  width: double.infinity,
                                  height: 56,
                                  child: ElevatedButton(
                                    onPressed: _isLoading ? null : _sendCode,
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
                                        ? AppLoadingSpinner(
                                            size: 24,
                                            primaryColor: isLight
                                                ? Colors.white
                                                : Colors.black,
                                            showGlow: false,
                                          )
                                        : Text(
                                            'Send Code',
                                            style: TextStyle(
                                              color: isLight
                                                  ? Colors.white
                                                  : Colors.black,
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
                      ),
                    ),

                    // 3. Bottom "Do you have an account? Log In"
                    Padding(
                      padding: const EdgeInsets.only(bottom: 24, top: 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Do you have an account? ',
                            style: TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 14,
                            ),
                          ),
                          GestureDetector(
                            onTap: () => Navigator.pop(context),
                            child: Text(
                              'Log In',
                              style: TextStyle(
                                color: isLight
                                    ? AppTheme.primaryBlue
                                    : const Color(0xFF00C2FF),
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
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
      },
    );

  }
}
