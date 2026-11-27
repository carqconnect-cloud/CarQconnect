import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'login_screen.dart';
import '../utils/api_config.dart';
import '../theme/app_theme.dart';
import '../loading.dart';
import '../widgets/animated_back_arrow.dart';
import '../widgets/app_logo.dart';


class ResetPasswordScreen extends StatefulWidget {
  final String email;
  final String phone;

  const ResetPasswordScreen({
    super.key,
    required this.email,
    required this.phone,
  });

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: Colors.redAccent,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        content: Row(
          children: [
            const Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 10),
            Expanded(child: Text(message, style: const TextStyle(color: Colors.white))),
          ],
        ),
      ),
    );
  }

  Future<void> _updatePassword() async {
    final newPassword = _newPasswordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (newPassword.isEmpty) {
      _showErrorSnackBar('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      _showErrorSnackBar('Password must be at least 6 characters long');
      return;
    }

    if (confirmPassword.isEmpty) {
      _showErrorSnackBar('Please retype your new password');
      return;
    }

    if (newPassword != confirmPassword) {
      _showErrorSnackBar('Passwords do not match');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final endpoints = ApiConfig.candidateBaseUrls
          .map((b) => '$b/auth/reset-password')
          .toList();

      bool updated = false;
      String? errorMessage;

      final body = jsonEncode({
        'email': widget.email,
        'phone': widget.phone,
        'newPassword': newPassword,
      });

      for (final url in endpoints) {
        try {
          final res = await http
              .post(
                Uri.parse(url),
                headers: {'Content-Type': 'application/json'},
                body: body,
              )
              .timeout(const Duration(seconds: 20));

          if (res.statusCode == 200 || res.statusCode == 201) {
            updated = true;
            break;
          } else {
            try {
              final json = jsonDecode(res.body);
              if (json is Map) {
                final err = json['error'];
                if (err is Map && err['message'] != null) {
                  errorMessage = err['message'].toString();
                } else if (err is String) {
                  errorMessage = err;
                } else if (json['message'] != null) {
                  errorMessage = json['message'].toString();
                }
              }
            } catch (_) {}
          }
        } catch (_) {}
      }

      if (!mounted) return;
      setState(() => _isLoading = false);

      if (updated) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF0F1A2E),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFF00C2FF), width: 0.8),
            ),
            content: const Row(
              children: [
                Icon(Icons.check_circle_rounded, color: Color(0xFF00C2FF), size: 22),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Password updated successfully! Please log in.',
                    style: TextStyle(color: Colors.white, fontSize: 13.5),
                  ),
                ),
              ],
            ),
          ),
        );

        // Navigate back to Login Screen
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const LogInScreen()),
          (route) => false,
        );
      } else {
        _showErrorSnackBar(errorMessage ?? 'Failed to update password. Please try again.');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        _showErrorSnackBar('Network error. Failed to connect to server.');
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
                    // Header with Back button
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                      ),
                    ),

                    // Main Content
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
                                  'Reset Password',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 26,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textPrimary,
                                    letterSpacing: -0.2,
                                  ),
                                ),

                                const SizedBox(height: 12),

                                // Subtitle
                                Text(
                                  'Create a strong new password with at least 6 characters.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 14.5,
                                    color: AppTheme.textSecondary,
                                    height: 1.45,
                                  ),
                                ),

                                const SizedBox(height: 36),

                                // Field 1: New Password
                                Container(
                                  width: double.infinity,
                                  height: 56,
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
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
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.lock_outline_rounded,
                                        color: isLight
                                            ? AppTheme.primaryBlue
                                            : const Color(0xFF00C2FF),
                                        size: 20,
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: TextFormField(
                                          controller: _newPasswordController,
                                          obscureText: _obscureNew,
                                          style: TextStyle(
                                            color: AppTheme.textPrimary,
                                            fontSize: 15,
                                            fontWeight: FontWeight.w500,
                                          ),
                                          decoration: InputDecoration(
                                            isDense: true,
                                            contentPadding: EdgeInsets.zero,
                                            border: InputBorder.none,
                                            hintText: 'New Password',
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
                                      IconButton(
                                        splashRadius: 18,
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                        icon: Icon(
                                          _obscureNew
                                              ? Icons.visibility_off_outlined
                                              : Icons.visibility_outlined,
                                          color: isLight
                                              ? const Color(0xFF64748B)
                                              : Colors.white38,
                                          size: 20,
                                        ),
                                        onPressed: () {
                                          setState(() => _obscureNew = !_obscureNew);
                                        },
                                      ),
                                    ],
                                  ),
                                ),

                                const SizedBox(height: 16),

                                // Field 2: Retype New Password
                                Container(
                                  width: double.infinity,
                                  height: 56,
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
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
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.lock_reset_rounded,
                                        color: isLight
                                            ? AppTheme.primaryBlue
                                            : const Color(0xFF00C2FF),
                                        size: 20,
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: TextFormField(
                                          controller: _confirmPasswordController,
                                          obscureText: _obscureConfirm,
                                          style: TextStyle(
                                            color: AppTheme.textPrimary,
                                            fontSize: 15,
                                            fontWeight: FontWeight.w500,
                                          ),
                                          decoration: InputDecoration(
                                            isDense: true,
                                            contentPadding: EdgeInsets.zero,
                                            border: InputBorder.none,
                                            hintText: 'Retype New Password',
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
                                      IconButton(
                                        splashRadius: 18,
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                        icon: Icon(
                                          _obscureConfirm
                                              ? Icons.visibility_off_outlined
                                              : Icons.visibility_outlined,
                                          color: isLight
                                              ? const Color(0xFF64748B)
                                              : Colors.white38,
                                          size: 20,
                                        ),
                                        onPressed: () {
                                          setState(() => _obscureConfirm = !_obscureConfirm);
                                        },
                                      ),
                                    ],
                                  ),
                                ),

                                const SizedBox(height: 28),

                                // Update Password Action Button
                                SizedBox(
                                  width: double.infinity,
                                  height: 56,
                                  child: ElevatedButton(
                                    onPressed: _isLoading ? null : _updatePassword,
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
                                            'Update Password',
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

                    // Bottom Return to Log In link
                    Padding(
                      padding: const EdgeInsets.only(bottom: 24, top: 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Remember your password? ',
                            style: TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 14,
                            ),
                          ),
                          GestureDetector(
                            onTap: () {
                              Navigator.pushAndRemoveUntil(
                                context,
                                MaterialPageRoute(builder: (context) => const LogInScreen()),
                                (route) => false,
                              );
                            },
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
