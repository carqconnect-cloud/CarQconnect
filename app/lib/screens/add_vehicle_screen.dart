import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'confirm_vehicle_screen.dart';
import 'bottom_navigation_screen.dart';
import '../globals.dart';
import '../utils/app_icons.dart';
import '../theme/app_theme.dart';
import '../widgets/animated_back_arrow.dart';

class AddVehicleScreen extends StatelessWidget {
  const AddVehicleScreen({super.key});

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
                  onPressed: () {
                    Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(builder: (context) => const BottomNavigationScreen()),
                      (route) => false,
                    );
                  },
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
                physics: const BouncingScrollPhysics(),
                child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 16),
                    Text(
                      'Add your first vehicle',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Connect your vehicle to unlock safety, tracking and smart services.',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppTheme.textSecondary,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 40),

                    // Input Field for Vehicle Registration
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      decoration: BoxDecoration(
                        color: isLight ? Colors.white : const Color(0xFF161B22),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isLight ? const Color(0xFFCBD5E1) : Colors.transparent,
                        ),
                      ),
                      child: Row(
                        children: [
                          AppIcons.svg(
                            AppIcons.car,
                            color: isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF),
                            width: 26,
                            height: 26,
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Vehicle Registration Number',
                                  style: TextStyle(
                                    color: isLight
                                        ? const Color(0xFF64748B)
                                        : Colors.white.withValues(alpha: 0.5),
                                    fontSize: 12,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                TextField(
                                  inputFormatters: [
                                    FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z0-9\s\-]')),
                                    LengthLimitingTextInputFormatter(13),
                                  ],
                                  decoration: InputDecoration(
                                    hintText: 'MP 09 AB 1234',
                                    hintStyle: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF94A3B8)
                                          : Colors.white.withValues(alpha: 0.3),
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    border: InputBorder.none,
                                    isDense: true,
                                    contentPadding: EdgeInsets.zero,
                                  ),
                                  style: TextStyle(
                                    color: AppTheme.textPrimary,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  textCapitalization: TextCapitalization.characters,
                                  onChanged: (val) => Globals.vehicleRegistration = val.trim().toUpperCase(),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Find My Vehicle Button
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: () {
                          final cleanReg = Globals.vehicleRegistration
                              .replaceAll(RegExp(r'[\s\-]'), '')
                              .toUpperCase();
                          final regExp = RegExp(
                            r'^([A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$',
                          );

                          if (cleanReg.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Please enter your vehicle registration number'),
                                backgroundColor: Colors.red,
                              ),
                            );
                            return;
                          }

                          if (!regExp.hasMatch(cleanReg)) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Please enter a valid registration number (e.g. MP 09 AB 1234 or 22 BH 1234 AA)',
                                ),
                                backgroundColor: Colors.red,
                              ),
                            );
                            return;
                          }

                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const ConfirmVehicleScreen()),
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
                          'Find My Vehicle',
                          style: TextStyle(
                            color: isLight ? Colors.white : Colors.black,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // I'll do this Later
                    Center(
                      child: TextButton(
                        onPressed: () {
                          Navigator.pushAndRemoveUntil(
                            context,
                            MaterialPageRoute(builder: (context) => const BottomNavigationScreen()),
                            (route) => false,
                          );
                        },
                        child: Text(
                          "I'll do this Later",
                          style: TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Footer text
                    Center(
                      child: Column(
                        children: [
                          Text(
                            'One App.',
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 14),
                          ),
                          Text(
                            'For Every Vehicle.',
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
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
        ),
      );
      },
    );
  }
}
