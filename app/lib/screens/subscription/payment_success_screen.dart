import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../theme/app_theme.dart';
import '../../widgets/payment_success_animation.dart';
import '../bottom_navigation_screen.dart';
import '../../widgets/animated_back_arrow.dart';

class PlanPurchaseSuccessScreen extends StatelessWidget {
  final String planName;
  final String tenure;
  final double subtotal;
  final double gst;
  final double totalPrice;
  final String paymentId;
  final DateTime dateTime;

  const PlanPurchaseSuccessScreen({
    super.key,
    required this.planName,
    required this.tenure,
    required this.subtotal,
    required this.gst,
    required this.totalPrice,
    required this.paymentId,
    required this.dateTime,
  });

  String _getTenureDisplay() {
    switch (tenure.toLowerCase()) {
      case 'yearly':
        return 'Yearly';
      case 'quarterly':
        return 'Quarterly';
      case 'monthly':
      default:
        return 'Monthly';
    }
  }

  void _handleBack(BuildContext context) {
    if (Navigator.canPop(context)) {
      Navigator.of(context).popUntil((route) => route.isFirst);
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
    final currencyFormatter = NumberFormat.currency(
      locale: 'en_IN',
      symbol: '₹',
      decimalDigits: 2,
    );
    final dateFormatter = DateFormat('dd/MM/yyyy hh:mm a');

    final String noteText = '$planName ${_getTenureDisplay()} Plan';
    final String displayTransactionId =
        paymentId.startsWith('#') ? paymentId : '#$paymentId';

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
            backgroundColor: isLight ? AppTheme.scaffoldBg : const Color(0xFF060B14),
            body: Container(
              decoration: BoxDecoration(
                color: isLight ? AppTheme.scaffoldBg : const Color(0xFF060B14),
                gradient: isLight
                    ? AppTheme.bgGradient
                    : const RadialGradient(
                        center: Alignment(0.8, -0.6),
                        radius: 1.2,
                        colors: [
                          Color(0xFF0F1B33),
                          Color(0xFF060B14),
                        ],
                      ),
              ),
              child: SafeArea(
                child: Column(
                  children: [
                    // Top Bar
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          AnimatedBackArrowButton(onTap: () => _handleBack(context)),
                          Expanded(
                            child: Center(
                              child: Text(
                                'Payment Successful',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: -0.2,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 36), // balances back button
                      ],
                    ),
                  ),

                  // Scrollable Body
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          const SizedBox(height: 12),

                          // Google Pay / PhonePe Style Pop-Up Success Badge
                          const GooglePaySuccessBadge(
                            size: 160,
                            circleDiameter: 84,
                            primaryColor: Color(0xFF00C853),
                            showRipples: true,
                            showConfetti: true,
                          ),

                          const SizedBox(height: 22),

                          // Heading & Subtitle Pop-Up
                          StaggeredPopUp(
                            delay: const Duration(milliseconds: 260),
                            child: Column(
                              children: [
                                Text(
                                  'Payment Successful!',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: -0.3,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 24),
                                  child: Text(
                                    'Your transaction is complete—thank you for your purchase!',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                      fontSize: 13,
                                      height: 1.35,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Action Buttons: Share & Download PDF
                          StaggeredPopUp(
                            delay: const Duration(milliseconds: 380),
                            child: Row(
                              children: [
                                Expanded(
                                  child: _buildSecondaryActionButton(
                                    icon: Icons.share_outlined,
                                    label: 'Share',
                                    isLight: isLight,
                                    onTap: () {
                                      Clipboard.setData(
                                        ClipboardData(
                                          text:
                                              'Payment Successful for $noteText.\nTransaction ID: $displayTransactionId\nTotal Amount: ${currencyFormatter.format(totalPrice)}',
                                        ),
                                      );
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Transaction details copied to clipboard!'),
                                          duration: Duration(seconds: 2),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _buildSecondaryActionButton(
                                    icon: Icons.description_outlined,
                                    label: 'Download PDF',
                                    isLight: isLight,
                                    onTap: () {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text(
                                            'Receipt downloaded: Receipt_${displayTransactionId.replaceAll('#', '')}.pdf',
                                          ),
                                          duration: const Duration(seconds: 2),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Transactions Details Card
                          StaggeredPopUp(
                            delay: const Duration(milliseconds: 500),
                            child: Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: isLight ? Colors.white : const Color(0xFF0D1626),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                                  width: 1,
                                ),
                                boxShadow: isLight
                                    ? AppTheme.cardShadow
                                    : [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.25),
                                          blurRadius: 16,
                                          offset: const Offset(0, 4),
                                        ),
                                      ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Transactions Details',
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: -0.2,
                                    ),
                                  ),
                                  const SizedBox(height: 18),

                                  _buildDetailRow(
                                    'Transactions Date',
                                    dateFormatter.format(dateTime),
                                    isLight: isLight,
                                  ),
                                  const SizedBox(height: 14),

                                  _buildDetailRow(
                                    'Amount',
                                    currencyFormatter.format(subtotal),
                                    isLight: isLight,
                                  ),
                                  const SizedBox(height: 14),

                                  _buildDetailRow(
                                    'Transactions ID',
                                    displayTransactionId,
                                    isLight: isLight,
                                  ),
                                  const SizedBox(height: 14),

                                  _buildDetailRow(
                                    'Note',
                                    noteText,
                                    isLight: isLight,
                                  ),
                                  const SizedBox(height: 14),

                                  _buildDetailRow(
                                    'GST',
                                    currencyFormatter.format(gst),
                                    isLight: isLight,
                                  ),
                                  const SizedBox(height: 18),

                                  Divider(
                                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                                    height: 1,
                                  ),
                                  const SizedBox(height: 16),

                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Total Amount',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      Text(
                                        currencyFormatter.format(totalPrice),
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF0066FF) : Colors.white,
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Button: Back to Home
                  StaggeredPopUp(
                    delay: const Duration(milliseconds: 620),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                      child: SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: ElevatedButton(
                          onPressed: () => _handleBack(context),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                            foregroundColor: isLight ? Colors.white : Colors.black,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(28),
                            ),
                          ),
                          child: Text(
                            'Back to Home',
                            style: TextStyle(
                              color: isLight ? Colors.white : Colors.black,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    },
  );
}

  Widget _buildSecondaryActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool isLight = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isLight ? Colors.white : const Color(0xFF0D1626),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
            width: 1,
          ),
          boxShadow: isLight ? AppTheme.cardShadow : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              size: 18,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(
    String label,
    String value, {
    bool isLight = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
            fontSize: 13.5,
          ),
        ),
        const SizedBox(width: 12),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
