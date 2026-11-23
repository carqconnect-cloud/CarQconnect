import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../../theme/app_theme.dart';
import '../../utils/api_config.dart';
import '../../globals.dart';
import '../../loading.dart';
import 'add_emergency_contact_sheet.dart';

/// Modal Bottom Sheet matching Image 2: Emergency Contact Management
class EmergencyContactSheet extends StatefulWidget {
  final List<SosContactModel> contacts;
  final Function(List<SosContactModel>) onContactsUpdated;

  const EmergencyContactSheet({
    super.key,
    required this.contacts,
    required this.onContactsUpdated,
  });

  @override
  State<EmergencyContactSheet> createState() => _EmergencyContactSheetState();
}

class _EmergencyContactSheetState extends State<EmergencyContactSheet> {
  late List<SosContactModel> _contacts;
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    _contacts = List.from(widget.contacts);
  }

  Future<void> _callContact(SosContactModel contact) async {
    final cleanPhone = contact.phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (cleanPhone.isEmpty) return;

    final uri = Uri.parse('tel:$cleanPhone');
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        await launchUrl(uri);
      }
    } catch (_) {
      try {
        await launchUrl(uri);
      } catch (_) {}
    }

    if (mounted) {
      ScaffoldMessenger.of(context).clearSnackBars();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF101726),
          content: Text('Calling ${contact.name}: $cleanPhone'),
        ),
      );
    }
  }

  void _confirmCallDialog(SosContactModel contact) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F1728),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF1E2A44)),
        ),
        title: Text(
          'Call ${contact.name}?',
          style: const TextStyle(color: Colors.white, fontSize: 17),
        ),
        content: Text(
          'Would you like to dial emergency contact at ${contact.phone}?',
          style: const TextStyle(color: Color(0xFF8E9BAE), fontSize: 13.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF8E9BAE))),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _callContact(contact);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFD51A1A),
              foregroundColor: Colors.white,
            ),
            child: const Text('Call Now'),
          ),
        ],
      ),
    );
  }

  Future<void> _openAddContact() async {
    final newContact = await showModalBottomSheet<SosContactModel>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const AddEmergencyContactSheet(),
    );

    if (newContact == null) return;

    setState(() => _isSyncing = true);

    String assignedId = DateTime.now().millisecondsSinceEpoch.toString();

    // Call backend API to persist
    for (final base in ApiConfig.candidateBaseUrls) {
      final cleanBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
      try {
        final res = await http.post(
          Uri.parse('$cleanBase/sos/contacts'),
          headers: {
            'Content-Type': 'application/json',
            if (Globals.accessToken.isNotEmpty) 'Authorization': 'Bearer ${Globals.accessToken}',
          },
          body: jsonEncode({
            'name': newContact.name,
            'phone': newContact.phone,
            'relationship': newContact.relationship,
            'isPrimary': newContact.isPrimary,
            'userEmail': Globals.email,
            'userPhone': Globals.phone,
          }),
        ).timeout(const Duration(milliseconds: 3000));

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

    if (mounted) {
      setState(() {
        if (created.isPrimary) {
          _contacts = _contacts.map((c) => c.copyWith(isPrimary: false)).toList();
        }
        _contacts.add(created);
        _isSyncing = false;
      });
      widget.onContactsUpdated(_contacts);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF101726),
          content: Text('${created.name} added to emergency contacts'),
        ),
      );
    }
  }

  Future<void> _openEditContact(SosContactModel contact, int index) async {
    final updated = await showModalBottomSheet<SosContactModel>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AddEmergencyContactSheet(initialContact: contact),
    );

    if (updated == null) return;

    setState(() => _isSyncing = true);

    // Call backend API to update
    for (final base in ApiConfig.candidateBaseUrls) {
      final cleanBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
      try {
        final res = await http.put(
          Uri.parse('$cleanBase/sos/contacts/${contact.id}'),
          headers: {
            'Content-Type': 'application/json',
            if (Globals.accessToken.isNotEmpty) 'Authorization': 'Bearer ${Globals.accessToken}',
          },
          body: jsonEncode({
            'name': updated.name,
            'phone': updated.phone,
            'relationship': updated.relationship,
            'isPrimary': updated.isPrimary,
            'userEmail': Globals.email,
            'userPhone': Globals.phone,
          }),
        ).timeout(const Duration(milliseconds: 3000));

        if (res.statusCode == 200) break;
      } catch (_) {}
    }

    if (mounted) {
      setState(() {
        if (updated.isPrimary) {
          _contacts = _contacts.map((c) => c.copyWith(isPrimary: false)).toList();
        }
        _contacts[index] = updated.copyWith(id: contact.id);
        _isSyncing = false;
      });
      widget.onContactsUpdated(_contacts);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF101726),
          content: Text('${updated.name} updated successfully'),
        ),
      );
    }
  }

  Future<void> _deleteContact(SosContactModel contact, int index) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F1728),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF1E2A44)),
        ),
        title: const Text('Delete Contact?', style: TextStyle(color: Colors.white, fontSize: 17)),
        content: Text(
          'Remove ${contact.name} from your emergency contacts?',
          style: const TextStyle(color: Color(0xFF8E9BAE), fontSize: 13.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF8E9BAE))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFF5252),
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() {
      _contacts.removeAt(index);
    });
    widget.onContactsUpdated(_contacts);

    // Call backend API to delete
    for (final base in ApiConfig.candidateBaseUrls) {
      final cleanBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
      try {
        final res = await http.delete(
          Uri.parse('$cleanBase/sos/contacts/${contact.id}?userEmail=${Uri.encodeComponent(Globals.email)}&userPhone=${Uri.encodeComponent(Globals.phone)}'),
          headers: {
            if (Globals.accessToken.isNotEmpty) 'Authorization': 'Bearer ${Globals.accessToken}',
          },
        ).timeout(const Duration(milliseconds: 3000));

        if (res.statusCode == 200) break;
      } catch (_) {}
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF101726),
          content: Text('${contact.name} removed from emergency contacts'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            color: isLight ? Colors.white : const Color(0xFF101726),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            boxShadow: isLight
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 20,
                      offset: const Offset(0, -4),
                    )
                  ]
                : null,
          ),
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header: Title & Close Button
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Emergency Contacts',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (_isSyncing) ...[
                          const SizedBox(width: 10),
                          const AppLoadingSpinner(size: 14),
                        ],
                      ],
                    ),
                    IconButton(
                      icon: Icon(
                        Icons.close_rounded,
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        size: 24,
                      ),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Contacts List
                if (_contacts.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 28),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(
                            Icons.contact_emergency_outlined,
                            size: 42,
                            color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'No emergency contacts added yet',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                              fontSize: 14.5,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Add contacts who will receive your live GPS alert',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ..._contacts.asMap().entries.map((entry) {
                    final index = entry.key;
                    final contact = entry.value;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF131D2D),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1D2F47),
                        ),
                        boxShadow: isLight ? AppTheme.cardShadow : null,
                      ),
                      child: Row(
                        children: [
                          // Name and Phone Info
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
                                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                          fontSize: 15.5,
                                          fontWeight: FontWeight.bold,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if (contact.isPrimary) ...[
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFED3833).withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(
                                            color: const Color(0xFFED3833).withValues(alpha: 0.4),
                                          ),
                                        ),
                                        child: const Text(
                                          'PRIMARY',
                                          style: TextStyle(
                                            color: Color(0xFFED3833),
                                            fontSize: 9,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  contact.phone,
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w400,
                                  ),
                                ),
                                if (contact.relationship != null && contact.relationship!.trim().isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    contact.relationship!.trim(),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),

                          // Edit Button
                          InkWell(
                            onTap: () => _openEditContact(contact, index),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              width: 34,
                              height: 34,
                              decoration: BoxDecoration(
                                color: isLight ? Colors.white : const Color(0xFF1C2C42),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF283D59),
                                ),
                              ),
                              child: Icon(
                                Icons.edit_outlined,
                                color: isLight ? const Color(0xFF64748B) : Colors.white,
                                size: 16,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),

                          // Delete Button
                          InkWell(
                            onTap: () => _deleteContact(contact, index),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              width: 34,
                              height: 34,
                              decoration: BoxDecoration(
                                color: isLight ? Colors.white : const Color(0xFF1C2C42),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF283D59),
                                ),
                              ),
                              child: const Icon(
                                Icons.delete_outline_rounded,
                                color: Color(0xFFFF5252),
                                size: 16,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),

                          // Call Button
                          InkWell(
                            onTap: () => _confirmCallDialog(contact),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: const Color(0xFFB71C1C),
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFB71C1C).withValues(alpha: 0.35),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.phone_rounded,
                                color: Colors.white,
                                size: 18,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),

                const SizedBox(height: 12),

                // Bottom "+ Add Emergency Contact" Red Pill Button
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: _openAddContact,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFED3833),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(27),
                      ),
                      elevation: 0,
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.add_rounded, color: Colors.white, size: 22),
                        SizedBox(width: 8),
                        Text(
                          'Add Emergency Contact',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
