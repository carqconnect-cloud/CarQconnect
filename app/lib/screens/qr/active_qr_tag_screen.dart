import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'dart:ui' as ui;
import 'dart:typed_data';
import 'package:flutter/rendering.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../utils/gallery_saver.dart';

import '../store/store_service.dart';
import '../store/order_confirmation.dart';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

import 'dart:async';

import 'qr_code_widget.dart';
import 'set_contact_privacy_screen.dart';
import 'select_vehicle_screen.dart';

import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../globals.dart';
import '../../loading.dart';
import '../../utils/api_config.dart';
import '../../utils/app_icons.dart';
import '../../theme/app_theme.dart';
import '../../services/screen_refresh_service.dart';
import '../../services/auth_storage_service.dart';
import '../../widgets/animated_back_arrow.dart';

/// Screen 5: My QR Tag (Active Management Dashboard matching Screenshot 5)
class ActiveQrTagScreen extends StatefulWidget {
  final String vehicleName;
  final String vehicleReg;
  final String tagId;
  final String vehicleId;

  final bool callOwner;
  final bool sendMessage;
  final bool bloodGroupVisibility;
  final bool emergencyContact;

  const ActiveQrTagScreen({
    super.key,
    required this.tagId,
    required this.vehicleId,
    required this.vehicleName,
    required this.vehicleReg,
    this.callOwner = true,
    this.sendMessage = true,
    this.bloodGroupVisibility = false,
    this.emergencyContact = true,
  });

  @override
  State<ActiveQrTagScreen> createState() => _ActiveQrTagScreenState();
}

