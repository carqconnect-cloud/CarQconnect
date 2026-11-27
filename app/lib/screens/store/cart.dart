import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../globals.dart';
import '../../utils/api_config.dart';
import '../profile/edit_address_screen.dart';

import 'store_models.dart';
import 'order_confirmation.dart';
import 'wishlist_screen.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'store_service.dart';
import '../subscription/payment_failed_screen.dart';
import '../bottom_navigation_screen.dart';
import '../../widgets/animated_back_arrow.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final CartManager _cartManager = CartManager.instance;
  final TextEditingController _couponInputController = TextEditingController();
  String _selectedPaymentMethod = 'Pay Online (Razorpay)';
  String _selectedAddress = '';
  String _selectedAddressId = '';
  List<Map<String, dynamic>> _uploadedCoupons = [];
  bool _isLoadingCoupons = false;
  bool _isPlacingOrder = false;

  Razorpay? _razorpay;

  @override
  void initState() {
    super.initState();
    _cartManager.addListener(_onCartChanged);
    _loadUploadedCoupons();
    if (!kIsWeb) {
      try {
        _razorpay = Razorpay();
        _razorpay!.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
        _razorpay!.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
        _razorpay!.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
      } catch (e) {
        debugPrint('Razorpay init error: $e');
      }
    }
    _initAddress();
  }

  void _initAddress() {
    if (Globals.savedAddresses.isNotEmpty) {
      final defaultAddr = Globals.savedAddresses.firstWhere(
        (a) => a['isDefault'] == true,
        orElse: () => Globals.savedAddresses.first,
      );
      _selectedAddress = defaultAddr['address']?.toString() ?? '';
      _selectedAddressId = defaultAddr['id']?.toString() ?? '';
    } else if (Globals.userAddress.isNotEmpty) {
      // Use the profile address but don't pollute Globals.savedAddresses with a dummy
      _selectedAddress = Globals.userAddress;
      _selectedAddressId = '';
    }
    // If no address: leave empty so user is prompted to add one

    if (Globals.accessToken.isNotEmpty) {
      _loadAddressesFromServer();
    }
  }

  Future<void> _loadAddressesFromServer() async {
    try {
      final res = await http.get(
        ApiConfig.uri('/app-profile/addresses'),
        headers: {'Authorization': 'Bearer ${Globals.accessToken}'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body)['data'] as List?;
        if (data != null && data.isNotEmpty && mounted) {
          setState(() {
            Globals.savedAddresses = data.cast<Map<String, dynamic>>();
            final defaultAddr = Globals.savedAddresses.firstWhere(
              (a) => a['isDefault'] == true,
              orElse: () => Globals.savedAddresses.first,
            );
            _selectedAddress = defaultAddr['address']?.toString() ?? '';
            _selectedAddressId = defaultAddr['id']?.toString() ?? '';
          });
        }
      }
    } catch (_) {}
  }

  void _syncAddressesToServer() async {
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

  @override
  void dispose() {
    _couponInputController.dispose();
    if (!kIsWeb) {
      _razorpay?.clear();
    }
    _cartManager.removeListener(_onCartChanged);
    super.dispose();
  }

  void _onCartChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _loadUploadedCoupons([StateSetter? setSheetState]) async {
    if (setSheetState != null) {
      setSheetState(() => _isLoadingCoupons = true);
    } else {
      setState(() => _isLoadingCoupons = true);
    }
    try {
      final coupons = await StoreService.getCoupons();
      if (mounted) {
        if (setSheetState != null) {
          setSheetState(() {
            _uploadedCoupons = coupons;
            _isLoadingCoupons = false;
          });
        } else {
          setState(() {
            _uploadedCoupons = coupons;
            _isLoadingCoupons = false;
          });
        }
      }
    } catch (_) {
      if (mounted) {
        if (setSheetState != null) {
          setSheetState(() => _isLoadingCoupons = false);
        } else {
          setState(() => _isLoadingCoupons = false);
        }
      }
    }
  }

  Future<void> _applyEnteredCoupon(
    String code,
    BuildContext sheetCtx,
    bool isLight,
    StateSetter setSheetState,
  ) async {
    final subtotal = _cartManager.itemTotal - _cartManager.discount;

    // 1. Check if matching coupon is already loaded from uploaded coupons
    final match = _uploadedCoupons.firstWhere(
      (c) => (c['code'] ?? '').toString().toUpperCase() == code,
      orElse: () => {},
    );

    if (match.isNotEmpty) {
      final minOrder = (match['minOrder'] as num?)?.toInt() ?? 0;
      if (minOrder > 0 && subtotal < minOrder) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Minimum order amount of ₹$minOrder required for this coupon'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }
      _cartManager.applyCoupon(code, match);
      Navigator.pop(sheetCtx);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Coupon $code applied successfully!'),
          backgroundColor: isLight ? const Color(0xFF0F172A) : const Color(0xFF0F1A2E),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    // 2. Validate with backend API for uploaded coupon
    final res = await StoreService.validateCoupon(code, subtotal);
    if (res != null && res['valid'] == true) {
      if (!mounted || !sheetCtx.mounted) return;
      _cartManager.applyCoupon(code, res['coupon'] ?? res);
      Navigator.pop(sheetCtx);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Coupon $code applied successfully!'),
          backgroundColor: isLight ? const Color(0xFF0F172A) : const Color(0xFF0F1A2E),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res?['message'] ?? 'Invalid or inactive coupon code'),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _addNewAddress() async {
    final newAddr = await Navigator.push<AddressModel>(
      context,
      MaterialPageRoute(
        builder: (context) => const EditAddressScreen(isNew: true),
      ),
    );

    if (newAddr != null) {
      final formatted = [
        newAddr.address,
        if (newAddr.landmark.isNotEmpty) newAddr.landmark,
        if (newAddr.city.isNotEmpty) newAddr.city,
        if (newAddr.state.isNotEmpty) newAddr.state,
        if (newAddr.pincode.isNotEmpty) newAddr.pincode,
      ].where((s) => s.trim().isNotEmpty).join(', ');

      final map = {
        'id': (newAddr.id.isNotEmpty) ? newAddr.id : 'addr_${DateTime.now().millisecondsSinceEpoch}',
        'type': newAddr.type.isNotEmpty ? newAddr.type : 'Home',
        'address': formatted.isNotEmpty ? formatted : newAddr.address,
        'landmark': newAddr.landmark,
        'city': newAddr.city,
        'state': newAddr.state,
        'pincode': newAddr.pincode,
        'isDefault': newAddr.isDefault,
      };

      if (newAddr.isDefault) {
        for (var a in Globals.savedAddresses) {
          a['isDefault'] = false;
        }
      }
      Globals.savedAddresses.add(map);
      _syncAddressesToServer();
      if (mounted) {
        setState(() {
          _selectedAddress = map['address']!.toString();
          _selectedAddressId = map['id']!.toString();
        });
      }
    }
  }

  void _showChangeAddressSheet() async {
    final isLight = AppTheme.isLightNotifier.value;
    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final bottomPad = MediaQuery.of(ctx).viewInsets.bottom;
        return Padding(
          padding: EdgeInsets.only(bottom: bottomPad),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(ctx).size.height * 0.75,
            ),
            decoration: BoxDecoration(
              color: isLight ? Colors.white : const Color(0xFF0F1A2E),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Select Delivery Address',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        await _addNewAddress();
                      },
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Add New'),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                if (Globals.savedAddresses.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.location_off_outlined,
                            size: 36,
                            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'No Saved Addresses Found',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14.5,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Add a delivery address to complete your order',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 14),
                          ElevatedButton.icon(
                            onPressed: () async {
                              Navigator.pop(ctx);
                              await _addNewAddress();
                            },
                            icon: const Icon(Icons.add_location_alt_outlined, size: 16),
                            label: const Text('Add Delivery Address'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  Flexible(
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: Globals.savedAddresses.length,
                      itemBuilder: (context, idx) {
                      final addr = Globals.savedAddresses[idx];
                      final addrStr = addr['address']?.toString() ?? '';
                      final isSelected = _selectedAddress == addrStr;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: isLight
                              ? (isSelected ? const Color(0xFFEFF6FF) : Colors.white)
                              : const Color(0xFF0A1222),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isSelected
                                ? AppTheme.primaryColor
                                : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A)),
                          ),
                          boxShadow: isLight && !isSelected ? AppTheme.cardShadow : null,
                        ),
                        child: ListTile(
                          leading: Icon(
                            Icons.location_on_rounded,
                            color: isSelected
                                ? AppTheme.primaryColor
                                : const Color(0xFF64748B),
                          ),
                          title: Text(
                            addr['type']?.toString() ?? 'Home',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          subtitle: Text(
                            addrStr,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                              fontSize: 12,
                            ),
                          ),
                          trailing: isSelected
                              ? Icon(Icons.check_circle_rounded, color: AppTheme.primaryColor)
                              : null,
                          onTap: () {
                            setState(() {
                              _selectedAddress = addrStr;
                              _selectedAddressId = addr['id']?.toString() ?? '';
                            });
                            Navigator.pop(ctx);
                          },
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showCouponSheet() {
    final isLight = AppTheme.isLightNotifier.value;
    _couponInputController.clear();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final isCouponApplied = _cartManager.appliedCoupon != null;
            // Refresh coupons dynamically when sheet opens
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (_uploadedCoupons.isEmpty && !_isLoadingCoupons) {
                _loadUploadedCoupons(setSheetState);
              }
            });
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(ctx).viewInsets.bottom,
              ),
              child: SafeArea(
                top: false,
                child: Container(
                  constraints: BoxConstraints(
                    maxHeight: MediaQuery.of(ctx).size.height * 0.75,
                  ),
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: isLight
                                ? const Color(0xFFE2E8F0)
                                : const Color(0xFF1E2D4A),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Apply Coupon',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF0F172A)
                                  : Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (isCouponApplied)
                            TextButton(
                              onPressed: () {
                                _cartManager.removeCoupon();
                                setSheetState(() {});
                                Navigator.pop(ctx);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Coupon removed'),
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                              },
                              child: const Text(
                                'Remove',
                                style: TextStyle(
                                  color: Color(0xFFEF4444),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Input Field to add custom coupon code
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 3),
                        decoration: BoxDecoration(
                          color: isLight
                              ? const Color(0xFFF8FAFC)
                              : const Color(0xFF0A1222),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isLight
                                ? const Color(0xFFCBD5E1)
                                : const Color(0xFF1E2D4A),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.local_offer_outlined,
                              size: 18,
                              color: isLight
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF94A3B8),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: TextField(
                                controller: _couponInputController,
                                textCapitalization: TextCapitalization.characters,
                                style: TextStyle(
                                  color: isLight
                                      ? const Color(0xFF0F172A)
                                      : Colors.white,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.0,
                                  fontSize: 13.5,
                                ),
                                decoration: InputDecoration(
                                  hintText: 'Enter coupon code',
                                  hintStyle: TextStyle(
                                    color: isLight
                                        ? const Color(0xFF94A3B8)
                                        : const Color(0xFF64748B),
                                    fontSize: 13,
                                    fontWeight: FontWeight.normal,
                                    letterSpacing: 0,
                                  ),
                                  border: InputBorder.none,
                                  isDense: true,
                                  contentPadding:
                                      const EdgeInsets.symmetric(vertical: 11),
                                ),
                                onSubmitted: (val) {
                                  final code = val.trim().toUpperCase();
                                  if (code.isNotEmpty) {
                                    _applyEnteredCoupon(code, ctx, isLight, setSheetState);
                                  }
                                },
                              ),
                            ),
                            TextButton(
                              onPressed: () {
                                final code = _couponInputController.text
                                    .trim()
                                    .toUpperCase();
                                if (code.isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Please enter a coupon code'),
                                      behavior: SnackBarBehavior.floating,
                                    ),
                                  );
                                  return;
                                }
                                _applyEnteredCoupon(code, ctx, isLight, setSheetState);
                              },
                              child: Text(
                                'Apply',
                                style: TextStyle(
                                  color: isLight
                                      ? AppTheme.primaryColor
                                      : const Color(0xFF04C9FB),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Available Coupons',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF94A3B8),
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (_isLoadingCoupons)
                            const AppLoadingSpinner(size: 16),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Scrollable Available Coupons List with Expanded (Never overflows)
                      Expanded(
                        child: _isLoadingCoupons && _uploadedCoupons.isEmpty
                            ? const Center(
                                child: AppLoadingSpinner(size: 50),
                              )
                            : _uploadedCoupons.isEmpty
                                ? Center(
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.local_offer_outlined,
                                          size: 36,
                                          color: isLight
                                              ? const Color(0xFF94A3B8)
                                              : const Color(0xFF64748B),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          'No Coupons Available',
                                          style: TextStyle(
                                            color: isLight
                                                ? const Color(0xFF0F172A)
                                                : Colors.white,
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Only coupons uploaded by admin will appear here.',
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            color: isLight
                                                ? const Color(0xFF64748B)
                                                : const Color(0xFF94A3B8),
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  )
                                : ListView.builder(
                                    physics: const BouncingScrollPhysics(),
                                    itemCount: _uploadedCoupons.length,
                                    itemBuilder: (itemCtx, idx) {
                                      final c = _uploadedCoupons[idx];
                                      final code = (c['code'] ?? '').toString().toUpperCase();
                                      final title = (c['title'] ?? '$code Offer').toString();
                                      final discountType = (c['discountType'] ?? '').toString().toUpperCase();
                                      final discountValue = c['discountValue']?.toString() ?? '';
                                      final minOrder = (c['minOrder'] as num?)?.toInt() ?? 0;

                                      String desc = (c['description'] ?? c['desc'] ?? '').toString();
                                      if (desc.isEmpty) {
                                        if (discountType == 'FLAT') {
                                          desc = 'Flat ₹$discountValue off on checkout';
                                        } else {
                                          desc = 'Get $discountValue% instant discount';
                                        }
                                        if (minOrder > 0) {
                                          desc += ' (Min order: ₹$minOrder)';
                                        }
                                      }

                                      final isApplied = _cartManager.appliedCoupon == code;
                                      return Container(
                                        margin: const EdgeInsets.only(bottom: 12),
                                        padding: const EdgeInsets.all(14),
                                        decoration: BoxDecoration(
                                          color: isLight
                                              ? (isApplied
                                                  ? const Color(0xFFF0FDF4)
                                                  : Colors.white)
                                              : (isApplied
                                                  ? const Color(0xFF0B251E)
                                                  : const Color(0xFF0A1222)),
                                          borderRadius: BorderRadius.circular(14),
                                          border: Border.all(
                                            color: isApplied
                                                ? const Color(0xFF10B981)
                                                : (isLight
                                                    ? const Color(0xFFE2E8F0)
                                                    : const Color(0xFF1E2D4A)),
                                          ),
                                          boxShadow: isLight ? AppTheme.cardShadow : null,
                                        ),
                                        child: Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(
                                                  horizontal: 10, vertical: 6),
                                              decoration: BoxDecoration(
                                                color: (isLight
                                                        ? AppTheme.primaryColor
                                                        : const Color(0xFF04C9FB))
                                                    .withValues(alpha: 0.12),
                                                borderRadius: BorderRadius.circular(8),
                                                border: Border.all(
                                                    color: isLight
                                                        ? AppTheme.primaryColor
                                                        : const Color(0xFF04C9FB)),
                                              ),
                                              child: Text(
                                                code,
                                                style: TextStyle(
                                                  color: isLight
                                                      ? AppTheme.primaryColor
                                                      : const Color(0xFF04C9FB),
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 13,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    title,
                                                    style: TextStyle(
                                                      color: isLight
                                                          ? const Color(0xFF0F172A)
                                                          : Colors.white,
                                                      fontWeight: FontWeight.w600,
                                                      fontSize: 13,
                                                    ),
                                                  ),
                                                  const SizedBox(height: 2),
                                                  Text(
                                                    desc,
                                                    style: TextStyle(
                                                      color: isLight
                                                          ? const Color(0xFF64748B)
                                                          : const Color(0xFF94A3B8),
                                                      fontSize: 11.5,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            TextButton(
                                              onPressed: () {
                                                if (isApplied) {
                                                  _cartManager.removeCoupon();
                                                  setSheetState(() {});
                                                } else {
                                                  if (minOrder > 0) {
                                                    final subtotal = _cartManager.itemTotal - _cartManager.discount;
                                                    if (subtotal < minOrder) {
                                                      ScaffoldMessenger.of(context).showSnackBar(
                                                        SnackBar(
                                                          content: Text('Minimum order amount of ₹$minOrder required for this coupon'),
                                                          behavior: SnackBarBehavior.floating,
                                                        ),
                                                      );
                                                      return;
                                                    }
                                                  }
                                                  _cartManager.applyCoupon(code, c);
                                                  Navigator.pop(ctx);
                                                  ScaffoldMessenger.of(context).showSnackBar(
                                                    SnackBar(
                                                      content: Text('Coupon $code applied successfully!'),
                                                      backgroundColor: isLight
                                                          ? const Color(0xFF0F172A)
                                                          : const Color(0xFF0F1A2E),
                                                      behavior: SnackBarBehavior.floating,
                                                    ),
                                                  );
                                                }
                                              },
                                              child: Text(
                                                isApplied ? 'Applied' : 'Apply',
                                                style: TextStyle(
                                                  color: isApplied
                                                      ? const Color(0xFF10B981)
                                                      : (isLight
                                                          ? AppTheme.primaryColor
                                                          : const Color(0xFF04C9FB)),
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showPaymentOptionsSheet() {
    final methods = [
      {'name': 'Pay Online (Razorpay)', 'icon': Icons.payment_rounded},
      {'name': 'Cash on Delivery', 'icon': Icons.local_shipping_rounded},
    ];

    final isLight = AppTheme.isLightNotifier.value;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final bottomPad = MediaQuery.of(ctx).viewInsets.bottom;
        return Padding(
          padding: EdgeInsets.only(bottom: bottomPad),
          child: Container(
            decoration: BoxDecoration(
              color: isLight ? Colors.white : const Color(0xFF0F1A2E),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  'Select Payment Option',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 14),
                ...methods.map((m) {
                  final isSelected = _selectedPaymentMethod == m['name'];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: isLight
                          ? (isSelected ? const Color(0xFFEFF6FF) : Colors.white)
                          : const Color(0xFF0A1222),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isSelected
                            ? AppTheme.primaryColor
                            : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A)),
                      ),
                      boxShadow: isLight && !isSelected ? AppTheme.cardShadow : null,
                    ),
                    child: ListTile(
                      leading: Icon(
                        m['icon'] as IconData,
                        color: isSelected
                            ? AppTheme.primaryColor
                            : const Color(0xFF64748B),
                      ),
                      title: Text(
                        m['name'] as String,
                        style: TextStyle(
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      trailing: isSelected
                          ? Icon(Icons.check_circle_rounded,
                              color: AppTheme.primaryColor)
                          : null,
                      onTap: () {
                        setState(() {
                          _selectedPaymentMethod = m['name'] as String;
                        });
                        Navigator.pop(ctx);
                      },
                    ),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) async {
    final success = await StoreService.verifyPayment(
      razorpayOrderId: response.orderId ?? '',
      razorpayPaymentId: response.paymentId ?? '',
      razorpaySignature: response.signature ?? '',
      items: _cartManager.items,
      totalAmount: _cartManager.totalPayable,
      addressId: _selectedAddressId.isNotEmpty ? _selectedAddressId : 'default',
    );

    if (mounted) {
      setState(() => _isPlacingOrder = false);
    }

    if (success) {
      _cartManager.clearCart();
      if (mounted) {
        final orderId = response.orderId != null && response.orderId!.isNotEmpty
            ? '#ORD-${response.orderId!.replaceAll('order_', '')}'
            : '#ORD-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => OrderConfirmationScreen(orderId: orderId),
          ),
        );
      }
    } else {
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => PaymentFailedScreen(
              errorMessage: 'Payment verification failed.',
              onTryAgain: () {
                Navigator.pop(context);
                _handlePlaceOrder();
              },
            ),
          ),
        );
      }
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    if (mounted) {
      setState(() => _isPlacingOrder = false);
    }
    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PaymentFailedScreen(
          errorMessage: response.message,
          onTryAgain: () {
            Navigator.pop(context);
            _handlePlaceOrder();
          },
        ),
      ),
    );
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    if (mounted) {
      setState(() => _isPlacingOrder = false);
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('External Wallet: ${response.walletName}')),
    );
  }

  void _handlePlaceOrder() async {
    if (_isPlacingOrder) return;

    if (_selectedAddress.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add or select a delivery address first.')),
      );
      _showChangeAddressSheet();
      return;
    }

    setState(() => _isPlacingOrder = true);
    final amount = _cartManager.totalPayable;

    try {
      if (_selectedPaymentMethod == 'Cash on Delivery') {
        final success = await StoreService.createOrder(
          _cartManager.items,
          amount,
          _selectedAddressId.isNotEmpty ? _selectedAddressId : 'default',
        );
        if (mounted) {
          setState(() => _isPlacingOrder = false);
        }
        if (success) {
          _cartManager.clearCart();
          if (mounted) {
            final codOrderId = '#COD-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (context) => OrderConfirmationScreen(orderId: codOrderId),
              ),
            );
          }
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Failed to place COD order. Please try again.')),
            );
          }
        }
        return;
      }

      // Online Razorpay Payment
      final orderData = await StoreService.createRazorpayOrder(amount);

      if (orderData != null && orderData['id'] != null) {
        final razorpayKey = orderData['key'] ?? orderData['key_id'] ?? 'rzp_test_Tm9BKNGeBE7GAx';
        final sanitizedPhone = Globals.phone.replaceAll(RegExp(r'\D'), '');
        var options = {
          'key': razorpayKey,
          'amount': amount * 100, // in paise
          'name': 'CarQConnect',
          'order_id': orderData['id'],
          'description': 'Store Purchase',
          'prefill': {
            'contact': sanitizedPhone.isNotEmpty ? sanitizedPhone : '9513886363',
            'email': Globals.email.isNotEmpty ? Globals.email : 'customer@carqconnect.com',
          },
          'theme': {
            'color': '#0066FF',
          },
        };

        try {
          if (!kIsWeb && _razorpay != null) {
            _razorpay!.open(options);
          } else {
            // Web fallback checkout handling
            final success = await StoreService.verifyPayment(
              razorpayOrderId: orderData['id'],
              razorpayPaymentId: 'pay_web_${DateTime.now().millisecondsSinceEpoch}',
              razorpaySignature: 'sig_web_valid',
              items: _cartManager.items,
              totalAmount: amount,
              addressId: _selectedAddressId.isNotEmpty ? _selectedAddressId : 'default',
            );
            if (mounted) {
              setState(() => _isPlacingOrder = false);
            }
            if (success) {
              _cartManager.clearCart();
              if (mounted) {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(
                    builder: (context) {
                      final rawId = (orderData['id'] ?? '').toString();
                      final cleanId = rawId.length >= 8 ? rawId.substring(0, 8) : rawId;
                      return OrderConfirmationScreen(
                        orderId: '#ORD-$cleanId',
                      );
                    },
                  ),
                );
              }
            }
          }
        } catch (e) {
          if (mounted) {
            setState(() => _isPlacingOrder = false);
          }
          debugPrint('Razorpay open error: $e');
        }
      } else {
        if (mounted) {
          setState(() => _isPlacingOrder = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to initiate payment. Please try again.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isPlacingOrder = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Order placement failed: $e')),
        );
      }
    }
  }

  void _handleBack() {
    if (Navigator.canPop(context)) {
      Navigator.pop(context);
    } else {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(
          builder: (context) => const BottomNavigationScreen(initialIndex: 0),
        ),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = _cartManager.items;

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return PopScope(
          canPop: false,
          onPopInvokedWithResult: (didPop, _) {
            if (didPop) return;
            _handleBack();
          },
          child: Scaffold(
            backgroundColor: isLight ? Colors.transparent : const Color(0xFF070B18),
            body: Container(
              decoration: BoxDecoration(
                gradient: isLight
                    ? AppTheme.bgGradient
                    : const LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0xFF070C18),
                          Color(0xFF0A1122),
                          Color(0xFF0E172C),
                        ],
                        stops: [0.0, 0.45, 1.0],
                      ),
              ),
              child: SafeArea(
                child: Column(
                  children: [
                    // 1. Header Bar: Back, Cart Title, Heart & Share
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Row(
                        children: [
                          AnimatedBackArrowButton(onTap: _handleBack),
                        Expanded(
                          child: Center(
                            child: Text(
                              'Cart',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 19,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.2,
                              ),
                            ),
                          ),
                        ),
                        IconButton(
                          tooltip: 'Wishlist',
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const WishlistScreen(),
                              ),
                            );
                          },
                          icon: Icon(
                            Icons.favorite_border_rounded,
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                            size: 22,
                          ),
                        ),
                        IconButton(
                          onPressed: () {},
                          icon: Icon(
                            Icons.share_outlined,
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                            size: 22,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // 2. Scrollable Body
                  Expanded(
                    child: items.isEmpty
                        ? _buildEmptyCart(isLight)
                        : SingleChildScrollView(
                            physics: const BouncingScrollPhysics(),
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Delivering to Card
                                _buildDeliveringToCard(isLight),

                                const SizedBox(height: 14),

                                // Cart Items List
                                ...items.map((item) => _buildCartItemCard(item, isLight)),

                                const SizedBox(height: 6),

                                // Apply Coupon Card
                                _buildApplyCouponCard(isLight),

                                const SizedBox(height: 14),

                                // Order Summary Card
                                _buildOrderSummaryCard(isLight),

                                const SizedBox(height: 16),
                              ],
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: items.isEmpty ? null : _buildCheckoutBar(isLight),
        ),
      );
    },
  );
}

  Widget _buildEmptyCart(bool isLight) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: isLight ? Colors.white : const Color(0xFF0F1A2E),
              shape: BoxShape.circle,
              border: Border.all(
                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
              ),
              boxShadow: isLight ? AppTheme.cardShadow : null,
            ),
            child: Icon(
              Icons.shopping_cart_outlined,
              color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              size: 38,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Your Cart is Empty',
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Explore automotive gadgets and smart devices',
            style: TextStyle(
              color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _handleBack,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: const Text(
              'Browse Store',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeliveringToCard(bool isLight) {
    String addressType = 'Delivery Address';
    if (_selectedAddress.isNotEmpty) {
      final match = Globals.savedAddresses.firstWhere(
        (a) => a['address']?.toString() == _selectedAddress,
        orElse: () => {},
      );
      if (match.isNotEmpty && match['type'] != null && match['type'].toString().isNotEmpty) {
        addressType = match['type'].toString();
      } else {
        addressType = 'Home';
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1A2E),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Red circular icon
          Container(
            width: 36,
            height: 36,
            decoration: const BoxDecoration(
              color: Color(0xFFFEE2E2),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.location_on,
              color: Color(0xFFEF4444),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Delivering to',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _selectedAddress.isNotEmpty ? addressType : 'No Address',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 15.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _selectedAddress.isNotEmpty
                      ? _selectedAddress
                      : 'Please add a delivery address to proceed',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                    fontSize: 12,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          InkWell(
            onTap: _showChangeAddressSheet,
            borderRadius: BorderRadius.circular(20),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF0A1222),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isLight ? const Color(0xFFBFDBFE) : const Color(0xFF1E2D4A),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _selectedAddress.isNotEmpty ? 'Change' : 'Add',
                    style: TextStyle(
                      color: isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 2),
                  Icon(
                    Icons.chevron_right,
                    color: isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB),
                    size: 14,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCartItemCard(CartItem item, bool isLight) {
    final p = item.product;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1A2E),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Thumbnail
          Container(
            width: 58,
            height: 58,
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF0A1222),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
              ),
            ),
            child: Image.asset(
              p.image,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) => Icon(
                Icons.devices_other_rounded,
                color: isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB),
              ),
            ),
          ),
          const SizedBox(width: 14),

          // Details: Title, Subtitle, Price
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  p.title,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Text(
                  p.subtitle,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                    fontSize: 12,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      '₹${p.price.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 14.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '₹${p.originalPrice}',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        fontSize: 11.5,
                        decoration: TextDecoration.lineThrough,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${p.discountPercent}% off',
                      style: const TextStyle(
                        color: Color(0xFF10B981),
                        fontSize: 11.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Stepper + Trash Button
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Quantity Stepper
              Container(
                decoration: BoxDecoration(
                  color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF0A1222),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    InkWell(
                      onTap: () => _cartManager.updateQuantity(p.id, -1),
                      borderRadius: const BorderRadius.horizontal(
                          left: Radius.circular(16)),
                      child: Padding(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        child: Text(
                          '-',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      child: Text(
                        '${item.quantity}',
                        style: TextStyle(
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: () => _cartManager.updateQuantity(p.id, 1),
                      borderRadius: const BorderRadius.horizontal(
                          right: Radius.circular(16)),
                      child: Padding(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        child: Text(
                          '+',
                          style: TextStyle(
                            color: isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB),
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              // Delete icon
              InkWell(
                onTap: () => _cartManager.removeItem(p.id),
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.all(4),
                  child: Icon(
                    Icons.delete_outline_rounded,
                    color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    size: 18,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildApplyCouponCard(bool isLight) {
    final isCouponApplied = _cartManager.appliedCoupon != null;
    return Container(
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1A2E),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCouponApplied
              ? const Color(0xFF10B981).withValues(alpha: 0.5)
              : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A)),
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isCouponApplied ? null : _showCouponSheet,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: isCouponApplied
                        ? const Color(0xFF10B981).withValues(alpha: 0.15)
                        : const Color(0xFF007AFF).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    isCouponApplied ? Icons.check_circle_rounded : Icons.percent_rounded,
                    color: isCouponApplied ? const Color(0xFF10B981) : const Color(0xFF007AFF),
                    size: 18,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isCouponApplied
                            ? 'Coupon ${_cartManager.appliedCoupon} Applied!'
                            : 'Apply Coupon',
                        style: TextStyle(
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (isCouponApplied && _cartManager.couponDiscount > 0)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(
                            'Extra ₹${_cartManager.couponDiscount} discount applied',
                            style: const TextStyle(
                              color: Color(0xFF10B981),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                if (isCouponApplied)
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () {
                      _cartManager.removeCoupon();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Coupon removed'),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Remove',
                        style: TextStyle(
                          color: Color(0xFFEF4444),
                          fontSize: 12.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  )
                else
                  Icon(
                    Icons.chevron_right,
                    color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    size: 20,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOrderSummaryCard(bool isLight) {
    final itemTotal = _cartManager.itemTotal;
    final discount = _cartManager.discount;
    final totalPayable = _cartManager.totalPayable;
    final totalSavings = _cartManager.totalSavings;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1A2E),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Order Summary',
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 15.5,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 14),

          // Item Total
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Item Total',
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                  fontSize: 13.5,
                ),
              ),
              Text(
                '₹${itemTotal.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 13.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Discount
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Discount',
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                  fontSize: 13.5,
                ),
              ),
              Text(
                '-₹${discount.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}',
                style: const TextStyle(
                  color: Color(0xFF10B981),
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          if (_cartManager.appliedCoupon != null && _cartManager.couponDiscount > 0) ...[
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Flexible(
                        child: Text(
                          'Coupon (${_cartManager.appliedCoupon})',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                            fontSize: 13.5,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 6),
                      GestureDetector(
                        onTap: () => _cartManager.removeCoupon(),
                        child: const Icon(Icons.cancel_rounded, size: 16, color: Color(0xFFEF4444)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '-₹${_cartManager.couponDiscount.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}',
                  style: const TextStyle(
                    color: Color(0xFF10B981),
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 10),

          // Delivery Fee
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Delivery Fee',
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                  fontSize: 13.5,
                ),
              ),
              const Text(
                'FREE',
                style: TextStyle(
                  color: Color(0xFF10B981),
                  fontSize: 13.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Installation (Optional)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Flexible(
                      child: Text(
                        'Installation (Optional)',
                        style: TextStyle(
                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                          fontSize: 13.5,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 6),
                    GestureDetector(
                      onTap: () => _cartManager.toggleInstallation(
                          !_cartManager.includeInstallation),
                      child: Icon(
                        _cartManager.includeInstallation
                            ? Icons.check_box_rounded
                            : Icons.check_box_outline_blank_rounded,
                        color: isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB),
                        size: 18,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                _cartManager.includeInstallation ? '₹499' : '₹0',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 13.5,
                ),
              ),
            ],
          ),

          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Divider(
              color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1E2D4A),
              height: 1,
            ),
          ),

          // Total Payable
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total Payable',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                '₹${totalPayable.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),

          // You save
          Text(
            'You save ₹${totalSavings.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}',
            style: const TextStyle(
              color: Color(0xFF10B981),
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCheckoutBar(bool isLight) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        decoration: BoxDecoration(
          color: isLight ? Colors.white : const Color(0xFF0A1122),
          border: Border(
            top: BorderSide(
              color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
              width: 1.0,
            ),
          ),
        ),
        child: Row(
          children: [
            // Payment selector (Razorpay / COD)
            Expanded(
              child: GestureDetector(
                onTap: _showPaymentOptionsSheet,
                behavior: HitTestBehavior.opaque,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pay Using',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                        fontSize: 11,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _selectedPaymentMethod,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),

            // Place Order Button (Strictly constrained, FittedBox ensures zero horizontal overflow on any device)
            SizedBox(
              width: 130,
              height: 46,
              child: ElevatedButton(
                onPressed: _isPlacingOrder ? null : _handlePlaceOrder,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  disabledBackgroundColor: AppTheme.primaryColor.withValues(alpha: 0.6),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(23),
                  ),
                  elevation: 0,
                ),
                child: _isPlacingOrder
                    ? const AppLoadingSpinner(
                        size: 22,
                        primaryColor: Colors.white,
                        showGlow: false,
                      )
                    : const FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Place Order',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            SizedBox(width: 4),
                            Icon(
                              Icons.arrow_forward_rounded,
                              color: Colors.white,
                              size: 16,
                            ),
                          ],
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
