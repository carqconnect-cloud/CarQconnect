import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class VehicleLiveDataScreen extends StatelessWidget {
  final Function(int index)? onNavigateTab;
  final bool isObdConnected;

  const VehicleLiveDataScreen({
    super.key,
    this.onNavigateTab,
    this.isObdConnected = false,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Grid of 6 Sensor Cards (2 rows of 3)
              Row(
                children: [
                  Expanded(
                    child: _buildSensorCard(
                      isLight: isLight,
                      icon: Icons.tune_rounded,
                      value: '—',
                      unit: 'RPM',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildSensorCard(
                      isLight: isLight,
                      icon: Icons.speed_rounded,
                      value: '—',
                      unit: 'Speed',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildSensorCard(
                      isLight: isLight,
                      icon: Icons.thermostat_outlined,
                      value: '—',
                      unit: 'Engine Temp',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _buildSensorCard(
                      isLight: isLight,
                      icon: Icons.battery_charging_full_rounded,
                      value: '—',
                      unit: 'Battery Voltage',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildSensorCard(
                      isLight: isLight,
                      icon: Icons.science_outlined,
                      value: '—',
                      unit: 'Fuel Level',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildSensorCard(
                      isLight: isLight,
                      icon: Icons.bolt_rounded,
                      value: '—',
                      unit: 'L/100km\nFuel Economy',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // 2. Engine RPM Chart Card
              _buildChartCard(
                isLight: isLight,
                title: 'Engine RPM',
                yLabels: const ['6K', '4K', '2K', '0'],
                xLabels: const [],
                dataPoints: const [],
                lineColor: const Color(0xFFFFA000),
                fillColor: const Color(0xFFFFA000),
              ),
              const SizedBox(height: 18),

              // 3. Coolant Temperature Chart Card
              _buildChartCard(
                isLight: isLight,
                title: 'Coolant Temperature',
                yLabels: const ['120°', '90°', '60°', '30°'],
                xLabels: const [],
                dataPoints: const [],
                lineColor: const Color(0xFF0066FF),
                fillColor: const Color(0xFF0066FF),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSensorCard({
    required bool isLight,
    required IconData icon,
    required String value,
    required String unit,
  }) {
    return Container(
      height: 104,
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1A2E),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
          width: 1.0,
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
            size: 18,
          ),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 16.5,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(height: 3),
          Text(
            unit,
            style: TextStyle(
              color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
              fontSize: 10.5,
              height: 1.15,
            ),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildChartCard({
    required bool isLight,
    required String title,
    required List<String> yLabels,
    required List<String> xLabels,
    required List<double> dataPoints,
    required Color lineColor,
    required Color fillColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1A2E),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
          width: 1.0,
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                dataPoints.isEmpty ? 'No OBD stream' : 'Live',
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          if (dataPoints.isEmpty)
            Container(
              height: 120,
              width: double.infinity,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF070B18),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                ),
              ),
              child: Text(
                'Connect an OBD-II device to view live $title telemetry',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                  fontSize: 12.5,
                ),
              ),
            )
          else ...[
            // Chart with Y-axis + canvas + X-axis
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Y-Axis Labels
                SizedBox(
                  width: 32,
                  height: 120,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: yLabels
                        .map(
                          (l) => Text(
                            l,
                            style: const TextStyle(
                              color: Color(0xFF64748B),
                              fontSize: 11,
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
                const SizedBox(width: 8),

                // Chart Area
                Expanded(
                  child: SizedBox(
                    height: 120,
                    child: CustomPaint(
                      painter: _SmoothSplineChartPainter(
                        data: dataPoints,
                        lineColor: lineColor,
                        fillColor: fillColor,
                        gridCount: yLabels.length - 1,
                        isLight: isLight,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // X-Axis Labels
            if (xLabels.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(left: 40),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: xLabels
                      .map(
                        (t) => Text(
                          t,
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 10.5,
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _SmoothSplineChartPainter extends CustomPainter {
  final List<double> data;
  final Color lineColor;
  final Color fillColor;
  final int gridCount;
  final bool isLight;

  _SmoothSplineChartPainter({
    required this.data,
    required this.lineColor,
    required this.fillColor,
    required this.gridCount,
    required this.isLight,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty) return;

    // 1. Draw horizontal dotted grid lines
    final gridPaint = Paint()
      ..color = isLight
          ? const Color(0xFFE2E8F0)
          : const Color(0xFF1E2D4A).withValues(alpha: 0.6)
      ..strokeWidth = 1.0;

    for (int i = 0; i <= gridCount; i++) {
      final y = size.height * (i / gridCount);
      // Dotted line
      double x = 0;
      while (x < size.width) {
        canvas.drawLine(
          Offset(x, y),
          Offset(x + 4, y),
          gridPaint,
        );
        x += 8;
      }
    }

    // 2. Build curve points
    final points = <Offset>[];
    final stepX = size.width / (data.length - 1);
    for (int i = 0; i < data.length; i++) {
      final x = i * stepX;
      // data values are 0.0 to 1.0 from bottom
      final y = size.height - (data[i] * size.height);
      points.add(Offset(x, y));
    }

    // 3. Build smooth curve path
    final linePath = Path();
    linePath.moveTo(points[0].dx, points[0].dy);

    for (int i = 0; i < points.length - 1; i++) {
      final p0 = points[i];
      final p1 = points[i + 1];
      final controlX = (p0.dx + p1.dx) / 2;
      linePath.cubicTo(
        controlX,
        p0.dy,
        controlX,
        p1.dy,
        p1.dx,
        p1.dy,
      );
    }

    // 4. Fill path under curve
    final fillPath = Path.from(linePath);
    fillPath.lineTo(size.width, size.height);
    fillPath.lineTo(0, size.height);
    fillPath.close();

    final fillGradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        fillColor.withValues(alpha: isLight ? 0.2 : 0.35),
        fillColor.withValues(alpha: 0.0),
      ],
      stops: const [0.0, 1.0],
    );

    final fillPaint = Paint()
      ..shader = fillGradient.createShader(
        Rect.fromLTWH(0, 0, size.width, size.height),
      )
      ..style = PaintingStyle.fill;

    canvas.drawPath(fillPath, fillPaint);

    // 5. Draw the glowing line
    final linePaint = Paint()
      ..color = lineColor
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    canvas.drawPath(linePath, linePaint);
  }

  @override
  bool shouldRepaint(covariant _SmoothSplineChartPainter oldDelegate) => true;
}
