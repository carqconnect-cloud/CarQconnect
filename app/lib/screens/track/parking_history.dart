import 'package:flutter/material.dart';

import '../../globals.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import 'live_vehicle_location.dart';
import 'track_service.dart';
import 'track_models.dart';
import '../notifications/notifications_screen.dart';
import '../../utils/app_icons.dart';
import '../../services/screen_refresh_service.dart';
import '../../widgets/animated_back_arrow.dart';

class VehicleHistoryScreen extends StatefulWidget {
  final Map<String, dynamic>? vehicle;
  final String? currentAddress;

  const VehicleHistoryScreen({super.key, this.vehicle, this.currentAddress});

  @override
  State<VehicleHistoryScreen> createState() => _VehicleHistoryScreenState();
}

class _VehicleHistoryScreenState extends State<VehicleHistoryScreen>
    with RefreshOnRouteReturn<VehicleHistoryScreen> {
  bool _isLoading = true;
  List<Map<String, String>> _parkingHistory = [];

  @override
  void initState() {
    super.initState();
    _loadParkingHistory();
  }

  Future<void> _loadParkingHistory({bool showSpinner = true}) async {
    if (showSpinner) setState(() => _isLoading = true);
    final history = await TrackService.getParkingHistory(
      vehicleName: widget.vehicle?['name'],
    );

    // If currentAddress is passed, ensure first item reflects it
    if (widget.currentAddress != null &&
        widget.currentAddress!.isNotEmpty &&
        history.isNotEmpty) {
      history[0]['location'] = widget.currentAddress!;
    }

    if (mounted) {
      setState(() {
        _parkingHistory = history;
        _isLoading = false;
      });
    }
  }

  @override
  Future<void> refreshOnRouteReturn() =>
      _loadParkingHistory(showSpinner: false);

  @override
  Widget build(BuildContext context) {
    final vehicleName =
        widget.vehicle?['name'] ??
        (Globals.vehicleModel.isNotEmpty ? Globals.vehicleModel : 'Vehicle');
    final vehicleReg =
        widget.vehicle?['regNumber'] ?? Globals.vehicleRegistration;

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
              centerTitle: true,
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
              title: Text(
                'Location History',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.2,
                ),
              ),
              actions: [
                IconButton(
                  icon: AppIcons.svg(
                    AppIcons.notification,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    width: 22,
                    height: 22,
                  ),
                  tooltip: 'Notifications',
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const NotificationsScreen(),
                      ),
                    );
                  },
                ),
              ],
            ),
            body: SafeArea(
              child: _isLoading
                  ? Center(
                      child: AppLoadingSpinner(
                        size: 80,
                        primaryColor: isLight
                            ? const Color(0xFF0066FF)
                            : const Color(0xFF00C2FF),
                      ),
                    )
                  : SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 8),

                          // Real Vehicle Card
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 14,
                            ),
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
                                Container(
                                  width: 58,
                                  height: 50,
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? const Color(0xFFEFF6FF)
                                        : const Color(0xFF142238),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                      color: isLight
                                          ? const Color(0xFFDBEAFE)
                                          : const Color(0xFF1E2D44),
                                    ),
                                  ),
                                  child: Center(
                                    child: AppIcons.svg(
                                      AppIcons.car,
                                      color: isLight
                                          ? const Color(0xFF0066FF)
                                          : const Color(0xFF00C2FF),
                                      width: 28,
                                      height: 28,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        vehicleName,
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
                                        vehicleReg,
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF64748B)
                                              : const Color(0xFF8E9BAE),
                                          fontSize: 13,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 3,
                                        ),
                                        decoration: BoxDecoration(
                                          color: isLight
                                              ? const Color(0xFFDCFCE7)
                                              : const Color(0xFF0B2B24),
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                          border: Border.all(
                                            color: isLight
                                                ? const Color(0xFFBBF7D0)
                                                : const Color(0xFF104A3A),
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              Icons.circle,
                                              size: 6,
                                              color: isLight
                                                  ? const Color(0xFF16A34A)
                                                  : const Color(0xFF00E676),
                                            ),
                                            const SizedBox(width: 5),
                                            Text(
                                              'GPS Connected',
                                              style: TextStyle(
                                                color: isLight
                                                    ? const Color(0xFF15803D)
                                                    : const Color(0xFF00E676),
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(
                                  Icons.chevron_right_rounded,
                                  color: isLight
                                      ? const Color(0xFF94A3B8)
                                      : const Color(0xFF8E9BAE),
                                  size: 22,
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 22),

                          // Section Header: Recent Parking
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Recent Parking',
                                style: TextStyle(
                                  color: isLight
                                      ? const Color(0xFF0F172A)
                                      : Colors.white,
                                  fontSize: 16.5,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                'See All',
                                style: TextStyle(
                                  color: isLight
                                      ? const Color(0xFF0066FF)
                                      : const Color(0xFF00C2FF),
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 12),

                          if (_parkingHistory.isEmpty)
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                color: isLight
                                    ? Colors.white
                                    : const Color(0xFF101726),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isLight
                                      ? const Color(0xFFE2E8F0)
                                      : const Color(0xFF1C273C),
                                ),
                                boxShadow: isLight ? AppTheme.cardShadow : null,
                              ),
                              child: Column(
                                children: [
                                  Icon(
                                    Icons.local_parking_rounded,
                                    color: isLight
                                        ? const Color(0xFF94A3B8)
                                        : const Color(0xFF64748B),
                                    size: 36,
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    'No Parking History Found',
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF0F172A)
                                          : Colors.white,
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Completed trip parking logs will appear here.',
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF64748B)
                                          : const Color(0xFF8E9BAE),
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          else
                            ..._parkingHistory.map((item) {
                              final isCurrent =
                                  item['status'] == 'Currently Parked';

                              return InkWell(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          LiveVehicleLocationScreen(
                                            vehicle: widget.vehicle,
                                          ),
                                    ),
                                  );
                                },
                                borderRadius: BorderRadius.circular(16),
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? Colors.white
                                        : const Color(0xFF101726),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: isCurrent
                                          ? (isLight
                                                ? const Color(0xFF0066FF)
                                                : const Color(0xFF00C2FF)
                                                      .withValues(alpha: 0.5))
                                          : (isLight
                                                ? const Color(0xFFE2E8F0)
                                                : const Color(0xFF1C273C)),
                                      width: isCurrent ? 1.5 : 1.0,
                                    ),
                                    boxShadow: isLight
                                        ? AppTheme.cardShadow
                                        : null,
                                  ),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.center,
                                    children: [
                                      // Vehicle Radar Beacon Icon
                                      Container(
                                        width: 52,
                                        height: 52,
                                        decoration: BoxDecoration(
                                          color: isLight
                                              ? const Color(0xFFEFF6FF)
                                              : const Color(0xFF0D1726),
                                          borderRadius: BorderRadius.circular(
                                            14,
                                          ),
                                          border: Border.all(
                                            color: isLight
                                                ? const Color(0xFFDBEAFE)
                                                : const Color(0xFF1B2A42),
                                          ),
                                        ),
                                        child: Stack(
                                          alignment: Alignment.center,
                                          children: [
                                            // Glowing Cyan Circle
                                            Container(
                                              width: 36,
                                              height: 36,
                                              decoration: BoxDecoration(
                                                shape: BoxShape.circle,
                                                color:
                                                    (isLight
                                                            ? const Color(
                                                                0xFF0066FF,
                                                              )
                                                            : const Color(
                                                                0xFF00C2FF,
                                                              ))
                                                        .withValues(
                                                          alpha: 0.12,
                                                        ),
                                                border: Border.all(
                                                  color: isLight
                                                      ? const Color(0xFF0066FF)
                                                      : const Color(0xFF00C2FF),
                                                  width: 1.4,
                                                ),
                                              ),
                                            ),
                                            // Mini Top-View Car
                                            const TopViewCarWidget(
                                              width: 12,
                                              height: 22,
                                              showGlow: false,
                                            ),
                                            // Bottom Indicator Dot
                                            Positioned(
                                              bottom: 5,
                                              child: Container(
                                                width: 4,
                                                height: 4,
                                                decoration: BoxDecoration(
                                                  shape: BoxShape.circle,
                                                  color: isLight
                                                      ? const Color(0xFF0066FF)
                                                      : const Color(0xFF00C2FF),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    item['title'] ?? 'Parking',
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                    style: TextStyle(
                                                      color: isLight
                                                          ? const Color(
                                                              0xFF0F172A,
                                                            )
                                                          : Colors.white,
                                                      fontSize: 15,
                                                      fontWeight:
                                                          FontWeight.bold,
                                                    ),
                                                  ),
                                                ),
                                                if (isCurrent)
                                                  Container(
                                                    padding:
                                                        const EdgeInsets.symmetric(
                                                          horizontal: 8,
                                                          vertical: 2,
                                                        ),
                                                    decoration: BoxDecoration(
                                                      color: isLight
                                                          ? const Color(
                                                              0xFFDCFCE7,
                                                            )
                                                          : const Color(
                                                              0xFF0B2B24,
                                                            ),
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                            8,
                                                          ),
                                                      border: Border.all(
                                                        color: isLight
                                                            ? const Color(
                                                                0xFFBBF7D0,
                                                              )
                                                            : const Color(
                                                                0xFF104A3A,
                                                              ),
                                                      ),
                                                    ),
                                                    child: Text(
                                                      'Parked Now',
                                                      style: TextStyle(
                                                        color: isLight
                                                            ? const Color(
                                                                0xFF15803D,
                                                              )
                                                            : const Color(
                                                                0xFF00E676,
                                                              ),
                                                        fontSize: 10.5,
                                                        fontWeight:
                                                            FontWeight.bold,
                                                      ),
                                                    ),
                                                  ),
                                              ],
                                            ),
                                            const SizedBox(height: 3),
                                            Text(
                                              item['location'] ??
                                                  'Location Unavailable',
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(
                                                color: isLight
                                                    ? const Color(0xFF64748B)
                                                    : const Color(0xFF8E9BAE),
                                                fontSize: 12.5,
                                              ),
                                            ),
                                            const SizedBox(height: 6),
                                            Row(
                                              children: [
                                                Icon(
                                                  Icons.calendar_today_outlined,
                                                  size: 12,
                                                  color: isLight
                                                      ? const Color(0xFF94A3B8)
                                                      : const Color(0xFF64748B),
                                                ),
                                                const SizedBox(width: 5),
                                                Expanded(
                                                  child: Text(
                                                    item['time'] ?? 'Recent',
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                    style: TextStyle(
                                                      color: isLight
                                                          ? const Color(
                                                              0xFF94A3B8,
                                                            )
                                                          : const Color(
                                                              0xFF64748B,
                                                            ),
                                                      fontSize: 11.5,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            if ((item['duration'] ?? '')
                                                .isNotEmpty) ...[
                                              const SizedBox(height: 3),
                                              Row(
                                                children: [
                                                  Icon(
                                                    Icons.access_time_rounded,
                                                    size: 12,
                                                    color: isLight
                                                        ? const Color(
                                                            0xFF94A3B8,
                                                          )
                                                        : const Color(
                                                            0xFF64748B,
                                                          ),
                                                  ),
                                                  const SizedBox(width: 5),
                                                  Text(
                                                    item['duration']!,
                                                    style: TextStyle(
                                                      color: isLight
                                                          ? const Color(
                                                              0xFF0066FF,
                                                            )
                                                          : const Color(
                                                              0xFF00C2FF,
                                                            ),
                                                      fontSize: 11.5,
                                                      fontWeight:
                                                          FontWeight.w600,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Icon(
                                        Icons.chevron_right_rounded,
                                        color: isLight
                                            ? const Color(0xFF94A3B8)
                                            : const Color(0xFF64748B),
                                        size: 20,
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
            ),
          ),
        );
      },
    );
  }
}
