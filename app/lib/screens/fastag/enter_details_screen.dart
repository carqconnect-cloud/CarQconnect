import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'fastag_screen.dart';
import '../../widgets/animated_back_arrow.dart';

class EnterDetailsScreen extends StatefulWidget {
  final String bankName;
  final String? assetPath;
  final String vehicleNumber;

  const EnterDetailsScreen({
    super.key,
    this.bankName = 'HDFC Bank',
    this.assetPath = 'assets/fastagicons/HDFC.png',
    this.vehicleNumber = 'MP 09 AB 1234',
  });

  @override
  State<EnterDetailsScreen> createState() => _EnterDetailsScreenState();
}

class _EnterDetailsScreenState extends State<EnterDetailsScreen> {
  late TextEditingController _vehicleController;

  @override
  void initState() {
    super.initState();
    _vehicleController = TextEditingController(text: widget.vehicleNumber);
  }

  @override
  void dispose() {
    _vehicleController.dispose();
    super.dispose();
  }

  void _onFindFastag() {
    final reg = _vehicleController.text.trim();
    if (reg.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF2D1214),
          content: Text(
            'Please enter a valid Registration Number',
            style: TextStyle(color: Color(0xFFFF5252)),
          ),
        ),
      );
      return;
    }

    final account = FastagAccount(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      bankName: '${widget.bankName} FASTag',
      vehicleNumber: reg,
      balance: 200,
      customerName: 'John Doe',
      logoAsset: widget.assetPath,
      statusMessage: 'Available Balance : ₹200',
      isLowBalance: false,
    );

    Navigator.push(
      context,
      MaterialPageRoute(
        settings: const RouteSettings(name: 'FastagScreen'),
        builder: (context) => FastagScreen(newAccount: account),
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
            color: isLight ? null : const Color(0xFF090E17),
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
                'Enter Details',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.2,
                ),
              ),
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 12),

                          // 1. Selected Bank Card
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Row(
                              children: [
                                BankLogoWidget(
                                  bankName: widget.bankName,
                                  assetPath: widget.assetPath,
                                  size: 42,
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            widget.bankName,
                                            style: TextStyle(
                                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          const Icon(
                                            Icons.check_circle_rounded,
                                            color: Color(0xFF00E676),
                                            size: 16,
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'FASTag Services',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                          fontSize: 13,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 18),

                          // 2. Vehicle Registration Number Card
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Vehicle Registration Number',
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF475569) : const Color(0xFF8E9BAE),
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Container(
                                  height: 52,
                                  decoration: BoxDecoration(
                                    color: isLight ? const Color(0xFFF8FAFC) : const Color(0xFF0D1424),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2B40),
                                    ),
                                  ),
                                  padding: const EdgeInsets.symmetric(horizontal: 10),
                                  child: Row(
                                    children: [
                                      const IndPlateBadge(),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: TextField(
                                          controller: _vehicleController,
                                          style: TextStyle(
                                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            letterSpacing: 1.0,
                                          ),
                                          decoration: InputDecoration(
                                            hintText: 'eg. MP 09 AB 1234',
                                            hintStyle: TextStyle(
                                              color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                              fontSize: 15,
                                            ),
                                            border: InputBorder.none,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 18),

                          // 3. Security Encrypted Card
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isLight ? Colors.white : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF142238),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Center(
                                    child: Icon(
                                      Icons.lock_outline_rounded,
                                      color: AppTheme.primaryColor,
                                      size: 20,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'End-to-End Encrypted',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                          fontSize: 14.5,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'We will securely fetch your FASTag linked to this mobile number via NPCI toll network protocol.',
                                        style: TextStyle(
                                          color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                          fontSize: 12.5,
                                          height: 1.4,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Find FASTag Button & NPCI Footer
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
                    decoration: BoxDecoration(
                      color: isLight ? Colors.white : const Color(0xFF090E17),
                      border: isLight ? const Border(top: BorderSide(color: Color(0xFFE2E8F0))) : null,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton(
                            onPressed: _onFindFastag,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                            ),
                            child: const Text(
                              'Find FASTag',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.2,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.verified_user_outlined,
                              color: Color(0xFF00E676),
                              size: 14,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'NPCI Authorized FASTag Recharge Point',
                              style: TextStyle(
                                color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                fontSize: 11.5,
                                fontWeight: FontWeight.w500,
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
}
