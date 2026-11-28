import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'obd_connection.dart';
import 'vehicle_alerts.dart';

class VehicleDashboardScreen extends StatelessWidget {
  final Function(int index)? onNavigateTab;
  final String vehicleName;
  final String vehiclePlate;
  final Map<String, dynamic>? vehicleData;
  final bool isObdConnected;

  const VehicleDashboardScreen({
    super.key,
    this.onNavigateTab,
    this.vehicleName = '',
    this.vehiclePlate = '',
    this.vehicleData,
    this.isObdConnected = false,
  });

  @override
  Widget build(BuildContext context) {
    final imagePath = (vehicleData?['image'] ?? '').toString().trim();
    final alertsCount = vehicleData?['alertsCount'] as int? ?? 0;

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Connection Status Row (Tapping navigates to ObdConnectionScreen)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const ObdConnectionScreen(),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: isObdConnected
                            ? (isLight
                                ? const Color(0xFFD1FAE5)
                                : const Color(0xFF064E3B).withValues(alpha: 0.6))
                            : (isLight
                                ? const Color(0xFFF1F5F9)
                                : const Color(0xFF1E293B)),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isObdConnected
                              ? (isLight
                                  ? const Color(0xFFA7F3D0)
                                  : const Color(0xFF10B981).withValues(alpha: 0.4))
                              : (isLight
                                  ? const Color(0xFFCBD5E1)
                                  : const Color(0xFF334155)),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              color: isObdConnected
                                  ? const Color(0xFF10B981)
                                  : const Color(0xFF64748B),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            isObdConnected ? 'Connected' : 'OBD Not Connected',
                            style: TextStyle(
                              color: isObdConnected
                                  ? (isLight ? const Color(0xFF065F46) : Colors.white)
                                  : (isLight
                                      ? const Color(0xFF475569)
                                      : const Color(0xFF94A3B8)),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.chevron_right,
                            color: isObdConnected
                                ? const Color(0xFF10B981)
                                : const Color(0xFF64748B),
                            size: 14,
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Vehicle Alerts Shortcut Button
                  GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const VehicleAlertsScreen(),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: isLight ? Colors.white : const Color(0xFF0F1A2E),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                        ),
                        boxShadow: isLight ? AppTheme.cardShadow : null,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.notifications_active_outlined,
                            color: Color(0xFF0066FF),
                            size: 14,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            '$alertsCount Alerts',
                            style: const TextStyle(
                              color: Color(0xFF0066FF),
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // 2. Car Showcase
              Center(
                child: SizedBox(
                  height: 190,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      if (imagePath.startsWith('http'))
                        Image.network(
                          imagePath,
                          height: 185,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => Image.asset(
                            'assets/homescreensicons/carimage.png',
                            height: 185,
                            fit: BoxFit.contain,
                          ),
                        )
                      else
                        Image.asset(
                          imagePath.isNotEmpty
                              ? imagePath
                              : 'assets/homescreensicons/carimage.png',
                          height: 185,
                          fit: BoxFit.contain,
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // 3. Quick Metrics Row (Engine Health, Battery, Temperature)
              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      isLight: isLight,
                      icon: Icons.monitor_heart_outlined,
                      value: isObdConnected && vehicleData?['engineHealth'] != null
                          ? '${vehicleData!['engineHealth']}%'
                          : '—',
                      label: 'Engine Health',
                      onTap: () => onNavigateTab?.call(1),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildMetricCard(
                      isLight: isLight,
                      icon: Icons.battery_charging_full_rounded,
                      value: isObdConnected && vehicleData?['battery'] != null
                          ? vehicleData!['battery'].toString()
                          : '—',
                      label: 'Battery',
                      onTap: () => onNavigateTab?.call(2),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildMetricCard(
                      isLight: isLight,
                      icon: Icons.thermostat_outlined,
                      value: isObdConnected && vehicleData?['temperature'] != null
                          ? vehicleData!['temperature'].toString()
                          : '—',
                      label: 'Temperature',
                      onTap: () => onNavigateTab?.call(2),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 4. Driving Insights Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isLight ? Colors.white : const Color(0xFF0F1A2E),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                    width: 1.0,
                  ),
                  boxShadow: isLight ? AppTheme.cardShadow : null,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Driving Insights',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          isObdConnected ? 'Live' : 'No OBD Data',
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _buildInsightColumn(
                            isLight: isLight,
                            icon: Icons.local_gas_station_rounded,
                            value: '—',
                            label: 'Avg. Fuel',
                          ),
                        ),
                        Container(
                          width: 1,
                          height: 42,
                          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                        ),
                        Expanded(
                          child: _buildInsightColumn(
                            isLight: isLight,
                            icon: Icons.alt_route_rounded,
                            value: '—',
                            label: 'Distance',
                          ),
                        ),
                        Container(
                          width: 1,
                          height: 42,
                          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                        ),
                        Expanded(
                          child: _buildInsightColumn(
                            isLight: isLight,
                            icon: Icons.show_chart_rounded,
                            value: '—',
                            label: 'Avg. Speed',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 5. Diagnostics Status Card (Links to VehicleAlertsScreen)
              Container(
                decoration: BoxDecoration(
                  color: isLight ? Colors.white : const Color(0xFF0F1A2E),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                    width: 1.0,
                  ),
                  boxShadow: isLight ? AppTheme.cardShadow : null,
                ),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isLight
                                  ? const Color(0xFFEFF6FF)
                                  : const Color(0xFF0C2442),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.info_outline_rounded,
                              color: Color(0xFF0066FF),
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Active Vehicle Alerts',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  alertsCount > 0
                                      ? '$alertsCount diagnostic alerts detected'
                                      : 'No active diagnostic alerts. Connect an OBD-II device to scan fault codes.',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Divider(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                      height: 1,
                    ),
                    InkWell(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const VehicleAlertsScreen(),
                          ),
                        );
                      },
                      borderRadius: const BorderRadius.vertical(
                        bottom: Radius.circular(20),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 13,
                        ),
                        child: Row(
                          children: const [
                            Icon(
                              Icons.visibility_outlined,
                              color: Color(0xFF0066FF),
                              size: 17,
                            ),
                            SizedBox(width: 8),
                            Text(
                              'View All Alerts',
                              style: TextStyle(
                                color: Color(0xFF0066FF),
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Spacer(),
                            Icon(
                              Icons.chevron_right,
                              color: Color(0xFF0066FF),
                              size: 20,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMetricCard({
    required bool isLight,
    required IconData icon,
    required String value,
    required String label,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          color: isLight ? Colors.white : const Color(0xFF0F1A2E),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
            width: 1.0,
          ),
          boxShadow: isLight ? AppTheme.cardShadow : null,
        ),
        child: Column(
          children: [
            const Icon(Icons.monitor_heart_outlined, color: Color(0xFF0066FF), size: 22),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                fontSize: 11,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInsightColumn({
    required bool isLight,
    required IconData icon,
    required String value,
    required String label,
  }) {
    return Column(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF0B253D),
            shape: BoxShape.circle,
            border: Border.all(
              color: const Color(0xFF0066FF).withValues(alpha: isLight ? 0.2 : 0.25),
            ),
          ),
          child: Icon(icon, color: const Color(0xFF0066FF), size: 18),
        ),
        const SizedBox(height: 10),
        Text(
          value,
          style: TextStyle(
            color: isLight ? const Color(0xFF0F172A) : Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}
