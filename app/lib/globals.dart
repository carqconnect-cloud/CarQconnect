import 'package:flutter/foundation.dart';

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
}
