import 'package:latlong2/latlong.dart';
import '../../globals.dart';

/// Fuel and electricity tariff rate model for Indian States & Union Territories.
/// Rates updated to November 2026 benchmarks provided by CarQConnect pricing data.
class StateFuelRate {
  final String stateName;
  final String stateCode;
  final double petrolRate;
  final double dieselRate;
  final double cngRate;
  final double evHomeTariff;
  final double evPublicFastRate;
  final String notes;

  const StateFuelRate({
    required this.stateName,
    required this.stateCode,
    required this.petrolRate,
    required this.dieselRate,
    required this.cngRate,
    required this.evHomeTariff,
    this.evPublicFastRate = 18.00,
    this.notes = '',
  });

  /// Returns the fuel rate per unit (₹/L, ₹/kg, ₹/kWh)
  double getRate(String fuelType, {bool usePublicEv = false}) {
    switch (fuelType.toLowerCase()) {
      case 'diesel':
        return dieselRate;
      case 'cng':
        return cngRate;
      case 'ev':
      case 'electric':
        return usePublicEv ? evPublicFastRate : evHomeTariff;
      case 'hybrid':
      case 'petrol':
      default:
        return petrolRate;
    }
  }

  /// Approximate running cost per km (Car)
  double getApproxCostPerKm(String fuelType, {bool usePublicEv = false}) {
    switch (fuelType.toLowerCase()) {
      case 'ev':
      case 'electric':
        return usePublicEv ? 3.00 : 1.20; // ₹2.50–₹4.00/km public, ₹0.80–₹1.60/km home
      case 'cng':
        return 4.10; // ₹3.50–₹4.80/km
      case 'diesel':
        return 5.75; // ₹5.00–₹6.50/km
      case 'hybrid':
        return 4.80; // Blended hybrid efficiency
      case 'petrol':
      default:
        return 7.60; // ₹6.80–₹8.50/km
    }
  }
}

