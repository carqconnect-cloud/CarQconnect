import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../globals.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../utils/app_icons.dart';
import 'reminder_models.dart';
import 'reminder_added_screen.dart';
import '../../utils/api_config.dart';
import '../../widgets/animated_back_arrow.dart';

class SetReminderScreen extends StatefulWidget {
  final ReminderTypeInfo? typeInfo;

  const SetReminderScreen({super.key, this.typeInfo});

  @override
  State<SetReminderScreen> createState() => _SetReminderScreenState();
}

class _SetReminderScreenState extends State<SetReminderScreen> {
  DateTime _dueDate = DateTime.now().add(const Duration(days: 1));
  String _selectedRepeat = 'Does not repeat';

  bool _notify7Days = true;
  bool _notify3Days = true;
  bool _notify1Day = false;
  bool _notifyOnDueDate = false;

  late TextEditingController _notesController;

  final List<String> _repeatOptions = [
    'Does not repeat',
    'Every month',
    'Every 3 months',
    'Every 6 months',
    'Every year',
  ];

  @override
  void initState() {
    super.initState();
    _notesController = TextEditingController();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  String _formatDate(DateTime d) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return '${d.day} ${months[d.month - 1]} ${d.year}';
  }

  Future<void> _pickDueDate() async {
    final isLight = AppTheme.isLightNotifier.value;
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate,
      firstDate: DateTime(2024),
      lastDate: DateTime(2035),
      builder: (context, child) {
        return Theme(
          data: isLight
              ? ThemeData.light().copyWith(
                  colorScheme: const ColorScheme.light(
                    primary: Color(0xFF0066FF),
                    onPrimary: Colors.white,
                    surface: Colors.white,
                    onSurface: Color(0xFF0F172A),
                  ),
                )
              : ThemeData.dark().copyWith(
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
        _dueDate = picked;
      });
    }
  }

