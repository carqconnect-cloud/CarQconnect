import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../globals.dart';
import 'store_models.dart';

class WishlistManager extends ChangeNotifier {
  static final WishlistManager instance = WishlistManager._internal();

  WishlistManager._internal() {
    loadWishlist();
  }

  final Map<String, StoreProduct> _wishlistItems = {};
  bool _isLoaded = false;

  List<StoreProduct> get items => _wishlistItems.values.toList();
  int get itemCount => _wishlistItems.length;
  bool get isEmpty => _wishlistItems.isEmpty;
  bool get isLoaded => _isLoaded;

  String _getStorageKey() {
    final email = Globals.email.trim();
    if (email.isNotEmpty) {
      return 'carq_wishlist_$email';
    }
    return 'carq_wishlist_default';
  }

  Future<void> loadWishlist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = _getStorageKey();
      final dataStr = prefs.getString(key);
      if (dataStr != null && dataStr.isNotEmpty) {
        final List<dynamic> decoded = json.decode(dataStr);
        _wishlistItems.clear();
        for (final item in decoded) {
          if (item is Map<String, dynamic>) {
            final prod = StoreProduct.fromJson(item);
            prod.isFavorite = true;
            _wishlistItems[prod.id] = prod;
          }
        }
      } else {
        _wishlistItems.clear();
      }
      _isLoaded = true;
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading wishlist: $e');
      _isLoaded = true;
      notifyListeners();
    }
  }

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = _getStorageKey();
      final list = _wishlistItems.values.map((p) => p.toJson()).toList();
      await prefs.setString(key, json.encode(list));
    } catch (e) {
      debugPrint('Error saving wishlist: $e');
    }
  }

  bool isWishlisted(String productId) {
    return _wishlistItems.containsKey(productId);
  }

  void toggleWishlist(StoreProduct product) {
    if (_wishlistItems.containsKey(product.id)) {
      _wishlistItems.remove(product.id);
      product.isFavorite = false;
    } else {
      product.isFavorite = true;
      _wishlistItems[product.id] = product;
    }
    _persist();
    notifyListeners();
  }

  void addToWishlist(StoreProduct product) {
    if (!_wishlistItems.containsKey(product.id)) {
      product.isFavorite = true;
      _wishlistItems[product.id] = product;
      _persist();
      notifyListeners();
    }
  }

  void removeFromWishlist(String productId) {
    if (_wishlistItems.containsKey(productId)) {
      final prod = _wishlistItems.remove(productId);
      if (prod != null) prod.isFavorite = false;
      _persist();
      notifyListeners();
    }
  }

  void clearWishlist() {
    for (final prod in _wishlistItems.values) {
      prod.isFavorite = false;
    }
    _wishlistItems.clear();
    _persist();
    notifyListeners();
  }

  void updateCatalog(List<StoreProduct> products) {
    bool changed = false;
    for (final p in products) {
      if (_wishlistItems.containsKey(p.id)) {
        p.isFavorite = true;
        _wishlistItems[p.id] = p; // Keep product details updated
        changed = true;
      } else {
        p.isFavorite = false;
      }
    }
    if (changed) {
      _persist();
      notifyListeners();
    }
  }
}
