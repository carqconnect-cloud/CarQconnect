import 'package:flutter/material.dart';
import '../../globals.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_icons.dart';

/// App design gradient linked to central AppTheme
LinearGradient get kReminderBackgroundGradient => AppTheme.bgGradient;

class ReminderItem {
  final String id;
  final String title;
  final String type;
  final String dueDate;
  final String dueStatus;
  final Color statusColor;
  final String statusCategory; // 'Upcoming', 'Overdue', 'Completed'
  final String repeat;
  final List<String> notifications;
  final String notes;
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;
  final bool isCompleted;
  final String? svgAsset;

  const ReminderItem({
    required this.id,
    required this.title,
    required this.type,
    required this.dueDate,
    required this.dueStatus,
    required this.statusColor,
    required this.statusCategory,
    required this.repeat,
    required this.notifications,
    required this.notes,
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
    this.isCompleted = false,
    this.svgAsset,
  });

  ReminderItem copyWith({
    String? id,
    String? title,
    String? type,
    String? dueDate,
    String? dueStatus,
    Color? statusColor,
    String? statusCategory,
    String? repeat,
    List<String>? notifications,
    String? notes,
    IconData? icon,
    Color? iconColor,
    Color? iconBgColor,
    bool? isCompleted,
    String? svgAsset,
  }) {
    return ReminderItem(
      id: id ?? this.id,
      title: title ?? this.title,
      type: type ?? this.type,
      dueDate: dueDate ?? this.dueDate,
      dueStatus: dueStatus ?? this.dueStatus,
      statusColor: statusColor ?? this.statusColor,
      statusCategory: statusCategory ?? this.statusCategory,
      repeat: repeat ?? this.repeat,
      notifications: notifications ?? this.notifications,
      notes: notes ?? this.notes,
      icon: icon ?? this.icon,
      iconColor: iconColor ?? this.iconColor,
      iconBgColor: iconBgColor ?? this.iconBgColor,
      isCompleted: isCompleted ?? this.isCompleted,
      svgAsset: svgAsset ?? this.svgAsset,
    );
  }

  factory ReminderItem.fromJson(Map<String, dynamic> json) {
    final date = DateTime.parse(json['date']);
    final now = DateTime.now();
    final isCompleted = !(json['isActive'] ?? true);
    
    String dueStatus = '';
    Color statusColor = Colors.white;
    String statusCategory = 'Upcoming';
    
    if (isCompleted) {
      statusCategory = 'Completed';
      dueStatus = 'Completed';
      statusColor = const Color(0xFF10B981);
    } else {
      final diff = date.difference(now);
      if (diff.isNegative && date.day != now.day) {
        statusCategory = 'Overdue';
        dueStatus = 'Overdue by ${diff.inDays.abs()} days';
        statusColor = const Color(0xFFFF5252);
      } else {
        statusCategory = 'Upcoming';
        if (diff.inDays == 0) {
          dueStatus = 'Due today';
        } else if (diff.inDays == 1) {
          dueStatus = 'Due tomorrow';
        } else {
          dueStatus = 'Due in ${diff.inDays} days';
        }
        statusColor = const Color(0xFFFBBF24);
      }
    }

    final type = (json['type'] ?? 'general').toString().toLowerCase();
    IconData icon = Icons.notifications_active_rounded;
    Color iconColor = const Color(0xFF00C2FF);
    Color iconBgColor = const Color(0xFF14243B);
    String? svgAsset;

    if (type.contains('service')) {
      icon = Icons.build_rounded;
      iconColor = const Color(0xFF00C2FF);
      iconBgColor = const Color(0xFF14243B);
      svgAsset = AppIcons.service;
    } else if (type.contains('insurance')) {
      icon = Icons.verified_user_outlined;
      iconColor = const Color(0xFF00C2FF);
      iconBgColor = const Color(0xFF14243B);
      svgAsset = AppIcons.shield;
    } else if (type.contains('puc')) {
      icon = Icons.cloud_outlined;
      iconColor = const Color(0xFF00C2FF);
      iconBgColor = const Color(0xFF14243B);
      svgAsset = AppIcons.puc;
    } else if (type.contains('rc')) {
      icon = Icons.credit_card_rounded;
      iconColor = const Color(0xFF00C2FF);
      iconBgColor = const Color(0xFF14243B);
      svgAsset = AppIcons.rc;
    } else if (type.contains('emission')) {
      icon = Icons.cloud_done_outlined;
      iconColor = const Color(0xFF00C2FF);
      iconBgColor = const Color(0xFF14243B);
      svgAsset = AppIcons.emission;
    } else if (type.contains('fitness')) {
      icon = Icons.fitness_center_rounded;
      iconColor = const Color(0xFF00C2FF);
      iconBgColor = const Color(0xFF14243B);
      svgAsset = AppIcons.fitness;
    } else if (type.contains('tax')) {
      icon = Icons.receipt_long_rounded;
      iconColor = const Color(0xFF00C2FF);
      iconBgColor = const Color(0xFF14243B);
      svgAsset = AppIcons.tax;
    } else if (type.contains('permit')) {
      icon = Icons.badge_outlined;
      iconColor = const Color(0xFF00C2FF);
      iconBgColor = const Color(0xFF14243B);
      svgAsset = AppIcons.permit;
    } else if (type.contains('toll') || type.contains('fastag')) {
      icon = Icons.toll_rounded;
      iconColor = const Color(0xFF00C2FF);
      iconBgColor = const Color(0xFF14243B);
      svgAsset = AppIcons.invoice;
    } else {
      svgAsset = AppIcons.plus;
    }

    return ReminderItem(
      id: json['id'] ?? '',
      title: json['title'] ?? 'Reminder',
      type: json['type'] ?? 'General',
      dueDate: '${date.day} ${_month(date.month)} ${date.year}',
      dueStatus: dueStatus,
      statusColor: statusColor,
      statusCategory: statusCategory,
      repeat: 'Never',
      notifications: [],
      notes: json['description'] ?? '',
      icon: icon,
      iconColor: iconColor,
      iconBgColor: iconBgColor,
      isCompleted: isCompleted,
      svgAsset: svgAsset,
    );
  }

