import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class Globals {
  static String firstName = '';
  static String lastName = '';
  static String vehicleRegistration = '';
  static String vehicleModel = '';
  
  static String email = '';
  static String phone = '';
  static String accessToken = '';
  static String userAddress = '';
  static String get userPhone => phone;
  static set userPhone(String val) => phone = val;
  static String get userEmail => email;
  static set userEmail(String val) => email = val;
  
  // Stored Data Objects
  static List<Map<String, dynamic>> savedAddresses = [];

  static List<Map<String, dynamic>> emergencyContacts = [];
  
  static int profileCompletionPercent = 0;
  static String selectedLanguage = 'English (India)';
  static String selectedLanguageCode = 'en_IN';
  static String profileImageBase64 = '';

  static final ValueNotifier<bool> hasUnreadNotificationsNotifier = ValueNotifier<bool>(false);

  // Active Subscription Plan State
  static String currentPlan = 'Free';
  static String currentPlanId = '';
  static final ValueNotifier<String> currentPlanNotifier = ValueNotifier<String>('Free');

  static Future<void> loadCurrentPlan() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedPlan = prefs.getString('user_current_plan');
      if (savedPlan != null && savedPlan.isNotEmpty) {
        currentPlan = savedPlan;
      }
      final savedPlanId = prefs.getString('user_current_plan_id');
      if (savedPlanId != null && savedPlanId.isNotEmpty) {
        currentPlanId = savedPlanId;
      }
      currentPlanNotifier.value = currentPlan;
    } catch (_) {}
  }

  static Future<void> saveCurrentPlan(String planName, [String planId = '']) async {
    try {
      currentPlan = planName;
      if (planId.isNotEmpty) {
        currentPlanId = planId;
      }
      currentPlanNotifier.value = planName;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_current_plan', planName);
      if (planId.isNotEmpty) {
        await prefs.setString('user_current_plan_id', planId);
      }
    } catch (_) {}
  }
}