/// Service providing state-wise fuel, gas & EV electricity tariff rates across India
class FuelRateService {
  /// Complete benchmark table for all 36 Indian States and Union Territories (November 2026)
  static final Map<String, StateFuelRate> _stateRates = {
    'Andaman & Nicobar Islands': const StateFuelRate(
      stateName: 'Andaman & Nicobar Islands',
      stateCode: 'AN',
      petrolRate: 88.66,
      dieselRate: 84.56,
      cngRate: 90.00,
      evHomeTariff: 7.50,
      notes: 'CNG not available, regional benchmark applied',
    ),
    'Andhra Pradesh': const StateFuelRate(
      stateName: 'Andhra Pradesh',
      stateCode: 'AP',
      petrolRate: 117.61,
      dieselRate: 105.30,
      cngRate: 103.05,
      evHomeTariff: 9.60,
      notes: 'CNG ₹102.80–₹103.31',
    ),
    'Arunachal Pradesh': const StateFuelRate(
      stateName: 'Arunachal Pradesh',
      stateCode: 'AR',
      petrolRate: 97.95,
      dieselRate: 87.31,
      cngRate: 93.00,
      evHomeTariff: 4.00,
      notes: 'CNG not available, regional benchmark applied',
    ),
    'Assam': const StateFuelRate(
      stateName: 'Assam',
      stateCode: 'AS',
      petrolRate: 105.73,
      dieselRate: 97.23,
      cngRate: 93.02,
      evHomeTariff: 7.00,
    ),
    'Bihar': const StateFuelRate(
      stateName: 'Bihar',
      stateCode: 'BR',
      petrolRate: 113.37,
      dieselRate: 99.36,
      cngRate: 97.15,
      evHomeTariff: 7.50,
      notes: 'CNG ₹94.00–₹100.29',
    ),
    'Chandigarh': const StateFuelRate(
      stateName: 'Chandigarh',
      stateCode: 'CH',
      petrolRate: 101.54,
      dieselRate: 89.47,
      cngRate: 99.00,
      evHomeTariff: 4.50,
    ),
    'Chhattisgarh': const StateFuelRate(
      stateName: 'Chhattisgarh',
      stateCode: 'CG',
      petrolRate: 108.06,
      dieselRate: 101.32,
      cngRate: 102.38,
      evHomeTariff: 8.00,
      notes: 'CNG northern districts rate',
    ),
    'Dadra & Nagar Haveli and Daman & Diu': const StateFuelRate(
      stateName: 'Dadra & Nagar Haveli and Daman & Diu',
      stateCode: 'DD',
      petrolRate: 100.04,
      dieselRate: 95.93,
      cngRate: 100.00,
      evHomeTariff: 3.50,
      notes: 'Petrol ₹99.62–₹100.46, Diesel ₹95.51–₹96.35, CNG ₹99–₹101',
    ),
    'Delhi': const StateFuelRate(
      stateName: 'Delhi',
      stateCode: 'DL',
      petrolRate: 102.12,
      dieselRate: 95.20,
      cngRate: 86.98,
      evHomeTariff: 5.00,
      notes: 'EV Home ₹4.50–₹5.50',
    ),
    'Goa': const StateFuelRate(
      stateName: 'Goa',
      stateCode: 'GA',
      petrolRate: 104.06,
      dieselRate: 95.94,
      cngRate: 100.67,
      evHomeTariff: 7.40,
    ),
    'Gujarat': const StateFuelRate(
      stateName: 'Gujarat',
      stateCode: 'GJ',
      petrolRate: 101.93,
      dieselRate: 98.05,
      cngRate: 96.90,
      evHomeTariff: 5.25,
      notes: 'CNG ₹93.04–₹100.77, EV Home ₹4.10–₹6.40',
    ),
    'Haryana': const StateFuelRate(
      stateName: 'Haryana',
      stateCode: 'HR',
      petrolRate: 103.28,
      dieselRate: 95.94,
      cngRate: 99.78,
      evHomeTariff: 7.40,
      notes: 'CNG ₹94.95–₹104.60',
    ),
    'Himachal Pradesh': const StateFuelRate(
      stateName: 'Himachal Pradesh',
      stateCode: 'HP',
      petrolRate: 102.54,
      dieselRate: 94.52,
      cngRate: 105.18,
      evHomeTariff: 5.50,
      notes: 'CNG ₹100.99–₹109.38',
    ),
    'Jammu & Kashmir': const StateFuelRate(
      stateName: 'Jammu & Kashmir',
      stateCode: 'JK',
      petrolRate: 107.97,
      dieselRate: 96.14,
      cngRate: 105.24,
      evHomeTariff: 5.50,
      notes: 'CNG ₹104.90–₹105.58',
    ),
    'Jharkhand': const StateFuelRate(
      stateName: 'Jharkhand',
      stateCode: 'JH',
      petrolRate: 105.26,
      dieselRate: 100.49,
      cngRate: 98.05,
      evHomeTariff: 7.30,
      notes: 'CNG ₹95.50–₹100.61',
    ),
    'Karnataka': const StateFuelRate(
      stateName: 'Karnataka',
      stateCode: 'KA',
      petrolRate: 110.93,
      dieselRate: 98.80,
      cngRate: 99.21,
      evHomeTariff: 8.95,
      notes: 'CNG ₹99.00–₹99.42, EV Home ₹7.20–₹10.70',
    ),
    'Kerala': const StateFuelRate(
      stateName: 'Kerala',
      stateCode: 'KL',
      petrolRate: 115.34,
      dieselRate: 104.15,
      cngRate: 100.77,
      evHomeTariff: 9.80,
      notes: 'CNG ₹99.00–₹102.54',
    ),
    'Ladakh': const StateFuelRate(
      stateName: 'Ladakh',
      stateCode: 'LA',
      petrolRate: 110.01,
      dieselRate: 95.00,
      cngRate: 95.00,
      evHomeTariff: 5.10,
      notes: 'CNG not available, regional benchmark applied',
    ),
    'Lakshadweep': const StateFuelRate(
      stateName: 'Lakshadweep',
      stateCode: 'LD',
      petrolRate: 107.50,
      dieselRate: 96.00,
      cngRate: 95.00,
      evHomeTariff: 7.80,
      notes: 'CNG not available, regional benchmark applied',
    ),
    'Madhya Pradesh': const StateFuelRate(
      stateName: 'Madhya Pradesh',
      stateCode: 'MP',
      petrolRate: 114.54,
      dieselRate: 99.64,
      cngRate: 100.10,
      evHomeTariff: 8.00,
      notes: 'CNG ₹98.50–₹101.71 (Indore/Dewas ~₹99, Satna ~₹106)',
    ),
    'Maharashtra': const StateFuelRate(
      stateName: 'Maharashtra',
      stateCode: 'MH',
      petrolRate: 111.21,
      dieselRate: 97.83,
      cngRate: 96.50,
      evHomeTariff: 8.91,
      notes: 'CNG ₹91.50 (Mumbai) / ₹101.50 (Pune), EV Home ₹8.20–₹9.62',
    ),
    'Manipur': const StateFuelRate(
      stateName: 'Manipur',
      stateCode: 'MN',
      petrolRate: 106.87,
      dieselRate: 92.57,
      cngRate: 92.00,
      evHomeTariff: 7.00,
    ),
    'Meghalaya': const StateFuelRate(
      stateName: 'Meghalaya',
      stateCode: 'ML',
      petrolRate: 102.60,
      dieselRate: 94.10,
      cngRate: 98.66,
      evHomeTariff: 6.60,
    ),
    'Mizoram': const StateFuelRate(
      stateName: 'Mizoram',
      stateCode: 'MZ',
      petrolRate: 106.55,
      dieselRate: 95.17,
      cngRate: 92.00,
      evHomeTariff: 8.00,
    ),
    'Nagaland': const StateFuelRate(
      stateName: 'Nagaland',
      stateCode: 'NL',
      petrolRate: 104.87,
      dieselRate: 96.16,
      cngRate: 93.00,
      evHomeTariff: 7.50,
    ),
    'Odisha': const StateFuelRate(
      stateName: 'Odisha',
      stateCode: 'OD',
      petrolRate: 108.97,
      dieselRate: 100.68,
      cngRate: 97.99,
      evHomeTariff: 6.80,
      notes: 'CNG ₹95.00–₹100.98',
    ),
    'Puducherry': const StateFuelRate(
      stateName: 'Puducherry',
      stateCode: 'PY',
      petrolRate: 103.37,
      dieselRate: 93.63,
      cngRate: 79.50,
      evHomeTariff: 7.00,
    ),
    'Punjab': const StateFuelRate(
      stateName: 'Punjab',
      stateCode: 'PB',
      petrolRate: 105.56,
      dieselRate: 95.47,
      cngRate: 98.10,
      evHomeTariff: 7.50,
      notes: 'CNG ₹92.58–₹103.62',
    ),
    'Rajasthan': const StateFuelRate(
      stateName: 'Rajasthan',
      stateCode: 'RJ',
      petrolRate: 112.66,
      dieselRate: 97.78,
      cngRate: 102.92,
      evHomeTariff: 8.80,
      notes: 'CNG ₹101.50–₹104.34',
    ),
    'Sikkim': const StateFuelRate(
      stateName: 'Sikkim',
      stateCode: 'SK',
      petrolRate: 110.60,
      dieselRate: 97.55,
      cngRate: 95.00,
      evHomeTariff: 4.90,
      notes: 'CNG not available, regional benchmark applied',
    ),
    'Tamil Nadu': const StateFuelRate(
      stateName: 'Tamil Nadu',
      stateCode: 'TN',
      petrolRate: 107.74,
      dieselRate: 99.55,
      cngRate: 102.18,
      evHomeTariff: 7.60,
      notes: 'CNG ₹99.50–₹104.86',
    ),
    'Telangana': const StateFuelRate(
      stateName: 'Telangana',
      stateCode: 'TS',
      petrolRate: 115.13,
      dieselRate: 103.29,
      cngRate: 115.00,
      evHomeTariff: 9.50,
    ),
    'Tripura': const StateFuelRate(
      stateName: 'Tripura',
      stateCode: 'TR',
      petrolRate: 104.96,
      dieselRate: 93.85,
      cngRate: 90.00,
      evHomeTariff: 6.70,
    ),
    'Uttar Pradesh': const StateFuelRate(
      stateName: 'Uttar Pradesh',
      stateCode: 'UP',
      petrolRate: 101.86,
      dieselRate: 95.36,
      cngRate: 101.30,
      evHomeTariff: 7.30,
      notes: 'CNG ₹95.59 (Noida) / ₹107.00 (Lucknow)',
    ),
    'Uttarakhand': const StateFuelRate(
      stateName: 'Uttarakhand',
      stateCode: 'UK',
      petrolRate: 100.55,
      dieselRate: 95.93,
      cngRate: 99.90,
      evHomeTariff: 6.80,
    ),
    'West Bengal': const StateFuelRate(
      stateName: 'West Bengal',
      stateCode: 'WB',
      petrolRate: 113.51,
      dieselRate: 99.82,
      cngRate: 104.94,
      evHomeTariff: 9.00,
      notes: 'CNG ₹103.00–₹106.88',
    ),
  };

