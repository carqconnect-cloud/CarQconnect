import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'dart:convert';

import 'package:razorpay_flutter/razorpay_flutter.dart';

import '../../globals.dart';
import '../../utils/api_config.dart';
import '../../theme/app_theme.dart';
import 'review_details_screen.dart';
import 'payment_failed_screen.dart';
import '../../services/screen_refresh_service.dart';
import '../../services/auth_storage_service.dart';
import '../../widgets/animated_back_arrow.dart';
import '../../widgets/app_logo.dart';

class SubscriptionPlanScreen extends StatefulWidget {
  final int initialPlanIndex;

  const SubscriptionPlanScreen({
    super.key,
    this.initialPlanIndex = 2, // Default to Premium as shown in design
  });

  @override
  State<SubscriptionPlanScreen> createState() => _SubscriptionPlanScreenState();
}

class _SubscriptionPlanScreenState extends State<SubscriptionPlanScreen>
    with RefreshOnRouteReturn<SubscriptionPlanScreen> {
  late int _selectedPlanIndex; // 0: Free, 1: Basic, 2: Premium
  final PageController _pageController = PageController();

  List<String> _planTabs = ['Free', 'Basic', 'Premium'];
  List<Map<String, dynamic>> _plans = [];

  Razorpay? _razorpay;
  String? _pendingPlanId;
  String? _pendingPlanName;

  static final List<Map<String, dynamic>> _defaultPlans = [
    {
      'id': 'plan_free',
      'name': 'Free',
      'price': '0',
      'badge': null,
      'description': 'Essential features for everyday journeys.',
      'monthlyPrice': 0.0,
      'quarterlyPrice': 0.0,
      'yearlyPrice': 0.0,
      'buttonText': 'Get Started',
      'features': [
        {'title': 'Vehicle Profile (1 Car)', 'isIncluded': true},
        {'title': 'Basic Reminders', 'isIncluded': true},
        {'title': 'Document Storage (5 files)', 'isIncluded': true},
        {'title': 'Emergency Contacts (2)', 'isIncluded': true},
        {'title': 'Standard Support', 'isIncluded': true},
      ],
    },
    {
      'id': 'plan_basic',
      'name': 'Basic',
      'price': '99',
      'badge': 'POPULAR',
      'description': 'Smart monitoring for regular car owners.',
      'monthlyPrice': 99.0,
      'quarterlyPrice': 249.0,
      'yearlyPrice': 888.0,
      'buttonText': 'Get Started',
      'features': [
        {'title': 'Vehicle Profile (3 Cars)', 'isIncluded': true},
        {'title': 'All Smart Reminders', 'isIncluded': true},
        {'title': 'Document Storage (20 files)', 'isIncluded': true},
        {'title': 'Service History Log', 'isIncluded': true},
        {'title': 'Standard Support', 'isIncluded': true},
        {'title': 'Discount Partner Perks', 'isIncluded': true},
      ],
    },
    {
      'id': 'plan_premium',
      'name': 'Premium',
      'price': '149',
      'badge': 'ALL-ACCESS',
      'description': 'More convenience for everyday drivers.',
      'monthlyPrice': 149.0,
      'quarterlyPrice': 379.0,
      'yearlyPrice': 1188.0,
      'buttonText': 'Get Started',
      'features': [
        {'title': 'Vehicle Profile (Unlimited)', 'isIncluded': true},
        {'title': 'All Reminders', 'isIncluded': true},
        {'title': 'Document Storage (50 files)', 'isIncluded': true},
        {'title': 'Service History & Analytics', 'isIncluded': true},
        {'title': 'Priority Support', 'isIncluded': true},
        {'title': 'Exclusive Offers', 'isIncluded': true},
      ],
    },
  ];

  @override
  void initState() {
    super.initState();
    _selectedPlanIndex = widget.initialPlanIndex.clamp(0, 2);
    _plans = List.from(_defaultPlans);
    _syncPlansWithCurrentPlan();
    _planTabs = _plans.map((e) => e['name'] as String).toList();

    if (!kIsWeb) {
      try {
        _razorpay = Razorpay();
        _razorpay!.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
        _razorpay!.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
        _razorpay!.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
      } catch (e) {
        debugPrint('Razorpay init error: $e');
      }
    }

    Globals.loadCurrentPlan().then((_) {
      if (mounted) _syncPlansWithCurrentPlan();
    });
    Globals.currentPlanNotifier.addListener(_onPlanNotifierChanged);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_pageController.hasClients) {
        _pageController.jumpToPage(_selectedPlanIndex);
      }
    });

    _fetchPlans();
  }

  void _onPlanNotifierChanged() {
    if (mounted) _syncPlansWithCurrentPlan();
  }

  void _syncPlansWithCurrentPlan([String? activePlanId]) {
    final curPlan = Globals.currentPlan.toLowerCase();
    setState(() {
      _plans = _plans.map((e) {
        final pName = (e['name'] ?? '').toString();
        final pId = (e['id'] ?? '').toString();
        final isCurrent = (activePlanId != null && activePlanId.isNotEmpty)
            ? (pId == activePlanId || pName.toLowerCase() == activePlanId.toLowerCase())
            : (curPlan.isNotEmpty
                ? (pName.toLowerCase() == curPlan || (Globals.currentPlanId.isNotEmpty && pId == Globals.currentPlanId))
                : (pName.toLowerCase() == 'free'));
        return {
          ...e,
          'buttonText': isCurrent ? 'Current Plan' : 'Get Started',
        };
      }).toList();
    });
  }

  Future<void> _fetchPlans() async {
    try {
      final plansRes = await http
          .get(
            ApiConfig.uri('/subscriptions/plans'),
            headers: {
              if (Globals.accessToken.isNotEmpty)
                'Authorization': 'Bearer ${Globals.accessToken}',
            },
          )
          .timeout(const Duration(seconds: 5));

      String? activePlanId;
      if (Globals.accessToken.isNotEmpty) {
        try {
          final mySubRes = await AuthStorageService.authenticatedGet(
            '/subscriptions/my',
          ).timeout(const Duration(seconds: 5));

          if (mySubRes.statusCode == 200) {
            final mySubData = jsonDecode(mySubRes.body);
            if (mySubData['success'] == true && mySubData['data'] != null) {
              activePlanId = mySubData['data']['planId']?.toString();
              final planObj = mySubData['data']['plan'];
              if (planObj != null && planObj['name'] != null) {
                await Globals.saveCurrentPlan(planObj['name'], activePlanId ?? '');
              }
            }
          }
        } catch (_) {}
      }

      if (plansRes.statusCode == 200) {
        final data = jsonDecode(plansRes.body);
        if (data['success'] == true && data['data'] != null) {
          final List list = data['data'];
          if (list.isNotEmpty) {
            final curPlan = Globals.currentPlan.toLowerCase();
            setState(() {
              _plans = list.map((e) {
                final pName = (e['name'] ?? 'Plan').toString();
                final pId = (e['id'] ?? '').toString();
                final isCurrent = (activePlanId != null && activePlanId.isNotEmpty)
                    ? (pId == activePlanId || pName.toLowerCase() == activePlanId.toLowerCase())
                    : (curPlan.isNotEmpty
                        ? (pName.toLowerCase() == curPlan || (Globals.currentPlanId.isNotEmpty && pId == Globals.currentPlanId))
                        : (pName.toLowerCase() == 'free'));
                final isPrem = pName == 'Premium';
                final isBasic = pName == 'Basic';

                return {
                  'id': pId.isNotEmpty
                      ? pId
                      : (isPrem
                          ? 'plan_premium'
                          : isBasic
                              ? 'plan_basic'
                              : 'plan_free'),
                  'name': pName,
                  'price':
                      (e['price'] ??
                              (isPrem
                                  ? 149
                                  : isBasic
                                  ? 99
                                  : 0))
                          .toString(),
                  'badge':
                      e['badge'] ??
                      (isPrem
                          ? 'ALL-ACCESS'
                          : isBasic
                          ? 'POPULAR'
                          : null),
                  'description':
                      e['description'] ??
                      (isPrem
                          ? 'More convenience for everyday drivers.'
                          : isBasic
                          ? 'Smart monitoring for regular car owners.'
                          : 'Essential features for everyday journeys.'),
                  'monthlyPrice':
                      (e['monthlyPrice'] ??
                              (isPrem
                                  ? 149.0
                                  : isBasic
                                  ? 99.0
                                  : 0.0))
                          .toDouble(),
                  'quarterlyPrice':
                      (e['quarterlyPrice'] ??
                              (isPrem
                                  ? 379.0
                                  : isBasic
                                  ? 249.0
                                  : 0.0))
                          .toDouble(),
                  'yearlyPrice':
                      (e['yearlyPrice'] ??
                              (isPrem
                                  ? 1188.0
                                  : isBasic
                                  ? 888.0
                                  : 0.0))
                          .toDouble(),
                  'buttonText': isCurrent ? 'Current Plan' : 'Get Started',
                  'features':
                      e['features'] ??
                      (isPrem
                          ? _defaultPlans[2]['features']
                          : isBasic
                          ? _defaultPlans[1]['features']
                          : _defaultPlans[0]['features']),
                };
              }).toList();
              _planTabs = _plans.map((e) => e['name'] as String).toList();
            });
          }
        }
      } else {
        _syncPlansWithCurrentPlan();
      }
    } catch (e) {
      debugPrint('Error fetching plans: $e');
      if (mounted) _syncPlansWithCurrentPlan();
    }
  }

  void _onTabSelected(int index) {
    if (index == _selectedPlanIndex) return;
    setState(() {
      _selectedPlanIndex = index;
    });
    if (_pageController.hasClients) {
      _pageController.animateToPage(
        index,
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeInOutCubic,
      );
    }
  }

  void _showTenureSelector(Map<String, dynamic> plan) {
    final String planName = plan['name'];
    final double monthlyPrice =
        (plan['monthlyPrice'] as num?)?.toDouble() ??
        (planName == 'Premium' ? 149.0 : 99.0);
    final double quarterlyPrice =
        (plan['quarterlyPrice'] as num?)?.toDouble() ??
        (planName == 'Premium' ? 379.0 : 249.0);
    final double yearlyPrice =
        (plan['yearlyPrice'] as num?)?.toDouble() ??
        (planName == 'Premium' ? 1188.0 : 888.0);

    final double quarterlyPerMonth = quarterlyPrice / 3;
    final double yearlyPerMonth = yearlyPrice / 12;

    final int quarterlySavingsPercent = monthlyPrice > 0
        ? (((monthlyPrice * 3 - quarterlyPrice) / (monthlyPrice * 3)) * 100)
              .round()
        : 0;
    final int yearlySavingsPercent = monthlyPrice > 0
        ? (((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100)
              .round()
        : 0;

    String selectedTenure = 'yearly'; // Default selection matches design
    final isLight = AppTheme.isLightNotifier.value;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setStateModal) {
            return Container(
              decoration: BoxDecoration(
                color: isLight ? Colors.white : const Color(0xFF0D1525),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(28),
                ),
                border: Border(
                  top: BorderSide(
                    color: isLight
                        ? const Color(0xFFE2E8F0)
                        : const Color(0xFF1E2D4A),
                    width: 1.2,
                  ),
                ),
              ),
              padding: const EdgeInsets.fromLTRB(10, 12, 10, 24),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Top drag pill
                    Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(
                        color: isLight
                            ? const Color(0xFFCBD5E1)
                            : const Color(0xFF334155),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // CarQConnect Logo + Title
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        AppLogo(
                          width: 54,
                          height: 54,
                          isLight: isLight,
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'CarQConnect',
                          style: TextStyle(
                            color: isLight
                                ? const Color(0xFF0F172A)
                                : Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.3,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Dynamic Subtitle
                    Text(
                      selectedTenure == 'yearly'
                          ? 'Save $yearlySavingsPercent% with the Yearly plan'
                          : selectedTenure == 'quarterly'
                          ? 'Save $quarterlySavingsPercent% with the Quarterly plan'
                          : 'Flexible monthly plan • Cancel anytime',
                      style: TextStyle(
                        color: isLight
                            ? const Color(0xFF64748B)
                            : const Color(0xFF8E9BAE),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Three Selector Cards Side-by-Side: Monthly, Quarterly, Yearly (Maximized Width)
                    Row(
                      children: [
                        // Card 1: 1 Month
                        _buildTenureCard(
                          title: '1 month',
                          priceText: '₹${monthlyPrice.toInt()}',
                          subText: '₹${monthlyPrice.toStringAsFixed(0)} /mo',
                          isSelected: selectedTenure == 'monthly',
                          badgeText: 'STANDARD',
                          badgeColor: isLight
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF1E2D4A),
                          badgeTextColor: isLight
                              ? const Color(0xFF475569)
                              : const Color(0xFF8E9BAE),
                          onTap: () {
                            setStateModal(() => selectedTenure = 'monthly');
                          },
                          isLight: isLight,
                        ),
                        const SizedBox(width: 6),

                        // Card 2: 3 Months (Quarterly)
                        _buildTenureCard(
                          title: '3 months',
                          priceText: '₹${quarterlyPrice.toInt()}',
                          subText:
                              '₹${quarterlyPerMonth.toStringAsFixed(0)} /mo',
                          isSelected: selectedTenure == 'quarterly',
                          badgeText: 'SAVE $quarterlySavingsPercent%',
                          badgeColor: isLight
                              ? const Color(0xFF0066FF)
                              : const Color(0xFF00E5FF),
                          badgeTextColor: isLight
                              ? Colors.white
                              : const Color(0xFF060B14),
                          onTap: () {
                            setStateModal(() => selectedTenure = 'quarterly');
                          },
                          isLight: isLight,
                        ),
                        const SizedBox(width: 6),

                        // Card 3: 1 Year (Yearly)
                        _buildTenureCard(
                          title: '1 year',
                          priceText: '₹${yearlyPrice.toInt()}',
                          subText: '₹${yearlyPerMonth.toStringAsFixed(0)} /mo',
                          isSelected: selectedTenure == 'yearly',
                          badgeText: 'SAVE $yearlySavingsPercent%',
                          badgeColor: isLight
                              ? const Color(0xFF0066FF)
                              : const Color(0xFF00C2FF),
                          badgeTextColor: isLight
                              ? Colors.white
                              : const Color(0xFF060B14),
                          onTap: () {
                            setStateModal(() => selectedTenure = 'yearly');
                          },
                          isLight: isLight,
                        ),
                      ],
                    ),
                    const SizedBox(height: 22),

                    // Continue to Pay Now Button
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.pop(ctx);
                            final chosenPrice = selectedTenure == 'yearly'
                                ? yearlyPrice
                                : selectedTenure == 'quarterly'
                                ? quarterlyPrice
                                : monthlyPrice;
                            final double gst = chosenPrice * 0.18;
                            final double totalPrice = chosenPrice + gst;
                            final DateTime nextBillingDate =
                                selectedTenure == 'yearly'
                                ? DateTime.now().add(const Duration(days: 365))
                                : selectedTenure == 'quarterly'
                                ? DateTime.now().add(const Duration(days: 90))
                                : DateTime.now().add(const Duration(days: 30));

                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ReviewDetailsScreen(
                                  plan: plan,
                                  planName: planName,
                                  tenure: selectedTenure,
                                  subtotal: chosenPrice,
                                  gst: gst,
                                  totalPrice: totalPrice,
                                  nextBillingDate: nextBillingDate,
                                ),
                              ),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isLight
                                ? const Color(0xFF0066FF)
                                : const Color(0xFF00C2FF),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(26),
                            ),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Continue to Pay Now',
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
                                size: 18,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Recurring disclaimer
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      child: Text(
                        selectedTenure == 'yearly'
                            ? 'Recurring billing, cancel anytime. Save $yearlySavingsPercent% with Yearly plan compared to Monthly. Subscription auto-renews at same price until cancelled via App Store Settings.'
                            : selectedTenure == 'quarterly'
                            ? 'Recurring billing, cancel anytime. Save $quarterlySavingsPercent% with Quarterly plan compared to Monthly. Subscription auto-renews at same price until cancelled via App Store Settings.'
                            : 'Recurring billing, cancel anytime. Flexible monthly billing. Subscription auto-renews at same price until cancelled via App Store Settings.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF94A3B8)
                              : const Color(0xFF64748B),
                          fontSize: 10.5,
                          height: 1.35,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Terms & Privacy Links
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        GestureDetector(
                          onTap: () {},
                          child: Text(
                            'Terms & Conditions',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF0066FF)
                                  : const Color(0xFF00C2FF),
                              fontSize: 11,
                              decoration: TextDecoration.underline,
                              decorationColor: isLight
                                  ? const Color(0xFF0066FF)
                                  : const Color(0xFF00C2FF),
                            ),
                          ),
                        ),
                        Text(
                          ' • ',
                          style: TextStyle(
                            color: isLight
                                ? const Color(0xFF94A3B8)
                                : const Color(0xFF64748B),
                            fontSize: 11,
                          ),
                        ),
                        GestureDetector(
                          onTap: () {},
                          child: Text(
                            'Privacy Policy apply',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF0066FF)
                                  : const Color(0xFF00C2FF),
                              fontSize: 11,
                              decoration: TextDecoration.underline,
                              decorationColor: isLight
                                  ? const Color(0xFF0066FF)
                                  : const Color(0xFF00C2FF),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildTenureCard({
    required String title,
    required String priceText,
    required String subText,
    required bool isSelected,
    required VoidCallback onTap,
    String? badgeText,
    Color badgeColor = const Color(0xFF00C2FF),
    Color badgeTextColor = const Color(0xFF060B14),
    bool isLight = false,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.topCenter,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: double.infinity,
              height: 112,
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected
                    ? (isLight
                          ? const Color(0xFFEFF6FF)
                          : const Color(0xFF0A1424))
                    : (isLight
                          ? const Color(0xFFF8FAFC)
                          : const Color(0xFF111A2B)),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isSelected
                      ? (isLight
                            ? const Color(0xFF0066FF)
                            : const Color(0xFF00C2FF))
                      : (isLight
                            ? const Color(0xFFE2E8F0)
                            : const Color(0xFF1E2D4A)),
                  width: isSelected ? 1.8 : 1.0,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: 3),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      title,
                      style: TextStyle(
                        color: isSelected
                            ? (isLight ? const Color(0xFF0F172A) : Colors.white)
                            : (isLight
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF8E9BAE)),
                        fontSize: 12,
                        fontWeight: isSelected
                            ? FontWeight.w600
                            : FontWeight.w500,
                      ),
                      maxLines: 1,
                    ),
                  ),
                  const SizedBox(height: 3),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      priceText,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 19,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      subText,
                      style: TextStyle(
                        color: isSelected
                            ? (isLight
                                  ? const Color(0xFF0066FF)
                                  : const Color(0xFF00C2FF))
                            : (isLight
                                  ? const Color(0xFF94A3B8)
                                  : const Color(0xFF64748B)),
                        fontSize: 10.5,
                        fontWeight: isSelected
                            ? FontWeight.bold
                            : FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (badgeText != null)
              Positioned(
                top: -9,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: badgeColor,
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: Text(
                    badgeText,
                    style: TextStyle(
                      color: badgeTextColor,
                      fontSize: 8.5,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _activatePlan(
    String planId,
    String planName,
    String priceStr, {
    String tenure = 'monthly',
  }) async {
    final double price = double.tryParse(priceStr) ?? 0;
    if (price == 0) {
      await Globals.saveCurrentPlan(planName, planId);
      _syncPlansWithCurrentPlan(planId);
      ScreenRefreshService.notifyRefreshed();

      try {
        final response = await AuthStorageService.authenticatedPost(
          '/subscriptions/activate',
          {'planId': planId, 'planName': planName},
        ).timeout(const Duration(seconds: 8));

        if (response.statusCode == 200) {
          if (!mounted) return;
          _showSuccessSnackBar('CarQConnect $planName activated successfully!');
          _fetchPlans();
        }
      } catch (e) {
        debugPrint('Error activating free plan: $e');
      }
      return;
    }

    setState(() {
      _pendingPlanId = planId;
      _pendingPlanName = planName;
    });

    String? orderId;
    try {
      final response = await AuthStorageService.authenticatedPost(
        '/subscriptions/create-order',
        {
          'amount': price,
          'planId': planId,
          'tenure': tenure,
        },
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final orderData = data['data'];
        if (orderData != null && orderData['id'] != null) {
          orderId = orderData['id']?.toString();
        }
      }
    } catch (e) {
      debugPrint('Error creating razorpay order: $e');
    }

    if (!kIsWeb && _razorpay != null) {
      try {
        final cleanPhone = Globals.phone.replaceAll(RegExp(r'[^0-9]'), '');
        final prefillPhone = cleanPhone.length >= 10
            ? cleanPhone.substring(cleanPhone.length - 10)
            : '';
        final prefillEmail = Globals.email.contains('@')
            ? Globals.email
            : '';

        final options = <String, dynamic>{
          'key': 'rzp_test_Tm9BKNGeBE7GAx',
          'amount': (price * 100).round(),
          'currency': 'INR',
          'name': 'CarQConnect',
          'description': '$planName Subscription ($tenure)',
          'theme': {'color': '#16393F'},
          if (prefillPhone.isNotEmpty || prefillEmail.isNotEmpty)
            'prefill': {
              if (prefillPhone.isNotEmpty) 'contact': prefillPhone,
              if (prefillEmail.isNotEmpty) 'email': prefillEmail,
            },
          'external': {
            'wallets': ['paytm']
          }
        };

        if (orderId != null &&
            orderId.startsWith('order_') &&
            !orderId.startsWith('order_sim_')) {
          options['order_id'] = orderId;
        }

        _razorpay!.open(options);
        return;
      } catch (e) {
        debugPrint('Failed to open Razorpay in subscription screen: $e');
      }
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Payment gateway is currently unavailable. Please try again.'),
        duration: Duration(seconds: 3),
      ),
    );
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) async {
    if (_pendingPlanId == null) return;
    final planName = _pendingPlanName ?? 'Plan';
    final planId = _pendingPlanId!;

    await Globals.saveCurrentPlan(planName, planId);
    _syncPlansWithCurrentPlan(planId);
    ScreenRefreshService.notifyRefreshed();

    try {
      await AuthStorageService.authenticatedPost(
        '/subscriptions/verify-payment',
        {
          'razorpay_order_id': response.orderId ?? '',
          'razorpay_payment_id': response.paymentId ?? '',
          'razorpay_signature': response.signature ?? '',
          'planId': planId,
          'planName': planName,
        },
      ).timeout(const Duration(seconds: 8));

      if (!mounted) return;
      _showSuccessSnackBar(
        'CarQConnect $planName activated successfully!',
      );
      _fetchPlans();
    } catch (e) {
      debugPrint('Payment verification error: $e');
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PaymentFailedScreen(errorMessage: response.message),
      ),
    );
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('External Wallet: ${response.walletName}')),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(
              Icons.check_circle_rounded,
              color: Color(0xFF10B981),
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: const Color(0xFF0F1A2E),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  void dispose() {
    Globals.currentPlanNotifier.removeListener(_onPlanNotifierChanged);
    if (!kIsWeb) {
      try {
        _razorpay?.clear();
      } catch (_) {}
    }
    _pageController.dispose();
    super.dispose();
  }

  @override
  Future<void> refreshOnRouteReturn() async {
    await Globals.loadCurrentPlan();
    if (mounted) _syncPlansWithCurrentPlan();
    await _fetchPlans();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            color: isLight ? AppTheme.scaffoldBg : const Color(0xFF060B14),
            gradient: isLight
                ? AppTheme.bgGradient
                : const RadialGradient(
                    center: Alignment(0.8, -0.6),
                    radius: 1.2,
                    colors: [
                      Color(0xFF0D213B),
                      Color(0xFF070E1A),
                      Color(0xFF060A13),
                    ],
                  ),
          ),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            body: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Top App Bar: Back Arrow, Subscription Plan Title
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: Row(
                      children: [
                        AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                        Expanded(
                          child: Center(
                            child: Text(
                              'Subscription Plan',
                              style: TextStyle(
                                color: isLight
                                    ? const Color(0xFF0F172A)
                                    : Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.2,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 36), // balances back icon
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // 2. Headline & Subtitle
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Drive Smarter',
                          style: TextStyle(
                            color: isLight
                                ? const Color(0xFF0F172A)
                                : Colors.white,
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.4,
                            height: 1.15,
                          ),
                        ),
                        Text(
                          'with CarQConnect',
                          style: TextStyle(
                            color: isLight
                                ? const Color(0xFF0066FF)
                                : const Color(0xFF00C2FF),
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.4,
                            height: 1.15,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Choose a plan that fits your journey.',
                          style: TextStyle(
                            color: isLight
                                ? const Color(0xFF64748B)
                                : const Color(0xFF8E9BAE),
                            fontSize: 14,
                            letterSpacing: -0.1,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // 3. Plan Toggle Pills: Free | Basic | Premium
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 20),
                    padding: const EdgeInsets.all(3.5),
                    decoration: BoxDecoration(
                      color: isLight
                          ? const Color(0xFFE2E8F0)
                          : const Color(0xFF0D1525),
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(
                        color: isLight
                            ? const Color(0xFFCBD5E1)
                            : const Color(0xFF1C273C),
                        width: 1.0,
                      ),
                    ),
                    child: Row(
                      children: List.generate(_planTabs.length, (index) {
                        final isSelected = _selectedPlanIndex == index;
                        return Expanded(
                          child: GestureDetector(
                            onTap: () => _onTabSelected(index),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(
                                vertical: 9.5,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? (isLight
                                          ? const Color(0xFF0066FF)
                                          : const Color(0xFF00C2FF))
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(24),
                              ),
                              child: Text(
                                _planTabs[index],
                                style: TextStyle(
                                  color: isSelected
                                      ? Colors.white
                                      : (isLight
                                            ? const Color(0xFF64748B)
                                            : const Color(0xFF8E9BAE)),
                                  fontSize: 13.5,
                                  fontWeight: isSelected
                                      ? FontWeight.bold
                                      : FontWeight.w500,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 4. Swipeable Plan Cards PageView
                  Expanded(
                    child: PageView.builder(
                      controller: _pageController,
                      onPageChanged: (index) {
                        setState(() => _selectedPlanIndex = index);
                      },
                      itemCount: _plans.length,
                      physics: const BouncingScrollPhysics(),
                      itemBuilder: (context, index) {
                        return _buildPlanCardView(_plans[index], isLight);
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

  Widget _buildPlanCardView(Map<String, dynamic> plan, bool isLight) {
    final String name = plan['name'];
    final String price = plan['price'];
    final String? badge = plan['badge'];
    final String description = plan['description'];
    final String buttonText = plan['buttonText'];
    final List<dynamic> features = plan['features'];

    final bool isHighlighted = name != 'Free';

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          // The Big Plan Card
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: isLight ? Colors.white : const Color(0xFF0B1626),
              borderRadius: BorderRadius.circular(32),
              border: Border.all(
                color: isHighlighted
                    ? (isLight
                          ? const Color(0xFF0066FF)
                          : const Color(0xFF4CD6FB))
                    : (isLight
                          ? const Color(0xFFE2E8F0)
                          : const Color(0xFF1E2D4A)),
                width: isHighlighted ? 1.4 : 1.0,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header Row: Plan Name + Badge | Price /month
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                name,
                                style: TextStyle(
                                  color: isLight
                                      ? const Color(0xFF0F172A)
                                      : Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: -0.2,
                                ),
                              ),
                              if (badge != null) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 3,
                                  ),
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? const Color(0xFFEFF6FF)
                                        : const Color(0xFF082035),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                      color: isLight
                                          ? const Color(0xFFBFDBFE)
                                          : const Color(0xFF00C2FF)
                                                .withValues(alpha: 0.4),
                                    ),
                                  ),
                                  child: Text(
                                    badge,
                                    style: TextStyle(
                                      color: isLight
                                          ? const Color(0xFF0066FF)
                                          : const Color(0xFF00C2FF),
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            description,
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF8E9BAE),
                              fontSize: 13,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 14),

                    // Price Block
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        RichText(
                          text: TextSpan(
                            children: [
                              TextSpan(
                                text: '₹ ',
                                style: TextStyle(
                                  color: isLight
                                      ? const Color(0xFF0F172A)
                                      : Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              TextSpan(
                                text: price,
                                style: TextStyle(
                                  color: isLight
                                      ? const Color(0xFF0F172A)
                                      : Colors.white,
                                  fontSize: 32,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: -0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '/month',
                          style: TextStyle(
                            color: isLight
                                ? const Color(0xFF64748B)
                                : const Color(0xFF8E9BAE),
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Features list
                ...features.map((f) {
                  final String title = f['title'];
                  final bool isIncluded = f['isIncluded'] ?? true;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: Row(
                      children: [
                        if (isIncluded)
                          Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color: isLight
                                  ? const Color(0xFF0066FF)
                                  : const Color(0xFF00C2FF),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.check_rounded,
                              color: Colors.white,
                              size: 13,
                            ),
                          )
                        else
                          Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color: isLight
                                  ? const Color(0xFFF1F5F9)
                                  : const Color(0xFF1E2D4A)
                                        .withValues(alpha: 0.5),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.lock_outline_rounded,
                              color: isLight
                                  ? const Color(0xFF94A3B8)
                                  : const Color(0xFF475569),
                              size: 12,
                            ),
                          ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            title,
                            style: TextStyle(
                              color: isIncluded
                                  ? (isLight
                                        ? const Color(0xFF1E293B)
                                        : const Color(0xFFE2E8F0))
                                  : (isLight
                                        ? const Color(0xFF94A3B8)
                                        : const Color(0xFF64748B)),
                              fontSize: 13.5,
                              fontWeight: isIncluded
                                  ? FontWeight.w500
                                  : FontWeight.normal,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Security & Vault Note
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.check_circle_outline_rounded,
                color: Color(0xFF10B981),
                size: 15,
              ),
              const SizedBox(width: 6),
              Text(
                'Cancel anytime • Encrypted document vault',
                style: TextStyle(
                  color: isLight
                      ? const Color(0xFF64748B)
                      : const Color(0xFF8E9BAE),
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Action Button (Get Started ->)
          SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton(
              onPressed: buttonText == 'Current Plan'
                  ? null
                  : () {
                      if (name == 'Free') {
                        _activatePlan(plan['id'], name, '0');
                      } else {
                        // Open Yearly/Monthly Selector modal bottom sheet matching the design
                        _showTenureSelector(plan);
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: isLight
                    ? const Color(0xFF0066FF)
                    : const Color(0xFF00C2FF),
                disabledBackgroundColor: isLight
                    ? const Color(0xFFE2E8F0)
                    : const Color(0xFF1E2D4A),
                disabledForegroundColor: isLight
                    ? const Color(0xFF94A3B8)
                    : const Color(0xFF64748B),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(27),
                ),
                elevation: 0,
              ),
              child: buttonText == 'Current Plan'
                  ? const Text(
                      'Current Plan',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Get Started',
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
                          size: 18,
                        ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

}
