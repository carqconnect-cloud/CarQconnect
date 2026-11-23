import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'add_emergency_contact_sheet.dart';
import '../../utils/map_config.dart';
import '../../widgets/mappls_native_map.dart';
import '../trip/trip_service.dart';
import '../../utils/api_config.dart';
import '../../globals.dart';
import '../../loading.dart';

/// Screen matching Dedicated SOS Active Emergency Screen:
/// Displays Live Map of User Location, Primary Emergency Contact Call Status,
/// Google Maps Link, Redial & WhatsApp share actions, and Helpline shortcuts.
class SosCallingScreen extends StatefulWidget {
  final List<SosContactModel> contacts;
  final SosContactModel? initialContact;
  final String? address;
  final double? latitude;
  final double? longitude;
  final String? alertId;
  final bool autoDial;
  final VoidCallback? onSosCancelled;

  const SosCallingScreen({
    super.key,
    required this.contacts,
    this.initialContact,
    this.address,
    this.latitude,
    this.longitude,
    this.alertId,
    this.autoDial = false,
    this.onSosCancelled,
  });

  @override
  State<SosCallingScreen> createState() => _SosCallingScreenState();
}

class _SosCallingScreenState extends State<SosCallingScreen>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  late AnimationController _glowController;
  late Animation<double> _glowAnimation;

  Timer? _callDurationTimer;
  int _secondsElapsed = 0;
  // Safety Auto-Cut: Automatically ends SOS after 2 minutes (120 seconds) if left unattended
  static const int _defaultAutoCutLimit = 120;
  int _autoCutSeconds = _defaultAutoCutLimit;
  int get _secondsRemaining => (_autoCutSeconds - _secondsElapsed).clamp(0, 9999);

  late SosContactModel? _activeContact;
  bool _isCancelling = false;

  late final MapController _mapController;

  SosContactModel? get _primaryContact {
    if (widget.contacts.isEmpty) return null;
    return widget.contacts.firstWhere(
      (c) => c.isPrimary,
      orElse: () => widget.contacts.first,
    );
  }

  double get _lat => widget.latitude ?? 22.7196;
  double get _lng => widget.longitude ?? 75.8577;
  String get _mapsUrl =>
      'https://mappls.com/navigation?places=${_lat.toStringAsFixed(6)},${_lng.toStringAsFixed(6)}&isNav=true&mode=driving';

  @override
  void initState() {
    super.initState();
    HapticFeedback.heavyImpact();

    _mapController = MapController();
    _activeContact = widget.initialContact ?? _primaryContact;

    // Pulse animation for emergency beacon on map
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.9, end: 1.35).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Glowing badge animation
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _glowAnimation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _glowController, curve: Curves.easeInOut),
    );

    // Live call duration timer & Safety Auto-Cut Watcher (1-3 min, default 2 min)
    _callDurationTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        _secondsElapsed++;
      });

      // Auto-cut when timer expires if user forgot to manually cancel
      if (_secondsElapsed >= _autoCutSeconds && !_isCancelling) {
        _onCancelSos(autoCut: true);
      }
    });

    if (widget.autoDial) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _dialPhone(_activeContact?.phone ?? '112');
      });
    }
  }

  @override
  void dispose() {
    _callDurationTimer?.cancel();
    _pulseController.dispose();
    _glowController.dispose();
    super.dispose();
  }

  String _formatTimer(int totalSeconds) {
    final mins = (totalSeconds ~/ 60).toString().padLeft(2, '0');
    final secs = (totalSeconds % 60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }

  Future<void> _dialPhone(String rawPhone, {String? name}) async {
    final cleanPhone = rawPhone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (cleanPhone.isEmpty) return;

    final uri = Uri.parse('tel:$cleanPhone');
    try {
      final launched =
          await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        await launchUrl(uri);
      }
    } catch (_) {
      try {
        await launchUrl(uri);
      } catch (e) {
        debugPrint('Phone dial launcher error: $e');
      }
    }
  }

  Future<void> _shareLocationViaWhatsApp() async {
    final phone = _activeContact?.phone ?? '';
    final cleanPhone = phone.replaceAll(RegExp(r'[^0-9]'), '');
    final msg =
        '🚨 EMERGENCY SOS! ${Globals.firstName.isNotEmpty ? Globals.firstName : 'User'} needs urgent help! Live GPS Location: $_mapsUrl (Address: ${widget.address ?? 'Current Location'}). Please respond immediately.';

    try {
      final waUri = Uri.parse(
          'https://wa.me/$cleanPhone?text=${Uri.encodeComponent(msg)}');
      if (await canLaunchUrl(waUri)) {
        await launchUrl(waUri, mode: LaunchMode.externalApplication);
        return;
      }
    } catch (_) {}

    // Fallback to SMS
    final smsUri = Uri.parse(
        'sms:$cleanPhone?body=${Uri.encodeComponent(msg)}');
    try {
      if (await canLaunchUrl(smsUri)) {
        await launchUrl(smsUri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
  }

  void _extendAutoCutTime() {
    HapticFeedback.lightImpact();
    setState(() {
      _autoCutSeconds += 60; // Add 1 minute to auto-cut timer
    });
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF1E293B),
        duration: const Duration(seconds: 2),
        content: Text(
          'Extended session by 1 min (Auto-ends in ${_formatTimer(_secondsRemaining)})',
          style: const TextStyle(color: Colors.white),
        ),
      ),
    );
  }

  void _onCancelSos({bool autoCut = false}) async {
    if (_isCancelling) return;
    HapticFeedback.mediumImpact();
    setState(() => _isCancelling = true);

    _callDurationTimer?.cancel();

    // Call backend /sos/cancel
    for (final base in ApiConfig.candidateBaseUrls) {
      final cleanBase =
          base.endsWith('/') ? base.substring(0, base.length - 1) : base;
      try {
        await http.post(
          Uri.parse('$cleanBase/sos/cancel'),
          headers: {
            'Content-Type': 'application/json',
            if (Globals.accessToken.isNotEmpty)
              'Authorization': 'Bearer ${Globals.accessToken}',
          },
          body: jsonEncode({
            'alertId': widget.alertId ?? 'LATEST',
            'email': Globals.email,
            'phone': Globals.phone,
          }),
        ).timeout(const Duration(milliseconds: 3000));
        break;
      } catch (_) {}
    }

    if (widget.onSosCancelled != null) {
      widget.onSosCancelled!();
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF101726),
          content: Text(
            autoCut
                ? '⏱️ SOS Session automatically ended after 2 minutes & marked safe.'
                : 'SOS Distress Alert has been cancelled.',
          ),
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final contact = _activeContact ?? _primaryContact;

    return Scaffold(
      backgroundColor: const Color(0xFF070B13),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color(0xFF280709),
              Color(0xFF120A13),
              Color(0xFF090D16),
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Top Bar with Live Alert Badge & Timer
              _buildTopBar(),

              // Safety Auto-Cut Countdown Banner
              _buildAutoCutBanner(),
              const SizedBox(height: 4),

              // Scrollable Content
              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 6, 16, 24),
                  child: Column(
                    children: [
                      // Card 1: Calling Primary Emergency Contact Hero Card
                      _buildPrimaryContactCard(contact),
                      const SizedBox(height: 16),

                      // Card 2: Interactive Real-Time Live Location Map Card
                      _buildLiveLocationMapCard(),
                      const SizedBox(height: 16),

                      // Card 3: Emergency Helpline Shortcuts (112, 100, 108)
                      _buildEmergencyHelplinesSection(),
                      const SizedBox(height: 16),

                      // Secondary Emergency Contacts list if more than 1 contact exists
                      if (widget.contacts.length > 1) ...[
                        _buildSecondaryContactsList(),
                        const SizedBox(height: 16),
                      ],

                      // Cancel SOS Distress Alert button
                      _buildCancelSosButton(),
                      const SizedBox(height: 10),
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

  /// Visual Auto-Cut timer banner to ensure user knows session will safely end
  Widget _buildAutoCutBanner() {
    final remaining = _secondsRemaining;
    final isUrgent = remaining <= 30;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: isUrgent
            ? const Color(0xFFE53935).withValues(alpha: 0.16)
            : const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isUrgent
              ? const Color(0xFFE53935).withValues(alpha: 0.6)
              : const Color(0xFF233554),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            isUrgent ? Icons.timer_outlined : Icons.hourglass_top_rounded,
            size: 19,
            color: isUrgent ? const Color(0xFFFF5252) : const Color(0xFF38BDF8),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Text(
                      'Auto-ends in ${_formatTimer(remaining)}',
                      style: TextStyle(
                        color: isUrgent ? const Color(0xFFFF5252) : Colors.white,
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '(Safety Auto-cut)',
                      style: TextStyle(
                        color: isUrgent
                            ? const Color(0xFFFFCDD2)
                            : const Color(0xFF94A3B8),
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 1.5),
                Text(
                  'Alert auto-resolves if left unattended (1-3 min)',
                  style: TextStyle(
                    color: const Color(0xFF94A3B8).withValues(alpha: 0.9),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          InkWell(
            onTap: _extendAutoCutTime,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: const Color(0xFF38BDF8).withValues(alpha: 0.4),
                ),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.add_rounded, size: 14, color: Color(0xFF38BDF8)),
                  SizedBox(width: 2),
                  Text(
                    '1m',
                    style: TextStyle(
                      color: Color(0xFF38BDF8),
                      fontSize: 11.5,
                      fontWeight: FontWeight.bold,
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

  /// Top Bar with Close button, Title, and Animated Blinking SOS Active badge
  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(
              Icons.close_rounded,
              color: Colors.white,
              size: 24,
            ),
            tooltip: 'Close & Return',
            onPressed: _onCancelSos,
          ),

          // Glowing SOS Active Indicator
          AnimatedBuilder(
            animation: _glowAnimation,
            builder: (context, child) {
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 5.5),
                decoration: BoxDecoration(
                  color: const Color(0xFFE53935).withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: const Color(0xFFFF5252).withValues(
                      alpha: 0.5 + 0.5 * _glowAnimation.value,
                    ),
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFFF1744).withValues(
                        alpha: 0.3 * _glowAnimation.value,
                      ),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFF1744),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'SOS ACTIVE',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _formatTimer(_secondsElapsed),
                      style: const TextStyle(
                        color: Color(0xFFFFCDD2),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),

          // Quick call action
          IconButton(
            icon: const Icon(
              Icons.phone_in_talk_rounded,
              color: Color(0xFF10B981),
              size: 22,
            ),
            tooltip: 'Redial Primary Contact',
            onPressed: () => _dialPhone(_activeContact?.phone ?? '112'),
          ),
        ],
      ),
    );
  }

  /// Card 1: Calling Primary Emergency Contact Hero Card
  Widget _buildPrimaryContactCard(SosContactModel? contact) {
    final contactName = contact?.name ?? 'Emergency Contact';
    final contactPhone = contact?.phone ?? '112';
    final relationship = contact?.relationship ?? 'Primary Contact';

    final parts = contactName.trim().split(' ');
    String initials = 'EM';
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      initials = '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (contactName.isNotEmpty) {
      initials = contactName
          .substring(0, contactName.length >= 2 ? 2 : 1)
          .toUpperCase();
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFE53935).withValues(alpha: 0.45),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFF1744).withValues(alpha: 0.15),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Contact Initials Circle Avatar
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1E3A8A), Color(0xFF0B2144)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  border: Border.all(
                    color: const Color(0xFF3B82F6).withValues(alpha: 0.5),
                    width: 1.5,
                  ),
                ),
                child: Center(
                  child: Text(
                    initials,
                    style: const TextStyle(
                      color: Color(0xFF60A5FA),
                      fontSize: 19,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),

              // Contact Name, Number, and Primary Badge
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            contactName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2.5),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE53935),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Text(
                            'PRIMARY',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      contactPhone,
                      style: const TextStyle(
                        color: Color(0xFFE2E8F0),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      relationship,
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(color: Color(0xFF1E293B), height: 1),
          const SizedBox(height: 14),

          // Two Primary Action Buttons: Call Now & Send WhatsApp
          Row(
            children: [
              // 1. Direct Call / Redial Button
              Expanded(
                child: SizedBox(
                  height: 46,
                  child: ElevatedButton.icon(
                    onPressed: () => _dialPhone(contactPhone, name: contactName),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 0,
                    ),
                    icon: const Icon(Icons.phone_rounded, size: 18),
                    label: const FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        'Call Primary',
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // 2. Send Live Location on WhatsApp / SMS
              Expanded(
                child: SizedBox(
                  height: 46,
                  child: OutlinedButton.icon(
                    onPressed: _shareLocationViaWhatsApp,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF25D366),
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      side: const BorderSide(
                          color: Color(0xFF25D366), width: 1.2),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    icon: const Icon(Icons.share_location_rounded, size: 18),
                    label: const FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        'Share Location',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
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

  /// Card 2: Interactive Real-Time Live Location Map Card with Beacon
  Widget _buildLiveLocationMapCard() {
    final locationPoint = LatLng(_lat, _lng);

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF1E2D4A), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with Title and Verified Badge
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.location_on_rounded,
                    color: Color(0xFFFFB300),
                    size: 19,
                  ),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Live Location Sent',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Dispatched to Primary Contact with GPS link',
                        style: TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 11.5,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF065F46),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle_rounded,
                          color: Color(0xFF34D399), size: 12),
                      SizedBox(width: 4),
                      Text(
                        'DISPATCHED',
                        style: TextStyle(
                          color: Color(0xFF34D399),
                          fontSize: 9.5,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Real Interactive Map Preview with Emergency Beacon Pin
          ClipRRect(
            borderRadius: BorderRadius.circular(0),
            child: SizedBox(
              height: 180,
              width: double.infinity,
              child: Stack(
                children: [
                  if (!kIsWeb &&
                      (defaultTargetPlatform == TargetPlatform.android ||
                          defaultTargetPlatform == TargetPlatform.iOS))
                    Positioned.fill(
                      child: MapplsNativeMap(
                        initialCenter: locationPoint,
                        initialZoom: 15.5,
                        currentLocation: locationPoint,
                        isDark: true,
                        interactive: false,
                      ),
                    )
                  else
                    FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: locationPoint,
                      initialZoom: 15.5,
                      minZoom: 4.0,
                      maxZoom: 19.0,
                    ),
                    children: [
                      MapConfig.buildTileLayer(
                        userAgentPackageName: 'com.carqconnect.app',
                        maxZoom: 20,
                      ),
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: locationPoint,
                            width: 80,
                            height: 80,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                // Pulsing Outer Beacon Ring
                                AnimatedBuilder(
                                  animation: _pulseAnimation,
                                  builder: (context, child) {
                                    return Container(
                                      width: 60 * _pulseAnimation.value,
                                      height: 60 * _pulseAnimation.value,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: const Color(0xFFFF1744)
                                            .withValues(alpha: 0.28),
                                      ),
                                    );
                                  },
                                ),
                                // Inner Red Marker Icon
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFE53935),
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: Color(0xFFFF1744),
                                        blurRadius: 10,
                                        offset: Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: const Icon(
                                    Icons.warning_rounded,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  // Open In Mappls Navigation Button overlay
                  Positioned(
                    right: 10,
                    bottom: 10,
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        await TripService.launchMapplsNavigation(
                          toLat: _lat,
                          toLng: _lng,
                          destinationName: widget.address ?? 'Emergency Location',
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F1728),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                          side: const BorderSide(color: Color(0xFF1E2D4A)),
                        ),
                        elevation: 4,
                      ),
                      icon: const Icon(Icons.navigation_rounded,
                          size: 14, color: Color(0xFF00C2FF)),
                      label: const Text(
                        'Open in Mappls',
                        style: TextStyle(
                            fontSize: 11.5, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Address Information Row
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.near_me_rounded,
                  color: Color(0xFF60A5FA),
                  size: 17,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.address ?? 'Current GPS Coordinates',
                        style: const TextStyle(
                          color: Color(0xFFE2E8F0),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          height: 1.3,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '$_lat, $_lng',
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Card 3: Emergency Helpline Shortcuts (112, 100, 108)
  Widget _buildEmergencyHelplinesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            'EMERGENCY HELPLINES',
            style: TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 11.5,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.8,
            ),
          ),
        ),
        Row(
          children: [
            // 112 National
            Expanded(
              child: _buildHelplinePill(
                title: '112',
                subtitle: 'National SOS',
                icon: Icons.shield_rounded,
                color: const Color(0xFF3B82F6),
                onTap: () => _dialPhone('112', name: 'National Emergency 112'),
              ),
            ),
            const SizedBox(width: 8),

            // 100 Police
            Expanded(
              child: _buildHelplinePill(
                title: '100',
                subtitle: 'Police',
                icon: Icons.local_police_rounded,
                color: const Color(0xFF6366F1),
                onTap: () => _dialPhone('100', name: 'Police Control 100'),
              ),
            ),
            const SizedBox(width: 8),

            // 108 Ambulance
            Expanded(
              child: _buildHelplinePill(
                title: '108',
                subtitle: 'Ambulance',
                icon: Icons.medical_services_rounded,
                color: const Color(0xFFEF4444),
                onTap: () => _dialPhone('108', name: 'Medical Ambulance 108'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildHelplinePill({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFF0F1728),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: color.withValues(alpha: 0.35),
            width: 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 5),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                subtitle,
                style: TextStyle(
                  color: color.withValues(alpha: 0.9),
                  fontSize: 10.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Secondary Emergency Contacts list if user added multiple contacts
  Widget _buildSecondaryContactsList() {
    final otherContacts =
        widget.contacts.where((c) => c.id != _activeContact?.id).toList();
    if (otherContacts.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF1E2D4A), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Other Emergency Contacts',
            style: TextStyle(
              color: Colors.white,
              fontSize: 14.5,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 10),
          ...otherContacts.map((c) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF162035),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          c.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          c.phone,
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.phone_rounded,
                        color: Color(0xFF10B981), size: 20),
                    tooltip: 'Call ${c.name}',
                    onPressed: () => _dialPhone(c.phone, name: c.name),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  /// Bottom Cancel SOS Button
  Widget _buildCancelSosButton() {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: _isCancelling ? null : _onCancelSos,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF1E293B),
          foregroundColor: const Color(0xFFFF5252),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
              color: const Color(0xFFFF5252).withValues(alpha: 0.5),
              width: 1.2,
            ),
          ),
          elevation: 0,
        ),
        child: _isCancelling
            ? const AppLoadingSpinner(size: 22)
            : const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.close_rounded, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Cancel SOS Distress Alert',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.4,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
