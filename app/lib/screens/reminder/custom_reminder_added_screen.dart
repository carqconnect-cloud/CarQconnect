import 'package:flutter/material.dart';
import '../../globals.dart';
import '../../theme/app_theme.dart';
import 'reminder_models.dart';
import '../../widgets/animated_back_arrow.dart';

class CustomReminderAddedScreen extends StatelessWidget {
  final ReminderItem reminder;
  final String vehicleName;
  final String vehicleNumber;

  const CustomReminderAddedScreen({
    super.key,
    required this.reminder,
    this.vehicleName = '',
    this.vehicleNumber = '',
  });

  String _formatNotifications(List<String> notifs) {
    if (notifs.isEmpty) {
      return '7 days, 3 days,\non due date';
    }
    final clean = notifs.map((n) {
      return n.replaceAll(' before', '');
    }).toList();

    if (clean.length > 2) {
      final firstPart = clean.sublist(0, 2).join(', ');
      final restPart = clean.sublist(2).join(', ');
      return '$firstPart,\n$restPart';
    }
    return clean.join(', ');
  }

  @override
  Widget build(BuildContext context) {
    final notifsFormatted = _formatNotifications(reminder.notifications);

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
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        children: [
                          const SizedBox(height: 10),

                          // 3D Calendar + Bell + Glowing Green Checkmark Illustration
                          const Center(
                            child: ReminderAddedCelebrationIllustration(),
                          ),

                          const SizedBox(height: 20),

                          // Title & Subtitle
                          Text(
                            'Custom Reminder Added!',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.2,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            "You'll be notified before\nthe due date.",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                              fontSize: 14,
                              height: 1.35,
                            ),
                          ),

                          const SizedBox(height: 28),

                          // Reminder Details Card
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(18),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Header: Reminder Details + Edit Action
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Reminder Details',
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    InkWell(
                                      onTap: () => Navigator.pop(context),
                                      borderRadius: BorderRadius.circular(6),
                                      child: const Padding(
                                        padding: EdgeInsets.symmetric(
                                            horizontal: 6, vertical: 2),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              Icons.edit_outlined,
                                              color: Color(0xFF0066FF),
                                              size: 16,
                                            ),
                                            SizedBox(width: 4),
                                            Text(
                                              'Edit',
                                              style: TextStyle(
                                                color: Color(0xFF0066FF),
                                                fontSize: 14,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),

                                Divider(
                                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1A2638),
                                  height: 26,
                                  thickness: 1,
                                ),

                                // Row 1: Vehicle
                                _buildDetailRow(
                                  label: 'Vehicle',
                                  isLight: isLight,
                                  valueWidget: Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        vehicleName.isNotEmpty ? vehicleName : Globals.vehicleModel,
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                          fontSize: 14,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        vehicleNumber.isNotEmpty ? vehicleNumber : Globals.vehicleRegistration,
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                          fontSize: 12.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                const SizedBox(height: 14),

                                // Row 2: Title
                                _buildDetailRow(
                                  label: 'Title',
                                  value: reminder.title,
                                  isLight: isLight,
                                ),

                                const SizedBox(height: 14),

                                // Row 3: Category
                                _buildDetailRow(
                                  label: 'Category',
                                  value: reminder.type,
                                  isLight: isLight,
                                ),

                                const SizedBox(height: 14),

                                // Row 4: Date
                                _buildDetailRow(
                                  label: 'Date',
                                  value: reminder.dueDate,
                                  isLight: isLight,
                                ),

                                const SizedBox(height: 14),

                                // Row 5: Repeat
                                _buildDetailRow(
                                  label: 'Repeat',
                                  value: reminder.repeat,
                                  isLight: isLight,
                                ),

                                const SizedBox(height: 14),

                                // Row 6: Notifications
                                _buildDetailRow(
                                  label: 'Notifications',
                                  value: notifsFormatted,
                                  isLight: isLight,
                                  textAlign: TextAlign.right,
                                ),

                                const SizedBox(height: 14),

                                // Row 7: Notes
                                _buildDetailRow(
                                  label: 'Notes',
                                  value: reminder.notes,
                                  isLight: isLight,
                                  textAlign: TextAlign.right,
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Save Reminder Button
                  Container(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                    decoration: const BoxDecoration(
                      color: Colors.transparent,
                    ),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pop(context, reminder);
                        },
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

  Widget _buildDetailRow({
    required String label,
    required bool isLight,
    String? value,
    Widget? valueWidget,
    TextAlign textAlign = TextAlign.right,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
          child: valueWidget ??
              Text(
                value ?? '',
                textAlign: textAlign,
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  height: 1.35,
                ),
              ),
        ),
      ],
    );
  }
}
