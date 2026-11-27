import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'store_models.dart';
import 'cart.dart';
import 'product_detail.dart';
import '../../widgets/animated_back_arrow.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  final WishlistManager _wishlistManager = WishlistManager.instance;
  final CartManager _cartManager = CartManager.instance;

  @override
  void initState() {
    super.initState();
    _wishlistManager.addListener(_onWishlistChanged);
    _cartManager.addListener(_onCartChanged);
  }

  @override
  void dispose() {
    _wishlistManager.removeListener(_onWishlistChanged);
    _cartManager.removeListener(_onCartChanged);
    super.dispose();
  }

  void _onWishlistChanged() {
    if (mounted) setState(() {});
  }

  void _onCartChanged() {
    if (mounted) setState(() {});
  }

  void _moveToCart(StoreProduct product) {
    _cartManager.addItem(product);
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                '${product.title} added to cart!',
                style: const TextStyle(fontWeight: FontWeight.w600),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        backgroundColor: AppTheme.isLight ? const Color(0xFF0F172A) : const Color(0xFF0F1A2E),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        action: SnackBarAction(
          label: 'VIEW CART',
          textColor: const Color(0xFF04C9FB),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const CartScreen()),
            );
          },
        ),
      ),
    );
  }

  void _addAllToCart(List<StoreProduct> items) {
    if (items.isEmpty) return;
    for (final product in items) {
      _cartManager.addItem(product);
    }
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.shopping_bag_rounded, color: Color(0xFF10B981), size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Added ${items.length} item${items.length > 1 ? 's' : ''} to cart!',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        backgroundColor: AppTheme.isLight ? const Color(0xFF0F172A) : const Color(0xFF0F1A2E),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        action: SnackBarAction(
          label: 'GO TO CART',
          textColor: const Color(0xFF04C9FB),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const CartScreen()),
            );
          },
        ),
      ),
    );
  }

  void _removeFromWishlistWithUndo(StoreProduct product) {
    _wishlistManager.removeFromWishlist(product.id);
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.title} removed from wishlist'),
        backgroundColor: AppTheme.isLight ? const Color(0xFF0F172A) : const Color(0xFF0F1A2E),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        action: SnackBarAction(
          label: 'UNDO',
          textColor: const Color(0xFF04C9FB),
          onPressed: () {
            _wishlistManager.addToWishlist(product);
          },
        ),
      ),
    );
  }

  void _showClearConfirmDialog(bool isLight) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Clear Wishlist?',
          style: TextStyle(
            color: isLight ? const Color(0xFF0F172A) : Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Text(
          'Are you sure you want to remove all saved items from your wishlist?',
          style: TextStyle(
            color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
            fontSize: 14,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _wishlistManager.clearWishlist();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Wishlist cleared'),
                  backgroundColor: isLight ? const Color(0xFF0F172A) : const Color(0xFF0F1A2E),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: const Text('Clear All'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = _wishlistManager.items;

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Scaffold(
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
                  // 1. Header Bar: Back, Title with Badge, Actions (Clear, Cart)
                  _buildHeader(context, isLight, items.length),

                  // 2. Content: Empty State or Wishlist Items List
                  Expanded(
                    child: items.isEmpty
                        ? _buildEmptyWishlist(isLight)
                        : _buildWishlistList(isLight, items),
                  ),

                  // 3. Bottom Sticky Action Bar (When items exist)
                  if (items.isNotEmpty) _buildBottomBar(isLight, items),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context, bool isLight, int count) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
          const SizedBox(width: 8),
          Expanded(
            child: Row(
              children: [
                Text(
                  'Wishlist',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -0.2,
                  ),
                ),
                if (count > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: isLight ? const Color(0xFFFEE2E2) : const Color(0xFF3B1E2B),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: const Color(0xFFEF4444).withValues(alpha: 0.3),
                      ),
                    ),
                    child: Text(
                      '$count',
                      style: const TextStyle(
                        color: Color(0xFFEF4444),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (count > 0)
            IconButton(
              tooltip: 'Clear Wishlist',
              onPressed: () => _showClearConfirmDialog(isLight),
              icon: Icon(
                Icons.delete_sweep_outlined,
                color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                size: 22,
              ),
            ),
          // Cart button with badge
          Stack(
            alignment: Alignment.topRight,
            children: [
              IconButton(
                tooltip: 'Shopping Cart',
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const CartScreen()),
                  );
                },
                icon: Icon(
                  Icons.shopping_cart_outlined,
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
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
    );
  }

  Widget _buildEmptyWishlist(bool isLight) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                color: isLight ? const Color(0xFFFFF1F2) : const Color(0xFF201323),
                shape: BoxShape.circle,
                border: Border.all(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.3),
                  width: 1.5,
                ),
              ),
              child: const Center(
                child: Icon(
                  Icons.favorite_border_rounded,
                  color: Color(0xFFEF4444),
                  size: 44,
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Your Wishlist is Empty',
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Explore our store and tap the heart icon on devices\nand accessories you love to save them here.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                fontSize: 13.5,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 46,
              child: ElevatedButton.icon(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.shopping_bag_outlined, size: 18),
                label: const Text(
                  'Explore Store',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(23),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWishlistList(bool isLight, List<StoreProduct> items) {
    return ListView.builder(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      itemCount: items.length + 1,
      itemBuilder: (context, index) {
        if (index == 0) {
          // Tip Banner
          return Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: isLight ? const Color(0xFFF0FDF4) : const Color(0xFF0B251E),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: const Color(0xFF10B981).withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.verified_outlined,
                  color: Color(0xFF10B981),
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Items in your wishlist remain saved to your account. Move them to cart anytime.',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF065F46) : const Color(0xFF6EE7B7),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        final product = items[index - 1];
        return _buildWishlistItemCard(context, isLight, product);
      },
    );
  }

  Widget _buildWishlistItemCard(BuildContext context, bool isLight, StoreProduct product) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1A2E),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
          width: 1,
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ProductDetailScreen(product: product),
              ),
            );
          },
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Product Image Box
                    Stack(
                      children: [
                        _buildProductThumbnail(product, isLight),
                        if (product.discountPercent > 0)
                          Positioned(
                            top: 4,
                            left: 4,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEF4444),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '-${product.discountPercent}%',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(width: 12),

                    // Product Details
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Category Tag
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isLight
                                      ? const Color(0xFFEFF6FF)
                                      : const Color(0xFF0B213F),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                    color: (isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB))
                                        .withValues(alpha: 0.3),
                                    width: 0.8,
                                  ),
                                ),
                                child: Text(
                                  product.category,
                                  style: TextStyle(
                                    color: isLight
                                        ? AppTheme.primaryColor
                                        : const Color(0xFF04C9FB),
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),

                              // Remove Heart Button
                              InkWell(
                                onTap: () => _removeFromWishlistWithUndo(product),
                                borderRadius: BorderRadius.circular(16),
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  child: const Icon(
                                    Icons.favorite_rounded,
                                    color: Color(0xFFEF4444),
                                    size: 20,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 5),

                          // Title
                          Text(
                            product.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 14.5,
                              fontWeight: FontWeight.bold,
                              height: 1.25,
                            ),
                          ),
                          if (product.subtitle.isNotEmpty) ...[
                            const SizedBox(height: 3),
                            Text(
                              product.subtitle,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                fontSize: 11.5,
                              ),
                            ),
                          ],
                          const SizedBox(height: 6),

                          // Rating Pill
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.star_rounded,
                                      color: Color(0xFFF59E0B),
                                      size: 13,
                                    ),
                                    const SizedBox(width: 3),
                                    Text(
                                      product.rating.toStringAsFixed(1),
                                      style: const TextStyle(
                                        color: Color(0xFFF59E0B),
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                '(${product.ratingCount})',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                  fontSize: 11,
                                ),
                              ),
                              const Spacer(),
                              // Stock status
                              Row(
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: BoxDecoration(
                                      color: product.inStock
                                          ? const Color(0xFF10B981)
                                          : const Color(0xFFEF4444),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    product.inStock ? 'In Stock' : 'Out of Stock',
                                    style: TextStyle(
                                      color: product.inStock
                                          ? const Color(0xFF10B981)
                                          : const Color(0xFFEF4444),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),
                Divider(
                  color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1E2D4A),
                  height: 1,
                ),
                const SizedBox(height: 10),

                // Bottom row: Pricing & Move to Cart Button
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Price
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              '₹${_formatPrice(product.price)}',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : const Color(0xFF04C9FB),
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (product.originalPrice > product.price) ...[
                              const SizedBox(width: 6),
                              Text(
                                '₹${_formatPrice(product.originalPrice)}',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                  fontSize: 12,
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            ],
                          ],
                        ),
                        if (product.originalPrice > product.price)
                          Text(
                            'Save ₹${_formatPrice(product.originalPrice - product.price)}',
                            style: const TextStyle(
                              color: Color(0xFF10B981),
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                      ],
                    ),

                    // Move to Cart Button
                    SizedBox(
                      height: 36,
                      child: ElevatedButton.icon(
                        onPressed: product.inStock ? () => _moveToCart(product) : null,
                        icon: const Icon(Icons.add_shopping_cart_rounded, size: 15),
                        label: const Text(
                          'Add to Cart',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
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
    );
  }

  Widget _buildProductThumbnail(StoreProduct product, bool isLight) {
    final image = product.image;
    final bool isNetwork = image.startsWith('http://') || image.startsWith('https://');

    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: 86,
        height: 86,
        color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF0A1222),
        padding: const EdgeInsets.all(6),
        child: isNetwork
            ? Image.network(
                image,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => Icon(
                  Icons.devices_other_rounded,
                  color: isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB),
                  size: 32,
                ),
              )
            : Image.asset(
                image,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => Icon(
                  Icons.devices_other_rounded,
                  color: isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB),
                  size: 32,
                ),
              ),
      ),
    );
  }

  Widget _buildBottomBar(bool isLight, List<StoreProduct> items) {
    final totalWishlistValue = items.fold(0, (sum, item) => sum + item.price);

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0A1122),
        border: Border(
          top: BorderSide(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
            width: 1.0,
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${items.length} ${items.length == 1 ? 'Item' : 'Items'} Saved',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                    fontSize: 11.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '₹${_formatPrice(totalWishlistValue)}',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: SizedBox(
                height: 46,
                child: ElevatedButton.icon(
                  onPressed: () => _addAllToCart(items),
                  icon: const Icon(Icons.shopping_cart_checkout_rounded, size: 18),
                  label: const Text(
                    'Add All to Cart',
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(23),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatPrice(int amount) {
    return amount.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }
}
