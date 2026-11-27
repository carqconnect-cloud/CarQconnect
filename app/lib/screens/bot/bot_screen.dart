import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../globals.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../utils/api_config.dart';
import 'bot_models.dart';
import 'bot_painters.dart';
import 'bot_widgets.dart';
import '../../services/screen_refresh_service.dart';

enum BotScreenMode { welcome, chat }

class BotScreen extends StatefulWidget {
  final BotScreenMode initialMode;

  const BotScreen({super.key, this.initialMode = BotScreenMode.welcome});

  @override
  State<BotScreen> createState() => _BotScreenState();
}

class _BotScreenState extends State<BotScreen>
    with RefreshOnRouteReturn<BotScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  late BotScreenMode _currentMode;
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<ChatSession> _sessions = [];
  late String _activeSessionId;
  bool _isTyping = false;

  // Backend base URL
  static String get _apiBase => ApiConfig.url('/ai');

  String get _displayName {
    final name = Globals.firstName.trim();
    return name.isNotEmpty ? name : 'Ananya';
  }

  String get _storageSessionsKey {
    return Globals.email.isNotEmpty
        ? 'carq_ai_sessions_${Globals.email}'
        : 'carq_ai_sessions_guest';
  }

  ChatSession get _activeSession {
    final index = _sessions.indexWhere((s) => s.id == _activeSessionId);
    if (index != -1) return _sessions[index];
    if (_sessions.isNotEmpty) return _sessions.first;
    final fallback = ChatSession(
      id: 'session_${DateTime.now().millisecondsSinceEpoch}',
      title: 'New Chat',
      updatedAt: DateTime.now(),
      messages: [],
    );
    _sessions.add(fallback);
    _activeSessionId = fallback.id;
    return fallback;
  }

  List<BotMessage> get _currentMessages => _activeSession.messages;

  @override
  void initState() {
    super.initState();
    _currentMode = widget.initialMode;
    final initialEmpty = ChatSession(
      id: 'chat_${DateTime.now().millisecondsSinceEpoch}',
      title: 'New Chat',
      updatedAt: DateTime.now(),
      messages: [],
    );
    _sessions = [initialEmpty];
    _activeSessionId = initialEmpty.id;
    _initSessions();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _initSessions() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_storageSessionsKey);
      if (saved != null && saved.isNotEmpty) {
        final list = jsonDecode(saved) as List<dynamic>;
        if (list.isNotEmpty) {
          // Filter out any legacy dummy/canned sessions
          final loaded = list
              .map((item) => ChatSession.fromJson(item as Map<String, dynamic>))
              .where(
                (s) =>
                    s.id != 'session_health_check' &&
                    !s.id.startsWith('session_sample_') &&
                    s.title != 'Vehicle health check',
              )
              .toList();
          if (loaded.isNotEmpty) {
            setState(() {
              final currentActive = _activeSession;
              _sessions = [
                currentActive,
                ...loaded.where((s) => s.id != currentActive.id),
              ];
            });
          }
        }
      }
    } catch (_) {}

    // Fetch real conversation history from backend database
    await _fetchBackendChats();
  }

  /// Fetches real saved conversation threads from the backend PostgreSQL database
  Future<void> _fetchBackendChats() async {
    final List<String> fetchUrls = [];
    if (kIsWeb) {
      final host = Uri.base.host;
      if (host == 'localhost' || host == '127.0.0.1') {
        fetchUrls.add('http://127.0.0.1:4000/api/v1/ai/chats');
        fetchUrls.add('http://localhost:4000/api/v1/ai/chats');
      } else if (host.isNotEmpty) {
        fetchUrls.add('${Uri.base.scheme}://$host:4000/api/v1/ai/chats');
      }
    }
    fetchUrls.add('$_apiBase/chats');
    for (final base in ApiConfig.candidateBaseUrls) {
      final cand = '$base/ai/chats';
      if (!fetchUrls.contains(cand)) fetchUrls.add(cand);
    }

    final queryParam = Globals.email.isNotEmpty
        ? '?email=${Uri.encodeComponent(Globals.email)}'
        : '';

    http.Response? response;
    for (final url in fetchUrls) {
      try {
        final res = await http
            .get(
              Uri.parse('$url$queryParam'),
              headers: {
                'Content-Type': 'application/json',
                if (Globals.accessToken.isNotEmpty)
                  'Authorization': 'Bearer ${Globals.accessToken}',
              },
            )
            .timeout(const Duration(seconds: 4));

        if (res.statusCode == 200) {
          response = res;
          break;
        }
      } catch (_) {}
    }

    if (response != null && response.statusCode == 200) {
      try {
        final decoded = jsonDecode(response.body) as Map<String, dynamic>;
        final rawList = decoded['data'] as List<dynamic>? ?? [];
        if (rawList.isNotEmpty) {
          final List<ChatSession> backendSessions = [];
          for (final item in rawList) {
            final map = item as Map<String, dynamic>;
            final id =
                map['sessionId'] as String? ?? map['id'] as String? ?? '';
            final title =
                map['summary'] as String? ??
                map['userMessage'] as String? ??
                'Chat';
            final dtStr =
                map['updatedAt'] as String? ?? map['createdAt'] as String?;
            final dt = dtStr != null
                ? DateTime.tryParse(dtStr) ?? DateTime.now()
                : DateTime.now();

            final List<BotMessage> msgs = [];
            final rawMsgs = map['messages'];
            if (rawMsgs is List && rawMsgs.isNotEmpty) {
              for (int i = 0; i < rawMsgs.length; i++) {
                final m = rawMsgs[i];
                if (m is Map<String, dynamic>) {
                  final role = m['role'] as String? ?? 'user';
                  final content = m['content'] as String? ?? '';
                  final timeStr = m['timestamp'] as String?;
                  final time = timeStr != null
                      ? DateTime.tryParse(timeStr) ?? dt
                      : dt;
                  msgs.add(
                    BotMessage(
                      id: '${id}_m$i',
                      text: content,
                      isUser: role == 'user',
                      timestamp: time,
                      hasEditOption: role == 'user',
                    ),
                  );
                }
              }
            } else if (map['userMessage'] != null &&
                map['aiResponse'] != null) {
              msgs.add(
                BotMessage(
                  id: '${id}_user',
                  text: map['userMessage'] as String,
                  isUser: true,
                  timestamp: dt,
                  hasEditOption: true,
                ),
              );
              msgs.add(
                BotMessage(
                  id: '${id}_ai',
                  text: map['aiResponse'] as String,
                  isUser: false,
                  timestamp: dt,
                ),
              );
            }

            if (id.isNotEmpty) {
              backendSessions.add(
                ChatSession(
                  id: id,
                  title: title,
                  updatedAt: dt,
                  messages: msgs,
                ),
              );
            }
          }

          if (backendSessions.isNotEmpty) {
            setState(() {
              final Map<String, ChatSession> sessionMap = {};
              for (final s in backendSessions) {
                sessionMap[s.id] = s;
              }
              for (final local in _sessions) {
                if (local.messages.isNotEmpty &&
                    !sessionMap.containsKey(local.id)) {
                  sessionMap[local.id] = local;
                } else if (sessionMap.containsKey(local.id) && local.isPinned) {
                  sessionMap[local.id] = sessionMap[local.id]!.copyWith(
                    isPinned: true,
                  );
                }
              }

              final sortedHistory = sessionMap.values.toList()
                ..sort((a, b) {
                  if (a.isPinned && !b.isPinned) return -1;
                  if (!a.isPinned && b.isPinned) return 1;
                  return b.updatedAt.compareTo(a.updatedAt);
                });

              final currentActive = _activeSession;
              _sessions = [
                currentActive,
                ...sortedHistory.where((s) => s.id != currentActive.id),
              ];
            });
            await _saveSessions();
          }
        }
      } catch (_) {}
    }
  }

  Future<void> _saveSessions() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = jsonEncode(_sessions.map((s) => s.toJson()).toList());
      await prefs.setString(_storageSessionsKey, data);
    } catch (_) {}
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
        );
      }
    });
  }

  /// Opens a brand new chat session with welcome greeting & prompt suggestions
  void _startNewChat() {
    // If the active session is already fresh with 0 messages, reset to welcome mode
    if (_activeSession.messages.isEmpty) {
      setState(() {
        _currentMode = BotScreenMode.welcome;
        _inputController.clear();
      });
      if (_scaffoldKey.currentState?.isEndDrawerOpen ?? false) {
        Navigator.of(context).maybePop();
      }
      return;
    }

    // Check if an empty session already exists
    final emptyIndex = _sessions.indexWhere((s) => s.messages.isEmpty);
    if (emptyIndex != -1) {
      setState(() {
        _activeSessionId = _sessions[emptyIndex].id;
        _currentMode = BotScreenMode.welcome;
        _inputController.clear();
      });
      if (_scaffoldKey.currentState?.isEndDrawerOpen ?? false) {
        Navigator.of(context).maybePop();
      }
      return;
    }

    // Otherwise create a fresh new session
    final newSession = ChatSession(
      id: 'chat_${DateTime.now().millisecondsSinceEpoch}',
      title: 'New Chat',
      updatedAt: DateTime.now(),
      messages: [],
    );

    setState(() {
      _sessions.insert(0, newSession);
      _activeSessionId = newSession.id;
      _currentMode = BotScreenMode.welcome;
      _inputController.clear();
    });

    _saveSessions();

    if (_scaffoldKey.currentState?.isEndDrawerOpen ?? false) {
      Navigator.of(context).maybePop();
    }
  }

  void _selectSession(ChatSession session) {
    setState(() {
      _activeSessionId = session.id;
      _currentMode = session.messages.isNotEmpty
          ? BotScreenMode.chat
          : BotScreenMode.welcome;
    });
    if (_scaffoldKey.currentState?.isEndDrawerOpen ?? false) {
      Navigator.of(context).maybePop();
    }
    _scrollToBottom();
  }

  Future<void> _sendMessage([String? customText]) async {
    final text = (customText ?? _inputController.text).trim();
    if (text.isEmpty) return;

    _inputController.clear();

    final userMsg = BotMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      text: text,
      isUser: true,
      hasEditOption: true,
      timestamp: DateTime.now(),
    );

    setState(() {
      // If we are currently on the welcome screen and active session already has messages,
      // create a brand new session so this message directly starts a fresh chat!
      if (_currentMode == BotScreenMode.welcome &&
          _activeSession.messages.isNotEmpty) {
        final newChat = ChatSession(
          id: 'chat_${DateTime.now().millisecondsSinceEpoch}',
          title: text.length > 32 ? '${text.substring(0, 32)}...' : text,
          updatedAt: DateTime.now(),
          messages: [userMsg],
        );
        _sessions.insert(0, newChat);
        _activeSessionId = newChat.id;
      } else {
        _activeSession.messages.add(userMsg);
        if (_activeSession.title == 'New Chat' ||
            _activeSession.title.isEmpty) {
          final title = text.length > 32 ? '${text.substring(0, 32)}...' : text;
          final idx = _sessions.indexWhere((s) => s.id == _activeSessionId);
          if (idx != -1) {
            _sessions[idx] = _sessions[idx].copyWith(title: title);
          }
        }
      }

      _currentMode = BotScreenMode.chat;
      _isTyping = true;
    });

    await _saveSessions();
    _scrollToBottom();

    // Query real backend AI endpoint (FastAPI AI / Gemini AI)
    final startTime = DateTime.now();
    final List<String> candidateUrls = [];

    if (kIsWeb) {
      final host = Uri.base.host;
      if (host == 'localhost' || host == '127.0.0.1') {
        candidateUrls.add('http://127.0.0.1:4000/api/v1/ai/chat');
        candidateUrls.add('http://localhost:4000/api/v1/ai/chat');
      } else if (host.isNotEmpty) {
        candidateUrls.add('${Uri.base.scheme}://$host:4000/api/v1/ai/chat');
      }
    }

    candidateUrls.add('$_apiBase/chat');
    for (final base in ApiConfig.candidateBaseUrls) {
      final cand = '$base/ai/chat';
      if (!candidateUrls.contains(cand)) candidateUrls.add(cand);
    }

    http.Response? response;
    for (final url in candidateUrls) {
      try {
        final res = await http
            .post(
              Uri.parse(url),
              headers: {
                'Content-Type': 'application/json',
                if (Globals.accessToken.isNotEmpty)
                  'Authorization': 'Bearer ${Globals.accessToken}',
              },
              body: jsonEncode({
                'message': text,
                'session_id': _activeSessionId,
                if (Globals.email.isNotEmpty) 'user_id': Globals.email,
              }),
            )
            .timeout(const Duration(seconds: 15));

        if (res.statusCode == 200) {
          response = res;
          break;
        }
      } catch (_) {}
    }

    final elapsed = DateTime.now().difference(startTime);
    if (elapsed < const Duration(milliseconds: 600)) {
      await Future.delayed(const Duration(milliseconds: 600) - elapsed);
    }

    if (!mounted) return;

    String answer = '';
    if (response != null && response.statusCode == 200) {
      try {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        answer = data['answer'] as String? ?? '';
      } catch (_) {}
    }

    if (answer.isEmpty) {
      answer = _getSmartFallbackResponse(text);
    }

    final botReply = BotMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      text: answer,
      isUser: false,
      timestamp: DateTime.now(),
    );

    setState(() {
      _isTyping = false;
      _activeSession.messages.add(botReply);
    });

    await _saveSessions();
    _scrollToBottom();
  }

  String _getSmartFallbackResponse(String query) {
    final lower = query.toLowerCase();
    if (lower.contains('qr') || lower.contains('tag')) {
      return "Your CarQConnect Smart QR Tag connects your vehicle with privacy protection. Scanners can contact you for emergency parking, towing alerts, or assistance without viewing your real phone number.";
    } else if (lower.contains('fastag')) {
      return "You can check your FASTag balance, view toll transaction history, and recharge instantly directly from the FASTag Hub in the app.";
    } else if (lower.contains('reminder') || lower.contains('service')) {
      return "Vehicle service and document expiry reminders are active. You will receive push notifications 15 days before PUC, Insurance, and scheduled servicing dates.";
    } else if (lower.contains('track') || lower.contains('gps')) {
      return "Live vehicle tracking displays real-time speed, coordinates, trip playback, and geofence boundary alerts.";
    } else {
      return "I'm here to assist with your CarQ Connect vehicle diagnostics, document storage, FASTag, reminders, and emergency SOS services. Ask me anything!";
    }
  }

  void _showChatOptionsMenu([bool? isLight]) {
    final light = isLight ?? AppTheme.isLightNotifier.value;
    final RenderBox? overlay =
        Overlay.of(context).context.findRenderObject() as RenderBox?;
    if (overlay == null) return;

    showMenu(
      context: context,
      position: RelativeRect.fromRect(
        Rect.fromLTWH(overlay.size.width - 150, kToolbarHeight + 20, 140, 140),
        Offset.zero & overlay.size,
      ),
      color: Colors.transparent,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      items: [
        PopupMenuItem(
          enabled: false,
          padding: EdgeInsets.zero,
          child: ChatOptionsPopup(
            isPinned: _activeSession.isPinned,
            isLight: light,
            onShare: () {
              Navigator.pop(context);
              final transcript = _activeSession.messages
                  .map((m) => '${m.isUser ? "You" : "AI"}: ${m.text}')
                  .join('\n\n');
              Clipboard.setData(ClipboardData(text: transcript));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Chat transcript copied to clipboard!'),
                  duration: Duration(seconds: 2),
                ),
              );
            },
            onPin: () {
              Navigator.pop(context);
              setState(() {
                final idx = _sessions.indexWhere(
                  (s) => s.id == _activeSessionId,
                );
                if (idx != -1) {
                  _sessions[idx] = _sessions[idx].copyWith(
                    isPinned: !_sessions[idx].isPinned,
                  );
                }
              });
              _saveSessions();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    _activeSession.isPinned ? 'Chat pinned' : 'Chat unpinned',
                  ),
                  duration: const Duration(seconds: 1),
                ),
              );
            },
            onDelete: () async {
              Navigator.pop(context);
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: light
                      ? Colors.white
                      : const Color(0xFF0F1A28),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                    side: BorderSide(
                      color: light
                          ? const Color(0xFFE2E8F0)
                          : const Color(0xFF1E2B40),
                    ),
                  ),
                  title: Text(
                    'Delete Chat?',
                    style: TextStyle(
                      color: light ? const Color(0xFF0F172A) : Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  content: Text(
                    'This will remove this conversation from your history.',
                    style: TextStyle(
                      color: light
                          ? const Color(0xFF64748B)
                          : const Color(0xFF94A3B8),
                    ),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: Text(
                        'Cancel',
                        style: TextStyle(
                          color: light
                              ? const Color(0xFF64748B)
                              : const Color(0xFF94A3B8),
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text(
                        'Delete',
                        style: TextStyle(color: Colors.redAccent),
                      ),
                    ),
                  ],
                ),
              );

              if (confirm == true) {
                final delId = _activeSessionId;
                setState(() {
                  _sessions.removeWhere((s) => s.id == delId);
                  if (_sessions.isEmpty) {
                    _startNewChat();
                  } else {
                    _activeSessionId = _sessions.first.id;
                    _currentMode = _sessions.first.messages.isNotEmpty
                        ? BotScreenMode.chat
                        : BotScreenMode.welcome;
                  }
                });
                _saveSessions();

                try {
                  final delUrl = '${ApiConfig.url('/ai/chats')}/$delId';
                  http
                      .delete(Uri.parse(delUrl))
                      .timeout(const Duration(seconds: 4));
                } catch (_) {}
              }
            },
          ),
        ),
      ],
    );
  }

  void _showAttachmentMenu([bool? isLight]) {
    final light = isLight ?? AppTheme.isLightNotifier.value;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 85),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: light ? Colors.white : const Color(0xFF0F1A28),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: light ? const Color(0xFFE2E8F0) : const Color(0xFF1E2B40),
              width: 1.2,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: kBotAttachmentOptions.map((opt) {
              return InkWell(
                onTap: () async {
                  Navigator.pop(ctx);
                  await _pickAttachment(opt.title);
                },
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Row(
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: light
                              ? const Color(0xFFE0F2FE)
                              : const Color(0xFF132338),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: light
                                ? const Color(0xFFBAE6FD)
                                : const Color(0xFF38BDF8)
                                      .withValues(alpha: 0.5),
                          ),
                        ),
                        child: Icon(
                          opt.icon,
                          color: light
                              ? const Color(0xFF0284C7)
                              : const Color(0xFF38BDF8),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Text(
                        opt.title,
                        style: TextStyle(
                          color: light ? const Color(0xFF0F172A) : Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        );
      },
    );
  }

  Future<void> _pickAttachment(String type) async {
    try {
      if (type == 'Document') {
        _sendMessage('Summarize this document for me.');
        return;
      }

      final picker = ImagePicker();
      final XFile? file = await picker.pickImage(
        source: type == 'Camera' ? ImageSource.camera : ImageSource.gallery,
        maxWidth: 1280,
        maxHeight: 1280,
        imageQuality: 85,
      );

      if (file == null) return;

      final userMsg = BotMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        text: 'Uploaded image: ${file.name}',
        isUser: true,
        imageUrl: file.path,
        timestamp: DateTime.now(),
      );

      setState(() {
        _currentMode = BotScreenMode.chat;
        _activeSession.messages.add(userMsg);
      });

      await _saveSessions();
      _scrollToBottom();
    } catch (_) {}
  }

  @override
  Future<void> refreshOnRouteReturn() => _fetchBackendChats();

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            gradient: isLight
                ? AppTheme.lightBgGradient
                : AppTheme.darkBgGradient,
          ),
          child: Scaffold(
            key: _scaffoldKey,
            backgroundColor: Colors.transparent,
            endDrawerEnableOpenDragGesture: true,
            endDrawer: ChatHistoryDrawer(
              sessions: _sessions,
              activeSessionId: _activeSessionId,
              onSelectSession: _selectSession,
              onNewChat: _startNewChat,
              onClose: () => Navigator.of(context).maybePop(),
              isLight: isLight,
            ),
            body: SafeArea(
              child: Column(
                children: [
                  // Top App Bar (< and History/Menu) matching attached image
                  _buildAppBar(isLight),

                  // Main Body: Welcome Screen (Image 1) or Conversation Screen (Image 3)
                  Expanded(
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 260),
                      child: _currentMode == BotScreenMode.welcome
                          ? _buildAiScreenBody(isLight)
                          : _buildChatScreenBody(isLight),
                    ),
                  ),

                  // Bottom Input Bar
                  _buildBottomInputBar(isLight),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ===========================================================================
  // TOP APP BAR (< on left, History Clock on right) matching attached image
  // ===========================================================================
  Widget _buildAppBar(bool isLight) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Back Button: if in chat mode, returns to welcome; if in welcome, pops screen
          IconButton(
            icon: Icon(
              Icons.chevron_left_rounded,
              color: isLight ? const Color(0xFF0F172A) : Colors.white,
              size: 28,
            ),
            tooltip: 'Back',
            onPressed: () {
              if (_currentMode == BotScreenMode.chat) {
                _startNewChat();
              } else {
                Navigator.pop(context);
              }
            },
          ),

          // Right Action Button:
          // In Welcome mode: History Clock SVG button (Image 1)
          // In Chat mode: Three dots menu button (Image 3)
          if (_currentMode == BotScreenMode.welcome)
            IconButton(
              icon: SvgPicture.asset(
                'assets/icons/history.svg',
                width: 22,
                height: 22,
                colorFilter: ColorFilter.mode(
                  isLight ? const Color(0xFF0F172A) : Colors.white,
                  BlendMode.srcIn,
                ),
              ),
              tooltip: 'Chat History',
              onPressed: () {
                _scaffoldKey.currentState?.openEndDrawer();
              },
            )
          else
            IconButton(
              icon: Icon(
                Icons.more_vert_rounded,
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                size: 22,
              ),
              tooltip: 'Options',
              onPressed: () => _showChatOptionsMenu(isLight),
            ),
        ],
      ),
    );
  }

  // ===========================================================================
  // SCREEN 1: Ai Screen (Greeting, Generative Orb, Prompt Suggestions)
  // ===========================================================================
  Widget _buildAiScreenBody(bool isLight) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 8),

          // Greeting: "Hi Ananya," + "How may I help you?"
          RichText(
            textAlign: TextAlign.center,
            text: TextSpan(
              children: [
                TextSpan(
                  text: 'Hi ',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 30,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -0.5,
                  ),
                ),
                TextSpan(
                  text: '$_displayName,',
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF0066FF)
                        : const Color(0xFF38BDF8),
                    fontSize: 30,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -0.5,
                  ),
                ),
                TextSpan(
                  text: '\nHow may I help you?',
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF64748B)
                        : const Color(0xFF94A3B8),
                    fontSize: 15.5,
                    fontWeight: FontWeight.w400,
                    height: 1.6,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Animated generative topographical soundwave/contour wave
          Center(child: GenerativeOrbWidget(size: 260, isLight: isLight)),

          const SizedBox(height: 28),

          // Subtitle text: "You can ask me anything"
          Text(
            'You can ask me anything',
            style: TextStyle(
              color: isLight
                  ? const Color(0xFF64748B)
                  : const Color(0xFF94A3B8),
              fontSize: 15,
              fontWeight: FontWeight.w400,
            ),
          ),

          const SizedBox(height: 16),

          // 3 Quick Prompt Suggestions matching Figma Image 1
          ...kBotPromptSuggestions.map((prompt) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: InkWell(
                onTap: () => _sendMessage(prompt),
                borderRadius: BorderRadius.circular(24),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 14,
                  ),
                  decoration: BoxDecoration(
                    color: isLight ? Colors.white : const Color(0xFF101726),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: isLight
                          ? const Color(0xFFE2E8F0)
                          : const Color(0xFF1C273C),
                      width: 1,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      prompt,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 14.5,
                        fontWeight: FontWeight.w400,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ),
            );
          }),

          const SizedBox(height: 16),
        ],
      ),
    );
  }

  // ===========================================================================
  // SCREEN 2: Chat Screen (Conversation Mode)
  // ===========================================================================
  Widget _buildChatScreenBody(bool isLight) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _currentMessages.length + (_isTyping ? 1 : 0),
      itemBuilder: (context, index) {
        if (index == _currentMessages.length && _isTyping) {
          return _buildTypingIndicator(isLight);
        }
        final msg = _currentMessages[index];
        return _buildMessageItem(msg, isLight);
      },
    );
  }

  Widget _buildMessageItem(BotMessage msg, bool isLight) {
    if (msg.isUser) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.end,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Edit note/pencil icon on the left (matches Figma Image 3!)
            if (msg.hasEditOption)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: InkWell(
                  onTap: () {
                    _inputController.text = msg.text;
                    _inputController.selection = TextSelection.fromPosition(
                      TextPosition(offset: _inputController.text.length),
                    );
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Icon(
                      Icons.edit_note_rounded,
                      color: isLight
                          ? const Color(0xFF64748B)
                          : const Color(0xFF94A3B8),
                      size: 22,
                    ),
                  ),
                ),
              ),

            // User Cyan / Blue Bubble
            Flexible(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: isLight
                      ? const Color(0xFF0066FF)
                      : const Color(0xFF38BDF8),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(20),
                    topRight: Radius.circular(20),
                    bottomLeft: Radius.circular(20),
                    bottomRight: Radius.circular(6),
                  ),
                ),
                child: Text(
                  msg.text,
                  style: TextStyle(
                    color: isLight ? Colors.white : const Color(0xFF0F172A),
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    height: 1.35,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    // Assistant Bot Response
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Circular 'F' avatar
          BotAvatarIcon(size: 32, isLight: isLight),
          const SizedBox(width: 10),

          // Message Content: Vehicle Health Card, Image Card, or Text Bubble
          Flexible(
            child: msg.isVehicleHealthCard
                ? VehicleHealthCardWidget(
                    data: msg.healthData ?? const VehicleHealthData(),
                    isLight: isLight,
                  )
                : (msg.imageUrl != null
                      ? _buildImageReplyCard(msg, isLight)
                      : Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 18,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: isLight
                                ? Colors.white
                                : const Color(0xFF101726),
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(6),
                              topRight: Radius.circular(20),
                              bottomLeft: Radius.circular(20),
                              bottomRight: Radius.circular(20),
                            ),
                            border: Border.all(
                              color: isLight
                                  ? const Color(0xFFE2E8F0)
                                  : const Color(0xFF1C273C),
                              width: 1,
                            ),
                          ),
                          child: Text(
                            msg.text,
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF0F172A)
                                  : const Color(0xFFF8FAFC),
                              fontSize: 14.5,
                              height: 1.45,
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                        )),
          ),
        ],
      ),
    );
  }

  Widget _buildImageReplyCard(BotMessage msg, bool isLight) {
    final imgUrl = msg.imageUrl ?? '';
    Widget imgWidget;

    if (imgUrl.startsWith('assets/')) {
      imgWidget = Image.asset(
        imgUrl,
        height: 200,
        width: double.infinity,
        fit: BoxFit.cover,
      );
    } else if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
      imgWidget = Image.network(
        imgUrl,
        height: 200,
        width: double.infinity,
        fit: BoxFit.cover,
      );
    } else {
      imgWidget = Image.asset(
        'assets/images/night_sky.jpg',
        height: 200,
        width: double.infinity,
        fit: BoxFit.cover,
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF101726),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            child: imgWidget,
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Text(
              msg.text,
              style: TextStyle(
                color: isLight
                    ? const Color(0xFF0F172A)
                    : const Color(0xFFF8FAFC),
                fontSize: 14,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypingIndicator(bool isLight) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          BotAvatarIcon(size: 32, isLight: isLight),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isLight ? Colors.white : const Color(0xFF101726),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isLight
                    ? const Color(0xFFE2E8F0)
                    : const Color(0xFF1C273C),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                AppLoadingSpinner(
                  size: 18,
                  primaryColor: isLight
                      ? const Color(0xFF0066FF)
                      : const Color(0xFF38BDF8),
                  showGlow: false,
                ),
                const SizedBox(width: 10),
                Text(
                  'Thinking...',
                  style: TextStyle(
                    color: isLight
                        ? const Color(0xFF64748B)
                        : const Color(0xFF94A3B8),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // BOTTOM BAR: Capsule Pill Input + Cyan Send Button
  // ===========================================================================
  Widget _buildBottomInputBar(bool isLight) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 16),
      child: Row(
        children: [
          // Capsule Pill Input
          Expanded(
            child: Container(
              height: 52,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: isLight ? Colors.white : const Color(0xFF101726),
                borderRadius: BorderRadius.circular(26),
                border: Border.all(
                  color: isLight
                      ? const Color(0xFFCBD5E1)
                      : const Color(0xFF1C273C),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  // "+" button: starts a new chat
                  IconButton(
                    icon: Icon(
                      Icons.add_rounded,
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      size: 24,
                    ),
                    tooltip: 'New Chat',
                    onPressed: _startNewChat,
                    onLongPress: () => _showAttachmentMenu(isLight),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 8),

                  // Text input
                  Expanded(
                    child: TextField(
                      controller: _inputController,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 14.5,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Ask me anything...',
                        hintStyle: TextStyle(
                          color: isLight
                              ? const Color(0xFF94A3B8)
                              : const Color(0xFF64748B),
                          fontSize: 14.5,
                        ),
                        border: InputBorder.none,
                        isDense: true,
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(width: 12),

          // Circular Cyan Send Button
          GestureDetector(
            onTap: () => _sendMessage(),
            child: Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: isLight
                    ? const Color(0xFF0066FF)
                    : const Color(0xFF38BDF8),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Icon(
                  Icons.send_rounded,
                  color: isLight ? Colors.white : Colors.black,
                  size: 22,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