class _ActiveQrTagScreenState extends State<ActiveQrTagScreen>
    with RefreshOnRouteReturn<ActiveQrTagScreen> {
  Razorpay? _razorpay;
  String _currentTagId = '';
  bool _isOrdering = false;
  bool _isDownloading = false;
  bool _isDigitalEtagUnlocked = false;
  String _currentPaymentType = '';
  final GlobalKey _qrCardKey = GlobalKey();
  bool _callOwner = false;
  bool _sendMessage = false;
  bool _bloodGroupVisibility = false;
  bool _emergencyContact = false;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _callOwner = widget.callOwner;
    _sendMessage = widget.sendMessage;
    _bloodGroupVisibility = widget.bloodGroupVisibility;
    _emergencyContact = widget.emergencyContact;
    _currentTagId = widget.tagId;
    _checkDigitalTagStatus();
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
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      if (mounted) _fetchTagDetails();
    });
  }

  @override
  void dispose() {
    if (!kIsWeb) {
      try {
        _razorpay?.clear();
      } catch (_) {}
    }
    _autoRefreshTimer?.cancel();
    super.dispose();
  }


  Future<void> _checkDigitalTagStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final tagKey = widget.tagId;
      if (prefs.getBool('digital_etag_unlocked_$tagKey') == true) {
        if (mounted) setState(() => _isDigitalEtagUnlocked = true);
      }
    } catch (_) {}
  }

  Future<void> _fetchTagDetails() async {
    if (Globals.accessToken.isEmpty) return;
    try {
      final res = await AuthStorageService.authenticatedGet('/app-qr/tags');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body)['data'] as List;
        final current = data.firstWhere(
          (t) =>
              t['tagId'] == widget.tagId ||
              t['code'] == widget.tagId ||
              (widget.vehicleId.isNotEmpty &&
                  t['vehicleId'] == widget.vehicleId),
          orElse: () => null,
        );
        if (current != null && mounted) {
          setState(() {
            _currentTagId = current['tagId'] ?? current['code'] ?? _currentTagId;
            _callOwner = current['callOwner'] ?? _callOwner;
            _sendMessage = current['sendMessage'] ?? _sendMessage;
            _bloodGroupVisibility =
                current['bloodGroupVisibility'] ?? _bloodGroupVisibility;
            _emergencyContact =
                current['emergencyContact'] ?? _emergencyContact;
          });
          _checkDigitalTagStatus();
        }
      }
    } catch (e) {
      debugPrint('Error polling tag details: $e');
    }
  }

  Future<void> _updatePrivacy(String key, bool value) async {
    setState(() {
      if (key == 'callOwner') _callOwner = value;
      if (key == 'sendMessage') _sendMessage = value;
      if (key == 'bloodGroupVisibility') _bloodGroupVisibility = value;
      if (key == 'emergencyContact') _emergencyContact = value;
    });

    if (Globals.accessToken.isNotEmpty) {
      try {
        await http.patch(
          ApiConfig.uri('/app-qr/tags/${widget.tagId}/privacy'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ${Globals.accessToken}',
          },
          body: jsonEncode({key: value}),
        );
      } catch (e) {
        debugPrint('Privacy update failed: $e');
      }
    }
  }

  Future<void> _onOrderEtag() async {
    if (_isOrdering) return;
    setState(() {
      _isOrdering = true;
      _currentPaymentType = 'physical';
    });

    const int amount = 199;

    // 1. Native Mobile (Android / iOS): Open Razorpay native SDK
    if (!kIsWeb && _razorpay != null) {
      try {
        final orderData = await StoreService.createRazorpayOrder(amount);

        if (orderData != null && orderData['id'] != null) {
          final displayName = widget.vehicleName.isNotEmpty
              ? widget.vehicleName
              : (Globals.vehicleModel.isNotEmpty
                    ? Globals.vehicleModel
                    : 'Vehicle');
          final displayReg = widget.vehicleReg.isNotEmpty
              ? widget.vehicleReg
              : Globals.vehicleRegistration;
          final options = {
            'key': 'rzp_test_Tm9BKNGeBE7GAx',
            'amount': amount * 100, // paise
            'name': 'CarQConnect',
            'order_id': orderData['id'],
            'description': 'Order E-tag for $displayName ($displayReg)',
            'prefill': {
              'contact': Globals.phone.isNotEmpty
                  ? Globals.phone
                  : '9513886363',
              'email': Globals.email.isNotEmpty
                  ? Globals.email
                  : 'customer@carqconnect.com',
            },
            'theme': {'color': '#0066FF'},
          };

          _razorpay!.open(options);
          return;
        }
      } catch (e) {
        debugPrint('Error initiating native Razorpay payment: $e');
      } finally {
        if (mounted) setState(() => _isOrdering = false);
      }
    }

    // 2. Web & Fallback Checkout: Directly place order and show Order Confirmation
    try {
      await _simulateOrConfirmOrder(
        paymentId: 'PAY_${DateTime.now().millisecondsSinceEpoch}',
      );
    } finally {
      if (mounted) setState(() => _isOrdering = false);
    }
  }


  Future<void> _onOrderDigitalEtag() async {
    if (_isOrdering) return;
    setState(() {
      _isOrdering = true;
      _currentPaymentType = 'digital';
    });

    const int amount = 80;

    // 1. Native Mobile (Android / iOS): Open Razorpay native SDK
    if (!kIsWeb && _razorpay != null) {
      try {
        final orderData = await StoreService.createRazorpayOrder(amount);

        if (orderData != null && orderData['id'] != null) {
          final displayName = widget.vehicleName.isNotEmpty
              ? widget.vehicleName
              : (Globals.vehicleModel.isNotEmpty
                    ? Globals.vehicleModel
                    : 'Vehicle');
          final displayReg = widget.vehicleReg.isNotEmpty
              ? widget.vehicleReg
              : Globals.vehicleRegistration;
          final options = {
            'key': 'rzp_test_Tm9BKNGeBE7GAx',
            'amount': amount * 100, // 8000 paise
            'name': 'CarQConnect',
            'order_id': orderData['id'],
            'description': 'Order Digital E-tag for $displayName ($displayReg)',
            'prefill': {
              'contact': Globals.phone.isNotEmpty
                  ? Globals.phone
                  : '9513886363',
              'email': Globals.email.isNotEmpty
                  ? Globals.email
                  : 'customer@carqconnect.com',
            },
            'theme': {'color': '#0066FF'},
          };

          _razorpay!.open(options);
          return;
        }
      } catch (e) {
        debugPrint('Error initiating native Razorpay payment: $e');
      } finally {
        if (mounted) setState(() => _isOrdering = false);
      }
    }

    // 2. Web & Fallback Checkout: Confirm test order dialog
    try {
      if (!mounted) return;
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppTheme.isLight ? Colors.white : const Color(0xFF101726),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            'Order Digital E-tag',
            style: TextStyle(
              color: AppTheme.isLight ? const Color(0xFF0F172A) : Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Unlock and download the high-resolution Digital QR E-tag for your vehicle.',
                style: TextStyle(
                  color: AppTheme.isLight ? const Color(0xFF475569) : const Color(0xFF94A3B8),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0066FF).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF0066FF).withValues(alpha: 0.3)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Total Amount:', style: TextStyle(fontWeight: FontWeight.w600)),
                    Text('₹80', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0066FF))),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0066FF),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Pay ₹80 & Unlock'),
            ),
          ],
        ),
      );

      if (confirmed == true) {
        final prefs = await SharedPreferences.getInstance();
        final tagKey = _currentTagId.isNotEmpty ? _currentTagId : widget.tagId;
        await prefs.setBool('digital_etag_unlocked_$tagKey', true);

        if (mounted) {
          setState(() {
            _isDigitalEtagUnlocked = true;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: Color(0xFF10B981),
              duration: Duration(seconds: 4),
              content: Row(
                children: [
                  Icon(Icons.check_circle_rounded, color: Colors.white),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Payment successful! Your Digital E-tag is unlocked.',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _isOrdering = false);
    }
  }

  Future<void> _onDownloadQr() async {
    if (_isDownloading) return;
    setState(() => _isDownloading = true);

    try {
      final tagKey = _currentTagId.isNotEmpty ? _currentTagId : widget.tagId;
      Uint8List? pngBytes;

      // 1. Try capturing RepaintBoundary for high-res branded card
      try {
        final boundary = _qrCardKey.currentContext?.findRenderObject()
            as RenderRepaintBoundary?;
        if (boundary != null) {
          final image = await boundary.toImage(pixelRatio: 3.0);
          final byteData =
              await image.toByteData(format: ui.ImageByteFormat.png);
          pngBytes = byteData?.buffer.asUint8List();
        }
      } catch (e) {
        debugPrint('RepaintBoundary capture error: $e');
      }

      // 2. Fallback to direct QrPainter generation if RepaintBoundary was unavailable
      if (pngBytes == null) {
        final qrData = ApiConfig.getQrScanUrl(tagKey);
        final painter = QrPainter(
          data: qrData,
          version: QrVersions.auto,
          gapless: true,
          eyeStyle: const QrEyeStyle(
            eyeShape: QrEyeShape.square,
            color: Colors.black,
          ),
          dataModuleStyle: const QrDataModuleStyle(
            dataModuleShape: QrDataModuleShape.square,
            color: Colors.black,
          ),
        );
        final picData =
            await painter.toImageData(800, format: ui.ImageByteFormat.png);
        pngBytes = picData?.buffer.asUint8List();
      }

      if (pngBytes != null) {
        final filename = 'CarQConnect_ETag_$tagKey.png';
        final saved =
            await GallerySaver.saveImage(pngBytes, filename: filename);

        if (mounted) {
          if (saved) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                backgroundColor: const Color(0xFF10B981),
                duration: const Duration(seconds: 4),
                content: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded, color: Colors.white),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        kIsWeb
                            ? 'Digital E-tag downloaded ($filename)'
                            : 'Digital E-tag saved to Gallery ($filename)',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                backgroundColor: Color(0xFFEF4444),
                content: Text('Failed to save QR to Gallery. Please try again.'),
              ),
            );
          }
        }
      }
    } catch (e) {
      debugPrint('Error downloading QR: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFFEF4444),
            content: Text('Download error: $e'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isDownloading = false);
    }
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) async {
    if (!mounted) return;
    setState(() => _isOrdering = true);

    if (_currentPaymentType == 'digital') {
      try {
        final prefs = await SharedPreferences.getInstance();
        final tagKey = _currentTagId.isNotEmpty ? _currentTagId : widget.tagId;
        await prefs.setBool('digital_etag_unlocked_$tagKey', true);

        await StoreService.orderETag(
          razorpayOrderId: response.orderId ?? '',
          razorpayPaymentId: response.paymentId ?? '',
          razorpaySignature: response.signature ?? '',
          tagId: tagKey,
          vehicleReg: widget.vehicleReg.isNotEmpty
              ? widget.vehicleReg
              : Globals.vehicleRegistration,
          amount: 80,
        ).catchError((_) => null);

        if (mounted) {
          setState(() {
            _isDigitalEtagUnlocked = true;
            _isOrdering = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: Color(0xFF10B981),
              duration: Duration(seconds: 4),
              content: Row(
                children: [
                  Icon(Icons.check_circle_rounded, color: Colors.white),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Payment successful! Your Digital E-tag is now unlocked.',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }
      } catch (e) {
        debugPrint('Error unlocking digital E-tag: $e');
        if (mounted) setState(() => _isOrdering = false);
      }
      return;
    }

    try {
      final displayTagId = _currentTagId.isNotEmpty
          ? _currentTagId
          : widget.tagId;
      final displayReg = widget.vehicleReg.isNotEmpty
          ? widget.vehicleReg
          : Globals.vehicleRegistration;
      final order = await StoreService.orderETag(
        razorpayOrderId: response.orderId ?? '',
        razorpayPaymentId: response.paymentId ?? '',
        razorpaySignature: response.signature ?? '',
        tagId: displayTagId,
        vehicleReg: displayReg,
        amount: 199,
      );

      final orderId = order?['id'] != null
          ? '#${order!['id'].toString().substring(0, 8).toUpperCase()}'
          : '#FN${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';

      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => OrderConfirmationScreen(
              orderId: orderId,
              estimatedDelivery: 'Dispatched within 24-48 hours',
            ),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error verifying E-tag payment: $e');
    } finally {
      if (mounted) setState(() => _isOrdering = false);
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    if (!mounted) return;
    setState(() => _isOrdering = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Payment cancelled or failed: ${response.message ?? "Please try again"}',
        ),
        backgroundColor: Colors.redAccent,
      ),
    );
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('External Wallet: ${response.walletName}')),
    );
  }

  Future<void> _simulateOrConfirmOrder({required String paymentId}) async {
    try {
      final displayTagId = _currentTagId.isNotEmpty
          ? _currentTagId
          : widget.tagId;
      final displayReg = widget.vehicleReg.isNotEmpty
          ? widget.vehicleReg
          : Globals.vehicleRegistration;
      final order = await StoreService.createDirectETagOrder(
        tagId: displayTagId,
        vehicleReg: displayReg,
        amount: 199,
      );
      final orderId = order?['id'] != null
          ? '#${order!['id'].toString().substring(0, 8).toUpperCase()}'
          : '#FN${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';

      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => OrderConfirmationScreen(
              orderId: orderId,
              estimatedDelivery: 'Dispatched within 24-48 hours',
            ),
          ),
        );
      }
    } catch (e) {
      debugPrint('Direct order fallback error: $e');
    }
  }


  void _onEditDetails() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => SetContactPrivacyScreen(
          vehicleId: widget.vehicleId,
          vehicleName: widget.vehicleName,
          vehicleReg: widget.vehicleReg,
        ),
      ),
    );
  }

  void _onReissue() {
    final isLight = AppTheme.isLight;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A26),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF192535),
            width: 1.2,
          ),
        ),
        title: Text(
          'Reissue QR Tag',
          style: TextStyle(
            color: isLight ? const Color(0xFF0F172A) : Colors.white,
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Text(
          'Was your physical tag lost, scratched, or damaged? We can reissue a replacement tag for your vehicle.',
          style: TextStyle(
            color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
            fontSize: 13.5,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: isLight
                    ? const Color(0xFF64748B)
                    : const Color(0xFF8E9BAE),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _onOrderEtag();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: isLight
                  ? AppTheme.primaryBlue
                  : const Color(0xFF00C2FF),
              foregroundColor: isLight ? Colors.white : Colors.black,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text(
              'Request Tag',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  void _onReportIssue() {
    final issueController = TextEditingController();
    bool isSubmitting = false;
    String? validationError;
    final isLight = AppTheme.isLight;

    showDialog(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A26),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
                side: BorderSide(
                  color: isLight
                      ? const Color(0xFFE2E8F0)
                      : const Color(0xFF192535),
                  width: 1.2,
                ),
              ),
              title: Text(
                'Report an Issue',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                ),
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Experiencing problems with your tag? Describe your issue below:',
                      style: TextStyle(
                        color: isLight
                            ? const Color(0xFF64748B)
                            : const Color(0xFF8E9BAE),
                        fontSize: 13.5,
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: issueController,
                      maxLines: 4,
                      minLines: 3,
                      autofocus: true,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 13.5,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Type your issue details here (e.g. QR code not scanning, incorrect contact info, tag damaged)...',
                        hintStyle: TextStyle(
                          color: isLight
                              ? const Color(0xFF94A3B8)
                              : const Color(0xFF556577),
                          fontSize: 12.5,
                        ),
                        filled: true,
                        fillColor: isLight
                            ? const Color(0xFFF8FAFC)
                            : const Color(0xFF142030),
                        contentPadding: const EdgeInsets.all(12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: isLight
                                ? const Color(0xFFE2E8F0)
                                : const Color(0xFF22354D),
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: validationError != null
                                ? const Color(0xFFFF5252)
                                : (isLight
                                      ? const Color(0xFFE2E8F0)
                                      : const Color(0xFF22354D)),
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: isLight
                                ? AppTheme.primaryBlue
                                : const Color(0xFF00C2FF),
                            width: 1.5,
                          ),
                        ),
                      ),
                      onChanged: (val) {
                        if (validationError != null && val.trim().isNotEmpty) {
                          setDialogState(() {
                            validationError = null;
                          });
                        }
                      },
                    ),
                    if (validationError != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        validationError!,
                        style: const TextStyle(
                          color: Color(0xFFFF5252),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting
                      ? null
                      : () => Navigator.pop(dialogCtx),
                  child: Text(
                    'Cancel',
                    style: TextStyle(
                      color: isLight
                          ? const Color(0xFF64748B)
                          : const Color(0xFF8E9BAE),
                    ),
                  ),
                ),
                ElevatedButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          final issueText = issueController.text.trim();
                          if (issueText.isEmpty) {
                            setDialogState(() {
                              validationError = 'Please describe your issue before submitting.';
                            });
                            return;
                          }

                          setDialogState(() {
                            isSubmitting = true;
                            validationError = null;
                          });

                          // Submit ticket to backend support-tickets API
                          try {
                            final payload = {
                              'category': 'QR_TAG_ISSUE',
                              'subject':
                                  'QR Tag Issue - ${widget.vehicleReg} (${widget.tagId})',
                              'description': issueText,
                              'tagId': widget.tagId,
                              'vehicleReg': widget.vehicleReg,
                              'email': Globals.email,
                              'phone': Globals.phone,
                              'name':
                                  ('${Globals.firstName} ${Globals.lastName}')
                                      .trim()
                                      .isNotEmpty
                                  ? ('${Globals.firstName} ${Globals.lastName}')
                                        .trim()
                                  : (Globals.email.isNotEmpty
                                        ? Globals.email
                                        : 'App User'),
                              'priority': 'HIGH',
                            };

                            for (final base in ApiConfig.candidateBaseUrls) {
                              final cleanBase = base.endsWith('/')
                                  ? base.substring(0, base.length - 1)
                                  : base;
                              try {
                                final res = await http
                                    .post(
                                      Uri.parse('$cleanBase/support-tickets'),
                                      headers: {
                                        'Content-Type': 'application/json',
                                        if (Globals.accessToken.isNotEmpty)
                                          'Authorization':
                                              'Bearer ${Globals.accessToken}',
                                      },
                                      body: jsonEncode(payload),
                                    )
                                    .timeout(const Duration(seconds: 4));

                                if (res.statusCode == 200 ||
                                    res.statusCode == 201) {
                                  break;
                                }
                              } catch (_) {}
                            }
                          } catch (_) {}

                          if (!context.mounted) return;
                          Navigator.pop(dialogCtx);

                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              backgroundColor: Color(0xFF101C2B),
                              content: Text(
                                'Support ticket submitted. Our team will review and resolve it.',
                              ),
                            ),
                          );
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isLight
                        ? AppTheme.primaryBlue
                        : const Color(0xFF00C2FF),
                    foregroundColor: isLight ? Colors.white : Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: isSubmitting
                      ? const AppLoadingSpinner(size: 16)
                      : const Text(
                          'Submit Report',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Future<void> refreshOnRouteReturn() => _fetchTagDetails();

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(gradient: AppTheme.bgGradient),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            body: SafeArea(
              child: Column(
                children: [
                  // Top App Bar
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    child: Row(
                      children: [
                        AnimatedBackArrowButton(onTap: () {
                            if (Navigator.canPop(context)) {
                              Navigator.pop(context);
                            } else {
                              Navigator.pushReplacement(
                                context,
                                MaterialPageRoute(
                                  builder: (context) =>
                                      const SelectVehicleScreen(),
                                ),
                              );
                            }
                          }),
                        Expanded(
                          child: Center(
                            child: Text(
                              'My QR Tag',
                              style: TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 18.5,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.3,
                              ),
                            ),
                          ),
                        ),
                        IconButton(
                          icon: Icon(
                            Icons.swap_horiz_rounded,
                            color: AppTheme.textPrimary,
                            size: 24,
                          ),
                          tooltip: 'Switch Vehicle',
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    const SelectVehicleScreen(),
                              ),
                            ).then((_) => _fetchTagDetails());
                          },
                        ),
                      ],
                    ),
                  ),

                  Expanded(
                    child: RefreshIndicator(
                      color: AppTheme.primaryBlue,
                      backgroundColor: AppTheme.cardBg,
                      onRefresh: _fetchTagDetails,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Column(
                          children: [
                            const SizedBox(height: 6),

                            // Status Pill: ● QR Status Active
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: isLight
                                    ? const Color(0xFFE8F5E9)
                                    : const Color(0xFF0B2418),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: isLight
                                      ? const Color(0xFFA5D6A7)
                                      : const Color(0xFF13402A),
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.circle,
                                    color: isLight
                                        ? const Color(0xFF2E7D32)
                                        : const Color(0xFF00E676),
                                    size: 7,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'QR Status Active',
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF2E7D32)
                                          : const Color(0xFF00E676),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 12),

                            // Vehicle Info
                            Text(
                              '${widget.vehicleName} · ${widget.vehicleReg}',
                              style: TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Anyone can scan this to reach you in an\nemergency — no app required.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 13,
                                height: 1.35,
                              ),
                            ),

                            const SizedBox(height: 20),

                            // QR Card matching Screenshot 2
                            RepaintBoundary(
                              key: _qrCardKey,
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
                              decoration: BoxDecoration(
                                color: isLight ? Colors.white : const Color(0xFF0C131E),
                                borderRadius: BorderRadius.circular(26),
                                border: Border.all(
                                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF182436),
                                  width: 1.2,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: isLight ? 0.05 : 0.4),
                                    blurRadius: 18,
                                    offset: const Offset(0, 6),
                                  ),
                                ],
                              ),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'SMART SAFETY',
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      letterSpacing: 1.5,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  QrCodeWidget(
                                    size: 215,
                                    darkColor: Colors.black,
                                    lightColor: Colors.white,
                                    data: ApiConfig.getQrScanUrl(
                                      _currentTagId.isNotEmpty
                                          ? _currentTagId
                                          : widget.tagId,
                                    ),
                                    isEncrypted: !_isDigitalEtagUnlocked,
                                  ),
                                  const SizedBox(height: 18),

                                  // Tag ID inside the card matching Screenshot 2
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        'Tag ID: ',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF7A8B9E),
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 10,
                                          vertical: 5,
                                        ),
                                        decoration: BoxDecoration(
                                          color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF121C2B),
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(
                                            color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1F2E45),
                                            width: 1,
                                          ),
                                        ),
                                        child: Text(
                                          _currentTagId.isNotEmpty
                                              ? _currentTagId
                                              : widget.tagId,
                                          style: TextStyle(
                                            color: isLight ? const Color(0xFF0F172A) : const Color(0xFFD6E2F0),
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            ),

                            const SizedBox(height: 12),

                            // Anti-Screenshot & Duplication Protection Notice
                            Container(
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 9,
                              ),
                              decoration: BoxDecoration(
                                color: isLight
                                    ? AppTheme.primaryBlue.withValues(
                                        alpha: 0.08,
                                      )
                                    : const Color(0xFF00C2FF)
                                          .withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isLight
                                      ? AppTheme.primaryBlue.withValues(
                                          alpha: 0.22,
                                        )
                                      : const Color(0xFF00C2FF)
                                            .withValues(alpha: 0.25),
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.verified_user_rounded,
                                    size: 16,
                                    color: isLight
                                        ? AppTheme.primaryBlue
                                        : const Color(0xFF00C2FF),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _isDigitalEtagUnlocked ? 'Digital E-tag active! You can download your official QR code to your device.' : 'Protected against screenshot copying. Order Digital E-tag to unlock and download.',
                                      style: TextStyle(
                                        color: isLight
                                            ? const Color(0xFF334155)
                                            : const Color(0xFF94A3B8),
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w500,
                                        height: 1.3,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 22),

                            // Button 1: Order Digital E-tag / Download
                            SizedBox(
                              width: double.infinity,
                              height: 50,
                              child: ElevatedButton(
                                onPressed: _isOrdering || _isDownloading
                                    ? null
                                    : (_isDigitalEtagUnlocked
                                        ? _onDownloadQr
                                        : _onOrderDigitalEtag),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: _isDigitalEtagUnlocked
                                      ? const Color(0xFF10B981)
                                      : AppTheme.primaryBlue,
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(25),
                                  ),
                                ),
                                child: _isOrdering || _isDownloading
                                    ? const AppLoadingSpinner(size: 22)
                                    : Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            _isDigitalEtagUnlocked
                                                ? Icons.download_rounded
                                                : Icons.qr_code_2_rounded,
                                            color: Colors.white,
                                            size: 20,
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            _isDigitalEtagUnlocked
                                                ? 'Download'
                                                : 'Order Digital E-tag',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 15.5,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                              ),
                            ),

                            const SizedBox(height: 10),

                            // Button 2: Order E-tag
                            SizedBox(
                              width: double.infinity,
                              height: 50,
                              child: OutlinedButton(
                                onPressed: _isOrdering ? null : _onOrderEtag,
                                style: OutlinedButton.styleFrom(
                                  backgroundColor: AppTheme.cardBg,
                                  foregroundColor: isLight
                                      ? AppTheme.primaryBlue
                                      : const Color(0xFF00C2FF),
                                  side: BorderSide(
                                    color: isLight
                                        ? AppTheme.primaryBlue.withValues(
                                            alpha: 0.6,
                                          )
                                        : const Color(0xFF00C2FF)
                                              .withValues(alpha: 0.6),
                                    width: 1.5,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(25),
                                  ),
                                ),
                                child: _isOrdering
                                    ? const AppLoadingSpinner(size: 22)
                                    : Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            Icons.shopping_bag_outlined,
                                            color: isLight
                                                ? AppTheme.primaryBlue
                                                : const Color(0xFF00C2FF),
                                            size: 20,
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Order E-tag',
                                            style: TextStyle(
                                              color: isLight
                                                  ? AppTheme.primaryBlue
                                                  : const Color(0xFF00C2FF),
                                              fontSize: 15.5,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                              ),
                            ),

                            const SizedBox(height: 20),

                            // Section 1: Edit Details Card
                            InkWell(
                              onTap: _onEditDetails,
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: AppTheme.cardBg,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: AppTheme.cardBorder,
                                    width: 1,
                                  ),
                                  boxShadow: AppTheme.cardShadow,
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: isLight
                                            ? const Color(0xFFEFF6FF)
                                            : const Color(0xFF0F2236),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                          color: isLight
                                              ? const Color(0xFFDBEAFE)
                                              : const Color(0xFF16324D),
                                          width: 1,
                                        ),
                                      ),
                                      child: Center(
                                        child: Icon(
                                          Icons.edit_outlined,
                                          color: AppTheme.primaryBlue,
                                          size: 20,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Edit Details',
                                            style: TextStyle(
                                              color: AppTheme.textPrimary,
                                              fontSize: 15,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Update Owner info, contact & blood group',
                                            style: TextStyle(
                                              color: AppTheme.textSecondary,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Icon(
                                      Icons.arrow_forward_ios_rounded,
                                      color: AppTheme.textSecondary,
                                      size: 16,
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            const SizedBox(height: 16),

                            // Section 2: Manage Public Information Card
                            Container(
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                color: AppTheme.cardBg,
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(
                                  color: AppTheme.cardBorder,
                                  width: 1,
                                ),
                                boxShadow: AppTheme.cardShadow,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Manage Public Information',
                                    style: TextStyle(
                                      color: AppTheme.textPrimary,
                                      fontSize: 15.5,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Choose what people can access when they scan your tag.',
                                    style: TextStyle(
                                      color: AppTheme.textSecondary,
                                      fontSize: 12.5,
                                    ),
                                  ),
                                  const SizedBox(height: 14),

                                  // Switch 1: Call owner
                                  _buildSwitchRow(
                                    label: 'Call owner',
                                    value: _callOwner,
                                    onChanged: (val) =>
                                        _updatePrivacy('callOwner', val),
                                    isLight: isLight,
                                  ),
                                  const SizedBox(height: 8),

                                  // Switch 2: Send message
                                  _buildSwitchRow(
                                    label: 'Send message',
                                    value: _sendMessage,
                                    onChanged: (val) =>
                                        _updatePrivacy('sendMessage', val),
                                    isLight: isLight,
                                  ),
                                  const SizedBox(height: 8),

                                  // Switch 3: Blood group visibility
                                  _buildSwitchRow(
                                    label: 'Blood group visibility',
                                    value: _bloodGroupVisibility,
                                    onChanged: (val) => _updatePrivacy(
                                      'bloodGroupVisibility',
                                      val,
                                    ),
                                    isLight: isLight,
                                  ),
                                  const SizedBox(height: 8),

                                  // Switch 4: Emergency contact
                                  _buildSwitchRow(
                                    label: 'Emergency contact',
                                    value: _emergencyContact,
                                    onChanged: (val) =>
                                        _updatePrivacy('emergencyContact', val),
                                    isLight: isLight,
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 14),

                            // Section 3: Bottom Action Tiles
                            // Tile 1: Reissue / Active New QR
                            InkWell(
                              onTap: _onReissue,
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: AppTheme.cardBg,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: AppTheme.cardBorder,
                                    width: 1,
                                  ),
                                  boxShadow: AppTheme.cardShadow,
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: isLight
                                            ? const Color(0xFFEFF6FF)
                                            : const Color(0xFF0F2236),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                          color: isLight
                                              ? const Color(0xFFDBEAFE)
                                              : const Color(0xFF16324D),
                                          width: 1,
                                        ),
                                      ),
                                      child: Center(
                                        child: AppIcons.svg(
                                          AppIcons.refresh,
                                          color: isLight
                                              ? AppTheme.primaryBlue
                                              : const Color(0xFF00C2FF),
                                          width: 20,
                                          height: 20,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Reissue / Active New QR',
                                            style: TextStyle(
                                              color: AppTheme.textPrimary,
                                              fontSize: 14.5,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Lost Sticker or damaged?',
                                            style: TextStyle(
                                              color: AppTheme.textSecondary,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Icon(
                                      Icons.arrow_forward_ios_rounded,
                                      color: AppTheme.textSecondary,
                                      size: 16,
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            const SizedBox(height: 10),

                            // Tile 2: Report an issue
                            InkWell(
                              onTap: _onReportIssue,
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: AppTheme.cardBg,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: AppTheme.cardBorder,
                                    width: 1,
                                  ),
                                  boxShadow: AppTheme.cardShadow,
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: isLight
                                            ? const Color(0xFFFFF7ED)
                                            : const Color(0xFF291E0A),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                          color: isLight
                                              ? const Color(0xFFFFEDD5)
                                              : const Color(0xFF422E10),
                                          width: 1,
                                        ),
                                      ),
                                      child: const Center(
                                        child: Icon(
                                          Icons.flag_rounded,
                                          color: Color(0xFFFFA726),
                                          size: 20,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Report an issue',
                                            style: TextStyle(
                                              color: AppTheme.textPrimary,
                                              fontSize: 14.5,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Scan not working, wrong info',
                                            style: TextStyle(
                                              color: AppTheme.textSecondary,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Icon(
                                      Icons.arrow_forward_ios_rounded,
                                      color: AppTheme.textSecondary,
                                      size: 16,
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            const SizedBox(height: 32),
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

  Widget _buildSwitchRow({
    required String label,
    required bool value,
    required ValueChanged<bool> onChanged,
    required bool isLight,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 13.5,
              fontWeight: FontWeight.w500,
            ),
          ),
          Transform.scale(
            scale: 0.82,
            child: Switch(
              value: value,
              onChanged: onChanged,
              activeThumbColor: Colors.white,
              activeTrackColor: AppTheme.primaryBlue,
              inactiveTrackColor: isLight
                  ? const Color(0xFFE2E8F0)
                  : const Color(0xFF1E2D3E),
              inactiveThumbColor: isLight
                  ? const Color(0xFF94A3B8)
                  : const Color(0xFF6B7C91),
            ),
          ),
        ],
      ),
    );
  }
}
