import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'fastag_models.dart';
import 'payment_processing_screen.dart';
import '../../widgets/animated_back_arrow.dart';

class RechargeFastagScreen extends StatefulWidget {
  final FastagAccount? account;

  const RechargeFastagScreen({super.key, this.account});

  @override
  State<RechargeFastagScreen> createState() => _RechargeFastagScreenState();
}

class _RechargeFastagScreenState extends State<RechargeFastagScreen> {
  int _selectedAmount = 500;
  String _selectedPaymentMethod = 'UPI';

  final List<int> _quickAmounts = [200, 500, 1000, 2000];

  void _proceedToPay(FastagAccount account) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PaymentProcessingScreen(
          account: account,
          amount: _selectedAmount,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final account = widget.account ??
        const FastagAccount(
          id: '1',
          bankName: 'Axis Bank FASTag',
          vehicleNumber: 'MP09CZ1111',
          balance: 200,
          customerName: 'John Doe',
          logoAsset: 'assets/fastagicons/Axis.png',
        );

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
                'Recharge FASTag',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.2,
                ),
              ),
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 12),

                          // 1. Selected FASTag Card
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Row(
                              children: [
                                BankLogoWidget(
                                  bankName: account.bankName,
                                  assetPath: account.logoAsset,
                                  size: 42,
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        account.bankName,
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                          fontSize: 15.5,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        account.vehicleNumber,
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                          fontSize: 13,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 14),

                          // 2. Customer & Balance Card
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    SizedBox(
                                      width: 140,
                                      child: Text(
                                        'Customer Name',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                          fontSize: 13.5,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      ':   ',
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                        fontSize: 13.5,
                                      ),
                                    ),
                                    Expanded(
                                      child: Text(
                                        account.customerName,
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    SizedBox(
                                      width: 140,
                                      child: Text(
                                        'Available Balance',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                          fontSize: 13.5,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      ':   ',
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                        fontSize: 13.5,
                                      ),
                                    ),
                                    Expanded(
                                      child: Text(
                                        '₹${account.balance.toInt()}',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 22),

                          // 3. ENTER AMOUNT Section
                          Text(
                            'ENTER AMOUNT',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.8,
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Amount Display
                          Text(
                            '₹ $_selectedAmount',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),

                          const SizedBox(height: 14),

                          // Quick Amount Chips: ₹200, ₹500, ₹1,000, ₹2,000
                          Row(
                            children: _quickAmounts.map((amt) {
                              final isSelected = _selectedAmount == amt;
                              return Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 4),
                                  child: InkWell(
                                    onTap: () {
                                      setState(() {
                                        _selectedAmount = amt;
                                      });
                                    },
                                    borderRadius: BorderRadius.circular(16),
                                    child: Container(
                                      height: 42,
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? AppTheme.primaryColor
                                            : (isLight ? Colors.white : const Color(0xFF101726)),
                                        borderRadius: BorderRadius.circular(16),
                                        border: Border.all(
                                          color: isSelected
                                              ? AppTheme.primaryColor
                                              : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2B40)),
                                        ),
                                        boxShadow: isLight
                                            ? AppTheme.cardShadow
                                            : (isSelected
                                                ? [
                                                    BoxShadow(
                                                      color: const Color(0xFF00C2FF)
                                                          .withValues(alpha: 0.35),
                                                      blurRadius: 8,
                                                      offset: const Offset(0, 2),
                                                    ),
                                                  ]
                                                : null),
                                      ),
                                      child: Center(
                                        child: Text(
                                          '₹ ${amt >= 1000 ? '1,000' : amt >= 2000 ? '2,000' : amt}',
                                          style: TextStyle(
                                            color: isSelected
                                                ? Colors.white
                                                : (isLight ? const Color(0xFF0F172A) : Colors.white),
                                            fontSize: 13.5,
                                            fontWeight: isSelected
                                                ? FontWeight.bold
                                                : FontWeight.w500,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),

                          const SizedBox(height: 24),

                          // 4. Select Payment Method Section
                          Text(
                            'Select Payment Method',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 10),

                          // Payment Method 1: UPI (Selected)
                          _buildPaymentOption(
                            id: 'UPI',
                            icon: Icons.qr_code_2_rounded,
                            title: 'UPI',
                            subtitle: 'Pay via any UPI app',
                            isRadio: true,
                            isLight: isLight,
                          ),

                          const SizedBox(height: 10),

                          // Payment Method 2: Debit / Credit Card
                          _buildPaymentOption(
                            id: 'Card',
                            icon: Icons.credit_card_rounded,
                            title: 'Debit / Credit Card',
                            isRadio: true,
                            isLight: isLight,
                          ),

                          const SizedBox(height: 10),

                          // Payment Method 3: Net Banking
                          _buildPaymentOption(
                            id: 'NetBanking',
                            icon: Icons.account_balance_rounded,
                            title: 'Net Banking',
                            isRadio: false,
                            isLight: isLight,
                          ),

                          const SizedBox(height: 10),

                          // Payment Method 4: Wallet
                          _buildPaymentOption(
                            id: 'Wallet',
                            icon: Icons.account_balance_wallet_rounded,
                            title: 'Wallet (Paytm, etc.)',
                            isRadio: false,
                            isLight: isLight,
                          ),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Proceed to Pay Button
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
                    decoration: BoxDecoration(
                      color: isLight ? Colors.white : const Color(0xFF090E17),
                      border: isLight ? const Border(top: BorderSide(color: Color(0xFFE2E8F0))) : null,
                    ),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: () => _proceedToPay(account),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(26),
                          ),
                        ),
                        child: const Text(
                          'Proceed to Pay',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.2,
                          ),
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

  Widget _buildPaymentOption({
    required String id,
    required IconData icon,
    required String title,
    String? subtitle,
    required bool isRadio,
    required bool isLight,
  }) {
    final isSelected = _selectedPaymentMethod == id;

    return InkWell(
      onTap: () {
        setState(() {
          _selectedPaymentMethod = id;
        });
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isLight ? Colors.white : const Color(0xFF101726),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? AppTheme.primaryColor
                : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C)),
            width: isSelected ? 1.8 : 1.0,
          ),
          boxShadow: isLight ? AppTheme.cardShadow : null,
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF142238),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Icon(icon, color: AppTheme.primaryColor, size: 20),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 14.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (isRadio)
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isSelected
                        ? AppTheme.primaryColor
                        : (isLight ? const Color(0xFFCBD5E1) : const Color(0xFF64748B)),
                    width: isSelected ? 5.5 : 1.5,
                  ),
                ),
              )
            else
              Icon(
                Icons.chevron_right_rounded,
                color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                size: 20,
              ),
          ],
        ),
      ),
    );
  }
}
