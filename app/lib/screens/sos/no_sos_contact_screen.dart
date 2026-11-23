import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../widgets/animated_back_arrow.dart';


/// Screen displayed when user has NOT added any emergency contact number yet.
/// Matches the provided design with Siren illustration, feature row, and "Add Contact +" CTA.
class NoSosContactScreen extends StatelessWidget {
  final VoidCallback? onBack;
  final VoidCallback? onAddContact;
  final VoidCallback? onFindHospital;
  final bool hasBottomNav;

  const NoSosContactScreen({
    super.key,
    this.onBack,
    this.onAddContact,
    this.onFindHospital,
    this.hasBottomNav = false,
  });

  Future<void> _callEmergencyHelpline(BuildContext context) async {
    final uri = Uri.parse('tel:112');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: Color(0xFF101726),
              content: Text('Dialing 112 National Emergency Helpline'),
            ),
          );
        }
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFF101726),
            content: Text('Calling Emergency Helpline: 112'),
          ),
        );
      }
    }
  }

  void _showFeatureNotice(BuildContext context, String title, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF0F1A2A),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Color(0xFF1E2D4A)),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                color: Color(0xFF00C2FF),
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              message,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12.5,
              ),
            ),
          ],
        ),
        action: SnackBarAction(
          label: 'Add Contact',
          textColor: const Color(0xFF00C2FF),
          onPressed: () {
            if (onAddContact != null) {
              onAddContact!();
            }
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Container(
        color: Colors.black,
        child: SafeArea(
          child: Column(
            children: [
              // Top Bar with Back Arrow, "SOS" title, and More Options Menu
              _buildTopBar(context),

              // Scrollable content area matching the exact screenshot layout
              Expanded(
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
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  children: [
                                    const SizedBox(height: 16),

                                    // Siren Graphic (Red alarm beacon with light beams)
                                    _buildSirenIllustration(),

                                    const SizedBox(height: 28),

                                    // Heading: "No SOS Contact Added"
                                    _buildHeading(),

                                    const SizedBox(height: 10),

                                    // Subtitle
                                    _buildSubtitle(),

                                    const SizedBox(height: 36),

                                    // 3 Feature items with vertical dividers
                                    _buildFeatureItems(context),
                                  ],
                                ),

                                // Bottom CTA Button: "Add Contact +"
                                Padding(
                                  padding: EdgeInsets.only(
                                    top: 32,
                                    bottom: hasBottomNav ? 90 : 28,
                                  ),
                                  child: _buildAddContactButton(context),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Top App Bar: Back button, Title "SOS", and More options (Three-dots)
  Widget _buildTopBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Back Button
              AnimatedBackArrowButton(onTap: () {
                  if (onBack != null) {
                    onBack!();
                  } else if (Navigator.canPop(context)) {
                    Navigator.pop(context);
                  }
                }),

              // Spacer for symmetric centering
              const SizedBox(width: 40),
            ],
          ),

          // Title: "SOS"
          const Text(
            'SOS',
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),

          // Right Three-dot Menu
          Positioned(
            right: 0,
            child: PopupMenuButton<String>(
              icon: const Icon(
                Icons.more_vert_rounded,
                color: Colors.white,
                size: 22,
              ),
              color: const Color(0xFF0F1A2A),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: const BorderSide(color: Color(0xFF1E2D4A)),
              ),
              onSelected: (value) {
                if (value == 'add') {
                  if (onAddContact != null) {
                    onAddContact!();
                  }
                } else if (value == 'hospital') {
                  if (onFindHospital != null) {
                    onFindHospital!();
                  }
                } else if (value == 'helpline') {
                  _callEmergencyHelpline(context);
                }
              },
              itemBuilder: (ctx) => [
                const PopupMenuItem(
                  value: 'add',
                  child: Row(
                    children: [
                      Icon(Icons.person_add_rounded, color: Color(0xFF00C2FF), size: 18),
                      SizedBox(width: 10),
                      Text(
                        'Add Contact',
                        style: TextStyle(color: Colors.white, fontSize: 13.5),
                      ),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'helpline',
                  child: Row(
                    children: [
                      Icon(Icons.phone_in_talk_rounded, color: Color(0xFFFF4D4D), size: 18),
                      SizedBox(width: 10),
                      Text(
                        'Emergency 112',
                        style: TextStyle(color: Colors.white, fontSize: 13.5),
                      ),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'hospital',
                  child: Row(
                    children: [
                      Icon(Icons.local_hospital_rounded, color: Color(0xFF00C2FF), size: 18),
                      SizedBox(width: 10),
                      Text(
                        'Nearby Hospitals',
                        style: TextStyle(color: Colors.white, fontSize: 13.5),
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

  /// Siren Illustration with subtle glow
  Widget _buildSirenIllustration() {
    return Center(
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Soft radial glow behind the siren
          Container(
            width: 180,
            height: 180,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFFF1A1A).withValues(alpha: 0.18),
                  blurRadius: 70,
                  spreadRadius: 20,
                ),
              ],
            ),
          ),

          // Primary siren image (uses PNG extracted from nosos.svg for optimal rendering, with SVG fallback)
          Image.asset(
            'assets/icons/nosos.png',
            width: 215,
            height: 193,
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) {
              return SvgPicture.asset(
                'assets/icons/nosos.svg',
                width: 215,
                height: 193,
                fit: BoxFit.contain,
              );
            },
          ),
        ],
      ),
    );
  }

  /// Heading: "No SOS Contact Added"
  Widget _buildHeading() {
    return RichText(
      textAlign: TextAlign.center,
      text: const TextSpan(
        style: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.2,
          fontFamily: null,
        ),
        children: [
          TextSpan(
            text: 'No ',
            style: TextStyle(color: Colors.white),
          ),
          TextSpan(
            text: 'SOS Contact',
            style: TextStyle(
              color: Color(0xFFFF3333),
              shadows: [
                Shadow(
                  color: Color(0x66FF3333),
                  blurRadius: 16,
                ),
              ],
            ),
          ),
          TextSpan(
            text: ' Added',
            style: TextStyle(color: Colors.white),
          ),
        ],
      ),
    );
  }

  /// Subtitle: "Add your emergency contact to enable SOS and get help quickly when needed."
  Widget _buildSubtitle() {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 16),
      child: Text(
        'Add your emergency contact to enable SOS\nand get help quickly when needed.',
        textAlign: TextAlign.center,
        style: TextStyle(
          color: Color(0xFF8E9BAE),
          fontSize: 14,
          fontWeight: FontWeight.w400,
          height: 1.45,
        ),
      ),
    );
  }

  /// 3 Feature items in a row with vertical dividers
  Widget _buildFeatureItems(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1: Share Live Location
          Expanded(
            child: _buildFeatureTile(
              context: context,
              icon: Icons.location_on_outlined,
              label: 'Share\nLive Location',
              onTap: () {
                _showFeatureNotice(
                  context,
                  'Live Location Sharing',
                  'When an emergency contact is added, your real-time GPS coordinates are automatically shared during an SOS.',
                );
              },
            ),
          ),

          // Vertical Divider 1
          _buildDivider(),

          // 2: Call Emergency Contact
          Expanded(
            child: _buildFeatureTile(
              context: context,
              icon: Icons.call_outlined,
              label: 'Call Emergency\nContact',
              onTap: () {
                if (onAddContact != null) {
                  onAddContact!();
                }
              },
            ),
          ),

          // Vertical Divider 2
          _buildDivider(),

          // 3: Find Nearest Hospital
          Expanded(
            child: _buildFeatureTile(
              context: context,
              icon: Icons.medical_services_outlined,
              label: 'Find Nearest\nHospital',
              onTap: () {
                if (onFindHospital != null) {
                  onFindHospital!();
                } else {
                  _callEmergencyHelpline(context);
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 48,
      margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      color: const Color(0xFF1B283A),
    );
  }

  /// Individual Feature Tile
  Widget _buildFeatureTile({
    required BuildContext context,
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon Container
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: const Color(0xFF0F1E32),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: const Color(0xFF00C2FF).withValues(alpha: 0.35),
                  width: 1.2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF00C2FF).withValues(alpha: 0.08),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Icon(
                icon,
                color: const Color(0xFF00C2FF),
                size: 24,
              ),
            ),

            const SizedBox(height: 10),

            // Feature Label
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFFC4D1DE),
                fontSize: 11.5,
                fontWeight: FontWeight.w500,
                height: 1.3,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Bottom CTA Pill Button: "Add Contact +"
  Widget _buildAddContactButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        onPressed: () {
          if (onAddContact != null) {
            onAddContact!();
          }
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF00C2FF),
          foregroundColor: Colors.black,
          elevation: 4,
          shadowColor: const Color(0xFF00C2FF).withValues(alpha: 0.4),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
          padding: const EdgeInsets.symmetric(vertical: 14),
        ),
        child: const Text(
          'Add Contact +',
          style: TextStyle(
            color: Colors.black,
            fontSize: 16.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.3,
          ),
        ),
      ),
    );
  }
}
