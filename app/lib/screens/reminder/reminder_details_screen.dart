import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../globals.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../utils/app_icons.dart';
import 'reminder_models.dart';
import 'set_reminder_screen.dart';
import '../../utils/api_config.dart';
import '../../widgets/animated_back_arrow.dart';

class ReminderDetailsScreen extends StatefulWidget {
  final ReminderItem reminder;

  const ReminderDetailsScreen({
    super.key,
    required this.reminder,
  });

  @override
  State<ReminderDetailsScreen> createState() => _ReminderDetailsScreenState();
}

class _ReminderDetailsScreenState extends State<ReminderDetailsScreen> {
  late ReminderItem _current;

  @override
  void initState() {
    super.initState();
    _current = widget.reminder;
  }

  void _markAsComplete() async {
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
      final response = await http.patch(
        ApiConfig.uri('/reminders/${_current.id}'),
        headers: {
          'Authorization': 'Bearer ${Globals.accessToken}',
          'Content-Type': 'application/json',
        },
        body: '{"isActive": false}',
      );
      
      if (!mounted) return;
      Navigator.pop(context); // hide loading

      if (response.statusCode == 200) {
        setState(() {
          _current = _current.copyWith(
            isCompleted: true,
            statusCategory: 'Completed',
            dueStatus: 'Completed',
            statusColor: const Color(0xFF00E676),
          );
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: isLight ? const Color(0xFF0F172A) : const Color(0xFF101726),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E293B)),
            ),
            content: const Row(
              children: [
                Icon(Icons.check_circle_rounded, color: Color(0xFF00E676), size: 20),
                SizedBox(width: 10),
                Text(
                  'Reminder marked as complete!',
                  style: TextStyle(color: Colors.white),
                ),
              ],
            ),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to update')));
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Network error')));
    }
  }

  void _editReminder() async {
    final typeInfo = kReminderTypes.firstWhere(
      (t) => t.title.replaceAll('\n', ' ') == _current.type,
      orElse: () => kReminderTypes.first,
    );

    final res = await Navigator.push<ReminderItem>(
      context,
      MaterialPageRoute(
        builder: (context) => SetReminderScreen(typeInfo: typeInfo),
      ),
    );

    if (res != null && mounted) {
      setState(() {
        _current = res.copyWith(id: _current.id);
      });
    }
  }

  void _deleteReminder() {
    final isLight = AppTheme.isLightNotifier.value;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
        title: Text('Delete Reminder', style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white)),
        content: Text(
          'Are you sure you want to delete "${_current.title}"?',
          style: TextStyle(color: isLight ? const Color(0xFF64748B) : const Color(0xFFCBD5E1)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE))),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx); // pop dialog
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
                final response = await http.delete(
                  ApiConfig.uri('/reminders/${_current.id}'),
                  headers: {'Authorization': 'Bearer ${Globals.accessToken}'},
                );
                if (!mounted) return;
                Navigator.pop(context); // pop loading
                if (response.statusCode == 200) {
                  Navigator.pop(context, _current.copyWith(id: 'DELETED_${_current.id}'));
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete')));
                }
              } catch (e) {
                if (!mounted) return;
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Network error')));
              }
            },
            child: const Text('Delete', style: TextStyle(color: Color(0xFFFF5252))),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final notifsText = _current.notifications.isNotEmpty
        ? _current.notifications.join(', ')
        : 'No alerts scheduled';

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
              leading: AnimatedBackArrowButton(onTap: () => Navigator.pop(context, _current)),
              title: Text(
                'Reminder Details',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                ),
              ),
              actions: [
                IconButton(
                  icon: Icon(
                    Icons.edit_outlined,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    size: 22,
                  ),
                  onPressed: _editReminder,
                ),
              ],
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

                          // Vehicle Selector Card
                          VehicleSelectorCard(
                            vehicleName: Globals.vehicleModel,
                            vehicleNumber: Globals.vehicleRegistration,
                          ),

                          const SizedBox(height: 18),

                          // Large Status Card
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF141C2B),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A3E),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(
                                        color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF1B283E),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Center(
                                        child: _current.svgAsset != null
                                            ? AppIcons.svg(
                                                _current.svgAsset!,
                                                color: const Color(0xFF0066FF),
                                                width: 22,
                                                height: 22,
                                              )
                                            : Icon(
                                                _current.icon,
                                                color: const Color(0xFF0066FF),
                                                size: 22,
                                              ),
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _current.type,
                                          style: TextStyle(
                                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                            fontSize: 15.5,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 10, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: _current.isCompleted
                                                ? (isLight ? const Color(0xFFDCFCE7) : const Color(0xFF132D24))
                                                : (isLight ? const Color(0xFFDCFCE7) : const Color(0xFF1E3A34)),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: Text(
                                            _current.isCompleted
                                                ? 'Completed'
                                                : 'Upcoming',
                                            style: TextStyle(
                                              color: _current.isCompleted
                                                  ? const Color(0xFF16A34A)
                                                  : const Color(0xFF16A34A),
                                              fontSize: 11.5,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 24),

                                // Large Date Header
                                Text(
                                  _current.dueDate,
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    fontSize: 34,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _current.dueStatus,
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 24),

                          // Specifications Table
                          _buildDetailRow(
                            label: 'Repeat',
                            value: _current.repeat,
                            isLight: isLight,
                          ),

                          Divider(
                            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1A2638),
                            height: 28,
                            thickness: 1,
                          ),

                          _buildDetailRow(
                            label: 'Notifications',
                            value: notifsText,
                            isLight: isLight,
                          ),

                          Divider(
                            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1A2638),
                            height: 28,
                            thickness: 1,
                          ),

                          _buildDetailRow(
                            label: 'Notes',
                            value: _current.notes,
                            isLight: isLight,
                          ),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Buttons
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
                    decoration: const BoxDecoration(color: Colors.transparent),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Button 1: Mark as Complete
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton.icon(
                            onPressed: _current.isCompleted ? null : _markAsComplete,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0066FF),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                            ),
                            icon: const Icon(Icons.check_circle_outline, color: Colors.white, size: 20),
                            label: Text(
                              _current.isCompleted
                                  ? 'Completed'
                                  : 'Mark as Complete',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.2,
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 12),

                        // Button 2: Edit Reminder
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: OutlinedButton(
                            onPressed: _editReminder,
                            style: OutlinedButton.styleFrom(
                              backgroundColor: isLight ? Colors.white : const Color(0xFF0B1321),
                              side: BorderSide(
                                color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1E293B),
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                            ),
                            child: Text(
                              'Edit Reminder',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 10),

                        // Button 3: Delete Reminder (Red text button)
                        TextButton.icon(
                          onPressed: _deleteReminder,
                          icon: AppIcons.svg(
                            AppIcons.delete,
                            color: const Color(0xFFFF5252),
                            width: 18,
                            height: 18,
                          ),
                          label: const Text(
                            'Delete Reminder',
                            style: TextStyle(
                              color: Color(0xFFFF5252),
                              fontSize: 14.5,
                              fontWeight: FontWeight.w600,
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
        );
      },
    );
  }

  Widget _buildDetailRow({
    required String label,
    required String value,
    required bool isLight,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
            fontSize: 14,
          ),
        ),
        const SizedBox(width: 16),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}
