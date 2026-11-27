import 'package:flutter/material.dart';

import 'dart:async';

import 'store_models.dart';
import 'store_service.dart';
import 'product_detail.dart';
import 'cart.dart';
import 'wishlist_screen.dart';
import '../subscription/subscription.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../services/screen_refresh_service.dart';
import '../../widgets/animated_back_arrow.dart';
import '../../widgets/app_toggle_switch.dart';

export 'store_models.dart';
export 'product_detail.dart';
export 'cart.dart';
export 'order_confirmation.dart';
export 'wishlist_screen.dart';

class StoreScreen extends StatefulWidget {
  final VoidCallback? onBackToHome;

  const StoreScreen({super.key, this.onBackToHome});

  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends State<StoreScreen>
    with RefreshOnRouteReturn<StoreScreen> {
  final TextEditingController _searchController = TextEditingController();
  final CartManager _cartManager = CartManager.instance;
  final WishlistManager _wishlistManager = WishlistManager.instance;

  String _selectedCategory = 'All';
  String _selectedSort = 'Popularity';

  // Active filter states (clean defaults: no filter applied initially)
  Set<String> _filterCategories = {};
  RangeValues _priceRange = const RangeValues(0, 50000);
  bool _inStockOnly = false;
  bool _onSaleOnly = false;
  int _activeFilterCount = 0;

  List<StoreProduct> _allProducts = [];
  bool _isLoading = true;
  Timer? _autoRefreshTimer;

  final List<String> _categories = [
    'All',
    'GPS Tracker',
    'Dashcam',
    'OBD',
    'Smart QR Tag',
    'Accessories',
  ];

  @override
  void initState() {
    super.initState();
    _cartManager.addListener(_onCartChanged);
    _wishlistManager.addListener(_onWishlistChanged);
    _loadProducts(showSpinner: true);
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) _loadProducts(showSpinner: false);
    });
  }

  Future<void> _loadProducts({bool showSpinner = false}) async {
    if (showSpinner) {
      setState(() => _isLoading = true);
    }
    try {
      final products = await StoreService.getProducts();
      if (mounted) {
        _wishlistManager.updateCatalog(products);
        setState(() {
          _allProducts = products;
          if (showSpinner) _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted && showSpinner) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    _searchController.dispose();
    _cartManager.removeListener(_onCartChanged);
    _wishlistManager.removeListener(_onWishlistChanged);
    super.dispose();
  }

  void _onCartChanged() {
    if (mounted) setState(() {});
  }

  void _onWishlistChanged() {
    if (mounted) setState(() {});
  }

  void _handleBack() {
    if (Navigator.canPop(context)) {
      Navigator.pop(context);
    } else if (widget.onBackToHome != null) {
      widget.onBackToHome!();
    }
  }

  List<StoreProduct> get _filteredProducts {
    List<StoreProduct> list = List.from(_allProducts);

    // 1. Search Query filter
    final query = _searchController.text.trim().toLowerCase();
    if (query.isNotEmpty) {
      list = list.where((p) {
        return p.title.toLowerCase().contains(query) ||
            p.subtitle.toLowerCase().contains(query) ||
            p.category.toLowerCase().contains(query);
      }).toList();
    }

    // 2. Tab Category filter
    if (_selectedCategory != 'All') {
      list = list.where((p) => p.category == _selectedCategory).toList();
    }

    // 3. Bottom Sheet Filter categories
    if (_filterCategories.isNotEmpty) {
      final mappedCategories = _filterCategories.map((c) {
        if (c == 'Dashcams') return 'Dashcam';
        if (c == 'GPS Trackers') return 'GPS Tracker';
        if (c == 'OBD Scanners') return 'OBD';
        if (c == 'Smart QR Tags') return 'Smart QR Tag';
        if (c == 'Car Accessories & Harnesses') return 'Accessories';
        return c;
      }).toSet();

      // If active filter categories exist and user is viewing All, filter by them
      if (_selectedCategory == 'All') {
        list = list
            .where((p) => mappedCategories.contains(p.category))
            .toList();
      }
    }

    // 4. Price filter (only filter if user set custom range)
    if (_priceRange.start > 0 || _priceRange.end < 50000) {
      list = list.where((p) {
        return p.price >= _priceRange.start && p.price <= _priceRange.end;
      }).toList();
    }

    // 5. Stock & Sale
    if (_inStockOnly) {
      list = list.where((p) => p.inStock).toList();
    }
    if (_onSaleOnly) {
      list = list.where((p) => p.onSale).toList();
    }

    // 6. Sorting
    if (_selectedSort == 'Price: Low to High') {
      list.sort((a, b) => a.price.compareTo(b.price));
    } else if (_selectedSort == 'Price: High to Low') {
      list.sort((a, b) => b.price.compareTo(a.price));
    } else if (_selectedSort == 'Customer Rating') {
      list.sort((a, b) => b.rating.compareTo(a.rating));
    } else if (_selectedSort == 'Newest Arrivals') {
      list = list.reversed.toList();
    } else if (_selectedSort == 'Biggest Discount') {
      list.sort((a, b) => b.discountPercent.compareTo(a.discountPercent));
    }

    return list;
  }

  void _openFiltersSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      enableDrag: true,
      isDismissible: true,
      builder: (ctx) {
        return FiltersBottomSheet(
          initialCategories: _filterCategories,
          initialPriceRange: _priceRange,
          initialInStock: _inStockOnly,
          initialOnSale: _onSaleOnly,
          onApply: (categories, priceRange, inStock, onSale, count) {
            setState(() {
              _filterCategories = categories;
              _priceRange = priceRange;
              _inStockOnly = inStock;
              _onSaleOnly = onSale;
              _activeFilterCount = count;
            });
          },
        );
      },
    );
  }

  void _showSortSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      enableDrag: true,
      isDismissible: true,
      builder: (ctx) {
        return SortOptionsBottomSheet(
          selectedSort: _selectedSort,
          onSelect: (option) {
            setState(() => _selectedSort = option);
          },
        );
      },
    );
  }

  @override
  Future<void> refreshOnRouteReturn() => _loadProducts(showSpinner: false);

  @override
  Widget build(BuildContext context) {
    final products = _filteredProducts;

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
                  // 1. Top App Bar: Back, Store Title, Cart Icon
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: Row(
                      children: [
                        AnimatedBackArrowButton(onTap: _handleBack),
                        Expanded(
                          child: Center(
                            child: Text(
                              'Store',
                              style: TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 19,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.2,
                              ),
                            ),
                          ),
                        ),
                        // Wishlist Icon with Badge
                        Stack(
                          alignment: Alignment.topRight,
                          children: [
                            IconButton(
                              tooltip: 'Wishlist',
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) =>
                                        const WishlistScreen(),
                                  ),
                                );
                              },
                              icon: Icon(
                                Icons.favorite_border_rounded,
                                color: AppTheme.textPrimary,
                                size: 24,
                              ),
                            ),
                            if (_wishlistManager.itemCount > 0)
                              Positioned(
                                right: 6,
                                top: 6,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFEF4444),
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 16,
                                    minHeight: 16,
                                  ),
                                  child: Text(
                                    '${_wishlistManager.itemCount}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        // Cart Icon with Badge
                        Stack(
                          alignment: Alignment.topRight,
                          children: [
                            IconButton(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => const CartScreen(),
                                  ),
                                );
                              },
                              icon: Icon(
                                Icons.shopping_cart_outlined,
                                color: AppTheme.textPrimary,
                                size: 24,
                              ),
                            ),
                            if (_cartManager.itemCount > 0)
                              Positioned(
                                right: 6,
                                top: 6,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF04C9FB),
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 16,
                                    minHeight: 16,
                                  ),
                                  child: Text(
                                    '${_cartManager.itemCount}',
                                    style: const TextStyle(
                                      color: Color(0xFF070B18),
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // 2. Search Bar: "Search your vehicle"
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Container(
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppTheme.cardBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.cardBorder),
                        boxShadow: AppTheme.cardShadow,
                      ),
                      child: TextField(
                        controller: _searchController,
                        onChanged: (_) => setState(() {}),
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 14,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Search your vehicle',
                          hintStyle: TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 14,
                          ),
                          prefixIcon: Icon(
                            Icons.search_rounded,
                            color: AppTheme.textSecondary,
                            size: 20,
                          ),
                          suffixIcon: _searchController.text.isNotEmpty
                              ? IconButton(
                                  icon: Icon(
                                    Icons.close_rounded,
                                    color: AppTheme.textSecondary,
                                    size: 18,
                                  ),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() {});
                                  },
                                )
                              : null,
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            vertical: 14,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // 3. Horizontal Category Pills (All, GPS Tracker, Dashcam, OBD...)
                  SizedBox(
                    height: 38,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _categories.length,
                      itemBuilder: (context, index) {
                        final cat = _categories[index];
                        final isSelected = _selectedCategory == cat;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: GestureDetector(
                            onTap: () =>
                                setState(() => _selectedCategory = cat),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 18,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppTheme.primaryColor
                                    : AppTheme.cardBg,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isSelected
                                      ? AppTheme.primaryColor
                                      : AppTheme.cardBorder,
                                ),
                                boxShadow: isSelected
                                    ? null
                                    : AppTheme.cardShadow,
                              ),
                              child: Center(
                                child: Text(
                                  cat,
                                  style: TextStyle(
                                    color: isSelected
                                        ? Colors.white
                                        : AppTheme.textSecondary,
                                    fontSize: 13,
                                    fontWeight: isSelected
                                        ? FontWeight.bold
                                        : FontWeight.w500,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 14),

                  // 4. Filters & Sort Row
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Filters Button
                        InkWell(
                          onTap: _openFiltersSheet,
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 7,
                            ),
                            decoration: BoxDecoration(
                              color: _activeFilterCount > 0
                                  ? AppTheme.primaryColor.withValues(
                                      alpha: isLight ? 0.12 : 0.2,
                                    )
                                  : AppTheme.cardBg,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: _activeFilterCount > 0
                                    ? AppTheme.primaryColor
                                    : AppTheme.cardBorder,
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.tune_rounded,
                                  color: _activeFilterCount > 0
                                      ? AppTheme.primaryColor
                                      : AppTheme.textPrimary,
                                  size: 16,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Filters',
                                  style: TextStyle(
                                    color: _activeFilterCount > 0
                                        ? AppTheme.primaryColor
                                        : AppTheme.textPrimary,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                if (_activeFilterCount > 0) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 1.5,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryColor,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      '$_activeFilterCount',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),

                        // Sort By
                        GestureDetector(
                          onTap: _showSortSheet,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 7,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.cardBg,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppTheme.cardBorder),
                            ),
                            child: Row(
                              children: [
                                Text(
                                  'Sort: ',
                                  style: TextStyle(
                                    color: AppTheme.textSecondary,
                                    fontSize: 13,
                                  ),
                                ),
                                Text(
                                  _selectedSort,
                                  style: TextStyle(
                                    color: AppTheme.textPrimary,
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Icon(
                                  Icons.keyboard_arrow_down_rounded,
                                  color: AppTheme.textSecondary,
                                  size: 18,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // 5. Product Grid (2 Columns)
                  Expanded(
                    child: RefreshIndicator(
                      color: AppTheme.primaryColor,
                      backgroundColor: AppTheme.cardBg,
                      onRefresh: () => _loadProducts(showSpinner: false),
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(
                          parent: BouncingScrollPhysics(),
                        ),
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 110),
                        child: Column(
                          children: [
                            if (_isLoading)
                              Padding(
                                padding: const EdgeInsets.all(32.0),
                                child: AppLoadingSpinner(
                                  size: 70,
                                  primaryColor: AppTheme.primaryColor,
                                ),
                              )
                            else if (products.isEmpty)
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 48.0,
                                  horizontal: 24.0,
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.filter_alt_off_rounded,
                                      size: 56,
                                      color: AppTheme.textSecondary,
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      'No products match your filters',
                                      style: TextStyle(
                                        color: AppTheme.textPrimary,
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Try adjusting or clearing your filters to see more products.',
                                      style: TextStyle(
                                        color: AppTheme.textSecondary,
                                        fontSize: 13,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                    if (_activeFilterCount > 0 ||
                                        _selectedCategory != 'All') ...[
                                      const SizedBox(height: 18),
                                      ElevatedButton.icon(
                                        onPressed: () {
                                          setState(() {
                                            _selectedCategory = 'All';
                                            _filterCategories.clear();
                                            _priceRange = const RangeValues(
                                              0,
                                              50000,
                                            );
                                            _inStockOnly = false;
                                            _onSaleOnly = false;
                                            _activeFilterCount = 0;
                                          });
                                        },
                                        icon: const Icon(
                                          Icons.refresh_rounded,
                                          size: 18,
                                        ),
                                        label: const Text('Reset All Filters'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor:
                                              AppTheme.primaryColor,
                                          foregroundColor: Colors.white,
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 20,
                                            vertical: 10,
                                          ),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              20,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              )
                            else
                              GridView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                gridDelegate:
                                    const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 2,
                                      crossAxisSpacing: 12,
                                      mainAxisSpacing: 12,
                                      childAspectRatio: 0.62,
                                    ),
                                itemCount: products.length,
                                itemBuilder: (context, index) {
                                  return _buildProductCard(products[index]);
                                },
                              ),
                            const SizedBox(height: 16),

                            // Bottom Promo Banner (Upgrade Now)
                            _buildUpgradeBanner(),
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

  Widget _buildProductCard(StoreProduct product) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ProductDetailScreen(product: product),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppTheme.cardBorder, width: 1.0),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Box + Heart Icon
            Stack(
              children: [
                Container(
                  height: 110,
                  width: double.infinity,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.isLight
                        ? const Color(0xFFF1F5F9)
                        : const Color(0xFF0A1222),
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(18),
                    ),
                  ),
                  child: Center(
                    child:
                        (product.image.startsWith('http://') ||
                            product.image.startsWith('https://'))
                        ? Image.network(
                            product.image,
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) => Icon(
                              Icons.devices_other_rounded,
                              color: AppTheme.primaryColor,
                              size: 40,
                            ),
                          )
                        : Image.asset(
                            product.image,
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) => Icon(
                              Icons.devices_other_rounded,
                              color: AppTheme.primaryColor,
                              size: 40,
                            ),
                          ),
                  ),
                ),
                Positioned(
                  top: 6,
                  right: 6,
                  child: GestureDetector(
                    onTap: () {
                      final wasWishlisted = _wishlistManager.isWishlisted(
                        product.id,
                      );
                      _wishlistManager.toggleWishlist(product);
                      ScaffoldMessenger.of(context).hideCurrentSnackBar();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            wasWishlisted
                                ? '${product.title} removed from wishlist'
                                : '${product.title} added to wishlist',
                          ),
                          duration: const Duration(seconds: 2),
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          backgroundColor: AppTheme.isLight
                              ? const Color(0xFF0F172A)
                              : const Color(0xFF0F1A2E),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.45),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        _wishlistManager.isWishlisted(product.id)
                            ? Icons.favorite_rounded
                            : Icons.favorite_border_rounded,
                        color: _wishlistManager.isWishlisted(product.id)
                            ? const Color(0xFFEF4444)
                            : Colors.white,
                        size: 16,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // Product Details
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Star Rating: ★ 4.7 (1.2K)
                  Row(
                    children: [
                      const Icon(
                        Icons.star_rounded,
                        color: Color(0xFFF59E0B),
                        size: 14,
                      ),
                      const SizedBox(width: 3),
                      Text(
                        '${product.rating}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 3),
                      Text(
                        '(${product.ratingCount})',
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 10.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),

                  // Title
                  Text(
                    product.title,
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.1,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),

                  // Subtitle
                  Text(
                    product.subtitle,
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 11,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),

                  // Price Row: ₹4,999  ₹6,999  29% off
                  Row(
                    children: [
                      Text(
                        '₹${product.price.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 13.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '₹${product.originalPrice}',
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 10,
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${product.discountPercent}% off',
                        style: const TextStyle(
                          color: Color(0xFF10B981),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Delivery Tag: Free delivery Sat, 26 Sep
                  RichText(
                    text: TextSpan(
                      style: const TextStyle(fontSize: 10.5),
                      children: [
                        const TextSpan(
                          text: 'Free delivery ',
                          style: TextStyle(color: Color(0xFF64748B)),
                        ),
                        TextSpan(
                          text: product.deliveryDate,
                          style: const TextStyle(
                            color: Color(0xFF04C9FB),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUpgradeBanner() {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const SubscriptionPlanScreen(),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0D2554), Color(0xFF0F1E3C), Color(0xFF143B7A)],
          ),
          border: Border.all(color: const Color(0xFF1E4082)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF007AFF).withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.stars_rounded,
                color: Color(0xFF04C9FB),
                size: 24,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'Upgrade Now',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Get CarQConnect Pro Subscription with 1-Year Device Warranty',
                    style: TextStyle(color: Color(0xFF93C5FD), fontSize: 12),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              color: Color(0xFF04C9FB),
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}

// =========================================================================
// 5. Filters Screen / Bottom Sheet matching Image 5
// =========================================================================
class FiltersBottomSheet extends StatefulWidget {
  final Set<String> initialCategories;
  final RangeValues initialPriceRange;
  final bool initialInStock;
  final bool initialOnSale;
  final Function(
    Set<String> categories,
    RangeValues priceRange,
    bool inStock,
    bool onSale,
    int activeCount,
  )
  onApply;

  const FiltersBottomSheet({
    super.key,
    required this.initialCategories,
    required this.initialPriceRange,
    required this.initialInStock,
    required this.initialOnSale,
    required this.onApply,
  });

  @override
  State<FiltersBottomSheet> createState() => _FiltersBottomSheetState();
}

class _FiltersBottomSheetState extends State<FiltersBottomSheet> {
  late Set<String> _selectedCategories;
  late RangeValues _currentRange;
  late bool _inStock;
  late bool _onSale;
  String _activeQuickPrice = '';
  final ScrollController _scrollController = ScrollController();
  bool _isDismissing = false;
  double _pointerStartY = 0.0;
  bool _pointerDownAtTop = false;

  final List<Map<String, dynamic>> _filterCategoryOptions = [
    {'name': 'Dashcams', 'icon': Icons.videocam_outlined},
    {'name': 'GPS Trackers', 'icon': Icons.location_on_outlined},
    {'name': 'OBD Scanners', 'icon': Icons.tune_rounded},
    {'name': 'Smart QR Tags', 'icon': Icons.qr_code_2_rounded},
    {'name': 'Car Accessories & Harnesses', 'icon': Icons.cable_rounded},
  ];

  @override
  void initState() {
    super.initState();
    _selectedCategories = Set.from(widget.initialCategories);
    _currentRange = widget.initialPriceRange;
    _inStock = widget.initialInStock;
    _onSale = widget.initialOnSale;
    if (_currentRange.start == 0 && _currentRange.end == 1000) {
      _activeQuickPrice = 'Under ₹1,000';
    } else if (_currentRange.start == 1000 && _currentRange.end == 3000) {
      _activeQuickPrice = '₹1k - ₹3k';
    } else if (_currentRange.start == 3000 && _currentRange.end == 50000) {
      _activeQuickPrice = '₹3,000+';
    } else {
      _activeQuickPrice = '';
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _dismissSheet() {
    if (!_isDismissing && mounted) {
      _isDismissing = true;
      Navigator.of(context).pop();
    }
  }

  int get _activeCount {
    int count = 0;
    if (_selectedCategories.isNotEmpty) count += _selectedCategories.length;
    if (_currentRange.start > 0 || _currentRange.end < 50000) count += 1;
    if (_inStock) count += 1;
    if (_onSale) count += 1;
    return count;
  }

  void _clearAll() {
    setState(() {
      _selectedCategories.clear();
      _currentRange = const RangeValues(0, 50000);
      _inStock = false;
      _onSale = false;
      _activeQuickPrice = '';
    });
  }

  void _setQuickPrice(String label, double min, double max) {
    setState(() {
      _activeQuickPrice = label;
      _currentRange = RangeValues(min, max);
    });
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final Color sheetBg = isLight ? Colors.white : const Color(0xFF0F1A2E);
        final Color sectionBg = isLight
            ? const Color(0xFFF8FAFC)
            : const Color(0xFF0A1222);
        final Color boxBg = isLight ? Colors.white : const Color(0xFF0F1A2E);
        final Color borderColor = isLight
            ? const Color(0xFFE2E8F0)
            : const Color(0xFF1E2D4A);
        final Color dragColor = isLight
            ? const Color(0xFFCBD5E1)
            : const Color(0xFF334155);
        final Color primaryCol = AppTheme.primaryColor;
        final Color textPrim = AppTheme.textPrimary;
        final Color textSec = AppTheme.textSecondary;

        return Listener(
          behavior: HitTestBehavior.translucent,
          onPointerDown: (event) {
            _pointerStartY = event.position.dy;
            _pointerDownAtTop =
                (!_scrollController.hasClients ||
                _scrollController.offset <= 0);
          },
          onPointerMove: (event) {
            final dy = event.position.dy - _pointerStartY;
            if (_pointerDownAtTop && dy > 35) {
              _dismissSheet();
            }
          },
          onPointerUp: (event) {
            final dy = event.position.dy - _pointerStartY;
            if (_pointerDownAtTop && dy > 25) {
              _dismissSheet();
            }
          },
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.90,
            ),
            decoration: BoxDecoration(
              color: sheetBg,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Dedicated Top Bar (fixed & draggable, with swipe down detector)
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onVerticalDragUpdate: (details) {
                      if ((details.primaryDelta ?? 0) > 4) {
                        _dismissSheet();
                      }
                    },
                    onVerticalDragEnd: (details) {
                      if ((details.primaryVelocity ?? 0) > 100) {
                        _dismissSheet();
                      }
                    },
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                      child: Column(
                        children: [
                          // Top drag bar handle
                          Center(
                            child: Container(
                              width: 44,
                              height: 5,
                              decoration: BoxDecoration(
                                color: dragColor,
                                borderRadius: BorderRadius.circular(2.5),
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Header: Filters  X Active  Clear All
                          Row(
                            children: [
                              Text(
                                'Filters',
                                style: TextStyle(
                                  color: textPrim,
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: -0.2,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: primaryCol.withValues(
                                    alpha: isLight ? 0.12 : 0.2,
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: primaryCol.withValues(alpha: 0.4),
                                  ),
                                ),
                                child: Text(
                                  '$_activeCount Active',
                                  style: TextStyle(
                                    color: primaryCol,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const Spacer(),
                              GestureDetector(
                                onTap: _clearAll,
                                child: Text(
                                  'Clear All',
                                  style: TextStyle(
                                    color: primaryCol,
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Scrollable Body
                  Flexible(
                    child: NotificationListener<ScrollNotification>(
                      onNotification: (notification) {
                        if (notification is OverscrollNotification) {
                          if (notification.overscroll < -4) {
                            _dismissSheet();
                            return true;
                          }
                        } else if (notification is ScrollUpdateNotification) {
                          if (notification.metrics.pixels <= 0 &&
                              notification.scrollDelta != null &&
                              notification.scrollDelta! < -8) {
                            _dismissSheet();
                            return true;
                          }
                        }
                        return false;
                      },
                      child: SingleChildScrollView(
                        controller: _scrollController,
                        physics: const BouncingScrollPhysics(
                          parent: AlwaysScrollableScrollPhysics(),
                        ),
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 1. CATEGORY Header with Selected count
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'CATEGORY',
                                  style: TextStyle(
                                    color: textSec,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                Text(
                                  '${_selectedCategories.length} selected',
                                  style: TextStyle(
                                    color: primaryCol,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),

                            // Category Chips Wrap
                            Wrap(
                              spacing: 10,
                              runSpacing: 10,
                              children: _filterCategoryOptions.map((cat) {
                                final name = cat['name'] as String;
                                final icon = cat['icon'] as IconData;
                                final isSelected = _selectedCategories.contains(
                                  name,
                                );

                                return GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      if (isSelected) {
                                        _selectedCategories.remove(name);
                                      } else {
                                        _selectedCategories.add(name);
                                      }
                                    });
                                  },
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 180),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 9,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? primaryCol.withValues(
                                              alpha: isLight ? 0.12 : 0.2,
                                            )
                                          : sectionBg,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: isSelected
                                            ? primaryCol
                                            : borderColor,
                                        width: 1.2,
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          icon,
                                          color: isSelected
                                              ? primaryCol
                                              : textSec,
                                          size: 16,
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          name,
                                          style: TextStyle(
                                            color: isSelected
                                                ? primaryCol
                                                : textPrim,
                                            fontSize: 13,
                                            fontWeight: isSelected
                                                ? FontWeight.bold
                                                : FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 24),

                            // 2. PRICE RANGE Section
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: sectionBg,
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(color: borderColor),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'PRICE RANGE',
                                        style: TextStyle(
                                          color: textSec,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                      Text(
                                        '₹${_currentRange.start.round()} - ₹${_currentRange.end.round()}',
                                        style: TextStyle(
                                          color: primaryCol,
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),

                                  // Dual Thumb Range Slider
                                  SliderTheme(
                                    data: SliderTheme.of(context).copyWith(
                                      activeTrackColor: primaryCol,
                                      inactiveTrackColor: borderColor,
                                      thumbColor: isLight
                                          ? primaryCol
                                          : Colors.white,
                                      thumbShape: const RoundSliderThumbShape(
                                        enabledThumbRadius: 9,
                                      ),
                                      overlayColor: primaryCol.withValues(
                                        alpha: 0.2,
                                      ),
                                      trackHeight: 4,
                                    ),
                                    child: RangeSlider(
                                      values: _currentRange,
                                      min: 0,
                                      max: 50000,
                                      divisions: 100,
                                      onChanged: (values) {
                                        setState(() {
                                          _currentRange = values;
                                          _activeQuickPrice = '';
                                        });
                                      },
                                    ),
                                  ),
                                  const SizedBox(height: 8),

                                  // Min Price & Max Price Display Boxes
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Container(
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: boxBg,
                                            borderRadius: BorderRadius.circular(
                                              14,
                                            ),
                                            border: Border.all(
                                              color: borderColor,
                                            ),
                                          ),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'MIN PRICE',
                                                style: TextStyle(
                                                  color: textSec,
                                                  fontSize: 10.5,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                '₹${_currentRange.start.round()}',
                                                style: TextStyle(
                                                  color: textPrim,
                                                  fontSize: 15,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Container(
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: boxBg,
                                            borderRadius: BorderRadius.circular(
                                              14,
                                            ),
                                            border: Border.all(
                                              color: borderColor,
                                            ),
                                          ),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'MAX PRICE',
                                                style: TextStyle(
                                                  color: textSec,
                                                  fontSize: 10.5,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                '₹${_currentRange.end.round()}',
                                                style: TextStyle(
                                                  color: textPrim,
                                                  fontSize: 15,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),

                                  // Quick Price Filters
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      _buildQuickPricePill(
                                        'Under ₹1,000',
                                        0,
                                        1000,
                                        isLight,
                                        primaryCol,
                                        boxBg,
                                        borderColor,
                                        textPrim,
                                      ),
                                      _buildQuickPricePill(
                                        '₹1k - ₹3k',
                                        1000,
                                        3000,
                                        isLight,
                                        primaryCol,
                                        boxBg,
                                        borderColor,
                                        textPrim,
                                      ),
                                      _buildQuickPricePill(
                                        '₹3,000+',
                                        3000,
                                        50000,
                                        isLight,
                                        primaryCol,
                                        boxBg,
                                        borderColor,
                                        textPrim,
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 20),

                            // 3. AVAILABILITY & OFFERS Section
                            Text(
                              'AVAILABILITY & OFFERS',
                              style: TextStyle(
                                color: textSec,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 10),

                            Container(
                              decoration: BoxDecoration(
                                color: sectionBg,
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(color: borderColor),
                              ),
                              child: Column(
                                children: [
                                  // In Stock Only Switch Tile
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 10,
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF10B981)
                                                .withValues(
                                                  alpha: isLight ? 0.15 : 0.25,
                                                ),
                                            borderRadius: BorderRadius.circular(
                                              10,
                                            ),
                                          ),
                                          child: const Icon(
                                            Icons.inventory_2_outlined,
                                            color: Color(0xFF10B981),
                                            size: 18,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'In Stock Only',
                                                style: TextStyle(
                                                  color: textPrim,
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                'Ready for immediate dispatch',
                                                style: TextStyle(
                                                  color: textSec,
                                                  fontSize: 11.5,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        AppToggleSwitch(
                                          value: _inStock,
                                          onChanged: (val) =>
                                              setState(() => _inStock = val),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Divider(color: borderColor, height: 1),

                                  // On Sale / Discounted Switch Tile
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 10,
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: primaryCol.withValues(
                                              alpha: isLight ? 0.15 : 0.25,
                                            ),
                                            borderRadius: BorderRadius.circular(
                                              10,
                                            ),
                                          ),
                                          child: Icon(
                                            Icons.local_offer_outlined,
                                            color: primaryCol,
                                            size: 18,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'On Sale / Discounted',
                                                style: TextStyle(
                                                  color: textPrim,
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                'Products with promotional discounts',
                                                style: TextStyle(
                                                  color: textSec,
                                                  fontSize: 11.5,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        AppToggleSwitch(
                                          value: _onSale,
                                          onChanged: (val) =>
                                              setState(() => _onSale = val),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 24),

                            // 4. Bottom Action Buttons: Reset & Apply Filters
                            Row(
                              children: [
                                Expanded(
                                  child: SizedBox(
                                    height: 50,
                                    child: OutlinedButton(
                                      onPressed: _clearAll,
                                      style: OutlinedButton.styleFrom(
                                        backgroundColor: boxBg,
                                        side: BorderSide(color: borderColor),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(
                                            25,
                                          ),
                                        ),
                                      ),
                                      child: Text(
                                        'Reset',
                                        style: TextStyle(
                                          color: textPrim,
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: SizedBox(
                                    height: 50,
                                    child: ElevatedButton(
                                      onPressed: () {
                                        widget.onApply(
                                          _selectedCategories,
                                          _currentRange,
                                          _inStock,
                                          _onSale,
                                          _activeCount,
                                        );
                                        Navigator.pop(context);
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: primaryCol,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(
                                            25,
                                          ),
                                        ),
                                        elevation: 0,
                                      ),
                                      child: const Text(
                                        'Apply Filters',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
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

  Widget _buildQuickPricePill(
    String label,
    double min,
    double max,
    bool isLight,
    Color primaryCol,
    Color boxBg,
    Color borderColor,
    Color textPrim,
  ) {
    final isSelected = _activeQuickPrice == label;
    return Expanded(
      child: GestureDetector(
        onTap: () => _setQuickPrice(label, min, max),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? primaryCol.withValues(alpha: isLight ? 0.12 : 0.2)
                : boxBg,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isSelected ? primaryCol : borderColor),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? primaryCol : textPrim,
              fontSize: 11.5,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}

// =========================================================================
// Sort Options Bottom Sheet matching Image 1
// =========================================================================
class SortOptionsBottomSheet extends StatelessWidget {
  final String selectedSort;
  final ValueChanged<String> onSelect;

  const SortOptionsBottomSheet({
    super.key,
    required this.selectedSort,
    required this.onSelect,
  });

  static final List<Map<String, dynamic>> sortOptions = [
    {'title': 'Popularity', 'icon': Icons.trending_up_rounded},
    {'title': 'Price: Low to High', 'icon': Icons.arrow_upward_rounded},
    {'title': 'Price: High to Low', 'icon': Icons.arrow_downward_rounded},
    {'title': 'Customer Rating', 'icon': Icons.star_outline_rounded},
    {'title': 'Newest Arrivals', 'icon': Icons.auto_awesome_outlined},
    {'title': 'Biggest Discount', 'icon': Icons.percent_rounded},
  ];

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final Color sheetBg = isLight ? Colors.white : const Color(0xFF0F1A2E);
        final Color borderColor = isLight
            ? const Color(0xFFE2E8F0)
            : const Color(0xFF1E2D4A);
        final Color dragColor = isLight
            ? const Color(0xFFCBD5E1)
            : const Color(0xFF334155);
        final Color primaryCol = AppTheme.primaryColor;
        final Color textPrim = AppTheme.textPrimary;
        final Color textSec = AppTheme.textSecondary;

        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onVerticalDragUpdate: (details) {
            if ((details.primaryDelta ?? 0) > 5) {
              Navigator.pop(context);
            }
          },
          onVerticalDragEnd: (details) {
            if ((details.primaryVelocity ?? 0) > 100) {
              Navigator.pop(context);
            }
          },
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 28),
            decoration: BoxDecoration(
              color: sheetBg,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top drag handle
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: dragColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Header Title: SORT OPTIONS
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Text(
                      'SORT OPTIONS',
                      style: TextStyle(
                        color: textSec,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Divider(color: borderColor, height: 1),
                  const SizedBox(height: 12),

                  // Options List matching Image 1
                  ...sortOptions.map((opt) {
                    final title = opt['title'] as String;
                    final icon = opt['icon'] as IconData;
                    final isSelected = selectedSort == title;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: InkWell(
                        onTap: () {
                          onSelect(title);
                          Navigator.pop(context);
                        },
                        borderRadius: BorderRadius.circular(16),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? primaryCol.withValues(
                                    alpha: isLight ? 0.10 : 0.18,
                                  )
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isSelected
                                  ? primaryCol
                                  : Colors.transparent,
                              width: 1.5,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                icon,
                                color: isSelected ? primaryCol : textSec,
                                size: 20,
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Text(
                                  title,
                                  style: TextStyle(
                                    color: isSelected ? primaryCol : textPrim,
                                    fontSize: 15,
                                    fontWeight: isSelected
                                        ? FontWeight.bold
                                        : FontWeight.w500,
                                  ),
                                ),
                              ),
                              if (isSelected)
                                Icon(
                                  Icons.check_rounded,
                                  color: primaryCol,
                                  size: 22,
                                ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