  /// Primary default state benchmark (Madhya Pradesh)
  static StateFuelRate get defaultStateRate => _stateRates['Madhya Pradesh']!;

  /// All 36 states and union territories sorted alphabetically
  static List<StateFuelRate> get allStates {
    final list = _stateRates.values.toList();
    list.sort((a, b) => a.stateName.compareTo(b.stateName));
    return list;
  }

  /// Map of common 2-letter RTO vehicle registration prefixes to State Names
  static const Map<String, String> _rtoPrefixToState = {
    'AN': 'Andaman & Nicobar Islands',
    'AP': 'Andhra Pradesh',
    'AR': 'Arunachal Pradesh',
    'AS': 'Assam',
    'BR': 'Bihar',
    'CH': 'Chandigarh',
    'CG': 'Chhattisgarh',
    'DD': 'Dadra & Nagar Haveli and Daman & Diu',
    'DN': 'Dadra & Nagar Haveli and Daman & Diu',
    'DL': 'Delhi',
    'GA': 'Goa',
    'GJ': 'Gujarat',
    'HR': 'Haryana',
    'HP': 'Himachal Pradesh',
    'JK': 'Jammu & Kashmir',
    'JH': 'Jharkhand',
    'KA': 'Karnataka',
    'KL': 'Kerala',
    'LA': 'Ladakh',
    'LD': 'Lakshadweep',
    'MP': 'Madhya Pradesh',
    'MH': 'Maharashtra',
    'MN': 'Manipur',
    'ML': 'Meghalaya',
    'MZ': 'Mizoram',
    'NL': 'Nagaland',
    'OD': 'Odisha',
    'OR': 'Odisha',
    'PY': 'Puducherry',
    'PB': 'Punjab',
    'RJ': 'Rajasthan',
    'SK': 'Sikkim',
    'TN': 'Tamil Nadu',
    'TS': 'Telangana',
    'TG': 'Telangana',
    'TR': 'Tripura',
    'UP': 'Uttar Pradesh',
    'UK': 'Uttarakhand',
    'UA': 'Uttarakhand',
    'WB': 'West Bengal',
  };

