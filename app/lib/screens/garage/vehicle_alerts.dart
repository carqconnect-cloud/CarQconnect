import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../widgets/animated_back_arrow.dart';

class VehicleAlertsScreen extends StatefulWidget {
  const VehicleAlertsScreen({super.key});

  @override
  State<VehicleAlertsScreen> createState() => _VehicleAlertsScreenState();
}

class _VehicleAlertsScreenState extends State<VehicleAlertsScreen> {
  int _selectedFilterIndex = 0;

  final List<Map<String, dynamic>> _alerts = [];

  List<String> get _filters {
    final critCount = _alerts.where((a) => a['type'] == 'Critical').length;
    final warnCount = _alerts.where((a) => a['type'] == 'Warning').length;
    final infoCount = _alerts.where((a) => a['type'] == 'Info').length;
    return [
      'All (${_alerts.length})',
      'Critical ($critCount)',
      'Warning ($warnCount)',
      'Info ($infoCount)',
    ];
  }

  List<Map<String, dynamic>> get _filteredAlerts {
    if (_selectedFilterIndex == 0) return _alerts;
    if (_selectedFilterIndex == 1) {
      return _alerts.where((a) => a['type'] == 'Critical').toList();
    }
    if (_selectedFilterIndex == 2) {
      return _alerts.where((a) => a['type'] == 'Warning').toList();
    }
    return _alerts.where((a) => a['type'] == 'Info').toList();
  }

  void _showAlertDetailSheet(Map<String, dynamic> alert) {
    final isLight = AppTheme.isLightNotifier.value;
    final Color themeColor = alert['color'] as Color;
    final Color badgeColor = (alert['badgeColor'] ?? themeColor) as Color;
    final Color iconBg = isLight
        ? (alert['lightBgColor'] as Color? ?? const Color(0xFFEFF6FF))
        : (alert['bgColor'] as Color).withValues(alpha: 0.8);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        side: BorderSide(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
        ),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: iconBg,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(alert['icon'] as IconData, color: themeColor, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        alert['title'] as String,
                        style: TextStyle(
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: Icon(
                      Icons.close,
                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF070B18),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Diagnostic Telemetry / Code',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      alert['dtcCode'] as String,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 13.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF070B18),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Recommended Action',
                      style: TextStyle(
                        color: Color(0xFF0066FF),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      alert['action'] as String,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF475569) : const Color(0xFF94A3B8),
                        fontSize: 13,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Action initiated for ${alert['title']}'),
                        backgroundColor: badgeColor,
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0066FF),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text(
                    'Resolve or Clear Alert',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
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
            body: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
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
                              'Vehicle Alerts',
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
                  const SizedBox(height: 8),

                  // 2. Filter Pills Row
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: List.generate(_filters.length, (index) {
                        final isSelected = _selectedFilterIndex == index;
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedFilterIndex = index;
                            });
                          },
                          child: Container(
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 9,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? const Color(0xFF0066FF)
                                  : (isLight ? Colors.white : const Color(0xFF0F1A2E)),
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(
                                color: isSelected
                                    ? const Color(0xFF0066FF)
                                    : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A)),
                                width: 1.0,
                              ),
                            ),
                            child: Text(
                              _filters[index],
                              style: TextStyle(
                                color: isSelected
                                    ? Colors.white
                                    : (isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8)),
                                fontSize: 13,
                                fontWeight: isSelected
                                    ? FontWeight.bold
                                    : FontWeight.w500,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // 3. Alerts List
                  Expanded(
                    child: _filteredAlerts.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.verified_user_outlined,
                                    size: 48,
                                    color: isLight
                                        ? const Color(0xFF94A3B8)
                                        : const Color(0xFF64748B),
                                  ),
                                  const SizedBox(height: 14),
                                  Text(
                                    'No Active Alerts',
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF0F172A)
                                          : Colors.white,
                                      fontSize: 17,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'No diagnostic fault codes detected. Connect an OBD-II scanner to run a live vehicle check.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF64748B)
                                          : const Color(0xFF94A3B8),
                                      fontSize: 13.5,
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.builder(
                            physics: const BouncingScrollPhysics(),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: _filteredAlerts.length,
                            itemBuilder: (context, index) {
                        final alert = _filteredAlerts[index];
                        final Color themeColor = alert['color'] as Color;
                        final Color badgeColor = (alert['badgeColor'] ?? themeColor) as Color;
                        final Color badgeBg = isLight
                            ? (alert['lightBgColor'] as Color? ?? const Color(0xFFEFF6FF))
                            : (alert['bgColor'] as Color).withValues(alpha: 0.7);

                        return GestureDetector(
                          onTap: () => _showAlertDetailSheet(alert),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12),
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
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Alert Icon Badge
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: badgeBg,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: themeColor.withValues(alpha: isLight ? 0.25 : 0.35),
                                      width: 1.0,
                                    ),
                                  ),
                                  child: Icon(
                                    alert['icon'] as IconData,
                                    color: themeColor,
                                    size: 22,
                                  ),
                                ),
                                const SizedBox(width: 14),

                                // Title + Badge + Details
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              alert['title'] as String,
                                              style: TextStyle(
                                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                                fontSize: 15.5,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                          // Badge
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 10,
                                              vertical: 4,
                                            ),
                                            decoration: BoxDecoration(
                                              color: badgeBg,
                                              borderRadius:
                                                  BorderRadius.circular(12),
                                              border: Border.all(
                                                color: badgeColor.withValues(alpha: isLight ? 0.3 : 0.5),
                                                width: 0.8,
                                              ),
                                            ),
                                            child: Text(
                                              alert['type'] as String,
                                              style: TextStyle(
                                                color: badgeColor,
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        alert['description'] as String,
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                          fontSize: 13,
                                          height: 1.25,
                                        ),
                                      ),
                                      const SizedBox(height: 10),
                                      Text(
                                        alert['time'] as String,
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
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
