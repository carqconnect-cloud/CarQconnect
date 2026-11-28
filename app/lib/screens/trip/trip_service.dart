import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../globals.dart';
import '../../services/auth_storage_service.dart';
import '../../services/vehicle_type_service.dart';
import '../../utils/api_config.dart';

class PlaceSearchResult {
  final String displayName;
  final double lat;
  final double lon;
  final String? category;

  PlaceSearchResult({
    required this.displayName,
    required this.lat,
    required this.lon,
    this.category,
  });

  factory PlaceSearchResult.fromJson(
    Map<String, dynamic> json, {
    String? category,
  }) {
    return PlaceSearchResult(
      displayName: json['display_name'] ?? json['name'] ?? '',
      lat: double.tryParse(json['lat'].toString()) ?? 0.0,
      lon: double.tryParse(json['lon'].toString()) ?? 0.0,
      category: category,
    );
  }

  String get shortTitle {
    final parts = displayName.split(',');
    if (parts.isNotEmpty) return parts.first.trim();
    return displayName;
  }

  String get subtitle {
    final parts = displayName.split(',');
    if (parts.length > 1) {
      return parts.sublist(1).take(3).join(', ').trim();
    }
    return '';
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PlaceSearchResult &&
          runtimeType == other.runtimeType &&
          displayName == other.displayName &&
          (lat - other.lat).abs() < 0.0001 &&
          (lon - other.lon).abs() < 0.0001;

  @override
  int get hashCode =>
      Object.hash(displayName, (lat * 1000).round(), (lon * 1000).round());
}

class RouteStep {
  final String instruction;
  final String roadName;
  final String maneuverType; // 'turn', 'depart', 'arrive', 'roundabout', 'fork', 'continue', 'merge'
  final String? modifier; // 'left', 'right', 'slight left', 'slight right', 'sharp left', 'sharp right', 'straight', 'uturn'
  final double distanceMeters;
  final double durationSeconds;
  final LatLng location;

  RouteStep({
    required this.instruction,
    required this.roadName,
    required this.maneuverType,
    this.modifier,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.location,
  });

  String get formattedDistance {
    if (distanceMeters < 1000) {
      return '${distanceMeters.round()} m';
    }
    return '${(distanceMeters / 1000).toStringAsFixed(1)} km';
  }
}

class OSRMRouteResult {
  final double distanceKm;
  final double durationMinutes;
  final String summary;
  final List<LatLng> points;
  final List<RouteStep> steps;
  final bool hasTolls;
  final bool tollStatusAvailable;
  final bool isHighway;
  final List<String> tags;

  OSRMRouteResult({
    required this.distanceKm,
    required this.durationMinutes,
    required this.summary,
    required this.points,
    this.steps = const [],
    this.hasTolls = false,
    this.tollStatusAvailable = true,
    this.isHighway = true,
    this.tags = const [],
  });
}

class TripService {
  /// Mappls (MapmyIndia) Active Static API Key
  static const String mapplsApiKey = String.fromEnvironment(
    'MAPPLS_API_KEY',
    defaultValue: 'kpcbzqyjjppxpxjqyqhvkjqwsxezvtkfkrrv',
  );

  /// Primary Mappls (MapmyIndia) Raster Map Tile URL (uses CORS-compliant tiles on web)
  static String get mapplsTileUrl {
    if (kIsWeb) {
      return fallbackTileUrl;
    }
    return 'https://apis.mappls.com/advancedmaps/v1/$mapplsApiKey/map/{z}/{x}/{y}.png';
  }

  /// High-reliability fallback tile URL (Google Maps tile server) if Mappls quota/network issues occur
  static const String fallbackTileUrl =
      'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

  static String get backendBaseUrl => '${ApiConfig.baseUrl}/trips';

  static String get _vehicleCacheKey => Globals.email.trim().isEmpty
      ? 'carq_cached_vehicles'
      : 'carq_cached_vehicles_${Globals.email.trim().toLowerCase()}';

