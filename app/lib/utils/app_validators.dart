import 'package:flutter/services.dart';

/// Custom TextInputFormatter to automatically capitalize all text to UPPERCASE
class UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    return TextEditingValue(
      text: newValue.text.toUpperCase(),
      selection: newValue.selection,
    );
  }
}

/// Centralized Validation Utility for CarQConnect
/// Ensures uniform, strict, and user-friendly validation across all forms.
class AppValidators {
  // ===========================================================================
  // Formatters
  // ===========================================================================

  /// Prevents user from typing non-numeric characters in phone inputs
  static final List<TextInputFormatter> phoneFormatters = [
    FilteringTextInputFormatter.digitsOnly,
    LengthLimitingTextInputFormatter(10),
  ];

  /// Prevents spaces in email inputs
  static final List<TextInputFormatter> emailFormatters = [
    FilteringTextInputFormatter.deny(RegExp(r'\s')),
    LengthLimitingTextInputFormatter(80),
  ];

  /// Standard vehicle registration number input formatters
  static final List<TextInputFormatter> vehicleNumberFormatters = [
    UpperCaseTextFormatter(),
    FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z0-9\s\-]')),
    LengthLimitingTextInputFormatter(15),
  ];

  /// 6-Digit Indian Postal PIN Code formatters
  static final List<TextInputFormatter> pinCodeFormatters = [
    FilteringTextInputFormatter.digitsOnly,
    LengthLimitingTextInputFormatter(6),
  ];

  /// Person and Contact name formatters
  static final List<TextInputFormatter> nameFormatters = [
    FilteringTextInputFormatter.allow(RegExp(r"[a-zA-Z\s'-]")),
    LengthLimitingTextInputFormatter(60),
  ];

  // ===========================================================================
  // Validators
  // ===========================================================================

  /// Validates a 10-digit Indian mobile number
  /// - User cannot enter text (must be numeric)
  /// - Must be exactly 10 digits
  /// - Must start with 6, 7, 8, or 9
  /// - Rejects obvious dummy repeating digits (e.g., 0000000000, 9999999999)
  static String? validatePhone(String? value, {bool required = true}) {
    final val = (value ?? '').trim();
    if (val.isEmpty) {
      return required ? 'Phone number is required' : null;
    }

    final digitsOnly = val.replaceAll(RegExp(r'\D'), '');
    if (digitsOnly.length != val.length) {
      return 'Only numbers are allowed';
    }

    if (val.length != 10) {
      return 'Please enter a valid 10-digit mobile number';
    }

    if (!RegExp(r'^[6-9]').hasMatch(val)) {
      return 'Mobile number must start with 6, 7, 8, or 9';
    }

    if (RegExp(r'^(\d)\1{9}$').hasMatch(val)) {
      return 'Please enter a valid mobile number';
    }

    return null;
  }

  /// Validates standard RFC-compliant email address
  static String? validateEmail(String? value, {bool required = true}) {
    final val = (value ?? '').trim().toLowerCase();
    if (val.isEmpty) {
      return required ? 'Email address is required' : null;
    }

    if (val.contains(' ')) {
      return 'Email address cannot contain spaces';
    }

    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$',
    );

    if (!emailRegex.hasMatch(val)) {
      return 'Please enter a valid email address';
    }

    final parts = val.split('@');
    if (parts.length != 2 || parts[0].isEmpty || parts[1].isEmpty) {
      return 'Please enter a valid email address';
    }

    final domainParts = parts[1].split('.');
    if (domainParts.length < 2 || domainParts.any((part) => part.isEmpty)) {
      return 'Please enter a valid domain (e.g. gmail.com)';
    }

    if (domainParts.last.length < 2) {
      return 'Please enter a valid domain extension';
    }

    return null;
  }

  /// Validates Indian Vehicle Registration Number
  /// Supports:
  /// - Standard state format: MH 12 AB 1234, DL 01 A 1234, MP 09 1234, KA 05 MC 1234
  /// - Bharat (BH) series: 22 BH 1234 AA, 23 BH 5678 B
  static String? validateVehicleNumber(String? value, {bool required = true}) {
    final raw = (value ?? '').trim();
    if (raw.isEmpty) {
      return required ? 'Vehicle registration number is required' : null;
    }

    final clean = raw.replaceAll(RegExp(r'[\s\-]'), '').toUpperCase();
    if (clean.length < 6 || clean.length > 12) {
      return 'Please enter a valid registration number (e.g. DL 01 AB 1234)';
    }

    final regExp = RegExp(
      r'^([A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$',
    );

    if (!regExp.hasMatch(clean)) {
      return 'Invalid vehicle number format (e.g. MH 12 AB 1234 or 22 BH 1234 AA)';
    }

    return null;
  }

  /// Normalizes vehicle registration number to standard spaced format (e.g., "MH 12 AB 1234")
  static String normalizeVehicleNumber(String value) {
    return value.trim().replaceAll(RegExp(r'\s+'), ' ').toUpperCase();
  }

  /// Validates Vehicle Make / Model / Name
  static String? validateVehicleName(String? value, {String label = 'Vehicle name', bool required = true}) {
    final val = (value ?? '').trim();
    if (val.isEmpty) {
      return required ? '$label is required' : null;
    }

    if (val.length < 2) {
      return '$label must be at least 2 characters';
    }

    if (!RegExp(r"^[a-zA-Z0-9\s\-_/.]+$").hasMatch(val)) {
      return '$label contains invalid characters';
    }

    return null;
  }

  /// Validates First / Last / Contact Name
  static String? validateName(String? value, {String label = 'Name', bool required = true}) {
    final val = (value ?? '').trim();
    if (val.isEmpty) {
      return required ? '$label is required' : null;
    }

    if (val.length < 2) {
      return '$label must be at least 2 characters';
    }

    if (!RegExp(r"^[a-zA-Z\s'-]+$").hasMatch(val)) {
      return '$label can only contain letters and spaces';
    }

    return null;
  }

  /// Validates 6-Digit Indian PIN Code
  static String? validatePinCode(String? value, {bool required = true}) {
    final val = (value ?? '').trim();
    if (val.isEmpty) {
      return required ? 'PIN code is required' : null;
    }

    if (!RegExp(r'^[1-9][0-9]{5}$').hasMatch(val)) {
      return 'Please enter a valid 6-digit PIN code';
    }

    return null;
  }

  /// Validates required text fields (Address, Notes, etc.)
  static String? validateRequired(String? value, {String label = 'Field', int minLength = 2}) {
    final val = (value ?? '').trim();
    if (val.isEmpty) {
      return '$label is required';
    }
    if (val.length < minLength) {
      return '$label must be at least $minLength characters';
    }
    return null;
  }
}
