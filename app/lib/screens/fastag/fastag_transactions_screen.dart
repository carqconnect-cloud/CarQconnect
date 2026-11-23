import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'fastag_models.dart';
import 'transaction_details_screen.dart';
import '../../utils/app_icons.dart';
import '../../widgets/animated_back_arrow.dart';

class FastagTransactionsScreen extends StatefulWidget {
  const FastagTransactionsScreen({super.key});

  @override
  State<FastagTransactionsScreen> createState() =>
      _FastagTransactionsScreenState();
}

class _FastagTransactionsScreenState extends State<FastagTransactionsScreen> {
  String _selectedFilter = 'All'; // 'All', 'Toll Payments', 'Recharge'

  List<FastagTransaction> get _filteredTransactions {
    if (_selectedFilter == 'Toll Payments') {
      return kSampleFastagTransactions.where((t) => t.isDebit).toList();
    } else if (_selectedFilter == 'Recharge') {
      return kSampleFastagTransactions.where((t) => !t.isDebit).toList();
    }
    return kSampleFastagTransactions;
  }

  @override
  Widget build(BuildContext context) {
    final transactions = _filteredTransactions;

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
                'Transactions',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            body: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 12),

                  // Filter Tabs Row
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        _buildFilterChip('All', isLight),
                        const SizedBox(width: 10),
                        _buildFilterChip('Toll Payments', isLight),
                        const SizedBox(width: 10),
                        _buildFilterChip('Recharge', isLight),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Transactions List
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: transactions.length,
                      itemBuilder: (context, index) {
                        final tx = transactions[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: InkWell(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) =>
                                      TransactionDetailsScreen(transaction: tx),
                                ),
                              );
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 14),
                              decoration: BoxDecoration(
                                color: isLight ? Colors.white : const Color(0xFF101726),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                                ),
                                boxShadow: isLight ? AppTheme.cardShadow : null,
                              ),
                              child: Row(
                                children: [
                                  // Left Icon in rounded colored square
                                  Container(
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                      color: isLight
                                          ? (tx.isToll
                                              ? tx.iconColor.withValues(alpha: 0.15)
                                              : const Color(0xFFDCFCE7))
                                          : tx.iconBgColor,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Center(
                                      child: tx.isToll
                                          ? TollBoothIcon(
                                              size: 22,
                                              color: isLight
                                                  ? (tx.iconColor == const Color(0xFFB388FF)
                                                      ? const Color(0xFF7C3AED)
                                                      : (tx.iconColor == const Color(0xFFFF5252)
                                                          ? const Color(0xFFDC2626)
                                                          : const Color(0xFF2563EB)))
                                                  : tx.iconColor,
                                            )
                                          : AppIcons.svg(
                                              AppIcons.refresh,
                                              color: isLight
                                                  ? const Color(0xFF16A34A)
                                                  : const Color(0xFF00E676),
                                              width: 22,
                                              height: 22,
                                            ),
                                    ),
                                  ),

                                  const SizedBox(width: 14),

                                  // Title & Subtitle (date + toll plaza / method)
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          tx.title,
                                          style: TextStyle(
                                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                            fontSize: 15,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          tx.subtitle,
                                          style: TextStyle(
                                            color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Amount on right (-₹85.00 or +₹500.00)
                                  Text(
                                    '${tx.isDebit ? '-' : '+'}₹${tx.amount.toStringAsFixed(2)}',
                                    style: TextStyle(
                                      color: tx.isDebit
                                          ? const Color(0xFFFF5252)
                                          : (isLight ? const Color(0xFF16A34A) : const Color(0xFF00E676)),
                                      fontSize: 15.5,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
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

  Widget _buildFilterChip(String label, bool isLight) {
    final bool isSelected = _selectedFilter == label;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedFilter = label;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.primaryColor
              : (isLight ? Colors.white : const Color(0xFF101726)),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? AppTheme.primaryColor
                : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C)),
          ),
          boxShadow: isLight && !isSelected ? AppTheme.cardShadow : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected
                ? Colors.white
                : (isLight ? const Color(0xFF64748B) : Colors.white),
            fontSize: 13.5,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
