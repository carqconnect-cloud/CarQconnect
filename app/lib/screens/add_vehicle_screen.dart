import 'package:flutter/material.dart';
import 'confirm_vehicle_screen.dart';
import 'bottom_navigation_screen.dart';
import '../globals.dart';
import '../utils/app_icons.dart';
import '../utils/app_validators.dart';
import '../theme/app_theme.dart';
import '../widgets/animated_back_arrow.dart';

class AddVehicleScreen extends StatefulWidget {
  const AddVehicleScreen({super.key});

  @override
  State<AddVehicleScreen> createState() => _AddVehicleScreenState();
}

class _AddVehicleScreenState extends State<AddVehicleScreen> {
  String? _regError;

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
                          color: _regError != null
                              ? const Color(0xFFEF4444)
                              : (isLight ? const Color(0xFFCBD5E1) : Colors.transparent),
                          width: _regError != null ? 1.5 : 1.0,
                        ),
                      ),
                      child: Row(
                        children: [
                          AppIcons.svg(
                            AppIcons.car,
                            color: _regError != null
                                ? const Color(0xFFEF4444)
                                : (isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF)),
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
                                    color: _regError != null
                                        ? const Color(0xFFEF4444)
                                        : (isLight
                                            ? const Color(0xFF64748B)
                                            : Colors.white.withValues(alpha: 0.5)),
                                    fontSize: 12,
                                    fontWeight: _regError != null ? FontWeight.w600 : FontWeight.normal,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                TextField(
                                  inputFormatters: AppValidators.vehicleNumberFormatters,
                                  decoration: InputDecoration(
                                    hintText: 'e.g. DL 01 AB 1234',
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
                                  onChanged: (val) {
                                    Globals.vehicleRegistration = val.trim().toUpperCase();
                                    if (_regError != null) {
                                      setState(() => _regError = null);
                                    }
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_regError != null) ...[
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.only(left: 4),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.error_outline_rounded,
                              color: Color(0xFFEF4444),
                              size: 15,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                _regError!,
                                style: const TextStyle(
                                  color: Color(0xFFEF4444),
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 32),

                    // Find My Vehicle Button
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: () {
                          final regErr = AppValidators.validateVehicleNumber(Globals.vehicleRegistration);
                          if (regErr != null) {
                            setState(() => _regError = regErr);
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
