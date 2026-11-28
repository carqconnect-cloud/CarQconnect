import 'package:flutter/material.dart';

import 'dart:async';

import '../../theme/app_theme.dart';
import 'fastag_models.dart';
import 'add_fastag_screen.dart';
import 'recharge_fastag_screen.dart';
import 'fastag_transactions_screen.dart';
import '../../services/screen_refresh_service.dart';
import '../../widgets/animated_back_arrow.dart';

export 'add_fastag_screen.dart';
export 'select_bank_screen.dart';
export 'enter_details_screen.dart';
export 'recharge_fastag_screen.dart';
export 'fastag_transactions_screen.dart';
export 'transaction_details_screen.dart';
export 'payment_processing_screen.dart';
export 'recharge_success_screen.dart';
export 'fastag_models.dart';

class FastagScreen extends StatefulWidget {
  final FastagAccount? newAccount;

  const FastagScreen({super.key, this.newAccount});

  @override
  State<FastagScreen> createState() => _FastagScreenState();
}

class _FastagScreenState extends State<FastagScreen>
    with RefreshOnRouteReturn<FastagScreen> {
  late final List<FastagAccount> _accounts;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) _refreshFastags();
    });
    _accounts = [
      if (widget.newAccount != null) widget.newAccount!,
    ];
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _refreshFastags() async {
    await Future.delayed(const Duration(milliseconds: 300));
    if (mounted) {
      setState(() {});
    }
  }

  void _showFastagOptions(FastagAccount account) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0D1424),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Grab Handle matching Image 5
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFF475569),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Header: Bank Logo + Title + Vehicle Number
            Row(
              children: [
                BankLogoWidget(
                  bankName: account.bankName,
                  assetPath: account.logoAsset,
                  size: 42,
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      account.bankName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      account.vehicleNumber,
                      style: const TextStyle(
                        color: Color(0xFF8E9BAE),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Option 1: Transactions
            InkWell(
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const FastagTransactionsScreen(),
                  ),
                );
              },
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF101726),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF1C273C)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFF14243B),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.calendar_month_outlined,
                          color: Color(0xFF00C2FF),
                          size: 20,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Text(
                      'Transactions',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Option 2: Help & Support
            InkWell(
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    backgroundColor: Color(0xFF101726),
                    content: Text(
                      'For FASTag support, please visit Account > Help & Support.',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                );
              },
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF101726),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF1C273C)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFF14243B),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.help_outline_rounded,
                          color: Color(0xFF00C2FF),
                          size: 22,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Text(
                      'Help & Support',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Option 3: Delete Tag
            InkWell(
              onTap: () {
                Navigator.pop(ctx);
                _confirmDeleteTag(account);
              },
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF101726),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF1C273C)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFF261216),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.delete_outline_rounded,
                          color: Color(0xFFFF3B30),
                          size: 20,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Text(
                      'Delete Tag',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDeleteTag(FastagAccount account) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF101726),
        title: const Text(
          'Delete FASTag',
          style: TextStyle(color: Colors.white),
        ),
        content: Text(
          'Are you sure you want to remove ${account.bankName} (${account.vehicleNumber})?',
          style: const TextStyle(color: Color(0xFFCBD5E1)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Cancel',
              style: TextStyle(color: Color(0xFF8E9BAE)),
            ),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _accounts.removeWhere((item) => item.id == account.id);
              });
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  backgroundColor: Color(0xFF2D1214),
                  content: Text(
                    'FASTag deleted successfully',
                    style: TextStyle(color: Color(0xFFFF5252)),
                  ),
                ),
              );
            },
            child: const Text(
              'Delete',
              style: TextStyle(color: Color(0xFFFF3B30)),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Future<void> refreshOnRouteReturn() => _refreshFastags();

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(gradient: AppTheme.bgGradient),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            appBar: AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              centerTitle: true,
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () {
                  if (Navigator.canPop(context)) {
                    Navigator.pop(context);
                  }
                }),
              title: Text(
                'FASTag',
                style: TextStyle(
                  color: AppTheme.textPrimary,
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
                    child: RefreshIndicator(
                      color: AppTheme.primaryColor,
                      backgroundColor: AppTheme.cardBg,
                      onRefresh: _refreshFastags,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 12),

                            // Empty State or Linked FASTag Cards List
                            if (_accounts.isEmpty)
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 20,
                                  vertical: 32,
                                ),
                                margin: const EdgeInsets.only(bottom: 14),
                                decoration: BoxDecoration(
                                  color: AppTheme.cardBg,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: AppTheme.cardBorder,
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.credit_card_off_outlined,
                                      color: AppTheme.textSecondary,
                                      size: 40,
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      'No FASTag Linked Yet',
                                      style: TextStyle(
                                        color: AppTheme.textPrimary,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      'Tap "Add New FASTag" below to link your vehicle FASTag for balance checks and recharges.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: AppTheme.textSecondary,
                                        fontSize: 13,
                                        height: 1.4,
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            else
                              ..._accounts.map((account) {
                              return InkWell(
                                onTap: () async {
                                  await Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          RechargeFastagScreen(
                                            account: account,
                                          ),
                                    ),
                                  );
                                  if (mounted) {
                                    _refreshFastags();
                                  }
                                },
                                borderRadius: BorderRadius.circular(16),
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 14),
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: AppTheme.cardBg,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: AppTheme.cardBorder,
                                    ),
                                    boxShadow: AppTheme.cardShadow,
                                  ),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.center,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              account.bankName,
                                              style: TextStyle(
                                                color: AppTheme.textPrimary,
                                                fontSize: 15,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              account.vehicleNumber,
                                              style: TextStyle(
                                                color: AppTheme.textSecondary,
                                                fontSize: 13,
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                            const SizedBox(height: 6),
                                            Text(
                                              account.statusMessage ?? '',
                                              style: TextStyle(
                                                color: account.isLowBalance
                                                    ? const Color(0xFFFF5252)
                                                    : AppTheme.textSecondary,
                                                fontSize: 12.5,
                                                fontWeight: account.isLowBalance
                                                    ? FontWeight.bold
                                                    : FontWeight.w400,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      IconButton(
                                        icon: Icon(
                                          Icons.more_vert,
                                          color: AppTheme.textSecondary,
                                          size: 20,
                                        ),
                                        onPressed: () =>
                                            _showFastagOptions(account),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }),

                            const SizedBox(height: 20),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Bottom Add New FASTag Button
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
                    decoration: const BoxDecoration(color: Colors.transparent),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const AddFastagScreen(),
                            ),
                          );
                          if (mounted) {
                            _refreshFastags();
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: isLight
                              ? Colors.white
                              : Colors.black,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(26),
                          ),
                        ),
                        icon: Icon(
                          Icons.add,
                          color: isLight ? Colors.white : Colors.black,
                          size: 20,
                        ),
                        label: Text(
                          'Add New FASTag',
                          style: TextStyle(
                            color: isLight ? Colors.white : Colors.black,
                            fontSize: 15.5,
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
}
