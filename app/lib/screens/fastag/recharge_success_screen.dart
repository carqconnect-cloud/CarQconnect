import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../widgets/payment_success_animation.dart';
import 'fastag_screen.dart';
import '../../widgets/animated_back_arrow.dart';

class RechargeSuccessScreen extends StatelessWidget {
  final FastagAccount account;
  final int amount;

  const RechargeSuccessScreen({
    super.key,
    required this.account,
    required this.amount,
  });

  @override
  Widget build(BuildContext context) {
    final double newBalance = account.balance + amount + 360.75;
    const String transactionId = '#FTG728374';
    const String dateTimeStr = '12 Sep 2026, 10:42 AM';

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
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () {
                  Navigator.pop(context);
                }),
            ),
            body: SafeArea(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    const SizedBox(height: 20),

                    // Google Pay / PhonePe Style Pop-Up Success Badge
                    const Center(
                      child: GooglePaySuccessBadge(
                        size: 160,
                        circleDiameter: 84,
                        primaryColor: Color(0xFF00C853),
                        showRipples: true,
                        showConfetti: true,
                      ),
                    ),

                    const SizedBox(height: 18),

                    // Title & Amount Pop-Up
                    StaggeredPopUp(
                      delay: const Duration(milliseconds: 250),
                      child: Column(
                        children: [
                          Text(
                            'Recharge Successful!',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.2,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            '₹ $amount',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 34,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'has been added to your FASTag.',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 36),

                    // Transaction Info Card Pop-Up
                    StaggeredPopUp(
                      delay: const Duration(milliseconds: 450),
                      child: Container(
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
                            // New Balance
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'New Balance',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                    fontSize: 14,
                                  ),
                                ),
                                Text(
                                  '₹ ${newBalance.toStringAsFixed(2)}',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),

                            Divider(
                              color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1A2638),
                              height: 28,
                              thickness: 1,
                            ),

                            // Transaction ID
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Transaction ID',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                    fontSize: 14,
                                  ),
                                ),
                                Text(
                                  transactionId,
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),

                            Divider(
                              color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1A2638),
                              height: 28,
                              thickness: 1,
                            ),

                            // Date & Time
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Date & Time',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                    fontSize: 14,
                                  ),
                                ),
                                Text(
                                  dateTimeStr,
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),

                    const Spacer(),

                    // Buttons Pop-Up
                    StaggeredPopUp(
                      delay: const Duration(milliseconds: 600),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Primary Button: View Receipt
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: ElevatedButton(
                              onPressed: () {
                                // Navigate to Transaction Details screen for this recharge
                                final tx = FastagTransaction(
                                  id: 'tx_new',
                                  title: 'Recharge',
                                  subtitle: '12 Sep, 10:42 AM • UPI',
                                  amount: amount.toDouble(),
                                  isDebit: false,
                                  timestamp: dateTimeStr,
                                  tollPlaza: 'N/A',
                                  vehicleNumber: account.vehicleNumber.isNotEmpty
                                      ? account.vehicleNumber
                                      : 'MP 09 CZ 1111',
                                  transactionId: transactionId.replaceFirst('#', ''),
                                  paymentMethod: 'UPI',
                                  status: 'Successful',
                                  iconColor: const Color(0xFF00E676),
                                  iconBgColor: isLight ? const Color(0xFFDCFCE7) : const Color(0xFF132D24),
                                  isToll: false,
                                );
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) =>
                                        TransactionDetailsScreen(transaction: tx),
                                  ),
                                );
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryColor,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(26),
                                ),
                              ),
                              child: const Text(
                                'View Receipt',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 12),

                          // Secondary Button: Back to FASTag
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: OutlinedButton(
                              onPressed: () {
                                Navigator.pushAndRemoveUntil(
                                  context,
                                  MaterialPageRoute(
                                    settings: const RouteSettings(name: 'FastagScreen'),
                                    builder: (context) => const FastagScreen(),
                                  ),
                                  (route) => route.isFirst,
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
                              child: Text(
                                'Back to FASTag',
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
}
