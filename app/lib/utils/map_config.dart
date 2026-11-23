import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import '../screens/trip/trip_service.dart';

/// Centralized Map & Tiles Configuration for CarQConnect
/// Powers all FlutterMap instances across the app with official Mappls (MapmyIndia) map tiles
class MapConfig {
  /// Primary Mappls (MapmyIndia) Raster Map Tile URL Template
  static String get mapplsTileUrl =>
      'https://apis.mappls.com/advancedmaps/v1/${TripService.mapplsApiKey}/map/{z}/{x}/{y}.png';

  /// Fallback tile URL (Official OpenStreetMap Standard - 100% Free, No Watermark, No API Key Required)
  static const String fallbackOpenTileUrl =
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  /// Subdomains for tile server fallback
  static const List<String> tileSubdomains = ['a', 'b', 'c'];

  /// High-contrast ColorFilter matrix for Dark Theme Maps
  static const ColorFilter darkMapFilter = ColorFilter.matrix(<double>[
    -0.65, 0, 0, 0, 165,
    0, -0.65, 0, 0, 175,
    0, 0, -0.60, 0, 190,
    0, 0, 0, 1.0, 0,
  ]);

  /// Default dark tile builder
  static Widget darkTileBuilder(
    BuildContext context,
    Widget tileWidget,
    dynamic tile,
  ) {
    return ColorFiltered(
      colorFilter: darkMapFilter,
      child: tileWidget,
    );
  }

  /// Reusable TileLayer using Mappls (MapmyIndia) primary tiles
  static TileLayer buildTileLayer({
    String userAgentPackageName = 'com.carqconnect.app',
    double maxZoom = 20.0,
    int maxNativeZoom = 19,
    bool isDark = false,
    bool enableFallback = true,
    TileBuilder? tileBuilder,
  }) {
    return TileLayer(
      urlTemplate: mapplsTileUrl,
      fallbackUrl: enableFallback ? fallbackOpenTileUrl : null,
      subdomains: tileSubdomains,
      userAgentPackageName: userAgentPackageName,
      maxZoom: maxZoom,
      maxNativeZoom: maxNativeZoom,
      tileBuilder: tileBuilder ??
          (isDark
              ? (context, tileWidget, tile) => ColorFiltered(
                    colorFilter: darkMapFilter,
                    child: tileWidget,
                  )
              : null),
    );
  }
}
