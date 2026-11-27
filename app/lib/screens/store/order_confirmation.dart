import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_theme.dart';
import '../../widgets/payment_success_animation.dart';
import '../bottom_navigation_screen.dart';

class OrderConfirmationScreen extends StatelessWidget {
  final String orderId;
  final String estimatedDelivery;

  const OrderConfirmationScreen({
    super.key,
    this.orderId = '#FN125789',
    this.estimatedDelivery = 'Arriving in 3 - 5 days',
  });

  void _handleBack(BuildContext context) {
    if (Navigator.canPop(context)) {
      Navigator.popUntil(context, (route) => route.isFirst);
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
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return PopScope(
          canPop: false,
          onPopInvokedWithResult: (didPop, _) {
            if (didPop) return;
            _handleBack(context);
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
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      child: ConstrainedBox(
                        constraints: BoxConstraints(
                          minHeight: constraints.maxHeight,
                        ),
                        child: IntrinsicHeight(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                            child: Column(
                              children: [
                                // Top Bar with Close / Exit Button
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: InkWell(
                                    onTap: () => _handleBack(context),
                                    borderRadius: BorderRadius.circular(20),
                                    child: Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: isLight
                                            ? Colors.white.withValues(alpha: 0.8)
                                            : const Color(0xFF0F1A2E),
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: isLight
                                              ? const Color(0xFFE2E8F0)
                                              : const Color(0xFF1E2D4A),
                                        ),
                                      ),
                                      child: Icon(
                                        Icons.close_rounded,
                                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                        size: 20,
                                      ),
                                    ),
                                  ),
                                ),
                                const Spacer(flex: 1),

                    // 1. Google Pay / PhonePe Style Pop-Up Success Badge
                    const GooglePaySuccessBadge(
                      size: 160,
                      circleDiameter: 86,
                      primaryColor: Color(0xFF00C853),
                      showRipples: true,
                      showConfetti: true,
                    ),

                    const SizedBox(height: 24),

                    // 2. Order Confirmed Heading & Subtitle Pop-Up
                    StaggeredPopUp(
                      delay: const Duration(milliseconds: 250),
                      child: Column(
                        children: [
                          Text(
                            'Order Confirmed!',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              letterSpacing: -0.3,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Thank you for choosing CarQConnect.',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                              fontSize: 14.5,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const Spacer(flex: 1),

                    // 3 & 4. Order ID & Estimated Delivery Cards Pop-Up
                    StaggeredPopUp(
                      delay: const Duration(milliseconds: 450),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // 3. Order ID Card
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF0F1A2E),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                                width: 1.0,
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF0A2548),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    Icons.person_rounded,
                                    color: AppTheme.primaryColor,
                                    size: 22,
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Order ID',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        orderId,
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  onPressed: () {
                                    Clipboard.setData(ClipboardData(text: orderId));
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          '$orderId copied to clipboard!',
                                          style: const TextStyle(color: Colors.white),
                                        ),
                                        backgroundColor: isLight ? const Color(0xFF0F172A) : const Color(0xFF0F1A2E),
                                        behavior: SnackBarBehavior.floating,
                                        duration: const Duration(seconds: 2),
                                      ),
                                    );
                                  },
                                  icon: Icon(
                                    Icons.copy_rounded,
                                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                                    size: 20,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 12),

                          // 4. Estimated Delivery Card
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF0F1A2E),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                                width: 1.0,
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF0A2548),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    Icons.calendar_month_rounded,
                                    color: AppTheme.primaryColor,
                                    size: 22,
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Estimated Delivery',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        estimatedDelivery,
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        "We'll notify you when it's out for delivery.",
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const Spacer(flex: 2),

                    // 5. Action Buttons Pop-Up (Track Your Order & Continue Shopping)
                    StaggeredPopUp(
                      delay: const Duration(milliseconds: 620),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: ElevatedButton(
                              onPressed: () {
                                _showTrackingSheet(context, isLight);
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryColor,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(26),
                                ),
                                elevation: 0,
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    'Track Your Order',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  SizedBox(width: 8),
                                  Icon(
                                    Icons.arrow_forward_rounded,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                                ],
                              ),
                            ),
                          ),

                          const SizedBox(height: 12),

                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: OutlinedButton(
                              onPressed: () => _handleBack(context),
                              style: OutlinedButton.styleFrom(
                                backgroundColor: isLight ? Colors.white : const Color(0xFF0A1222),
                                side: BorderSide(
                                  color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1E2D4A),
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(26),
                                ),
                              ),
                              child: Text(
                                'Continue Shopping',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    ),
  ),
),
      ),
    );
  },
);
  }

  void _showTrackingSheet(BuildContext context, bool isLight) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Order Tracking',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    orderId,
                    style: TextStyle(
                      color: isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB),
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _buildTrackingStep(
                title: 'Order Placed',
                subtitle: 'Your order has been received and verified',
                time: 'Today, 2:35 PM',
                isCompleted: true,
                isCurrent: false,
                isLight: isLight,
              ),
              _buildTrackingStep(
                title: 'Order Processing',
                subtitle: 'Warehouse is packing your items',
                time: 'Expected today, 6:00 PM',
                isCompleted: true,
                isCurrent: true,
                isLight: isLight,
              ),
              _buildTrackingStep(
                title: 'Dispatched with Bluedart',
                subtitle: 'Tracking AWB #BD98274198',
                time: 'Expected tomorrow',
                isCompleted: false,
                isCurrent: false,
                isLight: isLight,
              ),
              _buildTrackingStep(
                title: 'Out for Delivery',
                subtitle: 'Delivery executive will deliver to Home address',
                time: 'Expected in 3-5 days',
                isCompleted: false,
                isCurrent: false,
                isLast: true,
                isLight: isLight,
              ),
            ],
          ),
        ));
      },
    );
  }

  Widget _buildTrackingStep({
    required String title,
    required String subtitle,
    required String time,
    required bool isCompleted,
    required bool isCurrent,
    required bool isLight,
    bool isLast = false,
  }) {
    final activeColor = isLight ? AppTheme.primaryColor : const Color(0xFF04C9FB);
    final inactiveColor = isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isCompleted ? activeColor : inactiveColor,
                border: Border.all(
                  color: isCurrent ? activeColor : Colors.transparent,
                  width: 2,
                ),
              ),
              child: isCompleted
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 38,
                color: isCompleted ? activeColor : inactiveColor,
              ),
          ],
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: isCompleted
                      ? (isLight ? const Color(0xFF0F172A) : Colors.white)
                      : (isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                time,
                style: TextStyle(
                  color: activeColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ],
    );
  }
}