  static String _month(int m) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return m >= 1 && m <= 12 ? months[m - 1] : '';
  }
}

class ReminderTypeInfo {
  final String id;
  final String title;
  final String subtitle;
  final IconData icon;
  final String? svgAsset;

  const ReminderTypeInfo({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    this.svgAsset,
  });
}

final List<ReminderItem> kSampleReminders = [
  const ReminderItem(
    id: 'sample_service',
    title: 'General Service',
    type: 'Service / Maintenance',
    dueDate: '25 Oct 2026',
    dueStatus: 'Due in 10 days',
    statusColor: Color(0xFFFBBF24),
    statusCategory: 'Upcoming',
    repeat: 'Every 6 months',
    notifications: ['7 days before', '1 day before'],
    notes: 'Oil filter and brake inspection',
    icon: Icons.build_rounded,
    iconColor: Color(0xFF00C2FF),
    iconBgColor: Color(0xFF14243B),
    svgAsset: AppIcons.service,
  ),
  const ReminderItem(
    id: 'sample_puc',
    title: 'PUC Certificate Renewal',
    type: 'PUC Renewal',
    dueDate: '12 Nov 2026',
    dueStatus: 'Due in 28 days',
    statusColor: Color(0xFFFBBF24),
    statusCategory: 'Upcoming',
    repeat: 'Every 6 months',
    notifications: ['3 days before', 'On due date'],
    notes: 'Pollution check compliance',
    icon: Icons.cloud_outlined,
    iconColor: Color(0xFF00C2FF),
    iconBgColor: Color(0xFF14243B),
    svgAsset: AppIcons.puc,
  ),
  const ReminderItem(
    id: 'sample_insurance',
    title: 'Comprehensive Insurance',
    type: 'Insurance Renewal',
    dueDate: '10 Oct 2026',
    dueStatus: 'Overdue by 5 days',
    statusColor: Color(0xFFFF5252),
    statusCategory: 'Overdue',
    repeat: 'Every 12 months',
    notifications: ['7 days before', 'On due date'],
    notes: 'Renew zero-dep policy',
    icon: Icons.verified_user_outlined,
    iconColor: Color(0xFF00C2FF),
    iconBgColor: Color(0xFF14243B),
    svgAsset: AppIcons.shield,
  ),
];

final List<ReminderTypeInfo> kReminderTypes = const [
  ReminderTypeInfo(
    id: 'service',
    title: 'Service /\nMaintenance',
    subtitle: 'Keep your vehicle in best condition with timely service.',
    icon: Icons.settings_outlined,
    svgAsset: AppIcons.service,
  ),
  ReminderTypeInfo(
    id: 'puc',
    title: 'PUC\nRenewal',
    subtitle: 'Ensure your pollution certificate is valid and compliant.',
    icon: Icons.cloud_outlined,
    svgAsset: AppIcons.puc,
  ),
  ReminderTypeInfo(
    id: 'insurance',
    title: 'Insurance\nRenewal',
    subtitle: 'Keep your vehicle covered with zero lapse in policy.',
    icon: Icons.verified_user_outlined,
    svgAsset: AppIcons.shield,
  ),
  ReminderTypeInfo(
    id: 'rc',
    title: 'RC\nRenewal',
    subtitle: 'Track your registration certificate and fitness validity.',
    icon: Icons.credit_card_rounded,
    svgAsset: AppIcons.rc,
  ),
  ReminderTypeInfo(
    id: 'emission',
    title: 'Emission\nTest',
    subtitle: 'Verify emission norms and state compliance tests.',
    icon: Icons.cloud_done_outlined,
    svgAsset: AppIcons.emission,
  ),
  ReminderTypeInfo(
    id: 'custom',
    title: 'Custom\nReminder',
    subtitle: 'Set personalized reminders for tyre rotation, battery, etc.',
    icon: Icons.add,
    svgAsset: AppIcons.plus,
  ),
];

