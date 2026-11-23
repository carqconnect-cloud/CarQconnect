import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_icons.dart';
import 'contact_support_screen.dart';
import '../../widgets/animated_back_arrow.dart';

/// Screen 3: Order Details Screen
class OrderDetailsScreen extends StatelessWidget {
  final String orderId;
  final String orderTitle;

  const OrderDetailsScreen({
    super.key,
    this.orderId = '#FN123458',
    this.orderTitle = 'GPS Vehicle Tracker & OBD Unit',
  });

  @override
  Widget build(BuildContext context) {
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
                'Order Details',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 18.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
              actions: [
                IconButton(
                  icon: AppIcons.svg(
                    AppIcons.share,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    width: 20,
                    height: 20,
                  ),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                        content: Text(
                          'Order summary link copied to clipboard',
                          style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Top Summary Card
                          _buildSummaryCard(isLight),
                          const SizedBox(height: 16),

                          // Delivery & Activation Timeline Card
                          _buildTimelineCard(isLight),
                          const SizedBox(height: 16),

                          // Order Items Card
                          _buildOrderItemsCard(context, isLight),
                          const SizedBox(height: 18),

                          // Contact Support link note
                          Center(
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                AppIcons.svg(
                                  AppIcons.customerSupport,
                                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                  width: 16,
                                  height: 16,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Have questions regarding this service? ',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                    fontSize: 12.5,
                                  ),
                                ),
                                InkWell(
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) =>
                                            const ContactSupportScreen(),
                                      ),
                                    );
                                  },
                                  child: const Text(
                                    'Contact Support',
                                    style: TextStyle(
                                      color: Color(0xFF0066FF),
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.bold,
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

                  // Bottom Buttons
                  _buildBottomButtons(context, isLight),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSummaryCard(bool isLight) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
          width: 1,
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Order ID and Status Pill
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                orderId,
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 3.5),
                decoration: BoxDecoration(
                  color: isLight
                      ? const Color(0xFFECFDF5)
                      : const Color(0xFF063327),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: const Color(0xFF00E676).withValues(alpha: 0.35),
                  ),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.circle, size: 7, color: Color(0xFF00E676)),
                    SizedBox(width: 5),
                    Text(
                      'Delivered',
                      style: TextStyle(
                        color: Color(0xFF00E676),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Title and Price
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  orderTitle,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 17.5,
                    fontWeight: FontWeight.bold,
                    height: 1.25,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                '₹2,499',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Date
          Row(
            children: [
              Icon(Icons.calendar_today_outlined,
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE), size: 14),
              const SizedBox(width: 6),
              Text(
                '04 Sep 2026, 02:30 PM',
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                  fontSize: 12.5,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineCard(bool isLight) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
          width: 1,
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'DELIVERY & ACTIVATION TIMELINE',
            style: TextStyle(
              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 18),

          // Step 1
          _buildTimelineItem(
            isCompleted: true,
            isGreen: false,
            showConnector: true,
            title: 'Order Placed & Confirmed',
            time: '02 Sep 2026, 11:30 AM',
            isLight: isLight,
          ),

          // Step 2
          _buildTimelineItem(
            isCompleted: true,
            isGreen: false,
            showConnector: true,
            title: 'Packed & Dispatched',
            time: '03 Sep 2026, 04:15 PM • CarQConnect Logistics Hub',
            isLight: isLight,
          ),

          // Step 3
          _buildTimelineItem(
            isCompleted: true,
            isGreen: false,
            showConnector: true,
            title: 'Out for Delivery',
            time: '04 Sep 2026, 09:30 AM',
            isLight: isLight,
          ),

          // Step 4
          _buildTimelineItem(
            isCompleted: true,
            isGreen: true,
            showConnector: false,
            title: 'Delivered & Telematics Activated',
            time: '04 Sep 2026, 02:30 PM',
            isLight: isLight,
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineItem({
    required bool isCompleted,
    required bool isGreen,
    required bool showConnector,
    required String title,
    required String time,
    required bool isLight,
  }) {
    final color = isGreen ? const Color(0xFF00E676) : const Color(0xFF0066FF);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Step circle with line
          Column(
            children: [
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(
                    Icons.check_rounded,
                    color: Colors.white,
                    size: 13,
                  ),
                ),
              ),
              if (showConnector)
                Expanded(
                  child: Container(
                    width: 2,
                    color: const Color(0xFF0066FF).withValues(alpha: 0.5),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 14),

          // Step text
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: isGreen
                          ? const Color(0xFF00E676)
                          : (isLight ? const Color(0xFF0F172A) : Colors.white),
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    time,
                    style: TextStyle(
                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderItemsCard(BuildContext context, bool isLight) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
          width: 1,
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'ORDER ITEMS',
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                ),
              ),
              Text(
                '3 ITEMS INCLUDED',
                style: TextStyle(
                  color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Items
          _buildItemRow('CarQConnect OBD-II 4G GPS Tracker', '₹2,199', isLight),
          const SizedBox(height: 10),
          _buildItemRow(
              'Lifetime Telematics Platform Access (1 Year)', '₹499', isLight),
          const SizedBox(height: 10),
          _buildItemRow('Smart Emergency QR Sticker (Pack of 2)', '₹199', isLight),

          Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Divider(
              color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1B263C),
              height: 1,
            ),
          ),

          // Subtotal & Discounts
          _buildSummaryLine('Subtotal', '₹2,897', isLight ? const Color(0xFF0F172A) : Colors.white, isLight),
          const SizedBox(height: 8),
          _buildDiscountLine('CarQConnect Member Discount', '-₹398'),
          const SizedBox(height: 8),
          _buildFreeLine('Shipping & Handling', 'FREE', isLight),

          Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Divider(
              color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1B263C),
              height: 1,
            ),
          ),

          // Total Amount Paid
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Total Amount Paid',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Paid via UPI • HDFC Bank (xx4902)',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '₹2,499',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildItemRow(String name, String price, bool isLight) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            name,
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 13.5,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          price,
          style: TextStyle(
            color: isLight ? const Color(0xFF0F172A) : Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryLine(String title, String val, Color valColor, bool isLight) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
              fontSize: 13,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          val,
          style: TextStyle(
            color: valColor,
            fontSize: 13.5,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildDiscountLine(String title, String val) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Row(
            children: [
              const Icon(Icons.local_offer_outlined,
                  color: Color(0xFF00E676), size: 14),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xFF00E676),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Text(
          val,
          style: const TextStyle(
            color: Color(0xFF00E676),
            fontSize: 13.5,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildFreeLine(String title, String val, bool isLight) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
              fontSize: 13,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          val,
          style: const TextStyle(
            color: Color(0xFF00E676),
            fontSize: 13,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildBottomButtons(BuildContext context, bool isLight) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF090D16),
        border: Border(
          top: BorderSide(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
            width: 0.8,
          ),
        ),
      ),
      child: Row(
        children: [
          // Left: Invoice (PDF)
          Expanded(
            child: SizedBox(
              height: 50,
              child: OutlinedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                      content: Text(
                        'Downloading Tax Invoice PDF...',
                        style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white),
                      ),
                    ),
                  );
                },
                style: OutlinedButton.styleFrom(
                  backgroundColor: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF0F1728),
                  side: BorderSide(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(25),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    AppIcons.svg(
                      AppIcons.invoice,
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      width: 18,
                      height: 18,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Invoice (PDF)',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Right: Reorder / Invoice Cyan Button
          Expanded(
            child: SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                      content: Text(
                        'Opening Invoice / Reorder...',
                        style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white),
                      ),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0066FF),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(25),
                  ),
                  elevation: 0,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    AppIcons.svg(
                      AppIcons.refresh,
                      color: Colors.white,
                      width: 16,
                      height: 16,
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Invoice (PDF)',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
