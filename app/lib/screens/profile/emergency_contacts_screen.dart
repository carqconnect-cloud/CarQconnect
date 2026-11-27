import 'package:flutter/material.dart';

import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'edit_contact_screen.dart';
import '../../globals.dart';
import '../../utils/api_config.dart';
import '../../utils/app_icons.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../services/screen_refresh_service.dart';
import '../../widgets/animated_back_arrow.dart';

/// Data model representing an Emergency Contact
class EmergencyContactItem {
  final String id;
  final String name;
  final String phone;
  final String initials;
  final bool isPrimary;
  final String? email;
  final String? relationship;
  final bool sendSmsGps;
  final bool shareTelemetry;

  const EmergencyContactItem({
    required this.id,
    required this.name,
    required this.phone,
    required this.initials,
    this.isPrimary = false,
    this.email,
    this.relationship,
    this.sendSmsGps = true,
    this.shareTelemetry = true,
  });

  EmergencyContactItem copyWith({
    String? id,
    String? name,
    String? phone,
    String? initials,
    bool? isPrimary,
    String? email,
    String? relationship,
    bool? sendSmsGps,
    bool? shareTelemetry,
  }) {
    return EmergencyContactItem(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      initials: initials ?? this.initials,
      isPrimary: isPrimary ?? this.isPrimary,
      email: email ?? this.email,
      relationship: relationship ?? this.relationship,
      sendSmsGps: sendSmsGps ?? this.sendSmsGps,
      shareTelemetry: shareTelemetry ?? this.shareTelemetry,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'initials': initials,
      'isPrimary': isPrimary,
      'email': email,
      'relationship': relationship,
      'sendSmsGps': sendSmsGps,
      'shareTelemetry': shareTelemetry,
    };
  }

  factory EmergencyContactItem.fromMap(Map<String, dynamic> m) {
    final name = (m['name'] ?? '').toString();
    final parts = name.trim().split(' ');
    String initials = (m['initials'] ?? '').toString();
    if (initials.isEmpty) {
      if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
        initials = '${parts[0][0]}${parts[1][0]}'.toUpperCase();
      } else if (name.isNotEmpty) {
        initials = name.substring(0, name.length >= 2 ? 2 : 1).toUpperCase();
      } else {
        initials = 'EC';
      }
    }
    return EmergencyContactItem(
      id: (m['id'] ?? '').toString(),
      name: name,
      phone: (m['phone'] ?? '').toString(),
      initials: initials,
      isPrimary: m['isPrimary'] == true,
      email: m['email']?.toString(),
      relationship: m['relationship']?.toString(),
      sendSmsGps: m['sendSmsGps'] != false,
      shareTelemetry: m['shareTelemetry'] != false,
    );
  }
}

/// Screen 1: Emergency Contacts
class EmergencyContactsScreen extends StatefulWidget {
  const EmergencyContactsScreen({super.key});

  @override
  State<EmergencyContactsScreen> createState() =>
      _EmergencyContactsScreenState();
}

