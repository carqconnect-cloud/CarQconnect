import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../documents/document_screens.dart';
import 'vehicle_details.dart';
import 'obd_connection.dart';
import '../../widgets/animated_back_arrow.dart';
import '../../widgets/app_toggle_switch.dart';

class VehicleSettingsScreen extends StatefulWidget {
  final String vehicleName;
  final String vehiclePlate;
  final Map<String, dynamic>? vehicleData;
  final bool isObdConnected;

  const VehicleSettingsScreen({
    super.key,
    this.vehicleName = '',
    this.vehiclePlate = '',
    this.vehicleData,
    this.isObdConnected = false,
  });

  @override
  State<VehicleSettingsScreen> createState() => _VehicleSettingsScreenState();
}

class _VehicleSettingsScreenState extends State<VehicleSettingsScreen> {
  bool _isPrimaryVehicle = true;

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
            body: SafeArea(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  children: [
                    // 1. App Bar
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                        Expanded(
                          child: Center(
                            child: Text(
                              'Vehicle Settings',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.2,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 36),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 2. Settings Items List
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      children: [
                        // Item 1: Edit Vehicle Details
                        _buildSettingTile(
                          isLight: isLight,
                          icon: Icons.edit_outlined,
                          title: 'Edit Vehicle Details',
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => VehicleDetailsScreen(
                                  isStandalone: true,
                                  vehicleName: widget.vehicleName,
                                  vehiclePlate: widget.vehiclePlate,
                                  vehicleData: widget.vehicleData,
                                ),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 12),

                        // Item 2: Manage OBD Device
                        _buildSettingTile(
                          isLight: isLight,
                          icon: Icons.developer_board_outlined,
                          title: 'Manage OBD Device',
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: widget.isObdConnected
                                  ? (isLight
                                      ? const Color(0xFFD1FAE5)
                                      : const Color(0xFF064E3B).withValues(alpha: 0.6))
                                  : (isLight
                                      ? const Color(0xFFF1F5F9)
                                      : const Color(0xFF1E293B)),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: widget.isObdConnected
                                    ? (isLight
                                        ? const Color(0xFFA7F3D0)
                                        : const Color(0xFF10B981).withValues(alpha: 0.4))
                                    : (isLight
                                        ? const Color(0xFFCBD5E1)
                                        : const Color(0xFF334155)),
                              ),
                            ),
                            child: Text(
                              widget.isObdConnected ? 'Connected' : 'Not Connected',
                              style: TextStyle(
                                color: widget.isObdConnected
                                    ? (isLight
                                        ? const Color(0xFF065F46)
                                        : const Color(0xFF10B981))
                                    : (isLight
                                        ? const Color(0xFF475569)
                                        : const Color(0xFF94A3B8)),
                                fontSize: 11.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const ObdConnectionScreen(),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 12),

                        // Item 3: Manage Documents
                        _buildSettingTile(
                          isLight: isLight,
                          icon: Icons.description_outlined,
                          title: 'Manage Documents',
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const VehicleDocumentsScreen(),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 12),

                        // Item 4: Set as Primary Vehicle (with Switch)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: isLight ? Colors.white : const Color(0xFF0F1A2E),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                              width: 1.0,
                            ),
                            boxShadow: isLight ? AppTheme.cardShadow : null,
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.star_outline_rounded,
                                color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                                size: 22,
                              ),
                              const SizedBox(width: 14),
                              Text(
                                'Set as Primary Vehicle',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const Spacer(),
                              AppToggleSwitch(
                                value: _isPrimaryVehicle,
                                onChanged: (value) {
                                  setState(() {
                                    _isPrimaryVehicle = value;
                                  });
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 36),

                        // Remove Vehicle Button
                        InkWell(
                          onTap: () {
                            _showRemoveDialog(context, isLight);
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 10,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: const [
                                Icon(
                                  Icons.delete_outline_rounded,
                                  color: Color(0xFFEF4444),
                                  size: 20,
                                ),
                                SizedBox(width: 8),
                                Text(
                                  'Remove Vehicle',
                                  style: TextStyle(
                                    color: Color(0xFFEF4444),
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
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
        ),
      );
    },
  );
  }

  Widget _buildSettingTile({
    required bool isLight,
    required IconData icon,
    required String title,
    Widget? trailing,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: isLight ? Colors.white : const Color(0xFF0F1A2E),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
            width: 1.0,
          ),
          boxShadow: isLight ? AppTheme.cardShadow : null,
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
              size: 20,
            ),
            const SizedBox(width: 14),
            Text(
              title,
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.w500,
              ),
            ),
            const Spacer(),
            if (trailing != null) ...[
              trailing,
              const SizedBox(width: 8),
            ],
            Icon(
              Icons.chevron_right,
              color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  void _showRemoveDialog(BuildContext context, bool isLight) {
    final label = [widget.vehicleName, widget.vehiclePlate]
        .where((s) => s.trim().isNotEmpty)
        .join(' • ');
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
          ),
        ),
        title: Text(
          'Manage Vehicle Registration',
          style: TextStyle(
            color: isLight ? const Color(0xFF0F172A) : Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Text(
          label.isNotEmpty
              ? 'To remove or transfer $label from your CarQConnect account, please unlink any active QR tag or contact support from Account > Help & Support.'
              : 'To remove or transfer a vehicle from your CarQConnect account, please unlink any active QR tag or contact support from Account > Help & Support.',
          style: TextStyle(
            color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