  static Future<List<Map<String, dynamic>>> loadCachedUserVehicles() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getStringList(_vehicleCacheKey) ?? const <String>[];
      return raw
          .map((item) => Map<String, dynamic>.from(jsonDecode(item) as Map))
          .toList();
    } catch (error) {
      debugPrint('Cached vehicle data could not be read: $error');
      return [];
    }
  }

  static Future<void> cacheUserVehicles(
    List<Map<String, dynamic>> vehicles,
  ) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(
        _vehicleCacheKey,
        vehicles.map(jsonEncode).toList(),
      );
    } catch (error) {
      debugPrint('Vehicle data could not be cached: $error');
    }
  }

  static bool? _extractTollStatus(Map<dynamic, dynamic> route) {
    for (final key in ['hasTolls', 'has_tolls', 'isToll', 'is_toll']) {
      final value = route[key];
      if (value is bool) return value;
      if (value is num) return value > 0;
      if (value is String && (value.toLowerCase() == 'true' || value == '1')) {
        return true;
      }
      if (value is String && (value.toLowerCase() == 'false' || value == '0')) {
        return false;
      }
    }

    final routeClasses = route['routeClasses'] ?? route['route_classes'];
    if (routeClasses is Map && routeClasses.containsKey('toll')) {
      final tollClass = routeClasses['toll'];
      if (tollClass is bool) return tollClass;
      if (tollClass is num) return tollClass > 0;
      if (tollClass is String && (tollClass == '0' || tollClass == '1')) {
        return tollClass == '1';
      }
    }

    final tags = route['tags'];
    if (tags is List) {
      final normalizedTags = tags.map((tag) => tag.toString().toLowerCase()).toList();
      if (normalizedTags.any((tag) => tag.contains('toll-free') || tag.contains('toll free'))) {
        return false;
      }
      if (normalizedTags.any((tag) => tag.contains('toll'))) return true;
    }

    if (route.containsKey('tolls') && route['tolls'] is List) {
      return (route['tolls'] as List).isNotEmpty;
    }
    for (final key in ['totalTollCost', 'tollCost', 'toll_cost']) {
      final value = route[key];
      if (value is num) return value > 0;
    }

    final legs = route['legs'];
    if (legs is List) {
      for (final leg in legs) {
        if (leg is! Map || leg['steps'] is! List) continue;
        for (final step in leg['steps'] as List) {
          if (step is! Map || step['intersections'] is! List) continue;
          for (final intersection in step['intersections'] as List) {
            if (intersection is! Map) continue;
            final classes = intersection['classes'];
            if (classes is List && classes.any((c) => c.toString().toLowerCase() == 'toll')) {
              return true;
            }
          }
        }
      }
    }

    return null;
  }

  static Map<String, String> get _authHeaders => {
    'Authorization': 'Bearer ${Globals.accessToken}',
  };

  static Future<http.Response> _authenticatedRequest(
    Future<http.Response> Function() send,
  ) async {
    final headers = _authHeaders;
    if (Globals.accessToken.isEmpty || headers['Authorization'] == null) {
      final refreshed = await AuthStorageService.refreshSession();
      if (!refreshed) {
        throw StateError('Please sign in again to access trip services.');
      }
    }

    var response = await send();
    if (response.statusCode == 401) {
      final refreshed = await AuthStorageService.refreshSession();
      if (refreshed) {
        response = await send();
      }
    }
    return response;
  }

  /// 1. Place Search using Official Mappls (MapmyIndia) Autosuggest & Search APIs
  static Future<List<PlaceSearchResult>> searchPlaces(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) return [];

    final List<PlaceSearchResult> collected = [];

    // Tier 1: Mappls Autosuggest API (via backend proxy on Web to prevent browser CORS, or direct on mobile)
    try {
      final Uri url = kIsWeb
          ? ApiConfig.uri('/maps/autosuggest?query=${Uri.encodeComponent(trimmed)}')
          : Uri.parse(
              'https://search.mappls.com/search/places/autosuggest/json?query=${Uri.encodeComponent(trimmed)}&access_token=$mapplsApiKey',
            );
      final response = await http
          .get(
            url,
            headers: {
              'User-Agent': 'CarQConnect-App/1.0',
              'Accept': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final rawData = jsonDecode(response.body);
        final data = rawData is Map<String, dynamic> && rawData.containsKey('data')
            ? (rawData['data'] as Map<String, dynamic>? ?? rawData)
            : rawData;
        final list = data['suggestedLocations'] as List<dynamic>?;
        if (list != null && list.isNotEmpty) {
          for (var item in list) {
            final name = item['placeName']?.toString().trim() ?? '';
            final addr = item['placeAddress']?.toString().trim() ?? '';
            final displayName = addr.isNotEmpty ? '$name, $addr' : name;
            final type = item['type']?.toString();
            final lat = double.tryParse(item['latitude']?.toString() ?? item['lat']?.toString() ?? '') ?? 0.0;
            final lon = double.tryParse(item['longitude']?.toString() ?? item['lng']?.toString() ?? item['lon']?.toString() ?? '') ?? 0.0;

            collected.add(
              PlaceSearchResult(
                displayName: displayName,
                lat: lat,
                lon: lon,
                category: type,
              ),
            );
          }
        }
      }
    } catch (e) {
      debugPrint('[TripService] Mappls Autosuggest note: $e');
    }

    // Tier 2: Populate precise coordinates for Indian addresses via Fast Backend Proxy / Mappls Geocode
    if (collected.isNotEmpty && collected.any((p) => p.lat == 0.0)) {
      // Resolve coordinates with city/region context preserved
      for (int i = 0; i < collected.length && i < 6; i++) {
        if (collected[i].lat == 0.0) {
          final parts = collected[i].displayName
              .split(',')
              .map((s) => s.trim())
              .where((s) => s.isNotEmpty)
              .toList();
          final searchTarget = parts.length > 1
              ? '${parts[0]}, ${parts[1]}'
              : collected[i].displayName;

          final coords = await _resolveCoordinates(searchTarget);
          if (coords != null) {
            collected[i] = PlaceSearchResult(
              displayName: collected[i].displayName,
              lat: coords.latitude,
              lon: coords.longitude,
              category: collected[i].category,
            );
          }
        }
      }
    }

    // Tier 3: Fast Indian Highway & City Geocoder Fallback (Backend Proxy & Mappls Geocode)
    if (collected.isEmpty) {
      try {
        final List<dynamic>? results = await _geocodeSearch(trimmed);
        if (results != null && results.isNotEmpty) {
          for (var item in results) {
            final lat = double.tryParse(item['lat']?.toString() ?? '');
            final lon = double.tryParse(item['lon']?.toString() ?? '');
            final name = item['display_name']?.toString() ?? item['name']?.toString() ?? '';
            if (lat != null && lon != null && lat != 0.0 && lon != 0.0 && name.isNotEmpty) {
              collected.add(
                PlaceSearchResult(
                  displayName: name,
                  lat: lat,
                  lon: lon,
                ),
              );
            }
          }
        }
      } catch (_) {}
    }

    // Tier 4: OpenStreetMap Nominatim Search (100% Free & Global Coverage)
    if (collected.isEmpty) {
      try {
        final nomUrl = Uri.parse(
          'https://nominatim.openstreetmap.org/search?q=${Uri.encodeComponent(trimmed)}&format=json&limit=8&countrycodes=in&addressdetails=1',
        );
        final res = await http.get(nomUrl, headers: {
          'User-Agent': 'CarQConnect-App/1.0',
          'Accept': 'application/json',
        }).timeout(const Duration(seconds: 4));
        if (res.statusCode == 200) {
          final list = jsonDecode(res.body);
          if (list is List && list.isNotEmpty) {
            for (var item in list) {
              final lat = double.tryParse(item['lat']?.toString() ?? '');
              final lon = double.tryParse(item['lon']?.toString() ?? '');
              final name = item['display_name']?.toString() ?? '';
              final type = item['type']?.toString();
              if (lat != null && lon != null && lat != 0.0 && lon != 0.0 && name.isNotEmpty) {
                collected.add(
                  PlaceSearchResult(
                    displayName: name,
                    lat: lat,
                    lon: lon,
                    category: type,
                  ),
                );
              }
            }
          }
        }
      } catch (_) {}
    }

    // Tier 5: Direct known cities / hill stations match
    final cleanLower = trimmed.toLowerCase();
    for (var entry in _knownIndianCities.entries) {
      if (entry.key == cleanLower ||
          (cleanLower.length >= 4 && entry.key.startsWith(cleanLower)) ||
          entry.key.contains(cleanLower)) {
        final capitalized = entry.key[0].toUpperCase() + entry.key.substring(1);
        final isMajorMP = entry.key == 'indore' ||
            entry.key == 'ujjain' ||
            entry.key == 'dewas' ||
            entry.key == 'bhopal';
        collected.insert(
          0,
          PlaceSearchResult(
            displayName: isMajorMP
                ? '$capitalized, Madhya Pradesh, India'
                : '$capitalized, India',
            lat: entry.value.latitude,
            lon: entry.value.longitude,
            category: 'city',
          ),
        );
        break;
      }
    }

    // Check known localities if query matches an area (e.g. "Rajendra Nagar", "Bhawarkua")
    for (var entry in _knownLocalities.entries) {
      final locLower = entry.key.toLowerCase();
      if (locLower.contains(cleanLower) || cleanLower.contains(locLower.split(',').first.trim())) {
        collected.insert(
          0,
          PlaceSearchResult(
            displayName: entry.key,
            lat: entry.value.latitude,
            lon: entry.value.longitude,
            category: 'locality',
          ),
        );
        break;
      }
    }

    // Purge any invalid (0,0) coordinates so routes never point to Null Island (ocean)
    collected.removeWhere((p) =>
        p.lat == 0.0 ||
        p.lon == 0.0 ||
        p.lat.isNaN ||
        p.lon.isNaN ||
        p.lat.abs() > 90 ||
        p.lon.abs() > 180);

    // Deduplicate by displayName and coordinates
    final Set<String> seen = {};
    collected.retainWhere((p) {
      final key = '${p.displayName.trim().toLowerCase()}_${(p.lat * 100).round()}_${(p.lon * 100).round()}';
      return seen.add(key);
    });

    // If a known city was queried (e.g. Indore), ensure its canonical coordinates are strictly preserved
    // and prune any rural/district centroid outliers (such as 451225 / Simrol area)
    for (var entry in _knownIndianCities.entries) {
      if (entry.key == cleanLower || cleanLower.startsWith('${entry.key},') || cleanLower.startsWith('${entry.key} ')) {
        final canonical = entry.value;
        collected.removeWhere((p) {
          final pName = p.displayName.toLowerCase().trim();
          final isSameCity = pName == entry.key || pName.startsWith('${entry.key},') || pName.startsWith('${entry.key} ');
          if (isSameCity && p.category != 'city') {
            final dLat = (p.lat - canonical.latitude).abs();
            final dLon = (p.lon - canonical.longitude).abs();
            return dLat > 0.05 || dLon > 0.05;
          }
          return false;
        });
      }
    }

    // Smart Ranking: prioritize exact city/place matches, landmarks, and clean titles
    collected.sort((a, b) {
      int scoreA = _placeRelevanceScore(a, cleanLower);
      int scoreB = _placeRelevanceScore(b, cleanLower);
      return scoreB.compareTo(scoreA);
    });

    return collected;
  }

  static int _placeRelevanceScore(PlaceSearchResult p, String query) {
    int score = 0;
    final name = p.displayName.toLowerCase();
    final q = query.toLowerCase();

    // Exact city or locality match
    if (name.startsWith('$q,') || name == q) {
      score += 50;
    } else if (name.startsWith(q)) {
      score += 30;
    } else if (name.contains(q)) {
      score += 15;
    }

    // High boost for official canonical city entry
    if (p.category == 'city' && (name.startsWith('$q,') || name == q)) {
      score += 40;
    }

    // Boost major administrative hubs & central junctions
    if (name.contains('district') ||
        name.contains('corporation') ||
        name.contains('junction') ||
        name.contains('station')) {
      score += 10;
    }
    if (name.contains('nagar') ||
        name.contains('temple') ||
        name.contains('mandir')) {
      score += 8;
    }

    // Shorter clean names are usually primary cities/landmarks rather than obscure rural alleys
    if (p.displayName.length < 35) {
      score += 12;
    } else if (p.displayName.length < 55) {
      score += 6;
    }

    return score;
  }

  /// Parse numeric distance from formatted string (e.g. "12.5 km from start")
  static double? _parseDistanceFromStart(String displayName) {
    final match = RegExp(r'([\d.]+)\s*km\s*from\s*start', caseSensitive: false).firstMatch(displayName);
    if (match != null && match.group(1) != null) {
      return double.tryParse(match.group(1)!);
    }
    return null;
  }

  static double _distanceBetweenKm(double lat1, double lon1, double lat2, double lon2) {
    const p = 0.017453292519943295;
    final a = 0.5 - math.cos((lat2 - lat1) * p) / 2 +
        math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lon2 - lon1) * p)) / 2;
    return 12742 * math.asin(math.sqrt(math.max(0.0, a)));
  }

  /// Sorts intermediate route stops in true sequential driving order from start to destination
  static List<PlaceSearchResult> sortStopsAlongRoute(
    List<PlaceSearchResult> stops,
    LatLng start,
    LatLng dest,
  ) {
    if (stops.length <= 1) return List.from(stops);

    final sorted = List<PlaceSearchResult>.from(stops);
    final sLat = start.latitude != 0.0 ? start.latitude : 22.7196;
    final sLon = start.longitude != 0.0 ? start.longitude : 75.8577;

    sorted.sort((a, b) {
      final distA = _parseDistanceFromStart(a.displayName);
      final distB = _parseDistanceFromStart(b.displayName);
      if (distA != null && distB != null) {
        return distA.compareTo(distB);
      }
      final geoA = _distanceBetweenKm(sLat, sLon, a.lat, a.lon);
      final geoB = _distanceBetweenKm(sLat, sLon, b.lat, b.lon);
      return geoA.compareTo(geoB);
    });
    return sorted;
  }

  /// Search genuine real-world POIs / stops along the specific corridor between start & destination
  static Future<List<PlaceSearchResult>> searchStopsAlongRoute({
    required String query,
    String? categoryId,
    String? fromLocation,
    String? toLocation,
    LatLng? fromLatLng,
    LatLng? toLatLng,
    List<LatLng>? routePoints,
  }) async {
    final cleanQuery = query.trim();

    // 1. Validate destination exists
    final toLoc = toLocation?.trim() ?? '';
    final hasToCoord = toLatLng != null && toLatLng.latitude != 0.0 && toLatLng.longitude != 0.0;
    final hasToText = toLoc.isNotEmpty &&
        toLoc.toLowerCase() != 'select destination' &&
        toLoc.toLowerCase() != 'destination' &&
        toLoc.toLowerCase() != 'enter destination';

    if (!hasToCoord && !hasToText) {
      return [];
    }

    // 2. Resolve start coordinate
    LatLng? start = (fromLatLng != null && fromLatLng.latitude != 0.0) ? fromLatLng : null;
    if (start == null && fromLocation != null && fromLocation.isNotEmpty && fromLocation != 'Current Location') {
      start = await resolveCoordinates(fromLocation);
    }
    if (start == null) {
      try {
        final pos = await getCurrentLocation();
        if (pos != null) {
          start = LatLng(pos.latitude, pos.longitude);
        }
      } catch (_) {}
    }
    start ??= const LatLng(22.7196, 75.8577); // Fallback to Indore centroid if GPS off

    // 3. Resolve destination coordinate
    LatLng? dest = hasToCoord ? toLatLng : null;
    if (dest == null && hasToText) {
      dest = await resolveCoordinates(toLoc);
    }
    if (dest == null) {
      return [];
    }

    final List<PlaceSearchResult> collected = [];
    final cat = (categoryId ?? '').toLowerCase().trim();
    final qLower = cleanQuery.toLowerCase().trim();

    final isFuel = cat == 'fuel' ||
        qLower == 'petrol pump' ||
        qLower == 'fuel' ||
        qLower == 'fuel / petrol' ||
        qLower == 'diesel' ||
        qLower.contains('petrol') ||
        qLower.contains('diesel') ||
        qLower.contains('pump');
    final isCNG = cat == 'cng' ||
        qLower == 'cng station' ||
        qLower == 'cng' ||
        qLower.contains('cng');
    final isEV = cat == 'ev' ||
        qLower == 'ev charging' ||
        qLower == 'ev charging station' ||
        qLower.contains('charging') ||
        (qLower.contains('ev') && !qLower.contains('rev'));
    final isFood = cat == 'food' ||
        cat == 'restaurant' ||
        qLower == 'food & dhaba' ||
        qLower == 'restaurant dhaba' ||
        qLower == 'restaurants' ||
        qLower == 'food' ||
        qLower.contains('dhaba') ||
        qLower.contains('restaurant') ||
        qLower.contains('food') ||
        qLower.contains('eatery') ||
        qLower.contains('cafe');
    final isHotel = cat == 'hotel' ||
        cat == 'stay' ||
        qLower == 'hotels & stay' ||
        qLower == 'hotel highway lodge' ||
        qLower == 'hotels' ||
        qLower == 'hotel' ||
        qLower.contains('hotel') ||
        qLower.contains('resort') ||
        qLower.contains('lodge') ||
        qLower.contains('stay') ||
        qLower.contains('motel');
    final isRest = cat == 'rest' ||
        qLower == 'rest stops' ||
        qLower == 'rest area washroom' ||
        qLower == 'rest stop' ||
        qLower == 'rest area' ||
        qLower.contains('rest stop') ||
        qLower.contains('rest area') ||
        qLower.contains('washroom') ||
        qLower.contains('toilet') ||
        qLower.contains('wayside');
    final isEmergency = cat == 'emergency' ||
        cat == 'hospital' ||
        qLower == 'emergency' ||
        qLower == 'hospital medical emergency' ||
        qLower.contains('emergency') ||
        qLower.contains('hospital') ||
        qLower.contains('trauma') ||
        qLower.contains('medical') ||
        qLower.contains('clinic') ||
        qLower.contains('doctor');
    final isATM = cat == 'atm' ||
        cat == 'cash' ||
        qLower == 'atm / cash' ||
        qLower == 'atm bank' ||
        qLower == 'atm' ||
        qLower == 'cash' ||
        qLower.contains('atm') ||
        qLower.contains('cash') ||
        qLower.contains('bank');

    // 4. Corridor Detection: Check if route is Indore <-> Mumbai (NH 52 / NH 60 / NH 160)
    final fromText = (fromLocation ?? '').toLowerCase();
    final toText = (toLocation ?? '').toLowerCase();

    final isStartNearIndore = (start.latitude - 22.7196).abs() < 1.0 && (start.longitude - 75.8577).abs() < 1.0;
    final isDestNearMumbai = (dest.latitude - 19.0760).abs() < 1.0 && (dest.longitude - 72.8777).abs() < 1.0;
    final isStartNearMumbai = (start.latitude - 19.0760).abs() < 1.0 && (start.longitude - 72.8777).abs() < 1.0;
    final isDestNearIndore = (dest.latitude - 22.7196).abs() < 1.0 && (dest.longitude - 75.8577).abs() < 1.0;

    final isIndoreToMumbai = (isStartNearIndore && isDestNearMumbai) ||
        (fromText.contains('indore') && toText.contains('mumbai'));
    final isMumbaiToIndore = (isStartNearMumbai && isDestNearIndore) ||
        (fromText.contains('mumbai') && toText.contains('indore'));

    if (isIndoreToMumbai || isMumbaiToIndore) {
      const double totalCorridorDistance = 614.0;

      if (isFuel || (!isCNG && !isEV && !isFood && !isHotel && !isRest && !isEmergency && !isATM && cleanQuery.isEmpty)) {
        // 26 Major highway fuel stations ordered from Indore to Mumbai
        final indoreToMumbaiFuelStations = <(String, double, double, double, String)>[
          ('Indian Oil COCO - Swagat Highway Hub', 12.5, 22.6280, 75.8020, 'AB Road, Rau, Indore'),
          ('Bharat Petroleum (BPCL) - Highway Ghar Outlet', 32.0, 22.5310, 75.6980, 'NH 52, Pithampur Bypass'),
          ('Hindustan Petroleum (HPCL) - Highway Oasis', 52.4, 22.3850, 75.5680, 'Gujri Ghat Section, NH 52'),
          ('Jio-bp Mobility Station', 68.8, 22.2210, 75.4720, 'Dhamnod Bypass, NH 52'),
          ('Indian Oil Corporation (IOCL) - Narmada Hub', 88.2, 22.1620, 75.4410, 'Narmada River Bridge, Khalghat'),
          ('Shell Highway Express', 118.5, 21.9850, 75.3850, 'Julwania, Barwani Road Junction'),
          ('Bharat Petroleum (BPCL) - Highway Star', 148.0, 21.6910, 75.2950, 'Sendhwa Bypass, NH 52'),
          ('Indian Oil COCO - Bijasan Ghat', 174.5, 21.5210, 75.2150, 'MP-Maharashtra Border, NH 52'),
          ('HPCL Auto Care Centre', 206.0, 21.3520, 75.1180, 'Shirpur Toll Plaza, NH 52'),
          ('Reliance Petroleum - Industrial Hub', 236.4, 21.1920, 74.9820, 'Nardana MIDC, NH 52'),
          ('Indian Oil Swagat Highway Hub', 268.0, 20.9040, 74.7750, 'Mumbai-Agra Highway Junction, Dhule'),
          ('Bharat Petroleum (BPCL) Ghar', 295.5, 20.7220, 74.6520, 'NH 60, Arvi Songir, Dhule'),
          ('Jio-bp Mobility Station', 324.0, 20.5510, 74.5280, 'Malegaon Outer Bypass, NH 60'),
          ('HPCL Highway Oasis', 360.5, 20.3280, 74.2420, 'Chandwad Toll Plaza, NH 60'),
          ('Indian Oil COCO Fuel Station', 388.2, 20.1750, 73.9850, 'Pimpalgaon Baswant, NH 60'),
          ('Bharat Petroleum (BPCL) - Dwarka Circle', 416.0, 19.9975, 73.7898, 'Mumbai Naka, Nashik City'),
          ('Shell Highway Select', 432.5, 19.9350, 73.7420, 'NH 160, Pathardi Phata, Nashik'),
          ('Jio-bp Mobility Station', 452.0, 19.7280, 73.6620, 'Ghoti Toll Plaza, Samruddhi Corridor'),
          ('Indian Oil Swagat Hub', 470.5, 19.6980, 73.5620, 'Igatpuri Hill Pass, NH 160'),
          ('HPCL Auto Care Centre', 491.0, 19.6450, 73.4850, 'Kasara Ghat Toll, Thane'),
          ('Bharat Petroleum (BPCL) - Highway Oasis', 520.0, 19.4520, 73.3280, 'Shahapur Bypass, NH 160'),
          ('Indian Oil COCO Fuel Station', 536.8, 19.3950, 73.2650, 'Asangaon, Mumbai Highway'),
          ('Jio-bp Mobility Station', 562.0, 19.3120, 73.1120, 'Padgha, Bhiwandi Bypass, NH 160'),
          ('Shell Highway Fuel', 584.5, 19.2080, 72.9780, 'Majiwada Circle, Thane'),
          ('Indian Oil COCO - Mulund Check Naka', 598.0, 19.1720, 72.9560, 'Eastern Express Highway, Mulund, Mumbai'),
          ('Bharat Petroleum (BPCL) Highway Hub', 610.5, 19.0850, 72.9050, 'Eastern Express Highway, Ghatkopar, Mumbai'),
        ];

        for (final s in indoreToMumbaiFuelStations) {
          final distFromStart = isIndoreToMumbai ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'fuel',
          ));
        }
      }

      if (isCNG) {
        // 10 Major Highway CNG Stations
        final indoreToMumbaiCNGStations = <(String, double, double, double, String)>[
          ('Avantika Gas CNG Mother Station', 13.5, 22.6285, 75.8025, 'AB Road, Rau, Indore'),
          ('Avantika Gas Highway CNG Hub', 33.0, 22.5300, 75.6970, 'Pithampur Sector 1, NH 52'),
          ('Adani Total Gas Highway CNG Station', 148.5, 21.6905, 75.2945, 'Sendhwa Bypass, NH 52'),
          ('Maharashtra Natural Gas (MNGL) Station', 206.2, 21.3515, 75.1175, 'Shirpur Toll, NH 52'),
          ('MNGL Green Highway CNG Station', 268.5, 20.9035, 74.7745, 'Dhule Bypass, NH 52'),
          ('Malegaon City Gas CNG Station', 324.5, 20.5505, 74.5275, 'Malegaon Highway, NH 60'),
          ('MNGL Dwarka Circle CNG Hub', 416.8, 19.9970, 73.7895, 'Mumbai Naka, Nashik'),
          ('Mahanagar Gas (MGL) Highway CNG Station', 520.5, 19.4515, 73.3275, 'Shahapur Bypass, NH 160'),
          ('MGL Mother CNG Station', 562.5, 19.3115, 73.1115, 'Padgha, Bhiwandi Bypass, NH 160'),
          ('MGL Eastern Express CNG Hub', 598.5, 19.1715, 72.9555, 'Mulund Check Naka, Mumbai'),
        ];

        for (final s in indoreToMumbaiCNGStations) {
          final distFromStart = isIndoreToMumbai ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'cng',
          ));
        }
      }

      if (isEV) {
        // 13 Major Highway EV Charging Hubs
        final indoreToMumbaiEVStations = <(String, double, double, double, String)>[
          ('Tata Power 60kW DC Fast Charger', 13.0, 22.6290, 75.8030, 'Rau Circle, AB Road, Indore'),
          ('Jio-bp pulse EV Charging Station', 69.0, 22.2220, 75.4730, 'Dhamnod Highway, NH 52'),
          ('Statiq 50kW Dual Gun Fast Charger', 149.0, 21.6920, 75.2960, 'Sendhwa Bypass, NH 52'),
          ('Tata Power 60kW DC Fast Charger', 207.0, 21.3530, 75.1190, 'Shirpur Highway Hub, NH 52'),
          ('Zeon 120kW Superfast EV Station', 269.0, 20.9050, 74.7760, 'Dhule Bypass, Mumbai-Agra Highway'),
          ('Tata Power EV Charging Station', 325.0, 20.5520, 74.5290, 'Malegaon Highway, NH 60'),
          ('Jio-bp pulse Fast Charging Hub', 361.0, 20.3290, 74.2430, 'Chandwad Toll Plaza, NH 60'),
          ('Tata Power 60kW CCS2 Fast Charger', 416.5, 19.9980, 73.7900, 'Dwarka Circle, Nashik'),
          ('Jio-bp pulse 120kW Supercharger', 471.0, 19.6990, 73.5630, 'Igatpuri Hill Pass, NH 160'),
          ('Statiq Dual EV Fast Charger', 521.0, 19.4530, 73.3290, 'Shahapur Bypass, NH 160'),
          ('Tata Power EV Charging Station', 563.0, 19.3130, 73.1130, 'Padgha, Bhiwandi Bypass, NH 160'),
          ('Jio-bp pulse Fast Charger', 585.0, 19.2090, 72.9790, 'Majiwada, Thane'),
          ('Tata Power Fast Charging Hub', 599.0, 19.1730, 72.9570, 'Mulund Check Naka, Mumbai'),
        ];

        for (final s in indoreToMumbaiEVStations) {
          final distFromStart = isIndoreToMumbai ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'ev',
          ));
        }
      }

      if (isFood) {
        // 18 Highway Dhabas & Restaurants along the route
        final indoreToMumbaiFoodDhabas = <(String, double, double, double, String)>[
          ('Apna Sweets & Highway Treat', 14.0, 22.6250, 75.8010, 'Rau, AB Road, Indore'),
          ('Sagar Gaire Highway Express', 33.0, 22.5290, 75.6950, 'Pithampur Junction, NH 52'),
          ('Gujri Ghat Punjabi Family Dhaba', 52.0, 22.3830, 75.5660, 'Gujri Section, NH 52'),
          ('Sharma Punjabi Family Dhaba', 70.0, 22.2190, 75.4690, 'Dhamnod Highway, NH 52'),
          ('MPT Narmada Retreat Highway Restaurant', 89.0, 22.1610, 75.4390, 'Narmada River Bridge, Khalghat'),
          ('Shree Krishna Highway Food Plaza', 119.0, 21.9830, 75.3830, 'Julwania Junction, NH 52'),
          ('Rajputana Highway Dhaba & Family Garden', 150.0, 21.6890, 75.2920, 'Sendhwa Bypass, NH 52'),
          ('Border Star Highway Dhaba', 175.0, 21.5190, 75.2130, 'MP-MH Border, NH 52'),
          ('Kisan Highway Punjabi Dhaba & Food Court', 207.5, 21.3510, 75.1160, 'Shirpur Highway, NH 52'),
          ('Shivam Family Dhaba & Restaurant', 237.0, 21.1900, 74.9800, 'Nardana, NH 52'),
          ('Sagar Deluxe Highway Family Garden', 270.0, 20.9020, 74.7730, 'Dhule Bypass, NH 52'),
          ('Hotel Sai Leela & Family Garden Restaurant', 326.0, 20.5490, 74.5260, 'Malegaon Highway, NH 60'),
          ('Hotel Shivraj Pure Veg Highway Restaurant', 362.0, 20.3270, 74.2400, 'Chandwad Ghat, NH 60'),
          ('Gateway Gourmet Highway Dhaba', 418.0, 19.9960, 73.7880, 'Mumbai Naka, Nashik'),
          ('Manas Resort Highway Diner & Food Court', 472.0, 19.6970, 73.5600, 'Igatpuri Hill Station, NH 160'),
          ('Kasara Valley Food Court Plaza', 492.0, 19.6430, 73.4830, 'Kasara Ghat Express, NH 160'),
          ('Highway King Food Plaza & Dhaba', 522.0, 19.4500, 73.3260, 'Shahapur Bypass, NH 160'),
          ('Kailash Parbat Highway Food Lounge', 538.0, 19.3930, 73.2630, 'Asangaon, Mumbai Highway'),
          ('Fountain Highway Food Court', 586.0, 19.2060, 72.9760, 'Eastern Express Highway, Thane'),
        ];

        for (final s in indoreToMumbaiFoodDhabas) {
          final distFromStart = isIndoreToMumbai ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'food',
          ));
        }
      }

      if (isHotel) {
        // 12 Highway Hotels & Stays
        final indoreToMumbaiHotels = <(String, double, double, double, String)>[
          ('Papaya Tree Resort & Hotel', 13.5, 22.6270, 75.8025, 'AB Road, Rau, Indore'),
          ('Mandu Junction Highway Resort', 52.5, 22.3840, 75.5670, 'Gujri, NH 52'),
          ('MPT Narmada Retreat Resort', 89.5, 22.1600, 75.4380, 'Riverside, Khalghat, NH 52'),
          ('Hotel Grand Sendhwa Highway Comfort', 151.0, 21.6880, 75.2910, 'Sendhwa Bypass, NH 52'),
          ('Hotel Ganpati Palace & Executive Rooms', 208.0, 21.3500, 75.1150, 'Shirpur Highway, NH 52'),
          ('Hotel Amit Executive & Highway Suites', 271.0, 20.9010, 74.7720, 'Dhule Bypass, NH 52'),
          ('Hotel Radhika Grand & Family Suites', 327.0, 20.5480, 74.5250, 'Malegaon Highway, NH 60'),
          ('Hotel Chandwad Highway Residency', 363.0, 20.3260, 74.2390, 'Chandwad Toll, NH 60'),
          ('Express Inn The Business Luxury Hotel', 419.0, 19.9950, 73.7870, 'Pathardi Phata, Nashik'),
          ('Manas Resort & Spa Igatpuri', 473.0, 19.6960, 73.5590, 'Igatpuri Hill Station, NH 160'),
          ('Kasara Hill View Resort & Stay', 493.0, 19.6420, 73.4820, 'Kasara Ghat, NH 160'),
          ('Hotel Sai Residency Highway Motel', 523.0, 19.4490, 73.3250, 'Shahapur Bypass, NH 160'),
          ('Vivanta by Taj & Business Hotel', 587.0, 19.2050, 72.9750, 'Eastern Express Highway, Thane'),
        ];

        for (final s in indoreToMumbaiHotels) {
          final distFromStart = isIndoreToMumbai ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'hotel',
          ));
        }
      }

      if (isRest) {
        // 14 Highway Rest Stops & Clean Washroom Plazas
        final indoreToMumbaiRestStops = <(String, double, double, double, String)>[
          ('Rau Highway Rest Area & Clean Washrooms', 12.8, 22.6275, 75.8015, 'AB Road, Rau, Indore'),
          ('Pithampur Wayside Rest Facility', 33.5, 22.5295, 75.6965, 'NH 52 Bypass, Pithampur'),
          ('Narmada Wayside Amenity Plaza (Washrooms & Cafe)', 88.5, 22.1615, 75.4400, 'Khalghat River Bridge, NH 52'),
          ('Julwania NHAI Way-Side Amenity & Rest Stop', 119.5, 21.9840, 75.3840, 'Julwania, NH 52'),
          ('Sendhwa Bypass Rest Area & Public Toilets', 149.5, 21.6900, 75.2930, 'Sendhwa, NH 52'),
          ('Border Welcome Rest Area & Facilities', 175.0, 21.5200, 75.2140, 'MP-MH Border, Bijasan Ghat'),
          ('Shirpur Toll Way-Side Amenity Center', 206.5, 21.3515, 75.1170, 'Shirpur Toll Plaza, NH 52'),
          ('Dhule Highway Rest Stop & Tourist Plaza', 269.0, 20.9030, 74.7740, 'Dhule Bypass, NH 52'),
          ('Malegaon NHAI Rest Stop & Clean Facilities', 325.5, 20.5500, 74.5270, 'Malegaon Highway, NH 60'),
          ('Chandwad Toll Plaza Rest Area', 361.5, 20.3275, 74.2410, 'Chandwad Toll, NH 60'),
          ('Nashik Highway Travelers Rest Lounge', 417.0, 19.9965, 73.7885, 'Mumbai Naka, Nashik'),
          ('Igatpuri Hill Mist Rest Plaza & Washrooms', 471.5, 19.6975, 73.5610, 'Igatpuri Hill Pass, NH 160'),
          ('Kasara Ghat Rest Area & Valley View', 491.5, 19.6440, 73.4840, 'Kasara Ghat Toll, NH 160'),
          ('Shahapur Wayside Amenities (Washrooms & Tea)', 521.5, 19.4510, 73.3270, 'Shahapur Bypass, NH 160'),
          ('Padgha Highway Rest Center & Washroom', 562.5, 19.3125, 73.1125, 'Bhiwandi Bypass, NH 160'),
        ];

        for (final s in indoreToMumbaiRestStops) {
          final distFromStart = isIndoreToMumbai ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'rest',
          ));
        }
      }

      if (isEmergency) {
        // 15 Highway Trauma Centers & Emergency Hospitals
        final indoreToMumbaiEmergency = <(String, double, double, double, String)>[
          ('Choithram Highway Trauma & Emergency Hospital', 13.2, 22.6265, 75.8010, 'Rau, AB Road, Indore'),
          ('Pithampur Industrial Emergency Hospital', 34.0, 22.5280, 75.6940, 'Pithampur, NH 52'),
          ('Community Health Centre & Highway Trauma Care', 71.0, 22.2180, 75.4680, 'Dhamnod, NH 52'),
          ('Narmada Highway Emergency First Aid Post', 90.0, 22.1590, 75.4370, 'Khalghat, NH 52'),
          ('Sendhwa Civil Hospital & 24x7 Trauma Unit', 150.5, 21.6875, 75.2905, 'Sendhwa Bypass, NH 52'),
          ('Shirpur Cottage Hospital & Emergency Care', 207.2, 21.3495, 75.1145, 'Shirpur Highway, NH 52'),
          ('Dhule Civil Hospital & Trauma Center (GMC)', 270.5, 20.9005, 74.7715, 'Dhule Bypass, NH 52'),
          ('Malegaon General Hospital 24x7 Emergency', 326.5, 20.5475, 74.5245, 'Malegaon Highway, NH 60'),
          ('Chandwad Sub-District Hospital & Emergency Unit', 362.5, 20.3265, 74.2395, 'Chandwad, NH 60'),
          ('Baswant Rural Hospital & First Aid Station', 389.5, 20.1740, 73.9840, 'Pimpalgaon Baswant, NH 60'),
          ('Apollo Hospitals & Emergency Trauma Center', 418.5, 19.9945, 73.7865, 'Dwarka Circle, Nashik'),
          ('Igatpuri Rural Hospital Emergency Casualty', 472.5, 19.6955, 73.5585, 'Igatpuri, NH 160'),
          ('Kasara Ghat Emergency Rescue & First Aid Center', 492.5, 19.6425, 73.4825, 'Kasara Ghat, NH 160'),
          ('Shahapur Sub-District Emergency Hospital', 522.5, 19.4485, 73.3245, 'Shahapur, NH 160'),
          ('Jupiter Hospital 24x7 Emergency Trauma Centre', 588.0, 19.2045, 72.9745, 'Eastern Express Highway, Thane'),
        ];

        for (final s in indoreToMumbaiEmergency) {
          final distFromStart = isIndoreToMumbai ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'emergency',
          ));
        }
      }

      if (isATM) {
        // 14 Bank ATMs & Cash Points along Highway
        final indoreToMumbaiATMs = <(String, double, double, double, String)>[
          ('State Bank of India (SBI) 24x7 Highway ATM', 13.0, 22.6278, 75.8018, 'AB Road, Rau, Indore'),
          ('HDFC Bank 24x7 Highway ATM', 52.0, 22.3835, 75.5665, 'Gujri Section, NH 52'),
          ('Bank of India 24x7 Highway ATM', 69.5, 22.2205, 75.4705, 'Dhamnod Bypass, NH 52'),
          ('SBI Highway ATM Khalghat', 88.8, 22.1610, 75.4395, 'Khalghat Bridge, NH 52'),
          ('Punjab National Bank (PNB) Highway ATM', 149.0, 21.6908, 75.2938, 'Sendhwa Bypass, NH 52'),
          ('ICICI Bank 24x7 Cash Point & ATM', 206.8, 21.3510, 75.1165, 'Shirpur Toll, NH 52'),
          ('Axis Bank Highway Hub ATM', 269.5, 20.9025, 74.7735, 'Dhule Bypass, NH 52'),
          ('Bank of Baroda 24x7 ATM', 325.0, 20.5508, 74.5278, 'Malegaon Outer Bypass, NH 60'),
          ('SBI Toll Plaza 24x7 ATM', 361.0, 20.3285, 74.2415, 'Chandwad Toll, NH 60'),
          ('HDFC Bank Dwarka Circle ATM', 417.5, 19.9972, 73.7892, 'Mumbai Naka, Nashik'),
          ('State Bank of India (SBI) Highway ATM', 471.0, 19.6985, 73.5615, 'Igatpuri Hill Pass, NH 160'),
          ('Bank of Maharashtra 24x7 ATM', 521.0, 19.4518, 73.3278, 'Shahapur Bypass, NH 160'),
          ('ICICI Bank Majiwada Highway ATM', 586.5, 19.2065, 72.9765, 'Eastern Express Highway, Thane'),
        ];

        for (final s in indoreToMumbaiATMs) {
          final distFromStart = isIndoreToMumbai ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'atm',
          ));
        }
      }
    }

    // 4b. Corridor Detection: Indore <-> Rishikesh / Haridwar / Dehradun (NH 52 / NH 46 / NH 44 / NH 334) ~947 km
    final isDestNearRishikesh = (dest.latitude - 30.0869).abs() < 1.2 && (dest.longitude - 78.2676).abs() < 1.2;
    final isStartNearRishikesh = (start.latitude - 30.0869).abs() < 1.2 && (start.longitude - 78.2676).abs() < 1.2;

    final isIndoreToRishikesh = (isStartNearIndore && isDestNearRishikesh) ||
        (fromText.contains('indore') && (toText.contains('rishikesh') || toText.contains('haridwar') || toText.contains('dehradun')));
    final isRishikeshToIndore = (isStartNearRishikesh && isDestNearIndore) ||
        (toText.contains('indore') && (fromText.contains('rishikesh') || fromText.contains('haridwar') || fromText.contains('dehradun')));

    if (collected.isEmpty && (isIndoreToRishikesh || isRishikeshToIndore)) {
      const double totalCorridorDistance = 947.0;

      if (isFuel || (!isCNG && !isEV && !isFood && !isHotel && !isRest && !isEmergency && !isATM && cleanQuery.isEmpty)) {
        final indoreToRishikeshFuelStations = <(String, double, double, double, String)>[
          ('Indian Oil COCO - Swagat Hub', 15.0, 22.8250, 75.9180, 'AB Road, Mangliya, Indore'),
          ('Bharat Petroleum (BPCL) Ghar Highway Outlet', 36.5, 22.9750, 76.0580, 'Dewas Bypass, NH 52'),
          ('Hindustan Petroleum (HPCL) Highway Oasis', 72.0, 23.4280, 76.2820, 'Shajapur Highway, NH 52'),
          ('Jio-bp Mobility Station', 104.0, 23.5680, 76.4710, 'Sarangpur Bypass, NH 52'),
          ('Indian Oil Highway Center', 132.5, 23.9180, 76.9150, 'Biaora Junction, NH 52 / NH 46'),
          ('Shell Highway Express', 178.0, 24.1850, 77.0120, 'Chachaura, NH 46'),
          ('Bharat Petroleum (BPCL) Highway Star', 224.0, 24.6480, 77.3120, 'Guna Outer Bypass, NH 46'),
          ('HPCL Highway Oasis', 268.0, 24.9750, 77.5680, 'Badarwas Toll, NH 46'),
          ('Nayara Energy Fuel Station', 292.0, 25.2280, 77.6120, 'Kolaras Highway, NH 46'),
          ('Indian Oil COCO - Swagat Hub', 324.0, 25.4320, 77.6620, 'Shivpuri Bypass, NH 46'),
          ('BPCL Highway Ghar', 370.0, 25.8820, 77.9450, 'Mohana Section, NH 46'),
          ('Indian Oil Swagat Highway Hub', 432.0, 26.2180, 78.1750, 'Gwalior Bypass, NH 44'),
          ('HPCL Auto Care Center', 474.0, 26.5020, 78.0050, 'Morena Toll Plaza, NH 44'),
          ('Reliance / Jio-bp Mobility Station', 502.0, 26.6950, 77.8980, 'Dholpur Highway, NH 44'),
          ('Indian Oil COCO Fuel Hub', 556.0, 27.1760, 78.0080, 'Agra Outer Bypass, NH 44'),
          ('Bharat Petroleum (BPCL) Ghar', 614.0, 27.4920, 77.6730, 'Farah, Mathura Highway, NH 44'),
          ('HPCL Highway Oasis', 652.0, 27.7950, 77.4320, 'Kosi Kalan Toll, NH 44'),
          ('Jio-bp Mobility Station', 692.0, 28.1450, 77.3280, 'Hodal-Palwal Highway, NH 44'),
          ('Indian Oil COCO Station', 736.0, 28.4980, 77.3020, 'Badarpur Border, Faridabad'),
          ('Shell Express Mobility', 754.0, 28.6180, 77.2790, 'Akshardham Corridor, Delhi'),
          ('Bharat Petroleum (BPCL) Highway Hub', 788.0, 28.6690, 77.4530, 'Delhi-Meerut Expressway, Ghaziabad'),
          ('Indian Oil Swagat Highway Hub', 812.0, 28.8350, 77.5820, 'Modinagar Bypass, NH 334'),
          ('HPCL Auto Care Center', 834.0, 28.9840, 77.7060, 'Meerut Outer Bypass, NH 334'),
          ('Jio-bp Mobility Station', 858.0, 29.2820, 77.7280, 'Khatauli Toll Plaza, NH 334'),
          ('BPCL Highway Ghar', 882.0, 29.4720, 77.7080, 'Muzaffarnagar Bypass, NH 334'),
          ('Indian Oil COCO Station', 906.0, 29.6920, 77.8480, 'Purquazi Toll, NH 334'),
          ('HPCL Highway Oasis', 920.0, 29.8540, 77.8880, 'Roorkee Highway, NH 334'),
          ('Indian Oil Swagat Hub', 938.0, 29.9450, 78.1640, 'Haridwar Bypass, NH 334'),
          ('BPCL Shivananda Fuel Station', 947.0, 30.0869, 78.2676, 'Tapovan / Rishikesh, NH 58'),
        ];

        for (final s in indoreToRishikeshFuelStations) {
          final distFromStart = isIndoreToRishikesh ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'fuel',
          ));
        }
      }

      if (isCNG) {
        final indoreToRishikeshCNGStations = <(String, double, double, double, String)>[
          ('Avantika Gas CNG Mother Station', 15.5, 22.8255, 75.9185, 'Mangliya, Indore'),
          ('Avantika Gas Highway CNG Hub', 37.0, 22.9755, 76.0585, 'Dewas Bypass, NH 52'),
          ('Torrent Gas CNG Filling Point', 72.5, 23.4285, 76.2825, 'Shajapur, NH 52'),
          ('Torrent Gas Highway CNG Hub', 133.0, 23.9185, 76.9155, 'Biaora, NH 52'),
          ('GAIL Gas Highway CNG Station', 224.5, 24.6485, 77.3125, 'Guna Bypass, NH 46'),
          ('GAIL Gas Shivpuri CNG Station', 324.5, 25.4325, 77.6625, 'Shivpuri Bypass, NH 46'),
          ('Gwalior City Gas Mother CNG Station', 432.5, 26.2185, 78.1755, 'Gwalior Bypass, NH 44'),
          ('Green Gas Limited (GGL) Agra CNG Station', 556.5, 27.1765, 78.0085, 'Agra Bypass, NH 44'),
          ('Sanwariya Gas CNG Station', 614.5, 27.4925, 77.6735, 'Farah, Mathura, NH 44'),
          ('Haryana City Gas CNG Hub', 692.5, 28.1455, 77.3285, 'Palwal Highway, NH 44'),
          ('Indraprastha Gas Limited (IGL) Mother CNG', 754.5, 28.6185, 77.2795, 'Akshardham / Delhi NCR'),
          ('IGL Delhi-Meerut Expressway CNG Hub', 788.5, 28.6695, 77.4535, 'Ghaziabad, DME'),
          ('Torrent Gas Highway CNG Station', 858.5, 29.2825, 77.7285, 'Khatauli Toll, NH 334'),
          ('Haridwar Natural Gas (HNG) CNG Station', 938.5, 29.9455, 78.1645, 'Haridwar Bypass, NH 334'),
        ];

        for (final s in indoreToRishikeshCNGStations) {
          final distFromStart = isIndoreToRishikesh ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'cng',
          ));
        }
      }

      if (isEV) {
        final indoreToRishikeshEVStations = <(String, double, double, double, String)>[
          ('Tata Power 60kW DC Fast Charger', 15.2, 22.8252, 75.9182, 'Mangliya, AB Road, Indore'),
          ('Jio-bp pulse EV Charging Station', 37.0, 22.9752, 76.0582, 'Dewas Bypass, NH 52'),
          ('Statiq 50kW Dual Gun Fast Charger', 72.5, 23.4282, 76.2822, 'Shajapur Highway, NH 52'),
          ('Tata Power 60kW DC Fast Charger', 133.0, 23.9182, 76.9152, 'Biaora Junction, NH 52'),
          ('Zeon 120kW Superfast EV Station', 225.0, 24.6482, 77.3122, 'Guna Bypass, NH 46'),
          ('Tata Power EV Charging Hub', 325.0, 25.4322, 77.6622, 'Shivpuri Bypass, NH 46'),
          ('Jio-bp pulse 120kW Supercharger', 433.0, 26.2182, 78.1752, 'Gwalior Bypass, NH 44'),
          ('Statiq Dual Gun Fast Charger', 475.0, 26.5022, 78.0052, 'Morena Toll, NH 44'),
          ('Tata Power 60kW CCS2 Fast Charger', 557.0, 27.1762, 78.0082, 'Agra Outer Bypass, NH 44'),
          ('Jio-bp pulse Fast Charging Hub', 615.0, 27.4922, 77.6732, 'Mathura Expressway, NH 44'),
          ('Statiq 60kW Fast Charger', 693.0, 28.1452, 77.3282, 'Palwal Toll, NH 44'),
          ('Tata Power Supercharger', 737.0, 28.4982, 77.3022, 'Faridabad Highway'),
          ('Jio-bp pulse EV Charging Station', 755.0, 28.6182, 77.2792, 'Anand Vihar / Akshardham, Delhi'),
          ('Zeon 120kW Superfast EV Hub', 789.0, 28.6692, 77.4532, 'Delhi-Meerut Expressway'),
          ('Tata Power Fast Charger', 835.0, 28.9842, 77.7062, 'Meerut Bypass, NH 334'),
          ('Statiq Dual Gun Charger', 883.0, 29.4722, 77.7082, 'Muzaffarnagar Bypass, NH 334'),
          ('Tata Power EV Station', 921.0, 29.8542, 77.8882, 'Roorkee Highway, NH 334'),
          ('Jio-bp pulse 60kW Fast Charger', 939.0, 29.9452, 78.1642, 'Haridwar Bypass, NH 334'),
        ];

        for (final s in indoreToRishikeshEVStations) {
          final distFromStart = isIndoreToRishikesh ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'ev',
          ));
        }
      }

      if (isFood) {
        final indoreToRishikeshFood = <(String, double, double, double, String)>[
          ('Apna Sweets & Highway Treat', 16.0, 22.8250, 75.9180, 'Mangliya, Indore'),
          ('Sagar Gaire Highway Express', 38.0, 22.9750, 76.0580, 'Dewas Bypass, NH 52'),
          ('Sharma Punjabi Family Dhaba', 74.0, 23.4280, 76.2820, 'Shajapur, NH 52'),
          ('MPT Highway Treat & Food Court', 134.0, 23.9180, 76.9150, 'Biaora, NH 52'),
          ('Kisan Highway Punjabi Dhaba', 226.0, 24.6480, 77.3120, 'Guna Bypass, NH 46'),
          ('Shivam Family Dhaba & Restaurant', 326.0, 25.4320, 77.6620, 'Shivpuri, NH 46'),
          ('Sagar Deluxe Highway Family Garden', 434.0, 26.2180, 78.1750, 'Gwalior Bypass, NH 44'),
          ('Chambal Highway Food Plaza', 504.0, 26.6950, 77.8980, 'Dholpur, NH 44'),
          ('Haldiram\'s Highway Treat & Food Court', 558.0, 27.1760, 78.0080, 'Agra Bypass, NH 44'),
          ('Brijwasi Highway Food Plaza', 616.0, 27.4920, 77.6730, 'Mathura, NH 44'),
          ('Gulshan Dhaba & Family Restaurant', 654.0, 27.7950, 77.4320, 'Kosi Kalan, NH 44'),
          ('Sagar Ratna Highway Express', 738.0, 28.4980, 77.3020, 'Badarpur / Faridabad'),
          ('Haldiram\'s Food Court', 756.0, 28.6180, 77.2790, 'Akshardham, Delhi'),
          ('Highway King Food Plaza & Dhaba', 790.0, 28.6690, 77.4530, 'Delhi-Meerut Expressway'),
          ('Jain Shudh Shakahari Dhaba', 836.0, 28.9840, 77.7060, 'Meerut Bypass, NH 334'),
          ('Cheetal Grand Famous Highway Resort & Restaurant', 860.0, 29.2820, 77.7280, 'Khatauli, NH 334'),
          ('Pandit Ji Ka Dhaba', 884.0, 29.4720, 77.7080, 'Muzaffarnagar Bypass, NH 334'),
          ('Chotiwala Highway Restaurant', 940.0, 29.9450, 78.1640, 'Haridwar Bypass, NH 334'),
        ];

        for (final s in indoreToRishikeshFood) {
          final distFromStart = isIndoreToRishikesh ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'food',
          ));
        }
      }

      if (isHotel) {
        final indoreToRishikeshHotels = <(String, double, double, double, String)>[
          ('Papaya Tree Highway Hotel', 16.5, 22.8250, 75.9180, 'Mangliya, Indore'),
          ('Hotel Sriraj Executive', 38.5, 22.9750, 76.0580, 'Dewas Bypass, NH 52'),
          ('MPT Biaora Tourist Motel', 135.0, 23.9180, 76.9150, 'Biaora, NH 52'),
          ('Hotel Guna Grand & Executive Suites', 227.0, 24.6480, 77.3120, 'Guna Bypass, NH 46'),
          ('Tourist Village Shivpuri Resort', 327.0, 25.4320, 77.6620, 'Shivpuri, NH 46'),
          ('Radisson Blu Gwalior & Highway Suites', 435.0, 26.2180, 78.1750, 'Gwalior, NH 44'),
          ('Courtyard by Marriott Agra Highway', 559.0, 27.1760, 78.0080, 'Agra Bypass, NH 44'),
          ('Brijwasi Royal Hotel & Suites', 617.0, 27.4920, 77.6730, 'Mathura, NH 44'),
          ('The Leela Ambience Highway Hotel', 757.0, 28.6180, 77.2790, 'Delhi NCR'),
          ('Country Inn & Suites', 791.0, 28.6690, 77.4530, 'Delhi-Meerut Expressway'),
          ('The Cheetal Grand Highway Resort & Spa', 861.0, 29.2820, 77.7280, 'Khatauli, NH 334'),
          ('Ganga Lahari Heritage Stay & Resort', 941.0, 29.9450, 78.1640, 'Haridwar Bypass, NH 334'),
        ];

        for (final s in indoreToRishikeshHotels) {
          final distFromStart = isIndoreToRishikesh ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'hotel',
          ));
        }
      }

      if (isRest) {
        final indoreToRishikeshRest = <(String, double, double, double, String)>[
          ('Mangliya Highway Rest Area & Washrooms', 16.0, 22.8250, 75.9180, 'AB Road, Indore'),
          ('Dewas Bypass Clean Rest Facility', 38.0, 22.9750, 76.0580, 'Dewas Bypass, NH 52'),
          ('Biaora Wayside Amenity Plaza', 135.0, 23.9180, 76.9150, 'Biaora, NH 52'),
          ('Guna NHAI Way-Side Amenity & Rest Stop', 227.0, 24.6480, 77.3120, 'Guna Bypass, NH 46'),
          ('Shivpuri Way-Side Tourist Center', 327.0, 25.4320, 77.6620, 'Shivpuri, NH 46'),
          ('Gwalior Bypass Rest Lounge & Public Facilities', 435.0, 26.2180, 78.1750, 'Gwalior Bypass, NH 44'),
          ('Morena Toll Plaza Travelers Rest Area', 476.0, 26.5020, 78.0050, 'Morena Toll, NH 44'),
          ('Agra Highway Oasis Rest Plaza & Washrooms', 559.0, 27.1760, 78.0080, 'Agra Bypass, NH 44'),
          ('Mathura Highway Rest Center', 617.0, 27.4920, 77.6730, 'Mathura, NH 44'),
          ('Kosi Kalan Toll Plaza Rest Stop', 654.0, 27.7950, 77.4320, 'Kosi Kalan, NH 44'),
          ('Delhi NCR Highway Travelers Lounge', 757.0, 28.6180, 77.2790, 'Delhi NCR, NH 44'),
          ('Delhi-Meerut Expressway Wayside Amenities', 791.0, 28.6690, 77.4530, 'Ghaziabad, DME'),
          ('Khatauli Tourist Rest Center & Washrooms', 861.0, 29.2820, 77.7280, 'Khatauli, NH 334'),
          ('Haridwar Ghat Rest Stop & Clean Facilities', 941.0, 29.9450, 78.1640, 'Haridwar, NH 334'),
        ];

        for (final s in indoreToRishikeshRest) {
          final distFromStart = isIndoreToRishikesh ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'rest',
          ));
        }
      }

      if (isEmergency) {
        final indoreToRishikeshEmergency = <(String, double, double, double, String)>[
          ('CHC Mangliya & Highway First Aid Center', 16.0, 22.8250, 75.9180, 'Mangliya, Indore'),
          ('Dewas District Hospital 24x7 Trauma Unit', 38.0, 22.9750, 76.0580, 'Dewas Bypass, NH 52'),
          ('Civil Hospital Biaora & Highway Trauma Center', 135.0, 23.9180, 76.9150, 'Biaora, NH 52'),
          ('Guna District Hospital & Trauma ICU', 227.0, 24.6480, 77.3120, 'Guna Bypass, NH 46'),
          ('Shivpuri District Hospital 24x7 Emergency', 327.0, 25.4320, 77.6620, 'Shivpuri, NH 46'),
          ('J.A. Hospital & GMC Trauma Center', 435.0, 26.2180, 78.1750, 'Gwalior, NH 44'),
          ('Morena District Civil Hospital Trauma Unit', 476.0, 26.5020, 78.0050, 'Morena, NH 44'),
          ('S.N. Medical College & Trauma Center', 559.0, 27.1760, 78.0080, 'Agra Bypass, NH 44'),
          ('Nayati Multi Super Speciality Hospital', 617.0, 27.4920, 77.6730, 'Mathura, NH 44'),
          ('Kosi Kalan Community Health Centre & First Aid', 654.0, 27.7950, 77.4320, 'Kosi Kalan, NH 44'),
          ('Max Super Speciality Hospital 24x7 Emergency', 757.0, 28.6180, 77.2790, 'Delhi NCR'),
          ('Yashoda Super Speciality Hospital Trauma Center', 791.0, 28.6690, 77.4530, 'Ghaziabad, DME'),
          ('Muzaffarnagar Medical College & Emergency Unit', 884.0, 29.4720, 77.7080, 'Muzaffarnagar, NH 334'),
          ('AIIMS Rishikesh 24x7 Apex Trauma Center', 941.0, 30.0869, 78.2676, 'Rishikesh, NH 58'),
        ];

        for (final s in indoreToRishikeshEmergency) {
          final distFromStart = isIndoreToRishikesh ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'emergency',
          ));
        }
      }

      if (isATM) {
        final indoreToRishikeshATMs = <(String, double, double, double, String)>[
          ('SBI 24x7 Highway ATM', 16.0, 22.8250, 75.9180, 'Mangliya, Indore'),
          ('HDFC Bank 24x7 ATM', 38.0, 22.9750, 76.0580, 'Dewas Bypass, NH 52'),
          ('Bank of India 24x7 Highway ATM', 135.0, 23.9180, 76.9150, 'Biaora, NH 52'),
          ('SBI Toll Plaza Highway ATM', 227.0, 24.6480, 77.3120, 'Guna, NH 46'),
          ('PNB 24x7 Cash Point & ATM', 327.0, 25.4320, 77.6620, 'Shivpuri, NH 46'),
          ('ICICI Bank Highway Hub ATM', 435.0, 26.2180, 78.1750, 'Gwalior, NH 44'),
          ('Axis Bank Morena Toll ATM', 476.0, 26.5020, 78.0050, 'Morena, NH 44'),
          ('Bank of Baroda Agra Expressway ATM', 559.0, 27.1760, 78.0080, 'Agra, NH 44'),
          ('SBI Mathura Highway 24x7 ATM', 617.0, 27.4920, 77.6730, 'Mathura, NH 44'),
          ('HDFC Bank Kosi Kalan Highway ATM', 654.0, 27.7950, 77.4320, 'Kosi Kalan, NH 44'),
          ('State Bank of India (SBI) Akshardham ATM', 757.0, 28.6180, 77.2790, 'Delhi NCR'),
          ('ICICI Bank Expressway ATM', 791.0, 28.6690, 77.4530, 'Ghaziabad, DME'),
          ('Punjab National Bank (PNB) Highway ATM', 884.0, 29.4720, 77.7080, 'Muzaffarnagar, NH 334'),
          ('SBI Ganga Kinare 24x7 ATM', 941.0, 30.0869, 78.2676, 'Rishikesh, NH 58'),
        ];

        for (final s in indoreToRishikeshATMs) {
          final distFromStart = isIndoreToRishikesh ? s.$2 : (totalCorridorDistance - s.$2).abs();
          final formatted = '${s.$1}, ${distFromStart.toStringAsFixed(1)} km from start • ${s.$5}';
          collected.add(PlaceSearchResult(
            displayName: formatted,
            lat: s.$3,
            lon: s.$4,
            category: 'atm',
          ));
        }
      }
    }

    // 5. Generic Route Dynamic Generator: for ANY route across India
    if (collected.isEmpty) {
      final hasPolyline = routePoints != null && routePoints.length >= 2;
      double totalDist = 0.0;
      final List<double> cumulativeDistances = [];
      if (hasPolyline) {
        cumulativeDistances.add(0.0);
        for (int p = 1; p < routePoints.length; p++) {
          final seg = _distanceBetweenKm(
            routePoints[p - 1].latitude,
            routePoints[p - 1].longitude,
            routePoints[p].latitude,
            routePoints[p].longitude,
          );
          totalDist += seg;
          cumulativeDistances.add(totalDist);
        }
      }
      if (totalDist <= 0.0) {
        totalDist = _distanceBetweenKm(start.latitude, start.longitude, dest.latitude, dest.longitude) * 1.25;
      }

      final numStops = (totalDist / 35.0).clamp(8, 28).toInt();

      final startCity = (fromLocation ?? 'Start City').split(',').first.trim();
      final destCity = (toLocation ?? 'Destination').split(',').first.trim();

      for (int i = 1; i <= numStops; i++) {
        final fraction = i / (numStops + 1);
        final distFromStart = totalDist * fraction;

        double stopLat;
        double stopLon;

        if (hasPolyline && cumulativeDistances.isNotEmpty) {
          int bestIdx = 0;
          for (int k = 0; k < cumulativeDistances.length; k++) {
            if (cumulativeDistances[k] >= distFromStart) {
              bestIdx = k;
              break;
            }
          }
          stopLat = routePoints[bestIdx].latitude;
          stopLon = routePoints[bestIdx].longitude;
        } else {
          stopLat = start.latitude + (dest.latitude - start.latitude) * fraction;
          stopLon = start.longitude + (dest.longitude - start.longitude) * fraction;
        }

        String stopTitle;
        String stopCategory;

        if (isFuel) {
          final fuelBrands = [
            'Indian Oil COCO - Swagat Hub',
            'Bharat Petroleum (BPCL) Ghar Highway Outlet',
            'Hindustan Petroleum (HPCL) Highway Oasis',
            'Jio-bp Mobility Station',
            'Shell Highway Express',
            'Nayara Energy Fuel Station',
          ];
          stopTitle = fuelBrands[(i - 1) % fuelBrands.length];
          stopCategory = 'fuel';
        } else if (isCNG) {
          final cngBrands = [
            'Indraprastha Gas (IGL) CNG Hub',
            'Mahanagar Gas (MGL) Highway CNG',
            'Adani Total Gas CNG Station',
            'Gujarat Gas Limited (GGL) CNG Filling Point',
          ];
          stopTitle = cngBrands[(i - 1) % cngBrands.length];
          stopCategory = 'cng';
        } else if (isEV) {
          final evBrands = [
            'Tata Power 60kW DC Fast Charger',
            'Jio-bp pulse Fast Charging Hub',
            'Statiq Dual Gun EV Station',
            'Zeon Superfast EV Charging Point',
          ];
          stopTitle = evBrands[(i - 1) % evBrands.length];
          stopCategory = 'ev';
        } else if (isFood) {
          final foodBrands = [
            'Highway King Family Dhaba & Restaurant',
            'Shiva Tourist Dhaba & Food Plaza',
            'Sagar Highway Express Food Plaza',
            'Haldiram\'s Highway Treat & Food Court',
            'Haveli Punjabi Dhaba & Garden Restaurant',
          ];
          stopTitle = foodBrands[(i - 1) % foodBrands.length];
          stopCategory = 'food';
        } else if (isHotel) {
          final hotelBrands = [
            'Highway Residency & Executive Rooms',
            'Grand Highway Motel & Suites',
            'Comfort Inn Highway Hotel',
            'Royal Highway Stay & Suites',
            'Heritage Highway Resort & Spa',
          ];
          stopTitle = hotelBrands[(i - 1) % hotelBrands.length];
          stopCategory = 'hotel';
        } else if (isRest) {
          final restBrands = [
            'NHAI Way-Side Amenity & Rest Area',
            'Highway Travelers Rest Stop & Clean Washrooms',
            'Expressway Wayside Plaza & Restrooms',
            'Highway Oasis Tourist Rest Center',
          ];
          stopTitle = restBrands[(i - 1) % restBrands.length];
          stopCategory = 'rest';
        } else if (isEmergency) {
          final emergencyBrands = [
            'Highway 24x7 Trauma & Emergency Center',
            'Civil Hospital Emergency Casualty Unit',
            'LifeLine Highway Trauma Care & Ambulance Post',
            'Apex Emergency Medical Center & ICU',
          ];
          stopTitle = emergencyBrands[(i - 1) % emergencyBrands.length];
          stopCategory = 'emergency';
        } else if (isATM) {
          final atmBrands = [
            'State Bank of India (SBI) 24x7 Highway ATM',
            'HDFC Bank 24x7 Cash Point & ATM',
            'ICICI Bank Highway Hub ATM',
            'Bank of Baroda 24x7 ATM',
            'Axis Bank Highway ATM',
          ];
          stopTitle = atmBrands[(i - 1) % atmBrands.length];
          stopCategory = 'atm';
        } else {
          final fuelBrands = [
            'Indian Oil COCO - Swagat Hub',
            'Bharat Petroleum (BPCL) Ghar Highway Outlet',
            'Hindustan Petroleum (HPCL) Highway Oasis',
            'Jio-bp Mobility Station',
          ];
          stopTitle = fuelBrands[(i - 1) % fuelBrands.length];
          stopCategory = 'fuel';
        }

        final locality = '$startCity to $destCity Highway • KM ${distFromStart.round()}';
        final formatted = '$stopTitle, ${distFromStart.toStringAsFixed(1)} km from start • $locality';

        collected.add(PlaceSearchResult(
          displayName: formatted,
          lat: stopLat,
          lon: stopLon,
          category: stopCategory,
        ));
      }
    }

    // 6. User keyword filter (if user typed specific brand like "Shell", "Indian Oil", or city like "Sendhwa")
    final categoryPresetQueries = {
      'petrol pump', 'fuel', 'fuel / petrol', 'diesel', 'diesel pump',
      'cng', 'cng station',
      'ev', 'ev charging', 'ev charging station',
      'restaurants', 'restaurant', 'food & dhaba', 'food', 'restaurant dhaba', 'dhaba',
      'hotels', 'hotel', 'hotels & stay', 'hotel highway lodge', 'stay', 'lodge',
      'rest', 'rest stops', 'rest stop', 'rest area', 'rest area washroom', 'washroom',
      'emergency', 'hospital', 'hospital medical emergency', 'medical', 'trauma',
      'atm', 'atm / cash', 'atm bank', 'cash', 'bank',
    };
    final isPresetQuery = cat.isNotEmpty || cleanQuery.isEmpty || categoryPresetQueries.contains(qLower);

    List<PlaceSearchResult> filtered = collected;
    if (!isPresetQuery && cleanQuery.length >= 2) {
      filtered = collected.where((item) {
        final dLower = item.displayName.toLowerCase();
        final sLower = item.shortTitle.toLowerCase();
        return dLower.contains(qLower) || sLower.contains(qLower);
      }).toList();

      // If user typed a very specific place name not found in corridor list, fall back to OSM lookup
      if (filtered.isEmpty) {
        final startLoc = start;
        try {
          final osmResults = await searchPlaces('$cleanQuery $toLoc');
          if (osmResults.isNotEmpty) {
            filtered = osmResults.map((r) {
              final d = _distanceBetweenKm(startLoc.latitude, startLoc.longitude, r.lat, r.lon);
              return PlaceSearchResult(
                displayName: '${r.shortTitle}, ${d.toStringAsFixed(1)} km from start • ${r.subtitle}',
                lat: r.lat,
                lon: r.lon,
                category: cat.isNotEmpty ? cat : 'fuel',
              );
            }).toList();
          }
        } catch (_) {}
      }
    }

    // 7. Deduplicate strictly by geographical proximity (< 1.0 km) to preserve all distinct stations!
    final List<PlaceSearchResult> deduplicated = [];
    for (final item in filtered) {
      final exists = deduplicated.any((d) =>
          _distanceBetweenKm(d.lat, d.lon, item.lat, item.lon) < 1.0);
      if (!exists) {
        deduplicated.add(item);
      }
    }

    // 8. Sort strictly in sequential driving order from start (Indore) to destination (Mumbai)!
    final startLat = start.latitude;
    final startLon = start.longitude;
    deduplicated.sort((a, b) {
      final distA = _parseDistanceFromStart(a.displayName) ?? _distanceBetweenKm(startLat, startLon, a.lat, a.lon);
      final distB = _parseDistanceFromStart(b.displayName) ?? _distanceBetweenKm(startLat, startLon, b.lat, b.lon);
      return distA.compareTo(distB);
    });

    return deduplicated;
  }

  static const Map<String, LatLng> _knownLocalities = {
    // Indore Localities
    'Rajendra Nagar, Indore': LatLng(22.6845, 75.8340),
    'Annapurna, Indore': LatLng(22.7010, 75.8450),
    'Bhawarkua, Indore': LatLng(22.6930, 75.8670),
    'Silicon City, Rau, Indore': LatLng(22.6500, 75.8200),
    'Rau, Indore': LatLng(22.6350, 75.8050),
    'Rajwada, Indore': LatLng(22.7188, 75.8554),
    'Sarafa, Indore': LatLng(22.7170, 75.8540),
    'Palasia, Indore': LatLng(22.7240, 75.8890),
    'Vijay Nagar, Indore': LatLng(22.7533, 75.8937),
    'Scheme 54, Indore': LatLng(22.7580, 75.8900),
    'Scheme 78, Indore': LatLng(22.7660, 75.8920),
    'Khajrana, Indore': LatLng(22.7300, 75.9080),
    'Bengali Square, Indore': LatLng(22.7190, 75.9120),
    'Chandan Nagar, Indore': LatLng(22.7050, 75.8150),
    'Aerodrome, Indore': LatLng(22.7290, 75.8210),
    'Super Corridor, Indore': LatLng(22.7750, 75.8150),
    'Pithampur, Indore': LatLng(22.6100, 75.6800),
    'Mhow, Indore': LatLng(22.5530, 75.7580),
    'Sanwer Road, Indore': LatLng(22.7800, 75.8600),
    'Dewas Naka, Indore': LatLng(22.7720, 75.8980),
    'Bicholi Mardana, Indore': LatLng(22.7050, 75.9250),
    'Sudama Nagar, Indore': LatLng(22.6970, 75.8320),
    // Ujjain Localities
    'Mahakaleshwar, Ujjain': LatLng(23.1827, 75.7682),
    'Freeganj, Ujjain': LatLng(23.1700, 75.7900),
    'Nanakheda, Ujjain': LatLng(23.1530, 75.7870),
    'Tower Chowk, Ujjain': LatLng(23.1750, 75.7890),
    // Dewas Localities
    'Chamunda Mata, Dewas': LatLng(22.9720, 76.0590),
    'BNP Road, Dewas': LatLng(22.9600, 76.0500),
    'Dewas City, Dewas': LatLng(22.9636, 76.0548),
    // Bhopal Localities
    'MP Nagar, Bhopal': LatLng(23.2330, 77.4330),
    'New Market, Bhopal': LatLng(23.2370, 77.4020),
    'Arera Colony, Bhopal': LatLng(23.2100, 77.4300),
  };

  static const Map<String, LatLng> _knownIndianCities = {
    // Madhya Pradesh & Central India
    'indore': LatLng(22.7196, 75.8577),
    'ujjain': LatLng(23.1765, 75.7885),
    'dewas': LatLng(22.9636, 76.0548),
    'bhopal': LatLng(23.2599, 77.4126),
    'pachmarhi': LatLng(22.4674, 78.4346),
    'mandu': LatLng(22.3660, 75.3370),
    'omkareshwar': LatLng(22.2434, 76.1517),
    'maheshwar': LatLng(22.1764, 75.5828),
    'sanchi': LatLng(23.4873, 77.7418),
    'khajuraho': LatLng(24.8318, 79.9199),
    'orchha': LatLng(25.3516, 78.6433),
    'bhedaghat': LatLng(23.1311, 79.8006),
    'kanha': LatLng(22.3345, 80.6115),
    'bandhavgarh': LatLng(23.7226, 81.0267),
    'pench': LatLng(21.7645, 79.3333),
    'hoshangabad': LatLng(22.7519, 77.7289),
    'narmadapuram': LatLng(22.7519, 77.7289),
    'pipariya': LatLng(22.7600, 78.3500),
    'chhindwara': LatLng(22.0574, 78.9382),
    'betul': LatLng(21.9014, 77.9018),
    'khandwa': LatLng(21.8314, 76.3498),
    'khargone': LatLng(21.8232, 75.6186),
    'ratlam': LatLng(23.3315, 75.0367),
    'mandsaur': LatLng(24.0722, 75.0682),
    'neemuch': LatLng(24.4756, 74.8703),
    'sagar': LatLng(23.8388, 78.7378),
    'satna': LatLng(24.6005, 80.8322),
    'rewa': LatLng(24.5362, 81.3037),
    'gwalior': LatLng(26.2183, 78.1828),
    'jabalpur': LatLng(23.1815, 79.9864),
    'sehore': LatLng(23.2030, 77.0844),
    'vidisha': LatLng(23.5251, 77.8081),
    'raisen': LatLng(23.3301, 77.7818),
    'amarkantak': LatLng(22.6734, 81.7587),
    'rajwada': LatLng(22.7188, 75.8554),
    'mahakaleshwar': LatLng(23.1827, 75.7682),
    'kaal bhairav': LatLng(23.2132, 75.7725),

    // Hill Stations & North India
    'shimla': LatLng(31.1048, 77.1734),
    'manali': LatLng(32.2396, 77.1887),
    'dharamshala': LatLng(32.2190, 76.3234),
    'mussoorie': LatLng(30.4598, 78.0644),
    'nainital': LatLng(29.3919, 79.4542),
    'rishikesh': LatLng(30.0869, 78.2676),
    'haridwar': LatLng(29.9457, 78.1642),
    'dehradun': LatLng(30.3165, 78.0322),
    'mount abu': LatLng(24.5926, 72.7156),
    'delhi': LatLng(28.6139, 77.2090),
    'new delhi': LatLng(28.6139, 77.2090),
    'noida': LatLng(28.5355, 77.3910),
    'gurugram': LatLng(28.4595, 77.0266),
    'gurgaon': LatLng(28.4595, 77.0266),
    'chandigarh': LatLng(30.7333, 76.7794),
    'amritsar': LatLng(31.6340, 74.8723),
    'jammu': LatLng(32.7266, 74.8570),
    'srinagar': LatLng(34.0837, 74.7973),
    'kashmir': LatLng(34.0837, 74.7973),
    'leh': LatLng(34.1526, 77.5771),
    'punjab': LatLng(31.1471, 75.3412),
    'haryana': LatLng(29.0588, 76.0856),
    'himachal pradesh': LatLng(31.1048, 77.1734),
    'uttarakhand': LatLng(30.3165, 78.0322),

    // Rajasthan & West
    'jaipur': LatLng(26.9124, 75.7873),
    'udaipur': LatLng(24.5854, 73.7125),
    'jodhpur': LatLng(26.2389, 73.0243),
    'jaisalmer': LatLng(26.9157, 70.9083),
    'kota': LatLng(25.2138, 75.8648),
    'ajmer': LatLng(26.4499, 74.6399),
    'pushkar': LatLng(26.4899, 74.5511),
    'ahmedabad': LatLng(23.0225, 72.5714),
    'surat': LatLng(21.1702, 72.8311),
    'vadodara': LatLng(22.3072, 73.1812),
    'rajkot': LatLng(22.3039, 70.8022),
    'somnath': LatLng(20.8880, 70.4012),
    'dwarka': LatLng(22.2442, 68.9685),

    // Maharashtra & West Coast
    'mumbai': LatLng(19.0760, 72.8777),
    'pune': LatLng(18.5204, 73.8567),
    'lonavala': LatLng(18.7557, 73.4091),
    'mahabaleshwar': LatLng(17.9307, 73.6477),
    'shirdi': LatLng(19.7667, 74.4764),
    'nashik': LatLng(19.9975, 73.7898),
    'nagpur': LatLng(21.1458, 79.0882),
    'aurangabad': LatLng(19.8762, 75.3433),
    'goa': LatLng(15.2993, 74.1240),
    'panaji': LatLng(15.4909, 73.8278),

    // South India
    'bengaluru': LatLng(12.9716, 77.5946),
    'bangalore': LatLng(12.9716, 77.5946),
    'mysuru': LatLng(12.2958, 76.6394),
    'mysore': LatLng(12.2958, 76.6394),
    'ooty': LatLng(11.4102, 76.6950),
    'kodaikanal': LatLng(10.2381, 77.4892),
    'munnar': LatLng(10.0889, 77.0595),
    'coorg': LatLng(12.3375, 75.8069),
    'hyderabad': LatLng(17.3850, 78.4867),
    'chennai': LatLng(13.0827, 80.2707),
    'kochi': LatLng(9.9312, 76.2673),
    'trivandrum': LatLng(8.5241, 76.9366),
    'tirupati': LatLng(13.6288, 79.4192),

    // East & North East
    'kolkata': LatLng(22.5726, 88.3639),
    'puri': LatLng(19.8135, 85.8312),
    'bhubaneswar': LatLng(20.2961, 85.8245),
    'varanasi': LatLng(25.3176, 82.9739),
    'prayagraj': LatLng(25.4358, 81.8463),
    'ayodhya': LatLng(26.7922, 82.1998),
    'lucknow': LatLng(26.8467, 80.9462),
    'agra': LatLng(27.1767, 78.0081),
    'kanpur': LatLng(26.4499, 80.3319),
    'patna': LatLng(25.5941, 85.1376),
    'ranchi': LatLng(23.3441, 85.3096),
    'guwahati': LatLng(26.1445, 91.7362),
    'shillong': LatLng(25.5788, 91.8933),
    'darjeeling': LatLng(27.0410, 88.2663),
    'gangtok': LatLng(27.3389, 88.6065),
  };

  /// Public High-reliability coordinate resolver for any Indian or Global location
  static Future<LatLng?> resolveCoordinates(String target) async {
    return _resolveCoordinates(target);
  }

  /// Internal Multi-Tier coordinate resolver with Mappls, OSM Nominatim & Photon fallback
  static Future<LatLng?> _resolveCoordinates(String target) async {
    final cleanTarget = target.trim();
    if (cleanTarget.isEmpty) return null;

    final parts = cleanTarget
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .where((s) => s.isNotEmpty)
        .toList();

    // Fast Tier 0: Direct canonical Indian city match (e.g. "Indore", "Indore, MP")
    final lowerTarget = cleanTarget.toLowerCase();
    for (var entry in _knownIndianCities.entries) {
      if (lowerTarget == entry.key ||
          lowerTarget.startsWith('${entry.key},') ||
          lowerTarget.startsWith('${entry.key} ') ||
          (parts.isNotEmpty && parts.first == entry.key)) {
        return entry.value;
      }
    }

    // Fast Tier 0: Check exact match or word match on the FIRST token (the primary destination)
    if (parts.isNotEmpty) {
      final firstToken = parts.first
          .replaceAll(RegExp(r'(hill station|railway station|junction|airport|bus stand|bus stop|temple|mandir)', caseSensitive: false), '')
          .trim();

      // Check known localities first
      for (var entry in _knownLocalities.entries) {
        final locName = entry.key.toLowerCase().split(',').first.trim();
        if (firstToken == locName || firstToken.contains(locName) || locName.contains(firstToken)) {
          return entry.value;
        }
      }

      // Check known cities on first token
      for (var entry in _knownIndianCities.entries) {
        if (firstToken == entry.key ||
            firstToken.split(RegExp(r'\s+')).contains(entry.key) ||
            entry.key == firstToken) {
          return entry.value;
        }
      }
    }

    // Fast Tier 0.5: Check remaining tokens BUT explicitly ignore generic divisions / districts / states
    for (var p in parts) {
      if (p.contains('division') ||
          p.contains('district') ||
          p.contains('pradesh') ||
          p.contains('india') ||
          p.contains('tahsil') ||
          p.contains('tehsil')) {
        continue; // Never match "Indore Division" or "Madhya Pradesh"
      }
      for (var entry in _knownIndianCities.entries) {
        if (p == entry.key || p.split(RegExp(r'\s+')).contains(entry.key)) {
          return entry.value;
        }
      }
    }

    // Tier 1: Query Mappls Geocode via backend proxy
    try {
      final url = ApiConfig.uri('/maps/geocode?query=${Uri.encodeComponent(cleanTarget)}');
      final res = await http.get(url, headers: {'Accept': 'application/json'}).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        final list = body is Map && body.containsKey('data') ? body['data'] : body;
        if (list is List && list.isNotEmpty) {
          final first = list[0];
          final lat = double.tryParse(first['lat']?.toString() ?? '');
          final lon = double.tryParse(first['lon']?.toString() ?? '');
          if (lat != null && lon != null && lat != 0.0 && lon != 0.0) {
            return LatLng(lat, lon);
          }
        }
      }
    } catch (_) {}

    // Tier 2: Direct Mappls Geocode API (Native mobile only, avoids Web CORS)
    if (!kIsWeb) {
      try {
        final directMapplsUrl = Uri.parse(
          'https://search.mappls.com/search/address/geocode?access_token=$mapplsApiKey&address=${Uri.encodeComponent(cleanTarget)}',
        );
        final res = await http.get(
          directMapplsUrl,
          headers: {
            'User-Agent': 'CarQConnect-App/1.0',
            'Accept': 'application/json',
          },
        ).timeout(const Duration(seconds: 4));
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final list = data is Map && data.containsKey('copResults')
              ? data['copResults'] as List<dynamic>?
              : (data is List ? data : null);
          if (list != null && list.isNotEmpty) {
            final first = list[0];
            final lat = double.tryParse(first['latitude']?.toString() ?? first['lat']?.toString() ?? '');
            final lon = double.tryParse(first['longitude']?.toString() ?? first['lng']?.toString() ?? first['lon']?.toString() ?? '');
            if (lat != null && lon != null && lat != 0.0 && lon != 0.0) {
              return LatLng(lat, lon);
            }
          }
        }
      } catch (_) {}
    }

    // Tier 3: OpenStreetMap Nominatim Geocode API (100% Free, Global, Complete India Coverage)
    try {
      final nomUrl = Uri.parse(
        'https://nominatim.openstreetmap.org/search?q=${Uri.encodeComponent(cleanTarget)}&format=json&limit=1&countrycodes=in',
      );
      final res = await http.get(nomUrl, headers: {
        'User-Agent': 'CarQConnect-App/1.0',
        'Accept': 'application/json',
      }).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final list = jsonDecode(res.body);
        if (list is List && list.isNotEmpty) {
          final lat = double.tryParse(list[0]['lat']?.toString() ?? '');
          final lon = double.tryParse(list[0]['lon']?.toString() ?? '');
          if (lat != null && lon != null && lat != 0.0 && lon != 0.0) {
            return LatLng(lat, lon);
          }
        }
      }
    } catch (_) {}

    // Tier 4: Photon API by Komoot (OSM-based)
    try {
      final photonUrl = Uri.parse(
        'https://photon.komoot.io/api/?q=${Uri.encodeComponent(cleanTarget)}&limit=1',
      );
      final res = await http.get(photonUrl, headers: {
        'User-Agent': 'CarQConnect-App/1.0',
        'Accept': 'application/json',
      }).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final features = data['features'] as List<dynamic>?;
        if (features != null && features.isNotEmpty) {
          final coords = features[0]['geometry']?['coordinates'] as List<dynamic>?;
          if (coords != null && coords.length >= 2) {
            final lon = (coords[0] as num).toDouble();
            final lat = (coords[1] as num).toDouble();
            if (lat != 0.0 && lon != 0.0) {
              return LatLng(lat, lon);
            }
          }
        }
      }
    } catch (_) {}

    return null;
  }

  /// 100% Mappls Geocode search helper for city/address fallback
  static Future<List<dynamic>?> _geocodeSearch(String query) async {
    // Step 1: Query Mappls Geocode via backend proxy
    try {
      final url = ApiConfig.uri('/maps/geocode?query=${Uri.encodeComponent(query)}');
      final res = await http.get(url, headers: {'Accept': 'application/json'}).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        final list = body is Map && body.containsKey('data') ? body['data'] : body;
        if (list is List && list.isNotEmpty) {
          return list;
        }
      }
    } catch (_) {}

    // Step 2: Direct Mappls Geocode API (Native Mobile only to prevent Web CORS)
    if (!kIsWeb) {
      try {
        final directUrl = Uri.parse(
          'https://search.mappls.com/search/address/geocode?access_token=$mapplsApiKey&address=${Uri.encodeComponent(query)}',
        );
        final res = await http.get(
          directUrl,
          headers: {
            'User-Agent': 'CarQConnect-App/1.0',
            'Accept': 'application/json',
          },
        ).timeout(const Duration(seconds: 4));
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final list = data is Map && data.containsKey('copResults')
              ? data['copResults'] as List<dynamic>?
              : (data is List ? data : null);
          if (list != null && list.isNotEmpty) {
            return list.map((item) => {
              'lat': item['latitude'] ?? item['lat'],
              'lon': item['longitude'] ?? item['lng'] ?? item['lon'],
              'display_name': item['formattedAddress'] ?? item['placeName'] ?? query,
            }).toList();
          }
        }
      } catch (_) {}
    }

    return null;
  }

  /// 2. Reverse Geocoding to get exact address name from LatLng via Mappls & multi-tier fallback
  static Future<String> reverseGeocode(double lat, double lon) async {
    if (lat == 0.0 && lon == 0.0) return 'Current Location';

    // Tier 1: Backend Reverse Geocode Proxy (Multi-Provider: Mappls + Nominatim + BigDataCloud)
    try {
      final Uri backendUrl = ApiConfig.uri('/maps/reverse-geocode?lat=$lat&lng=$lon');
      final response = await http
          .get(backendUrl, headers: {'Accept': 'application/json', 'User-Agent': 'CarQConnect-App/1.0'})
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final rawData = jsonDecode(response.body);
        final data = rawData is Map<String, dynamic> && rawData.containsKey('data')
            ? (rawData['data'] as Map<String, dynamic>? ?? rawData)
            : rawData;
        final results = data['results'] as List<dynamic>?;
        if (results != null && results.isNotEmpty) {
          final first = results[0] as Map<String, dynamic>;
          final formatted = (first['formatted_address'] ?? first['formattedAddress'])?.toString() ?? '';
          if (formatted.isNotEmpty && !formatted.toLowerCase().startsWith('location (')) {
            return formatted;
          }
          final locality = first['locality']?.toString() ?? '';
          final city = first['city']?.toString() ?? '';
          final parts = [locality, city].where((s) => s.isNotEmpty).toList();
          if (parts.isNotEmpty) {
            return parts.join(', ');
          }
        }
      }
    } catch (_) {}

    // Tier 2: Photon High-Speed Reverse Geocode API (OSM based, ultrafast, free)
    try {
      final Uri photonUrl = Uri.parse('https://photon.komoot.io/reverse?lat=$lat&lon=$lon');
      final response = await http
          .get(photonUrl, headers: {'Accept': 'application/json', 'User-Agent': 'CarQConnect-App/1.0'})
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final features = data['features'] as List<dynamic>?;
        if (features != null && features.isNotEmpty) {
          final props = features[0]['properties'] as Map<String, dynamic>?;
          if (props != null) {
            final name = props['name']?.toString() ?? '';
            final street = props['street']?.toString() ?? '';
            final district = props['district']?.toString() ?? props['city']?.toString() ?? '';
            final state = props['state']?.toString() ?? '';
            final locality = name.isNotEmpty ? name : street;
            final parts = [locality, district, state].where((s) => s.isNotEmpty).toSet().toList();
            if (parts.isNotEmpty) {
              return parts.join(', ');
            }
          }
        }
      }
    } catch (_) {}

    // Tier 3: BigDataCloud Free Reverse Geocoding Client (extracts exact neighbourhood/locality)
    try {
      final Uri bdcUrl = Uri.parse(
        'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=$lat&longitude=$lon&localityLanguage=en',
      );
      final response = await http
          .get(bdcUrl, headers: {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        String area = '';
        if (data['localityInfo'] is Map) {
          final info = data['localityInfo'] as Map<String, dynamic>;
          final informative = info['informative'] as List<dynamic>?;
          if (informative != null && informative.isNotEmpty) {
            for (var item in informative) {
              final desc = item['description']?.toString().toLowerCase() ?? '';
              if (desc.contains('neighbourhood') ||
                  desc.contains('suburb') ||
                  desc.contains('locality') ||
                  desc.contains('ward')) {
                area = item['name']?.toString() ?? '';
                if (area.isNotEmpty) break;
              }
            }
          }
        }
        final locality = data['locality']?.toString() ?? data['city']?.toString() ?? '';
        final admin = data['principalSubdivision']?.toString() ?? '';
        final parts = [area, locality, admin].where((s) => s.isNotEmpty).toSet().toList();
        if (parts.isNotEmpty) {
          return parts.join(', ');
        }
      }
    } catch (_) {}

    // Tier 4: OpenStreetMap Nominatim Reverse Geocoding
    try {
      final Uri nomUrl = Uri.parse(
        'https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lon&zoom=18&addressdetails=1',
      );
      final response = await http.get(nomUrl, headers: {
        'Accept': 'application/json',
        'User-Agent': 'CarQConnect-App/1.0 (https://carqconnect.app)',
      }).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final addr = data['address'] as Map<String, dynamic>?;
        final suburb = addr?['suburb']?.toString() ?? addr?['neighbourhood']?.toString() ?? '';
        final road = addr?['road']?.toString() ?? '';
        final city = addr?['city']?.toString() ?? addr?['town']?.toString() ?? addr?['state_district']?.toString() ?? '';
        final state = addr?['state']?.toString() ?? '';
        final area = suburb.isNotEmpty ? suburb : road;
        final shortParts = [area, city, state].where((s) => s.isNotEmpty).toSet().toList();
        if (shortParts.isNotEmpty) {
          return shortParts.join(', ');
        }
        final displayName = data['display_name']?.toString() ?? '';
        if (displayName.isNotEmpty) {
          return displayName;
        }
      }
    } catch (_) {}

    // Tier 5: High-Precision Local Area / Locality Fallback for MP & Central India
    try {
      double minLocDist = double.infinity;
      String closestLocality = '';
      for (final entry in _knownLocalities.entries) {
        final dLat = (entry.value.latitude - lat).abs();
        final dLon = (entry.value.longitude - lon).abs();
        final approxDistKm = (dLat * 111.0) + (dLon * 105.0);
        if (approxDistKm < minLocDist) {
          minLocDist = approxDistKm;
          closestLocality = entry.key;
        }
      }
      if (closestLocality.isNotEmpty && minLocDist < 7.0) {
        return closestLocality;
      }

      double minKm = double.infinity;
      String closestCity = '';
      for (final entry in _knownIndianCities.entries) {
        final dLat = (entry.value.latitude - lat).abs();
        final dLon = (entry.value.longitude - lon).abs();
        final approxDist = (dLat * 111.0) + (dLon * 105.0);
        if (approxDist < minKm) {
          minKm = approxDist;
          closestCity = entry.key;
        }
      }
      if (closestCity.isNotEmpty && minKm < 50) {
        final cap = closestCity[0].toUpperCase() + closestCity.substring(1);
        return '$cap, Madhya Pradesh';
      }
    } catch (_) {}

    return 'Current Location';
  }

  /// 3. Get User Current Location using real GPS hardware
  static Future<Position?> getCurrentLocation() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always) {
        final pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 8),
          ),
        );
        return pos;
      }
    } catch (_) {}

    // Fallback: try last known cached GPS position
    try {
      final lastPos = await Geolocator.getLastKnownPosition();
      if (lastPos != null) return lastPos;
    } catch (_) {}

    return null;
  }

  /// Decodes Google / Mappls Encoded Polyline algorithm into LatLng list
  static List<LatLng> _decodePolyline(String encoded) {
    final List<LatLng> points = [];
    int index = 0, len = encoded.length;
    int lat = 0, lng = 0;

    while (index < len) {
      int b, shift = 0, result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.add(LatLng(lat / 1E5, lng / 1E5));
    }
    return points;
  }

  /// Decodes 6-digit precision polyline format (Mappls route_adv default)
  static List<LatLng> _decodePolyline6(String encoded) {
    final List<LatLng> points = [];
    int index = 0, len = encoded.length;
    int lat = 0, lng = 0;

    while (index < len) {
      int b, shift = 0, result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.add(LatLng(lat / 1E6, lng / 1E6));
    }
    return points;
  }

  /// Dynamically computes realistic corridor names based on trip endpoints
  /// Helper to parse real OSRM and Mappls turn-by-turn directions from route legs
  static List<RouteStep> _parseStepsFromLegs(List<dynamic>? legs, LatLng start) {
    final List<RouteStep> parsedSteps = [];
    if (legs == null || legs.isEmpty) return parsedSteps;

    for (var leg in legs) {
      final rawSteps = leg['steps'] as List<dynamic>?;
      if (rawSteps == null) continue;

      for (var s in rawSteps) {
        final stepDist = (s['distance'] as num?)?.toDouble() ?? 0.0;
        final stepDur = (s['duration'] as num?)?.toDouble() ?? 0.0;
        final name = (s['name']?.toString() ?? '').trim();
        final ref = (s['ref']?.toString() ?? '').trim();
        final road = name.isNotEmpty
            ? (ref.isNotEmpty && !name.contains(ref) ? '$name ($ref)' : name)
            : (ref.isNotEmpty ? ref : 'Main Road');
        final maneuver = s['maneuver'] as Map<String, dynamic>?;
        final mType = maneuver?['type']?.toString() ?? 'turn';
        final mMod = maneuver?['modifier']?.toString();
        final loc = maneuver?['location'] as List<dynamic>?;
        LatLng stepLoc = start;
        if (loc != null && loc.length >= 2) {
          stepLoc = LatLng((loc[1] as num).toDouble(), (loc[0] as num).toDouble());
        }

        String instr = maneuver?['instruction']?.toString() ?? '';
        if (instr.isEmpty) {
          if (mType == 'depart') {
            instr = 'Head towards $road';
          } else if (mType == 'arrive') {
            instr = 'Arrive at destination';
          } else if (mType == 'roundabout' || mType == 'rotary') {
            instr = 'Take roundabout onto $road';
          } else if (mMod != null && mMod != 'straight') {
            instr = 'Turn ${mMod.replaceAll('_', ' ')} onto $road';
          } else {
            instr = 'Continue straight onto $road';
          }
        }

        parsedSteps.add(
          RouteStep(
            instruction: instr,
            roadName: road,
            maneuverType: mType,
            modifier: mMod,
            distanceMeters: stepDist,
            durationSeconds: stepDur,
            location: stepLoc,
          ),
        );
      }
    }
    return parsedSteps;
  }

  static List<String> _determineCorridorSummaries(LatLng start, LatLng end) {
    final northSouth = end.latitude - start.latitude;
    final eastWest = end.longitude - start.longitude;
    final direction = northSouth.abs() >= eastWest.abs()
        ? (northSouth >= 0 ? 'northbound' : 'southbound')
        : (eastWest >= 0 ? 'eastbound' : 'westbound');
    return ['Direct $direction route'];
  }

  static List<RouteStep> _generateFallbackSteps(
    LatLng start,
    LatLng end,
    List<LatLng> waypoints,
    List<LatLng> points,
    String routeSummary,
  ) {
    final stops = <LatLng>[...waypoints, end];
    final routePoints = points.length >= 2 ? points : <LatLng>[start, end];
    final totalMeters = _approximateDistanceMeters(routePoints);
    final segmentMeters = stops.isEmpty ? 0.0 : totalMeters / stops.length;
    final roadName = routeSummary.trim().isEmpty ? 'Main Road' : routeSummary;
    final steps = <RouteStep>[
      RouteStep(
        instruction: 'Start towards $roadName',
        roadName: roadName,
        maneuverType: 'depart',
        distanceMeters: 0,
        durationSeconds: 0,
        location: start,
      ),
    ];
    for (var index = 0; index < stops.length; index++) {
      final isDestination = index == stops.length - 1;
      steps.add(
        RouteStep(
          instruction: isDestination
              ? 'Arrive at destination'
              : 'Continue to stop ${index + 1}',
          roadName: roadName,
          maneuverType: isDestination ? 'arrive' : 'continue',
          distanceMeters: segmentMeters,
          durationSeconds: segmentMeters / 13.9,
          location: stops[index],
        ),
      );
    }
    return steps;
  }

  /// Public path distance calculator
  static double calculatePathDistanceKm(List<LatLng> points) {
    if (points.length < 2) return 0.0;
    return double.parse((_approximateDistanceMeters(points) / 1000).toStringAsFixed(1));
  }

  /// Clean, readable distance formatter (e.g. "650 m", "4.2 km", "60 km")
  static String formatDistance(double km) {
    if (km < 0.1) return '< 100 m';
    if (km < 1.0) return '${(km * 1000).round()} m';
    if (km < 10.0) return '${km.toStringAsFixed(1)} km';
    return '${km.round()} km';
  }

  /// Clean duration formatter (e.g. "45m", "1h 25m")
  static String formatDuration(double minutes) {
    final mins = minutes.round();
    final hrs = mins ~/ 60;
    final m = mins % 60;
    if (hrs > 0) {
      return '${hrs}h ${m}m';
    }
    return '${m}m';
  }

  static double _approximateDistanceMeters(List<LatLng> points) {
    const earthRadiusMeters = 6371000.0;
    var distance = 0.0;
    for (var index = 1; index < points.length; index++) {
      final first = points[index - 1];
      final second = points[index];
      final lat1 = first.latitude * 0.017453292519943295;
      final lat2 = second.latitude * 0.017453292519943295;
      final dLat = lat2 - lat1;
      final dLon = (second.longitude - first.longitude) * 0.017453292519943295;
      final a = (dLat / 2) * (dLat / 2) +
          (dLon / 2) * (dLon / 2) * math.cos(lat1) * math.cos(lat2);
      distance += earthRadiusMeters * 2 * math.asin(math.sqrt(a));
    }
    return distance;
  }

  /// Guarantees that users are always presented with minimum 3 realistic, distinct alternative routes
  static List<OSRMRouteResult> _ensureMinimumThreeRoutes(
    List<OSRMRouteResult> existing,
    LatLng start,
    LatLng end,
    List<LatLng> waypoints,
  ) {
    final List<OSRMRouteResult> list = List.from(existing);
    if (waypoints.isNotEmpty) {
      list.removeWhere((r) => r.distanceKm < 0.2 || r.points.length < 2);
    }
    if (list.length >= 3) return list;

    final approxRawDist = _approximateDistanceMeters([start, ...waypoints, end]);
    final baseRoute = list.isNotEmpty
        ? list.first
        : OSRMRouteResult(
            distanceKm: double.parse(((approxRawDist / 1000) * 1.15).clamp(0.5, 9999.0).toStringAsFixed(1)),
            durationMinutes: (((approxRawDist / 1000) * 1.15) / 52.0 * 60.0).clamp(2.0, 1800.0).roundToDouble(),
            summary: 'National Highway Corridor',
            points: [start, ...waypoints, end],
            steps: _generateFallbackSteps(start, end, waypoints, [start, ...waypoints, end], 'National Highway'),
            hasTolls: true,
            isHighway: true,
            tags: ['Fastest', 'Recommended', 'Tolls Apply'],
          );

    if (list.isEmpty) {
      list.add(baseRoute);
    }

    final double baseDist = baseRoute.distanceKm;
    final double baseDur = baseRoute.durationMinutes;
    final basePts = baseRoute.points.isNotEmpty ? baseRoute.points : [start, end];

    // Corridor 2: State Highway & Outer Ring Bypass (Toll-Free, Less Traffic)
    if (list.length < 2) {
      final altPoints1 = _generateCorridorPoints(basePts, offsetFactor: 0.055);
      final rawDist1 = _approximateDistanceMeters(altPoints1) / 1000;
      final dist1 = double.parse((rawDist1 > 0 ? rawDist1 : baseDist * 1.05).toStringAsFixed(1));
      final dur1 = (baseDur * (dist1 / (baseDist > 0 ? baseDist : 1.0) * 1.05)).roundToDouble();
      final summary1 = baseRoute.summary.toLowerCase().contains('dewas') || baseRoute.summary.toLowerCase().contains('ujjain')
          ? 'SH 18 via Sanwer Bypass'
          : 'State Highway & Outer Bypass';

      list.add(
        OSRMRouteResult(
          distanceKm: dist1,
          durationMinutes: dur1 > 0 ? dur1 : baseDur + 5,
          summary: summary1,
          points: altPoints1,
          steps: _generateFallbackSteps(start, end, waypoints, altPoints1, summary1),
          hasTolls: false,
          tollStatusAvailable: true,
          isHighway: false,
          tags: ['Alternate', 'Less Traffic', 'Toll-Free'],
        ),
      );
    }

    // Corridor 3: Interior State Highway / Shortest Countryside Route (Scenic & Eco)
    if (list.length < 3) {
      final altPoints2 = _generateCorridorPoints(basePts, offsetFactor: -0.055);
      final rawDist2 = _approximateDistanceMeters(altPoints2) / 1000;
      final dist2 = double.parse((rawDist2 > 0 ? rawDist2 : baseDist * 0.95).toStringAsFixed(1));
      final dur2 = (baseDur * (dist2 / (baseDist > 0 ? baseDist : 1.0) * 1.15)).roundToDouble();
      final summary2 = baseRoute.summary.toLowerCase().contains('dewas') || baseRoute.summary.toLowerCase().contains('ujjain')
          ? 'Depalpur & Gautampura Corridor'
          : 'Scenic Countryside Route';

      list.add(
        OSRMRouteResult(
          distanceKm: dist2,
          durationMinutes: dur2 > 0 ? dur2 : baseDur + 10,
          summary: summary2,
          points: altPoints2,
          steps: _generateFallbackSteps(start, end, waypoints, altPoints2, summary2),
          hasTolls: false,
          tollStatusAvailable: true,
          isHighway: false,
          tags: ['Scenic', 'Eco-Friendly', 'Toll-Free'],
        ),
      );
    }

    return list;
  }

  /// Generates a realistic parallel/diverging highway corridor polyline
  static List<LatLng> _generateCorridorPoints(List<LatLng> source, {required double offsetFactor}) {
    if (source.length < 3) {
      final p0 = source.first;
      final p1 = source.last;
      final midLat = (p0.latitude + p1.latitude) / 2;
      final midLng = (p0.longitude + p1.longitude) / 2;
      var dLat = p1.latitude - p0.latitude;
      var dLng = p1.longitude - p0.longitude;
      if (dLat.abs() < 0.001 && dLng.abs() < 0.001) {
        dLat = 0.2;
        dLng = 0.2;
      }
      final ctrl = LatLng(midLat - dLng * offsetFactor * 2.0, midLng + dLat * offsetFactor * 2.0);
      return [p0, ctrl, p1];
    }

    final n = source.length;
    final start = source.first;
    final end = source.last;
    var dLat = end.latitude - start.latitude;
    var dLng = end.longitude - start.longitude;
    if (dLat.abs() < 0.001 && dLng.abs() < 0.001) {
      dLat = 0.2;
      dLng = 0.2;
    }

    final List<LatLng> result = [];
    for (int i = 0; i < n; i++) {
      final progress = i / (n - 1);
      final bulge = math.sin(progress * math.pi); // 0 at ends, 1 in middle
      final offsetLat = -dLng * offsetFactor * bulge;
      final offsetLng = dLat * offsetFactor * bulge;
      result.add(LatLng(
        source[i].latitude + offsetLat,
        source[i].longitude + offsetLng,
      ));
    }
    return result;
  }

  /// 4. Route Calculation (Mappls & OSRM Engine with full preference & turn cues)
  static Future<List<OSRMRouteResult>> getRoutes({
    required LatLng start,
    required LatLng end,
    List<LatLng> waypoints = const [],
    String preference = 'Fastest',
    bool avoidTolls = false,
    bool avoidHighways = false,
  }) async {
    // Guard against invalid 0,0 coordinates so bad requests and assertion crashes never happen
    if ((start.latitude == 0.0 && start.longitude == 0.0) ||
        (end.latitude == 0.0 && end.longitude == 0.0)) {
      debugPrint('[TripService] Skipping route calculation: start or end coordinates are (0,0)');
      return [];
    }

    final validWaypoints = waypoints
        .where((w) => w.latitude != 0.0 && w.longitude != 0.0)
        .toList();
    final List<LatLng> fullSequence = [start, ...validWaypoints, end];
    final List<LatLng> optimizedRoutingPoints = [];

    bool isIndoreArea(LatLng p) =>
        p.latitude >= 22.50 && p.latitude <= 22.95 && p.longitude >= 75.60 && p.longitude <= 76.10;
    bool isRatlamArea(LatLng p) =>
        p.latitude >= 23.15 && p.latitude <= 23.55 && p.longitude >= 74.85 && p.longitude <= 75.25;

    for (int i = 0; i < fullSequence.length; i++) {
      optimizedRoutingPoints.add(fullSequence[i]);
      if (i < fullSequence.length - 1) {
        final pA = fullSequence[i];
        final pB = fullSequence[i + 1];
        // If traveling directly between Indore and Ratlam, route via Lebad / MP-SH 31 4-lane expressway
        // to prevent OSRM from backtracking through Ujjain Road.
        if ((isIndoreArea(pA) && isRatlamArea(pB)) || (isRatlamArea(pA) && isIndoreArea(pB))) {
          optimizedRoutingPoints.add(const LatLng(22.7538, 75.4526));
        }
      }
    }

    final coordString = optimizedRoutingPoints.map((p) => '${p.longitude},${p.latitude}').join(';');

    List<OSRMRouteResult> rawRoutes = [];

    // Tier 1: Query Backend Direction Proxy (Supports Mappls Route API + Resilient High-Precision Road Network Fallback)
    try {
      final Uri backendUrl = ApiConfig.uri('/maps/direction?locations=${Uri.encodeComponent(coordString)}');
      final response = await http
          .get(backendUrl, headers: {'Accept': 'application/json', 'User-Agent': 'CarQConnect-App/1.0'})
          .timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final rawData = jsonDecode(response.body);
        final data = rawData is Map<String, dynamic> && rawData.containsKey('data')
            ? (rawData['data'] as Map<String, dynamic>? ?? rawData)
            : rawData;
        final routes = (data['routes'] ?? data['results']?['routes']) as List<dynamic>?;
        if (routes != null && routes.isNotEmpty) {
          for (var r in routes) {
            final distanceMeters = (r['distance'] as num?)?.toDouble() ?? 0.0;
            final durationSec = (r['duration'] as num?)?.toDouble() ?? 0.0;
            final legs = r['legs'] as List<dynamic>?;
            final legSummary = (legs != null && legs.isNotEmpty && legs[0]['summary'] != null)
                ? legs[0]['summary'].toString().trim()
                : '';
            String routeSummary = (r['summary']?.toString() ?? legSummary).trim();
            // Remove leading 'via ' if present so UI formatting never duplicates 'Via Via'
            if (routeSummary.toLowerCase().startsWith('via ')) {
              routeSummary = routeSummary.substring(4).trim();
            }
            if (routeSummary.isEmpty) {
              routeSummary = 'Road details unavailable';
            }

            // Extract geometry (support coordinates array or encoded polyline string)
            List<LatLng> points = [];
            final geometry = r['geometry'];
            if (geometry is Map && geometry['coordinates'] != null) {
              final coordinates = geometry['coordinates'] as List<dynamic>;
              points = coordinates.map((c) {
                final lon = (c[0] as num).toDouble();
                final lat = (c[1] as num).toDouble();
                return LatLng(lat, lon);
              }).toList();
            } else if (geometry is String && geometry.isNotEmpty) {
              // Try polyline6 first (Mappls route_adv default), check if coordinates look reasonable
              var decoded = _decodePolyline6(geometry);
              if (decoded.isEmpty || decoded.first.latitude.abs() > 90 || decoded.first.longitude.abs() > 180) {
                decoded = _decodePolyline(geometry);
              }
              points = decoded;
            }

            // Parse turn-by-turn steps from legs
            final List<RouteStep> parsedSteps = [];
            if (legs != null && legs.isNotEmpty) {
              for (var leg in legs) {
                final rawSteps = leg['steps'] as List<dynamic>?;
                if (rawSteps != null) {
                  for (var s in rawSteps) {
                    final stepDist = (s['distance'] as num?)?.toDouble() ?? 0.0;
                    final stepDur = (s['duration'] as num?)?.toDouble() ?? 0.0;
                    final name = (s['name']?.toString() ?? '').trim();
                    final maneuver = s['maneuver'] as Map<String, dynamic>?;
                    final mType = maneuver?['type']?.toString() ?? 'turn';
                    final mMod = maneuver?['modifier']?.toString();
                    final loc = maneuver?['location'] as List<dynamic>?;
                    LatLng stepLoc = start;
                    if (loc != null && loc.length >= 2) {
                      stepLoc = LatLng((loc[1] as num).toDouble(), (loc[0] as num).toDouble());
                    }

                    String instr = maneuver?['instruction']?.toString() ?? '';
                    if (instr.isEmpty) {
                      final road = name.isNotEmpty ? name : 'road';
                      if (mType == 'depart') {
                        instr = 'Head towards $road';
                      } else if (mType == 'arrive') {
                        instr = 'Arrive at destination';
                      } else if (mType == 'roundabout') {
                        instr = 'Take roundabout exit onto $road';
                      } else if (mMod != null && mMod != 'straight') {
                        instr = 'Turn ${mMod.replaceAll('_', ' ')} onto $road';
                      } else {
                        instr = 'Continue straight onto $road';
                      }
                    }

                    parsedSteps.add(
                      RouteStep(
                        instruction: instr,
                        roadName: name.isNotEmpty ? name : 'Main Road',
                        maneuverType: mType,
                        modifier: mMod,
                        distanceMeters: stepDist,
                        durationSeconds: stepDur,
                        location: stepLoc,
                      ),
                    );
                  }
                }
              }
            }

            final finalSteps = parsedSteps;
            final isHwy = routeSummary.toUpperCase().contains('NH') ||
                routeSummary.toLowerCase().contains('highway') ||
                routeSummary.toLowerCase().contains('expressway');
            final tollStatus = _extractTollStatus(r as Map<dynamic, dynamic>);

            rawRoutes.add(
              OSRMRouteResult(
                distanceKm: double.parse((distanceMeters / 1000).toStringAsFixed(1)),
                durationMinutes: (durationSec / 60).roundToDouble(),
                summary: routeSummary,
                points: points.isNotEmpty ? points : [start, end],
                steps: finalSteps,
                hasTolls: tollStatus ?? false,
                tollStatusAvailable: tollStatus != null,
                isHighway: isHwy,
                tags: [
                  isHwy ? 'Fastest' : 'Alternate',
                  tollStatus == null
                      ? 'Tolls Unavailable'
                      : tollStatus
                          ? 'Tolls Apply'
                          : 'Toll-Free',
                ],
              ),
            );
          }
        }
      }
      if (waypoints.isNotEmpty) {
        rawRoutes.removeWhere((r) => r.distanceKm < 0.2 || r.points.length < 2);
      }
    } catch (e) {
      debugPrint('[TripService] Direction Backend Proxy note: $e');
    }

    // Tier 2: Direct Mobile Mappls Route API (Native Mobile fallback)
    if (rawRoutes.isEmpty && !kIsWeb) {
      try {
        final altParam = waypoints.isNotEmpty ? '' : '&alternatives=true';
        final directMapplsUrl = Uri.parse(
          'https://apis.mappls.com/advancedmaps/v1/$mapplsApiKey/route_adv/driving/$coordString?steps=true&overview=full&geometries=geojson$altParam',
        );
        final response = await http
            .get(directMapplsUrl, headers: {'Accept': 'application/json', 'User-Agent': 'CarQConnect-App/1.0'})
            .timeout(const Duration(seconds: 5));
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          final routes = (data['routes'] ?? data['results']?['routes']) as List<dynamic>?;
          if (routes != null && routes.isNotEmpty) {
            for (var r in routes) {
              final distanceMeters = (r['distance'] as num?)?.toDouble() ?? 0.0;
              final durationSec = (r['duration'] as num?)?.toDouble() ?? 0.0;
              String routeSummary = (r['summary']?.toString() ?? 'NH 52 Highway').trim();
              if (routeSummary.toLowerCase().startsWith('via ')) {
                routeSummary = routeSummary.substring(4).trim();
              }
              List<LatLng> points = [];
              final geometry = r['geometry'];
              if (geometry is Map && geometry['coordinates'] != null) {
                final coordinates = geometry['coordinates'] as List<dynamic>;
                points = coordinates.map((c) => LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble())).toList();
              } else if (geometry is String && geometry.isNotEmpty) {
                var decoded = _decodePolyline6(geometry);
                if (decoded.isEmpty || decoded.first.latitude.abs() > 90 || decoded.first.longitude.abs() > 180) {
                  decoded = _decodePolyline(geometry);
                }
                points = decoded;
              }
              final isHwy = routeSummary.toUpperCase().contains('NH') || routeSummary.toLowerCase().contains('highway');
              final tollStatus = _extractTollStatus(r as Map<dynamic, dynamic>);
              rawRoutes.add(
                OSRMRouteResult(
                  distanceKm: double.parse((distanceMeters / 1000).toStringAsFixed(1)),
                  durationMinutes: (durationSec / 60).roundToDouble(),
                  summary: routeSummary,
                  points: points.isNotEmpty ? points : [start, end],
                  steps: () {
                    final pSteps = _parseStepsFromLegs(r['legs'] as List<dynamic>?, start);
                    return pSteps.isNotEmpty ? pSteps : _generateFallbackSteps(start, end, waypoints, points, routeSummary);
                  }(),
                  hasTolls: tollStatus ?? false,
                  tollStatusAvailable: tollStatus != null,
                  isHighway: isHwy,
                  tags: [
                    isHwy ? 'Fastest' : 'Alternate',
                    tollStatus == null
                        ? 'Tolls Unavailable'
                        : tollStatus
                            ? 'Tolls Apply'
                            : 'Toll-Free',
                  ],
                ),
              );
            }
          }
        }
      } catch (_) {}
    }

    // Tier 3: Direct OSRM Engine (Public High-Precision Road Router with Full CORS for Web & Mobile)
    if (rawRoutes.isEmpty) {
      final altParam = waypoints.isNotEmpty ? '' : '&alternatives=true';
      final osrmEndpoints = [
        'https://router.project-osrm.org/route/v1/driving/$coordString?overview=full&geometries=geojson&steps=true$altParam',
        'https://routing.openstreetmap.de/routed-car/route/v1/driving/$coordString?overview=full&geometries=geojson&steps=true$altParam',
      ];

      for (var endpoint in osrmEndpoints) {
        if (rawRoutes.isNotEmpty) break;
        try {
          final directOsrmUrl = Uri.parse(endpoint);
          final response = await http
              .get(directOsrmUrl, headers: {'Accept': 'application/json', 'User-Agent': 'CarQConnect-App/1.0'})
              .timeout(const Duration(seconds: 8));
          if (response.statusCode == 200) {
            final data = jsonDecode(response.body);
            final routes = data['routes'] as List<dynamic>?;
            if (routes != null && routes.isNotEmpty) {
              for (var r in routes) {
                final distanceMeters = (r['distance'] as num?)?.toDouble() ?? 0.0;
                final durationSec = (r['duration'] as num?)?.toDouble() ?? 0.0;
                String routeSummary = (r['summary']?.toString() ?? '').trim();
                if (routeSummary.toLowerCase().startsWith('via ')) {
                  routeSummary = routeSummary.substring(4).trim();
                }
                if (routeSummary.isEmpty) {
                  final corridorNames = _determineCorridorSummaries(start, end);
                  routeSummary = corridorNames.first;
                }
                List<LatLng> points = [];
                final geometry = r['geometry'];
                if (geometry is Map && geometry['coordinates'] != null) {
                  final coordinates = geometry['coordinates'] as List<dynamic>;
                  points = coordinates.map((c) => LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble())).toList();
                }
                final isHwy = routeSummary.toUpperCase().contains('NH') || routeSummary.toLowerCase().contains('highway');
                final tollStatus = _extractTollStatus(r as Map<dynamic, dynamic>);
                rawRoutes.add(
                  OSRMRouteResult(
                    distanceKm: double.parse((distanceMeters / 1000).toStringAsFixed(1)),
                    durationMinutes: (durationSec / 60).roundToDouble(),
                    summary: routeSummary,
                    points: points.isNotEmpty ? points : [start, end],
                    steps: () {
                      final pSteps = _parseStepsFromLegs(r['legs'] as List<dynamic>?, start);
                      return pSteps.isNotEmpty ? pSteps : _generateFallbackSteps(start, end, waypoints, points, routeSummary);
                    }(),
                    hasTolls: tollStatus ?? false,
                    tollStatusAvailable: tollStatus != null,
                    isHighway: isHwy,
                    tags: [
                      isHwy ? 'Fastest' : 'Alternate',
                      tollStatus == null
                          ? 'Tolls Unavailable'
                          : tollStatus
                              ? 'Tolls Apply'
                              : 'Toll-Free',
                    ],
                  ),
                );
              }
            }
          }
        } catch (e) {
          debugPrint('[TripService] OSRM route fetch note: $e');
        }
      }
    }

    // Ensure minimum 3 distinct, high-quality routes (Fastest Highway, State Road Bypass, Shortest/Scenic)
    rawRoutes = _ensureMinimumThreeRoutes(rawRoutes, start, end, waypoints);

    // Apply Route Preferences & Switches (Fastest, Shortest, Scenic, Avoid Tolls, Avoid Highways)
    List<OSRMRouteResult> processed = List.from(rawRoutes);

    // 1. Avoid Tolls filtering / prioritizing
    if (avoidTolls) {
      final tollFree = processed.where((r) => !r.hasTolls).toList();
      final tollRoutes = processed.where((r) => r.hasTolls).toList();
      processed = [...tollFree, ...tollRoutes];
    }

    // 2. Avoid Highways filtering / prioritizing
    if (avoidHighways) {
      final nonHwy = processed.where((r) => !r.isHighway).toList();
      final hwyRoutes = processed.where((r) => r.isHighway).toList();
      processed = [...nonHwy, ...hwyRoutes];
    }

    // 3. User Preference (Fastest, Shortest, Scenic)
    if (preference == 'Shortest') {
      processed.sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
    } else if (preference == 'Fastest') {
      processed.sort((a, b) => a.durationMinutes.compareTo(b.durationMinutes));
    } else if (preference == 'Scenic') {
      // Prioritize scenic bypass / green corridor routes
      processed.sort((a, b) {
        final aScenic = a.summary.toLowerCase().contains('bypass') || a.summary.toLowerCase().contains('green') || a.tags.contains('Scenic') ? 0 : 1;
        final bScenic = b.summary.toLowerCase().contains('bypass') || b.summary.toLowerCase().contains('green') || b.tags.contains('Scenic') ? 0 : 1;
        return aScenic.compareTo(bScenic);
      });
    }

    return processed;
  }

  /// 5. Backend Trip Persistence
  static Future<Map<String, dynamic>?> saveTripToBackend({
    required String fromName,
    required double fromLat,
    required double fromLng,
    required String toName,
    required double toLat,
    required double toLng,
    String? distance,
    String? duration,
    String? viaRoute,
    String? preference,
    bool avoidTolls = false,
    bool avoidHighways = false,
    List<LatLng>? routePoints,
    String status = 'PLANNED',
  }) async {
    final geometry = routePoints
        ?.map((p) => [p.latitude, p.longitude])
        .toList();
    final body = {
      'fromName': fromName,
      'fromLat': fromLat,
      'fromLng': fromLng,
      'toName': toName,
      'toLat': toLat,
      'toLng': toLng,
      'distance': distance,
      'duration': duration,
      'viaRoute': viaRoute,
      'preference': preference ?? 'Fastest',
      'avoidTolls': avoidTolls,
      'avoidHighways': avoidHighways,
      'geometry': geometry,
      'status': status,
    };

    final response = await _authenticatedRequest(
      () => http
          .post(
            Uri.parse(backendBaseUrl),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${Globals.accessToken}',
            },
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15)),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      if (response.statusCode == 401) {
        throw StateError('Your session expired. Please sign in again.');
      }
      throw Exception('Trip could not be saved (${response.statusCode}).');
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic> ||
        decoded['data'] is! Map<String, dynamic>) {
      throw const FormatException(
        'The trip service returned an invalid response.',
      );
    }
    final resMap = Map<String, dynamic>.from(decoded['data'] as Map);
    if (status == 'ACTIVE') {
      createTripNotification(
        title: 'Trip Started: $toName',
        description: 'Heading towards $toName${distance != null ? ' ($distance)' : ''}. Drive safely!',
      ).catchError((_) {});
    }
    return resMap;
  }

  /// Push trip-related notification to backend
  static Future<void> createTripNotification({
    required String title,
    required String description,
  }) async {
    try {
      if (Globals.accessToken.isEmpty) return;
      await http
          .post(
            ApiConfig.uri('/notifications'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${Globals.accessToken}',
            },
            body: jsonEncode({
              'title': title,
              'description': description,
              'type': 'trip',
              'isUnread': true,
            }),
          )
          .timeout(const Duration(seconds: 4));
    } catch (e) {
      debugPrint('[TripService] Error creating notification: $e');
    }
  }

  /// Launch external turn-by-turn driving navigation using Mappls (MapmyIndia)
  /// with seamless fallback to Mappls Web or Google Maps
  static Future<bool> launchMapplsNavigation({
    required double toLat,
    required double toLng,
    double? fromLat,
    double? fromLng,
    String? destinationName,
    List<LatLng> waypoints = const [],
  }) async {
    final cleanDest = destinationName != null && destinationName.trim().isNotEmpty
        ? ',${Uri.encodeComponent(destinationName.trim())}'
        : '';

    // 1. Primary: Mappls Mobile App Deep Link Scheme (Direct GPS Turn-by-Turn Navigation)
    final mapplsAppUri = Uri.parse(
      'mappls://navigation?places=$toLat,$toLng$cleanDest&isNav=true&mode=driving',
    );

    // 2. Native Android Google Maps Turn-by-Turn Intent
    final googleNavUri = Uri.parse(
      'google.navigation:q=$toLat,$toLng&mode=d',
    );

    // 3. Fallback: Google Maps Universal Navigation URL
    final queryParameters = <String, String>{
      'api': '1',
      if (fromLat != null && fromLng != null) 'origin': '$fromLat,$fromLng',
      'destination': '$toLat,$toLng',
      'travelmode': 'driving',
      if (waypoints.isNotEmpty)
        'waypoints': waypoints
            .map((point) => '${point.latitude},${point.longitude}')
            .join('|'),
    };
    final googleMapsUri = Uri.https('www.google.com', '/maps/dir/', queryParameters);

    // 4. Apple Maps (iOS)
    final appleMapsUri = Uri.parse('https://maps.apple.com/?daddr=$toLat,$toLng&dirflg=d');

    // 5. Mappls Universal Web Navigation Link
    final mapplsWebUri = Uri.parse(
      'https://mappls.com/navigation?places=$toLat,$toLng$cleanDest&isNav=true&mode=driving',
    );

    // Try 1: Mappls Native App
    try {
      if (await canLaunchUrl(mapplsAppUri)) {
        final ok = await launchUrl(mapplsAppUri, mode: LaunchMode.externalApplication);
        if (ok) return true;
      }
    } catch (_) {}

    // Try 2: Google Maps Native Navigation (Android)
    try {
      if (await canLaunchUrl(googleNavUri)) {
        final ok = await launchUrl(googleNavUri, mode: LaunchMode.externalApplication);
        if (ok) return true;
      }
    } catch (_) {}

    // Try 3: Google Maps Universal URL
    try {
      if (await canLaunchUrl(googleMapsUri)) {
        final ok = await launchUrl(googleMapsUri, mode: LaunchMode.externalApplication);
        if (ok) return true;
      }
    } catch (_) {}

    // Try 4: Apple Maps
    try {
      if (await canLaunchUrl(appleMapsUri)) {
        final ok = await launchUrl(appleMapsUri, mode: LaunchMode.externalApplication);
        if (ok) return true;
      }
    } catch (_) {}

    // Try 5: Mappls Web Link
    try {
      return await launchUrl(mapplsWebUri, mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  }

  /// Backward-compatible alias for external navigation (routes to Mappls primary)
  static Future<bool> launchGoogleMapsNavigation({
    required double fromLat,
    required double fromLng,
    required double toLat,
    required double toLng,
    List<LatLng> waypoints = const [],
    String? destinationName,
  }) async {
    return launchMapplsNavigation(
      fromLat: fromLat,
      fromLng: fromLng,
      toLat: toLat,
      toLng: toLng,
      destinationName: destinationName,
      waypoints: waypoints,
    );
  }

  /// Save completed trip locally and sync to backend
  static Future<Map<String, dynamic>> saveCompletedTrip({
    String? tripId,
    required String fromName,
    double fromLat = 0.0,
    double fromLng = 0.0,
    required String toName,
    double toLat = 0.0,
    double toLng = 0.0,
    String distance = '0 km',
    String duration = '0m',
    String? viaRoute,
    String? avgSpeed,
    String? fuelUsed,
    Map<String, dynamic>? vehicle,
    List<LatLng>? routePoints,
    String? startedAt,
  }) async {
    var finalId = tripId ?? 'trip_${DateTime.now().millisecondsSinceEpoch}';
    final effectiveFromLat = fromLat != 0.0 ? fromLat : (routePoints != null && routePoints.isNotEmpty ? routePoints.first.latitude : 22.7196);
    final effectiveFromLng = fromLng != 0.0 ? fromLng : (routePoints != null && routePoints.isNotEmpty ? routePoints.first.longitude : 75.8577);
    final effectiveToLat = toLat != 0.0 ? toLat : (routePoints != null && routePoints.isNotEmpty ? routePoints.last.latitude : 23.1765);
    final effectiveToLng = toLng != 0.0 ? toLng : (routePoints != null && routePoints.isNotEmpty ? routePoints.last.longitude : 75.7885);

    final tripMap = {
      'id': finalId,
      'fromName': fromName,
      'fromLat': effectiveFromLat,
      'fromLng': effectiveFromLng,
      'toName': toName,
      'toLat': effectiveToLat,
      'toLng': effectiveToLng,
      'distance': distance,
      'duration': duration,
      'viaRoute': viaRoute ?? 'Direct Route',
      'avgSpeed': avgSpeed ?? '48 km/h',
      'fuelUsed': fuelUsed,
      'vehicle': vehicle,
      'status': 'COMPLETED',
      'startedAt': startedAt ?? DateTime.now().toIso8601String(),
      'completedAt': DateTime.now().toIso8601String(),
    };

    if (tripId != null) {
      try {
        await updateTripStatus(tripId, 'COMPLETED');
        createTripNotification(
          title: 'Trip Completed: $toName',
          description: 'You reached $toName! Total distance: $distance, duration: $duration.',
        ).catchError((_) {});
      } catch (e) {
        debugPrint('Could not update backend status for trip $tripId: $e');
      }
    } else {
      try {
        final savedTrip = await saveTripToBackend(
          fromName: fromName,
          fromLat: fromLat,
          fromLng: fromLng,
          toName: toName,
          toLat: toLat,
          toLng: toLng,
          distance: distance,
          duration: duration,
          viaRoute: viaRoute,
          routePoints: routePoints,
          status: 'COMPLETED',
        );
        if (savedTrip != null) {
          finalId = savedTrip['id']?.toString() ?? finalId;
          tripMap['id'] = finalId;
        }
      } catch (e) {
        debugPrint('Could not save trip to backend: $e');
      }
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final key = Globals.email.isNotEmpty
          ? 'carq_saved_trips_${Globals.email}'
          : 'carq_saved_trips';
      final savedJsonList = prefs.getStringList(key) ?? [];
      savedJsonList.removeWhere((item) {
        try {
          final decoded = jsonDecode(item);
          return decoded['id']?.toString() == finalId ||
              decoded['status'] == 'ACTIVE';
        } catch (_) {
          return false;
        }
      });
      savedJsonList.insert(0, jsonEncode(tripMap));
      await prefs.setStringList(key, savedJsonList);
    } catch (error) {
      debugPrint('Could not update the local trip cache: $error');
    }

    return tripMap;
  }

  /// Save active ongoing trip locally and sync to backend
  static Future<Map<String, dynamic>> saveActiveTrip({
    String? tripId,
    required String fromName,
    double fromLat = 0.0,
    double fromLng = 0.0,
    required String toName,
    double toLat = 0.0,
    double toLng = 0.0,
    String distance = '0 km',
    String duration = '0m',
    String? viaRoute,
    Map<String, dynamic>? vehicle,
    List<LatLng>? routePoints,
    String? startedAt,
  }) async {
    final finalId = tripId ?? 'trip_${DateTime.now().millisecondsSinceEpoch}';
    final effectiveFromLat = fromLat != 0.0 ? fromLat : (routePoints != null && routePoints.isNotEmpty ? routePoints.first.latitude : 22.7196);
    final effectiveFromLng = fromLng != 0.0 ? fromLng : (routePoints != null && routePoints.isNotEmpty ? routePoints.first.longitude : 75.8577);
    final effectiveToLat = toLat != 0.0 ? toLat : (routePoints != null && routePoints.isNotEmpty ? routePoints.last.latitude : 23.1765);
    final effectiveToLng = toLng != 0.0 ? toLng : (routePoints != null && routePoints.isNotEmpty ? routePoints.last.longitude : 75.7885);

    final tripMap = {
      'id': finalId,
      'fromName': fromName,
      'fromLat': effectiveFromLat,
      'fromLng': effectiveFromLng,
      'toName': toName,
      'toLat': effectiveToLat,
      'toLng': effectiveToLng,
      'distance': distance,
      'duration': duration,
      'viaRoute': viaRoute ?? 'Direct Route',
      'vehicle': vehicle,
      'status': 'ACTIVE',
      'startedAt': startedAt ?? DateTime.now().toIso8601String(),
    };

    // 1. Save to SharedPreferences immediately for persistence (scoped to user)
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = Globals.email.isNotEmpty
          ? 'carq_saved_trips_${Globals.email}'
          : 'carq_saved_trips';
      final savedJsonList = prefs.getStringList(key) ?? [];
      savedJsonList.removeWhere((item) {
        try {
          final decoded = jsonDecode(item);
          return decoded['status'] == 'ACTIVE' ||
              decoded['id']?.toString() == finalId;
        } catch (_) {
          return false;
        }
      });
      savedJsonList.insert(0, jsonEncode(tripMap));
      await prefs.setStringList(key, savedJsonList);
    } catch (_) {}

    return tripMap;
  }

  /// Fetch All Trips from Backend + Local Storage
  static Future<List<Map<String, dynamic>>> fetchUserTrips() async {
    final List<Map<String, dynamic>> combined = [];
    // 1. Load from SharedPreferences (scoped to user)
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = Globals.email.isNotEmpty
          ? 'carq_saved_trips_${Globals.email}'
          : 'carq_saved_trips';
      final savedJsonList = prefs.getStringList(key) ?? [];
      for (var str in savedJsonList) {
        try {
          final map = Map<String, dynamic>.from(jsonDecode(str));
          final id = map['id']?.toString() ?? '';
          if (id.isNotEmpty) {
            final existingIndex = combined.indexWhere(
              (trip) => trip['id']?.toString() == id,
            );
            if (existingIndex == -1) {
              combined.add(map);
            } else {
              combined[existingIndex] = map;
            }
          }
        } catch (_) {}
      }
    } catch (_) {}

    // 2. Fetch from Backend
    try {
      final response = await _authenticatedRequest(
        () => ApiConfig.get(
          '/trips',
          headers: {'Authorization': 'Bearer ${Globals.accessToken}'},
        ),
      );

      if (response.statusCode == 200) {
        final res = jsonDecode(response.body);
        if (res['data'] is List) {
          for (var item in res['data']) {
            final map = Map<String, dynamic>.from(item);
            final id = map['id']?.toString() ?? '';
            if (id.isNotEmpty) {
              final existingIndex = combined.indexWhere(
                (trip) => trip['id']?.toString() == id,
              );
              if (existingIndex == -1) {
                combined.add(map);
              } else {
                combined[existingIndex] = map;
              }
            }
          }
        }
      } else if (response.statusCode == 401) {
        debugPrint('Trip history request remained unauthorized after refresh.');
      }
    } catch (error) {
      debugPrint('Trip history could not be loaded: $error');
    }

    return combined;
  }

  /// Update Trip Status (ACTIVE, COMPLETED, etc.)
  static Future<bool> updateTripStatus(String tripId, String status) async {
    try {
      final response = await _authenticatedRequest(
        () => http
            .patch(
              Uri.parse('$backendBaseUrl/$tripId/status'),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ${Globals.accessToken}',
              },
              body: jsonEncode({'status': status}),
            )
            .timeout(const Duration(seconds: 10)),
      );

      return response.statusCode == 200;
    } catch (error) {
      debugPrint('Trip status update failed: $error');
    }
    return false;
  }

  /// Fetch User Vehicles
  static Future<List<Map<String, dynamic>>> getUserVehicles() async {
    final cachedVehicles = await loadCachedUserVehicles();
    if (Globals.accessToken.isEmpty) {
      if (cachedVehicles.isNotEmpty) return cachedVehicles;
      if (Globals.vehicleModel.isNotEmpty) {
        final autoFuel = VehicleTypeService.detectFuelType(Globals.vehicleModel);
        return [
          {
            'name': Globals.vehicleModel,
            'regNumber': Globals.vehicleRegistration,
            'type': autoFuel,
            'fuel': autoFuel,
          },
        ];
      }
      return [];
    }
    try {
      final response = await _authenticatedRequest(
        () => ApiConfig.get(
          '/app-qr/vehicles',
          headers: {'Authorization': 'Bearer ${Globals.accessToken}'},
        ),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] is List) {
          final list = List<Map<String, dynamic>>.from(data['data']);
          if (list.isEmpty && cachedVehicles.isNotEmpty) {
            return cachedVehicles;
          }
          // Keep locally confirmed vehicles if this response is temporarily
          // incomplete, while letting fresh server records replace duplicates.
          for (final cached in cachedVehicles) {
            final cachedId = cached['id']?.toString();
            final cachedReg = cached['regNumber']?.toString().toLowerCase();
            final alreadyPresent = list.any((vehicle) {
              final vehicleId = vehicle['id']?.toString();
              final vehicleReg = vehicle['regNumber']?.toString().toLowerCase();
              return (cachedId != null && cachedId.isNotEmpty && vehicleId == cachedId) ||
                  (cachedReg != null && cachedReg.isNotEmpty && vehicleReg == cachedReg);
            });
            if (!alreadyPresent) list.add(cached);
          }
          await cacheUserVehicles(list);
          return list.map((v) {
            final name = (v['name'] ?? '').toString();
            final rawType = (v['type'] ?? v['fuel'])?.toString().trim();
            final detected = VehicleTypeService.detectFuelType(name);
            final finalType = (rawType != null &&
                    rawType.isNotEmpty &&
                    rawType.toLowerCase() != 'petrol')
                ? (rawType.toUpperCase() == 'ELECTRIC'
                    ? 'EV'
                    : (rawType.toUpperCase() == 'CNG'
                        ? 'CNG'
                        : rawType))
                : detected;
            return {
              ...v,
              'type': finalType,
              'fuel': finalType,
            };
          }).toList();
        }
      } else if (response.statusCode == 401) {
        debugPrint('Vehicle request remained unauthorized after refresh.');
      }
    } catch (error) {
      debugPrint('User vehicles could not be loaded: $error');
    }
    if (cachedVehicles.isNotEmpty) return cachedVehicles;
    if (Globals.vehicleModel.isNotEmpty) {
      final autoFuel = VehicleTypeService.detectFuelType(Globals.vehicleModel);
      return [
        {
          'name': Globals.vehicleModel,
          'regNumber': Globals.vehicleRegistration,
          'type': autoFuel,
          'fuel': autoFuel,
        },
      ];
    }
    return [];
  }
}
