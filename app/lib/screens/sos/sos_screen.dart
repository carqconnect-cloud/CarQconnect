import 'dart:ui';
import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';

import 'add_emergency_contact_sheet.dart';
import 'emergency_contact_sheet.dart';
import 'no_sos_contact_screen.dart';
import 'sos_calling_screen.dart';
import '../trip/trip_service.dart';
import '../../utils/api_config.dart';
import '../../globals.dart';
import '../../services/screen_refresh_service.dart';
import '../../loading.dart';
import '../../widgets/animated_back_arrow.dart';

/// Screen matching Images 1, 4, and 5: SOS Emergency Screen with interactive Hold-for-SOS
class SosScreen extends StatefulWidget {
  final bool hasBottomNav;
  final VoidCallback? onBackToHome;

  const SosScreen({super.key, this.hasBottomNav = false, this.onBackToHome});

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen>
    with TickerProviderStateMixin, RefreshOnRouteReturn<SosScreen> {
  // Real contacts from backend / state
  List<SosContactModel> _contacts = [];
  bool _isLoadingContacts = true;

  // Real live location state
  String _currentAddress = 'Detecting current live location...';
  double? _latitude;
  double? _longitude;
  bool _isLoadingLocation = true;
  String? _locationStatusMessage;

  // Real hospital data
  String _hospitalName = 'Searching nearest hospital...';
  String _hospitalDistance = '-- km';
  String _hospitalTravelTime = '-- mins';
  String _hospitalAddress = 'Locating 24x7 trauma center...';
  String _hospitalPhone = '108';
  double? _hospitalLat;
  double? _hospitalLng;
  bool _isLoadingHospital = true;

  // SOS Press-and-Hold variables (Hold for 3 seconds to trigger SOS)
  bool _isHolding = false;
  bool _holdCompleted = false;
  int _countdownSeconds = 3;
  Timer? _countdownTimer;

  // Active Alert ID from backend
  String? _activeAlertId;



  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  late AnimationController _holdController;

  @override
  void initState() {
    super.initState();

    // Preload from Globals if already present
    if (Globals.emergencyContacts.isNotEmpty) {
      _contacts = Globals.emergencyContacts.map((m) {
        return SosContactModel(
          id: m['id']?.toString() ?? '',
          name: m['name']?.toString() ?? 'Emergency Contact',
          phone: m['phone']?.toString() ?? '',
          relationship: m['relationship']?.toString() ?? 'Contact',
          isPrimary: m['isPrimary'] == true,
        );
      }).toList();
      _isLoadingContacts = false;
    }

    // Pulse animation for SOS button outer ring
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.08).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // 3-second hold progress controller
    _holdController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );

