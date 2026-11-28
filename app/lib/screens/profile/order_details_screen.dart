import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_icons.dart';
import 'contact_support_screen.dart';
import '../../widgets/animated_back_arrow.dart';

class OrderDetailsScreen extends StatelessWidget {
  final String orderId;
  final String orderTitle;
  final String orderStatus;
  final String orderDate;
  final double? totalAmount;

  const OrderDetailsScreen({
    super.key,
    required this.orderId,
    required this.orderTitle,
    this.orderStatus = 'Confirmed',
    this.orderDate = '',
    this.totalAmount,
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
                  onPressed: () async {
                    await Clipboard.setData(
                      ClipboardData(text: 'Order $orderId - $orderTitle'),
                    );
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                        content: Text(
                          'Order ID $orderId copied to clipboard',
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
                          _buildSummaryCard(isLight),
                          const SizedBox(height: 16),
                          _buildOrderItemsCard(context, isLight),
                          const SizedBox(height: 18),
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
                                  'Have questions regarding this order? ',
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
                        ],
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

  Widget _buildSummaryCard(bool isLight) {
    final amountText = totalAmount != null
        ? '₹${totalAmount!.toStringAsFixed(0)}'
        : '';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3.5),
                decoration: BoxDecoration(
                  color: isLight
                      ? const Color(0xFFECFDF5)
                      : const Color(0xFF063327),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: const Color(0xFF00E676).withValues(alpha: 0.35),
                  ),
                ),
                child: Text(
                  orderStatus,
                  style: const TextStyle(
                    color: Color(0xFF00E676),
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
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
              if (amountText.isNotEmpty) ...[
                const SizedBox(width: 12),
                Text(
                  amountText,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ],
          ),
          if (orderDate.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(
                  Icons.calendar_today_outlined,
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                  size: 14,
                ),
                const SizedBox(width: 6),
                Text(
                  orderDate,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildOrderItemsCard(BuildContext context, bool isLight) {
    final amountText = totalAmount != null
        ? '₹${totalAmount!.toStringAsFixed(0)}'
        : 'Recorded on checkout';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ORDER SUMMARY',
            style: TextStyle(
              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  orderTitle,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Text(
                amountText,
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Status: $orderStatus',
            style: TextStyle(
              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
