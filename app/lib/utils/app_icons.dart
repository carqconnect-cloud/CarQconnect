import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class AppIcons {
  // SVG Asset Paths
  static const String car = 'assets/icons/Car.svg';
  static const String password = 'assets/icons/Password.svg';
  static const String shield = 'assets/icons/shield_icon.svg';
  static const String shieldAlt = 'assets/icons/Sheild.svg';
  static const String weatherProof = 'assets/icons/Weather Proof.svg';
  static const String share = 'assets/icons/share_icon.svg';
  static const String download = 'assets/icons/Download.svg';
  static const String refresh = 'assets/icons/Refresh.svg';
  static const String plus = 'assets/icons/Plus.svg';
  static const String emergency = 'assets/icons/Emergency.svg';
  static const String emergencyContacts = 'assets/icons/Emergency_contacts.svg';
  static const String customerSupport = 'assets/icons/customer-support.svg';
  static const String arrow = 'assets/icons/Arrow.svg';
  static const String delete = 'assets/icons/Delete.svg';
  static const String heart = 'assets/icons/heart_icon.svg';
  static const String terms = 'assets/icons/Terms.svg';
  static const String privacy = 'assets/icons/Privacy Policy.svg';
  static const String rc = 'assets/icons/RC.svg';
  static const String puc = 'assets/icons/PUC.svg';
  static const String license = 'assets/icons/License.svg';
  static const String navigation = 'assets/icons/Navigation.svg';
  static const String notification = 'assets/icons/Notification.svg';
  static const String fuel = 'assets/icons/Fuel.svg';
  static const String evCharging = 'assets/icons/Ev_Charging.svg';
  static const String restaurants = 'assets/icons/Restaurants.svg';
  static const String hotel = 'assets/icons/Hotel.svg';
  static const String restStops = 'assets/icons/rest_stops.svg';
  static const String distance = 'assets/icons/Distance.svg';
  static const String route = 'assets/icons/Route.svg';
  static const String service = 'assets/icons/Service.svg';
  static const String fitness = 'assets/icons/Fitness.svg';
  static const String tax = 'assets/icons/Tax.svg';
  static const String emission = 'assets/icons/Emission.svg';
  static const String permit = 'assets/icons/Permit.svg';
  static const String invoice = 'assets/icons/Invoice.svg';
  static const String threeDots = 'assets/icons/three_dots.svg';
  static const String scrollText = 'assets/icons/scroll-text.svg';
  static const String about = 'assets/icons/About.svg';
  static const String language = 'assets/icons/Language.svg';
  static const String unit = 'assets/icons/Unit.svg';
  static const String document = 'assets/icons/document.svg';
  static const String wrench = 'assets/icons/wrench.svg';
  static const String tag = 'assets/icons/tag.svg';
  static const String locationPin = 'assets/icons/location_pin.svg';
  static const String carFront = 'assets/icons/car_front.svg';
  static const String sosBell = 'assets/icons/sos_bell.svg';
  static const String backArrow = 'assets/icons/Back Arrow.svg';

  /// Helper to render an SVG icon with optional color filtering and sizing
  static Widget svg(
    String assetPath, {
    Color? color,
    double? width,
    double? height,
    BoxFit fit = BoxFit.contain,
  }) {
    return SvgPicture.asset(
      assetPath,
      width: width,
      height: height,
      fit: fit,
      colorFilter: color != null ? ColorFilter.mode(color, BlendMode.srcIn) : null,
    );
  }
}
