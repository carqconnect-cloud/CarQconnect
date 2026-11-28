import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'fastag_models.dart';
import '../../utils/app_icons.dart';
import '../../widgets/animated_back_arrow.dart';

class TransactionDetailsScreen extends StatelessWidget {
  final FastagTransaction? transaction;

  const TransactionDetailsScreen({
    super.key,
    this.transaction,
  });

  @override
  Widget build(BuildContext context) {
    final tx = transaction;
    if (tx == null) {
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
          title: const Text('Transaction Details'),
        ),
        body: const Center(child: Text('No transaction selected.')),
      );
    }

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            gradient: isLight ? AppTheme.bgGradient : null,
            color: isLight ? null : const Color(0xFF090E17),
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
                'Transaction Details',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            body: SafeArea(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    const SizedBox(height: 20),

                    // Large Orange/Green Toll Gate Badge
                    Center(
                      child: Container(
                        width: 68,
                        height: 68,
                        decoration: BoxDecoration(
                          color: tx.isToll
                              ? (isLight ? const Color(0xFFFFF7ED) : const Color(0xFF331D0A))
                              : (isLight ? const Color(0xFFDCFCE7) : const Color(0xFF132D24)),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: tx.isToll
                                ? (isLight ? const Color(0xFFFED7AA) : const Color(0xFF5A381E))
                                : (isLight ? const Color(0xFFBBF7D0) : const Color(0xFF1B4D3E)),
                            width: 1.5,
                          ),
                        ),
                        child: Center(
                          child: tx.isToll
                              ? const TollBoothIcon(
                                  size: 34,
                                  color: Color(0xFFFF8A3D),
                                )
                              : AppIcons.svg(
                                  AppIcons.refresh,
                                  color: const Color(0xFF00E676),
                                  width: 34,
                                  height: 34,
                                ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Title: Toll Payment
                    Text(
                      tx.title,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFFCBD5E1),
                        fontSize: 14.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),

                    const SizedBox(height: 6),

                    // Large Amount: ₹ 85.00
                    Text(
                      '₹ ${tx.amount.toStringAsFixed(2)}',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 34,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),

                    const SizedBox(height: 6),

                    // Date: 12 Sep 2026, 10:24 AM
                    Text(
                      tx.timestamp,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                        fontSize: 13,
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Details Key-Value Table Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                      decoration: BoxDecoration(
                        color: isLight ? Colors.white : const Color(0xFF101726),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                        ),
                        boxShadow: isLight ? AppTheme.cardShadow : null,
                      ),
                      child: Column(
                        children: [
                          // Status
                          _buildRow(
                            label: 'Status',
                            isLight: isLight,
                            valueWidget: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: const [
                                Icon(
                                  Icons.check_circle_outline_rounded,
                                  color: Color(0xFF00E676),
                                  size: 15,
                                ),
                                SizedBox(width: 6),
                                Text(
                                  'Successful',
                                  style: TextStyle(
                                    color: Color(0xFF00E676),
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          Divider(
                            color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1A2638),
                            height: 26,
                            thickness: 1,
                          ),

                          // Toll Plaza
                          _buildRow(
                            label: tx.isToll ? 'Toll Plaza' : 'Payment Type',
                            value: tx.isToll ? tx.tollPlaza : 'FASTag Recharge',
                            isLight: isLight,
                          ),

                          Divider(
                            color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1A2638),
                            height: 26,
                            thickness: 1,
                          ),

                          // Vehicle
                          _buildRow(
                            label: 'Vehicle',
                            value: tx.vehicleNumber,
                            isLight: isLight,
                          ),

                          Divider(
                            color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1A2638),
                            height: 26,
                            thickness: 1,
                          ),

                          // Transaction ID
                          _buildRow(
                            label: 'Transaction ID',
                            value: tx.transactionId,
                            isLight: isLight,
                          ),

                          Divider(
                            color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1A2638),
                            height: 26,
                            thickness: 1,
                          ),

                          // Payment Method
                          _buildRow(
                            label: 'Payment Method',
                            value: tx.paymentMethod,
                            isLight: isLight,
                          ),
                        ],
                      ),
                    ),

                    const Spacer(),

                    // Download Receipt Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: OutlinedButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              backgroundColor: isLight ? const Color(0xFF0F172A) : const Color(0xFF101726),
                              behavior: SnackBarBehavior.floating,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: BorderSide(
                                  color: isLight ? const Color(0xFF334155) : const Color(0xFF1E293B),
                                ),
                              ),
                              content: Row(
                                children: const [
                                  Icon(
                                    Icons.check_circle_rounded,
                                    color: Color(0xFF00E676),
                                    size: 20,
                                  ),
                                  SizedBox(width: 10),
                                  Text(
                                    'Receipt downloaded successfully',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          backgroundColor: isLight ? Colors.white : const Color(0xFF0B1321),
                          side: BorderSide(
                            color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1E293B),
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(26),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.download_rounded,
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Download Receipt',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
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
          ),
        ),
      );
      },
    );
  }

  Widget _buildRow({
    required String label,
    required bool isLight,
    String? value,
    Widget? valueWidget,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
            fontSize: 14,
          ),
        ),
        if (valueWidget != null)
          valueWidget
        else
          Text(
            value ?? '',
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
      ],
    );
  }
}
