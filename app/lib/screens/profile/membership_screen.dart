import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

import '../../globals.dart';
import '../../services/auth_storage_service.dart';
import '../../services/screen_refresh_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/api_config.dart';
import '../../widgets/animated_back_arrow.dart';
import '../subscription/subscription_screen.dart';

class MembershipScreen extends StatefulWidget {
  final String currentPlan;

  const MembershipScreen({
    super.key,
    this.currentPlan = '',
  });

  @override
  State<MembershipScreen> createState() => _MembershipScreenState();
}

class _MembershipScreenState extends State<MembershipScreen>
    with RefreshOnRouteReturn<MembershipScreen> {
  bool _isLoading = true;
  String? _error;

  String _planName = '';
  String _planDescription = '';
  String _status = '';
  double _price = 0;
  String? _validityLabel;
  List<Map<String, dynamic>> _features = [];
  List<Map<String, dynamic>> _allPlans = [];

  @override
  void initState() {
    super.initState();
    _planName = widget.currentPlan.isNotEmpty
        ? widget.currentPlan
        : Globals.currentPlan;
    Globals.currentPlanNotifier.addListener(_onPlanNotifierChanged);
    _fetchMembershipData();
  }

  void _onPlanNotifierChanged() {
    if (mounted) {
      setState(() {
        _planName = Globals.currentPlan;
      });
    }
  }

  @override
  void dispose() {
    Globals.currentPlanNotifier.removeListener(_onPlanNotifierChanged);
    super.dispose();
  }

  @override
  Future<void> refreshOnRouteReturn() => _fetchMembershipData(showSpinner: false);

  Future<void> _fetchMembershipData({bool showSpinner = true}) async {
    if (showSpinner && mounted) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      // 1. Fetch available plans catalog
      final plansRes = await http
          .get(
            ApiConfig.uri('/subscriptions/plans'),
            headers: {
              if (Globals.accessToken.isNotEmpty)
                'Authorization': 'Bearer ${Globals.accessToken}',
            },
          )
          .timeout(const Duration(seconds: 10));

      List<Map<String, dynamic>> parsedPlans = [];
      if (plansRes.statusCode == 200) {
        final decoded = jsonDecode(plansRes.body);
        if (decoded is Map &&
            decoded['success'] == true &&
            decoded['data'] is List) {
          parsedPlans = (decoded['data'] as List)
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
        }
      }

      // 2. Fetch user's current subscription from backend
      Map<String, dynamic>? activeSub;
      if (Globals.accessToken.isNotEmpty) {
        final myRes = await AuthStorageService.authenticatedGet(
          '/subscriptions/my',
        ).timeout(const Duration(seconds: 10));

        if (myRes.statusCode == 200) {
          final decoded = jsonDecode(myRes.body);
          if (decoded is Map &&
              decoded['success'] == true &&
              decoded['data'] is Map) {
            activeSub = Map<String, dynamic>.from(decoded['data'] as Map);
          }
        } else if (myRes.statusCode >= 500) {
          throw Exception('Server error (${myRes.statusCode})');
        }
      }

      if (!mounted) return;

      if (activeSub != null && activeSub['plan'] is Map) {
        final plan = Map<String, dynamic>.from(activeSub['plan'] as Map);
        final planName = (plan['name'] ?? 'Free').toString();
        final planId = (activeSub['planId'] ?? plan['id'] ?? '').toString();
        await Globals.saveCurrentPlan(planName, planId);

        setState(() {
          _allPlans = parsedPlans;
          _planName = planName;
          _planDescription = (plan['description'] ?? '').toString();
          _status = (activeSub!['status'] ?? 'ACTIVE').toString().toUpperCase();
          _price = _parsePrice(plan['price']);
          _validityLabel = _formatValidity(
            startDateRaw: activeSub['startDate'],
            endDateRaw: activeSub['endDate'],
            status: _status,
          );
          _features = _parseFeatures(plan['features']);
          _isLoading = false;
          _error = null;
        });
        return;
      }

      // If no paid subscription row exists yet, match the user's Free/default tier from real catalog
      Map<String, dynamic>? fallbackCatalogPlan;
      if (parsedPlans.isNotEmpty) {
        fallbackCatalogPlan = parsedPlans.firstWhere(
          (p) => (p['name'] ?? '').toString().toLowerCase() == 'free',
          orElse: () => parsedPlans.first,
        );
      }

      if (fallbackCatalogPlan != null) {
        final planName = (fallbackCatalogPlan['name'] ?? 'Free').toString();
        final planId = (fallbackCatalogPlan['id'] ?? '').toString();
        await Globals.saveCurrentPlan(planName, planId);

        setState(() {
          _allPlans = parsedPlans;
          _planName = planName;
          _planDescription = (fallbackCatalogPlan!['description'] ?? '').toString();
          _status = 'ACTIVE';
          _price = _parsePrice(fallbackCatalogPlan['price']);
          _validityLabel = _price <= 0 ? 'Free tier • No expiry' : 'Active';
          _features = _parseFeatures(fallbackCatalogPlan['features']);
          _isLoading = false;
          _error = null;
        });
      } else {
        setState(() {
          _isLoading = false;
          _error = Globals.accessToken.isEmpty
              ? 'Please log in to view your active membership.'
              : 'Unable to load membership details right now.';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = 'Could not load membership details. Pull down to retry.';
      });
    }
  }

  double _parsePrice(dynamic raw) {
    if (raw is num) return raw.toDouble();
    return double.tryParse(raw?.toString() ?? '') ?? 0.0;
  }

  String _formatValidity({
    dynamic startDateRaw,
    dynamic endDateRaw,
    required String status,
  }) {
    final endDt = endDateRaw != null
        ? DateTime.tryParse(endDateRaw.toString())?.toLocal()
        : null;
    if (endDt != null) {
      return 'Valid till ${DateFormat('dd MMM yyyy').format(endDt)}';
    }
    final startDt = startDateRaw != null
        ? DateTime.tryParse(startDateRaw.toString())?.toLocal()
        : null;
    if (startDt != null) {
      return 'Active since ${DateFormat('dd MMM yyyy').format(startDt)}';
    }
    return status == 'ACTIVE' ? 'Active Membership' : status;
  }

  List<Map<String, dynamic>> _parseFeatures(dynamic raw) {
    if (raw is! List) return [];
    final List<Map<String, dynamic>> result = [];
    for (final item in raw) {
      if (item is Map) {
        final title = (item['title'] ?? item['text'] ?? item['name'] ?? '').toString().trim();
        if (title.isEmpty) continue;
        final isIncluded = item['isIncluded'] ?? item['included'] ?? true;
        result.add({
          'title': title,
          'isIncluded': isIncluded == true,
        });
      } else if (item != null && item.toString().trim().isNotEmpty) {
        result.add({
          'title': item.toString().trim(),
          'isIncluded': true,
        });
      }
    }
    return result;
  }

  Future<void> _openSubscriptionPlans() async {
    int initialIndex = 0;
    if (_allPlans.isNotEmpty) {
      final matchedIdx = _allPlans.indexWhere(
        (p) => (p['name'] ?? '').toString().toLowerCase() == _planName.toLowerCase(),
      );
      if (matchedIdx != -1) {
        initialIndex = matchedIdx;
      }
    }
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => SubscriptionPlanScreen(initialPlanIndex: initialIndex),
      ),
    );
    await _fetchMembershipData(showSpinner: false);
  }

  @override
  Widget build(BuildContext context) {
    final lowerName = _planName.toLowerCase();
    final isHighestTier = lowerName == 'premium';
    final isActive = _status == 'ACTIVE' || _status.isEmpty;

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return PopScope(
          canPop: false,
          onPopInvokedWithResult: (didPop, result) {
            if (!didPop) {
              Navigator.pop(context, _planName);
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
                leading: AnimatedBackArrowButton(
                  onTap: () => Navigator.pop(context, _planName),
                ),
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
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : RefreshIndicator(
                        onRefresh: () => _fetchMembershipData(showSpinner: false),
                        child: SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(
                            parent: BouncingScrollPhysics(),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                            child: _error != null
                                ? _buildErrorState(isLight)
                                : Column(
                                    children: [
                                      _buildActivePlanCard(isLight, isActive),
                                      const SizedBox(height: 20),
                                      _buildChangePlanCard(isLight, isHighestTier),
                                    ],
                                  ),
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

  Widget _buildErrorState(bool isLight) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0B1426),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
        ),
      ),
      child: Column(
        children: [
          Icon(
            Icons.cloud_off_rounded,
            size: 40,
            color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
          ),
          const SizedBox(height: 12),
          Text(
            _error ?? 'Unable to load membership details',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              fontSize: 14.5,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _fetchMembershipData,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0066FF),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildActivePlanCard(bool isLight, bool isActive) {
    final priceText = _price <= 0
        ? '₹0'
        : '₹${_price.truncateToDouble() == _price ? _price.toInt() : _price.toStringAsFixed(2)}';
    final statusColor = isActive ? const Color(0xFF00E676) : const Color(0xFFF59E0B);
    final statusLabel = _status.isEmpty
        ? 'Active'
        : '${_status[0]}${_status.substring(1).toLowerCase()}';

    return Container(
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
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _planName.isEmpty ? 'Free' : _planName,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (_planDescription.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        _planDescription,
                        style: TextStyle(
                          color: isLight
                              ? const Color(0xFF64748B)
                              : const Color(0xFF8E9BAE),
                          fontSize: 13,
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: statusColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          statusLabel,
                          style: TextStyle(
                            color: statusColor,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
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
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                priceText,
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (_price > 0) ...[
                const SizedBox(width: 4),
                Text(
                  '/month',
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF64748B)
                        : const Color(0xFF8E9BAE),
                    fontSize: 13,
                  ),
                ),
              ],
            ],
          ),
          if (_validityLabel != null && _validityLabel!.isNotEmpty) ...[
            const SizedBox(height: 3),
            Text(
              _validityLabel!,
              style: TextStyle(
                color: isLight
                    ? const Color(0xFF94A3B8)
                    : const Color(0xFF64748B),
                fontSize: 12,
              ),
            ),
          ],
          if (_features.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(
              'Plan benefits',
              style: TextStyle(
                color: isLight
                    ? const Color(0xFF64748B)
                    : const Color(0xFF8E9BAE),
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 14),
            for (final feature in _features)
              _buildFeatureItem(
                feature['title'] as String,
                feature['isIncluded'] as bool,
                isLight,
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildChangePlanCard(bool isLight, bool isHighestTier) {
    return InkWell(
      onTap: _openSubscriptionPlans,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        decoration: BoxDecoration(
          color: AppTheme.settingsCardBg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
            width: 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: isLight
                    ? const Color(0xFFEFF6FF)
                    : const Color(0xFF162544),
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
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isHighestTier ? 'Manage Plan' : 'Upgrade or Change Plan',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    isHighestTier
                        ? 'View all CarQConnect plans and billing details.'
                        : 'Compare plans and upgrade securely via Razorpay.',
                    style: TextStyle(
                      color: isLight
                          ? const Color(0xFF64748B)
                          : const Color(0xFF8E9BAE),
                      fontSize: 12,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              color: isLight
                  ? const Color(0xFF94A3B8)
                  : const Color(0xFF64748B),
              size: 22,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureItem(String text, bool isIncluded, bool isLight) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              color: isIncluded
                  ? const Color(0xFF0066FF)
                  : (isLight
                        ? const Color(0xFFE2E8F0)
                        : const Color(0xFF1E293B)),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Icon(
                isIncluded ? Icons.check_rounded : Icons.close_rounded,
                color: isIncluded
                    ? Colors.white
                    : (isLight
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF64748B)),
                size: 14,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: isIncluded
                    ? (isLight ? const Color(0xFF0F172A) : Colors.white)
                    : (isLight
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF64748B)),
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
