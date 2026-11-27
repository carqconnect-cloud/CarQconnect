import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'track_models.dart';
import 'track_service.dart';
import 'geofence_created.dart';
import '../../widgets/animated_back_arrow.dart';
import '../../widgets/app_toggle_switch.dart';

class AlertSettingsScreen extends StatefulWidget {
  final String geofenceName;
  final String address;
  final double radiusMeters;

  const AlertSettingsScreen({
    super.key,
    this.geofenceName = 'Zone',
    this.address = '',
    this.radiusMeters = 500,
  });

  @override
  State<AlertSettingsScreen> createState() => _AlertSettingsScreenState();
}

class _AlertSettingsScreenState extends State<AlertSettingsScreen> {
  bool _notifyOnEntry = false;
  bool _notifyOnExit = false;
  String _activeTime = 'All the time';

  void _createGeofence() async {
    final newItem = GeofenceItem(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: widget.geofenceName,
      address: widget.address,
      radiusMeters: widget.radiusMeters,
      isEnabled: true,
      icon: widget.geofenceName.toLowerCase().contains('home')
          ? Icons.home_outlined
          : widget.geofenceName.toLowerCase().contains('work')
              ? Icons.work_outline_rounded
              : Icons.location_on_outlined,
    );

    await TrackService.addGeofence(newItem);

    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => GeofenceCreatedScreen(geofence: newItem),
        ),
      );
    }
  }

  void _selectActiveTime() {
    final isLight = AppTheme.isLightNotifier.value;
    showModalBottomSheet(
      context: context,
      backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Select Active Time',
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildTimeOption('All the time', '24/7 active surveillance', isLight),
            _buildTimeOption('Night hours only', '10:00 PM - 06:00 AM', isLight),
            _buildTimeOption('Day hours only', '06:00 AM - 10:00 PM', isLight),
            _buildTimeOption('Custom Schedule', 'Specify days and hours', isLight),
          ],
        ),
      ),
    );
  }

  Widget _buildTimeOption(String title, String subtitle, bool isLight) {
    final isSelected = _activeTime == title;
    final primaryColor = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF);

    return InkWell(
      onTap: () {
        setState(() {
          _activeTime = title;
        });
        Navigator.pop(context);
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: isSelected
                        ? primaryColor
                        : (isLight ? const Color(0xFF0F172A) : Colors.white),
                    fontSize: 15,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            if (isSelected)
              Icon(
                Icons.check_circle_rounded,
                color: primaryColor,
                size: 20,
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final primaryColor = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF);

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
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
              title: Text(
                'Alert Settings',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.2,
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
                          const SizedBox(height: 12),

                          // Section: Geofence Name
                          Text(
                            'Geofence Name',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF8E9BAE),
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Geofence Name Card
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 14,
                            ),
                            decoration: BoxDecoration(
                              color: isLight
                                  ? Colors.white
                                  : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isLight
                                    ? const Color(0xFFE2E8F0)
                                    : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? const Color(0xFFEFF6FF)
                                        : const Color(0xFF142238),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Center(
                                    child: Icon(
                                      Icons.home_outlined,
                                      color: primaryColor,
                                      size: 20,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Text(
                                  widget.geofenceName,
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
                          ),

                          const SizedBox(height: 24),

                          // Section: Notify me when
                          Text(
                            'Notify me when',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF8E9BAE),
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Card with 2 Switch Options (Enters / Exits)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: isLight
                                  ? Colors.white
                                  : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isLight
                                    ? const Color(0xFFE2E8F0)
                                    : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Column(
                              children: [
                                // 1. Vehicle enters this area
                                Padding(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 10),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          color: isLight
                                              ? const Color(0xFFEFF6FF)
                                              : const Color(0xFF142238),
                                          borderRadius:
                                              BorderRadius.circular(10),
                                        ),
                                        child: Center(
                                          child: Icon(
                                            Icons.south_rounded,
                                            color: primaryColor,
                                            size: 20,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'Vehicle enters this area',
                                              style: TextStyle(
                                                color: isLight
                                                    ? const Color(0xFF0F172A)
                                                    : Colors.white,
                                                fontSize: 14.5,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              'Get notified when your vehicle enters the geofence.',
                                              style: TextStyle(
                                                color: isLight
                                                    ? const Color(0xFF64748B)
                                                    : const Color(0xFF8E9BAE),
                                                fontSize: 11.5,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      AppToggleSwitch(
                                        value: _notifyOnEntry,
                                        onChanged: (val) {
                                          setState(() {
                                            _notifyOnEntry = val;
                                          });
                                        },
                                      ),
                                    ],
                                  ),
                                ),

                                Divider(
                                  color: isLight
                                      ? const Color(0xFFF1F5F9)
                                      : const Color(0xFF1A263D),
                                  height: 1,
                                ),

                                // 2. Vehicle exits this area
                                Padding(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 10),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          color: isLight
                                              ? const Color(0xFFEFF6FF)
                                              : const Color(0xFF142238),
                                          borderRadius:
                                              BorderRadius.circular(10),
                                        ),
                                        child: Center(
                                          child: Icon(
                                            Icons.north_rounded,
                                            color: primaryColor,
                                            size: 20,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'Vehicle exits this area',
                                              style: TextStyle(
                                                color: isLight
                                                    ? const Color(0xFF0F172A)
                                                    : Colors.white,
                                                fontSize: 14.5,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              'Get notified when your vehicle leaves the geofence.',
                                              style: TextStyle(
                                                color: isLight
                                                    ? const Color(0xFF64748B)
                                                    : const Color(0xFF8E9BAE),
                                                fontSize: 11.5,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      AppToggleSwitch(
                                        value: _notifyOnExit,
                                        onChanged: (val) {
                                          setState(() {
                                            _notifyOnExit = val;
                                          });
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 16),

                          // Card 3: Active Time
                          InkWell(
                            onTap: _selectActiveTime,
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 16,
                              ),
                              decoration: BoxDecoration(
                                color: isLight
                                    ? Colors.white
                                    : const Color(0xFF101726),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isLight
                                      ? const Color(0xFFE2E8F0)
                                      : const Color(0xFF1C273C),
                                ),
                                boxShadow: isLight ? AppTheme.cardShadow : null,
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 38,
                                    height: 38,
                                    decoration: BoxDecoration(
                                      color: isLight
                                          ? const Color(0xFFEFF6FF)
                                          : const Color(0xFF142238),
                                      borderRadius:
                                          BorderRadius.circular(10),
                                    ),
                                    child: Center(
                                      child: Icon(
                                        Icons.access_time_rounded,
                                        color: primaryColor,
                                        size: 20,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Text(
                                      'Active Time',
                                      style: TextStyle(
                                        color: isLight
                                            ? const Color(0xFF0F172A)
                                            : Colors.white,
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    _activeTime,
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF64748B)
                                          : const Color(0xFF8E9BAE),
                                      fontSize: 13,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Icon(
                                    Icons.chevron_right_rounded,
                                    color: isLight
                                        ? const Color(0xFF64748B)
                                        : const Color(0xFF8E9BAE),
                                    size: 20,
                                  ),
                                ],
                              ),
                            ),
                          ),

                          const SizedBox(height: 28),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Create Geofence Button
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
                    decoration: BoxDecoration(
                      color: isLight
                          ? Colors.white
                          : const Color(0xFF090E17),
                      border: isLight
                          ? const Border(
                              top: BorderSide(color: Color(0xFFE2E8F0)),
                            )
                          : null,
                    ),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _createGeofence,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryColor,
                          foregroundColor: isLight ? Colors.white : Colors.black,
                          elevation: isLight ? 2 : 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(26),
                          ),
                        ),
                        child: Center(
                          child: Text(
                            'Create Geofence',
                            style: TextStyle(
                              color: isLight ? Colors.white : Colors.black,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.2,
                            ),
                          ),
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
}
