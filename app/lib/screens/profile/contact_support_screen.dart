import 'package:flutter/material.dart';
import '../../utils/app_icons.dart';
import '../../theme/app_theme.dart';
import 'chat_support_screen.dart';
import 'raise_ticket_screen.dart';
import '../../widgets/animated_back_arrow.dart';

/// Screen 2: Contact Support Screen
class ContactSupportScreen extends StatelessWidget {
  const ContactSupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
                'Contact Support',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 18.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            body: SafeArea(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                children: [
                  // Option 1: Chat with us
                  _buildContactCard(
                    context: context,
                    icon: Icons.chat_bubble_outline_rounded,
                    title: 'Chat with us',
                    subtitle: 'Get instant help',
                    isLight: isLight,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const ChatSupportScreen(),
                        ),
                      );
                    },
                  ),

                  // Option 2: Call Us
                  _buildContactCard(
                    context: context,
                    icon: Icons.phone_rounded,
                    title: 'Call Us',
                    subtitle: '+91 98765 43210',
                    isLight: isLight,
                    onTap: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          backgroundColor: isLight ? Colors.white : const Color(0xFF0F1728),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: BorderSide(
                              color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
                            ),
                          ),
                          title: Text(
                            'Call Support Helpline',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 17,
                            ),
                          ),
                          content: Text(
                            'Would you like to place a call to our 24/7 priority customer helpline at +91 98765 43210?',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                              fontSize: 13.5,
                            ),
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(ctx),
                              child: Text(
                                'Cancel',
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                ),
                              ),
                            ),
                            ElevatedButton(
                              onPressed: () {
                                Navigator.pop(ctx);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                                    content: Text(
                                      'Dialing +91 98765 43210...',
                                      style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white),
                                    ),
                                  ),
                                );
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0066FF),
                                foregroundColor: Colors.white,
                              ),
                              child: const Text('Call Now'),
                            ),
                          ],
                        ),
                      );
                    },
                  ),

                  // Option 3: Email Us
                  _buildContactCard(
                    context: context,
                    icon: Icons.mail_outline_rounded,
                    title: 'Email Us',
                    subtitle: 'support@carqconnect.com',
                    isLight: isLight,
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                          content: Text(
                            'Opening email to support@carqconnect.com...',
                            style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white),
                          ),
                        ),
                      );
                    },
                  ),

                  // Option 4: Raise a Ticket
                  _buildContactCard(
                    context: context,
                    svgAsset: AppIcons.invoice,
                    title: 'Raise a Ticket',
                    subtitle: 'We\'ll get back to you',
                    isLight: isLight,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const RaiseTicketScreen(),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildContactCard({
    required BuildContext context,
    IconData? icon,
    String? svgAsset,
    required String title,
    required String subtitle,
    required bool isLight,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
          width: 1,
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Row(
              children: [
                // Cyan/Blue icon container
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
                  alignment: Alignment.center,
                  child: svgAsset != null
                      ? AppIcons.svg(
                          svgAsset,
                          color: const Color(0xFF0066FF),
                          width: 22,
                          height: 22,
                        )
                      : Icon(
                          icon ?? Icons.help_outline_rounded,
                          color: const Color(0xFF0066FF),
                          size: 22,
                        ),
                ),
                const SizedBox(width: 14),

                // Title & Subtitle
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          fontSize: 15.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        subtitle,
                        style: TextStyle(
                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),

                // Trailing Chevron
                Icon(
                  Icons.chevron_right_rounded,
                  color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  size: 22,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
