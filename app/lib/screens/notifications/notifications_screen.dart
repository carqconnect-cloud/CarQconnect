import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'dart:convert';
import 'dart:async';

import '../../globals.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import 'notification_models.dart';
import '../../utils/api_config.dart';
import '../../services/auth_storage_service.dart';
import '../../utils/app_icons.dart';
import '../../services/screen_refresh_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../widgets/animated_back_arrow.dart';

class NotificationsScreen extends StatefulWidget {
  final bool startEmpty;
  final String initialSection;

  const NotificationsScreen({
    super.key,
    this.startEmpty = false,
    this.initialSection = 'All',
  });

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen>
    with RefreshOnRouteReturn<NotificationsScreen> {
  List<AppNotification> _notifications = [];
  late String _selectedSection; // 'All', 'Trips', 'Today', 'Yesterday', 'Earlier'
  bool _isLoading = true;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _selectedSection = widget.initialSection;
    _isLoading = true;
    _notifications = [];
    _fetchNotifications(showSpinner: true);
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (mounted) {
        _fetchNotifications(showSpinner: false);
      }
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchNotifications({bool showSpinner = false}) async {
    if (showSpinner && mounted) {
      setState(() => _isLoading = true);
    }

    try {
      List<AppNotification> fetched = [];
      if (Globals.accessToken.isNotEmpty) {
        final response = await AuthStorageService.authenticatedGet('/notifications');

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          if (data['success'] == true && data['data'] != null) {
            final List list = data['data'];
            fetched = list
                .map((e) => AppNotification.fromJson(e))
                .toList();
          }
        }
      }

      // If no notifications returned from API (or offline), pull local trips
      if (fetched.isEmpty) {
        try {
          final prefs = await SharedPreferences.getInstance();
          final key = Globals.email.isNotEmpty
              ? 'carq_saved_trips_${Globals.email}'
              : 'carq_saved_trips';
          final localTrips = prefs.getStringList(key) ?? [];
          for (final raw in localTrips) {
            try {
              final item = jsonDecode(raw);
              final status = (item['status'] ?? 'COMPLETED').toString().toUpperCase();
              final toName = item['toName'] ?? 'Destination';
              final fromName = item['fromName'] ?? 'Start';
              final distance = item['distance'] ?? '';
              final duration = item['duration'] ?? '';
              final time = item['completedAt'] ?? item['startedAt'] ?? item['createdAt'] ?? DateTime.now().toIso8601String();

              fetched.add(AppNotification.fromJson({
                'id': 'local_notif_${item['id'] ?? DateTime.now().millisecondsSinceEpoch}',
                'title': status == 'COMPLETED'
                    ? 'Trip Completed: $toName'
                    : (status == 'ACTIVE' ? 'Trip Started: $toName' : 'Trip Planned: $fromName → $toName'),
                'description': status == 'COMPLETED'
                    ? 'You arrived at $toName! Total distance: $distance, duration: $duration.'
                    : 'Route to $toName ($distance). Drive safely!',
                'type': 'trip',
                'isUnread': false,
                'createdAt': time,
              }));
            } catch (_) {}
          }
        } catch (_) {}
      }

      if (mounted) {
        setState(() {
          _notifications = fetched;
        });
        final hasUnread = _notifications.any((n) => n.isUnread);
        Globals.hasUnreadNotificationsNotifier.value = hasUnread;
      }
    } catch (e) {
      debugPrint('Error fetching notifications: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _markAllAsRead() async {
    setState(() {
      _notifications = _notifications
          .map((n) => n.copyWith(isUnread: false))
          .toList();
    });
    Globals.hasUnreadNotificationsNotifier.value = false;

    try {
      if (Globals.accessToken.isNotEmpty) {
        await http
            .post(
              ApiConfig.uri('/notifications/mark-read'),
              headers: {'Authorization': 'Bearer ${Globals.accessToken}'},
            )
            .timeout(const Duration(seconds: 4));
      }
    } catch (e) {
      debugPrint('Error marking as read: $e');
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('All notifications marked as read'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _markSingleAsRead(AppNotification item) async {
    if (!item.isUnread) return;

    setState(() {
      final idx = _notifications.indexWhere((n) => n.id == item.id);
      if (idx != -1) {
        _notifications[idx] = _notifications[idx].copyWith(isUnread: false);
      }
    });

    final hasUnread = _notifications.any((n) => n.isUnread);
    Globals.hasUnreadNotificationsNotifier.value = hasUnread;

    try {
      if (Globals.accessToken.isNotEmpty && item.id.isNotEmpty) {
        await http
            .patch(
              ApiConfig.uri('/notifications/${item.id}'),
              headers: {
                'Authorization': 'Bearer ${Globals.accessToken}',
                'Content-Type': 'application/json',
              },
              body: jsonEncode({'isUnread': false}),
            )
            .timeout(const Duration(seconds: 4));
      }
    } catch (e) {
      debugPrint('Error updating notification: $e');
    }
  }

  List<AppNotification> get _filteredNotifications {
    if (_selectedSection == 'All') {
      return _notifications;
    }
    if (_selectedSection == 'Trips') {
      return _notifications.where((item) {
        final t = item.type.toLowerCase().trim();
        final title = item.title.toLowerCase();
        final desc = item.description.toLowerCase();
        return t == 'trip' ||
            title.contains('trip') ||
            title.contains('route') ||
            desc.contains('trip') ||
            desc.contains('route') ||
            item.iconType == NotificationIconType.location;
      }).toList();
    }
    return _notifications
        .where(
          (item) =>
              item.section.trim().toLowerCase() ==
              _selectedSection.trim().toLowerCase(),
        )
        .toList();
  }

  void _deleteNotification(AppNotification item) async {
    final index = _notifications.indexWhere((n) => n.id == item.id);
    if (index == -1) return;

    setState(() {
      _notifications.removeAt(index);
    });

    try {
      await http.delete(
        ApiConfig.uri('/notifications/${item.id}'),
        headers: {'Authorization': 'Bearer ${Globals.accessToken}'},
      );
    } catch (e) {
      // Revert if failed
      if (mounted) {
        setState(() {
          _notifications.insert(index, item);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to delete notification')),
        );
      }
    }
  }


  @override
  Future<void> refreshOnRouteReturn() =>
      _fetchNotifications(showSpinner: false);

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final filtered = _filteredNotifications;
        final primaryColor = isLight
            ? const Color(0xFF0066FF)
            : const Color(0xFF00C2FF);
        final textPrimary = isLight ? const Color(0xFF0F172A) : Colors.white;
        final textSecondary = isLight
            ? const Color(0xFF64748B)
            : const Color(0xFF8E9BAE);

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
                'Notifications',
                style: TextStyle(
                  color: textPrimary,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                ),
              ),
              actions: [
                IconButton(
                  tooltip: 'Mark all as read',
                  icon: Icon(
                    Icons.done_all_rounded,
                    color: textPrimary,
                    size: 22,
                  ),
                  onPressed: _markAllAsRead,
                ),
              ],
            ),
            body: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 8),

                  // Top Filter Tabs Row (All, Today, Yesterday, Earlier)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        _buildFilterTab(
                          'All',
                          isLight,
                          primaryColor,
                          textSecondary,
                        ),
                        const SizedBox(width: 8),
                        _buildFilterTab(
                          'Trips',
                          isLight,
                          primaryColor,
                          textSecondary,
                        ),
                        const SizedBox(width: 8),
                        _buildFilterTab(
                          'Today',
                          isLight,
                          primaryColor,
                          textSecondary,
                        ),
                        const SizedBox(width: 8),
                        _buildFilterTab(
                          'Yesterday',
                          isLight,
                          primaryColor,
                          textSecondary,
                        ),
                        const SizedBox(width: 8),
                        _buildFilterTab(
                          'Earlier',
                          isLight,
                          primaryColor,
                          textSecondary,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Notification List or Empty State
                  Expanded(
                    child: RefreshIndicator(
                      color: primaryColor,
                      backgroundColor: isLight
                          ? Colors.white
                          : const Color(0xFF101726),
                      onRefresh: () => _fetchNotifications(showSpinner: false),
                      child: _isLoading
                          ? Center(
                              child: AppLoadingSpinner(
                                size: 70,
                                primaryColor: primaryColor,
                              ),
                            )
                          : (filtered.isEmpty
                                ? SingleChildScrollView(
                                    physics:
                                        const AlwaysScrollableScrollPhysics(),
                                    child: SizedBox(
                                      height:
                                          MediaQuery.of(context).size.height *
                                          0.65,
                                      child: _buildEmptyState(
                                        textPrimary,
                                        textSecondary,
                                        primaryColor,
                                      ),
                                    ),
                                  )
                                : _buildNotificationList(
                                    filtered,
                                    isLight,
                                    primaryColor,
                                    textPrimary,
                                    textSecondary,
                                  )),
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

  Widget _buildFilterTab(
    String label,
    bool isLight,
    Color primaryColor,
    Color textSecondary,
  ) {
    final bool isSelected =
        _selectedSection.trim().toLowerCase() == label.trim().toLowerCase();

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedSection = label;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? primaryColor
              : (isLight ? Colors.white : const Color(0xFF101726)),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? primaryColor
                : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C)),
          ),
          boxShadow: isSelected ? [] : (isLight ? AppTheme.cardShadow : null),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : textSecondary,
            fontSize: 13.5,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(
    Color textPrimary,
    Color textSecondary,
    Color primaryColor,
  ) {
    final isTrips = _selectedSection.trim().toLowerCase() == 'trips';
    final title = isTrips ? 'No Trip Notifications' : 'No Notifications Yet';
    final subtitle = isTrips
        ? 'Plan, start, or complete a trip to receive trip updates and alerts here.'
        : 'All quiet for now. We\'ll keep an eye on things.';

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const LowPolyCrystalEmptyIllustration(),
            const SizedBox(height: 28),
            Text(
              title,
              style: TextStyle(
                color: textPrimary,
                fontSize: 22,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.2,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(color: textSecondary, fontSize: 14, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationList(
    List<AppNotification> items,
    bool isLight,
    Color primaryColor,
    Color textPrimary,
    Color textSecondary,
  ) {
    if (_selectedSection == 'All') {
      final todayItems = items.where((i) => i.section == 'Today').toList();
      final yesterdayItems = items
          .where((i) => i.section == 'Yesterday')
          .toList();
      final earlierItems = items.where((i) => i.section == 'Earlier').toList();

      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          if (todayItems.isNotEmpty) ...[
            _buildSectionHeader('Today', textSecondary),
            ...todayItems.map(
              (item) => _buildDismissibleItem(
                item,
                isLight,
                primaryColor,
                textPrimary,
                textSecondary,
              ),
            ),
          ],
          if (yesterdayItems.isNotEmpty) ...[
            _buildSectionHeader('Yesterday', textSecondary),
            ...yesterdayItems.map(
              (item) => _buildDismissibleItem(
                item,
                isLight,
                primaryColor,
                textPrimary,
                textSecondary,
              ),
            ),
          ],
          if (earlierItems.isNotEmpty) ...[
            _buildSectionHeader('Earlier', textSecondary),
            ...earlierItems.map(
              (item) => _buildDismissibleItem(
                item,
                isLight,
                primaryColor,
                textPrimary,
                textSecondary,
              ),
            ),
          ],
          const SizedBox(height: 24),
        ],
      );
    }

    final headerTitle = _selectedSection.trim().toLowerCase() == 'trips'
        ? 'Trip Notifications (${items.length})'
        : _selectedSection;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      children: [
        _buildSectionHeader(headerTitle, textSecondary),
        ...items.map(
          (item) => _buildDismissibleItem(
            item,
            isLight,
            primaryColor,
            textPrimary,
            textSecondary,
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildSectionHeader(String title, Color textSecondary) {
    return Padding(
      padding: const EdgeInsets.only(top: 14, bottom: 10),
      child: Text(
        title,
        style: TextStyle(
          color: textSecondary,
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildDismissibleItem(
    AppNotification item,
    bool isLight,
    Color primaryColor,
    Color textPrimary,
    Color textSecondary,
  ) {
    return Dismissible(
      key: Key(item.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => _deleteNotification(item),
      background: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFEF4444),
          borderRadius: BorderRadius.circular(16),
        ),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.symmetric(horizontal: 22),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AppIcons.svg(
              AppIcons.delete,
              color: Colors.white,
              width: 22,
              height: 22,
            ),
            const SizedBox(height: 4),
            const Text(
              'Delete',
              style: TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: InkWell(
          onTap: () => _markSingleAsRead(item),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isLight ? Colors.white : const Color(0xFF101726),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isLight
                    ? const Color(0xFFE2E8F0)
                    : const Color(0xFF1C273C),
              ),
              boxShadow: isLight ? AppTheme.cardShadow : null,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon in rounded square container
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isLight
                        ? (item.iconColor == const Color(0xFFEF4444)
                              ? const Color(0xFFFEE2E2)
                              : (item.iconColor == const Color(0xFF10B981)
                                  ? const Color(0xFFD1FAE5)
                                  : const Color(0xFFEDF4FF)))
                        : item.iconBgColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: NotificationIconWidget(
                      type: item.iconType,
                      svgAsset: item.svgAsset,
                      color: isLight
                          ? (item.iconColor == const Color(0xFFEF4444)
                                ? const Color(0xFFEF4444)
                                : (item.iconColor == const Color(0xFF10B981)
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFF0066FF)))
                          : item.iconColor,
                      size: 22,
                    ),
                  ),
                ),

                const SizedBox(width: 14),

                // Title + Description
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: TextStyle(
                          color: textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item.description,
                        style: TextStyle(
                          color: textSecondary,
                          fontSize: 12.5,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 10),

                // Timestamp & Blue Unread Dot
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      item.timeAgo,
                      style: TextStyle(
                        color: isLight
                            ? const Color(0xFF94A3B8)
                            : const Color(0xFF64748B),
                        fontSize: 11.5,
                      ),
                    ),
                    if (item.isUnread) ...[
                      const SizedBox(height: 8),
                      Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          color: primaryColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
