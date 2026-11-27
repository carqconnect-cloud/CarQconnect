import 'package:flutter/material.dart';
import '../../utils/app_icons.dart';
import '../../theme/app_theme.dart';
import 'support_experience_screen.dart';
import '../../widgets/animated_back_arrow.dart';

class ChatMessage {
  final String id;
  final String text;
  final bool isUser;
  final String time;
  final bool isStepsCard;
  final List<String>? steps;
  final String? note;

  const ChatMessage({
    required this.id,
    required this.text,
    required this.isUser,
    required this.time,
    this.isStepsCard = false,
    this.steps,
    this.note,
  });
}

/// Screen 1: Chat Support Screen
class ChatSupportScreen extends StatefulWidget {
  final String? ticketId;
  final String? category;
  final String? subject;

  const ChatSupportScreen({
    super.key,
    this.ticketId,
    this.category,
    this.subject,
  });

  @override
  State<ChatSupportScreen> createState() => _ChatSupportScreenState();
}

class _ChatSupportScreenState extends State<ChatSupportScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  late List<ChatMessage> _messages;

  @override
  void initState() {
    super.initState();
    _initializeMessages();
  }

  void _initializeMessages() {
    final now = TimeOfDay.now();
    final hour = now.hourOfPeriod == 0 ? 12 : now.hourOfPeriod;
    final minute = now.minute.toString().padLeft(2, '0');
    final period = now.period == DayPeriod.am ? 'AM' : 'PM';
    final timeStr = '$hour:$minute $period';

    if (widget.ticketId != null && widget.ticketId!.isNotEmpty) {
      _messages = [
        ChatMessage(
          id: 'ticket_created',
          text: 'Ticket ${widget.ticketId} has been successfully logged.\n\n'
              '• Issue: ${widget.category ?? "Support Request"}\n'
              '${widget.subject != null && widget.subject!.isNotEmpty ? "• Subject: ${widget.subject}\n" : ""}'
              '• Status: Under Review\n'
              '• Expected response: Within 24 hours',
          isUser: false,
          time: timeStr,
        ),
        ChatMessage(
          id: 'ticket_welcome',
          text: 'Hello! Our customer support team has received your ticket and is actively reviewing it. '
              'You can provide any additional info or questions here and our team will get back to you shortly.',
          isUser: false,
          time: timeStr,
        ),
      ];
    } else {
      _messages = [
        const ChatMessage(
          id: '1',
          text: 'How do I renew my car insurance?',
          isUser: true,
          time: '10:30 AM',
        ),
        const ChatMessage(
          id: '2',
          text:
              'I can help you with that! You can renew your car insurance from the Services section. Would you like me to show you the steps?',
          isUser: false,
          time: '10:30 AM',
        ),
        const ChatMessage(
          id: '3',
          text: 'Yes, please.',
          isUser: true,
          time: '10:31 AM',
        ),
        const ChatMessage(
          id: '4',
          text: 'Here are the steps to renew your insurance:',
          isUser: false,
          time: '10:31 AM',
          isStepsCard: true,
          steps: [
            'Go to Services > Insurance',
            'Select your vehicle',
            'Choose a plan and make the payment',
            'You\'ll receive the updated policy on your registered email',
          ],
          note:
              'You can also renew directly from the Insurance section on your vehicle profile.',
        ),
      ];
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _sendMessage([String? presetText]) {
    final text = presetText ?? _textController.text.trim();
    if (text.isEmpty) return;

    final now = TimeOfDay.now();
    final hour = now.hourOfPeriod == 0 ? 12 : now.hourOfPeriod;
    final minute = now.minute.toString().padLeft(2, '0');
    final period = now.period == DayPeriod.am ? 'AM' : 'PM';
    final timeStr = '$hour:$minute $period';

    setState(() {
      _messages.add(
        ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          text: text,
          isUser: true,
          time: timeStr,
        ),
      );
    });

    if (presetText == null) {
      _textController.clear();
    }

    _scrollToBottom();

    // Auto-respond from bot
    Future.delayed(const Duration(milliseconds: 700), () {
      if (!mounted) return;
      final String replyText;
      if (widget.ticketId != null && widget.ticketId!.isNotEmpty) {
        final lower = text.toLowerCase();
        if (lower.contains('status')) {
          replyText =
              'Ticket ${widget.ticketId} is currently [Open / In Review]. Priority: Normal. Assigned to Customer Support. Expected turnaround is within 24 hours.';
        } else if (lower.contains('agent') || lower.contains('executive') || lower.contains('speak') || lower.contains('call')) {
          replyText =
              'A customer support executive has been notified regarding Ticket ${widget.ticketId}. An agent will join this chat thread shortly.';
        } else if (lower.contains('urgent') || lower.contains('escalate') || lower.contains('priority')) {
          replyText =
              'We have flagged Ticket ${widget.ticketId} as High Priority for our supervisor team.';
        } else {
          replyText =
              'Thank you for the update on Ticket ${widget.ticketId}. Your notes have been added to the ticket log. Our support team will respond shortly.';
        }
      } else {
        replyText =
            'Thank you for reaching out. A support representative will review this shortly or you can check our FAQs for instant answers.';
      }

      setState(() {
        _messages.add(
          ChatMessage(
            id: (DateTime.now().millisecondsSinceEpoch + 1).toString(),
            text: replyText,
            isUser: false,
            time: timeStr,
          ),
        );
      });
      _scrollToBottom();
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 80,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _openSupportExperience() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const SupportExperienceScreen(),
      ),
    );
  }

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
              title: widget.ticketId != null && widget.ticketId!.isNotEmpty
                  ? Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Chat Support',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                            fontSize: 16.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: Color(0xFF10B981),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 5),
                            Text(
                              'Ticket ${widget.ticketId}',
                              style: const TextStyle(
                                color: Color(0xFF0066FF),
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ],
                    )
                  : Text(
                      'Chat Support',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 18.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
              actions: [
                PopupMenuButton<String>(
                  icon: AppIcons.svg(
                    AppIcons.threeDots,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    width: 18,
                    height: 18,
                  ),
                  color: isLight ? Colors.white : const Color(0xFF10192D),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                    ),
                  ),
                  onSelected: (val) {
                    if (val == 'rate') {
                      _openSupportExperience();
                    } else if (val == 'clear') {
                      setState(() {
                        _messages.clear();
                      });
                    }
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: 'rate',
                      child: Row(
                        children: [
                          const Icon(Icons.star_outline_rounded,
                              color: Color(0xFF0066FF), size: 18),
                          const SizedBox(width: 10),
                          Text(
                            'Rate Support',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 13.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'clear',
                      child: Row(
                        children: [
                          Icon(Icons.delete_outline_rounded,
                              color: Color(0xFFFF5252), size: 18),
                          SizedBox(width: 10),
                          Text(
                            'Clear Chat',
                            style: TextStyle(color: Color(0xFFFF5252), fontSize: 13.5),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: ListView(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                      children: [
                        // Greeting Card at top
                        _buildWelcomeCard(isLight),
                        const SizedBox(height: 18),

                        // Messages List
                        ..._messages.map((msg) => _buildMessageItem(msg, isLight)),
                        const SizedBox(height: 12),

                        // Feedback / Quick Action Chips
                        _buildQuickChipsRow(isLight),
                      ],
                    ),
                  ),

                  // Bottom Message Input Box & Footer
                  _buildInputArea(isLight),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildTicketDetailsCard(bool isLight) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFF0066FF).withValues(alpha: isLight ? 0.3 : 0.4),
          width: 1.2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF0B2144),
                  border: Border.all(
                    color: const Color(0xFF0066FF).withValues(alpha: 0.5),
                    width: 1.5,
                  ),
                ),
                child: const Center(
                  child: Icon(
                    Icons.confirmation_number_outlined,
                    color: Color(0xFF0066FF),
                    size: 22,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          widget.ticketId!,
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: const Color(0xFF10B981).withValues(alpha: 0.5),
                            ),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.circle, color: Color(0xFF10B981), size: 6),
                              SizedBox(width: 4),
                              Text(
                                'Open',
                                style: TextStyle(
                                  color: Color(0xFF10B981),
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      widget.category ?? 'Support Ticket',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (widget.subject != null && widget.subject!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF0A101D),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.subject_rounded,
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      widget.subject!,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(
                Icons.schedule_rounded,
                size: 14,
                color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              ),
              const SizedBox(width: 6),
              Text(
                'Live ticket chat • Turnaround within 24 hours',
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildWelcomeCard(bool isLight) {
    if (widget.ticketId != null && widget.ticketId!.isNotEmpty) {
      return _buildTicketDetailsCard(isLight);
    }
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF0F1728),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A44),
          width: 1,
        ),
        boxShadow: isLight ? AppTheme.cardShadow : null,
      ),
      child: Row(
        children: [
          // Bot Avatar Circle
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF0B2144),
              border: Border.all(
                color: isLight
                    ? const Color(0xFFBFDBFE)
                    : const Color(0xFF00C2FF).withValues(alpha: 0.4),
                width: 1.5,
              ),
            ),
            child: const Center(
              child: Icon(
                Icons.smart_toy_rounded,
                color: Color(0xFF0066FF),
                size: 28,
              ),
            ),
          ),
          const SizedBox(width: 14),

          // Welcome text
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Hi there! 👋',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Welcome to CarQConnect Support',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'How can we help you today?',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageItem(ChatMessage msg, bool isLight) {
    if (msg.isUser) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.78,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF0066FF),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Text(
                msg.text,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  msg.time,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                    fontSize: 11.5,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(
                  Icons.done_all_rounded,
                  color: Color(0xFF0066FF),
                  size: 15,
                ),
              ],
            ),
          ],
        ),
      );
    }

    // Bot message
    if (msg.isStepsCard) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSmallBotIcon(isLight),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
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
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          msg.text,
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                            fontSize: 14.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Steps list
                        if (msg.steps != null)
                          ...msg.steps!.asMap().entries.map((entry) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 20,
                                    height: 20,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFF0066FF),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Center(
                                      child: Text(
                                        '${entry.key + 1}',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      entry.value,
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF334155) : Colors.white,
                                        fontSize: 13.5,
                                        height: 1.3,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),

                        if (msg.note != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            msg.note!,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                              fontSize: 12.5,
                              height: 1.35,
                            ),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Text(
                          msg.time,
                          style: TextStyle(
                            color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            fontSize: 11,
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Action Button 1: Open Insurance Section
                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: ElevatedButton(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                                  content: Text(
                                    'Navigating to Insurance Section...',
                                    style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white),
                                  ),
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0066FF),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              elevation: 0,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                Icon(Icons.open_in_new_rounded,
                                    color: Colors.white, size: 16),
                                SizedBox(width: 8),
                                Text(
                                  'Open Insurance Section',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Action Button 2: Talk to a Support Agent
                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: OutlinedButton(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                                  content: Text(
                                    'Connecting you with an agent...',
                                    style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white),
                                  ),
                                ),
                              );
                            },
                            style: OutlinedButton.styleFrom(
                              backgroundColor: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF090D16),
                              side: BorderSide(
                                color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1B263C),
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                AppIcons.svg(
                                  AppIcons.customerSupport,
                                  color: const Color(0xFF0066FF),
                                  width: 16,
                                  height: 16,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Talk to a Support Agent',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    fontSize: 13.5,
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
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSmallBotIcon(isLight),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * 0.78,
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isLight ? Colors.white : const Color(0xFF0F1728),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
                      width: 1,
                    ),
                    boxShadow: isLight ? AppTheme.cardShadow : null,
                  ),
                  child: Text(
                    msg.text,
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0),
                      fontSize: 14,
                      height: 1.35,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  msg.time,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSmallBotIcon(bool isLight) {
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF0B2144),
        border: Border.all(
          color: isLight
              ? const Color(0xFFBFDBFE)
              : const Color(0xFF00C2FF).withValues(alpha: 0.5),
        ),
      ),
      child: const Center(
        child: Icon(
          Icons.smart_toy_outlined,
          color: Color(0xFF0066FF),
          size: 15,
        ),
      ),
    );
  }

  Widget _buildQuickChipsRow(bool isLight) {
    if (widget.ticketId != null && widget.ticketId!.isNotEmpty) {
      return SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildChip(
              icon: Icons.info_outline_rounded,
              iconColor: const Color(0xFF0066FF),
              label: 'Ticket Status',
              isLight: isLight,
              onTap: () {
                _sendMessage('What is the current status of my ticket?');
              },
            ),
            const SizedBox(width: 8),
            _buildChip(
              icon: Icons.headset_mic_outlined,
              iconColor: const Color(0xFF10B981),
              label: 'Talk to Agent',
              isLight: isLight,
              onTap: () {
                _sendMessage('I want to speak with a customer support executive.');
              },
            ),
            const SizedBox(width: 8),
            _buildChip(
              icon: Icons.priority_high_rounded,
              iconColor: const Color(0xFFFFB300),
              label: 'Need Urgent Help',
              isLight: isLight,
              onTap: () {
                _sendMessage('This issue is urgent, please escalate.');
              },
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _buildChip(
            icon: Icons.thumb_up_alt_rounded,
            iconColor: const Color(0xFFFFB300),
            label: 'Helpful',
            isLight: isLight,
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                  content: Text(
                    'Thanks for your feedback!',
                    style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white),
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 8),
          _buildChip(
            icon: Icons.thumb_down_alt_rounded,
            iconColor: const Color(0xFFFFB300),
            label: 'Not Helpful',
            isLight: isLight,
            onTap: () => _openSupportExperience(),
          ),
          const SizedBox(width: 8),
          _buildChip(
            svgAsset: AppIcons.refresh,
            iconColor: const Color(0xFF0066FF),
            label: 'Talk to Agent',
            isLight: isLight,
            onTap: () => _sendMessage('I want to talk to an agent'),
          ),
        ],
      ),
    );
  }

  Widget _buildChip({
    IconData? icon,
    String? svgAsset,
    required Color iconColor,
    required String label,
    required bool isLight,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isLight ? Colors.white : const Color(0xFF0F1728),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
            width: 1,
          ),
          boxShadow: isLight ? AppTheme.cardShadow : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (svgAsset != null)
              AppIcons.svg(svgAsset, color: iconColor, width: 14, height: 14)
            else
              Icon(icon ?? Icons.help_outline, color: iconColor, size: 14),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 12.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputArea(bool isLight) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF090D16),
        border: Border(
          top: BorderSide(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
            width: 0.8,
          ),
        ),
      ),
      child: Column(
        children: [
          Container(
            height: 48,
            decoration: BoxDecoration(
              color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF0F1728),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                const SizedBox(width: 12),
                InkWell(
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                        content: Text(
                          'Attachment picker opened',
                          style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white),
                        ),
                      ),
                    );
                  },
                  child: const Icon(
                    Icons.attach_file_rounded,
                    color: Color(0xFF0066FF),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _textController,
                    onSubmitted: (val) => _sendMessage(),
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 14,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Type your message...',
                      hintStyle: TextStyle(
                        color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        fontSize: 13.5,
                      ),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                Container(
                  margin: const EdgeInsets.all(4),
                  width: 40,
                  height: 40,
                  decoration: const BoxDecoration(
                    color: Color(0xFF0066FF),
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    padding: EdgeInsets.zero,
                    icon: const Icon(
                      Icons.send_rounded,
                      color: Colors.white,
                      size: 18,
                    ),
                    onPressed: () => _sendMessage(),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Powered by CarQConnect Support',
            style: TextStyle(
              color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              fontSize: 11,
              fontWeight: FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }
}
