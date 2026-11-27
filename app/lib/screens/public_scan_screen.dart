import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'dart:convert';

import '../utils/url_launcher.dart' as launcher;
import '../utils/api_config.dart';
import '../theme/app_theme.dart';
import '../loading.dart';
import '../services/screen_refresh_service.dart';

class PublicScanScreen extends StatefulWidget {
  final String tagId;

  const PublicScanScreen({super.key, required this.tagId});

  @override
  State<PublicScanScreen> createState() => _PublicScanScreenState();
}

class _PublicScanScreenState extends State<PublicScanScreen>
    with RefreshOnRouteReturn<PublicScanScreen> {
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _data;

  String _maskRegistration(String reg) {
    if (reg.length < 6) return reg;
    final firstPart = reg.substring(0, 4);
    final lastPart = reg.substring(reg.length - 4);
    return '$firstPart •••• $lastPart';
  }

  @override
  void initState() {
    super.initState();
    _fetchTagInfo();
  }

  Future<void> _fetchTagInfo() async {
    try {
      final response = await http.get(ApiConfig.uri('/scan/${widget.tagId}'));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          setState(() {
            _data = data['data'];
            _isLoading = false;
          });
        } else {
          setState(() {
            _error = 'Invalid tag or not found.';
            _isLoading = false;
          });
        }
      } else {
        setState(() {
          _error = 'Failed to load info or tag is inactive.';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error. Please try again later.';
        _isLoading = false;
      });
    }
  }

  Future<void> _launchUrl(String urlString) async {
    debugPrint('Launching URL: $urlString');
    launcher.launchUrl(urlString);
  }

  Future<void> _showMaskedCallDialog({String targetType = 'owner'}) async {
    final controller = TextEditingController();
    bool isCalling = false;
    final isEmergency = targetType == 'emergency';
    final dialogTitle = isEmergency
        ? 'Emergency Contact Call'
        : 'Secure Call to Owner';
    final dialogSubtitle = isEmergency
        ? 'Enter your phone number to connect securely with the emergency contact. Neither your number nor their number will be revealed.'
        : 'Enter your phone number to connect securely to the owner. Your number will remain completely private.';
    final isLight = AppTheme.isLight;
    final primaryBlue = isLight
        ? AppTheme.primaryBlue
        : const Color(0xFF00C2FF);

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setStateBuilder) {
          return AlertDialog(
            backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A26),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            title: Row(
              children: [
                Icon(
                  isEmergency
                      ? Icons.emergency_rounded
                      : Icons.phone_in_talk_rounded,
                  color: isEmergency
                      ? const Color(0xFFFF4B4B)
                      : const Color(0xFF00D26A),
                  size: 24,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    dialogTitle,
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  dialogSubtitle,
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF64748B)
                        : const Color(0xFF8E9BAE),
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFEFF6FF)
                        : const Color(0xFF071424),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: primaryBlue.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.lock_rounded, color: primaryBlue, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Powered by Exotel Masked Calling (100% Private)',
                          style: TextStyle(
                            color: primaryBlue,
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: controller,
                  keyboardType: TextInputType.phone,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Enter your 10-digit phone number',
                    hintStyle: TextStyle(
                      color: isLight
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF4A5C75),
                      fontSize: 13,
                    ),
                    prefixIcon: Icon(
                      Icons.phone_rounded,
                      color: isLight
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF4A5C75),
                      size: 18,
                    ),
                    filled: true,
                    fillColor: isLight
                        ? const Color(0xFFF8FAFC)
                        : const Color(0xFF101726),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isLight
                            ? const Color(0xFFE2E8F0)
                            : const Color(0xFF1C273C),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: primaryBlue),
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: isCalling ? null : () => Navigator.pop(ctx),
                child: Text(
                  'Cancel',
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF64748B)
                        : const Color(0xFF8E9BAE),
                  ),
                ),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: isEmergency
                      ? const Color(0xFFFF4B4B)
                      : primaryBlue,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                ),
                onPressed: isCalling
                    ? null
                    : () async {
                        final phone = controller.text.trim();
                        if (phone.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Please enter your phone number'),
                            ),
                          );
                          return;
                        }
                        setStateBuilder(() => isCalling = true);
                        try {
                          final response = await http.post(
                            ApiConfig.uri('/scan/${widget.tagId}/call'),
                            headers: {'Content-Type': 'application/json'},
                            body: jsonEncode({
                              'callerPhone': phone,
                              'targetType': targetType,
                            }),
                          );
                          if (!ctx.mounted || !mounted) return;
                          if (response.statusCode == 200) {
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                backgroundColor: isLight
                                    ? const Color(0xFF0F172A)
                                    : const Color(0xFF102A1E),
                                behavior: SnackBarBehavior.floating,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                content: Row(
                                  children: const [
                                    Icon(
                                      Icons.check_circle_rounded,
                                      color: Color(0xFF00D26A),
                                    ),
                                    SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        'Call connecting! Exotel will dial your phone shortly to connect securely.',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          } else {
                            setStateBuilder(() => isCalling = false);
                            final errData = jsonDecode(response.body);
                            final msg =
                                errData['message'] ??
                                'Failed to initiate masked call';
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                backgroundColor: Colors.redAccent,
                                content: Text(msg),
                              ),
                            );
                          }
                        } catch (e) {
                          if (!ctx.mounted || !mounted) return;
                          setStateBuilder(() => isCalling = false);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Network error. Please try again.'),
                            ),
                          );
                        }
                      },
                child: isCalling
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : Text(
                        isEmergency
                            ? 'Call Emergency Contact'
                            : 'Call Owner Now',
                        style: TextStyle(
                          color: isEmergency
                              ? Colors.white
                              : (isLight ? Colors.white : Colors.black),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _showMessageDialog({String? initialMessage}) async {
    final msgController = TextEditingController(text: initialMessage ?? '');
    final phoneController = TextEditingController();
    bool isSending = false;
    final isLight = AppTheme.isLight;
    final primaryBlue = isLight
        ? AppTheme.primaryBlue
        : const Color(0xFF00C2FF);

    final quickIssues = [
      'Vehicle is blocking the way',
      'Headlights/lights are left ON',
      'Window is open',
      'Parked in No-Parking zone',
      'Please move your vehicle',
    ];

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A26),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(context).viewInsets.bottom + 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isLight
                          ? const Color(0xFFCBD5E1)
                          : const Color(0xFF2B3A51),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Icon(
                      Icons.mark_chat_unread_rounded,
                      color: primaryBlue,
                      size: 22,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Message Vehicle Owner',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'The owner will receive a secure alert notification on their CarQConnect app.',
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF64748B)
                        : const Color(0xFF8E9BAE),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Quick Alerts:',
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF334155)
                        : const Color(0xFFB0C4DE),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: quickIssues.map((issue) {
                    final isSelected = msgController.text == issue;
                    return InkWell(
                      onTap: () {
                        setModalState(() {
                          msgController.text = issue;
                        });
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? primaryBlue.withValues(
                                  alpha: isLight ? 0.15 : 0.2,
                                )
                              : (isLight
                                    ? const Color(0xFFF1F5F9)
                                    : const Color(0xFF142033)),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected
                                ? primaryBlue
                                : (isLight
                                      ? const Color(0xFFE2E8F0)
                                      : const Color(0xFF1C2C44)),
                          ),
                        ),
                        child: Text(
                          issue,
                          style: TextStyle(
                            color: isSelected
                                ? primaryBlue
                                : (isLight
                                      ? const Color(0xFF334155)
                                      : Colors.white70),
                            fontSize: 12,
                            fontWeight: isSelected
                                ? FontWeight.w600
                                : FontWeight.normal,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: msgController,
                  maxLines: 3,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Type your message or alert details...',
                    hintStyle: TextStyle(
                      color: isLight
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF4A5C75),
                      fontSize: 13,
                    ),
                    filled: true,
                    fillColor: isLight
                        ? const Color(0xFFF8FAFC)
                        : const Color(0xFF101726),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isLight
                            ? const Color(0xFFE2E8F0)
                            : const Color(0xFF1C2C44),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: primaryBlue),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Your phone number (optional)',
                    hintStyle: TextStyle(
                      color: isLight
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF4A5C75),
                      fontSize: 13,
                    ),
                    prefixIcon: Icon(
                      Icons.phone_rounded,
                      color: isLight
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF4A5C75),
                      size: 18,
                    ),
                    filled: true,
                    fillColor: isLight
                        ? const Color(0xFFF8FAFC)
                        : const Color(0xFF101726),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isLight
                            ? const Color(0xFFE2E8F0)
                            : const Color(0xFF1C2C44),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: primaryBlue),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryBlue,
                      foregroundColor: isLight ? Colors.white : Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: isSending
                        ? null
                        : () async {
                            final txt = msgController.text.trim();
                            if (txt.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Please enter or select a message',
                                  ),
                                ),
                              );
                              return;
                            }
                            setModalState(() => isSending = true);
                            try {
                              final res = await http.post(
                                ApiConfig.uri('/scan/${widget.tagId}/message'),
                                headers: {'Content-Type': 'application/json'},
                                body: jsonEncode({
                                  'message': txt,
                                  'callerPhone': phoneController.text.trim(),
                                }),
                              );
                              if (!ctx.mounted || !mounted) return;
                              Navigator.pop(ctx);
                              if (res.statusCode == 200) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    backgroundColor: isLight
                                        ? const Color(0xFF0F172A)
                                        : const Color(0xFF102A1E),
                                    behavior: SnackBarBehavior.floating,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    content: Row(
                                      children: const [
                                        Icon(
                                          Icons.check_circle_rounded,
                                          color: Color(0xFF00D26A),
                                        ),
                                        SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            'Alert message sent to vehicle owner securely!',
                                            style: TextStyle(
                                              color: Colors.white,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Failed to send message.'),
                                  ),
                                );
                              }
                            } catch (_) {
                              if (!ctx.mounted || !mounted) return;
                              Navigator.pop(ctx);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Message sent successfully'),
                                ),
                              );
                            }
                          },
                    child: isSending
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : Text(
                            'Send Alert Now',
                            style: TextStyle(
                              color: isLight ? Colors.white : Colors.black,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _showSupportDialog() async {
    final supportPhone = _data?['supportPhone'] ?? '09513886363';
    final isLight = AppTheme.isLight;
    final primaryBlue = isLight
        ? AppTheme.primaryBlue
        : const Color(0xFF00C2FF);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A26),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Icon(Icons.headset_mic_rounded, color: primaryBlue, size: 24),
            const SizedBox(width: 10),
            Text(
              'CarQConnect Support',
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Our 24x7 customer assistance and roadside helpline is available to help you immediately.',
              style: TextStyle(
                color: isLight
                    ? const Color(0xFF64748B)
                    : const Color(0xFF8E9BAE),
                fontSize: 14,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isLight
                    ? const Color(0xFFF8FAFC)
                    : const Color(0xFF142033),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isLight
                      ? const Color(0xFFE2E8F0)
                      : const Color(0xFF1C2C44),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.phone_in_talk_rounded,
                    color: Color(0xFF00D26A),
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Helpline Number',
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF64748B)
                              : const Color(0xFF8E9BAE),
                          fontSize: 11,
                        ),
                      ),
                      Text(
                        supportPhone,
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF0F172A)
                              : Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'Close',
              style: TextStyle(
                color: isLight
                    ? const Color(0xFF64748B)
                    : const Color(0xFF8E9BAE),
              ),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryBlue,
              foregroundColor: isLight ? Colors.white : Colors.black,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _launchUrl('tel:$supportPhone');
            },
            child: const Text(
              'Call Helpline',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Future<void> refreshOnRouteReturn() => _fetchTagInfo();

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        if (_isLoading) {
          return Container(
            decoration: BoxDecoration(
              gradient: isLight ? AppTheme.bgGradient : null,
              color: isLight ? null : const Color(0xFF090E17),
            ),
            child: Scaffold(
              backgroundColor: Colors.transparent,
              body: Center(
                child: AppLoadingSpinner(
                  size: 80,
                  primaryColor: isLight
                      ? AppTheme.primaryBlue
                      : const Color(0xFF00C2FF),
                ),
              ),
            ),
          );
        }

        if (_error != null) {
          return Container(
            decoration: BoxDecoration(
              gradient: isLight ? AppTheme.bgGradient : null,
              color: isLight ? null : const Color(0xFF090E17),
            ),
            child: Scaffold(
              backgroundColor: Colors.transparent,
              body: Center(
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.red, fontSize: 18),
                ),
              ),
            ),
          );
        }

        final vehicle = _data?['vehicle'];
        final callEnabled = _data?['callEnabled'] ?? true;
        final messageEnabled = _data?['messageEnabled'] ?? true;
        final emergencyContactEnabled = _data?['emergencyContactEnabled'] ?? true;
        final bloodGroup = _data?['bloodGroup'];
        final primaryBlue = isLight
            ? AppTheme.primaryBlue
            : const Color(0xFF00C2FF);

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
              title: Text(
                'Vehicle Contact',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              iconTheme: IconThemeData(color: AppTheme.textPrimary),
            ),
            body: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Column(
                children: [
                  // Vehicle Image & Name Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      vertical: 28,
                      horizontal: 16,
                    ),
                    decoration: BoxDecoration(
                      color: isLight ? Colors.white : const Color(0xFF101726),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: isLight
                            ? const Color(0xFFE2E8F0)
                            : const Color(0xFF1C273C),
                      ),
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: primaryBlue.withValues(
                              alpha: isLight ? 0.08 : 0.12,
                            ),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.directions_car_rounded,
                            size: 42,
                            color: primaryBlue,
                          ),
                        ),
                        const SizedBox(height: 18),
                        Text(
                          vehicle?['name'] ?? 'Unknown Vehicle',
                          style: TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _maskRegistration(vehicle?['regNumber'] ?? 'Unknown'),
                          style: TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 16,
                            letterSpacing: 1.2,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (bloodGroup != null && bloodGroup.toString().isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFF4B4B).withValues(alpha: isLight ? 0.1 : 0.18),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: const Color(0xFFFF4B4B).withValues(alpha: 0.35),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.water_drop_rounded, size: 14, color: Color(0xFFFF4B4B)),
                                const SizedBox(width: 5),
                                Text(
                                  'Blood Group: $bloodGroup',
                                  style: const TextStyle(
                                    color: Color(0xFFFF4B4B),
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Privacy Info Banner
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isLight
                          ? const Color(0xFFEFF6FF)
                          : const Color(0xFF0A1E3F),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: primaryBlue.withValues(alpha: 0.2),
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: primaryBlue,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.security,
                            color: isLight ? Colors.white : Colors.black,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Text(
                            'This QR connects you to the vehicle owner without revealing any personal contact numbers.',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF1E3A8A)
                                  : const Color(0xFFB0C4DE),
                              fontSize: 13,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 1. Prominent Phone Call & Message Actions Row
                  if (callEnabled || messageEnabled) ...[
                    Row(
                      children: [
                        // Phone Icon & Call Action Button
                        if (callEnabled)
                          Expanded(
                            child: InkWell(
                              onTap: () =>
                                  _showMaskedCallDialog(targetType: 'owner'),
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 18),
                                decoration: BoxDecoration(
                                  color: isLight
                                      ? const Color(0xFFF0FDF4)
                                      : const Color(0xFF0D251C),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: const Color(0xFF00D26A)
                                        .withValues(alpha: isLight ? 0.3 : 0.35),
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    const CircleAvatar(
                                      radius: 22,
                                      backgroundColor: Color(0xFF00D26A),
                                      child: Icon(
                                        Icons.call_rounded,
                                        color: Colors.black,
                                        size: 22,
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      'Call Owner',
                                      style: TextStyle(
                                        color: isLight
                                            ? const Color(0xFF0F172A)
                                            : Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    const Text(
                                      'Masked Calling',
                                      style: TextStyle(
                                        color: Color(0xFF00D26A),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        if (callEnabled && messageEnabled)
                          const SizedBox(width: 14),

                        // Message Icon & Alert Action Button
                        if (messageEnabled)
                          Expanded(
                            child: InkWell(
                              onTap: () => _showMessageDialog(),
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 18),
                                decoration: BoxDecoration(
                                  color: isLight
                                      ? const Color(0xFFEFF6FF)
                                      : const Color(0xFF0A223B),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: primaryBlue.withValues(alpha: 0.35),
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    CircleAvatar(
                                      radius: 22,
                                      backgroundColor: primaryBlue,
                                      child: Icon(
                                        Icons.chat_bubble_rounded,
                                        color: isLight
                                            ? Colors.white
                                            : Colors.black,
                                        size: 20,
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      'Message',
                                      style: TextStyle(
                                        color: isLight
                                            ? const Color(0xFF0F172A)
                                            : Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      'Instant Alert',
                                      style: TextStyle(
                                        color: primaryBlue,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 2. Emergency Contact Button
                  if (emergencyContactEnabled) ...[
                    _buildListTile(
                      icon: Icons.emergency_rounded,
                      title: 'Emergency Contact',
                      subtitle:
                          'Connect securely with emergency contact (Masked Call)',
                      backgroundColor: isLight
                          ? const Color(0xFFFEF2F2)
                          : const Color(0xFF2E151B),
                      iconColor: const Color(0xFFFF4B4B),
                      textColor: isLight
                          ? const Color(0xFF991B1B)
                          : const Color(0xFFFFC0C0),
                      onTap: () => _showMaskedCallDialog(targetType: 'emergency'),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // 3. Report Issue Button
                  _buildListTile(
                    icon: Icons.warning_rounded,
                    title: 'Report Issue',
                    subtitle: 'Parking block, open window, headlights on',
                    backgroundColor: isLight
                        ? const Color(0xFFFFFBEB)
                        : const Color(0xFF2A1C16),
                    iconColor: const Color(0xFFFF8C00),
                    textColor: isLight
                        ? const Color(0xFF92400E)
                        : const Color(0xFFFFDAB9),
                    onTap: () => _showMessageDialog(),
                  ),

                  // 4. CarQConnect Support Button
                  _buildListTile(
                    icon: Icons.headset_mic_rounded,
                    title: 'CarQConnect Support',
                    subtitle: '24x7 Customer Helpline & Roadside Support',
                    backgroundColor: isLight
                        ? const Color(0xFFF0F9FF)
                        : const Color(0xFF0F1E33),
                    iconColor: primaryBlue,
                    textColor: isLight
                        ? const Color(0xFF075985)
                        : const Color(0xFFB0C4DE),
                    onTap: () => _showSupportDialog(),
                  ),

                  const SizedBox(height: 36),

                  // Footer
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Expanded(
                        child: Divider(
                          color: isLight
                              ? const Color(0xFFCBD5E1)
                              : const Color(0xFF1C273C),
                          thickness: 1,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Text(
                          'Protected by CarQConnect',
                          style: TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Divider(
                          color: isLight
                              ? const Color(0xFFCBD5E1)
                              : const Color(0xFF1C273C),
                          thickness: 1,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildListTile({
    required IconData icon,
    required String title,
    String? subtitle,
    required Color backgroundColor,
    required Color iconColor,
    required Color textColor,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: iconColor.withValues(alpha: 0.2)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.18),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: iconColor, size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: textColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 3),
                      Text(
                        subtitle,
                        style: TextStyle(
                          color: textColor.withValues(alpha: 0.7),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Icon(
                Icons.arrow_forward_ios,
                color: textColor.withValues(alpha: 0.4),
                size: 14,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
