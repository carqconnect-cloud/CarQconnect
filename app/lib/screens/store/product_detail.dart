import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

import 'store_models.dart';
import 'cart.dart';
import '../../widgets/animated_back_arrow.dart';

class ProductDetailScreen extends StatefulWidget {
  final StoreProduct? product;

  const ProductDetailScreen({
    super.key,
    this.product,
  });

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  late final StoreProduct _product;
  int _currentImageIndex = 0;
  final PageController _pageController = PageController();
  final CartManager _cartManager = CartManager.instance;
  final WishlistManager _wishlistManager = WishlistManager.instance;

  // Accordion expansion states
  bool _keyFeaturesOpen = true;
  bool _whatsInBoxOpen = false;
  bool _specificationsOpen = false;
  bool _warrantyOpen = false;

  @override
  void initState() {
    super.initState();
    _wishlistManager.addListener(_onWishlistChanged);
    _cartManager.addListener(_onCartChanged);
    _product = widget.product ??
        StoreProduct(
          id: 'p2',
          title:
              'Qubo Wireless GPS Tracker from Hero Group | Free 4G SIM & 12 Months Recharge',
          subtitle: 'Hero Group 4G Smart Vehicle Security',
          price: 4990,
          originalPrice: 9990,
          discountPercent: 50,
          rating: 4.7,
          ratingCount: '1.7k',
          category: 'GPS Tracker',
          deliveryDate: 'Saturday, 26 September',
          image: 'assets/images/qubo_gps_tracker.jpg',
          galleryImages: [
            'assets/images/qubo_gps_tracker.jpg',
            'assets/homescreensicons/ProductImage.png',
            'assets/homescreensicons/obd_dongle.png',
          ],
        );
  }

  @override
  void dispose() {
    _wishlistManager.removeListener(_onWishlistChanged);
    _cartManager.removeListener(_onCartChanged);
    _pageController.dispose();
    super.dispose();
  }

  void _onWishlistChanged() {
    if (mounted) setState(() {});
  }

  void _onCartChanged() {
    if (mounted) setState(() {});
  }

  bool get _isInCart =>
      _cartManager.items.any((i) => i.product.id == _product.id);

