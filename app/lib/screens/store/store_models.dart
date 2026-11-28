import 'package:flutter/foundation.dart';
export 'wishlist_manager.dart';

class StoreProduct {
  final String id;
  final String title;
  final String subtitle;
  final int price;
  final int originalPrice;
  final int discountPercent;
  final double rating;
  final String ratingCount;
  final String category; // 'Dashcam', 'GPS Tracker', 'OBD', 'Smart QR Tag', 'Accessories'
  final String deliveryDate;
  final String image;
  final List<String> galleryImages;
  final bool inStock;
  final bool onSale;
  final String fullDescription;
  bool isFavorite;

  StoreProduct({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.price,
    required this.originalPrice,
    required this.discountPercent,
    required this.rating,
    required this.ratingCount,
    required this.category,
    required this.deliveryDate,
    required this.image,
    List<String>? galleryImages,
    this.inStock = true,
    this.onSale = true,
    this.fullDescription = '',
    this.isFavorite = false,
  }) : galleryImages = galleryImages ?? [image];

  factory StoreProduct.fromJson(Map<String, dynamic> json) {
    return StoreProduct(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      subtitle: json['subtitle'] ?? '',
      price: json['price'] ?? 0,
      originalPrice: json['originalPrice'] ?? 0,
      discountPercent: json['discountPercent'] ?? 0,
      rating: (json['rating'] is num) ? (json['rating'] as num).toDouble() : 0.0,
      ratingCount: json['ratingCount']?.toString() ?? '0',
      category: json['category'] ?? '',
      deliveryDate: json['deliveryDate'] ?? 'Unknown',
      image: json['image'] ?? '',
      galleryImages: json['galleryImages'] != null
          ? List<String>.from(json['galleryImages'])
          : null,
      inStock: json['inStock'] ?? true,
      onSale: json['onSale'] ?? true,
      fullDescription: json['fullDescription'] ?? '',
      isFavorite: json['isFavorite'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'subtitle': subtitle,
      'price': price,
      'originalPrice': originalPrice,
      'discountPercent': discountPercent,
      'rating': rating,
      'ratingCount': ratingCount,
      'category': category,
      'deliveryDate': deliveryDate,
      'image': image,
      'galleryImages': galleryImages,
      'inStock': inStock,
      'onSale': onSale,
      'fullDescription': fullDescription,
      'isFavorite': isFavorite,
    };
  }
}

class CartItem {
  final StoreProduct product;
  int quantity;

  CartItem({
    required this.product,
    this.quantity = 1,
  });
}

class CartManager extends ChangeNotifier {
  static final CartManager instance = CartManager._internal();

  CartManager._internal() {
    _initDefaultCart();
  }

  final List<CartItem> _items = [];
  bool _includeInstallation = false;
  String? _appliedCoupon;
  Map<String, dynamic>? _appliedCouponData;

  List<CartItem> get items => List.unmodifiable(_items);
  bool get includeInstallation => _includeInstallation;
  String? get appliedCoupon => _appliedCoupon;
  Map<String, dynamic>? get appliedCouponData => _appliedCouponData;

  int get itemCount => _items.fold(0, (sum, item) => sum + item.quantity);

  void _initDefaultCart() {
    // Empty default cart
  }

  int get itemTotal => _items.fold(
        0,
        (sum, item) => sum + (item.product.originalPrice * item.quantity),
      );

  int get discount => _items.fold(
        0,
        (sum, item) =>
            sum +
            ((item.product.originalPrice - item.product.price) * item.quantity),
      );

  int get deliveryFee => 0; // FREE

  int get installationFee => _includeInstallation ? 499 : 0;

  int get couponDiscount {
    if (_appliedCoupon == null) return 0;
    final subtotal = itemTotal - discount;
    if (subtotal <= 0) return 0;

    if (_appliedCouponData != null) {
      final minOrder = (_appliedCouponData!['minOrder'] as num?)?.toInt() ?? 0;
      if (minOrder > 0 && subtotal < minOrder) return 0;

      final discountType = (_appliedCouponData!['discountType'] ?? '').toString().toUpperCase();
      final discountValue = (_appliedCouponData!['discountValue'] as num?)?.toInt() ?? 0;
      final maxDiscount = (_appliedCouponData!['maxDiscount'] as num?)?.toInt() ?? 500;

      if (discountType == 'FLAT') {
        return discountValue > subtotal ? subtotal : discountValue;
      } else {
        final calc = ((subtotal * discountValue) / 100).round();
        final capped = maxDiscount > 0 ? (calc > maxDiscount ? maxDiscount : calc) : calc;
        return capped > subtotal ? subtotal : capped;
      }
    }

    return 0;
  }

  int get totalPayable {
    final amount = itemTotal - discount - couponDiscount + deliveryFee + installationFee;
    return amount > 0 ? amount : 0;
  }

  int get totalSavings => discount + couponDiscount;

  void toggleInstallation(bool value) {
    _includeInstallation = value;
    notifyListeners();
  }

  void addItem(StoreProduct product, {int quantity = 1}) {
    final existingIndex = _items.indexWhere((i) => i.product.id == product.id);
    if (existingIndex >= 0) {
      _items[existingIndex].quantity += quantity;
    } else {
      _items.add(CartItem(product: product, quantity: quantity));
    }
    notifyListeners();
  }

  void updateQuantity(String productId, int delta) {
    final index = _items.indexWhere((i) => i.product.id == productId);
    if (index >= 0) {
      _items[index].quantity += delta;
      if (_items[index].quantity <= 0) {
        _items.removeAt(index);
      }
      notifyListeners();
    }
  }

  void removeItem(String productId) {
    _items.removeWhere((i) => i.product.id == productId);
    notifyListeners();
  }

  void clearCart() {
    _items.clear();
    _appliedCoupon = null;
    _appliedCouponData = null;
    notifyListeners();
  }

  void applyCoupon(String coupon, [Map<String, dynamic>? couponData]) {
    _appliedCoupon = coupon.trim().toUpperCase();
    _appliedCouponData = couponData;
    notifyListeners();
  }

  void removeCoupon() {
    _appliedCoupon = null;
    _appliedCouponData = null;
    notifyListeners();
  }
}

// Dummy data removed. Data is now fetched from the database.
