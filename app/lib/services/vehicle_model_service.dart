import 'package:flutter/foundation.dart';

/// Uses the original bundled car model so the onboarding screen shows the
/// supplied geometry and materials without a network dependency.
class VehicleModelService {
  VehicleModelService._internal();
  static final VehicleModelService instance = VehicleModelService._internal();

  static const String modelAsset = 'Car_3d_Model.glb';

  /// Flutter web serves bundled assets under `assets/assets/`.
  static String get localFallbackAsset =>
      kIsWeb ? 'assets/assets/models/$modelAsset' : 'assets/models/$modelAsset';

  static final ValueNotifier<String> modelUrlNotifier = ValueNotifier<String>(
    localFallbackAsset,
  );

  static String get currentModelUrl => localFallbackAsset;
  static String get activeModelSrc => localFallbackAsset;

  static Future<void> init() async {
    modelUrlNotifier.value = localFallbackAsset;
  }

  static Future<String> fetchModelUrl({String type = 'car'}) async {
    modelUrlNotifier.value = localFallbackAsset;
    return localFallbackAsset;
  }
}
