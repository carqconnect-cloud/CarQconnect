import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../globals.dart';
import '../../utils/api_config.dart';
import '../../utils/app_icons.dart';
import 'ticket_submitted_screen.dart';
import '../../widgets/animated_back_arrow.dart';

/// Screen 3: Raise Support Ticket Screen
class RaiseTicketScreen extends StatefulWidget {
  const RaiseTicketScreen({super.key});

  @override
  State<RaiseTicketScreen> createState() => _RaiseTicketScreenState();
}

class _RaiseTicketScreenState extends State<RaiseTicketScreen> {
  final TextEditingController _subjectController = TextEditingController();
  final TextEditingController _descController = TextEditingController();

  String? _selectedCategory;
  bool _hasScreenshot = false;
  bool _isSubmitting = false;

  final List<String> _categories = [
    'Fastag & Toll Payments',
    'Vehicle GPS & Tracking',
    'Telemetry & OBD Diagnostics',
    'Zap Wallet & Refunds',
    'Insurance & Service Booking',
    'App Account & Authentication',
    'Hardware & Device Replacement',
    'General Inquiry',
  ];

  @override
  void dispose() {
    _subjectController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _showCategoryPicker() {
    final isLight = AppTheme.isLightNotifier.value;
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
                  color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  'Select Issue Category',
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
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: _categories.length,
                  itemBuilder: (context, index) {
                    final cat = _categories[index];
                    final isSelected = cat == _selectedCategory;
                    return ListTile(
                      title: Text(
                        cat,
                        style: TextStyle(
                          color: isSelected
                              ? const Color(0xFF0066FF)
                              : (isLight ? const Color(0xFF0F172A) : Colors.white),
                          fontWeight:
                              isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                      trailing: isSelected
                          ? const Icon(
                              Icons.check_circle_rounded,
                              color: Color(0xFF0066FF),
                              size: 20,
                            )
                          : null,
                      onTap: () {
                        setState(() {
                          _selectedCategory = cat;
                        });
                        Navigator.pop(context);
                      },
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  Future<void> _submitTicket() async {
    if (_isSubmitting) return;

    if (_selectedCategory == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF2A1215),
          content: Text(
            'Please select an issue category',
            style: TextStyle(color: Color(0xFFFF5252)),
          ),
        ),
      );
      return;
    }

    if (_subjectController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF2A1215),
          content: Text(
            'Please provide a subject',
            style: TextStyle(color: Color(0xFFFF5252)),
          ),
        ),
      );
      return;
    }

    if (_descController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF2A1215),
          content: Text(
            'Please describe your issue',
            style: TextStyle(color: Color(0xFFFF5252)),
          ),
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    String? generatedTicketId;
    final subject = _subjectController.text.trim();
    final description = _descController.text.trim();

    final payload = {
      'category': _selectedCategory,
      'subject': subject,
      'description': description,
      'hasScreenshot': _hasScreenshot,
      'screenshotName': _hasScreenshot ? 'error_log.png' : null,
      'priority': 'MEDIUM',
      'email': Globals.email,
      'phone': Globals.phone,
      'name': ('${Globals.firstName} ${Globals.lastName}').trim().isNotEmpty
          ? ('${Globals.firstName} ${Globals.lastName}').trim()
          : (Globals.email.isNotEmpty ? Globals.email : 'App User'),
    };

    final headers = {
      'Content-Type': 'application/json',
      if (Globals.accessToken.isNotEmpty)
        'Authorization': 'Bearer ${Globals.accessToken}',
    };

    for (final baseUrl in ApiConfig.candidateBaseUrls) {
      try {
        final cleanBase = baseUrl.endsWith('/')
            ? baseUrl.substring(0, baseUrl.length - 1)
            : baseUrl;
        final res = await http
            .post(
              Uri.parse('$cleanBase/support-tickets'),
              headers: headers,
              body: jsonEncode(payload),
            )
            .timeout(const Duration(seconds: 4));

        if (res.statusCode == 200 || res.statusCode == 201) {
          final data = jsonDecode(res.body);
          if (data['data'] != null && data['data']['ticketId'] != null) {
            generatedTicketId = data['data']['ticketId'].toString();
          }
          break;
        }
      } catch (_) {}
    }

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    // Fallback if network was offline
    if (generatedTicketId == null || generatedTicketId.isEmpty) {
      final randomId = (100000 + DateTime.now().millisecond * 899).toString();
      generatedTicketId = '#FN$randomId';
    }

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => TicketSubmittedScreen(
          ticketId: generatedTicketId!,
          category: _selectedCategory,
          subject: _subjectController.text.trim(),
        ),
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
                'Raise Support Ticket',
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
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Field 1: Issue Category
                          _buildLabel('Issue Category', isLight),
                          const SizedBox(height: 8),
                          InkWell(
                            onTap: _showCategoryPicker,
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
                                      _selectedCategory ?? 'Select category',
                                      style: TextStyle(
                                        color: _selectedCategory == null
                                            ? (isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B))
                                            : (isLight ? const Color(0xFF0F172A) : Colors.white),
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                  Icon(
                                    Icons.unfold_more_rounded,
                                    color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF8E9BAE),
                                    size: 20,
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Field 2: Subject
                          _buildLabel('Subject', isLight),
                          const SizedBox(height: 8),
                          Container(
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
                              controller: _subjectController,
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 14.5,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Briefly describe your issue',
                                hintStyle: TextStyle(
                                  color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                  fontSize: 14,
                                ),
                                contentPadding:
                                    const EdgeInsets.symmetric(horizontal: 16),
                                border: InputBorder.none,
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Field 3: Description
                          _buildLabel('Description', isLight),
                          const SizedBox(height: 8),
                          Container(
                            height: 140,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF0F1728),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
                                width: 1,
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Column(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _descController,
                                    onChanged: (_) => setState(() {}),
                                    maxLength: 500,
                                    maxLines: null,
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                      fontSize: 14,
                                      height: 1.35,
                                    ),
                                    decoration: InputDecoration(
                                      hintText: 'Tell us more...',
                                      hintStyle: TextStyle(
                                        color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                        fontSize: 14,
                                      ),
                                      counterText: '',
                                      border: InputBorder.none,
                                      isDense: true,
                                      contentPadding: EdgeInsets.zero,
                                    ),
                                  ),
                                ),
                                Align(
                                  alignment: Alignment.bottomRight,
                                  child: Text(
                                    '${_descController.text.length}/500',
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                      fontSize: 11.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Field 4: Add Screenshot (Optional)
                          _buildLabel('Add Screenshot (Optional)', isLight),
                          const SizedBox(height: 8),
                          InkWell(
                            onTap: () {
                              setState(() {
                                _hasScreenshot = !_hasScreenshot;
                              });
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                                  content: Text(
                                    _hasScreenshot
                                        ? 'Screenshot attached: error_log.png'
                                        : 'Screenshot removed',
                                    style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white),
                                  ),
                                ),
                              );
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              width: double.infinity,
                              height: 56,
                              decoration: BoxDecoration(
                                color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF090F1C),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: _hasScreenshot
                                      ? const Color(0xFF0066FF)
                                      : (isLight ? const Color(0xFFBFDBFE) : const Color(0xFF1E2A44)),
                                  style: BorderStyle.solid,
                                  width: 1.2,
                                ),
                              ),
                              child: Center(
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    _hasScreenshot
                                        ? const Icon(
                                            Icons.check_circle_rounded,
                                            color: Color(0xFF0066FF),
                                            size: 18,
                                          )
                                        : AppIcons.svg(
                                            AppIcons.plus,
                                            color: const Color(0xFF0066FF),
                                            width: 16,
                                            height: 16,
                                          ),
                                    const SizedBox(width: 8),
                                    Text(
                                      _hasScreenshot
                                          ? 'error_log.png attached'
                                          : 'Upload',
                                      style: const TextStyle(
                                        color: Color(0xFF0066FF),
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                      ),
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

                  // Bottom Submit Button
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _isSubmitting ? null : _submitTicket,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0066FF),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFF0066FF).withValues(alpha: 0.6),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(30),
                          ),
                          elevation: 0,
                        ),
                        child: _isSubmitting
                            ? const AppLoadingSpinner(size: 22)
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    'Submit Ticket',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
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

  Widget _buildLabel(String text, bool isLight) {
    return Text(
      text,
      style: TextStyle(
        color: isLight ? const Color(0xFF0F172A) : Colors.white,
        fontSize: 13.5,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}