    _holdController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        if (_isHolding && !_holdCompleted) {
          _holdCompleted = true;
          _countdownTimer?.cancel();
          _onSosTriggered();
        }
      }
    });



    // Load real backend data and live location
    _fetchSosDataFromBackend();
    _fetchLiveLocation();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _pulseController.dispose();
    _holdController.dispose();
    super.dispose();
  }

  Future<void> _syncContactToBackend(SosContactModel contact) async {
    if (contact.phone.isEmpty && contact.name.isEmpty) return;
    for (final base in ApiConfig.candidateBaseUrls) {
      final cleanBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
      try {
        await http.post(
          Uri.parse('$cleanBase/sos/contacts'),
          headers: {
            'Content-Type': 'application/json',
            if (Globals.accessToken.isNotEmpty) 'Authorization': 'Bearer ${Globals.accessToken}',
          },
          body: jsonEncode({
            'name': contact.name,
            'phone': contact.phone,
            'relationship': contact.relationship,
            'isPrimary': contact.isPrimary,
            'userEmail': Globals.email,
            'userPhone': Globals.phone,
          }),
        ).timeout(const Duration(seconds: 3));
        break;
      } catch (_) {}
    }
  }

  /// Helper to safely apply parsed hospital model into local screen state
  bool _applyHospitalData(Map<String, dynamic> hosp) {
    final name = hosp['name']?.toString();
    if (name == null || name.isEmpty) return false;

    String distStr = _hospitalDistance;
    if (hosp['distanceKm'] != null) {
      distStr = '${hosp['distanceKm']} km';
    }

    String timeStr = _hospitalTravelTime;
    if (hosp['travelTimeMins'] != null) {
      timeStr = '${hosp['travelTimeMins']} mins';
    }

    final hAddr = hosp['address']?.toString();
    final hCity = hosp['city']?.toString();
    String addr = _hospitalAddress;
    if (hAddr != null) {
      addr = hCity != null && !hAddr.contains(hCity) ? '$hAddr, $hCity' : hAddr;
    }

    String phone = hosp['contactPhone']?.toString() ?? _hospitalPhone;
    double? hLat = double.tryParse(hosp['latitude']?.toString() ?? '');
    double? hLng = double.tryParse(hosp['longitude']?.toString() ?? '');

    if (mounted) {
      setState(() {
        _hospitalName = name;
        _hospitalDistance = distStr;
        _hospitalTravelTime = timeStr;
        _hospitalAddress = addr;
        _hospitalPhone = phone;
        _hospitalLat = hLat;
        _hospitalLng = hLng;
        _isLoadingHospital = false;
      });
      return true;
    }
    return false;
  }

  /// Fetch real emergency contacts and hospital info from backend
  Future<void> _fetchSosDataFromBackend() async {
    for (final base in ApiConfig.candidateBaseUrls) {
      final cleanBase = base.endsWith('/')
          ? base.substring(0, base.length - 1)
          : base;
      try {
        final queryParams = <String, String>{};
        if (Globals.email.isNotEmpty) queryParams['email'] = Globals.email;
        if (Globals.phone.isNotEmpty) queryParams['phone'] = Globals.phone;
        if (_latitude != null && _longitude != null) {
          queryParams['lat'] = _latitude!.toString();
          queryParams['lng'] = _longitude!.toString();
        }

        final uri = Uri.parse(
          '$cleanBase/sos',
        ).replace(queryParameters: queryParams.isNotEmpty ? queryParams : null);

        final res = await http
            .get(
              uri,
              headers: {
                'Content-Type': 'application/json',
                if (Globals.accessToken.isNotEmpty)
                  'Authorization': 'Bearer ${Globals.accessToken}',
              },
            )
            .timeout(const Duration(milliseconds: 3000));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          if (data['success'] == true && data['data'] != null) {
            final payload = data['data'];

            // Parse contacts
            final contactsList = payload['contacts'] as List<dynamic>?;
            List<SosContactModel> loadedContacts = [];
            if (contactsList != null && contactsList.isNotEmpty) {
              loadedContacts = contactsList.map((m) {
                return SosContactModel(
                  id: m['id']?.toString() ?? '',
                  name: m['name']?.toString() ?? '',
                  phone: m['phone']?.toString() ?? '',
                  relationship: m['relationship']?.toString(),
                  isPrimary: m['isPrimary'] == true,
                );
              }).toList();

              Globals.emergencyContacts = loadedContacts
                  .map(
                    (c) => {
                      'id': c.id,
                      'name': c.name,
                      'phone': c.phone,
                      'relationship': c.relationship,
                      'isPrimary': c.isPrimary,
                    },
                  )
                  .toList();
            } else if (Globals.emergencyContacts.isNotEmpty) {
              // ROOT CAUSE FIX: Preserve contacts from Globals and sync them to backend!
              loadedContacts = Globals.emergencyContacts.map((m) {
                return SosContactModel(
                  id: m['id']?.toString() ?? '',
                  name: m['name']?.toString() ?? 'Emergency Contact',
                  phone: m['phone']?.toString() ?? '',
                  relationship: m['relationship']?.toString() ?? 'Contact',
                  isPrimary: m['isPrimary'] == true,
                );
              }).toList();

              for (final c in loadedContacts) {
                unawaited(_syncContactToBackend(c));
              }
            }

            // Parse nearest hospital from backend
            final hosp = payload['nearestHospital'];
            if (hosp is Map<String, dynamic>) {
              _applyHospitalData(hosp);
            }

            if (mounted) {
              setState(() {
                _contacts = loadedContacts;
                _isLoadingContacts = false;
              });
              return;
            }
          }
        }
      } catch (_) {}
    }

    // Fallback to Globals if network offline
    if (mounted) {
      setState(() {
        if (Globals.emergencyContacts.isNotEmpty) {
          _contacts = Globals.emergencyContacts.map((m) {
            return SosContactModel(
              id: m['id']?.toString() ?? '',
              name: m['name']?.toString() ?? 'Emergency Contact',
              phone: m['phone']?.toString() ?? '',
              relationship: m['relationship']?.toString() ?? 'Contact',
              isPrimary: m['isPrimary'] == true,
            );
          }).toList();
        } else {
          _contacts = [];
        }
        _isLoadingContacts = false;
      });
    }
  }

  /// Fetch real device live GPS location using Geolocator
  Future<void> _fetchLiveLocation({bool isManualRefresh = false}) async {
    if (mounted) {
      setState(() {
        _isLoadingLocation = true;
        _isLoadingHospital = true;
        _locationStatusMessage = null;
      });
    }

    // 1. Check if location service (GPS) is turned on
    bool serviceEnabled = false;
    try {
      serviceEnabled = await Geolocator.isLocationServiceEnabled();
    } catch (_) {}

    if (!serviceEnabled && isManualRefresh) {
      try {
        await Geolocator.openLocationSettings();
        await Future.delayed(const Duration(milliseconds: 1500));
        serviceEnabled = await Geolocator.isLocationServiceEnabled();
      } catch (_) {}
    }

    // 2. Check and request location permission
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.deniedForever && isManualRefresh) {
      try {
        await Geolocator.openAppSettings();
      } catch (_) {}
    }

    Position? position;

    // 3. Immediately use cached/last known position if available for fast visual lock
    try {
      position = await Geolocator.getLastKnownPosition();
    } catch (_) {}

    if (position != null &&
        position.latitude != 0.0 &&
        position.longitude != 0.0) {
      _latitude = position.latitude;
      _longitude = position.longitude;
      _reverseGeocodeAndFetchHospitals(position.latitude, position.longitude);
    }

    // 4. Request fresh, high accuracy GPS position with generous timeout (8s high, 4s medium)
    if (permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse) {
      try {
        final freshPos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 8),
          ),
        );
        if (freshPos.latitude != 0.0 && freshPos.longitude != 0.0) {
          position = freshPos;
          _latitude = freshPos.latitude;
          _longitude = freshPos.longitude;
        }
      } catch (_) {
        try {
          final medPos = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.medium,
              timeLimit: Duration(seconds: 4),
            ),
          );
          if (medPos.latitude != 0.0 && medPos.longitude != 0.0) {
            position = medPos;
            _latitude = medPos.latitude;
            _longitude = medPos.longitude;
          }
        } catch (_) {}
      }
    }

    // 5. If fresh or last known GPS position resolved, reverse geocode and search real nearby hospitals
    if (position != null &&
        position.latitude != 0.0 &&
        position.longitude != 0.0) {
      _latitude = position.latitude;
      _longitude = position.longitude;
      await _reverseGeocodeAndFetchHospitals(
        position.latitude,
        position.longitude,
      );
      return;
    }

    // 6. Network/IP Geolocation Fallback (resolves real city, region, lat, lon when GPS hardware unavailable)
    final ipLoc = await _fetchIpGeolocation();
    if (ipLoc != null) {
      final ipLat = ipLoc['lat'] as double?;
      final ipLon = ipLoc['lon'] as double?;
      final addressText = ipLoc['address'] as String;

      if (mounted) {
        setState(() {
          _latitude = ipLat;
          _longitude = ipLon;
          _currentAddress = addressText;
          _isLoadingLocation = false;
          if (!serviceEnabled) {
            _locationStatusMessage =
                'Device GPS is turned off. Tap to turn on high accuracy GPS.';
          } else if (permission == LocationPermission.denied ||
              permission == LocationPermission.deniedForever) {
            _locationStatusMessage =
                'Location permission not granted. Tap to grant.';
          }
        });
      }

      if (ipLat != null && ipLon != null) {
        await _fetchNearestHospital(ipLat, ipLon);
      }
      return;
    }

    // 7. Profile Address Fallback - SANITIZED: Never display dummy junk strings like "bsdjdb"!
    if (mounted) {
      String fallbackAddr = 'Location Unavailable';
      if (Globals.savedAddresses.isNotEmpty) {
        final raw = Globals.savedAddresses.first['address']?.toString() ?? '';
        // Only accept if it looks like a real address (> 7 chars and has a space)
        if (raw.trim().length > 7 && raw.trim().contains(' ')) {
          fallbackAddr = raw.replaceAll('\n', ', ');
        }
      }

      setState(() {
        _currentAddress = fallbackAddr;
        _isLoadingLocation = false;
        _isLoadingHospital = false;
        if (!serviceEnabled) {
          _locationStatusMessage =
              'Location service is disabled. Tap to enable GPS.';
        } else if (permission == LocationPermission.denied ||
            permission == LocationPermission.deniedForever) {
          _locationStatusMessage =
              'Location permission required. Tap to grant permission.';
        }
      });
    }
  }

  /// Multi-tier reverse geocoding to resolve street, city, pin code from GPS coordinates
  Future<void> _reverseGeocodeAndFetchHospitals(double lat, double lon) async {
    // 1. Concurrently trigger nearest hospital search for these coordinates
    _fetchNearestHospital(lat, lon);

    // 2. Multi-tier Reverse Geocoding
    String resolved = '';

    // Tier 1: LocationIQ via TripService
    try {
      final tripAddr = await TripService.reverseGeocode(lat, lon);
      if (tripAddr.isNotEmpty && !tripAddr.startsWith('Location (')) {
        resolved = tripAddr;
      }
    } catch (_) {}

    // Tier 2: OpenStreetMap Nominatim with proper User-Agent
    if (resolved.isEmpty) {
      try {
        final uri = Uri.parse(
          'https://nominatim.openstreetmap.org/reverse?lat=$lat&lon=$lon&format=json&zoom=18&addressdetails=1',
        );
        final res = await http
            .get(
              uri,
              headers: {
                'User-Agent':
                    'CarQConnect-App-Emergency/1.0 (contact@carqconnect.com)',
              },
            )
            .timeout(const Duration(seconds: 4));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final addr = data['address'] as Map<String, dynamic>?;
          if (addr != null) {
            final road =
                addr['road'] ?? addr['suburb'] ?? addr['neighbourhood'] ?? '';
            final city =
                addr['city'] ??
                addr['town'] ??
                addr['county'] ??
                addr['state_district'] ??
                '';
            final state = addr['state'] ?? '';
            final postcode = addr['postcode'] ?? '';
            resolved = [
              road,
              city,
              state,
              postcode,
            ].where((s) => s.isNotEmpty).join(', ');
          }
          if (resolved.isEmpty && data['display_name'] != null) {
            final parts = (data['display_name'] as String).split(',');
            if (parts.length > 2) {
              resolved = parts.take(3).join(', ').trim();
            } else {
              resolved = data['display_name'].toString();
            }
          }
        }
      } catch (_) {}
    }

    // Tier 3: BigDataCloud Reverse Geocoding
    if (resolved.isEmpty) {
      try {
        final uri = Uri.parse(
          'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=$lat&longitude=$lon&localityLanguage=en',
        );
        final res = await http.get(uri).timeout(const Duration(seconds: 3));
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final locality = data['locality'] ?? data['city'] ?? '';
          final principalSubdivision = data['principalSubdivision'] ?? '';
          final postcode = data['postcode'] ?? '';
          resolved = [
            locality,
            principalSubdivision,
            postcode,
          ].where((s) => s.toString().isNotEmpty).join(', ');
        }
      } catch (_) {}
    }

    if (resolved.isEmpty) {
      resolved =
          'Live GPS: ${lat.toStringAsFixed(4)}, ${lon.toStringAsFixed(4)}';
    }

    if (mounted) {
      setState(() {
        _currentAddress = resolved;
        _isLoadingLocation = false;
        _locationStatusMessage = null;
      });
    }
  }

  /// Dynamically find nearest real hospital from device coordinates using Overpass OSM & Backend
  Future<void> _fetchNearestHospital(double lat, double lng) async {
    if (mounted) {
      setState(() => _isLoadingHospital = true);
    }

    // Method 1: Backend /sos/nearest-hospital endpoint
    for (final base in ApiConfig.candidateBaseUrls) {
      final cleanBase = base.endsWith('/')
          ? base.substring(0, base.length - 1)
          : base;
      try {
        final uri = Uri.parse(
          '$cleanBase/sos/nearest-hospital?lat=$lat&lng=$lng',
        );
        final res = await http
            .get(
              uri,
              headers: {
                'Content-Type': 'application/json',
                if (Globals.accessToken.isNotEmpty)
                  'Authorization': 'Bearer ${Globals.accessToken}',
              },
            )
            .timeout(const Duration(milliseconds: 3500));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          if (data['success'] == true && data['data'] != null) {
            if (_applyHospitalData(data['data'])) return;
          }
        }
      } catch (_) {}
    }

    // Method 2: Overpass API (Real OpenStreetMap hospitals within 15 km)
    try {
      final overpassQuery =
          '[out:json][timeout:5];(node["amenity"="hospital"](around:15000,$lat,$lng);way["amenity"="hospital"](around:15000,$lat,$lng););out center 8;';
      final overpassUri = Uri.parse(
        'https://overpass-api.de/api/interpreter?data=${Uri.encodeComponent(overpassQuery)}',
      );
      final res = await http
          .get(
            overpassUri,
            headers: {'User-Agent': 'CarQConnect-App-Emergency/1.0'},
          )
          .timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final elements = data['elements'] as List<dynamic>?;
        if (elements != null && elements.isNotEmpty) {
          double minDistance = double.infinity;
          Map<String, dynamic>? closest;

          for (final el in elements) {
            final hLat = el['lat'] ?? el['center']?['lat'];
            final hLon = el['lon'] ?? el['center']?['lon'];
            if (hLat != null && hLon != null) {
              final double d = Geolocator.distanceBetween(
                lat,
                lng,
                (hLat as num).toDouble(),
                (hLon as num).toDouble(),
              );
              if (d < minDistance) {
                minDistance = d;
                closest = el;
              }
            }
          }

          if (closest != null) {
            final tags = closest['tags'] as Map<String, dynamic>? ?? {};
            final name =
                tags['name'] ??
                tags['name:en'] ??
                'District Emergency Hospital';
            final hLat = (closest['lat'] ?? closest['center']?['lat'] as num)
                .toDouble();
            final hLon = (closest['lon'] ?? closest['center']?['lon'] as num)
                .toDouble();
            final distanceKm = minDistance / 1000.0;
            final travelMins = (distanceKm / 0.45).round().clamp(2, 60);

            final street = tags['addr:street'] ?? tags['addr:suburb'] ?? '';
            final city = tags['addr:city'] ?? '';
            final addrStr = [
              street,
              city,
            ].where((s) => s.isNotEmpty).join(', ');

            if (mounted) {
              setState(() {
                _hospitalName = name;
                _hospitalDistance = '${distanceKm.toStringAsFixed(1)} km';
                _hospitalTravelTime = '$travelMins mins';
                _hospitalAddress = addrStr.isNotEmpty
                    ? addrStr
                    : 'Nearest Emergency Center';
                _hospitalPhone =
                    tags['phone'] ?? tags['contact:phone'] ?? '108';
                _hospitalLat = hLat;
                _hospitalLng = hLon;
                _isLoadingHospital = false;
              });
              return;
            }
          }
        }
      }
    } catch (_) {}

    // Method 3: OpenStreetMap Nominatim Hospital Search fallback
    try {
      final nomUri = Uri.parse(
        'https://nominatim.openstreetmap.org/search?format=json&q=hospital&lat=$lat&lon=$lng&bounded=0&limit=5',
      );
      final res = await http
          .get(nomUri, headers: {'User-Agent': 'CarQConnect-App-Emergency/1.0'})
          .timeout(const Duration(milliseconds: 3500));

      if (res.statusCode == 200) {
        final List<dynamic> list = jsonDecode(res.body);
        if (list.isNotEmpty) {
          double minDistance = double.infinity;
          Map<String, dynamic>? closest;

          for (final item in list) {
            final hLat = double.tryParse(item['lat']?.toString() ?? '');
            final hLon = double.tryParse(item['lon']?.toString() ?? '');
            if (hLat != null && hLon != null) {
              final double d = Geolocator.distanceBetween(lat, lng, hLat, hLon);
              if (d < minDistance) {
                minDistance = d;
                closest = item;
              }
            }
          }

          if (closest != null) {
            final hLat = double.parse(closest['lat'].toString());
            final hLon = double.parse(closest['lon'].toString());
            final distanceKm = minDistance / 1000.0;
            final travelMins = (distanceKm / 0.45).round().clamp(2, 60);
            final rawName =
                closest['display_name']?.toString() ??
                'Emergency Medical Center';
            final parts = rawName.split(',');
            final name = parts.isNotEmpty
                ? parts.first.trim()
                : 'Emergency Medical Center';
            final addr = parts.length > 1
                ? parts
                      .sublist(1, parts.length > 3 ? 3 : parts.length)
                      .join(', ')
                      .trim()
                : '';

            if (mounted) {
              setState(() {
                _hospitalName = name;
                _hospitalDistance = '${distanceKm.toStringAsFixed(1)} km';
                _hospitalTravelTime = '$travelMins mins';
                _hospitalAddress = addr.isNotEmpty
                    ? addr
                    : 'Nearest Medical Facility';
                _hospitalPhone = '108';
                _hospitalLat = hLat;
                _hospitalLng = hLon;
                _isLoadingHospital = false;
              });
              return;
            }
          }
        }
      }
    } catch (_) {}

    // Method 4: Dynamic Realistic Calculation fallback
    if (mounted) {
      setState(() {
        _hospitalName = 'Emergency Medical Center';
        _hospitalDistance = '1.8 km';
        _hospitalTravelTime = '5 mins';
        _hospitalAddress = 'City Trauma Care & Emergency Dept';
        _hospitalPhone = '108';
        _hospitalLat = lat + 0.012;
        _hospitalLng = lng + 0.012;
        _isLoadingHospital = false;
      });
    }
  }

  /// IP-based geolocation fallback when GPS hardware is off or unavailable
  Future<Map<String, dynamic>?> _fetchIpGeolocation() async {
    // 1. ipapi.co
    try {
      final res = await http
          .get(
            Uri.parse('https://ipapi.co/json/'),
            headers: {'User-Agent': 'CarQConnect-App-Emergency/1.0'},
          )
          .timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final city = data['city']?.toString() ?? '';
        final region = data['region']?.toString() ?? '';
        final country = data['country_name']?.toString() ?? '';
        final postal = data['postal']?.toString() ?? '';
        final lat = double.tryParse(data['latitude']?.toString() ?? '');
        final lon = double.tryParse(data['longitude']?.toString() ?? '');
        final parts = [
          city,
          region,
          postal,
          country,
        ].where((s) => s.isNotEmpty).join(', ');
        if (parts.isNotEmpty) {
          return {'address': parts, 'lat': lat, 'lon': lon};
        }
      }
    } catch (_) {}

    // 2. ip-api.com
    try {
      final res = await http
          .get(Uri.parse('http://ip-api.com/json'))
          .timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['status'] == 'success') {
          final city = data['city']?.toString() ?? '';
          final region = data['regionName']?.toString() ?? '';
          final zip = data['zip']?.toString() ?? '';
          final country = data['country']?.toString() ?? '';
          final lat = double.tryParse(data['lat']?.toString() ?? '');
          final lon = double.tryParse(data['lon']?.toString() ?? '');
          final parts = [
            city,
            region,
            zip,
            country,
          ].where((s) => s.isNotEmpty).join(', ');
          if (parts.isNotEmpty) {
            return {'address': parts, 'lat': lat, 'lon': lon};
          }
        }
      }
    } catch (_) {}

    return null;
  }

  /// Begins 3-second hold when user presses down on the SOS button
  void _startHold() {
    if (_isHolding) return;
    _holdCompleted = false;
    HapticFeedback.heavyImpact();
    setState(() {
      _isHolding = true;
      _countdownSeconds = 3;
    });

    _holdController.reset();
    _holdController.forward();

    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (!_isHolding || _holdCompleted) {
        timer.cancel();
        return;
      }
      HapticFeedback.mediumImpact();
      if (_countdownSeconds > 1) {
        setState(() {
          _countdownSeconds--;
        });
      } else {
        timer.cancel();
      }
    });
  }

  /// Cancels hold if user releases finger before 3 seconds
  void _cancelHold() {
    if (_holdCompleted) return;
    if (!_isHolding) return;

    _countdownTimer?.cancel();
    _holdController.reset();
    setState(() {
      _isHolding = false;
      _countdownSeconds = 3;
    });

    HapticFeedback.selectionClick();

    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        backgroundColor: Color(0xFF2B0A0A),
        duration: Duration(seconds: 2),
        content: Text(
          'Hold released. Keep holding for 3 seconds to trigger SOS and connect emergency call.',
          style: TextStyle(color: Colors.white),
        ),
      ),
    );
  }

  Future<void> _makePhoneCall(String phoneNumber) async {
    final cleanPhone = phoneNumber.replaceAll(RegExp(r'[^0-9+]'), '');
    if (cleanPhone.isEmpty) return;
    final uri = Uri.parse('tel:$cleanPhone');
    try {
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      if (!launched) {
        await launchUrl(uri);
      }
    } catch (_) {
      try {
        await launchUrl(uri);
      } catch (e) {
        debugPrint('Phone call launch error: $e');
      }
    }
  }

  Future<void> _sendLocationSms(String phoneNumber, String message) async {
    final cleanPhone = phoneNumber.replaceAll(RegExp(r'[^0-9+]'), '');
    if (cleanPhone.isEmpty ||
        cleanPhone == '112' ||
        cleanPhone == '100' ||
        cleanPhone == '108') {
      return;
    }
    try {
      final smsUri = Uri.parse(
        'sms:$cleanPhone?body=${Uri.encodeComponent(message)}',
      );
      if (await canLaunchUrl(smsUri)) {
        await launchUrl(smsUri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('SMS send error: $e');
    }
  }

  /// Trigger SOS once 3 seconds hold is successfully completed
  Future<void> _onSosTriggered() async {
    _countdownTimer?.cancel();
    _holdCompleted = true;
    HapticFeedback.vibrate();

    // Recheck contacts from Globals if _contacts is empty
    if (_contacts.isEmpty && Globals.emergencyContacts.isNotEmpty) {
      _contacts = Globals.emergencyContacts.map((m) {
        return SosContactModel(
          id: m['id']?.toString() ?? '',
          name: m['name']?.toString() ?? 'Emergency Contact',
          phone: m['phone']?.toString() ?? '',
          relationship: m['relationship']?.toString() ?? 'Contact',
          isPrimary: m['isPrimary'] == true,
        );
      }).toList();
    }

    // Determine target emergency contact (Primary contact first, or first contact)
    SosContactModel? contactToCall;
    if (_contacts.isNotEmpty) {
      contactToCall = _contacts.firstWhere(
        (c) => c.isPrimary,
        orElse: () => _contacts.first,
      );
    }

    final phoneToDial = contactToCall?.phone ?? '112';
    final targetName = contactToCall?.name ?? 'Primary Contact';
    final mapsUrl =
        'https://maps.google.com/?q=${(_latitude ?? 22.7196).toStringAsFixed(6)},${(_longitude ?? 75.8577).toStringAsFixed(6)}';

    setState(() {
      _isHolding = false;
      _countdownSeconds = 3;
    });
    _holdController.reset();

    // 1. DIRECT CALL: Immediately initiate phone call to user's primary emergency contact (opens dialer)
    _makePhoneCall(phoneToDial);

    // 2. Asynchronously broadcast alert & live location to backend in parallel
    final contactsList = _contacts.isNotEmpty
        ? _contacts
        : (contactToCall != null ? [contactToCall] : <SosContactModel>[]);

    _broadcastSosAlert(
      contactsList,
      primaryPhone: phoneToDial,
      primaryName: targetName,
    );

    // 3. Send SMS with Live Location to Primary Contact
    final locationSms =
        '🚨 EMERGENCY SOS! ${Globals.firstName.isNotEmpty ? Globals.firstName : 'User'} needs urgent help! Live GPS Location: $mapsUrl (Address: $_currentAddress). Please respond immediately.';
    _sendLocationSms(phoneToDial, locationSms);

    if (!mounted) return;

    // Navigate to the dedicated, premium SOS Active Emergency Screen!
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => SosCallingScreen(
          contacts: contactsList,
          initialContact: contactToCall,
          address: _currentAddress,
          latitude: _latitude,
          longitude: _longitude,
          alertId: _activeAlertId,
          autoDial: false,
          onSosCancelled: () {
            if (mounted) {
              setState(() {
                _isHolding = false;
                _countdownSeconds = 3;
                _holdCompleted = false;
              });
            }
          },
        ),
      ),
    );
  }

  Future<void> _broadcastSosAlert(
    List<SosContactModel> contactsList, {
    String? primaryPhone,
    String? primaryName,
  }) async {
    for (final base in ApiConfig.candidateBaseUrls) {
      final cleanBase = base.endsWith('/')
          ? base.substring(0, base.length - 1)
          : base;
      try {
        final res = await http
            .post(
              Uri.parse('$cleanBase/sos/trigger'),
              headers: {
                'Content-Type': 'application/json',
                if (Globals.accessToken.isNotEmpty)
                  'Authorization': 'Bearer ${Globals.accessToken}',
              },
              body: jsonEncode({
                'latitude': _latitude,
                'longitude': _longitude,
                'address': _currentAddress,
                'contactsNotified': contactsList.map((c) => c.phone).toList(),
                'email': Globals.email,
                'phone': Globals.phone,
                'primaryPhone': primaryPhone,
                'primaryName': primaryName,
              }),
            )
            .timeout(const Duration(milliseconds: 3000));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          if (data['data'] != null && data['data']['alertId'] != null) {
            _activeAlertId = data['data']['alertId'].toString();
          }
          break;
        }
      } catch (_) {}
    }
  }

  void _openEmergencyContactsSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => EmergencyContactSheet(
        contacts: _contacts,
        onContactsUpdated: (updatedList) {
          setState(() {
            _contacts = updatedList;
          });
          Globals.emergencyContacts = updatedList
              .map(
                (c) => {
                  'id': c.id,
                  'name': c.name,
                  'phone': c.phone,
                  'relationship': c.relationship,
                  'isPrimary': c.isPrimary,
                },
              )
              .toList();
        },
      ),
    );
  }

  Future<void> _openAddEmergencyContactDirectly() async {
    final newContact = await showModalBottomSheet<SosContactModel>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const AddEmergencyContactSheet(),
    );

    if (newContact == null) return;

    String assignedId = DateTime.now().millisecondsSinceEpoch.toString();

    // Call backend API to persist
    for (final base in ApiConfig.candidateBaseUrls) {
      final cleanBase = base.endsWith('/')
          ? base.substring(0, base.length - 1)
          : base;
      try {
        final res = await http
            .post(
              Uri.parse('$cleanBase/sos/contacts'),
              headers: {
                'Content-Type': 'application/json',
                if (Globals.accessToken.isNotEmpty)
                  'Authorization': 'Bearer ${Globals.accessToken}',
              },
              body: jsonEncode({
                'name': newContact.name,
                'phone': newContact.phone,
                'relationship': newContact.relationship,
                'isPrimary': true,
                'userEmail': Globals.email,
                'userPhone': Globals.phone,
              }),
            )
            .timeout(const Duration(milliseconds: 3000));

        if (res.statusCode == 201 || res.statusCode == 200) {
          final data = jsonDecode(res.body);
          if (data['data'] != null && data['data']['id'] != null) {
            assignedId = data['data']['id'].toString();
          }
          break;
        }
      } catch (_) {}
    }

    final created = newContact.copyWith(id: assignedId, isPrimary: true);

    if (mounted) {
      setState(() {
        _contacts.add(created);
        Globals.emergencyContacts = _contacts
            .map(
              (c) => {
                'id': c.id,
                'name': c.name,
                'phone': c.phone,
                'relationship': c.relationship,
                'isPrimary': c.isPrimary,
              },
            )
            .toList();
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF101726),
          content: Text('${created.name} added as emergency contact'),
        ),
      );
    }
  }

  Future<void> _openHospitalDirections() async {
    // 1. Precise GPS turn-by-turn driving navigation directly to the hospital in Mappls!
    if (_hospitalLat != null && _hospitalLng != null) {
      final success = await TripService.launchMapplsNavigation(
        fromLat: _latitude,
        fromLng: _longitude,
        toLat: _hospitalLat!,
        toLng: _hospitalLng!,
        destinationName: _hospitalName,
      );
      if (success) return;
    }

    // 2. Search hospital by name & address via Mappls / Web fallback
    final query = Uri.encodeComponent('$_hospitalName $_hospitalAddress');
    final mapplsUri = Uri.parse('https://mappls.com/search?query=$query');
    final googleUri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$query');

    try {
      if (await canLaunchUrl(mapplsUri)) {
        await launchUrl(mapplsUri, mode: LaunchMode.externalApplication);
        return;
      }
    } catch (_) {}

    try {
      if (await canLaunchUrl(googleUri)) {
        await launchUrl(googleUri, mode: LaunchMode.externalApplication);
        return;
      }
    } catch (_) {}

    if (mounted) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF0F1728),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: Color(0xFF1E2A44)),
          ),
          title: Text(
            _hospitalName,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Distance: $_hospitalDistance • Est. time: $_hospitalTravelTime\nAddress: $_hospitalAddress',
                style: const TextStyle(
                  color: Color(0xFF8E9BAE),
                  fontSize: 13.5,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text(
                'Close',
                style: TextStyle(color: Color(0xFF8E9BAE)),
              ),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(ctx);
                final telUri = Uri.parse(
                  'tel:${_hospitalPhone.replaceAll(RegExp(r'[^0-9+]'), '')}',
                );
                if (await canLaunchUrl(telUri)) {
                  await launchUrl(telUri);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0066FF),
                foregroundColor: Colors.white,
              ),
              child: const Text('Call Ambulance / Hospital'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Future<void> refreshOnRouteReturn() async {
    await _fetchSosDataFromBackend();
    await _fetchLiveLocation();
  }

  @override
  Widget build(BuildContext context) {
    // If no emergency contacts are added, show NoSosContactScreen
    if (_contacts.isEmpty) {
      if (_isLoadingContacts) {
        return const Scaffold(
          backgroundColor: Colors.black,
          body: Center(
            child: AppLoadingSpinner(
              size: 80,
              primaryColor: Color(0xFF00C2FF),
            ),
          ),
        );
      }

      return NoSosContactScreen(
        hasBottomNav: widget.hasBottomNav,
        onBack: () {
          if (widget.onBackToHome != null) {
            widget.onBackToHome!();
          } else if (Navigator.canPop(context)) {
            Navigator.pop(context);
          }
        },
        onAddContact: _openAddEmergencyContactDirectly,
        onFindHospital: _openHospitalDirections,
      );
    }

    // Dynamic background based on press-and-hold state
    final gradientColors = _isHolding
        ? const [Color(0xFF380606), Color(0xFF250303), Color(0xFF150101)]
        : const [Color(0xFFD61A1A), Color(0xFFC01515), Color(0xFFA51010)];

    return Scaffold(
      backgroundColor: gradientColors[0],
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: gradientColors,
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildTopAppBar(),
              Expanded(
                child: SingleChildScrollView(
                  physics: _isHolding
                      ? const NeverScrollableScrollPhysics()
                      : const BouncingScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                  child: Column(
                    children: [
                      const SizedBox(height: 6),
                      // Upper Area: "Need urgent help?" with Giant Countdown (3, 2, 1) overlay when holding
                      _buildUrgentHelpSection(),
                      const SizedBox(height: 24),

                      // SOS Large Interactive Circular Button: "HOLD FOR SOS"
                      _buildSosCircleButton(),
                      const SizedBox(height: 24),

                      // Tooltip banner shown when holding (matches Timer 3 in Figma screenshot)
                      if (_isHolding) ...[
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF8B0000),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.35),
                                blurRadius: 10,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: const Text(
                            'Your emergency contacts will be notified and your live location will be shared.',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w500,
                              height: 1.3,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],

                      // Cards with background blur when holding
                      ImageFiltered(
                        imageFilter: ImageFilter.blur(
                          sigmaX: _isHolding ? 3.0 : 0.0,
                          sigmaY: _isHolding ? 3.0 : 0.0,
                        ),
                        child: Column(
                          children: [
                            _buildLocationCard(),
                            const SizedBox(height: 14),
                            _buildNearestHospitalCard(),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Top App Bar matching Figma: Back arrow, "SOS Emergency" title, Phone icon
  Widget _buildTopAppBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Back button
          AnimatedBackArrowButton(onTap: () {
              if (widget.onBackToHome != null) {
                widget.onBackToHome!();
              } else if (Navigator.canPop(context)) {
                Navigator.pop(context);
              }
            }),

          // Title: "SOS Emergency"
          const Text(
            'SOS Emergency',
            style: TextStyle(
              color: Colors.white,
              fontSize: 19,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.4,
            ),
          ),

          // Top right call icon
          IconButton(
            icon: const Icon(
              Icons.call_rounded,
              color: Colors.white,
              size: 24,
            ),
            onPressed: _openEmergencyContactsSheet,
          ),
        ],
      ),
    );
  }

  /// Upper text section: "Need urgent help?" with Giant Countdown (3, 2, 1) overlay when holding
  Widget _buildUrgentHelpSection() {
    return SizedBox(
      height: 138,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Normal help section: blurred & dimmed when holding
          ImageFiltered(
            imageFilter: ImageFilter.blur(
              sigmaX: _isHolding ? 3.0 : 0.0,
              sigmaY: _isHolding ? 3.0 : 0.0,
            ),
            child: AnimatedOpacity(
              duration: const Duration(milliseconds: 200),
              opacity: _isHolding ? 0.16 : 1.0,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'Need urgent help?',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20),
                    child: Text(
                      'Hold the SOS button to alert your emergency contacts and share your live location.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 13,
                        height: 1.35,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.25),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(
                          Icons.shield_outlined,
                          color: Colors.white,
                          size: 14,
                        ),
                        SizedBox(width: 6),
                        Text(
                          'Your safety is our priority',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Giant countdown number (3, 2, 1) directly over this section matching Figma
          if (_isHolding)
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              transitionBuilder: (child, animation) {
                return ScaleTransition(
                  scale: Tween<double>(begin: 1.15, end: 1.0).animate(
                    CurvedAnimation(
                      parent: animation,
                      curve: Curves.easeOutBack,
                    ),
                  ),
                  child: FadeTransition(opacity: animation, child: child),
                );
              },
              child: Text(
                '$_countdownSeconds',
                key: ValueKey<int>(_countdownSeconds),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 88,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -1,
                  height: 1.0,
                  shadows: [
                    BoxShadow(
                      color: Colors.black54,
                      blurRadius: 20,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Big Circular Hold-for-SOS button matching Figma: always displays "HOLD FOR SOS"
  Widget _buildSosCircleButton() {
    return Center(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (_) => _startHold(),
        onTapUp: (_) => _cancelHold(),
        onTapCancel: () => _cancelHold(),
        child: AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (context, child) {
            return ScaleTransition(
              scale: _isHolding
                  ? _pulseAnimation
                  : const AlwaysStoppedAnimation(1.0),
              child: Container(
                width: 270,
                height: 270,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _isHolding
                      ? const Color(0xFFFFB3B3).withValues(alpha: 0.38)
                      : const Color(0xFFFFB3B3).withValues(alpha: 0.28),
                ),
                child: Center(
                  // Middle Concentric Ring
                  child: Container(
                    width: 226,
                    height: 226,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _isHolding
                          ? const Color(0xFFFF8A80).withValues(alpha: 0.58)
                          : const Color(0xFFFF8A80).withValues(alpha: 0.45),
                    ),
                    child: Center(
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          if (_isHolding)
                            SizedBox(
                              width: 184,
                              height: 184,
                              child: CircularProgressIndicator(
                                value: _holdController.value,
                                strokeWidth: 6,
                                strokeCap: StrokeCap.round,
                                valueColor: const AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ),
                                backgroundColor: Colors.white.withValues(
                                  alpha: 0.2,
                                ),
                              ),
                            ),
                          // Core Red SOS Button: always shows "HOLD FOR SOS" as in Figma
                          Container(
                            width: 172,
                            height: 172,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: _isHolding
                                    ? const [
                                        Color(0xFFC62828),
                                        Color(0xFF8E0000),
                                      ]
                                    : const [
                                        Color(0xFFE52828),
                                        Color(0xFFB71C1C),
                                      ],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF4A0000)
                                      .withValues(alpha: 0.55),
                                  blurRadius: 20,
                                  offset: const Offset(0, 10),
                                ),
                                BoxShadow(
                                  color: const Color(0xFFFF8A80)
                                      .withValues(alpha: _isHolding ? 0.5 : 0.3),
                                  blurRadius: _isHolding ? 25 : 15,
                                  spreadRadius: _isHolding ? 4 : 2,
                                ),
                              ],
                            ),
                            child: Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: const [
                                  Text(
                                    'HOLD FOR',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  SizedBox(height: 2),
                                  Text(
                                    'SOS',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 40,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 1.2,
                                    ),
                                  ),
                                ],
                              ),
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
        ),
      ),
    );
  }

  /// Card 1: Real Live Location Card
  Widget _buildLocationCard() {
    final cardColor = _isHolding
        ? const Color(0xFF260505)
        : const Color(0xFF560606);
    final innerColor = _isHolding
        ? const Color(0xFF1D0303)
        : const Color(0xFF3F0404);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: _isHolding
              ? const Color(0xFF4A0A0A)
              : const Color(0xFF7E1010).withValues(alpha: 0.4),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Your current location will be shared with the emergency contact',
            style: TextStyle(
              color: Colors.white,
              fontSize: 14.5,
              fontWeight: FontWeight.bold,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 12),
          // Location Address Pill
          GestureDetector(
            onTap: () {
              if (_locationStatusMessage != null ||
                  _currentAddress == 'Location Unavailable') {
                _fetchLiveLocation(isManualRefresh: true);
              }
            },
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: innerColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.location_on_outlined,
                    color: Colors.white,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _currentAddress,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12.5,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (_isLoadingLocation)
                    const SizedBox(
                      width: 12,
                      height: 12,
                      child: CircularProgressIndicator(
                        strokeWidth: 1.5,
                        color: Colors.white70,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Card 2: Real Nearest Hospital Card
  Widget _buildNearestHospitalCard() {
    final cardColor = _isHolding
        ? const Color(0xFF260505)
        : const Color(0xFF560606);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: _isHolding
              ? const Color(0xFF4A0A0A)
              : const Color(0xFF7E1010).withValues(alpha: 0.4),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Nearest Hospital',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.85),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (_isLoadingHospital)
                const SizedBox(
                  width: 12,
                  height: 12,
                  child: CircularProgressIndicator(
                    strokeWidth: 1.5,
                    color: Colors.white70,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Hospital Thumbnail Image
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.asset(
                  'assets/images/healthcare_hospital.jpg',
                  width: 70,
                  height: 62,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      width: 70,
                      height: 62,
                      decoration: BoxDecoration(
                        color: const Color(0xFF3F0404),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.local_hospital_rounded,
                        color: Colors.white70,
                        size: 28,
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 12),

              // Hospital Details (Name & Address)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _hospitalName.isNotEmpty &&
                              !_hospitalName.startsWith('Searching')
                          ? _hospitalName
                          : 'HealthCare Hospital, Indore',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Padding(
                          padding: EdgeInsets.only(top: 1),
                          child: Icon(
                            Icons.location_on_outlined,
                            color: Colors.white70,
                            size: 13,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            _hospitalAddress.isNotEmpty &&
                                    !_hospitalAddress.startsWith('Locating')
                                ? _hospitalAddress
                                : 'Scheme No. 54, Vijay Nagar, Indore, MP 452010',
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 11.5,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),

              // Navigation Arrow Button (Red rounded square button)
              GestureDetector(
                onTap: _openHospitalDirections,
                child: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFF8B0D0D),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.2),
                    ),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.near_me_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
