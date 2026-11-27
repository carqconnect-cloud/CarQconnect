import 'package:flutter/material.dart';
import '../loading.dart';
import '../services/network_service.dart';
import '../theme/app_theme.dart';
import 'sos/sos.dart';

/// Standalone Fullscreen or Embedded No Connection Screen matching the exact design.
class NoConnectionScreen extends StatefulWidget {
  final VoidCallback? onRetry;
  final bool showBottomNav;

  const NoConnectionScreen({
    super.key,
    this.onRetry,
    this.showBottomNav = false,
  });

  @override
  State<NoConnectionScreen> createState() => _NoConnectionScreenState();
}

class _NoConnectionScreenState extends State<NoConnectionScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Scaffold(
          backgroundColor: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF000000),
          body: Stack(
            children: [
              SafeArea(
                child: NoConnectionView(
                  onRetry: widget.onRetry,
                ),
              ),
              if (widget.showBottomNav)
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: _buildCustomBottomNav(isLight),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCustomBottomNav(bool isLight) {
    final navBg = isLight ? Colors.white : const Color(0xFF0E1520);
    final cutoutBg = isLight ? const Color(0xFFF1F5F9) : const Color(0xFF000000);

    return SizedBox(
      height: 100,
      child: Stack(
        alignment: Alignment.bottomCenter,
        children: [
          Container(
            height: 70,
            decoration: BoxDecoration(
              color: navBg,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(24),
                topRight: Radius.circular(24),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildNavItem(
                  normalAsset: 'assets/bottomnavigation/home.png',
                  filledAsset: 'assets/bottomnavigation/homefillded.png',
                  label: 'Home',
                  index: 0,
                  isLight: isLight,
                ),
                _buildNavItem(
                  normalAsset: 'assets/bottomnavigation/Garage.png',
                  filledAsset: 'assets/bottomnavigation/Garagefillded.png',
                  label: 'Garage',
                  index: 1,
                  isLight: isLight,
                ),
                const SizedBox(width: 70),
                _buildNavItem(
                  normalAsset: 'assets/bottomnavigation/Store.png',
                  filledAsset: 'assets/bottomnavigation/Storefillded.png',
                  label: 'Products',
                  index: 3,
                  isLight: isLight,
                ),
                _buildNavItem(
                  normalAsset: 'assets/bottomnavigation/user.png',
                  filledAsset: 'assets/bottomnavigation/Profilefillded.png',
                  label: 'Profile',
                  index: 4,
                  isLight: isLight,
                ),
              ],
            ),
          ),
          Positioned(
            top: 0,
            child: Container(
              width: 86,
              height: 86,
              decoration: BoxDecoration(
                color: cutoutBg,
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            top: 4,
            child: GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => SosScreen(
                      hasBottomNav: false,
                      onBackToHome: () => Navigator.pop(context),
                    ),
                  ),
                );
              },
              child: Container(
                width: 76,
                height: 76,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                ),
                child: Image.asset(
                  'assets/bottomnavigation/sos.png',
                  width: 76,
                  height: 76,
                  fit: BoxFit.contain,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem({
    required String normalAsset,
    required String filledAsset,
    required String label,
    required int index,
    required bool isLight,
  }) {
    final bool isSelected = _selectedIndex == index;
    final Color selectedColor = isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF);
    final Color unselectedColor = isLight ? const Color(0xFF64748B) : const Color(0xFF7E8E9F);
    final Color labelColor = isSelected ? selectedColor : unselectedColor;

    return GestureDetector(
      onTap: () => setState(() => _selectedIndex = index),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 60,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 24,
              height: 24,
              child: Center(
                child: Image.asset(
                  isSelected ? filledAsset : normalAsset,
                  width: 24,
                  height: 24,
                  fit: BoxFit.contain,
                  color: (!isSelected && isLight) ? const Color(0xFF64748B) : null,
                ),
              ),
            ),
            const SizedBox(height: 5),
            Text(
              label,
              style: TextStyle(
                color: labelColor,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Reusable View that displays the exact No Connection graphic, headline, and message.
class NoConnectionView extends StatefulWidget {
  final VoidCallback? onRetry;

  const NoConnectionView({
    super.key,
    this.onRetry,
  });

  @override
  State<NoConnectionView> createState() => _NoConnectionViewState();
}

class _NoConnectionViewState extends State<NoConnectionView>
    with SingleTickerProviderStateMixin {
  bool _isRetrying = false;
  late AnimationController _animController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.94).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _handleRetry() async {
    if (_isRetrying) return;
    setState(() => _isRetrying = true);
    await _animController.forward();
    await _animController.reverse();

    final connected = await NetworkService.instance.checkConnection();

    if (mounted) {
      setState(() => _isRetrying = false);
      if (connected) {
        widget.onRetry?.call();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Still offline. Please check your Wi-Fi or mobile data.',
              style: TextStyle(fontSize: 13),
            ),
            duration: Duration(seconds: 2),
            backgroundColor: Color(0xFF1E293B),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLight = AppTheme.isLight;
    final titleColor = isLight ? const Color(0xFF0F172A) : Colors.white;
    final subtitleColor = isLight ? const Color(0xFF64748B) : const Color(0xFF9CA3AF);
    final iconColor = isLight ? const Color(0xFF64748B) : const Color(0xFF5D6574);

    return Center(
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Custom No-WiFi Icon matching exact reference
              ScaleTransition(
                scale: _scaleAnimation,
                child: GestureDetector(
                  onTap: _handleRetry,
                  child: CustomPaint(
                    size: const Size(180, 165),
                    painter: NoWifiPainter(color: iconColor),
                  ),
                ),
              ),

              const SizedBox(height: 38),

              // Title: "No connection"
              Text(
                'No connection',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: titleColor,
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.3,
                ),
              ),

              const SizedBox(height: 14),

              // Subtitle: "Please check  your internet connectivity\nand try again."
              Text(
                'Please check  your internet connectivity\nand try again.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: subtitleColor,
                  fontSize: 15,
                  height: 1.45,
                  fontWeight: FontWeight.w400,
                ),
              ),

              const SizedBox(height: 32),

              // Subtle Retry Button with feedback
              InkWell(
                onTap: _handleRetry,
                borderRadius: BorderRadius.circular(22),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 11),
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFE2E8F0)
                        : const Color(0xFF151D2A),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(
                      color: isLight
                          ? const Color(0xFFCBD5E1)
                          : const Color(0xFF243247),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (_isRetrying)
                        const AppLoadingSpinner(size: 14)
                      else
                        Icon(
                          Icons.refresh_rounded,
                          size: 16,
                          color: isLight ? const Color(0xFF334155) : const Color(0xFF94A3B8),
                        ),
                      const SizedBox(width: 8),
                      Text(
                        _isRetrying ? 'Checking...' : 'Try Again',
                        style: TextStyle(
                          color: isLight ? const Color(0xFF1E293B) : Colors.white,
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 70), // Leave clearance for bottom nav
            ],
          ),
        ),
      ),
    );
  }
}

/// CustomPainter that renders the exact bold slate-grey Wi-Fi off graphic
/// with 3 concentric rounded arches, bottom filled dot, and diagonal slash line.
class NoWifiPainter extends CustomPainter {
  final Color color;

  NoWifiPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final strokePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12.8
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final dotPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    // Center point of the concentric arches
    final center = Offset(size.width * 0.50, size.height * 0.70);

    // 1. Bottom circular dot
    canvas.drawCircle(center, 9.5, dotPaint);

    // Radii of the 3 arches
    const double rInner = 36.0;
    const double rMiddle = 64.0;
    const double rOuter = 92.0;

    // Arch angles: from ~220 degrees to ~320 degrees (upper arc)
    const double startAngle = 3.805; // ~218 deg in radians
    const double sweepAngle = 1.832; // ~105 deg sweep

    // 2. Inner Arch
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: rInner),
      startAngle,
      sweepAngle,
      false,
      strokePaint,
    );

    // 3. Middle Arch
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: rMiddle),
      startAngle,
      sweepAngle,
      false,
      strokePaint,
    );

    // 4. Outer Arch
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: rOuter),
      startAngle,
      sweepAngle,
      false,
      strokePaint,
    );

    // 5. Diagonal Strike-through Line
    // Starts above-left of outer arch, cuts through arcs down to lower-right
    final pStart = Offset(size.width * 0.16, size.height * 0.12);
    final pEnd = Offset(size.width * 0.88, size.height * 0.87);

    canvas.drawLine(pStart, pEnd, strokePaint);
  }

  @override
  bool shouldRepaint(covariant NoWifiPainter oldDelegate) =>
      oldDelegate.color != color;
}
