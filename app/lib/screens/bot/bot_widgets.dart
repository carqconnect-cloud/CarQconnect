import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'bot_models.dart';

/// Rich Vehicle Health Diagnostics Card matching Figma Image 3
class VehicleHealthCardWidget extends StatelessWidget {
  final VehicleHealthData data;
  final bool? isLight;

  const VehicleHealthCardWidget({
    super.key,
    required this.data,
    this.isLight,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, globalIsLight, _) {
        final light = isLight ?? globalIsLight;

        return Container(
          width: double.infinity,
          constraints: const BoxConstraints(maxWidth: 380),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: light ? Colors.white : const Color(0xFF0F1A28),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: light ? const Color(0xFFE2E8F0) : const Color(0xFF1E2B40),
              width: 1.2,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Row: Car Image on left, Overall Health "Good" on right
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Vehicle Image (Blue SUV matching design)
                  SizedBox(
                    width: 105,
                    height: 65,
                    child: Image.asset(
                      data.carImage,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) => Container(
                        width: 105,
                        height: 65,
                        decoration: BoxDecoration(
                          color: light
                              ? const Color(0xFFF1F5F9)
                              : const Color(0xFF132338),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Icons.directions_car_filled_rounded,
                          color: light
                              ? const Color(0xFF0284C7)
                              : const Color(0xFF38BDF8),
                          size: 32,
                        ),
                      ),
                    ),
                  ),

                  const Spacer(),

                  // Overall Health Block
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'Overall Health',
                        style: TextStyle(
                          color: light
                              ? const Color(0xFF64748B)
                              : const Color(0xFF94A3B8),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        data.overallHealth,
                        style: TextStyle(
                          color: light
                              ? const Color(0xFF10B981)
                              : const Color(0xFF00E676),
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Subtitle Note
              Text(
                data.note,
                style: TextStyle(
                  color: light
                      ? const Color(0xFF475569)
                      : const Color(0xFF94A3B8),
                  fontSize: 13.5,
                  fontWeight: FontWeight.w400,
                ),
              ),

              const SizedBox(height: 14),

              // Divider
              Divider(
                color: light
                    ? const Color(0xFFE2E8F0)
                    : const Color(0xFF1E2B40),
                thickness: 1,
                height: 1,
              ),

              const SizedBox(height: 14),

              // Diagnostics items with green status dots
              _buildDiagnosticRow(
                light: light,
                icon: Icons.settings_outlined,
                title: 'Engine',
                status: data.engine,
                statusColor: light
                    ? const Color(0xFF10B981)
                    : const Color(0xFF00E676),
              ),
              const SizedBox(height: 12),
              _buildDiagnosticRow(
                light: light,
                icon: Icons.battery_charging_full_rounded,
                title: 'Battery',
                status: data.battery,
                statusColor: light
                    ? const Color(0xFF10B981)
                    : const Color(0xFF00E676),
              ),
              const SizedBox(height: 12),
              _buildDiagnosticRow(
                light: light,
                icon: Icons.tire_repair_rounded,
                title: 'Tyre Pressure',
                status: data.tyrePressure,
                statusColor: light
                    ? const Color(0xFF10B981)
                    : const Color(0xFF00E676),
              ),

              const SizedBox(height: 16),

              // Maintenance advice recommendation
              Text(
                data.recommendation,
                style: TextStyle(
                  color: light
                      ? const Color(0xFF475569)
                      : const Color(0xFF94A3B8),
                  fontSize: 13,
                  height: 1.45,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDiagnosticRow({
    required bool light,
    required IconData icon,
    required String title,
    required String status,
    required Color statusColor,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          size: 18,
          color: light ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: TextStyle(
            color: light ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0),
            fontSize: 14,
            fontWeight: FontWeight.w400,
          ),
        ),
        const Spacer(),
        Container(
          width: 7.5,
          height: 7.5,
          decoration: BoxDecoration(
            color: statusColor,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          status,
          style: TextStyle(
            color: light ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0),
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

/// Chat History Drawer / Sidebar matching Figma Image 2
class ChatHistoryDrawer extends StatefulWidget {
  final List<ChatSession> sessions;
  final String activeSessionId;
  final ValueChanged<ChatSession> onSelectSession;
  final VoidCallback onNewChat;
  final VoidCallback onClose;
  final bool? isLight;

  const ChatHistoryDrawer({
    super.key,
    required this.sessions,
    required this.activeSessionId,
    required this.onSelectSession,
    required this.onNewChat,
    required this.onClose,
    this.isLight,
  });

  @override
  State<ChatHistoryDrawer> createState() => _ChatHistoryDrawerState();
}

class _ChatHistoryDrawerState extends State<ChatHistoryDrawer> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, globalIsLight, _) {
        final light = widget.isLight ?? globalIsLight;

        final filteredSessions = widget.sessions.where((s) {
          if (s.messages.isEmpty && s.id != widget.activeSessionId) return false;
          if (_searchQuery.trim().isEmpty) return true;
          return s.title.toLowerCase().contains(_searchQuery.toLowerCase());
        }).toList();

        return Container(
          width: MediaQuery.of(context).size.width * 0.86,
          constraints: const BoxConstraints(maxWidth: 380),
          color: light ? Colors.white : const Color(0xFF070B14),
          child: SafeArea(
            child: Stack(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top Header: "Chat History" and Close "X" Button
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 16, 12, 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Chat History',
                            style: TextStyle(
                              color: light
                                  ? const Color(0xFF0F172A)
                                  : Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              letterSpacing: -0.3,
                            ),
                          ),
                          IconButton(
                            icon: Icon(
                              Icons.close_rounded,
                              color: light
                                  ? const Color(0xFF0F172A)
                                  : Colors.white,
                              size: 24,
                            ),
                            onPressed: widget.onClose,
                          ),
                        ],
                      ),
                    ),

                    // Search Bar: "Search your vehicle" with search icon
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Container(
                        height: 48,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        decoration: BoxDecoration(
                          color: light
                              ? const Color(0xFFF1F5F9)
                              : const Color(0xFF131B2B),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: light
                                ? const Color(0xFFCBD5E1)
                                : const Color(0xFF1E2B40),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.search_rounded,
                              color: light
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF64748B),
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: TextField(
                                controller: _searchController,
                                style: TextStyle(
                                  color: light
                                      ? const Color(0xFF0F172A)
                                      : Colors.white,
                                  fontSize: 14.5,
                                ),
                                decoration: InputDecoration(
                                  hintText: 'Search chats...',
                                  hintStyle: TextStyle(
                                    color: light
                                        ? const Color(0xFF94A3B8)
                                        : const Color(0xFF64748B),
                                    fontSize: 14.5,
                                  ),
                                  border: InputBorder.none,
                                  isDense: true,
                                ),
                                onChanged: (val) {
                                  setState(() {
                                    _searchQuery = val.trim();
                                  });
                                },
                              ),
                            ),
                            if (_searchQuery.isNotEmpty)
                              GestureDetector(
                                onTap: () {
                                  _searchController.clear();
                                  setState(() {
                                    _searchQuery = '';
                                  });
                                },
                                child: Icon(
                                  Icons.cancel_rounded,
                                  color: light
                                      ? const Color(0xFF64748B)
                                      : const Color(0xFF64748B),
                                  size: 18,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 18),

                    // History Items List
                    Expanded(
                      child: filteredSessions.isEmpty
                          ? Center(
                              child: Padding(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 24),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.chat_bubble_outline_rounded,
                                      color: light
                                          ? const Color(0xFFCBD5E1)
                                          : const Color(0xFF334155),
                                      size: 42,
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      'No chats found',
                                      style: TextStyle(
                                        color: light
                                            ? const Color(0xFF475569)
                                            : const Color(0xFF94A3B8),
                                        fontSize: 15,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      'Tap the + button below to start a new chat',
                                      style: TextStyle(
                                        color: light
                                            ? const Color(0xFF64748B)
                                            : const Color(0xFF64748B),
                                        fontSize: 13,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 90),
                              itemCount: filteredSessions.length,
                              itemBuilder: (context, index) {
                                final session = filteredSessions[index];
                                final isSelected =
                                    session.id == widget.activeSessionId;

                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: InkWell(
                                    onTap: () =>
                                        widget.onSelectSession(session),
                                    borderRadius: BorderRadius.circular(12),
                                    child: Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 16,
                                        vertical: 14,
                                      ),
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? (light
                                                ? const Color(0xFFE0F2FE)
                                                : const Color(0xFF162544))
                                            : Colors.transparent,
                                        borderRadius:
                                            BorderRadius.circular(12),
                                        border: isSelected
                                            ? Border.all(
                                                color: light
                                                    ? const Color(0xFFBAE6FD)
                                                    : const Color(0xFF22365D),
                                                width: 1,
                                              )
                                            : null,
                                      ),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              session.title,
                                              style: TextStyle(
                                                color: isSelected
                                                    ? (light
                                                        ? const Color(
                                                            0xFF0284C7)
                                                        : Colors.white)
                                                    : (light
                                                        ? const Color(
                                                            0xFF1E293B)
                                                        : const Color(
                                                            0xFFCBD5E1)),
                                                fontSize: 15,
                                                fontWeight: isSelected
                                                    ? FontWeight.w600
                                                    : FontWeight.w400,
                                              ),
                                              maxLines: 1,
                                              overflow:
                                                  TextOverflow.ellipsis,
                                            ),
                                          ),
                                          if (session.isPinned)
                                            Padding(
                                              padding:
                                                  const EdgeInsets.only(left: 6),
                                              child: Icon(
                                                Icons.push_pin_rounded,
                                                color: light
                                                    ? const Color(0xFF0284C7)
                                                    : const Color(0xFF38BDF8),
                                                size: 14,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),

                // Bottom Right Floating Cyan/Blue "+" Button (starts new chat)
                Positioned(
                  right: 20,
                  bottom: 24,
                  child: GestureDetector(
                    onTap: widget.onNewChat,
                    child: Container(
                      width: 58,
                      height: 58,
                      decoration: BoxDecoration(
                        color: light
                            ? const Color(0xFF0066FF)
                            : const Color(0xFF38BDF8),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Icon(
                          Icons.add_rounded,
                          color: light ? Colors.white : Colors.black,
                          size: 32,
                        ),
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
}

/// Three Dots Popup Menu matching Figma Image 4 ("Frame": Share, Pin, Delete)
class ChatOptionsPopup extends StatelessWidget {
  final VoidCallback onShare;
  final VoidCallback onPin;
  final VoidCallback onDelete;
  final bool isPinned;
  final bool? isLight;

  const ChatOptionsPopup({
    super.key,
    required this.onShare,
    required this.onPin,
    required this.onDelete,
    this.isPinned = false,
    this.isLight,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, globalIsLight, _) {
        final light = isLight ?? globalIsLight;

        return Container(
          width: 140,
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: light ? Colors.white : const Color(0xFF0D1524),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: light ? const Color(0xFFE2E8F0) : const Color(0xFF1E2B40),
              width: 1.2,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildItem(
                light: light,
                icon: Icons.share_outlined,
                title: 'Share',
                onTap: onShare,
              ),
              _buildItem(
                light: light,
                icon: isPinned
                    ? Icons.push_pin_rounded
                    : Icons.push_pin_outlined,
                title: isPinned ? 'Unpin' : 'Pin',
                iconColor: isPinned
                    ? (light ? const Color(0xFF0066FF) : const Color(0xFF38BDF8))
                    : (light ? const Color(0xFF64748B) : Colors.white70),
                onTap: onPin,
              ),
              _buildItem(
                light: light,
                icon: Icons.delete_outline_rounded,
                title: 'Delete',
                iconColor: Colors.redAccent,
                onTap: onDelete,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildItem({
    required bool light,
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Color? iconColor,
  }) {
    final effectiveIconColor =
        iconColor ?? (light ? const Color(0xFF64748B) : Colors.white70);

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
        child: Row(
          children: [
            Icon(icon, size: 18, color: effectiveIconColor),
            const SizedBox(width: 12),
            Text(
              title,
              style: TextStyle(
                color: light ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