  void _handleAddToCart() {
    if (_isInCart) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const CartScreen()),
      );
      return;
    }
    _cartManager.addItem(_product, quantity: 1);
    if (mounted) setState(() {});
  }

  void _handleBuyNow() {
    _cartManager.addItem(_product, quantity: 1);
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const CartScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final images = _product.galleryImages;

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
                  // 1. Header Bar: Back, Heart, Share
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                        Row(
                          children: [
                            IconButton(
                              tooltip: 'Wishlist',
                              onPressed: () {
                                final wasWishlisted =
                                    _wishlistManager.isWishlisted(_product.id);
                                _wishlistManager.toggleWishlist(_product);
                                ScaffoldMessenger.of(context).hideCurrentSnackBar();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      wasWishlisted
                                          ? '${_product.title} removed from wishlist'
                                          : '${_product.title} added to wishlist',
                                    ),
                                    duration: const Duration(seconds: 2),
                                    behavior: SnackBarBehavior.floating,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    backgroundColor: isLight
                                        ? const Color(0xFF0F172A)
                                        : const Color(0xFF0F1A2E),
                                  ),
                                );
                              },
                              icon: Icon(
                                _wishlistManager.isWishlisted(_product.id)
                                    ? Icons.favorite_rounded
                                    : Icons.favorite_border_rounded,
                                color: _wishlistManager.isWishlisted(_product.id)
                                    ? const Color(0xFFEF4444)
                                    : (isLight ? const Color(0xFF0F172A) : Colors.white),
                                size: 24,
                              ),
                            ),
                            IconButton(
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: const Text('Product link copied to clipboard!'),
                                    backgroundColor: isLight ? const Color(0xFF0F172A) : const Color(0xFF0F1A2E),
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                              },
                              icon: Icon(
                                Icons.share_outlined,
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                size: 22,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // 2. Scrollable Body
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Product Image Showcase / Carousel
                          SizedBox(
                            height: 250,
                            child: PageView.builder(
                              controller: _pageController,
                              itemCount: images.length,
                              onPageChanged: (index) {
                                setState(() => _currentImageIndex = index);
                              },
                              itemBuilder: (context, index) {
                                return Center(
                                  child: (images[index].startsWith('http://') ||
                                          images[index].startsWith('https://'))
                                      ? Image.network(
                                          images[index],
                                          fit: BoxFit.contain,
                                          errorBuilder: (context, error, stackTrace) =>
                                              Icon(
                                            Icons.devices_other_rounded,
                                            size: 100,
                                            color: isLight
                                                ? AppTheme.primaryColor
                                                : const Color(0xFF04C9FB),
                                          ),
                                        )
                                      : Image.asset(
                                          images[index],
                                          fit: BoxFit.contain,
                                          errorBuilder: (context, error, stackTrace) =>
                                              Icon(
                                            Icons.devices_other_rounded,
                                            size: 100,
                                            color: isLight
                                                ? AppTheme.primaryColor
                                                : const Color(0xFF04C9FB),
                                          ),
                                        ),
                                );
                              },
                            ),
                          ),
                          const SizedBox(height: 10),

                          // Carousel Indicator Dots
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(images.length, (index) {
                              final isSelected = _currentImageIndex == index;
                              return AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                margin: const EdgeInsets.symmetric(horizontal: 3),
                                width: isSelected ? 18 : 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? (isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB))
                                      : (isLight ? const Color(0xFFCBD5E1) : const Color(0xFF334155)),
                                  borderRadius: BorderRadius.circular(3),
                                ),
                              );
                            }),
                          ),
                          const SizedBox(height: 18),

                          // Ratings Row: ★ 4.7 (1.7k)
                          Row(
                            children: [
                              Row(
                                children: List.generate(
                                  5,
                                  (index) => const Icon(
                                    Icons.star_rounded,
                                    color: Color(0xFF10B981),
                                    size: 16,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                '${_product.rating} (${_product.ratingCount})',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),

                          // Product Title
                          Text(
                            _product.title,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              height: 1.35,
                              letterSpacing: -0.2,
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Free Delivery Text
                          Row(
                            children: [
                              Text(
                                'Free Delivery ',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                  fontSize: 13,
                                ),
                              ),
                              Text(
                                _product.deliveryDate,
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),

                          // Price Row: ₹4,990  ₹9,990  50% off
                          Row(
                            children: [
                              Text(
                                '₹${_product.price.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '₹${_product.originalPrice}',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                  fontSize: 14,
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${_product.discountPercent}% off',
                                style: const TextStyle(
                                  color: Color(0xFF10B981),
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 18),

                          // 4 Feature Highlight Cards in a Row
                          Row(
                            children: [
                              Expanded(
                                child: _buildFeatureCard(
                                  icon: Icons.videocam_outlined,
                                  title: '2K',
                                  subtitle: 'Resolution',
                                  isLight: isLight,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _buildFeatureCard(
                                  icon: Icons.nightlight_round_outlined,
                                  title: 'Night',
                                  subtitle: 'Vision',
                                  isLight: isLight,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _buildFeatureCard(
                                  icon: Icons.wifi_rounded,
                                  title: 'Wi-Fi',
                                  subtitle: '',
                                  isLight: isLight,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _buildFeatureCard(
                                  icon: Icons.local_parking_rounded,
                                  title: 'Parking',
                                  subtitle: 'Mode',
                                  isLight: isLight,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // Accordions
                          _buildAccordionTile(
                            title: 'Key Features',
                            isOpen: _keyFeaturesOpen,
                            onToggle: () => setState(
                                () => _keyFeaturesOpen = !_keyFeaturesOpen),
                            content:
                                '• Live GPS Tracking with sub-meter accuracy\n• Instant Engine cut-off alert via app\n• Real-time Geofence entry and exit alerts\n• 90-day route history playback & analytics\n• Towing and vibration anti-theft alert',
                            isLight: isLight,
                          ),
                          const SizedBox(height: 10),

                          _buildAccordionTile(
                            title: "What's in the Box",
                            isOpen: _whatsInBoxOpen,
                            onToggle: () => setState(
                                () => _whatsInBoxOpen = !_whatsInBoxOpen),
                            content:
                                '• 1x GPS Tracker Hardware Unit\n• 1x Pre-activated 4G eSIM with 12 months plan\n• 1x Secure wiring harness & fuse tap\n• 1x Quick start setup manual & warranty card',
                            isLight: isLight,
                          ),
                          const SizedBox(height: 10),

                          _buildAccordionTile(
                            title: 'Specifications',
                            isOpen: _specificationsOpen,
                            onToggle: () => setState(
                                () => _specificationsOpen = !_specificationsOpen),
                            content:
                                '• Network: 4G LTE-M / 2G Fallback\n• Battery Backup: 5000mAh Li-ion\n• Working Voltage: 9V - 36V DC\n• Water Resistance: IP67 Certified\n• Dimensions: 88 x 45 x 18 mm',
                            isLight: isLight,
                          ),
                          const SizedBox(height: 10),

                          _buildAccordionTile(
                            title: 'Installation & Warranty',
                            isOpen: _warrantyOpen,
                            onToggle: () => setState(
                                () => _warrantyOpen = !_warrantyOpen),
                            content:
                                '• 1 Year Doorstep Replacement Warranty\n• Professional technician installation available at checkout\n• Compatible with all 12V and 24V cars and bikes',
                            isLight: isLight,
                          ),
                          const SizedBox(height: 16),

                          // Seller Details Card
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF0F1A2E),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Seller Details',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Text(
                                      'CarQConnect Official Store',
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    const Icon(
                                      Icons.verified_rounded,
                                      color: Color(0xFF007AFF),
                                      size: 18,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '★ 4.8 (2k reviews) • 12k+ Orders',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                    fontSize: 12.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Delivery & Installation Section
                          Text(
                            'Delivery & Installation',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 14.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Icon(
                                Icons.local_shipping_outlined,
                                color: isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB),
                                size: 18,
                              ),
                              const SizedBox(width: 10),
                              Text(
                                'Free delivery by 3-5 days',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(
                                Icons.handyman_outlined,
                                color: isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB),
                                size: 18,
                              ),
                              const SizedBox(width: 10),
                              Text(
                                'Professional installation available ₹499',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 3. Sticky Bottom Action Bar: Add to Cart & Buy Now
          bottomNavigationBar: Container(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
            decoration: BoxDecoration(
              color: isLight ? Colors.white : const Color(0xFF0A1122),
              border: Border(
                top: BorderSide(
                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                  width: 1.0,
                ),
              ),
              boxShadow: isLight
                  ? [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 10,
                        offset: const Offset(0, -3),
                      )
                    ]
                  : null,
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  // Add to Cart
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: OutlinedButton(
                        onPressed: _handleAddToCart,
                        style: OutlinedButton.styleFrom(
                          backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
                          side: BorderSide(
                            color: _isInCart
                                ? const Color(0xFF10B981)
                                : (isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1E2D4A)),
                            width: _isInCart ? 1.5 : 1.0,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(24),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            if (_isInCart) ...[
                              const Icon(
                                Icons.check_circle_rounded,
                                color: Color(0xFF10B981),
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                            ],
                            Flexible(
                              child: Text(
                                _isInCart ? 'Added in Cart' : 'Add to Cart',
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: _isInCart
                                      ? (isLight ? const Color(0xFF059669) : const Color(0xFF34D399))
                                      : (isLight ? const Color(0xFF0F172A) : Colors.white),
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Buy Now
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: ElevatedButton(
                        onPressed: _handleBuyNow,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(24),
                          ),
                          elevation: 0,
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Buy Now',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            SizedBox(width: 8),
                            Icon(
                              Icons.arrow_forward_rounded,
                              color: Colors.white,
                              size: 18,
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

  Widget _buildFeatureCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool isLight,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1A2E),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF0B253D),
              shape: BoxShape.circle,
              border: Border.all(
                color: (isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB)).withValues(alpha: 0.2),
              ),
            ),
            child: Icon(
              icon,
              color: isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB),
              size: 18,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          if (subtitle.isNotEmpty)
            Text(
              subtitle,
              style: TextStyle(
                color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                fontSize: 10,
              ),
              textAlign: TextAlign.center,
            ),
        ],
      ),
    );
  }

  Widget _buildAccordionTile({
    required String title,
    required bool isOpen,
    required VoidCallback onToggle,
    required String content,
    required bool isLight,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1A2E),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Column(
        children: [
          InkWell(
            onTap: onToggle,
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  AnimatedRotation(
                    turns: isOpen ? 0.5 : 0.0,
                    duration: const Duration(milliseconds: 200),
                    child: Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox(width: double.infinity, height: 0),
            secondChild: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  content,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF475569) : const Color(0xFF94A3B8),
                    fontSize: 13,
                    height: 1.45,
                  ),
                ),
              ),
            ),
            crossFadeState: isOpen ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 200),
          ),
        ],
      ),
    );
  }
}
