import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'connecting_obd_screen.dart';
import '../../widgets/animated_back_arrow.dart';
import '../../widgets/app_logo.dart';

class ObdConnectionScreen extends StatefulWidget {
  const ObdConnectionScreen({super.key});

  @override
  State<ObdConnectionScreen> createState() => _ObdConnectionScreenState();
}

class _ObdConnectionScreenState extends State<ObdConnectionScreen>
    with SingleTickerProviderStateMixin {
  bool _isConnected = false;

  void _handleConnectDevice() async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => const ConnectingObdScreen(),
      ),
    );

    if (result == true && mounted) {
      setState(() {
        _isConnected = true;
      });
      Navigator.pop(context, true);
    }
  }

  void _showHowToConnectSheet(bool isLight) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        side: BorderSide(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
        ),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'How to Connect OBD Device',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: Icon(Icons.close, color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B)),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildStepItem(
                isLight: isLight,
                step: '1',
                title: 'Locate OBD-II Port',
                desc: 'Usually located under the driver dashboard, near the steering wheel column or fuse box.',
              ),
              const SizedBox(height: 14),
              _buildStepItem(
                isLight: isLight,
                step: '2',
                title: 'Plug In Device',
                desc: 'Firmly plug the CarQConnect OBD Pro into the 16-pin connector until the PWR LED lights up green.',
              ),
              const SizedBox(height: 14),
              _buildStepItem(
                isLight: isLight,
                step: '3',
                title: 'Turn On Ignition',
                desc: 'Turn your car key to the ON position (or push ignition start button without stepping on brake).',
              ),
              const SizedBox(height: 14),
              _buildStepItem(
                isLight: isLight,
                step: '4',
                title: 'Pair with Phone',
                desc: 'Tap "Connect Device" below to establish Bluetooth Low Energy link with the OBD dongle.',
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStepItem({
    required bool isLight,
    required String step,
    required String title,
    required String desc,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: const Color(0xFF0066FF).withValues(alpha: isLight ? 0.12 : 0.2),
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xFF0066FF), width: 1.5),
          ),
          child: Center(
            child: Text(
              step,
              style: const TextStyle(
                color: Color(0xFF0066FF),
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14.5,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                desc,
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                  fontSize: 12.5,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _showInstallationGuide(bool isLight) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        side: BorderSide(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
        ),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Installation & Status Guide',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: Icon(Icons.close, color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B)),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                'LED Indicators Reference',
                style: TextStyle(color: Color(0xFF0066FF), fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const SizedBox(height: 10),
              _buildLedRow(isLight, const Color(0xFF10B981), 'PWR (Power)', 'Steady Green: Device is powered via 12V OBD line.'),
              const SizedBox(height: 8),
              _buildLedRow(isLight, const Color(0xFF0066FF), 'OBD (CAN-Bus)', 'Flashing Cyan: Actively reading engine ECU telemetry.'),
              const SizedBox(height: 8),
              _buildLedRow(isLight, const Color(0xFFF59E0B), 'LINK (BLE)', 'Steady Amber: Connected to phone & cloud sync active.'),
              const SizedBox(height: 20),
              const Text(
                'Vehicle Compatibility',
                style: TextStyle(color: Color(0xFF0066FF), fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const SizedBox(height: 6),
              Text(
                'Compatible with all petrol vehicles manufactured post-2008 and diesel vehicles post-2010 (OBD-II / EOBD compliant).',
                style: TextStyle(
                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                  fontSize: 13,
                  height: 1.3,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLedRow(bool isLight, Color color, String name, String desc) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          margin: const EdgeInsets.only(top: 4),
          width: 9,
          height: 9,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: RichText(
            text: TextSpan(
              text: '$name: ',
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
              children: [
                TextSpan(
                  text: desc,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                    fontWeight: FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showHelpSheet(bool isLight) {
    showModalBottomSheet(
      context: context,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F1A2E),
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        side: BorderSide(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
        ),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Need Help?',
                    style: TextStyle(
                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: Icon(Icons.close, color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF070B18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.bluetooth_searching, color: Color(0xFF0066FF)),
                ),
                title: Text(
                  'Bluetooth not discovering device',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                  ),
                ),
                subtitle: Text(
                  'Ensure Bluetooth is enabled in phone settings and car ignition is turned on.',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                    fontSize: 12,
                  ),
                ),
              ),
              Divider(color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A)),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isLight ? const Color(0xFFD1FAE5) : const Color(0xFF070B18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.support_agent_rounded, color: Color(0xFF10B981)),
                ),
                title: Text(
                  'Contact Customer Support',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                  ),
                ),
                subtitle: Text(
                  'Available 24/7 for OBD pairing and setup support.',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                    fontSize: 12,
                  ),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Connecting to 24/7 CarQConnect support desk...')),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
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
            body: SafeArea(
              child: Column(
                children: [
                  // 1. App Bar
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
                        Expanded(
                          child: Center(
                            child: Text(
                              'OBD Connection',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.2,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 36),
                      ],
                    ),
                  ),

                  // 2. Scrollable Content
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          const SizedBox(height: 12),

                          // OBD Device Illustrated Card
                          _buildObdDeviceGraphic(isLight),
                          const SizedBox(height: 28),

                          // Title & Description
                          Text(
                            'Connect Your OBD Device',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              letterSpacing: -0.3,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'Plug in your OBD device to get real-time vehicle\nhealth, location and driving insights.',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                              fontSize: 13.5,
                              height: 1.35,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 32),

                          // Supported Devices Header
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'Supported Devices',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF0F172A) : Colors.white.withValues(alpha: 0.85),
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Device Card: CarQConnect OBD Pro
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF0F1A2E),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
                                width: 1.0,
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Row(
                              children: [
                                // Device Thumbnail
                                Container(
                                  width: 50,
                                  height: 50,
                                  decoration: BoxDecoration(
                                    color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF0B1424),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: const Color(0xFF0066FF).withValues(alpha: isLight ? 0.2 : 0.3),
                                      width: 1.2,
                                    ),
                                  ),
                                  child: Center(
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 3,
                                      ),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF0066FF).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text(
                                        'CARQ',
                                        style: TextStyle(
                                          color: Color(0xFF0066FF),
                                          fontSize: 8.5,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 0.8,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),

                                // Device Title
                                Expanded(
                                  child: Text(
                                    'CarQConnect OBD Pro',
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),

                                // Recommended Badge
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? const Color(0xFFD1FAE5)
                                        : const Color(0xFF064E3B).withValues(alpha: 0.7),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: isLight
                                          ? const Color(0xFFA7F3D0)
                                          : const Color(0xFF10B981).withValues(alpha: 0.5),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.check,
                                        color: isLight ? const Color(0xFF059669) : const Color(0xFF10B981),
                                        size: 13,
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        'Recommended',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF059669) : const Color(0xFF10B981),
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),

                          // How to connect?
                          _buildActionTile(
                            isLight: isLight,
                            icon: Icons.help_outline_rounded,
                            title: 'How to connect?',
                            onTap: () => _showHowToConnectSheet(isLight),
                          ),
                          const SizedBox(height: 10),

                          // View Installation Guide
                          _buildActionTile(
                            isLight: isLight,
                            icon: Icons.description_outlined,
                            title: 'View Installation Guide',
                            onTap: () => _showInstallationGuide(isLight),
                          ),
                          const SizedBox(height: 36),
                        ],
                      ),
                    ),
                  ),

                  // 3. Bottom Button & Help Row
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                    child: Column(
                      children: [
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton(
                            onPressed: _handleConnectDevice,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0066FF),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                            ),
                            child: Text(
                              _isConnected ? 'Connected' : 'Connect Device',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.2,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Having trouble? ',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                                fontSize: 13,
                              ),
                            ),
                            GestureDetector(
                              onTap: () => _showHelpSheet(isLight),
                              child: const Text(
                                'Get Help',
                                style: TextStyle(
                                  color: Color(0xFF0066FF),
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
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

  Widget _buildObdDeviceGraphic(bool isLight) {
    return Container(
      width: 180,
      height: 142,
      decoration: BoxDecoration(
        color: isLight ? Colors.white : const Color(0xFF131B2A),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF24324D),
          width: 1.5,
        ),
      ),
      child: Column(
        children: [
          // Top ribbed pins (16 slots)
          Container(
            height: 22,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF0D1422),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: List.generate(
                14,
                (index) => Container(
                  width: 3.5,
                  height: 14,
                  decoration: BoxDecoration(
                    color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1E2A42),
                    borderRadius: BorderRadius.circular(1.5),
                  ),
                ),
              ),
            ),
          ),

          // Center Logo with 4-diamond clover
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    AppLogo(
                      width: 26,
                      height: 22,
                      isLight: isLight,
                    ),
                    const SizedBox(width: 9),
                    Text(
                      'CarQConnect',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 19,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Bottom LED indicator lights
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(
                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2A42),
                  width: 0.8,
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildLedIndicator(
                  color: const Color(0xFF10B981),
                  label: 'PWR',
                ),
                _buildLedIndicator(
                  color: const Color(0xFF0066FF),
                  label: 'OBD',
                ),
                _buildLedIndicator(
                  color: const Color(0xFFF59E0B),
                  label: 'LINK',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLedIndicator({required Color color, required String label}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6.5,
          height: 6.5,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF64748B),
            fontSize: 9.5,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.4,
          ),
        ),
      ],
    );
  }

  Widget _buildActionTile({
    required bool isLight,
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        decoration: BoxDecoration(
          color: isLight ? Colors.white : const Color(0xFF0F1A2E),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D4A),
            width: 1.0,
          ),
          boxShadow: isLight ? AppTheme.cardShadow : null,
        ),
        child: Row(
          children: [
            Icon(icon, color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B), size: 20),
            const SizedBox(width: 14),
            Text(
              title,
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 14.5,
                fontWeight: FontWeight.w500,
              ),
            ),
            const Spacer(),
            Icon(
              Icons.chevron_right,
              color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
