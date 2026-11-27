import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_icons.dart';
import 'contact_support_screen.dart';
import '../../widgets/animated_back_arrow.dart';

class PolicySection {
  final int number;
  final String title;
  final String? intro;
  final List<Map<String, String>>? bullets;
  final String? content;

  const PolicySection({
    required this.number,
    required this.title,
    this.intro,
    this.bullets,
    this.content,
  });
}

/// Screen 3: Privacy Policy Screen
class PrivacyPolicyScreen extends StatefulWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  State<PrivacyPolicyScreen> createState() => _PrivacyPolicyScreenState();
}

class _PrivacyPolicyScreenState extends State<PrivacyPolicyScreen> {
  final Set<int> _expandedSections = {1}; // Section 1 expanded by default

  final List<PolicySection> _sections = const [
    PolicySection(
      number: 1,
      title: 'Information We Collect',
      intro:
          'We collect information to provide and improve our services, ensure safety, and give you a better experience. The types of information we may collect include:',
      bullets: [
        {
          'title': 'Personal Information',
          'desc': 'Name, mobile number, email address, and profile details.',
        },
        {
          'title': 'Vehicle Information',
          'desc': 'Vehicle number, make & model, registration details.',
        },
        {
          'title': 'Location Data',
          'desc':
              'Real-time and past location data to provide tracking and safety features.',
        },
        {
          'title': 'Usage Information',
          'desc':
              'App activity, device information, and diagnostics to improve our services.',
        },
      ],
    ),
    PolicySection(
      number: 2,
      title: 'How We Use Your Information',
      content:
          'We use the collected data to deliver core telematics capabilities, send critical emergency SOS alerts to designated contacts, provide vehicle health diagnostics, and personalize member benefits.',
    ),
    PolicySection(
      number: 3,
      title: 'Information Sharing',
      content:
          'We do not sell your personal information. Information is only shared with authorized roadside assistance providers during SOS triggers or emergency dispatches as configured in your profile.',
    ),
    PolicySection(
      number: 4,
      title: 'Data Security',
      content:
          'All telematics and telemetry streams are encrypted using end-to-end TLS 1.3 in transit and AES-256 at rest across certified secure cloud infrastructure.',
    ),
    PolicySection(
      number: 5,
      title: 'Your Rights',
      content:
          'You hold complete ownership of your vehicle logs and telemetry. You may request full data export or deletion of your profile directly through the app settings at any time.',
    ),
    PolicySection(
      number: 6,
      title: 'Cookies and Tracking',
      content:
          'Our mobile application uses local encrypted caching for token authentication and offline emergency protocol accessibility without external tracking cookies.',
    ),
    PolicySection(
      number: 7,
      title: 'Policy Updates',
      content:
          'We periodically update our privacy protocols to reflect new safety regulations and connected vehicle features. Registered users will receive in-app notices of any material modifications.',
    ),
    PolicySection(
      number: 8,
      title: 'Grievance Redressal (DPDP Act 2023)',
      content:
          'Under the Digital Personal Data Protection Act, 2023, you have the right to grievance redressal, right to access, and right to erasure. For any privacy grievances or to exercise your rights, you may contact our designated Grievance Officer at grievance@carqconnect.com or CarQConnect Technologies Pvt. Ltd., Indore, MP. Requests are acknowledged within 24 hours.',
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
                'Privacy Policy',
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
                    'At CarQConnect, we value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, share and protect your data when you use our app and services.',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                      fontSize: 13.5,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Accordion sections
                  ..._sections.map((section) => _buildSectionWidget(isLight, section)),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSectionWidget(bool isLight, PolicySection section) {
    final isExpanded = _expandedSections.contains(section.number);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.settingsCardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
          width: 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _toggleSection(section.number),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header row
                Row(
                  children: [
                    // Number circle
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF162544),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          '${section.number}',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0066FF) : Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Title
                    Expanded(
                      child: Text(
                        section.title,
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
                  if (section.intro != null) ...[
                    Text(
                      section.intro!,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (section.bullets != null) ...[
                    ...section.bullets!.map((b) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(
                                  Icons.circle,
                                  color: Color(0xFF0066FF),
                                  size: 7,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  b['title']!,
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Padding(
                              padding: const EdgeInsets.only(left: 15),
                              child: Text(
                                b['desc']!,
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                  fontSize: 12.5,
                                  height: 1.35,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                  if (section.content != null) ...[
                    Text(
                      section.content!,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