class _EmergencyContactsScreenState extends State<EmergencyContactsScreen>
    with WidgetsBindingObserver, RefreshOnRouteReturn<EmergencyContactsScreen> {
  List<EmergencyContactItem> _contacts = [];

  bool _isLoading = true;
  bool _isRefreshing = false;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // Preload from Globals if available for instant display
    if (Globals.emergencyContacts.isNotEmpty) {
      _contacts = Globals.emergencyContacts
          .map((m) => EmergencyContactItem.fromMap(m))
          .toList();
      _isLoading = false;
    }

    _fetchContacts(showSpinner: _contacts.isEmpty);

    // Auto-refresh contacts every 15 seconds to sync external edits
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (mounted) _fetchContacts(showSpinner: false);
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      // Auto-refresh immediately when user returns to the app
      _fetchContacts(showSpinner: false);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  /// Fetches emergency contacts from backend across candidate base URLs
  Future<void> _fetchContacts({bool showSpinner = false}) async {
    if (showSpinner) {
      if (mounted) setState(() => _isLoading = true);
    } else {
      if (mounted) setState(() => _isRefreshing = true);
    }

    List<EmergencyContactItem>? fetchedContacts;

    // 1. Primary: query /app-profile/emergency-contacts
    for (final base in ApiConfig.candidateBaseUrls) {
      final cleanBase = base.endsWith('/')
          ? base.substring(0, base.length - 1)
          : base;
      try {
        final res = await http
            .get(
              Uri.parse('$cleanBase/app-profile/emergency-contacts'),
              headers: {
                'Content-Type': 'application/json',
                if (Globals.accessToken.isNotEmpty)
                  'Authorization': 'Bearer ${Globals.accessToken}',
              },
            )
            .timeout(const Duration(milliseconds: 3000));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          if (data['success'] == true &&
              data['data'] != null &&
              data['data'] is List) {
            final List list = data['data'];
            fetchedContacts = list
                .map((m) => EmergencyContactItem.fromMap(m))
                .toList();
            break;
          }
        }
      } catch (_) {}
    }

    // 2. Secondary fallback: query /sos/contacts (which resolves user by email/phone/auth)
    if (fetchedContacts == null || fetchedContacts.isEmpty) {
      for (final base in ApiConfig.candidateBaseUrls) {
        final cleanBase = base.endsWith('/')
            ? base.substring(0, base.length - 1)
            : base;
        try {
          final queryParams = <String, String>{};
          if (Globals.email.isNotEmpty) queryParams['email'] = Globals.email;
          if (Globals.phone.isNotEmpty) queryParams['phone'] = Globals.phone;
          final uri = Uri.parse('$cleanBase/sos/contacts').replace(
            queryParameters: queryParams.isNotEmpty ? queryParams : null,
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
              .timeout(const Duration(milliseconds: 3000));

          if (res.statusCode == 200) {
            final data = jsonDecode(res.body);
            if (data['success'] == true && data['data'] != null) {
              final payload = data['data'];
              final List? list = payload is List
                  ? payload
                  : (payload['contacts'] is List ? payload['contacts'] : null);
              if (list != null && list.isNotEmpty) {
                fetchedContacts = list
                    .map((m) => EmergencyContactItem.fromMap(m))
                    .toList();
                break;
              }
            }
          }
        } catch (_) {}
      }
    }

    if (mounted) {
      setState(() {
        if (fetchedContacts != null) {
          _contacts = fetchedContacts;
          Globals.emergencyContacts = _contacts.map((c) => c.toMap()).toList();
        } else if (_contacts.isEmpty && Globals.emergencyContacts.isNotEmpty) {
          _contacts = Globals.emergencyContacts
              .map((m) => EmergencyContactItem.fromMap(m))
              .toList();
        }
        _isLoading = false;
        _isRefreshing = false;
      });
    }
  }

  /// Persists full emergency contact list to the backend profile
  Future<void> _saveContacts() async {
    Globals.emergencyContacts = _contacts.map((c) => c.toMap()).toList();

    for (final base in ApiConfig.candidateBaseUrls) {
      final cleanBase = base.endsWith('/')
          ? base.substring(0, base.length - 1)
          : base;
      try {
        final res = await http
            .put(
              Uri.parse('$cleanBase/app-profile/emergency-contacts'),
              headers: {
                'Content-Type': 'application/json',
                if (Globals.accessToken.isNotEmpty)
                  'Authorization': 'Bearer ${Globals.accessToken}',
              },
              body: jsonEncode({'contacts': Globals.emergencyContacts}),
            )
            .timeout(const Duration(milliseconds: 3500));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          if (data['success'] == true &&
              data['data'] != null &&
              data['data'] is List) {
            final List list = data['data'];
            if (mounted && list.isNotEmpty) {
              setState(() {
                _contacts = list
                    .map((m) => EmergencyContactItem.fromMap(m))
                    .toList();
                Globals.emergencyContacts = _contacts
                    .map((c) => c.toMap())
                    .toList();
              });
            }
          }
          break;
        }
      } catch (e) {
        debugPrint('Emergency contacts sync failed on $cleanBase: $e');
      }
    }
  }

  /// Adds a new contact, creates it on the backend, and saves list
  Future<void> _navigateToAddContact() async {
    final newContact = await Navigator.push<EmergencyContactItem>(
      context,
      MaterialPageRoute(
        builder: (context) => const EditContactScreen(isNew: true),
      ),
    );

    if (newContact != null) {
      String assignedId = newContact.id;

      // Persist to backend SOS contacts
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
                  'isPrimary': newContact.isPrimary,
                  'email': newContact.email,
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

      final created = newContact.copyWith(id: assignedId);

      setState(() {
        if (created.isPrimary) {
          for (int i = 0; i < _contacts.length; i++) {
            _contacts[i] = _contacts[i].copyWith(isPrimary: false);
          }
        }
        _contacts.add(created);
      });

      await _saveContacts();

      if (mounted) {
        final isLight = AppTheme.isLightNotifier.value;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
            content: Text(
              '${created.name} added to emergency contacts',
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
              ),
            ),
          ),
        );
      }
    }
  }

  /// Edits an existing contact, saves changes to backend, and updates UI
  Future<void> _navigateToEditContact(EmergencyContactItem contact) async {
    final updatedContact = await Navigator.push<EmergencyContactItem>(
      context,
      MaterialPageRoute(
        builder: (context) => EditContactScreen(isNew: false, contact: contact),
      ),
    );

    if (updatedContact != null) {
      setState(() {
        final index = _contacts.indexWhere((c) => c.id == updatedContact.id);
        if (index != -1) {
          if (updatedContact.isPrimary) {
            for (int i = 0; i < _contacts.length; i++) {
              if (i != index && _contacts[i].isPrimary) {
                _contacts[i] = _contacts[i].copyWith(isPrimary: false);
              }
            }
          }
          _contacts[index] = updatedContact;
        }
      });

      // 1. Direct update to /sos/contacts/:id
      for (final base in ApiConfig.candidateBaseUrls) {
        final cleanBase = base.endsWith('/')
            ? base.substring(0, base.length - 1)
            : base;
        try {
          final res = await http
              .put(
                Uri.parse('$cleanBase/sos/contacts/${updatedContact.id}'),
                headers: {
                  'Content-Type': 'application/json',
                  if (Globals.accessToken.isNotEmpty)
                    'Authorization': 'Bearer ${Globals.accessToken}',
                },
                body: jsonEncode({
                  'name': updatedContact.name,
                  'phone': updatedContact.phone,
                  'relationship': updatedContact.relationship,
                  'isPrimary': updatedContact.isPrimary,
                  'email': updatedContact.email,
                  'userEmail': Globals.email,
                  'userPhone': Globals.phone,
                }),
              )
              .timeout(const Duration(milliseconds: 3000));
          if (res.statusCode == 200) break;
        } catch (_) {}
      }

      // 2. Full synchronization via /app-profile
      await _saveContacts();

      if (mounted) {
        final isLight = AppTheme.isLightNotifier.value;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
            content: Text(
              '${updatedContact.name} details updated',
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
              ),
            ),
          ),
        );
      }
    }
  }

  /// Deletes a contact from backend and state
  Future<void> _deleteContact(EmergencyContactItem contact) async {
    setState(() {
      _contacts.removeWhere((c) => c.id == contact.id);
    });

    for (final base in ApiConfig.candidateBaseUrls) {
      final cleanBase = base.endsWith('/')
          ? base.substring(0, base.length - 1)
          : base;
      try {
        final queryParams = <String, String>{};
        if (Globals.email.isNotEmpty) queryParams['userEmail'] = Globals.email;
        if (Globals.phone.isNotEmpty) queryParams['userPhone'] = Globals.phone;
        final uri = Uri.parse(
          '$cleanBase/sos/contacts/${contact.id}',
        ).replace(queryParameters: queryParams.isNotEmpty ? queryParams : null);

        final res = await http
            .delete(
              uri,
              headers: {
                'Content-Type': 'application/json',
                if (Globals.accessToken.isNotEmpty)
                  'Authorization': 'Bearer ${Globals.accessToken}',
              },
            )
            .timeout(const Duration(milliseconds: 3000));
        if (res.statusCode == 200) break;
      } catch (_) {}
    }

    await _saveContacts();

    if (mounted) {
      final isLight = AppTheme.isLightNotifier.value;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
          content: Text(
            '${contact.name} removed from emergency contacts',
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
            ),
          ),
        ),
      );
    }
  }

  @override
  Future<void> refreshOnRouteReturn() => _fetchContacts(showSpinner: false);

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            gradient: isLight ? AppTheme.bgGradient : null,
            color: isLight ? null : const Color(0xFF090D16),
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
                'Emergency Contacts',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 18.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
              actions: [
                // Auto/Manual Refresh action button
                IconButton(
                  tooltip: 'Refresh contacts',
                  icon: _isRefreshing
                      ? SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppTheme.primaryColor,
                          ),
                        )
                      : Icon(
                          Icons.refresh_rounded,
                          color: isLight
                              ? const Color(0xFF0F172A)
                              : Colors.white,
                          size: 22,
                        ),
                  onPressed: _isRefreshing
                      ? null
                      : () => _fetchContacts(showSpinner: true),
                ),
                IconButton(
                  tooltip: 'Add contact',
                  icon: AppIcons.svg(
                    AppIcons.plus,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    width: 22,
                    height: 22,
                  ),
                  onPressed: _navigateToAddContact,
                ),
                const SizedBox(width: 4),
              ],
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: _isLoading
                        ? Center(
                            child: AppLoadingSpinner(
                              size: 70,
                              primaryColor: AppTheme.primaryColor,
                            ),
                          )
                        : RefreshIndicator(
                            color: AppTheme.primaryColor,
                            backgroundColor: isLight
                                ? Colors.white
                                : const Color(0xFF101726),
                            onRefresh: () => _fetchContacts(showSpinner: false),
                            child: SingleChildScrollView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.fromLTRB(
                                16,
                                12,
                                16,
                                16,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Information Banner Card
                                  _buildInfoBanner(isLight),
                                  const SizedBox(height: 16),

                                  // Contact List
                                  if (_contacts.isEmpty)
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 36,
                                      ),
                                      child: Center(
                                        child: Column(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              Icons.contact_phone_outlined,
                                              size: 48,
                                              color: isLight
                                                  ? const Color(0xFF94A3B8)
                                                  : const Color(0xFF475569),
                                            ),
                                            const SizedBox(height: 12),
                                            Text(
                                              'No emergency contacts yet.\nTap "Add Contact" to add one.',
                                              textAlign: TextAlign.center,
                                              style: TextStyle(
                                                color: isLight
                                                    ? const Color(0xFF64748B)
                                                    : const Color(0xFF8E9BAE),
                                                fontSize: 14.5,
                                                height: 1.4,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    )
                                  else
                                    ..._contacts.map(
                                      (contact) =>
                                          _buildContactCard(contact, isLight),
                                    ),
                                ],
                              ),
                            ),
                          ),
                  ),

                  // Bottom Add Contact Button
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _navigateToAddContact,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(30),
                          ),
                          elevation: 0,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            AppIcons.svg(
                              AppIcons.plus,
                              color: Colors.white,
                              width: 20,
                              height: 20,
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'Add Contact',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
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

  /// Top Quick Access info banner with shield icon
  Widget _buildInfoBanner(bool isLight) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.settingsCardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
          width: 1.2,
        ),
        boxShadow: AppTheme.settingsCardShadow,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: isLight
                  ? const Color(0xFFEFF6FF)
                  : const Color(0xFF0B2144),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color:
                    (isLight ? AppTheme.primaryColor : const Color(0xFF1D4ED8))
                        .withValues(alpha: 0.4),
                width: 1,
              ),
            ),
            alignment: Alignment.center,
            child: AppIcons.svg(
              AppIcons.shield,
              color: AppTheme.primaryColor,
              width: 22,
              height: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Quick access in emergencies',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Your emergency contacts will be notified when you trigger an SOS alert.',
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF64748B)
                        : const Color(0xFF8E9BAE),
                    fontSize: 12.5,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Single Contact Card with dedicated Edit Button and Tap Action
  Widget _buildContactCard(EmergencyContactItem contact, bool isLight) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.settingsCardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
          width: 1,
        ),
        boxShadow: AppTheme.settingsCardShadow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _navigateToEditContact(contact),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                // Initials Circle
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFEFF6FF)
                        : const Color(0xFF162544),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isLight
                          ? const Color(0xFFDBEAFE)
                          : const Color(0xFF1E3A8A).withValues(alpha: 0.5),
                    ),
                  ),
                  child: Center(
                    child: Text(
                      contact.initials,
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),

                // Name, Primary badge, Phone, and Relationship
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              contact.name,
                              style: TextStyle(
                                color: isLight
                                    ? const Color(0xFF0F172A)
                                    : Colors.white,
                                fontSize: 15.5,
                                fontWeight: FontWeight.bold,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (contact.isPrimary) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2.5,
                              ),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryColor,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Text(
                                'Primary',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        contact.phone,
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF64748B)
                              : const Color(0xFF8E9BAE),
                          fontSize: 13,
                        ),
                      ),
                      if (contact.relationship != null &&
                          contact.relationship!.trim().isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          contact.relationship!.trim(),
                          style: TextStyle(
                            color: isLight
                                ? const Color(0xFF94A3B8)
                                : const Color(0xFF64748B),
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),

                // Dedicated Edit Button
                IconButton(
                  tooltip: 'Edit Contact',
                  icon: Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: isLight
                          ? const Color(0xFFF1F5F9)
                          : const Color(0xFF1E293B),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isLight
                            ? const Color(0xFFE2E8F0)
                            : const Color(0xFF334155),
                        width: 0.8,
                      ),
                    ),
                    child: Icon(
                      Icons.edit_outlined,
                      color: AppTheme.primaryColor,
                      size: 17,
                    ),
                  ),
                  onPressed: () => _navigateToEditContact(contact),
                ),

                // 3-dots Menu
                PopupMenuButton<String>(
                  icon: AppIcons.svg(
                    AppIcons.threeDots,
                    color: isLight
                        ? const Color(0xFF94A3B8)
                        : const Color(0xFF64748B),
                    width: 16,
                    height: 16,
                  ),
                  color: isLight ? Colors.white : const Color(0xFF10192D),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: isLight
                          ? const Color(0xFFE2E8F0)
                          : const Color(0xFF1E2D4A),
                    ),
                  ),
                  onSelected: (value) {
                    if (value == 'edit') {
                      _navigateToEditContact(contact);
                    } else if (value == 'delete') {
                      _deleteContact(contact);
                    } else if (value == 'primary') {
                      setState(() {
                        for (int i = 0; i < _contacts.length; i++) {
                          _contacts[i] = _contacts[i].copyWith(
                            isPrimary: _contacts[i].id == contact.id,
                          );
                        }
                      });
                      _saveContacts();
                    }
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: 'edit',
                      child: Row(
                        children: [
                          Icon(
                            Icons.edit_outlined,
                            color: AppTheme.primaryColor,
                            size: 18,
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'Edit',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF0F172A)
                                  : Colors.white,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (!contact.isPrimary)
                      PopupMenuItem(
                        value: 'primary',
                        child: Row(
                          children: [
                            const Icon(
                              Icons.star_outline_rounded,
                              color: Color(0xFFFFB300),
                              size: 18,
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Set as Primary',
                              style: TextStyle(
                                color: isLight
                                    ? const Color(0xFF0F172A)
                                    : Colors.white,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          AppIcons.svg(
                            AppIcons.delete,
                            color: const Color(0xFFFF5252),
                            width: 16,
                            height: 16,
                          ),
                          const SizedBox(width: 10),
                          const Text(
                            'Remove',
                            style: TextStyle(
                              color: Color(0xFFFF5252),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
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