  /// City to State lookup for accurate route and location resolution
  static const Map<String, String> _cityToState = {
    // Madhya Pradesh
    'indore': 'Madhya Pradesh',
    'bhopal': 'Madhya Pradesh',
    'jabalpur': 'Madhya Pradesh',
    'gwalior': 'Madhya Pradesh',
    'ujjain': 'Madhya Pradesh',
    'sagar': 'Madhya Pradesh',
    'dewas': 'Madhya Pradesh',
    'satna': 'Madhya Pradesh',
    'ratlam': 'Madhya Pradesh',
    'rewa': 'Madhya Pradesh',
    'singrauli': 'Madhya Pradesh',
    'betul': 'Madhya Pradesh',
    'chhindwara': 'Madhya Pradesh',
    'narmadapuram': 'Madhya Pradesh',
    'hoshangabad': 'Madhya Pradesh',
    'katni': 'Madhya Pradesh',
    'khandwa': 'Madhya Pradesh',
    'khargone': 'Madhya Pradesh',
    'neemuch': 'Madhya Pradesh',
    'mandsaur': 'Madhya Pradesh',
    'omkareshwar': 'Madhya Pradesh',
    'maheshwar': 'Madhya Pradesh',
    'mandav': 'Madhya Pradesh',
    'pachmarhi': 'Madhya Pradesh',

    // Maharashtra
    'mumbai': 'Maharashtra',
    'pune': 'Maharashtra',
    'nagpur': 'Maharashtra',
    'thane': 'Maharashtra',
    'nashik': 'Maharashtra',
    'aurangabad': 'Maharashtra',
    'chhatrapati sambhajinagar': 'Maharashtra',
    'solapur': 'Maharashtra',
    'kolhapur': 'Maharashtra',
    'amravati': 'Maharashtra',
    'nanded': 'Maharashtra',
    'sangli': 'Maharashtra',
    'jalgaon': 'Maharashtra',
    'akola': 'Maharashtra',
    'latur': 'Maharashtra',
    'shirdi': 'Maharashtra',
    'lonavala': 'Maharashtra',
    'mahabaleshwar': 'Maharashtra',

    // Delhi & NCR
    'delhi': 'Delhi',
    'new delhi': 'Delhi',
    'dwarka': 'Delhi',
    'rohini': 'Delhi',
    'connaught place': 'Delhi',

    // Uttar Pradesh
    'noida': 'Uttar Pradesh',
    'greater noida': 'Uttar Pradesh',
    'lucknow': 'Uttar Pradesh',
    'kanpur': 'Uttar Pradesh',
    'ghaziabad': 'Uttar Pradesh',
    'agra': 'Uttar Pradesh',
    'varanasi': 'Uttar Pradesh',
    'meerut': 'Uttar Pradesh',
    'prayagraj': 'Uttar Pradesh',
    'allahabad': 'Uttar Pradesh',
    'bareilly': 'Uttar Pradesh',
    'aligarh': 'Uttar Pradesh',
    'moradabad': 'Uttar Pradesh',
    'saharanpur': 'Uttar Pradesh',
    'gorakhpur': 'Uttar Pradesh',
    'mathura': 'Uttar Pradesh',
    'vrindavan': 'Uttar Pradesh',
    'jhansi': 'Uttar Pradesh',
    'ayodhya': 'Uttar Pradesh',

    // Haryana
    'gurugram': 'Haryana',
    'gurgaon': 'Haryana',
    'faridabad': 'Haryana',
    'panipat': 'Haryana',
    'ambala': 'Haryana',
    'yamunanagar': 'Haryana',
    'rohtak': 'Haryana',
    'hisar': 'Haryana',
    'karnal': 'Haryana',
    'sonipat': 'Haryana',
    'panchkula': 'Haryana',

    // Karnataka
    'bengaluru': 'Karnataka',
    'bangalore': 'Karnataka',
    'mysuru': 'Karnataka',
    'mysore': 'Karnataka',
    'hubballi': 'Karnataka',
    'hubli': 'Karnataka',
    'mangaluru': 'Karnataka',
    'mangalore': 'Karnataka',
    'belagavi': 'Karnataka',
    'belgaum': 'Karnataka',
    'davanagere': 'Karnataka',
    'ballari': 'Karnataka',
    'shimoga': 'Karnataka',
    'shivamogga': 'Karnataka',
    'tumakuru': 'Karnataka',
    'coorg': 'Karnataka',
    'hampi': 'Karnataka',

    // Tamil Nadu
    'chennai': 'Tamil Nadu',
    'coimbatore': 'Tamil Nadu',
    'madurai': 'Tamil Nadu',
    'tiruchirappalli': 'Tamil Nadu',
    'trichy': 'Tamil Nadu',
    'salem': 'Tamil Nadu',
    'tiruppur': 'Tamil Nadu',
    'erode': 'Tamil Nadu',
    'tirunelveli': 'Tamil Nadu',
    'vellore': 'Tamil Nadu',
    'ooty': 'Tamil Nadu',
    'kodaikanal': 'Tamil Nadu',
    'kanyakumari': 'Tamil Nadu',

    // Telangana
    'hyderabad': 'Telangana',
    'secunderabad': 'Telangana',
    'warangal': 'Telangana',
    'nizamabad': 'Telangana',
    'karimnagar': 'Telangana',
    'khammam': 'Telangana',

    // Andhra Pradesh
    'visakhapatnam': 'Andhra Pradesh',
    'vizag': 'Andhra Pradesh',
    'vijayawada': 'Andhra Pradesh',
    'guntur': 'Andhra Pradesh',
    'nellore': 'Andhra Pradesh',
    'kurnool': 'Andhra Pradesh',
    'kakinada': 'Andhra Pradesh',
    'rajahmundry': 'Andhra Pradesh',
    'tirupati': 'Andhra Pradesh',

    // Gujarat
    'ahmedabad': 'Gujarat',
    'surat': 'Gujarat',
    'vadodara': 'Gujarat',
    'baroda': 'Gujarat',
    'rajkot': 'Gujarat',
    'bhavnagar': 'Gujarat',
    'jamnagar': 'Gujarat',
    'gandhinagar': 'Gujarat',
    'junagadh': 'Gujarat',
    'anand': 'Gujarat',

    // Rajasthan
    'jaipur': 'Rajasthan',
    'jodhpur': 'Rajasthan',
    'kota': 'Rajasthan',
    'bikaner': 'Rajasthan',
    'ajmer': 'Rajasthan',
    'udaipur': 'Rajasthan',
    'bhilwara': 'Rajasthan',
    'alwar': 'Rajasthan',
    'bharatpur': 'Rajasthan',
    'sikar': 'Rajasthan',
    'mount abu': 'Rajasthan',
    'jaisalmer': 'Rajasthan',
    'pushkar': 'Rajasthan',

    // Punjab
    'ludhiana': 'Punjab',
    'amritsar': 'Punjab',
    'jalandhar': 'Punjab',
    'patiala': 'Punjab',
    'bathinda': 'Punjab',
    'mohali': 'Punjab',

    // West Bengal
    'kolkata': 'West Bengal',
    'howrah': 'West Bengal',
    'durgapur': 'West Bengal',
    'asansol': 'West Bengal',
    'siliguri': 'West Bengal',
    'darjeeling': 'West Bengal',

    // Kerala
    'kochi': 'Kerala',
    'cochin': 'Kerala',
    'thiruvananthapuram': 'Kerala',
    'trivandrum': 'Kerala',
    'kozhikode': 'Kerala',
    'calicut': 'Kerala',
    'munnar': 'Kerala',
    'alappuzha': 'Kerala',
    'alleppey': 'Kerala',

    // Bihar
    'patna': 'Bihar',
    'gaya': 'Bihar',
    'bhagalpur': 'Bihar',
    'muzaffarpur': 'Bihar',

    // Uttarakhand
    'dehradun': 'Uttarakhand',
    'haridwar': 'Uttarakhand',
    'rishikesh': 'Uttarakhand',
    'nainital': 'Uttarakhand',
    'mussoorie': 'Uttarakhand',

    // Himachal Pradesh
    'shimla': 'Himachal Pradesh',
    'manali': 'Himachal Pradesh',
    'dharamshala': 'Himachal Pradesh',
    'kullu': 'Himachal Pradesh',

    // Goa
    'panaji': 'Goa',
    'margao': 'Goa',
    'vasco': 'Goa',
    'calangute': 'Goa',

    // Odisha
    'bhubaneswar': 'Odisha',
    'cuttack': 'Odisha',
    'puri': 'Odisha',

    // Chhattisgarh
    'raipur': 'Chhattisgarh',
    'bhilai': 'Chhattisgarh',
    'bilaspur': 'Chhattisgarh',

    // Jharkhand
    'ranchi': 'Jharkhand',
    'jamshedpur': 'Jharkhand',
    'dhanbad': 'Jharkhand',

    // Chandigarh
    'chandigarh': 'Chandigarh',
  };

