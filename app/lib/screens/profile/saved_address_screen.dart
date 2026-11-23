import 'package:flutter/material.dart';

import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'edit_address_screen.dart';
import '../../globals.dart';
import '../../utils/api_config.dart';
import '../../services/screen_refresh_service.dart';
import '../../services/auth_storage_service.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../utils/app_icons.dart';
import '../../widgets/animated_back_arrow.dart';

class SavedAddressScreen extends StatefulWidget {
  const SavedAddressScreen({super.key});

  @override
  State<SavedAddressScreen> createState() => _SavedAddressScreenState();
}

class _SavedAddressScreenState extends State<SavedAddressScreen>
    with RefreshOnRouteReturn<SavedAddressScreen> {
  List<AddressModel> _addresses = [];

  bool _isLoading = true;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _fetchAddresses(showSpinner: true);
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) _fetchAddresses(showSpinner: false);
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchAddresses({bool showSpinner = false}) async {
    if (showSpinner) {
      setState(() => _isLoading = true);
    }

    try {
      final response = await AuthStorageService.authenticatedGet('/app-profile/addresses');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] && data['data'] != null) {
          final List list = data['data'];
          if (mounted) {
            setState(() {
              _addresses = list
                  .map(
                    (m) => AddressModel(
                      id: m['id'] ?? '',
                      type: m['type'] ?? '',
                      address: m['address'] ?? '',
                      landmark: m['landmark'] ?? '',
                      city: m['city'] ?? '',
                      state: m['state'] ?? '',
                      pincode: m['pincode'] ?? '',
                      isDefault: m['isDefault'] ?? false,
                    ),
                  )
                  .toList();
              if (showSpinner) _isLoading = false;
            });
          }
          return;
        }
      }
    } catch (e) {
      debugPrint('Fetch addresses failed: $e');
    }

    // Fallback to globals if API fails or is empty
    if (mounted) {
      setState(() {
        _addresses = Globals.savedAddresses
            .map(
              (m) => AddressModel(
                id: m['id'],
                type: m['type'],
                address: m['address'],
                landmark: m['landmark'],
                city: m['city'],
                state: m['state'],
                pincode: m['pincode'],
                isDefault: m['isDefault'],
              ),
            )
            .toList();
        if (showSpinner) _isLoading = false;
      });
    }
  }

  void _saveAddresses() async {
    Globals.savedAddresses = _addresses
        .map(
          (a) => {
            'id': a.id,
            'type': a.type,
            'address': a.address,
            'landmark': a.landmark,
            'city': a.city,
            'state': a.state,
            'pincode': a.pincode,
            'isDefault': a.isDefault,
          },
        )
        .toList();

    if (Globals.accessToken.isNotEmpty) {
      try {
        await http.put(
          ApiConfig.uri('/app-profile/addresses'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ${Globals.accessToken}',
          },
          body: jsonEncode({'addresses': Globals.savedAddresses}),
        );
      } catch (e) {
        debugPrint('Address sync failed: $e');
      }
    }
  }

  void _deleteAddress(String id) {
    setState(() {
      _addresses.removeWhere((a) => a.id == id);
      _saveAddresses();
    });

    final isLight = AppTheme.isLightNotifier.value;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
        content: Text(
          'Address deleted',
          style: TextStyle(
            color: isLight ? const Color(0xFF0F172A) : Colors.white,
          ),
        ),
      ),
    );
  }

  Future<void> _openEditAddress(AddressModel address) async {
    final updated = await Navigator.push<AddressModel>(
      context,
      MaterialPageRoute(
        builder: (context) =>
            EditAddressScreen(initialAddress: address, isNew: false),
      ),
    );

    if (updated != null) {
      setState(() {
        final index = _addresses.indexWhere((a) => a.id == updated.id);
        if (index != -1) {
          if (updated.isDefault) {
            _addresses = _addresses
                .map((a) => a.copyWith(isDefault: false))
                .toList();
          }
          _addresses[index] = updated;
          _saveAddresses();
        }
      });
    }
  }

  Future<void> _openAddNewAddress() async {
    final newAddress = await Navigator.push<AddressModel>(
      context,
      MaterialPageRoute(
        builder: (context) => const EditAddressScreen(isNew: true),
      ),
    );

    if (newAddress != null) {
      setState(() {
        if (newAddress.isDefault) {
          _addresses = _addresses
              .map((a) => a.copyWith(isDefault: false))
              .toList();
        }
        _addresses.add(newAddress);
        _saveAddresses();
      });
    }
  }

  @override
  Future<void> refreshOnRouteReturn() => _fetchAddresses(showSpinner: false);

  @override
  Widget build(BuildContext context) {
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
                'Saved Address',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                ),
              ),
              actions: [
                IconButton(
                  icon: AppIcons.svg(
                    AppIcons.plus,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    width: 20,
                    height: 20,
                  ),
                  onPressed: _openAddNewAddress,
                ),
              ],
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: RefreshIndicator(
                      color: AppTheme.primaryColor,
                      backgroundColor: isLight
                          ? Colors.white
                          : const Color(0xFF101726),
                      onRefresh: () => _fetchAddresses(showSpinner: false),
                      child: _isLoading
                          ? Center(
                              child: AppLoadingSpinner(
                                size: 70,
                                primaryColor: AppTheme.primaryColor,
                              ),
                            )
                          : _addresses.isEmpty
                          ? SingleChildScrollView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              child: SizedBox(
                                height:
                                    MediaQuery.of(context).size.height * 0.6,
                                child: Center(
                                  child: Text(
                                    'No saved addresses yet.\nTap below to add one.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF64748B)
                                          : const Color(0xFF8E9BAE),
                                    ),
                                  ),
                                ),
                              ),
                            )
                          : ListView.builder(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 12,
                              ),
                              itemCount: _addresses.length,
                              itemBuilder: (context, index) {
                                final address = _addresses[index];
                                return _buildAddressCard(address, isLight);
                              },
                            ),
                    ),
                  ),

                  // Bottom + Add New Address Button
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                    decoration: BoxDecoration(
                      color: isLight ? Colors.white : const Color(0xFF090E17),
                      border: Border(
                        top: BorderSide(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF1C273C),
                        ),
                      ),
                    ),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _openAddNewAddress,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(26),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            AppIcons.svg(
                              AppIcons.plus,
                              color: Colors.white,
                              width: 18,
                              height: 18,
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'Add New Address',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.2,
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

  Widget _buildAddressCard(AddressModel address, bool isLight) {
    final isMom =
        address.type.toLowerCase().contains('mom') ||
        address.type.toLowerCase().contains('heart');
    final isWork =
        address.type.toLowerCase().contains('work') ||
        address.type.toLowerCase().contains('office');

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0C1420),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B283A),
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Icon squircle + [Title, Default badge, Address]
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isMom
                      ? (isLight
                            ? const Color(0xFFFEE2E2)
                            : const Color(0xFF2A151D))
                      : (isLight
                            ? const Color(0xFFEFF6FF)
                            : const Color(0xFF0F2236)),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isMom
                        ? (isLight
                              ? const Color(0xFFFECACA)
                              : const Color(0xFF4A1828))
                        : (isLight
                              ? const Color(0xFFDBEAFE)
                              : const Color(0xFF163754)),
                    width: 1.2,
                  ),
                ),
                child: Center(
                  child: isMom
                      ? AppIcons.svg(
                          AppIcons.heart,
                          color: const Color(0xFFFF5252),
                          width: 22,
                          height: 22,
                        )
                      : Icon(
                          isWork
                              ? Icons.apartment_outlined
                              : Icons.home_outlined,
                          color: AppTheme.primaryColor,
                          size: 24,
                        ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          address.type,
                          style: TextStyle(
                            color: isLight
                                ? const Color(0xFF0F172A)
                                : Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (address.isDefault) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3.5,
                            ),
                            decoration: BoxDecoration(
                              color: isLight
                                  ? const Color(0xFFE0F2FE)
                                  : const Color(0xFF0D253F),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.check_circle_outline_rounded,
                                  color: AppTheme.primaryColor,
                                  size: 13,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Default',
                                  style: TextStyle(
                                    color: AppTheme.primaryColor,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      address.address,
                      style: TextStyle(
                        color: isLight
                            ? const Color(0xFF475569)
                            : const Color(0xFFCAD5E2),
                        fontSize: 13.5,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Divider
          Divider(
            color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF182332),
            height: 1,
            thickness: 1,
          ),

          const SizedBox(height: 12),

          // Actions Row: Edit, Delete
          Row(
            children: [
              InkWell(
                onTap: () => _openEditAddress(address),
                borderRadius: BorderRadius.circular(6),
                child: Row(
                  children: [
                    Icon(
                      Icons.edit_outlined,
                      color: isLight
                          ? const Color(0xFF64748B)
                          : const Color(0xFFCBD5E1),
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Edit',
                      style: TextStyle(
                        color: isLight
                            ? const Color(0xFF64748B)
                            : const Color(0xFFCBD5E1),
                        fontSize: 13.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              if (!address.isDefault) ...[
                const SizedBox(width: 20),
                InkWell(
                  onTap: () {
                    setState(() {
                      _addresses = _addresses.map((a) {
                        return a.copyWith(isDefault: a.id == address.id);
                      }).toList();
                      _saveAddresses();
                    });
                  },
                  borderRadius: BorderRadius.circular(6),
                  child: Row(
                    children: [
                      Icon(
                        Icons.adjust_rounded,
                        color: isLight
                            ? const Color(0xFF64748B)
                            : const Color(0xFFCBD5E1),
                        size: 14,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        'Set default',
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF64748B)
                              : const Color(0xFFCBD5E1),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(width: 20),
              InkWell(
                onTap: () => _deleteAddress(address.id),
                borderRadius: BorderRadius.circular(6),
                child: Row(
                  children: [
                    AppIcons.svg(
                      AppIcons.delete,
                      color: const Color(0xFFFF5252),
                      width: 15,
                      height: 15,
                    ),
                    const SizedBox(width: 5),
                    const Text(
                      'Delete',
                      style: TextStyle(
                        color: Color(0xFFFF5252),
                        fontSize: 13.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
