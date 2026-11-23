import 'package:flutter/material.dart';

import 'dart:convert';
import 'dart:async';

import '../../globals.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../utils/app_icons.dart';
import 'reminder_models.dart';
import 'select_reminder_type_screen.dart';
import 'reminder_details_screen.dart';
import '../../services/screen_refresh_service.dart';
import '../../services/auth_storage_service.dart';
import '../../widgets/animated_back_arrow.dart';

class RemindersScreen extends StatefulWidget {
  const RemindersScreen({super.key});

  @override
  State<RemindersScreen> createState() => _RemindersScreenState();
}

class _RemindersScreenState extends State<RemindersScreen>
    with RefreshOnRouteReturn<RemindersScreen> {
  String _selectedFilter = 'All'; // 'All', 'Upcoming', 'Overdue', 'Completed'
  List<ReminderItem> _reminders = List.from(kSampleReminders);
  bool _isLoading = true;
  String _vehicleName = Globals.vehicleModel.isNotEmpty
      ? Globals.vehicleModel
      : 'My Vehicle';
  String _vehicleReg = Globals.vehicleRegistration;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _fetchData(showSpinner: true);
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) {
        _fetchData(showSpinner: false);
      }
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchData({bool showSpinner = false}) async {
    if (showSpinner) {
      setState(() => _isLoading = true);
    }
    try {
      final vehicleRequest = AuthStorageService.authenticatedGet('/app-qr/vehicles');
      final remindersRequest = AuthStorageService.authenticatedGet('/reminders');
      try {
        final vRes = await vehicleRequest;
        if (vRes.statusCode == 200) {
          final vData = jsonDecode(vRes.body);
          if (vData['success'] &&
              vData['data'] != null &&
              vData['data'].isNotEmpty) {
            final v = vData['data'][0];
            _vehicleName = v['name'] ?? Globals.vehicleModel;
            _vehicleReg = v['regNumber'] ?? Globals.vehicleRegistration;
          }
        }
      } catch (e) {
        debugPrint('Vehicle data could not be loaded for reminders: $e');
      }

      try {
        final rRes = await remindersRequest;
        if (rRes.statusCode == 200) {
          final rData = jsonDecode(rRes.body);
          if (rData['success'] && rData['data'] != null) {
            final List list = rData['data'];
            _reminders = list.map((e) => ReminderItem.fromJson(e)).toList();
          }
        }
      } catch (e) {
        debugPrint('Reminder data could not be loaded: $e');
      }
    } catch (e) {
      debugPrint('Error fetching reminders: $e');
    } finally {
      if (mounted) {
        setState(() {
          if (showSpinner) _isLoading = false;
        });
      }
    }
  }

  List<ReminderItem> get _filteredReminders {
    if (_selectedFilter == 'All') {
      return _reminders;
    }
    return _reminders
        .where((r) => r.statusCategory == _selectedFilter)
        .toList();
  }

  @override
  Future<void> refreshOnRouteReturn() => _fetchData(showSpinner: false);

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final reminders = _filteredReminders;

        return Container(
          decoration: BoxDecoration(gradient: AppTheme.bgGradient),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            appBar: AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              centerTitle: true,
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
              title: Text(
                'Reminders',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: RefreshIndicator(
                      color: AppTheme.primaryBlue,
                      backgroundColor: AppTheme.cardBg,
                      onRefresh: () => _fetchData(showSpinner: false),
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 8),

                            // Vehicle Selector Card matching Screen 1
                            VehicleSelectorCard(
                              vehicleName: _vehicleName,
                              vehicleNumber: _vehicleReg,
                            ),

                            const SizedBox(height: 18),

                            // Filter Tabs (All, Upcoming, Overdue, Completed)
                            Row(
                              children: [
                                _buildFilterPill('All'),
                                const SizedBox(width: 8),
                                _buildFilterPill('Upcoming'),
                                const SizedBox(width: 8),
                                _buildFilterPill('Overdue'),
                                const SizedBox(width: 8),
                                _buildFilterPill('Completed'),
                              ],
                            ),

                            const SizedBox(height: 18),

                            // Reminders Cards List
                            if (_isLoading)
                              Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(32),
                                  child: AppLoadingSpinner(
                                    size: 70,
                                    primaryColor: AppTheme.primaryBlue,
                                  ),
                                ),
                              )
                            else if (reminders.isEmpty)
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 40,
                                ),
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.event_available_outlined,
                                      color: AppTheme.textMuted,
                                      size: 48,
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      _selectedFilter == 'All'
                                          ? 'No reminders yet. Tap "Add Custom Reminder" below to get started.'
                                          : 'No $_selectedFilter reminders',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: AppTheme.textSecondary,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            else
                              ...reminders.map((reminder) {
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: InkWell(
                                    onTap: () async {
                                      await Navigator.push<ReminderItem>(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) =>
                                              ReminderDetailsScreen(
                                                reminder: reminder,
                                              ),
                                        ),
                                      );
                                      if (mounted) {
                                        _fetchData(showSpinner: false);
                                      }
                                    },
                                    borderRadius: BorderRadius.circular(16),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 16,
                                        vertical: 14,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppTheme.cardBg,
                                        borderRadius: BorderRadius.circular(16),
                                        border: Border.all(
                                          color: AppTheme.cardBorder,
                                        ),
                                        boxShadow: AppTheme.cardShadow,
                                      ),
                                      child: Row(
                                        children: [
                                          // Left Icon inside container
                                          Container(
                                            width: 44,
                                            height: 44,
                                            decoration: BoxDecoration(
                                              color: reminder.iconBgColor,
                                              borderRadius:
                                                  BorderRadius.circular(12),
                                            ),
                                            child: Center(
                                              child: reminder.svgAsset != null
                                                  ? AppIcons.svg(
                                                      reminder.svgAsset!,
                                                      color: reminder.iconColor,
                                                      width: 22,
                                                      height: 22,
                                                    )
                                                  : Icon(
                                                      reminder.icon,
                                                      color: reminder.iconColor,
                                                      size: 22,
                                                    ),
                                            ),
                                          ),

                                          const SizedBox(width: 14),

                                          // Title + Due Status (e.g. Overdue by 5 days)
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  reminder.title,
                                                  style: TextStyle(
                                                    color: AppTheme.textPrimary,
                                                    fontSize: 15.5,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                                const SizedBox(height: 3),
                                                Text(
                                                  reminder.dueStatus,
                                                  style: TextStyle(
                                                    color: reminder.statusColor,
                                                    fontSize: 12.5,
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),

                                          // Chevron Right
                                          Icon(
                                            Icons.chevron_right_rounded,
                                            color: AppTheme.textSecondary,
                                            size: 22,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              }),

                            const SizedBox(height: 16),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Bottom Add Reminder Button
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
                    decoration: const BoxDecoration(color: Colors.transparent),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          await Navigator.push<ReminderItem>(
                            context,
                            MaterialPageRoute(
                              builder: (context) =>
                                  const SelectReminderTypeScreen(),
                            ),
                          );
                          if (mounted) {
                            _fetchData(showSpinner: false);
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryBlue,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(26),
                          ),
                        ),
                        icon: AppIcons.svg(
                          AppIcons.plus,
                          color: Colors.white,
                          width: 20,
                          height: 20,
                        ),
                        label: const Text(
                          'Add Reminder',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
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

  Widget _buildFilterPill(String label) {
    final bool isSelected = _selectedFilter == label;

    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedFilter = label;
          });
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.primaryBlue : AppTheme.cardBg,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? AppTheme.primaryBlue : AppTheme.cardBorder,
            ),
            boxShadow: isSelected ? [] : AppTheme.cardShadow,
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? Colors.white : AppTheme.textSecondary,
              fontSize: 12.5,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}