  /// Detects the relevant State / UT from route locations, coordinates, and vehicle registration
  static String detectState({
    String? locationName,
    String? toLocation,
    String? fromLocation,
    String? vehicleReg,
    LatLng? coordinates,
  }) {
    // 1. Check destination or target location string
    final candidateNames = [
      locationName,
      toLocation,
      fromLocation,
    ].where((s) => s != null && s.trim().isNotEmpty).map((s) => s!.toLowerCase());

    for (final text in candidateNames) {
      if (text.isEmpty || text == 'current location' || text == 'your location') continue;

      // Check for exact state name match in text
      for (final state in _stateRates.keys) {
        if (text.contains(state.toLowerCase())) {
          return state;
        }
      }

      // Check for major cities
      for (final entry in _cityToState.entries) {
        final pattern = RegExp('\\b${RegExp.escape(entry.key)}\\b');
        if (pattern.hasMatch(text) || text.contains(entry.key)) {
          return entry.value;
        }
      }

      // Check for 2-letter state code tokens in address (e.g. "Indore, MP" or "Bandra, MH")
      for (final entry in _rtoPrefixToState.entries) {
        final tokenPattern = RegExp('[\\s,–-]${entry.key.toLowerCase()}[\\s,.-]');
        if (tokenPattern.hasMatch('$text ')) {
          return entry.value;
        }
      }
    }

    // 2. Check Vehicle Registration (e.g., MP48C8666, MP09DH3792, DL01..., MH12...)
    final cleanReg = (vehicleReg ?? Globals.vehicleRegistration)
        .replaceAll(RegExp(r'[^a-zA-Z0-9]'), '')
        .toUpperCase();
    if (cleanReg.length >= 2) {
      final prefix = cleanReg.substring(0, 2);
      if (_rtoPrefixToState.containsKey(prefix)) {
        return _rtoPrefixToState[prefix]!;
      }
    }

    // 3. Fallback to Madhya Pradesh (primary benchmark)
    return 'Madhya Pradesh';
  }

