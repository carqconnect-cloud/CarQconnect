import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_icons.dart';
import 'contact_support_screen.dart';
import '../../widgets/animated_back_arrow.dart';

class TermSection {
  final int number;
  final String title;
  final String content;

  const TermSection({
    required this.number,
    required this.title,
    required this.content,
  });
}

/// Screen 4: Terms of Service Screen
class TermsOfServiceScreen extends StatefulWidget {
  const TermsOfServiceScreen({super.key});

  @override
  State<TermsOfServiceScreen> createState() => _TermsOfServiceScreenState();
}

class _TermsOfServiceScreenState extends State<TermsOfServiceScreen> {
  final Set<int> _expandedSections = {1}; // Section 1 expanded by default

  final List<TermSection> _terms = const [
    TermSection(
      number: 1,
      title: 'Acceptance of Terms',
      content:
          'By accessing or using CarQConnect, you agree to these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our app or services.\n\nWe may update these terms from time to time. Continued use of the app after changes are made constitutes your acceptance of the updated terms.',
    ),
    TermSection(
      number: 2,
      title: 'Use of Our Services',
      content:
          'CarQConnect provides vehicle telemetry, emergency dispatch coordination, Fastag balance tracking, and vehicle diagnostics. You must comply with local traffic laws while operating in-cabin systems.',
    ),
    TermSection(
      number: 3,
      title: 'User Responsibilities',
      content:
          'You are responsible for safeguarding your login credentials and maintaining accurate emergency contact configurations. CarQConnect is not liable for misconfigured emergency routing details.',
    ),
    TermSection(
      number: 4,
      title: 'Payments and Subscriptions',
      content:
          'Subscription fees are billed on a recurring monthly or annual basis. You may cancel your subscription at any time; access will remain effective until the end of the current billing cycle.',
    ),
    TermSection(
      number: 5,
      title: 'Intellectual Property',
      content:
          'All software, proprietary telematics algorithms, visual trademarks, and user interfaces remain the exclusive intellectual property of CarQConnect Technologies Inc.',
    ),
    TermSection(
      number: 6,
      title: 'Limitation of Liability',
      content:
          'CarQConnect provides connectivity tools on an as-is basis. While our systems provide high availability, we cannot guarantee uninterrupted cellular network or satellite GPS reception in remote zones.',
    ),
    TermSection(
      number: 7,
      title: 'Termination',
      content:
          'We reserve the right to suspend or terminate accounts that breach terms of service, engage in fraudulent chargebacks, or misuse emergency dispatch protocols.',
    ),
    TermSection(
      number: 8,
      title: 'Changes to Terms',
      content:
          'Any updates will be posted directly within the app alongside revision timestamps. Continued engagement signifies agreement to the refreshed parameters.',
    ),
  ];

  void _toggleSection(int num) {
    setState(() {
      if (_expandedSections.contains(num)) {
        _expandedSections.remove(num);
      } else {
        _expandedSections.add(num);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            gradient: AppTheme.bgGradient,
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
                'Terms of Service',
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
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: [
                  // Effective Date
                  const Text(
                    'Effective Date: 12 September 2026',
                    style: TextStyle(
                      color: Color(0xFF0066FF),
                      fontSize: 13.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Introductory paragraph
                  Text(
                    'By accessing or using CarQConnect, you agree to be bound by these Terms of Service. Please read them carefully before using our app and services.',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                      fontSize: 13.5,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Accordion sections
                  ..._terms.map((term) => _buildTermWidget(isLight, term)),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildTermWidget(bool isLight, TermSection term) {
    final isExpanded = _expandedSections.contains(term.number);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
          onTap: () => _toggleSection(term.number),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF162544),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          '${term.number}',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0066FF) : Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        term.title,
                        style: TextStyle(
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Icon(
                      isExpanded
                          ? Icons.keyboard_arrow_up_rounded
                          : Icons.keyboard_arrow_down_rounded,
                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                      size: 22,
                    ),
                  ],
                ),

                // Expanded content
                if (isExpanded) ...[
                  const SizedBox(height: 14),
                  Text(
                    term.content,
                    style: TextStyle(
                      color: isLight ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                      fontSize: 13,
                      height: 1.45,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
