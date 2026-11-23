import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../widgets/animated_back_arrow.dart';

/// Screen 4: Membership Screen
class MembershipScreen extends StatefulWidget {
  final String currentPlan;

  const MembershipScreen({
    super.key,
    this.currentPlan = 'Plus',
  });

  @override
  State<MembershipScreen> createState() => _MembershipScreenState();
}

class _MembershipScreenState extends State<MembershipScreen> {
  late String _currentPlan;

  @override
  void initState() {
    super.initState();
    _currentPlan = widget.currentPlan;
  }

  void _showUpgradeModal() {
    final isLight = AppTheme.isLightNotifier.value;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1728),
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        side: BorderSide(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
        ),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'CarQConnect Premium',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Includes Free OBD-II 4G Device',
                          style: TextStyle(
                            color: Color(0xFF00E676),
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const Text(
                      '₹149/mo',
                      style: TextStyle(
                        color: Color(0xFF0066FF),
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                _buildBenefit('Free OBD-II 4G Hardware with real-time GPS', isLight),
                _buildBenefit('Unlimited Vehicle Profiles & Cloud Storage', isLight),
                _buildBenefit('24/7 Dedicated Concierge & SOS Dispatch', isLight),
                _buildBenefit('Up to 40% Discount on Fastag & Accessories', isLight),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () {
                      setState(() {
                        _currentPlan = 'Premium';
                      });
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                          content: Text(
                            'Upgraded to CarQConnect Premium! Welcome aboard.',
                            style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white),
                          ),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0066FF),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(26),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Subscribe to Premium',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildBenefit(String text, bool isLight) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          const Icon(Icons.check_circle_rounded,
              color: Color(0xFF0066FF), size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: isLight ? const Color(0xFF334155) : Colors.white,
                fontSize: 13.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isPremium = _currentPlan.toLowerCase() == 'premium';

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return PopScope(
          canPop: false,
          onPopInvokedWithResult: (didPop, result) {
            if (!didPop) {
              Navigator.pop(context, _currentPlan);
            }
          },
          child: Container(
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
              leading: AnimatedBackArrowButton(onTap: () => Navigator.pop(context, _currentPlan)),
                title: Text(
                  'Membership',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 18.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              body: SafeArea(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                  child: Column(
                    children: [
                      // Active Plan Card
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(22),
                        decoration: BoxDecoration(
                          color: isLight ? Colors.white : const Color(0xFF0B1426),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: isLight
                                ? const Color(0xFF93C5FD)
                                : const Color(0xFF00C2FF).withValues(alpha: 0.35),
                            width: 1.2,
                          ),
                          boxShadow: isLight
                              ? AppTheme.cardShadow
                              : [
                                  BoxShadow(
                                    color: const Color(0xFF00C2FF).withValues(alpha: 0.12),
                                    blurRadius: 24,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Title, subtitle and Crown graphic
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _currentPlan,
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                          fontSize: 26,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        'Drive smarter, stay safer.',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                          fontSize: 13,
                                        ),
                                      ),
                                      const SizedBox(height: 10),
                                      // Active Status Badge
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Container(
                                            width: 7,
                                            height: 7,
                                            decoration: const BoxDecoration(
                                              color: Color(0xFF00E676),
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          const Text(
                                            'Active',
                                            style: TextStyle(
                                              color: Color(0xFF00E676),
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                // Glowing Crown container
                                Container(
                                  width: 64,
                                  height: 64,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    gradient: RadialGradient(
                                      colors: [
                                        const Color(0xFF00C2FF).withValues(alpha: 0.35),
                                        const Color(0xFF0066FF).withValues(alpha: 0.1),
                                        Colors.transparent,
                                      ],
                                      stops: const [0.0, 0.65, 1.0],
                                    ),
                                  ),
                                  child: const Center(
                                    child: Icon(
                                      Icons.workspace_premium_rounded,
                                      color: Color(0xFF00C2FF),
                                      size: 38,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),

                            // Price and validity
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.baseline,
                              textBaseline: TextBaseline.alphabetic,
                              children: [
                                Text(
                                  '₹99',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    fontSize: 28,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  '/month',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'Valid till 12 Nov 2026',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 20),

                            Text(
                              'Top benefits',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 14),

                            // Features List
                            _buildFeatureItem('Vehicle safety & live tracking', isLight),
                            _buildFeatureItem('Priority SOS assistance', isLight),
                            _buildFeatureItem('Advanced trip insights & analytics', isLight),
                            _buildFeatureItem('Document storage (up to 15 files)', isLight),
                            _buildFeatureItem('Exclusive partner offers', isLight),
                            _buildFeatureItem('Up to 3 vehicles', isLight),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Bottom Upgrade Now Card
                      InkWell(
                        onTap: () {
                          if (isPremium) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                                content: Text(
                                  'You are already on the highest CarQConnect Premium plan!',
                                  style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white),
                                ),
                              ),
                            );
                          } else {
                            _showUpgradeModal();
                          }
                        },
                        borderRadius: BorderRadius.circular(18),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 18, vertical: 16),
                          decoration: BoxDecoration(
                            color: isLight ? Colors.white : const Color(0xFF0F1728),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
                              width: 1,
                            ),
                            boxShadow: isLight ? AppTheme.cardShadow : null,
                          ),
                          child: Row(
                            children: [
                              // Credit Card Icon box
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF162544),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isLight
                                        ? const Color(0xFFBFDBFE)
                                        : const Color(0xFF1E3A8A).withValues(alpha: 0.4),
                                  ),
                                ),
                                child: const Icon(
                                  Icons.credit_card_rounded,
                                  color: Color(0xFF0066FF),
                                  size: 22,
                                ),
                              ),
                              const SizedBox(width: 14),

                              // Text
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      isPremium ? 'Active Plan' : 'Upgrade Now',
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      isPremium
                                          ? 'Enjoy all premium features and free hardware.'
                                          : 'Get free OBD II when you upgrade to Premium Membership.',
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                        fontSize: 12,
                                        height: 1.3,
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              Icon(
                                isPremium
                                    ? Icons.check_circle_rounded
                                    : Icons.chevron_right_rounded,
                                color: isPremium
                                    ? const Color(0xFF00E676)
                                    : (isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                                size: 22,
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
            ),
          ),
        );
      },
    );
  }

  Widget _buildFeatureItem(String text, bool isLight) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        children: [
          Container(
            width: 22,
            height: 22,
            decoration: const BoxDecoration(
              color: Color(0xFF0066FF),
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(
                Icons.check_rounded,
                color: Colors.white,
                size: 15,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            text,
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