/// Shared Vehicle Selector Card matching Screens 1, 2, 5
class VehicleSelectorCard extends StatelessWidget {
  final String vehicleName;
  final String vehicleNumber;
  final VoidCallback? onSwitch;

  const VehicleSelectorCard({
    super.key,
    this.vehicleName = '',
    this.vehicleNumber = '',
    this.onSwitch,
  });

  @override
  Widget build(BuildContext context) {
    final isLight = AppTheme.isLight;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Row(
        children: [
          // Vehicle Avatar
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF14243B),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: AppIcons.svg(
                AppIcons.car,
                color: AppTheme.primaryBlue,
                width: 24,
                height: 24,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  vehicleName.isNotEmpty ? vehicleName : (Globals.vehicleModel.isNotEmpty ? Globals.vehicleModel : 'Vehicle Model'),
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  vehicleNumber.isNotEmpty ? vehicleNumber : (Globals.vehicleRegistration.isNotEmpty ? Globals.vehicleRegistration : 'XX 00 XX 0000'),
                  style: TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
          ),
          InkWell(
            onTap: onSwitch ??
                () {
                  showSwitchVehicleModal(
                    context,
                    currentVehicle: vehicleName,
                  );
                },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF182236),
                shape: BoxShape.rectangle,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.cardBorder),
              ),
              child: Center(
                child: Icon(
                  Icons.swap_horiz_rounded,
                  color: AppTheme.textSecondary,
                  size: 20,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Switch Vehicle Bottom Sheet matching Image 3
void showSwitchVehicleModal(
  BuildContext context, {
  String? currentVehicle,
  ValueChanged<String>? onSelected,
}) {
  final isLight = AppTheme.isLightNotifier.value;
  String selected = currentVehicle ?? Globals.vehicleModel;

  showModalBottomSheet(
    context: context,
    backgroundColor: isLight ? Colors.white : const Color(0xFF0B1220),
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => StatefulBuilder(
      builder: (context, setModalState) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Drag Handle
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

              // Title
              Text(
                'Switch Vehicle',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Choose a Vehicle to view its details and manage services.',
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                  fontSize: 13,
                ),
              ),

              const SizedBox(height: 20),

              // Vehicle 1
              _buildVehicleOption(
                name: Globals.vehicleModel.isNotEmpty ? Globals.vehicleModel : 'Vehicle Model',
                regNumber: Globals.vehicleRegistration.isNotEmpty ? Globals.vehicleRegistration : 'XX 00 XX 0000',
                isSelected: selected == Globals.vehicleModel,
                isLight: isLight,
                onTap: () {
                  setModalState(() => selected = Globals.vehicleModel);
                  onSelected?.call(Globals.vehicleModel);
                  Navigator.pop(ctx);
                },
              ),

              const SizedBox(height: 12),

              // + Add New Vehicle Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        backgroundColor: isLight ? const Color(0xFF0F172A) : const Color(0xFF101726),
                        content: const Text(
                          'Add vehicle flow initiated',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(26),
                    ),
                  ),
                  icon: AppIcons.svg(
                    AppIcons.plus,
                    color: Colors.white,
                    width: 20,
                    height: 20,
                  ),
                  label: const Text(
                    'Add New Vehicle',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 15.5,
                      fontWeight: FontWeight.bold,
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

Widget _buildVehicleOption({
  required String name,
  required String regNumber,
  required bool isSelected,
  required bool isLight,
  required VoidCallback onTap,
}) {
  return InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(16),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: isLight ? (isSelected ? const Color(0xFFF0FDF4) : Colors.white) : const Color(0xFF101726),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isSelected
              ? (isLight ? const Color(0xFF0066FF) : const Color(0xFF1E3A5F))
              : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C)),
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF14243B),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: AppIcons.svg(
                AppIcons.car,
                color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                width: 24,
                height: 24,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  regNumber,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
          ),
          // Radio indicator
          Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: isSelected
                    ? (isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF))
                    : (isLight ? const Color(0xFFCBD5E1) : const Color(0xFF475569)),
                width: 2.0,
              ),
            ),
            child: isSelected
                ? Center(
                    child: Container(
                      width: 11,
                      height: 11,
                      decoration: BoxDecoration(
                        color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                        shape: BoxShape.circle,
                      ),
                    ),
                  )
                : null,
          ),
        ],
      ),
    ),
  );
}

