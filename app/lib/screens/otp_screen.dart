import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'add_vehicle_screen.dart';
import 'reset_password_screen.dart';
import '../utils/api_config.dart';
import '../theme/app_theme.dart';
import '../loading.dart';
import '../services/auth_storage_service.dart';
import '../widgets/animated_back_arrow.dart';
import '../widgets/app_logo.dart';

class OtpScreen extends StatefulWidget {
  final String firstName;
  final String lastName;
  final String phone;
  final String email;
  final String password;
  final bool isForgotPassword;
  final String? testOtp;

  const OtpScreen({
    super.key,
    required this.firstName,
    required this.lastName,
    required this.phone,
    required this.email,
    required this.password,
    this.isForgotPassword = false,
    this.testOtp,
  });

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> with SingleTickerProviderStateMixin {
  bool _isResending = false;
  String _otp = ''; // Started empty
  bool _isKeypadOpen = true; // Open custom numeric pad immediately for smooth UX
  bool _isSubmitting = false; // Prevents multiple taps and shows loading
  final FocusNode _keyboardFocusNode = FocusNode();

  late AnimationController _cursorController;
  late Animation<double> _cursorAnimation;

  @override
  void initState() {
    super.initState();
// OTP is left empty for user input
    _cursorController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 550),
    )..repeat(reverse: true);
    _cursorAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _cursorController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _cursorController.dispose();
    _keyboardFocusNode.dispose();
    super.dispose();
  }

  void _openKeypad() {
    setState(() {
      _isKeypadOpen = true;
    });
    _keyboardFocusNode.requestFocus();
  }

  void _onKeyPress(String value) {
    setState(() {
      if (value == 'backspace') {
        if (_otp.isNotEmpty) {
          _otp = _otp.substring(0, _otp.length - 1);
        }
      } else if (value == 'clear') {
        _otp = '';
      } else {
        if (_otp.length < 4) {
          _otp += value;
        }
      }
    });
  }

  Future<void> _pasteFromClipboard() async {
    try {
      final data = await Clipboard.getData(Clipboard.kTextPlain);
      final text = data?.text?.trim() ?? '';
      final digits = text.replaceAll(RegExp(r'\D'), '');
      if (digits.length >= 4) {
        setState(() {
          _otp = digits.substring(0, 4);
          if (!_isKeypadOpen) _isKeypadOpen = true;
        });
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No 4-digit OTP found in clipboard'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (_) {}
  }

  String _parseApiError(http.Response? response, String fallback) {
    if (response == null || response.body.isEmpty) return fallback;
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map) {
        final error = decoded['error'];
        if (error is Map && error['message'] != null) {
          final msg = error['message'].toString().trim();
          if (msg.isNotEmpty) return msg;
        } else if (error is String && error.trim().isNotEmpty) {
          return error.trim();
        }

        final message = decoded['message'];
        if (message is String && message.trim().isNotEmpty) {
          return message.trim();
        }
      }
    } catch (_) {}
    return fallback;
  }

  Future<void> _resendOtp() async {
    if (_isResending) return;
    setState(() => _isResending = true);

    try {
      final email = widget.email.trim().toLowerCase();
      final phone = widget.phone.trim();

      http.Response? resendRes;
      for (final base in ApiConfig.candidateBaseUrls) {
        try {
          final res = await http
              .post(
                Uri.parse('$base/auth/send-otp'),
                headers: {'Content-Type': 'application/json'},
                body: jsonEncode({'email': email, 'phone': phone}),
              )
              .timeout(const Duration(seconds: 25));
          resendRes = res;
          if (res.statusCode == 200) {
            ApiConfig.setBaseUrl(base);
            break;
          } else if (res.statusCode >= 400 && res.statusCode < 500) {
            break;
          }
        } catch (_) {}
      }

      if (mounted) {
        if (resendRes != null && resendRes.statusCode == 200) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                phone.isNotEmpty && (email.isEmpty || email.endsWith('@mobile.carq'))
                    ? 'New OTP sent to $phone'
                    : 'New OTP sent to $email',
              ),
              backgroundColor: const Color(0xFF10B981),
            ),
          );
        } else {
          final msg = _parseApiError(resendRes, 'Failed to resend OTP. Please try again.');
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(msg), backgroundColor: Colors.redAccent),
          );
        }
      }
    } catch (_) {
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
        setState(() => _isResending = false);
      }
    }
  }

  void _submitOtp() async {
    if (_isSubmitting) return;
    if (_otp.length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter all 4 digits of the OTP'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final email = widget.email.trim().toLowerCase();
      final phone = widget.phone.trim();

      http.Response? verifyRes;
      String? workingBaseUrl;
      final verifyBody = jsonEncode({
        'email': email,
        'phone': phone,
        'otp': _otp.trim(),
      });

      for (final base in ApiConfig.candidateBaseUrls) {
        try {
          final res = await http
              .post(
                Uri.parse('$base/auth/verify-otp'),
                headers: {'Content-Type': 'application/json'},
                body: verifyBody,
              )
              .timeout(const Duration(seconds: 25));
          verifyRes = res;
          if (res.statusCode == 200) {
            workingBaseUrl = base;
            ApiConfig.setBaseUrl(base);
            break;
          } else if (res.statusCode >= 400 && res.statusCode < 500) {
            // Rejection from the authoritative live server (e.g. 400 Invalid OTP)
            break;
          }
        } catch (_) {}
      }

      if (verifyRes != null && verifyRes.statusCode == 200) {
        if (!widget.isForgotPassword && widget.password.isNotEmpty) {
          http.Response? regRes;
          final regBody = jsonEncode({
            'firstName': widget.firstName.trim(),
            'lastName': widget.lastName.trim(),
            'phone': phone,
            'email': email,
            'password': widget.password,
          });

          final List<String> regCandidates = [];
          if (workingBaseUrl != null && workingBaseUrl.isNotEmpty) {
            regCandidates.add(workingBaseUrl);
          }
          for (final b in ApiConfig.candidateBaseUrls) {
            if (!regCandidates.contains(b)) {
              regCandidates.add(b);
            }
          }

          for (final base in regCandidates) {
            try {
              final res = await http
                  .post(
                    Uri.parse('$base/auth/app-register'),
                    headers: {'Content-Type': 'application/json'},
                    body: regBody,
                  )
                  .timeout(const Duration(seconds: 35));
              regRes = res;
              if (res.statusCode == 201 || res.statusCode == 200) {
                ApiConfig.setBaseUrl(base);
                break;
              } else if (res.statusCode >= 400 && res.statusCode < 500) {
                break;
              }
            } catch (_) {}
          }

          if (regRes != null && (regRes.statusCode == 201 || regRes.statusCode == 200)) {
            final data = jsonDecode(regRes.body);
            final tokens = data['data']?['tokens'];
            final user = data['data']?['user'];

            final accessToken = tokens?['accessToken'] ?? '';
            final refreshToken = tokens?['refreshToken'];
            final firstName = user?['firstName'] ?? widget.firstName;
            final lastName = user?['lastName'] ?? widget.lastName;
            final resEmail = user?['email'] ?? widget.email;
            final resPhone = user?['phone'] ?? widget.phone;

            await AuthStorageService.saveSession(
              accessToken: accessToken,
              refreshToken: refreshToken,
              firstName: firstName,
              lastName: lastName,
              email: resEmail,
              phone: resPhone,
            );

            if (mounted) {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (context) => const AddVehicleScreen()),
              );
            }
          } else {
            final errorMsg = _parseApiError(regRes, 'Registration failed. Please try again.');
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(errorMsg),
                  backgroundColor: Colors.redAccent,
                ),
              );
            }
          }
        } else {
          // Forgot Password flow -> Open screen with two fields: New Password & Retype New Password
          if (mounted) {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (context) => ResetPasswordScreen(
                  email: email,
                  phone: phone,
                ),
              ),
            );
          }
        }
      } else {
        final errorMessage = _parseApiError(verifyRes, 'Invalid OTP or expired. Please try again.');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorMessage),
              backgroundColor: Colors.redAccent,
            ),
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
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return KeyboardListener(
          focusNode: _keyboardFocusNode,
          onKeyEvent: (event) {
            if (event is KeyDownEvent) {
              if (!_isKeypadOpen) {
                setState(() => _isKeypadOpen = true);
              }
              final key = event.logicalKey;
              if (key == LogicalKeyboardKey.backspace) {
                _onKeyPress('backspace');
              } else if (key == LogicalKeyboardKey.delete || key == LogicalKeyboardKey.escape) {
                _onKeyPress('clear');
              } else if (key == LogicalKeyboardKey.enter || key == LogicalKeyboardKey.numpadEnter) {
                if (_otp.length == 4 && !_isSubmitting) {
                  _submitOtp();
                }
              } else {
                final char = event.character;
                if (char != null && RegExp(r'^[0-9]$').hasMatch(char)) {
                  _onKeyPress(char);
                }
              }
            }
          },
          child: Container(
            decoration: BoxDecoration(
              gradient: isLight ? AppTheme.bgGradient : null,
              color: isLight ? null : const Color(0xFF090E17),
            ),
            child: Scaffold(
              backgroundColor: Colors.transparent,
              body: SafeArea(
                child: Column(
                  children: [
                    // Top App Header with Back button
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                      child: Row(
                        children: [
                          AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                        ],
                      ),
                    ),

                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            // Official CarQConnect Logo Badge
                            AppLogoBadge(isLight: isLight),
                            const SizedBox(height: 20),
                            Text(
                              'Enter OTP',
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              widget.phone.isNotEmpty && (widget.email.isEmpty || widget.email.endsWith('@mobile.carq'))
                                  ? 'OTP sent to your mobile number\n${widget.phone}. Enter the code to proceed.'
                                  : 'OTP sent to your email address\n${widget.email}. Enter the code to proceed.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 14,
                                color: AppTheme.textSecondary,
                                height: 1.5,
                              ),
                            ),
                            const SizedBox(height: 32),

                            // Interactive OTP Input Circles
                            GestureDetector(
                              onTap: _openKeypad,
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: List.generate(4, (index) {
                                  final hasValue = index < _otp.length;
                                  final isFocused = _isKeypadOpen && index == _otp.length;

                                  final activeColor = isLight
                                      ? AppTheme.primaryBlue
                                      : const Color(0xFF00C2FF);

                                  return MouseRegion(
                                    cursor: SystemMouseCursors.click,
                                    child: AnimatedContainer(
                                      duration: const Duration(milliseconds: 200),
                                      margin: const EdgeInsets.symmetric(horizontal: 8),
                                      width: 60,
                                      height: 60,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: isFocused
                                              ? activeColor
                                              : hasValue
                                                  ? activeColor
                                                  : (isLight
                                                      ? const Color(0xFFCBD5E1)
                                                      : Colors.white.withValues(alpha: 0.25)),
                                          width: isFocused ? 2.5 : 2.0,
                                        ),
                                        color: hasValue
                                            ? activeColor.withValues(alpha: isLight ? 0.08 : 0.12)
                                            : isFocused
                                                ? activeColor.withValues(alpha: isLight ? 0.05 : 0.08)
                                                : (isLight ? Colors.white : Colors.transparent),
                                        boxShadow: isFocused
                                            ? [
                                                BoxShadow(
                                                  color: activeColor.withValues(alpha: isLight ? 0.25 : 0.4),
                                                  blurRadius: 14,
                                                  spreadRadius: 2,
                                                ),
                                              ]
                                            : (isLight
                                                ? [
                                                    const BoxShadow(
                                                      color: Color(0x0A000000),
                                                      blurRadius: 8,
                                                      offset: Offset(0, 2),
                                                    ),
                                                  ]
                                                : null),
                                      ),
                                      child: Center(
                                        child: hasValue
                                            ? Text(
                                                _otp[index],
                                                style: TextStyle(
                                                  fontSize: 24,
                                                  color: AppTheme.textPrimary,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              )
                                            : isFocused
                                                ? FadeTransition(
                                                    opacity: _cursorAnimation,
                                                    child: Container(
                                                      width: 2.2,
                                                      height: 24,
                                                      decoration: BoxDecoration(
                                                        color: activeColor,
                                                        borderRadius: BorderRadius.circular(1),
                                                      ),
                                                    ),
                                                  )
                                                : null,
                                      ),
                                    ),
                                  );
                                }),
                              ),
                            ),

                            const SizedBox(height: 12),

                            // Helper prompt and Paste button
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                if (!_isKeypadOpen) ...[
                                  GestureDetector(
                                    onTap: _openKeypad,
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.touch_app_rounded,
                                          color: isLight
                                              ? AppTheme.primaryBlue
                                              : const Color(0xFF00C2FF),
                                          size: 16,
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          'Tap to type',
                                          style: TextStyle(
                                            color: isLight
                                                ? AppTheme.primaryBlue
                                                : const Color(0xFF00C2FF),
                                            fontSize: 12.5,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                ],
                                GestureDetector(
                                  onTap: _pasteFromClipboard,
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.content_paste_rounded,
                                        color: isLight
                                            ? AppTheme.primaryBlue
                                            : const Color(0xFF00C2FF),
                                        size: 15,
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        'Paste code',
                                        style: TextStyle(
                                          color: isLight
                                              ? AppTheme.primaryBlue
                                              : const Color(0xFF00C2FF),
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 32),

                            // Continue Button
                            SizedBox(
                              width: double.infinity,
                              height: 56,
                              child: ElevatedButton(
                                onPressed: (_otp.length == 4 && !_isSubmitting) ? _submitOtp : null,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isLight
                                      ? AppTheme.primaryBlue
                                      : const Color(0xFF00C2FF),
                                  disabledBackgroundColor: isLight
                                      ? const Color(0xFFCBD5E1)
                                      : Colors.white.withValues(alpha: 0.1),
                                  elevation: isLight ? 2 : 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(28),
                                  ),
                                ),
                                child: _isSubmitting
                                    ? AppLoadingSpinner(
                                        size: 24,
                                        primaryColor: isLight ? Colors.white : Colors.black,
                                        showGlow: false,
                                      )
                                    : Text(
                                        'Continue',
                                        style: TextStyle(
                                          color: _otp.length == 4
                                              ? (isLight ? Colors.white : Colors.black)
                                              : (isLight ? Colors.white70 : Colors.white54),
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                              ),
                            ),
                            const SizedBox(height: 24),

                            // Resend OTP
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  "Don't receive the OTP? ",
                                  style: TextStyle(color: AppTheme.textSecondary),
                                ),
                                GestureDetector(
                                  onTap: _isResending ? null : _resendOtp,
                                  child: _isResending
                                      ? SizedBox(
                                          width: 14,
                                          height: 14,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: isLight
                                                ? AppTheme.primaryBlue
                                                : const Color(0xFF00C2FF),
                                          ),
                                        )
                                      : Text(
                                          'Resend OTP',
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

                    // Animated Typing Pad
                    AnimatedSize(
                      duration: const Duration(milliseconds: 280),
                      curve: Curves.easeInOutCubic,
                      child: _isKeypadOpen
                          ? Container(
                              padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
                              decoration: BoxDecoration(
                                color: isLight ? Colors.white : const Color(0xFF161B22),
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                                border: Border.all(
                                  color: isLight
                                      ? const Color(0xFFE2E8F0)
                                      : Colors.white.withValues(alpha: 0.08),
                                  width: 1.0,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: isLight
                                        ? const Color(0x1A000000)
                                        : Colors.black.withValues(alpha: 0.5),
                                    blurRadius: 20,
                                    offset: const Offset(0, -4),
                                  ),
                                ],
                              ),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  // Header bar with drag handle and hide keyboard button
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const SizedBox(width: 40),
                                      Container(
                                        width: 38,
                                        height: 4,
                                        decoration: BoxDecoration(
                                          color: isLight
                                              ? const Color(0xFFCBD5E1)
                                              : Colors.white.withValues(alpha: 0.25),
                                          borderRadius: BorderRadius.circular(2),
                                        ),
                                      ),
                                      IconButton(
                                        icon: Icon(
                                          Icons.keyboard_hide_rounded,
                                          color: isLight ? const Color(0xFF64748B) : Colors.white54,
                                          size: 20,
                                        ),
                                        tooltip: 'Hide typing pad',
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                        onPressed: () => setState(() => _isKeypadOpen = false),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),

                                  // Row 1: 1, 2, 3, backspace
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                    children: [
                                      _buildKey('1', isLight: isLight),
                                      _buildKey('2', isLight: isLight),
                                      _buildKey('3', isLight: isLight),
                                      _buildKey('backspace', isLight: isLight, icon: Icons.keyboard_double_arrow_left),
                                    ],
                                  ),
                                  const SizedBox(height: 14),

                                  // Row 2: 4, 5, 6, clear
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                    children: [
                                      _buildKey('4', isLight: isLight),
                                      _buildKey('5', isLight: isLight),
                                      _buildKey('6', isLight: isLight),
                                      _buildKey('clear', isLight: isLight, icon: Icons.close),
                                    ],
                                  ),
                                  const SizedBox(height: 14),

                                  // Row 3: 7, 8, 9, 0
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                    children: [
                                      _buildKey('7', isLight: isLight),
                                      _buildKey('8', isLight: isLight),
                                      _buildKey('9', isLight: isLight),
                                      _buildKey('0', isLight: isLight),
                                    ],
                                  ),
                                ],
                              ),
                            )
                          : const SizedBox.shrink(),
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

  Widget _buildKey(String value, {required bool isLight, IconData? icon}) {
    return GestureDetector(
      onTap: () => _onKeyPress(value),
      child: Container(
        width: 65,
        height: 65,
        decoration: BoxDecoration(
          color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF0D1117),
          shape: BoxShape.circle,
          border: Border.all(
            color: isLight ? const Color(0xFFE2E8F0) : Colors.white.withValues(alpha: 0.08),
            width: 1.0,
          ),
        ),
        child: Center(
          child: icon != null
              ? Icon(
                  icon,
                  color: isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF),
                  size: 26,
                )
              : Text(
                  value,
                  style: TextStyle(
                    fontSize: 24,
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
        ),
      ),
    );
  }
}
