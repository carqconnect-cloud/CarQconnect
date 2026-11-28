import 'package:flutter/material.dart';
import '../globals.dart';
import '../theme/app_theme.dart';
import '../screens/subscription/subscription_screen.dart';

class PlanLimitsService {
  /// Maximum number of vehicles allowed under the plan
  static int getVehicleLimit([String? planName]) {
    final plan = (planName ?? Globals.currentPlan).toLowerCase().trim();
    if (plan.contains('prem') || plan.contains('gold') || plan.contains('pro')) {
      return 5;
    } else if (plan.contains('basic') || plan.contains('silver') || plan.contains('standard')) {
      return 3;
    }
    // Default to Free tier (1 vehicle)
    return 1;
  }

  /// Maximum number of documents allowed under the plan
  static int getDocumentLimit([String? planName]) {
    final plan = (planName ?? Globals.currentPlan).toLowerCase().trim();
    if (plan.contains('prem') || plan.contains('gold') || plan.contains('pro')) {
      return 50;
    } else if (plan.contains('basic') || plan.contains('silver') || plan.contains('standard')) {
      return 20;
    }
    // Default to Free tier (5 documents)
    return 5;
  }

  /// Returns true if the user can add another vehicle
  static bool canAddVehicle(int currentVehicleCount, [String? planName]) {
    final limit = getVehicleLimit(planName);
    return currentVehicleCount < limit;
  }

  /// Returns true if the user can upload another document
  static bool canUploadDocument(int currentDocCount, [String? planName]) {
    final limit = getDocumentLimit(planName);
    return currentDocCount < limit;
  }

  /// Shows the Upgrade Membership Dialog / BottomSheet
  static Future<void> showUpgradeDialog({
    required BuildContext context,
    required String title,
    required String message,
    required int limit,
    String? reason, // 'vehicle' or 'document'
  }) async {
    final isLight = AppTheme.isLightNotifier.value;
    final primaryColor = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF);
    final isVehicle = reason == 'vehicle';

    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: BoxDecoration(
            color: isLight ? Colors.white : const Color(0xFF0F172A),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.35),
                blurRadius: 20,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          padding: const EdgeInsets.fromLTRB(22, 16, 22, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top drag indicator
              Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),

              // Crown / Premium Badge Icon
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFFB300), Color(0xFFFF8F00)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFFFB300).withValues(alpha: 0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Center(
                  child: Icon(
                    isVehicle ? Icons.directions_car_rounded : Icons.folder_special_rounded,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Title
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 8),

              // Current Plan Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: primaryColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: primaryColor.withValues(alpha: 0.3), width: 1),
                ),
                child: Text(
                  'CURRENT PLAN: ${Globals.currentPlan.toUpperCase()}',
                  style: TextStyle(
                    color: primaryColor,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Message
              Text(
                message,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isLight ? const Color(0xFF475569) : const Color(0xFF94A3B8),
                  fontSize: 13.5,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 18),

              // Comparison perk box
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Icon(Icons.check_circle_rounded, size: 16, color: primaryColor),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            isVehicle
                                ? 'Basic Plan: Up to 3 Vehicles'
                                : 'Basic Plan: Up to 20 Documents',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF1E293B) : Colors.white,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        Text(
                          '₹99/mo',
                          style: TextStyle(
                            color: primaryColor,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.stars_rounded, size: 16, color: Color(0xFFFFB300)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            isVehicle
                                ? 'Premium Plan: Up to 5 Vehicles'
                                : 'Premium Plan: Up to 50 Documents',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF1E293B) : Colors.white,
                              fontSize: 12.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const Text(
                          '₹149/mo',
                          style: TextStyle(
                            color: Color(0xFFFFB300),
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // "Upgrade Membership" Primary Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.bolt_rounded, size: 18),
                  label: const Text('Upgrade Membership'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF9800),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    textStyle: const TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  onPressed: () {
                    Navigator.pop(ctx);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const SubscriptionPlanScreen(),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 6),

              // Cancel button
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text(
                  'Maybe Later',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
