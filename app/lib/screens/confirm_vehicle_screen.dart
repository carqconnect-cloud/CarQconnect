import 'package:flutter/material.dart';
import 'bottom_navigation_screen.dart';
import '../theme/app_theme.dart';
import '../globals.dart';
import '../widgets/animated_back_arrow.dart';

class ConfirmVehicleScreen extends StatelessWidget {
  const ConfirmVehicleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
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
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
              actions: [
                TextButton(
                  onPressed: () {},
                  child: Text(
                    'Skip',
                    style: TextStyle(
                      color: isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF),
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            body: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 16),
                    Text(
                      'Is this your vehicle?',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'We found the following details.',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Vehicle Card
                    Container(
                      decoration: BoxDecoration(
                        color: isLight ? Colors.white : const Color(0xFF161B22),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : Colors.white.withValues(alpha: 0.05),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ClipRRect(
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                            child: Container(
                              height: 180,
                              width: double.infinity,
                              color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF0F1A26),
                              padding: const EdgeInsets.all(16),
                              child: Center(
                                child: Image.asset(
                                  _getVehicleImage(Globals.vehicleModel),
                                  fit: BoxFit.contain,
                                ),
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(20.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  Globals.vehicleModel.isNotEmpty
                                      ? Globals.vehicleModel
                                      : 'Hyundai Creta',
                                  style: TextStyle(
                                    color: AppTheme.textPrimary,
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  Globals.vehicleRegistration.isNotEmpty
                                      ? Globals.vehicleRegistration
                                      : 'MP 09 AB 1234',
                                  style: TextStyle(
                                    color: AppTheme.textSecondary,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 24),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    _buildSpecItem(isLight, Icons.local_gas_station_outlined, 'Petrol'),
                                    _buildDot(isLight),
                                    _buildSpecItem(isLight, Icons.calendar_today_outlined, '2024'),
                                    _buildDot(isLight),
                                    _buildSpecItem(
                                      isLight,
                                      _isTwoWheeler(Globals.vehicleModel)
                                          ? Icons.two_wheeler_outlined
                                          : Icons.directions_car_outlined,
                                      _getVehicleType(Globals.vehicleModel),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 40),

                    // Buttons
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pushAndRemoveUntil(
                            context,
                            MaterialPageRoute(builder: (context) => const BottomNavigationScreen()),
                            (route) => false,
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isLight
                              ? AppTheme.primaryBlue
                              : const Color(0xFF00C2FF),
                          foregroundColor: isLight ? Colors.white : Colors.black,
                          elevation: isLight ? 2 : 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(28),
                          ),
                        ),
                        child: Text(
                          'Yes, Add Vehicle',
                          style: TextStyle(
                            color: isLight ? Colors.white : Colors.black,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: isLight ? Colors.white : Colors.transparent,
                          side: BorderSide(
                            color: isLight
                                ? const Color(0xFFCBD5E1)
                                : Colors.white.withValues(alpha: 0.1),
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(28),
                          ),
                        ),
                        child: Text(
                          'Not My Vehicle',
                          style: TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
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

  Widget _buildSpecItem(bool isLight, IconData icon, String text) {
    return Row(
      children: [
        Icon(
          icon,
          color: isLight ? AppTheme.primaryBlue : Colors.white.withValues(alpha: 0.5),
          size: 16,
        ),
        const SizedBox(width: 6),
        Text(
          text,
          style: TextStyle(
            color: isLight ? const Color(0xFF475569) : Colors.white.withValues(alpha: 0.7),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildDot(bool isLight) {
    return Container(
      width: 4,
      height: 4,
      decoration: BoxDecoration(
        color: isLight ? const Color(0xFFCBD5E1) : Colors.white.withValues(alpha: 0.2),
        shape: BoxShape.circle,
      ),
    );
  }

  bool _isTwoWheeler(String name) {
    final lower = name.toLowerCase();
    final twoWheelerKeywords = [
      'ninja', 'kawasaki', 'hayabusa', 'zx', 'superbike', 'bike', 'motorcycle',
      'activa', 'scooter', 'scooty', 'dio', 'jupiter', 'access', 'pleasure',
      'ntorq', 'ola', 'ather', 'chetak', 'destini', 'ray', 'grazia', 'burgman',
      'fascino', 'vespa', 'aerox', 'vida', 'iqube',
      'splendor', 'passion', 'shine', 'platina', 'hf deluxe', 'ct 100',
      'glamour', 'super splendor', 'pulsar', 'apache', 'bullet', 'classic',
      'duke', 'ktm', 'r15', 'mt 15', 'fz', 'hunter', 'royal enfield', 'cbr',
      'sp 125', 'raider', 'ronin', 'himalayan'
    ];
    return twoWheelerKeywords.any((k) => lower.contains(k));
  }

  String _getVehicleImage(String modelName) {
    final lower = modelName.toLowerCase();
    if (lower.contains('activa') || lower.contains('scooter') || lower.contains('dio') || lower.contains('jupiter') || lower.contains('access')) {
      return 'assets/homescreensicons/activa_trans.png';
    }
    if (lower.contains('pulsar') || lower.contains('apache') || lower.contains('fz') || lower.contains('bullet') || lower.contains('classic') || lower.contains('duke') || lower.contains('ktm')) {
      return 'assets/homescreensicons/pulsar_trans.png';
    }
    if (lower.contains('splendor') || lower.contains('passion') || lower.contains('shine') || lower.contains('platina') || lower.contains('glamour')) {
      return 'assets/homescreensicons/splendor_trans.png';
    }
    if (lower.contains('ninja') || lower.contains('kawasaki') || lower.contains('superbike') || lower.contains('hayabusa') || lower.contains('cbr') || lower.contains('r15')) {
      return 'assets/homescreensicons/ninja_trans.png';
    }
    if (lower.contains('swift') || lower.contains('baleno') || lower.contains('i20') || lower.contains('alto') || lower.contains('wagonr')) {
      return 'assets/homescreensicons/swift_trans.png';
    }
    return 'assets/homescreensicons/carimage.png';
  }

  String _getVehicleType(String modelName) {
    final lower = modelName.toLowerCase();
    if (lower.contains('activa') || lower.contains('scooter') || lower.contains('dio') || lower.contains('jupiter') || lower.contains('access') || lower.contains('scooty')) {
      return 'Scooter';
    }
    if (_isTwoWheeler(modelName)) {
      return 'Bike';
    }
    if (lower.contains('swift') || lower.contains('i20') || lower.contains('baleno') || lower.contains('alto') || lower.contains('wagonr')) {
      return 'Hatchback';
    }
    return 'SUV';
  }
}
