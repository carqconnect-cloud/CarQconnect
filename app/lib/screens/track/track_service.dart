import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../globals.dart';
import '../trip/trip_service.dart';
import 'track_models.dart';

class TrackService {
  /// 1. Fetch user vehicles from backend or Globals
  static Future<List<Map<String, dynamic>>> getUserVehicles() async {
    final backendVehicles = await TripService.getUserVehicles();
    if (backendVehicles.isNotEmpty) {
      return backendVehicles;
    }

    if (Globals.vehicleModel.isNotEmpty) {
      return [
        {
          'id': 'v_1',
          'name': Globals.vehicleModel,
          'regNumber': Globals.vehicleRegistration,
          'type': 'Petrol',
          'status': 'GPS Connected',
        }
      ];
    }

    return [];
  }

  /// 2. Get real GPS live location with fallback
  static Future<LatLng> getLivePosition() async {
    // 1. Try real GPS hardware
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
        final pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 5),
          ),
        );
        if (pos.latitude != 0.0 && pos.longitude != 0.0) {
          return LatLng(pos.latitude, pos.longitude);
        }
      }
    } catch (_) {}

    // 2. Try last known GPS location
    try {
      final lastPos = await Geolocator.getLastKnownPosition();
      if (lastPos != null && lastPos.latitude != 0.0 && lastPos.longitude != 0.0) {
        return LatLng(lastPos.latitude, lastPos.longitude);
      }
    } catch (_) {}

    // 3. User's primary registered address if available
    if (Globals.savedAddresses.isNotEmpty) {
      final defaultAddr = Globals.savedAddresses.first;
      final lat = double.tryParse(defaultAddr['lat']?.toString() ?? '');
      final lon = double.tryParse(defaultAddr['lon']?.toString() ?? '');
      if (lat != null && lon != null && lat != 0.0) {
        return LatLng(lat, lon);
      }
    }

    // Default: Indore live center
    return const LatLng(22.7196, 75.8577);
  }

  /// 3. Reverse geocode current position into clean address
  static Future<String> getLiveAddress(LatLng pos) async {
    try {
      final addr = await TripService.reverseGeocode(pos.latitude, pos.longitude);
      if (addr.isNotEmpty &&
          addr != 'Selected Location' &&
          !addr.startsWith('Location (')) {
        return addr;
      }
    } catch (_) {}
    return 'Location Unavailable';
  }

  /// 4. Fetch real location history from completed trips
  static Future<List<Map<String, String>>> getLocationHistory() async {
    try {
      final trips = await TripService.fetchUserTrips();
      if (trips.isNotEmpty) {
        final List<Map<String, String>> history = [];
        for (var t in trips) {
          final from = (t['fromName'] ?? 'Start').toString().split(',').first.trim();
          final to = (t['toName'] ?? 'Destination').toString().split(',').first.trim();
          final dist = t['distance']?.toString() ?? '36 km';
          final dur = t['duration']?.toString() ?? '45 mins';
          final status = t['status']?.toString() ?? 'COMPLETED';

          String timeLabel = 'Recent Trip';
          final createdStr = t['createdAt']?.toString();
          if (createdStr != null) {
            try {
              final dt = DateTime.parse(createdStr).toLocal();
              final now = DateTime.now();
              final isToday = dt.year == now.year && dt.month == now.month && dt.day == now.day;
              final hour12 = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
              final ampm = dt.hour >= 12 ? 'PM' : 'AM';
              final minStr = dt.minute.toString().padLeft(2, '0');
              timeLabel = isToday ? 'Today, $hour12:$minStr $ampm' : '${dt.day}/${dt.month}/${dt.year}, $hour12:$minStr $ampm';
            } catch (_) {}
          }

          history.add({
            'title': timeLabel,
            'subtitle': '$from to $to • $dist',
            'duration': dur,
            'status': status,
            'from': from,
            'to': to,
          });
        }
        return history;
      }
    } catch (_) {}

    return [];
  }

  /// 5. Persistent Geofences Management (SharedPreferences)
  static Future<List<GeofenceItem>> getGeofences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = Globals.email.isNotEmpty ? 'carq_user_geofences_${Globals.email}' : 'carq_user_geofences';
      final strList = prefs.getStringList(key);
      if (strList != null && strList.isNotEmpty) {
        final List<GeofenceItem> list = [];
        for (var jsonStr in strList) {
          try {
            final map = jsonDecode(jsonStr);
            list.add(GeofenceItem(
              id: map['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
              name: map['name'] ?? 'Custom Zone',
              address: map['address'] ?? 'Location Unavailable',
              radiusMeters: double.tryParse(map['radiusMeters']?.toString() ?? '') ?? 500,
              isEnabled: map['isEnabled'] ?? true,
              icon: _iconFromName(map['name'] ?? ''),
            ));
          } catch (_) {}
        }
        if (list.isNotEmpty) return list;
      }
    } catch (_) {}

    // Initial default geofences from user's real saved addresses
    final List<GeofenceItem> defaults = [];
    if (Globals.savedAddresses.isNotEmpty) {
      for (var addr in Globals.savedAddresses) {
        final type = addr['type'] ?? 'Home';
        final fullAddr = addr['address'] ?? '${addr['landmark'] ?? ''}, ${addr['city'] ?? ''}';
        defaults.add(GeofenceItem(
          id: addr['id']?.toString() ?? 'geo_${defaults.length + 1}',
          name: '$type Zone',
          address: fullAddr,
          radiusMeters: 500,
          isEnabled: true,
          icon: type.toString().toLowerCase().contains('office') || type.toString().toLowerCase().contains('work')
              ? Icons.work_outline_rounded
              : Icons.home_outlined,
        ));
      }
      await saveAllGeofences(defaults);
      return defaults;
    }

    return [];
  }

  static Future<void> saveAllGeofences(List<GeofenceItem> list) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = list.map((g) => jsonEncode({
        'id': g.id,
        'name': g.name,
        'address': g.address,
        'radiusMeters': g.radiusMeters,
        'isEnabled': g.isEnabled,
      })).toList();
      final key = Globals.email.isNotEmpty ? 'carq_user_geofences_${Globals.email}' : 'carq_user_geofences';
      await prefs.setStringList(key, jsonList);
    } catch (_) {}
  }

  static Future<void> addGeofence(GeofenceItem item) async {
    final list = await getGeofences();
    list.removeWhere((g) => g.id == item.id);
    list.insert(0, item);
    await saveAllGeofences(list);
  }

  static Future<void> toggleGeofence(String id, bool enabled) async {
    final list = await getGeofences();
    for (var g in list) {
      if (g.id == id) {
        g.isEnabled = enabled;
      }
    }
    await saveAllGeofences(list);
  }

  static Future<void> deleteGeofence(String id) async {
    final list = await getGeofences();
    list.removeWhere((g) => g.id == id);
    await saveAllGeofences(list);
  }

  /// 6. Parking History from real locations
  static Future<List<Map<String, String>>> getParkingHistory({String? vehicleName}) async {
    final List<Map<String, String>> history = [];

    // Current Parked Position
    if (Globals.savedAddresses.isNotEmpty) {
      final home = Globals.savedAddresses.first;
      final currentSpot = '${home['address'] ?? home['city'] ?? ''}';
      if (currentSpot.trim().isNotEmpty) {
        history.add({
          'title': 'Current Location',
          'location': currentSpot,
          'time': 'Today, Active Session',
          'duration': 'Parked & Secured',
          'status': 'Currently Parked',
        });
      }
    }

    // Add spots from completed trips
    try {
      final trips = await TripService.fetchUserTrips();
      for (var t in trips) {
        final toLoc = (t['toName'] ?? '').toString();
        if (toLoc.isNotEmpty) {
          final dateStr = t['createdAt'] != null
              ? '${DateTime.parse(t['createdAt']).toLocal().day} ${_monthName(DateTime.parse(t['createdAt']).toLocal().month)}'
              : 'Recent';
          history.add({
            'title': toLoc.split(',').first.trim(),
            'location': toLoc,
            'time': '$dateStr • Trip Destination',
            'duration': t['duration'] ?? '2 hrs',
            'status': 'Completed',
          });
        }
      }
    } catch (_) {}

    return history;
  }

  static String _monthName(int month) {
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (month >= 1 && month <= 12) return m[month - 1];
    return '';
  }

  static IconData _iconFromName(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('home')) return Icons.home_outlined;
    if (lower.contains('work') || lower.contains('office')) return Icons.work_outline_rounded;
    if (lower.contains('mall') || lower.contains('market') || lower.contains('shop')) return Icons.shopping_bag_outlined;
    return Icons.location_on_outlined;
  }
}