/// 3D Calendar + Bell + Checkmark Illustration for Screen 4
class ReminderAddedCelebrationIllustration extends StatelessWidget {
  const ReminderAddedCelebrationIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 180,
      height: 160,
      child: CustomPaint(
        painter: _ReminderAddedPainter(),
      ),
    );
  }
}

class _ReminderAddedPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    void drawChip(Offset offset, double width, double height, double angle, Color color) {
      canvas.save();
      canvas.translate(cx + offset.dx, cy + offset.dy);
      canvas.rotate(angle);
      final rrect = RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset.zero, width: width, height: height),
        const Radius.circular(2),
      );
      canvas.drawRRect(rrect, Paint()..color = color);
      canvas.restore();
    }

    void drawDot(Offset offset, double radius, Color color) {
      canvas.drawCircle(Offset(cx + offset.dx, cy + offset.dy), radius, Paint()..color = color);
    }

    // Confetti particles floating around
    drawChip(const Offset(-48, -48), 12, 5, -0.6, const Color(0xFFFFCA28));
    drawDot(const Offset(40, -46), 4, const Color(0xFF00C2FF));
    drawChip(const Offset(-64, -12), 12, 5, 0.4, const Color(0xFF00C2FF));
    drawChip(const Offset(58, -16), 11, 5, 0.3, const Color(0xFFFF8A65));
    drawDot(const Offset(-52, 28), 3.5, const Color(0xFFFFD54F));

    // Calendar Card Body
    final calRect = RRect.fromRectAndRadius(
      Rect.fromCenter(center: Offset(cx - 8, cy - 2), width: 96, height: 96),
      const Radius.circular(20),
    );

    // Body gradient
    final bodyPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          Color(0xFFE0F2FE),
          Color(0xFFBAE6FD),
        ],
      ).createShader(calRect.outerRect);
    canvas.drawRRect(calRect, bodyPaint);

    // Calendar Header (Blue bar)
    final headerRect = RRect.fromRectAndCorners(
      Rect.fromLTWH(cx - 56, cy - 50, 96, 26),
      topLeft: const Radius.circular(20),
      topRight: const Radius.circular(20),
    );
    final headerPaint = Paint()..color = const Color(0xFF2563EB);
    canvas.drawRRect(headerRect, headerPaint);

    // 4 White Binder Rings on header
    final ringPaint = Paint()
      ..color = Colors.white
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.5;
    for (int i = 0; i < 4; i++) {
      final rx = cx - 40 + (i * 22.0);
      canvas.drawLine(Offset(rx, cy - 54), Offset(rx, cy - 42), ringPaint);
    }

    // Cyan Bell Icon in center of calendar
    final bellPaint = Paint()..color = const Color(0xFF00C2FF);
    final bellPath = Path()
      ..moveTo(cx - 20, cy + 18)
      ..quadraticBezierTo(cx - 16, cy + 8, cx - 12, cy - 2)
      ..quadraticBezierTo(cx - 8, cy - 14, cx - 8, cy - 18)
      ..quadraticBezierTo(cx, cy - 22, cx + 8, cy - 18)
      ..quadraticBezierTo(cx + 8, cy - 14, cx + 12, cy - 2)
      ..quadraticBezierTo(cx + 16, cy + 8, cx + 20, cy + 18)
      ..close();
    canvas.drawPath(bellPath, bellPaint);

    // Bell clapper
    canvas.drawCircle(Offset(cx, cy + 19), 4, Paint()..color = const Color(0xFF0284C7));

    // Glowing Green Circle Checkmark at bottom right
    final checkCenter = Offset(cx + 28, cy + 30);
    final checkGlow = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFF00C853).withValues(alpha: 0.6),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: checkCenter, radius: 26));
    canvas.drawCircle(checkCenter, 26, checkGlow);

    final checkCircle = Paint()..color = const Color(0xFF00C853);
    canvas.drawCircle(checkCenter, 18, checkCircle);

    // White Checkmark
    final checkStroke = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final checkPath = Path()
      ..moveTo(checkCenter.dx - 7, checkCenter.dy - 1)
      ..lineTo(checkCenter.dx - 2, checkCenter.dy + 5)
      ..lineTo(checkCenter.dx + 8, checkCenter.dy - 6);
    canvas.drawPath(checkPath, checkStroke);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