  void _showRepeatPicker() {
    final isLight = AppTheme.isLightNotifier.value;
    showModalBottomSheet(
      context: context,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0D1424),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'Repeat Frequency',
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 14),
            ..._repeatOptions.map((opt) {
              final isSelected = opt == _selectedRepeat;
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  isSelected
                      ? Icons.radio_button_checked_rounded
                      : Icons.radio_button_off_rounded,
                  color: isSelected
                      ? const Color(0xFF0066FF)
                      : (isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                ),
                title: Text(
                  opt,
                  style: TextStyle(
                    color: isSelected
                        ? (isLight ? const Color(0xFF0066FF) : Colors.white)
                        : (isLight ? const Color(0xFF334155) : const Color(0xFFCBD5E1)),
                    fontWeight:
                        isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
                onTap: () {
                  setState(() {
                    _selectedRepeat = opt;
                  });
                  Navigator.pop(ctx);
                },
              );
            }),
          ],
        ),
      ),
    );
  }

  void _onSaveReminder() async {
    final type = widget.typeInfo ?? kReminderTypes.first;
    final isLight = AppTheme.isLightNotifier.value;
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: AppLoadingSpinner(
          size: 70,
          primaryColor: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
        ),
      ),
    );

    try {
      final response = await http.post(
        ApiConfig.uri('/reminders'),
        headers: {
          'Authorization': 'Bearer ${Globals.accessToken}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'title': type.title.replaceAll('\n', ' '),
          'description': _notesController.text.trim(),
          'type': type.title.replaceAll('\n', ' '),
          'date': _dueDate.toUtc().toIso8601String(),
        }),
      );

      if (!mounted) return;
      Navigator.pop(context); // Hide loading

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final reminder = ReminderItem.fromJson(data['data']);
        
        if (!mounted) return;
        final res = await Navigator.push<ReminderItem>(
          context,
          MaterialPageRoute(
            builder: (context) => ReminderAddedScreen(reminder: reminder),
          ),
        );

        if (!mounted) return;
        if (res != null) {
          Navigator.of(context).pop(res);
        }
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to save reminder')));
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Network error')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = widget.typeInfo ?? kReminderTypes.first;

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            gradient: AppTheme.bgGradient,
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
                'Set Reminder',
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
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 8),

                          // Top Selected Type Card
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF14243B),
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: Center(
                                    child: type.svgAsset != null
                                        ? AppIcons.svg(
                                            type.svgAsset!,
                                            color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                                            width: 24,
                                            height: 24,
                                          )
                                        : Icon(
                                            type.icon,
                                            color: const Color(0xFF0066FF),
                                            size: 24,
                                          ),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        type.title.replaceAll('\n', ' '),
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                          fontSize: 15.5,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        type.subtitle,
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                          fontSize: 12.5,
                                          height: 1.35,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 22),

                          // Field 1: Due Date
                          Text(
                            'Due Date',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF475569) : const Color(0xFFCBD5E1),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          InkWell(
                            onTap: _pickDueDate,
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 14),
                              decoration: BoxDecoration(
                                color: isLight ? Colors.white : const Color(0xFF101726),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                                ),
                                boxShadow: isLight ? AppTheme.cardShadow : null,
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.calendar_month_outlined,
                                    color: Color(0xFF0066FF),
                                    size: 20,
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    _formatDate(_dueDate),
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                          const SizedBox(height: 18),

                          // Field 2: Repeat
                          Text(
                            'Repeat',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF475569) : const Color(0xFFCBD5E1),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          InkWell(
                            onTap: _showRepeatPicker,
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 14),
                              decoration: BoxDecoration(
                                color: isLight ? Colors.white : const Color(0xFF101726),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                                ),
                                boxShadow: isLight ? AppTheme.cardShadow : null,
                              ),
                              child: Row(
                                children: [
                                  AppIcons.svg(
                                    AppIcons.refresh,
                                    color: const Color(0xFF0066FF),
                                    width: 20,
                                    height: 20,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      _selectedRepeat,
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  Icon(
                                    Icons.keyboard_arrow_down_rounded,
                                    color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF8E9BAE),
                                    size: 22,
                                  ),
                                ],
                              ),
                            ),
                          ),

                          const SizedBox(height: 22),

                          // Section: Notify Me (Checkboxes)
                          Text(
                            'Notify Me',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF475569) : const Color(0xFFCBD5E1),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 10),

                          _buildCheckboxTile(
                            label: '7 days before',
                            value: _notify7Days,
                            isLight: isLight,
                            onChanged: (val) => setState(() => _notify7Days = val),
                          ),
                          _buildCheckboxTile(
                            label: '3 days before',
                            value: _notify3Days,
                            isLight: isLight,
                            onChanged: (val) => setState(() => _notify3Days = val),
                          ),
                          _buildCheckboxTile(
                            label: '1 day before',
                            value: _notify1Day,
                            isLight: isLight,
                            onChanged: (val) => setState(() => _notify1Day = val),
                          ),
                          _buildCheckboxTile(
                            label: 'On due date',
                            value: _notifyOnDueDate,
                            isLight: isLight,
                            onChanged: (val) =>
                                setState(() => _notifyOnDueDate = val),
                          ),

                          const SizedBox(height: 18),

                          // Field 3: Add Notes (Optional)
                          Text(
                            'Add Notes (Optional)',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF475569) : const Color(0xFFCBD5E1),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: TextField(
                              controller: _notesController,
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 14.5,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Add some notes...',
                                hintStyle: TextStyle(
                                  color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                  fontSize: 14,
                                ),
                                border: InputBorder.none,
                              ),
                            ),
                          ),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Save Reminder Button
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
                    decoration: const BoxDecoration(color: Colors.transparent),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _onSaveReminder,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0066FF),
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
                              'Save Reminder',
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

  Widget _buildCheckboxTile({
    required String label,
    required bool value,
    required bool isLight,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: () => onChanged(!value),
        behavior: HitTestBehavior.opaque,
        child: Row(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: value
                    ? const Color(0xFF0066FF)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: value
                      ? const Color(0xFF0066FF)
                      : (isLight ? const Color(0xFFCBD5E1) : const Color(0xFF334155)),
                  width: 1.8,
                ),
              ),
              child: value
                  ? const Center(
                      child: Icon(
                        Icons.check_rounded,
                        color: Colors.white,
                        size: 16,
                        weight: 700,
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 14.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
