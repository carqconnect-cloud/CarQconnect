import 'package:flutter/material.dart';
import '../../utils/app_icons.dart';
import '../../theme/app_theme.dart';
import 'contact_support_screen.dart';
import 'chat_support_screen.dart';
import '../../widgets/animated_back_arrow.dart';

class FaqItem {
  final String id;
  final String category;
  final String question;
  final String answer;

  const FaqItem({
    required this.id,
    required this.category,
    required this.question,
    required this.answer,
  });
}

/// Screen 4: Help & Support Screen
class HelpSupportScreen extends StatefulWidget {
  const HelpSupportScreen({super.key});

  @override
  State<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

class _HelpSupportScreenState extends State<HelpSupportScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'All';

  // Track expanded questions by ID
  final Set<String> _expandedIds = {'qr_1'}; // First item expanded by default

  final List<String> _categories = [
    'All',
    'QR Tag',
    'Tracking',
    'Trips',
    'SOS',
  ];

  final List<FaqItem> _faqList = [
    // QR TAG
    const FaqItem(
      id: 'qr_1',
      category: 'QR TAG',
      question: 'How do I activate my CarQConnect QR tag?',
      answer: 'You can activate your CarQConnect QR tag by following these steps:\n\n'
          '1. Open the CarQConnect app and go to QR Tag section.\n'
          '2. Tap on "Activate New Tag".\n'
          '3. Scan the QR code on your tag.\n'
          '4. Confirm the vehicle details and save.',
    ),
    const FaqItem(
      id: 'qr_2',
      category: 'QR TAG',
      question: 'Where should I place the QR tag?',
      answer:
          'Place the QR tag on your vehicle\'s windshield or near the driver-side door window where it is easily scannable and visible from outside.',
    ),
    const FaqItem(
      id: 'qr_3',
      category: 'QR TAG',
      question: 'What should I do if my QR tag is lost?',
      answer:
          'If lost or damaged, you can deactivate the current tag instantly from the QR Tag settings and request a free replacement tag.',
    ),

    // WALLET & PAYMENTS
    const FaqItem(
      id: 'wallet_1',
      category: 'WALLET & PAYMENTS',
      question: 'How do I add money to Zap Wallet?',
      answer:
          'Go to Zap Wallet from your Home screen, tap "Top Up", choose UPI, Credit/Debit Card or Net Banking, enter the amount and complete the payment.',
    ),
    const FaqItem(
      id: 'wallet_2',
      category: 'WALLET & PAYMENTS',
      question: 'How long does a refund take?',
      answer:
          'Refunds to Zap Wallet are credited instantly. Refunds to original payment source (bank account or card) usually take 3-5 business days.',
    ),

    // ACCOUNT
    const FaqItem(
      id: 'account_1',
      category: 'ACCOUNT',
      question: 'How do I change my phone number?',
      answer:
          'Navigate to Account > Personal Information > Phone Number. Tap "Edit", enter your new phone number, and verify it via the OTP sent to your new number.',
    ),
    const FaqItem(
      id: 'account_2',
      category: 'ACCOUNT',
      question: 'How do referrals work?',
      answer:
          'Share your unique referral link with friends. When they register and activate their first vehicle or QR tag, both of you receive ₹100 in your Zap Wallet.',
    ),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _toggleFaq(String id) {
    setState(() {
      if (_expandedIds.contains(id)) {
        _expandedIds.remove(id);
      } else {
        _expandedIds.add(id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final query = _searchController.text.trim().toLowerCase();

    // Filter FAQs based on category & search query
    final filteredFaqs = _faqList.where((item) {
      final matchesSearch = query.isEmpty ||
          item.question.toLowerCase().contains(query) ||
          item.answer.toLowerCase().contains(query);

      final matchesCategory = _selectedCategory == 'All' ||
          item.category.toUpperCase().contains(_selectedCategory.toUpperCase());

      return matchesSearch && matchesCategory;
    }).toList();

    // Group filtered FAQs by Category
    final Map<String, List<FaqItem>> groupedFaqs = {};
    for (var item in filteredFaqs) {
      groupedFaqs.putIfAbsent(item.category, () => []).add(item);
    }

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
                'Help & Support',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 18.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
              actions: [
                IconButton(
                  icon: AppIcons.svg(
                    AppIcons.customerSupport,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    width: 22,
                    height: 22,
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const ContactSupportScreen(),
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
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Search Bar
                          _buildSearchBar(isLight),
                          const SizedBox(height: 16),

                          // Filter Chips Horizontal Row
                          _buildCategoryChips(isLight),
                          const SizedBox(height: 20),

                          // Active Ticket Banner Card
                          _buildActiveTicketBanner(isLight),

                          // FAQ Categories
                          if (groupedFaqs.isEmpty)
                            Center(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 40),
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.search_off_rounded,
                                      color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF475569),
                                      size: 48,
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      'No matching questions found',
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                        fontSize: 15,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            )
                          else
                            ...groupedFaqs.entries.map((entry) {
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    entry.key,
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Container(
                                    decoration: BoxDecoration(
                                      color: isLight ? Colors.white : const Color(0xFF0F1728),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
                                        width: 1,
                                      ),
                                      boxShadow: isLight ? AppTheme.cardShadow : null,
                                    ),
                                    child: Column(
                                      children: [
                                        for (int i = 0; i < entry.value.length; i++) ...[
                                          _buildFaqItemWidget(entry.value[i], isLight),
                                          if (i < entry.value.length - 1)
                                            Divider(
                                              color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1B263C),
                                              height: 1,
                                            ),
                                        ],
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 22),
                                ],
                              );
                            }),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Support Card
                  _buildBottomSupportCard(isLight),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSearchBar(bool isLight) {
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
          width: 1,
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (_) => setState(() {}),
        style: TextStyle(
          color: isLight ? const Color(0xFF0F172A) : Colors.white,
          fontSize: 14.5,
        ),
        decoration: InputDecoration(
          hintText: 'Search for help...',
          hintStyle: TextStyle(
            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            fontSize: 14,
          ),
          prefixIcon: Icon(
            Icons.search_rounded,
            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            size: 20,
          ),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: Icon(
                    Icons.clear_rounded,
                    color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    size: 18,
                  ),
                  onPressed: () {
                    _searchController.clear();
                    setState(() {});
                  },
                )
              : null,
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _buildCategoryChips(bool isLight) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      clipBehavior: Clip.none,
      child: Row(
        children: [
          ..._categories.map((cat) {
            final isSelected = cat == _selectedCategory;
            final iconColor = isSelected
                ? Colors.white
                : (isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE));

            Widget chipIcon;
            if (cat == 'All') {
              chipIcon = Icon(Icons.tune_rounded, size: 15, color: iconColor);
            } else if (cat == 'QR Tag') {
              chipIcon = Icon(Icons.qr_code_2_rounded, size: 15, color: iconColor);
            } else if (cat == 'Tracking') {
              chipIcon = AppIcons.svg(AppIcons.navigation, width: 13, height: 13, color: iconColor);
            } else if (cat == 'Trips') {
              chipIcon = AppIcons.svg(AppIcons.car, width: 14, height: 14, color: iconColor);
            } else {
              chipIcon = AppIcons.svg(AppIcons.emergency, width: 13, height: 13, color: iconColor);
            }

            return Container(
              margin: const EdgeInsets.only(right: 8),
              child: InkWell(
                onTap: () {
                  setState(() {
                    _selectedCategory = cat;
                  });
                },
                borderRadius: BorderRadius.circular(20),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? const Color(0xFF0066FF)
                        : (isLight ? Colors.white : const Color(0xFF0F1728)),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isSelected
                          ? const Color(0xFF0066FF)
                          : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44)),
                      width: 1,
                    ),
                    boxShadow: (!isSelected && isLight) ? AppTheme.cardShadow : null,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      chipIcon,
                      const SizedBox(width: 5),
                      Text(
                        cat,
                        style: TextStyle(
                          color: isSelected
                              ? Colors.white
                              : (isLight ? const Color(0xFF0F172A) : const Color(0xFFCBD5E1)),
                          fontSize: 12.5,
                          fontWeight:
                              isSelected ? FontWeight.bold : FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
          const SizedBox(width: 12),
        ],
      ),
    );
  }

  Widget _buildFaqItemWidget(FaqItem item, bool isLight) {
    final isExpanded = _expandedIds.contains(item.id);

    return InkWell(
      onTap: () => _toggleFaq(item.id),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    item.question,
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  isExpanded
                      ? Icons.keyboard_arrow_up_rounded
                      : Icons.keyboard_arrow_down_rounded,
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                  size: 22,
                ),
              ],
            ),
            if (isExpanded) ...[
              const SizedBox(height: 12),
              Text(
                item.answer,
                style: TextStyle(
                  color: isLight ? const Color(0xFF475569) : const Color(0xFFCBD5E1),
                  fontSize: 13.5,
                  height: 1.45,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBottomSupportCard(bool isLight) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppTheme.settingsCardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
          width: 1,
        ),
        boxShadow: AppTheme.settingsCardShadow,
      ),
      child: Row(
        children: [
          // Chat Icon Box
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF0C2442),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isLight
                    ? const Color(0xFFBFDBFE)
                    : const Color(0xFF0284C7).withValues(alpha: 0.35),
                width: 1,
              ),
            ),
            child: const Icon(
              Icons.chat_bubble_outline_rounded,
              color: Color(0xFF0066FF),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),

          // Texts
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Still need help?',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Chat with our support team',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),

          // Chat Button
          ElevatedButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const ChatSupportScreen(),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0066FF),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              elevation: 0,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(
                  Icons.chat_bubble_outline_rounded,
                  color: Colors.white,
                  size: 15,
                ),
                SizedBox(width: 6),
                Text(
                  'Chat',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 13.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveTicketBanner(bool isLight) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: AppTheme.settingsCardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
          width: 1,
        ),
        boxShadow: AppTheme.settingsCardShadow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const ChatSupportScreen(
                  ticketId: '#FN123456',
                  category: 'QR Tag',
                  subject: 'New QR tag order',
                ),
              ),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Cyan Grid Icon Box
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF0C2442),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isLight
                              ? const Color(0xFFBFDBFE)
                              : const Color(0xFF0284C7).withValues(alpha: 0.35),
                        ),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(
                        Icons.grid_view_rounded,
                        color: Color(0xFF0066FF),
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Ticket ID & Category
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '#FN123456',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'QR Tag • New QR tag order',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                              fontSize: 12.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Open Amber Badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 3.5),
                      decoration: BoxDecoration(
                        color: isLight ? const Color(0xFFFEF3C7) : const Color(0xFF332005),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFFFFB300).withValues(alpha: 0.4),
                        ),
                      ),
                      child: const Text(
                        'Open',
                        style: TextStyle(
                          color: Color(0xFFD97706),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Bottom row with View Ticket link
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '12 Sep 2026',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                        fontSize: 12,
                      ),
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Text(
                          'View Ticket',
                          style: TextStyle(
                            color: Color(0xFF0066FF),
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(width: 4),
                        Icon(
                          Icons.arrow_forward_rounded,
                          color: Color(0xFF0066FF),
                          size: 15,
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
