import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../globals.dart';
import 'track_models.dart';
import 'live_vehicle_location.dart';
import 'set_geofence.dart';
import '../../utils/app_icons.dart';
import '../../widgets/animated_back_arrow.dart';

class GeofenceCreatedScreen extends StatelessWidget {
  final GeofenceItem? geofence;

  const GeofenceCreatedScreen({super.key, this.geofence});

  @override
  Widget build(BuildContext context) {
    final item = geofence ??
        GeofenceItem(
          id: '1',
          name: 'My Zone',
          address: Globals.savedAddresses.isNotEmpty
              ? (Globals.savedAddresses.first['address'] ?? '')
              : '',
          radiusMeters: 500,
          isEnabled: true,
          icon: Icons.location_on_outlined,
        );

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            gradient: isLight ? AppTheme.bgGradient : null,
            color: isLight ? null : const Color(0xFF090E17),
          ),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            appBar: AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () {
                  Navigator.popUntil(context, (route) => route.isFirst);
                }),
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          const SizedBox(height: 30),

                          // Big Glowing Green Checkmark Badge with Halo Rings
                          Center(
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                // Outer Cyan Halo Ring
                                Container(
                                  width: 140,
                                  height: 140,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: (isLight
                                              ? const Color(0xFF0066FF)
                                              : const Color(0xFF00C2FF))
                                          .withValues(alpha: 0.2),
                                      width: 1.2,
                                    ),
                                  ),
                                ),
                                // Middle Glowing Ring
                                Container(
                                  width: 110,
                                  height: 110,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: const Color(0xFF00C853)
                                        .withValues(alpha: 0.12),
                                    border: Border.all(
                                      color: const Color(0xFF00C853)
                                          .withValues(alpha: 0.4),
                                      width: 1.6,
                                    ),
                                  ),
                                ),
                                // Inner Green Checkmark Badge
                                Container(
                                  width: 72,
                                  height: 72,
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Color(0xFF00C853),
                                  ),
                                  child: const Center(
                                    child: Icon(
                                      Icons.check,
                                      color: Colors.white,
                                      size: 42,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 28),

                          // Headings
                          Text(
                            'Geofence Created!',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF0F172A)
                                  : Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.2,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'You will now receive alerts for your vehicle movements in this territory.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF8E9BAE),
                              fontSize: 14,
                              height: 1.45,
                            ),
                          ),

                          const SizedBox(height: 32),

                          // Geofence Details Summary Card
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(18),
                            decoration: BoxDecoration(
                              color: isLight
                                  ? Colors.white
                                  : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isLight
                                    ? const Color(0xFFE2E8F0)
                                    : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Row(
                              children: [
                                GeofenceRadarThumbnail(
                                  isLight: isLight,
                                  size: 52,
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.name,
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF0F172A)
                                              : Colors.white,
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        item.address,
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF64748B)
                                              : const Color(0xFF8E9BAE),
                                          fontSize: 13,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Radius: ${item.radiusFormatted}',
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF0066FF)
                                              : const Color(0xFF00C2FF),
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),

                  // Two Bottom Action Buttons + View on map link
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
                    decoration: BoxDecoration(
                      color: isLight
                          ? Colors.white
                          : const Color(0xFF090E17),
                      border: isLight
                          ? const Border(
                              top: BorderSide(color: Color(0xFFE2E8F0)),
                            )
                          : null,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // 1. Done Button
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.pop(context);
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isLight
                                  ? const Color(0xFF0066FF)
                                  : const Color(0xFF00C2FF),
                              foregroundColor: isLight
                                  ? Colors.white
                                  : Colors.black,
                              elevation: isLight ? 2 : 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                            ),
                            child: Center(
                              child: Text(
                                'Done',
                                style: TextStyle(
                                  color: isLight
                                      ? Colors.white
                                      : Colors.black,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.2,
                                ),
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 12),

                        // 2. Add Another Geofence Button
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.pushReplacement(
                                context,
                                MaterialPageRoute(
                                  builder: (context) =>
                                      const SetGeofenceScreen(),
                                ),
                              );
                            },
                            style: OutlinedButton.styleFrom(
                              backgroundColor: isLight
                                  ? Colors.white
                                  : const Color(0xFF101726),
                              side: BorderSide(
                                color: isLight
                                    ? const Color(0xFFE2E8F0)
                                    : const Color(0xFF1E2B40),
                              ),
                              elevation: isLight ? 1 : 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                            ),
                            icon: AppIcons.svg(
                              AppIcons.plus,
                              color: isLight
                                  ? const Color(0xFF0F172A)
                                  : Colors.white,
                              width: 14,
                              height: 14,
                            ),
                            label: Text(
                              'Add Another Geofence',
                              style: TextStyle(
                                color: isLight
                                    ? const Color(0xFF0F172A)
                                    : Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 10),

                        // 3. View on Map text link
                        TextButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    const LiveVehicleLocationScreen(),
                              ),
                            );
                          },
                          icon: Icon(
                            Icons.location_on_outlined,
                            color: isLight
                                ? const Color(0xFF0066FF)
                                : const Color(0xFF00C2FF),
                            size: 16,
                          ),
                          label: Text(
                            'View on Map',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF0066FF)
                                  : const Color(0xFF00C2FF),
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class GeofenceRadarThumbnail extends StatelessWidget {
  final bool isLight;
  final double size;

  const GeofenceRadarThumbnail({
    super.key,
    required this.isLight,
    this.size = 52,
  });

  @override
  Widget build(BuildContext context) {
    final primary = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF0D1726),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isLight ? const Color(0xFFDBEAFE) : const Color(0xFF1B2A42),
          width: 1,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(13),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Perspective / Orthogonal Grid background
            CustomPaint(
              size: Size(size, size),
              painter: _GeofenceGridPainter(
                lineColor: (isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF))
                    .withValues(alpha: 0.16),
              ),
            ),
            // Circular geofence boundary with glowing cyan halo
            Container(
              width: size * 0.64,
              height: size * 0.64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: primary.withValues(alpha: 0.12),
                border: Border.all(
                  color: primary.withValues(alpha: 0.85),
                  width: 1.4,
                ),
              ),
            ),
            // Center glowing dot
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GeofenceGridPainter extends CustomPainter {
  final Color lineColor;

  _GeofenceGridPainter({required this.lineColor});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = lineColor
      ..strokeWidth = 0.8
      ..style = PaintingStyle.stroke;

    final step = size.width / 5;
    for (double i = 0; i <= size.width; i += step) {
      canvas.drawLine(Offset(i, 0), Offset(i, size.height), paint);
      canvas.drawLine(Offset(0, i), Offset(size.width, i), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _GeofenceGridPainter oldDelegate) =>
      oldDelegate.lineColor != lineColor;
}