  /// Retrieves the StateFuelRate for a given state name or code
  static StateFuelRate getStateRate(String? stateNameOrCode) {
    if (stateNameOrCode == null || stateNameOrCode.trim().isEmpty) {
      return defaultStateRate;
    }

    final trimmed = stateNameOrCode.trim();

    // Check direct state name
    if (_stateRates.containsKey(trimmed)) {
      return _stateRates[trimmed]!;
    }

    // Check case-insensitive
    for (final entry in _stateRates.entries) {
      if (entry.key.toLowerCase() == trimmed.toLowerCase() ||
          entry.value.stateCode.toLowerCase() == trimmed.toLowerCase()) {
        return entry.value;
      }
    }

    return defaultStateRate;
  }

  /// Calculates the exact fuel price (₹/L, ₹/kg, ₹/kWh) for a given fuel type and location/state
  static double getPrice(
    String fuelType, {
    String? state,
    String? location,
    String? toLocation,
    String? fromLocation,
    String? vehicleReg,
    LatLng? coordinates,
    bool usePublicEv = false,
  }) {
    final effectiveState = state ??
        detectState(
          locationName: location,
          toLocation: toLocation,
          fromLocation: fromLocation,
          vehicleReg: vehicleReg,
          coordinates: coordinates,
        );

    final rateInfo = getStateRate(effectiveState);
    return rateInfo.getRate(fuelType, usePublicEv: usePublicEv);
  }

  /// Returns fuel unit (L, kg, kWh)
  static String getFuelUnit(String fuelType) {
    switch (fuelType.toLowerCase()) {
      case 'cng':
        return 'kg';
      case 'ev':
      case 'electric':
        return 'kWh';
      default:
        return 'L';
    }
  }

  /// Returns mileage unit (km/L, km/kg, km/kWh)
  static String getMileageUnit(String fuelType) {
    switch (fuelType.toLowerCase()) {
      case 'cng':
        return 'km/kg';
      case 'ev':
      case 'electric':
        return 'km/kWh';
      default:
        return 'km/L';
    }
  }
}
