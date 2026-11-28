import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import '../screens/trip/trip_service.dart';

/// Centralized Mappls (MapmyIndia) Tile Configuration for CarQConnect
class MapConfig {
  /// Primary Mappls (MapmyIndia) Raster Map Tile URL Template
  static String get mapplsTileUrl =>
      'https://apis.mappls.com/advancedmaps/v1/${TripService.mapplsApiKey}/map/{z}/{x}/{y}.png';

  /// Subdomains for tile server
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

  /// Reusable TileLayer strictly using Mappls (MapmyIndia) tiles (no OpenStreetMap fallback)
  static TileLayer buildTileLayer({
    String userAgentPackageName = 'com.carqconnect.app',
    double maxZoom = 20.0,
    int maxNativeZoom = 19,
    bool isDark = false,
    bool enableFallback = false,
    TileBuilder? tileBuilder,
  }) {
    return TileLayer(
      urlTemplate: mapplsTileUrl,
      subdomains: tileSubdomains,
      userAgentPackageName: userAgentPackageName,
      maxZoom: maxZoom,
      maxNativeZoom: maxNativeZoom,
      errorTileCallback: (tile, error, stackTrace) {},
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
