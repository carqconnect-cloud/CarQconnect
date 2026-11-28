import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../utils/app_icons.dart';
import '../../services/app_notification_service.dart';
import '../track/geofence_screen.dart';
import '../../theme/app_theme.dart';
import '../../widgets/animated_back_arrow.dart';
import '../../widgets/app_toggle_switch.dart';

/// Screen 3: Notification Settings Screen
class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() =>
      _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState
    extends State<NotificationSettingsScreen> {
  bool _serviceReminders = true;
  bool _vehicleAlerts = true;
  bool _offersUpdates = true;
  bool _membershipUpdates = true;

  TimeOfDay _silentStart = const TimeOfDay(hour: 22, minute: 0); // 10:00 PM
  TimeOfDay _silentEnd = const TimeOfDay(hour: 7, minute: 0); // 7:00 AM

  @override
  void initState() {
    super.initState();
    _loadPrefs();
  }

  Future<void> _loadPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _serviceReminders = prefs.getBool('notif_pref_reminders') ?? true;
      _vehicleAlerts = prefs.getBool('notif_pref_vehicle') ?? true;
      _offersUpdates = prefs.getBool('notif_pref_offers') ?? true;
      _membershipUpdates = prefs.getBool('notif_pref_membership') ?? true;
    });
  }

  Future<void> _saveBoolPref(String key, bool val) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, val);
    final anyEnabled = _serviceReminders || _vehicleAlerts || _offersUpdates || _membershipUpdates;
    await prefs.setBool('notifications_enabled', anyEnabled);
    await AppNotificationService.instance.pollNow(notifyNew: false);
  }

  String _formatTimeOfDay(TimeOfDay time) {
    final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = time.period == DayPeriod.am ? 'AM' : 'PM';
    return '$hour:$minute $period';
  }

  void _pickSilentHours() async {
    final isLight = AppTheme.isLightNotifier.value;
    final pickedStart = await showTimePicker(
      context: context,
      initialTime: _silentStart,
      helpText: 'SELECT SILENT HOURS START',
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
                    primary: Color(0xFF0066FF),
                    onPrimary: Colors.white,
                    surface: Color(0xFF0F1728),
                    onSurface: Colors.white,
                  ),
                ),
          child: child!,
        );
      },
    );

    if (pickedStart != null && mounted) {
      final pickedEnd = await showTimePicker(
        context: context,
        initialTime: _silentEnd,
        helpText: 'SELECT SILENT HOURS END',
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
                      primary: Color(0xFF0066FF),
                      onPrimary: Colors.white,
                      surface: Color(0xFF0F1728),
                      onSurface: Colors.white,
                    ),
                  ),
            child: child!,
          );
        },
      );

      if (pickedEnd != null && mounted) {
        setState(() {
          _silentStart = pickedStart;
          _silentEnd = pickedEnd;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
            content: Text(
              'Silent hours updated to ${_formatTimeOfDay(_silentStart)} - ${_formatTimeOfDay(_silentEnd)}',
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
              ),
            ),
          ),
        );
      }
    }
  }

  void _addNewAlertRule() {
    final isLight = AppTheme.isLightNotifier.value;
    showModalBottomSheet(
      context: context,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1728),
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        side: BorderSide(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
        ),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Add Custom Alert',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Create custom notification rules for speed alerts, geo-fence boundaries, or curfew times.',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 20),
                ListTile(
                  leading: const Icon(Icons.fence_rounded, color: Color(0xFF0066FF)),
                  title: Text(
                    'Geofence Exit Alert',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    ),
                  ),
                  subtitle: Text(
                    'Configure geofence boundaries and entry/exit alerts',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                      fontSize: 12,
                    ),
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const GeofenceScreen()),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
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
                'Notification Settings',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 18.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
              actions: [
                IconButton(
                  icon: AppIcons.svg(
                    AppIcons.plus,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    width: 22,
                    height: 22,
                  ),
                  onPressed: _addNewAlertRule,
                ),
              ],
            ),
            body: SafeArea(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                children: [
                  // Item 1: Service Reminders
                  _buildNotificationCard(
                    isLight: isLight,
                    icon: Icons.build_rounded,
                    title: 'Service Reminders',
                    subtitle: 'Get notified about upcoming services',
                    value: _serviceReminders,
                    onChanged: (val) {
                      setState(() {
                        _serviceReminders = val;
                      });
                      _saveBoolPref('notif_pref_reminders', val);
                    },
                  ),

                  // Item 2: Vehicle Alerts
                  _buildNotificationCard(
                    isLight: isLight,
                    icon: Icons.warning_amber_rounded,
                    title: 'Vehicle Alerts',
                    subtitle: 'Alerts for unusual activity',
                    value: _vehicleAlerts,
                    onChanged: (val) {
                      setState(() {
                        _vehicleAlerts = val;
                      });
                      _saveBoolPref('notif_pref_vehicle', val);
                    },
                  ),

                  // Item 3: Offers & Updates
                  _buildNotificationCard(
                    isLight: isLight,
                    svgAsset: AppIcons.notification,
                    title: 'Offers & Updates',
                    subtitle: 'Latest offers and features',
                    value: _offersUpdates,
                    onChanged: (val) {
                      setState(() {
                        _offersUpdates = val;
                      });
                      _saveBoolPref('notif_pref_offers', val);
                    },
                  ),

                  // Item 4: Membership Updates
                  _buildNotificationCard(
                    isLight: isLight,
                    icon: Icons.star_outline_rounded,
                    title: 'Membership Updates',
                    subtitle: 'Plan renewals and benefits',
                    value: _membershipUpdates,
                    onChanged: (val) {
                      setState(() {
                        _membershipUpdates = val;
                      });
                      _saveBoolPref('notif_pref_membership', val);
                    },
                  ),

                  // Item 5: Silent Hours
                  _buildSilentHoursCard(isLight),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildNotificationCard({
    required bool isLight,
    IconData? icon,
    String? svgAsset,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppTheme.settingsCardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
          width: 1,
        ),
        boxShadow: AppTheme.settingsCardShadow,
      ),
      child: Row(
        children: [
          // Icon Container
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF0C2442),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isLight
                    ? const Color(0xFFBFDBFE)
                    : const Color(0xFF0284C7).withValues(alpha: 0.35),
                width: 1,
              ),
            ),
            alignment: Alignment.center,
            child: svgAsset != null
                ? AppIcons.svg(
                    svgAsset,
                    color: const Color(0xFF0066FF),
                    width: 22,
                    height: 22,
                  )
                : Icon(
                    icon ?? Icons.notifications_none_rounded,
                    color: const Color(0xFF0066FF),
                    size: 22,
                  ),
          ),
          const SizedBox(width: 14),

          // Title & Subtitle
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
          ),

          // Switch
          AppToggleSwitch(
            value: value,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildSilentHoursCard(bool isLight) {
    final timeString =
        '${_formatTimeOfDay(_silentStart)} - ${_formatTimeOfDay(_silentEnd)}';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.settingsCardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
          width: 1,
        ),
        boxShadow: AppTheme.settingsCardShadow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _pickSilentHours,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Row(
              children: [
                // Moon Icon Container
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF162544),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isLight
                          ? const Color(0xFFE2E8F0)
                          : const Color(0xFF1E3A8A).withValues(alpha: 0.4),
                      width: 1,
                    ),
                  ),
                  child: Icon(
                    Icons.nightlight_round,
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFFCBD5E1),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 14),

                // Title
                Expanded(
                  child: Text(
                    'Silent Hours',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),

                // Selected Time Range
                Text(
                  timeString,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(
                  Icons.chevron_right_rounded,
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
