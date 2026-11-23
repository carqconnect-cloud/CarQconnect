import 'dart:convert';
import 'package:http/http.dart' as http;
import '../utils/api_config.dart';
import '../globals.dart';

class VehicleLookupResult {
  final List<String> suggestions;
  final String detectedFuel;

  const VehicleLookupResult({
    required this.suggestions,
    required this.detectedFuel,
  });
}

class VehicleTypeService {
  static const List<String> fuelTypes = [
    'Petrol',
    'Diesel',
    'EV',
    'CNG',
    'Hybrid',
  ];

  /// Asynchronously queries the backend dataset index (from cars_dataset.csv)
  /// with automatic fallback to offline rules and local models list.
  static Future<VehicleLookupResult> lookup(String query) async {
    final clean = query.trim();
    final localFuel = detectFuelType(clean);
    final localSuggestions = getSuggestions(clean);

    if (clean.length < 2) {
      return VehicleLookupResult(
        suggestions: localSuggestions,
        detectedFuel: localFuel,
      );
    }

    try {
      final token = Globals.accessToken.isNotEmpty ? Globals.accessToken : null;
      final uri = ApiConfig.uri('/vehicle-lookup?q=${Uri.encodeComponent(clean)}');
      final res = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(milliseconds: 2500));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map && data['success'] == true) {
          final list = data['data'] as List? ?? [];
          final backendSugg = list
              .map((item) => (item['fullName'] ?? item['model'] ?? '').toString().trim())
              .where((s) => s.isNotEmpty)
              .toList();

          final detected = (data['detectedType'] ?? '').toString().trim();
          final resolvedFuel = detected.isNotEmpty ? detected : localFuel;

          return VehicleLookupResult(
            suggestions: backendSugg.isNotEmpty ? backendSugg : localSuggestions,
            detectedFuel: resolvedFuel,
          );
        }
      }
    } catch (_) {
      // Network timeout or offline - seamlessly falls back
    }

    return VehicleLookupResult(
      suggestions: localSuggestions,
      detectedFuel: localFuel,
    );
  }

  /// Detects the most probable fuel/vehicle type based on model name keywords
  static String detectFuelType(String modelName) {
    final lower = modelName.trim().toLowerCase();
    if (lower.isEmpty) return 'Petrol';
    final norm = lower.replaceAll(RegExp(r'[\s\-_\.]'), '');

    // 1. Electric / EV Detection
    const evKeywords = [
      'ev',
      'electric',
      'be 6',
      'be.05',
      'be 05',
      'be6',
      'curvv ev',
      'nexon ev',
      'tiago ev',
      'tigor ev',
      'punch ev',
      'xuv400',
      'xuv 400',
      'e-verito',
      'comet',
      'zs ev',
      'ioniq',
      'kona electric',
      'kona ev',
      'byd',
      'atto',
      'seal',
      'e6',
      'ola',
      's1 pro',
      's1 air',
      's1 x',
      's1',
      'ather',
      '450x',
      '450s',
      '450 apex',
      'rizta',
      'chetak',
      'iqube',
      'i-qube',
      'vida',
      'v1',
      'revolt',
      'rv400',
      'ultraviolette',
      'f77',
      'tork',
      'kratos',
      'matter',
      'aerat',
      'hero electric',
      'optima',
      'flash',
      'photon',
      'nyx',
      'ampere',
      'magnus',
      'zeal',
      'okinawa',
      'pure ev',
      'taycan',
      'e-tron',
      'eqs',
      'eqe',
      'eqb',
      'eqc',
      'i4',
      'ix',
      'i7',
      'i3',
      'ev6',
      'ev9',
      'leaf',
      'bolt',
      'cybertruck',
      'model s',
      'model 3',
      'model x',
      'model y',
    ];
    for (final kw in evKeywords) {
      if (lower.contains(kw) || norm.contains(kw.replaceAll(' ', ''))) return 'EV';
    }

    // 2. CNG Detection
    const cngKeywords = [
      'cng',
      'icng',
      's-cng',
      'bi-fuel',
      'hy-cng',
      'wagon r cng',
      'wagonr cng',
      'ertiga cng',
      'dzire cng',
      'alto cng',
      'eeco cng',
      'celerio cng',
      'spresso cng',
      's-presso cng',
      'baleno cng',
      'fronx cng',
      'brezza cng',
      'tiago cng',
      'tigor cng',
      'punch cng',
      'altroz cng',
      'aura cng',
      'nios cng',
      'exter cng',
      'triber cng',
    ];
    for (final kw in cngKeywords) {
      if (lower.contains(kw) || norm.contains(kw.replaceAll(' ', ''))) return 'CNG';
    }

    // 3. Hybrid Detection
    const hybridKeywords = [
      'hybrid',
      'strong hybrid',
      'plug-in hybrid',
      'phev',
      'hyryder',
      'grand vitara hybrid',
      'innova hycross',
      'hycross',
      'camry hybrid',
      'prius',
      'accord hybrid',
      'e:hev',
      'rav4 hybrid',
    ];
    for (final kw in hybridKeywords) {
      if (lower.contains(kw) || norm.contains(kw.replaceAll(' ', ''))) return 'Hybrid';
    }

    // 4. Diesel Detection
    const dieselKeywords = [
      'diesel',
      'tata suv',
      'suv',
      'crdi',
      'tdi',
      'dci',
      'ddis',
      'multijet',
      'mhawk',
      'scorpio',
      'bolero',
      'thar',
      'harrier',
      'safari',
      'innova crysta',
      'crysta',
      'fortuner',
      'hilux',
      'endeavour',
      'pajero',
      'gloster',
      'meridian',
      'd-max',
      'v-cross',
      'isuzu',
    ];
    for (final kw in dieselKeywords) {
      if (lower.contains(kw) || norm.contains(kw.replaceAll(' ', ''))) return 'Diesel';
    }

    // 5. Default is Petrol
    return 'Petrol';
  }

  /// Popular Indian vehicle models for auto-complete suggestions
  static const List<String> popularModels = [
    'Mahindra BE 6',
    'Mahindra Thar',
    'Mahindra Scorpio-N',
    'Mahindra XUV700',
    'Mahindra Bolero',
    'Tata Nexon EV',
    'Tata Nexon',
    'Tata Punch EV',
    'Tata Punch',
    'Tata Tiago EV',
    'Tata Tiago',
    'Tata Harrier',
    'Tata Safari',
    'Hyundai Creta',
    'Hyundai Venue',
    'Hyundai Ioniq 5',
    'Hyundai Verna',
    'Hyundai i20',
    'Maruti Suzuki Swift',
    'Maruti Suzuki Baleno',
    'Maruti Suzuki Brezza',
    'Maruti Suzuki WagonR CNG',
    'Maruti Suzuki Ertiga CNG',
    'Maruti Suzuki Dzire',
    'Maruti Suzuki Fronx',
    'Maruti Suzuki Grand Vitara',
    'Toyota Fortuner',
    'Toyota Innova Crysta',
    'Toyota Innova Hycross',
    'Toyota Urban Cruiser Hyryder',
    'Kia Seltos',
    'Kia Sonet',
    'Kia EV6',
    'MG ZS EV',
    'MG Comet EV',
    'MG Hector',
    'Volkswagen Virtus',
    'Volkswagen Taigun',
    'Skoda Slavia',
    'Skoda Kushaq',
    'Honda City',
    'Honda Elevate',
    'Honda Activa 6G',
    'Honda Shine',
    'Hero Splendor Plus',
    'Hero HF Deluxe',
    'TVS Jupiter',
    'TVS iQube',
    'TVS Apache RTR',
    'Bajaj Pulsar 150',
    'Bajaj Chetak',
    'Ola S1 Pro',
    'Ather 450X',
    'Royal Enfield Classic 350',
    'Royal Enfield Hunter 350',
    'Royal Enfield Himalayan',
  ];

  static List<String> getSuggestions(String query) {
    final clean = query.trim().toLowerCase();
    if (clean.length < 2) return const [];
    final normalizedQuery = clean.replaceAll(RegExp(r'[\s\-_\.]'), '');

    return popularModels.where((m) {
      final mLower = m.toLowerCase();
      if (mLower.contains(clean)) return true;
      final mNorm = mLower.replaceAll(RegExp(r'[\s\-_\.]'), '');
      return mNorm.contains(normalizedQuery);
    }).take(6).toList();
  }
}
