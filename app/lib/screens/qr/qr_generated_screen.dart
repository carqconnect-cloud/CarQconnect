import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../globals.dart';
import 'active_qr_tag_screen.dart';
import 'select_vehicle_screen.dart';

/// Screen 4: QR Generated Successfully!
class QrGeneratedScreen extends StatelessWidget {
  final String vehicleName;
  final String vehicleReg;
  final String tagId;
  final String vehicleId;

  const QrGeneratedScreen({
    super.key,
    required this.vehicleId,
    this.vehicleName = '',
    this.vehicleReg = '',
    this.tagId = '',
  });

  void _onViewAllVehicles(BuildContext context) {
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(
        builder: (context) => const SelectVehicleScreen(),
      ),
      (route) => route.isFirst,
    );
  }

  void _onGetPhysicalTag(BuildContext context, String resolvedName, String resolvedReg, String resolvedTag) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ActiveQrTagScreen(
          vehicleId: vehicleId,
          vehicleName: resolvedName,
          vehicleReg: resolvedReg,
          tagId: resolvedTag,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final resolvedVehicleName = vehicleName.isNotEmpty
        ? vehicleName
        : (Globals.vehicleModel.isNotEmpty ? Globals.vehicleModel : 'Vehicle');
    final resolvedVehicleReg = vehicleReg.isNotEmpty
        ? vehicleReg
        : Globals.vehicleRegistration;
    final resolvedTagId = tagId.isNotEmpty ? tagId : vehicleId;

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(
            gradient: isLight ? AppTheme.bgGradient : null,
            color: isLight ? null : const Color(0xFF090E15),
          ),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            body: SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minHeight: constraints.maxHeight,
                      ),
                      child: IntrinsicHeight(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Column(
                            children: [
                              const SizedBox(height: 8),

                              // Close / Back button at top-left
                              Align(
                                alignment: Alignment.centerLeft,
                                child: IconButton(
                                  icon: Icon(
                                    Icons.close_rounded,
                                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    size: 24,
                                  ),
                                  onPressed: () => _onViewAllVehicles(context),
                                ),
                              ),

                              const Spacer(flex: 1),
                              const SizedBox(height: 8),

                              // Celebration Checkmark Badge with Confetti Particles
                              Stack(
                                alignment: Alignment.center,
                                clipBehavior: Clip.none,
                                children: [
                                  // Confetti 1: Top-Left Cyan Rectangle
                                  Positioned(
                                    top: -10,
                                    left: -24,
                                    child: Transform.rotate(
                                      angle: -0.6,
                                      child: Container(
                                        width: 13,
                                        height: 6,
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF00C2FF),
                                          borderRadius: BorderRadius.circular(3),
                                        ),
                                      ),
                                    ),
                                  ),

                                  // Confetti 2: Top-Right Golden Yellow Dot
                                  Positioned(
                                    top: -12,
                                    right: -10,
                                    child: Container(
                                      width: 8,
                                      height: 8,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFFFFCA28),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ),

                                  // Confetti 3: Left Yellow Dot
                                  Positioned(
                                    top: 24,
                                    left: -32,
                                    child: Container(
                                      width: 8,
                                      height: 8,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFFFDD835),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ),

                                  // Confetti 4: Right Cyan Pill
                                  Positioned(
                                    top: 30,
                                    right: -28,
                                    child: Transform.rotate(
                                      angle: 0.5,
                                      child: Container(
                                        width: 14,
                                        height: 6,
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF00C2FF),
                                          borderRadius: BorderRadius.circular(3),
                                        ),
                                      ),
                                    ),
                                  ),

                                  // Central Outer Glow Circle
                                  Container(
                                    width: 78,
                                    height: 78,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF00C2FF).withValues(alpha: 0.12),
                                      shape: BoxShape.circle,
                                    ),
                                  ),

                                  // Inner Cyan Gradient Circle with Check Icon
                                  Container(
                                    width: 58,
                                    height: 58,
                                    decoration: BoxDecoration(
                                      gradient: const LinearGradient(
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                        colors: [
                                          Color(0xFF00E5FF),
                                          Color(0xFF00B0FF),
                                        ],
                                      ),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Center(
                                      child: Icon(
                                        Icons.check_rounded,
                                        color: Colors.black,
                                        size: 32,
                                      ),
                                    ),
                                  ),
                                ],
                              ),

                              const SizedBox(height: 22),

                              // Screen Title
                              Text(
                                'QR Generated\nSuccessfully!',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  height: 1.25,
                                ),
                              ),

                              const SizedBox(height: 10),

                              // Vehicle Name & Reg Subtitle
                              Text(
                                '$resolvedVehicleName · $resolvedVehicleReg',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),

                              const SizedBox(height: 22),

                              // Smart Safety Physical Tag Card
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                                decoration: BoxDecoration(
                                  color: isLight ? Colors.white : const Color(0xFF0E1724),
                                  borderRadius: BorderRadius.circular(24),
                                  border: Border.all(
                                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF192535),
                                    width: 1.2,
                                  ),
                                ),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.shield_outlined,
                                          size: 15,
                                          color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          'SMART SAFETY TAG',
                                          style: TextStyle(
                                            color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            letterSpacing: 1.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 18),
                                    Container(
                                      width: double.infinity,
                                      constraints: const BoxConstraints(maxWidth: 240),
                                      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 18),
                                      decoration: BoxDecoration(
                                        color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF0F1726),
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(
                                          color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2D42),
                                          width: 1.5,
                                        ),
                                      ),
                                      child: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Container(
                                            width: 58,
                                            height: 58,
                                            decoration: BoxDecoration(
                                              color: (isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF))
                                                  .withValues(alpha: 0.12),
                                              shape: BoxShape.circle,
                                            ),
                                            child: Center(
                                              child: Icon(
                                                Icons.verified_user_rounded,
                                                color: isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF),
                                                size: 30,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(height: 12),
                                          Text(
                                            'Tag Created',
                                            style: TextStyle(
                                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                              fontSize: 15.5,
                                              fontWeight: FontWeight.bold,
                                              letterSpacing: 0.2,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'Order physical sticker to\npaste on vehicle windshield',
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                              fontSize: 12,
                                              height: 1.35,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 18),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          'Tag ID: ',
                                          style: TextStyle(
                                            color: isLight ? const Color(0xFF64748B) : const Color(0xFF7A8B9E),
                                            fontSize: 13.5,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 10,
                                            vertical: 5,
                                          ),
                                          decoration: BoxDecoration(
                                            color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF121C2B),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(
                                              color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1F2E45),
                                              width: 1,
                                            ),
                                          ),
                                          child: Text(
                                            resolvedTagId,
                                            style: TextStyle(
                                              color: isLight ? const Color(0xFF0F172A) : const Color(0xFFD6E2F0),
                                              fontSize: 13,
                                              fontWeight: FontWeight.w600,
                                              letterSpacing: 0.5,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),

                              const SizedBox(height: 10),

                              // Anti-screenshot info note
                              Container(
                                margin: const EdgeInsets.symmetric(horizontal: 4),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: (isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF)).withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: (isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF)).withValues(alpha: 0.22),
                                    width: 1,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.shield_rounded,
                                      size: 15,
                                      color: isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'Digital tag is anti-copy protected. Order physical sticker for vehicle.',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF334155) : const Color(0xFF94A3B8),
                                          fontSize: 11,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              const Spacer(flex: 2),
                              const SizedBox(height: 16),

                              // Button 1: Order Physical Tag
                              SizedBox(
                                width: double.infinity,
                                height: 52,
                                child: ElevatedButton(
                                  onPressed: () => _onGetPhysicalTag(
                                    context,
                                    resolvedVehicleName,
                                    resolvedVehicleReg,
                                    resolvedTagId,
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: isLight ? AppTheme.primaryBlue : const Color(0xFF00C2FF),
                                    foregroundColor: isLight ? Colors.white : Colors.black,
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(26),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.shopping_bag_outlined,
                                        color: isLight ? Colors.white : Colors.black,
                                        size: 20,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Order Physical Tag at ₹199',
                                        style: TextStyle(
                                          color: isLight ? Colors.white : Colors.black,
                                          fontSize: 15.5,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),

                              const SizedBox(height: 12),

                              // Button 2: View All Vehicles (Returns to QR Tag vehicle list)
                              SizedBox(
                                width: double.infinity,
                                height: 52,
                                child: OutlinedButton(
                                  onPressed: () => _onViewAllVehicles(context),
                                  style: OutlinedButton.styleFrom(
                                    backgroundColor: isLight ? Colors.white : const Color(0xFF0D1520),
                                    foregroundColor: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    side: BorderSide(
                                      color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1A2738),
                                      width: 1.2,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(26),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.directions_car_filled_rounded,
                                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                        size: 20,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'View All Vehicles',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                          fontSize: 15.5,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),

                              const SizedBox(height: 20),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }
}
