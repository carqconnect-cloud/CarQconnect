import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../../loading.dart';
import 'order_details_screen.dart';
import 'membership_screen.dart';
import '../store/store_service.dart';

import 'package:intl/intl.dart';

import '../../services/screen_refresh_service.dart';
import '../../widgets/animated_back_arrow.dart';

class OrderItemModel {
  final String id;
  final String title;
  final String deliveryInfo;
  final String date;
  final String status;
  final bool isProcessing;
  final double? codPayAmount;
  final int rating;
  final IconData icon;

  const OrderItemModel({
    required this.id,
    required this.title,
    required this.deliveryInfo,
    required this.date,
    required this.status,
    this.isProcessing = false,
    this.codPayAmount,
    this.rating = 0,
    required this.icon,
  });

  OrderItemModel copyWith({int? rating}) {
    return OrderItemModel(
      id: id,
      title: title,
      deliveryInfo: deliveryInfo,
      date: date,
      status: status,
      isProcessing: isProcessing,
      codPayAmount: codPayAmount,
      rating: rating ?? this.rating,
      icon: icon,
    );
  }
}

/// Screen 2: Order History Screen
class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen>
    with RefreshOnRouteReturn<OrderHistoryScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'All';

  final List<String> _categories = [
    'All',
    'Accessories',
    'Services',
    'Membership',
  ];

  late List<OrderItemModel> _orders = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    final backendOrders = await StoreService.getOrders();
    final List<OrderItemModel> mappedOrders = [];

    for (var o in backendOrders) {
      final items = o['items'] as List;
      if (items.isEmpty) continue;

      final firstItem = items[0];
      final product = firstItem['product'];
      final title = product != null ? product['title'] : 'Product';

      final dt = DateTime.parse(o['createdAt']).toLocal();
      final dateStr = DateFormat('MMM dd, yyyy').format(dt);

      final status = o['status'] == 'PENDING' ? 'Processing' : o['status'];
      final isProcessing = status == 'Processing';

      mappedOrders.add(
        OrderItemModel(
          id: o['id'].toString().substring(0, 8), // Short ID
          title: title,
          deliveryInfo: o['status'] == 'DELIVERED'
              ? 'Delivered on $dateStr'
              : (o['status'] == 'SHIPPED'
                  ? 'Dispatched on $dateStr'
                  : 'Order placed on $dateStr'),
          date: dateStr,
          status: status,
          isProcessing: isProcessing,
          codPayAmount: isProcessing ? (o['totalAmount'] as num?)?.toDouble() : null,
          icon: Icons.local_shipping_rounded,
        ),
      );
    }

    if (mounted) {
      setState(() {
        _orders = mappedOrders;
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onRateOrder(int orderIndex, int star) {
    setState(() {
      _orders[orderIndex] = _orders[orderIndex].copyWith(rating: star);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF101726),
        content: Text(
          'Rated $star star${star > 1 ? 's' : ''} for ${_orders[orderIndex].title}',
          style: const TextStyle(color: Colors.white),
        ),
      ),
    );
  }

  @override
  Future<void> refreshOnRouteReturn() => _fetchOrders();

  @override
  Widget build(BuildContext context) {
    final query = _searchController.text.trim().toLowerCase();

    final filteredOrders = _orders.where((order) {
      final matchesSearch =
          query.isEmpty || order.title.toLowerCase().contains(query);
      return matchesSearch;
    }).toList();

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            gradient: isLight ? AppTheme.bgGradient : null,
            color: isLight ? null : const Color(0xFF090D16),
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
                'Order History',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 18.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            body: SafeArea(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: [
                  // Top Promo Banner: CarQConnect Premium
                  _buildPromoBanner(),
                  const SizedBox(height: 18),

                  // Search Bar
                  _buildSearchBar(isLight),
                  const SizedBox(height: 16),

                  // Filter Chips
                  _buildFilterChips(isLight),
                  const SizedBox(height: 20),

                  // Order Cards
                  if (_isLoading)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32.0),
                        child: AppLoadingSpinner(
                          size: 70,
                          primaryColor: Color(0xFF04C9FB),
                        ),
                      ),
                    )
                  else if (filteredOrders.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32.0),
                        child: Text(
                          'No orders found.',
                          style: TextStyle(
                            color: isLight
                                ? const Color(0xFF64748B)
                                : Colors.white54,
                          ),
                        ),
                      ),
                    )
                  else
                    ...filteredOrders.asMap().entries.map((entry) {
                      return _buildOrderCard(entry.value, entry.key, isLight);
                    }),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildPromoBanner() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          colors: [Color(0xFF0D47A1), Color(0xFF003082)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: const [
                  Icon(Icons.star_rounded, color: Color(0xFFFFC107), size: 18),
                  SizedBox(width: 6),
                  Text(
                    'CarQConnect',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(width: 4),
                  Text(
                    'Premium',
                    style: TextStyle(
                      color: Color(0xFF90CAF9),
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              Row(
                children: const [
                  Text(
                    'MEMBERS\nSAVE MORE',
                    style: TextStyle(
                      color: Color(0xFFBBDEFB),
                      fontSize: 9.5,
                      fontWeight: FontWeight.w700,
                      height: 1.1,
                      letterSpacing: 0.5,
                    ),
                    textAlign: TextAlign.right,
                  ),
                  SizedBox(width: 4),
                  Icon(
                    Icons.workspace_premium_rounded,
                    color: Color(0xFFFFD54F),
                    size: 16,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Main Title & Graphic Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                flex: 6,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Drive More. Spend\nLess.',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Up to 40% OFF on vehicle accessories with Premium Membership.',
                      style: TextStyle(
                        color: Color(0xFFE3F2FD),
                        fontSize: 11.5,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 14),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const MembershipScreen(),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
                        elevation: 0,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Text(
                            'Upgrade Now',
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 12.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(width: 4),
                          Icon(
                            Icons.arrow_forward_rounded,
                            color: Colors.black,
                            size: 14,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Device Illustrations Mockup
              Expanded(
                flex: 4,
                child: Container(
                  height: 90,
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Positioned(
                          left: 14,
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: const Color(0xFF102A4E),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: const Color(0xFF1E88E5)
                                    .withValues(alpha: 0.5),
                              ),
                            ),
                            child: const Icon(
                              Icons.album_rounded,
                              color: Color(0xFF64B5F6),
                              size: 24,
                            ),
                          ),
                        ),
                        Positioned(
                          right: 14,
                          child: Container(
                            width: 50,
                            height: 64,
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F1E36),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: const Color(0xFF00C2FF)
                                    .withValues(alpha: 0.6),
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                Icon(
                                  Icons.flash_on_rounded,
                                  color: Color(0xFF00C2FF),
                                  size: 20,
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'CarQConnect',
                                  style: TextStyle(
                                    color: Color(0xFF90CAF9),
                                    fontSize: 8.5,
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
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Carousel Indicators
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 18,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 4),
              Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.4),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 4),
              Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.4),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 4),
              Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.4),
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(bool isLight) {
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
          width: 1,
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (_) => setState(() {}),
        style: TextStyle(
          color: isLight ? const Color(0xFF0F172A) : Colors.white,
          fontSize: 14,
        ),
        decoration: InputDecoration(
          hintText: 'Search your orders...',
          hintStyle: TextStyle(
            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            fontSize: 14,
          ),
          prefixIcon: Icon(
            Icons.search_rounded,
            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            size: 20,
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _buildFilterChips(bool isLight) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      clipBehavior: Clip.none,
      child: Row(
        children: [
          ..._categories.map((cat) {
            final isSelected = cat == _selectedCategory;
            return Container(
              margin: const EdgeInsets.only(right: 8),
              child: InkWell(
                onTap: () {
                  setState(() {
                    _selectedCategory = cat;
                  });
                },
                borderRadius: BorderRadius.circular(20),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: isLight ? Colors.white : const Color(0xFF0F1728),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isSelected
                          ? (isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF))
                          : (isLight
                                ? const Color(0xFFE2E8F0)
                                : const Color(0xFF1E2A44)),
                      width: isSelected ? 1.4 : 1.0,
                    ),
                  ),
                  child: Text(
                    cat,
                    style: TextStyle(
                      color: isSelected
                          ? (isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF))
                          : (isLight
                                ? const Color(0xFF64748B)
                                : const Color(0xFF8E9BAE)),
                      fontSize: 12.5,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    ),
                  ),
                ),
              ),
            );
          }),
          const SizedBox(width: 8),
        ],
      ),
    );
  }

  Widget _buildOrderCard(OrderItemModel order, int index, bool isLight) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: AppTheme.settingsCardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
          width: 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => OrderDetailsScreen(
                  orderId: order.id,
                  orderTitle: order.title,
                  orderStatus: order.status,
                  orderDate: order.date,
                  totalAmount: order.codPayAmount,
                ),
              ),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top status tag if processing
                if (order.isProcessing) ...[
                  Align(
                    alignment: Alignment.topRight,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 3.5,
                      ),
                      decoration: BoxDecoration(
                        color: isLight
                            ? const Color(0xFFE0F2FE)
                            : const Color(0xFF004D70).withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFF00C2FF).withValues(alpha: 0.4),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.circle,
                            size: 7,
                            color: Color(0xFF00C2FF),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            'Processing',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF0284C7)
                                  : const Color(0xFF00C2FF),
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],

                // Product details row
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Product Icon/Thumbnail box
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: isLight
                            ? const Color(0xFFEFF6FF)
                            : const Color(0xFF162544),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isLight
                              ? const Color(0xFFBFDBFE)
                              : const Color(0xFF1E3A8A).withValues(alpha: 0.4),
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            order.icon,
                            color: const Color(0xFF0066FF),
                            size: 22,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'CarQConnect',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF8E9BAE),
                              fontSize: 7.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 14),

                    // Title & Delivery Info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            order.title,
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF0F172A)
                                  : Colors.white,
                              fontSize: 14.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.local_shipping_outlined,
                                color: isLight
                                    ? const Color(0xFF64748B)
                                    : const Color(0xFF8E9BAE),
                                size: 14,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  order.deliveryInfo,
                                  style: TextStyle(
                                    color: isLight
                                        ? const Color(0xFF64748B)
                                        : const Color(0xFF8E9BAE),
                                    fontSize: 12,
                                    height: 1.3,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    Icon(
                      Icons.chevron_right_rounded,
                      color: isLight
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF64748B),
                      size: 20,
                    ),
                  ],
                ),

                const SizedBox(height: 14),
                Divider(
                  color: isLight
                      ? const Color(0xFFF1F5F9)
                      : const Color(0xFF1B263C),
                  height: 1,
                ),
                const SizedBox(height: 12),

                // Bottom row: COD Payable Amount OR Rate & Review stars
                if (order.isProcessing && order.codPayAmount != null)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Cash on Delivery Amount',
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF64748B)
                              : const Color(0xFF8E9BAE),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(
                        '₹${order.codPayAmount!.toInt()}',
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF0F172A)
                              : Colors.white,
                          fontSize: 13.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  )
                else
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Rate & Review',
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF0F172A)
                              : const Color(0xFF8E9BAE),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Row(
                        children: List.generate(5, (starIdx) {
                          final star = starIdx + 1;
                          final isFilled = star <= order.rating;

                          return GestureDetector(
                            onTap: () => _onRateOrder(index, star),
                            child: Padding(
                              padding: const EdgeInsets.only(left: 4),
                              child: Icon(
                                isFilled
                                    ? Icons.star_rounded
                                    : Icons.star_outline_rounded,
                                color: isFilled
                                    ? const Color(0xFFFFB300)
                                    : (isLight
                                          ? const Color(0xFFCBD5E1)
                                          : const Color(0xFF64748B)),
                                size: 19,
                              ),
                            ),
                          );
                        }),
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
}
