import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_icons.dart';
import 'reminder_models.dart';
import 'reminder_details_screen.dart';
import '../../widgets/animated_back_arrow.dart';

class ReminderAddedScreen extends StatelessWidget {
  final ReminderItem reminder;

  const ReminderAddedScreen({
    super.key,
    required this.reminder,
  });

  @override
  Widget build(BuildContext context) {
    final alertsText = reminder.notifications.isNotEmpty
        ? reminder.notifications.join(', ')
        : '7 days, 3 days, on due date';

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
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(minHeight: constraints.maxHeight),
                      child: IntrinsicHeight(
                        child: Padding(
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
                      'Reminder Added!',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "You'll be notified before the due date.",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                        fontSize: 14,
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Summary Card matching Screen 4
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
                        children: [
                          // Top Row: Wrench Icon + Title + Due Date
                          Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0066FF),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Center(
                                  child: reminder.svgAsset != null
                                      ? AppIcons.svg(
                                          reminder.svgAsset!,
                                          color: Colors.white,
                                          width: 22,
                                          height: 22,
                                        )
                                      : Icon(
                                          reminder.icon,
                                          color: Colors.white,
                                          size: 22,
                                        ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      reminder.title,
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                        fontSize: 15.5,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      reminder.dueDate,
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),

                          Divider(
                            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1A2638),
                            height: 28,
                            thickness: 1,
                          ),

                          // Repeat Row
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Repeat:',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                  fontSize: 14,
                                ),
                              ),
                              Text(
                                reminder.repeat,
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 12),

                          // Alerts Row
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Alerts:',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                  fontSize: 14,
                                ),
                              ),
                              Flexible(
                                child: Text(
                                  alertsText,
                                  textAlign: TextAlign.end,
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const Spacer(),

                    // Primary Button: View Reminder
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pushReplacement(
                            context,
                            MaterialPageRoute(
                              builder: (context) =>
                                  ReminderDetailsScreen(reminder: reminder),
                            ),
                          );
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
                              'View Reminder',
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

                    const SizedBox(height: 12),

                    // Secondary Button: + Add Another
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: OutlinedButton(
                        onPressed: () {
                          Navigator.pop(context, reminder);
                        },
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
                          '+ Add Another',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
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
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }
}
