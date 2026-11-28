import 'dart:convert';
import 'package:http/http.dart' as http;
import 'store_models.dart';
import 'package:flutter/foundation.dart';
import '../../globals.dart';
import '../../utils/api_config.dart';

class StoreService {
  static String get baseUrl => '${ApiConfig.baseUrl}/store';

  static String? _getToken() {
    return Globals.accessToken.isNotEmpty ? Globals.accessToken : null;
  }

  static Future<List<StoreProduct>> getProducts() async {
    try {
      final token = _getToken();
      final response = await http.get(
        Uri.parse('$baseUrl/products'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          return (data['data'] as List)
              .map((item) => StoreProduct.fromJson(item))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching products: $e');
      return [];
    }
  }

  static Future<List<Map<String, dynamic>>> getCoupons() async {
    final token = _getToken();
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    final candidateUrls = <String>[
      '$baseUrl/coupons',
      '${ApiConfig.baseUrl}/coupons',
    ];

    for (final base in ApiConfig.candidateBaseUrls) {
      final storeCpn = '$base/store/coupons';
      final pubCpn = '$base/coupons';
      if (!candidateUrls.contains(storeCpn)) candidateUrls.add(storeCpn);
      if (!candidateUrls.contains(pubCpn)) candidateUrls.add(pubCpn);
    }

    for (final url in candidateUrls) {
      try {
        final response = await http
            .get(Uri.parse(url), headers: headers)
            .timeout(const Duration(seconds: 4));
        if (response.statusCode == 200) {
          final data = json.decode(response.body);
          final rawList = data['data'] ?? data['items'];
          if (data['success'] == true && rawList is List) {
            final list = List<Map<String, dynamic>>.from(
              rawList.map((x) => Map<String, dynamic>.from(x)),
            );
            if (list.isNotEmpty) return list;
          }
        }
      } catch (_) {}
    }

    return [];
  }

  static Future<Map<String, dynamic>?> validateCoupon(String code, int subtotal) async {
    final upper = code.trim().toUpperCase();
    try {
      final token = _getToken();
      final response = await http.post(
        Uri.parse('$baseUrl/coupons/validate'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'code': upper,
          'subtotal': subtotal,
        }),
      ).timeout(const Duration(seconds: 8));

      final data = json.decode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return Map<String, dynamic>.from(data['data']);
      } else {
        return {'valid': false, 'message': data['message'] ?? 'Invalid coupon code'};
      }
    } catch (e) {
      debugPrint('Error validating coupon with backend: $e');
      return {'valid': false, 'message': 'Unable to verify coupon right now.'};
    }
  }

  static Future<Map<String, dynamic>?> createRazorpayOrder(int amount) async {
    try {
      final token = _getToken();
      if (token == null) return null;

      final response = await http.post(
        Uri.parse('$baseUrl/orders/create-payment-intent'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'amount': amount}),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['data']; // Returns the Razorpay order object
      }
      return null;
    } catch (e) {
      debugPrint('Error creating razorpay order: $e');
      return null;
    }
  }

  static Future<bool> verifyPayment({
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
    required List<CartItem> items,
    required int totalAmount,
    required String addressId,
  }) async {
    try {
      final token = _getToken();
      if (token == null) return false;

      final response = await http.post(
        Uri.parse('$baseUrl/orders/verify-payment'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'razorpay_order_id': razorpayOrderId,
          'razorpay_payment_id': razorpayPaymentId,
          'razorpay_signature': razorpaySignature,
          'addressId': addressId,
          'totalAmount': totalAmount,
          'items': items.map((i) => {
            'productId': i.product.id,
            'quantity': i.quantity,
            'price': i.product.price,
          }).toList(),
        }),
      ).timeout(const Duration(seconds: 10));

      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error verifying payment: $e');
      return false;
    }
  }

  // Original fallback createOrder
  static Future<bool> createOrder(List<CartItem> items, int totalAmount, String addressId) async {
    try {
      final token = _getToken();
      if (token == null) {
        return false;
      }

      final response = await http.post(
        Uri.parse('$baseUrl/orders'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'addressId': addressId,
          'totalAmount': totalAmount,
          'items': items.map((i) => {
            'productId': i.product.id,
            'quantity': i.quantity,
            'price': i.product.price,
          }).toList(),
          'paymentId': 'COD',
          'paymentOrderId': 'CASH_ON_DELIVERY',
        }),
      ).timeout(const Duration(seconds: 10));

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('Error creating order: $e');
      return false;
    }
  }

  static Future<Map<String, dynamic>?> orderETag({
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
    required String tagId,
    required String vehicleReg,
    int amount = 199,
  }) async {
    try {
      final token = _getToken();
      final body = json.encode({
        'razorpay_order_id': razorpayOrderId,
        'razorpay_payment_id': razorpayPaymentId,
        'razorpay_signature': razorpaySignature,
        'addressId': 'default',
        'totalAmount': amount,
        'tagId': tagId,
        'vehicleReg': vehicleReg,
        'items': [
          {
            'productId': 'etag-$tagId',
            'quantity': 1,
            'price': amount,
          }
        ],
      });

      final response = await http.post(
        Uri.parse('$baseUrl/orders/verify-payment'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: body,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        return data['data'] as Map<String, dynamic>?;
      }
      return null;
    } catch (e) {
      debugPrint('Error placing E-Tag order: $e');
      return null;
    }
  }

  static Future<Map<String, dynamic>?> createDirectETagOrder({
    required String tagId,
    required String vehicleReg,
    int amount = 199,
  }) async {
    try {
      final token = _getToken();
      final body = json.encode({
        'addressId': 'default',
        'totalAmount': amount,
        'tagId': tagId,
        'vehicleReg': vehicleReg,
        'paymentId': 'PAY_ONLINE_CONFIRMED',
        'paymentOrderId': 'ORD_${DateTime.now().millisecondsSinceEpoch}',
        'items': [
          {
            'productId': 'etag-$tagId',
            'quantity': 1,
            'price': amount,
          }
        ],
      });

      final response = await http.post(
        Uri.parse('$baseUrl/orders'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: body,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        return data['data'] as Map<String, dynamic>?;
      }
      return null;
    } catch (e) {
      debugPrint('Error creating direct E-Tag order: $e');
      return null;
    }
  }

  static Future<List<dynamic>> getOrders() async {
    try {
      final token = _getToken();
      if (token == null) return [];

      final response = await http.get(
        Uri.parse('$baseUrl/orders'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          return data['data'] as List;
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching orders: $e');
      return [];
    }
  }
}
