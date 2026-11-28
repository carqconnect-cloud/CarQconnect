import 'package:flutter/material.dart';
import '../../globals.dart';
import '../../theme/app_theme.dart';
import 'fastag_models.dart';
import 'select_bank_screen.dart';
import 'enter_details_screen.dart';
import '../../widgets/animated_back_arrow.dart';
import '../../utils/app_validators.dart';

class AddFastagScreen extends StatefulWidget {
  const AddFastagScreen({super.key});

  @override
  State<AddFastagScreen> createState() => _AddFastagScreenState();
}

class _AddFastagScreenState extends State<AddFastagScreen> {
  final TextEditingController _vehicleNumberController = TextEditingController(
    text: Globals.vehicleRegistration,
  );

  final List<Map<String, dynamic>> _popularBanks = [
    {
      'name': 'HDFC Bank',
      'asset': 'assets/fastagicons/HDFC.png',
      'isOther': false,
    },
    {
      'name': 'ICICI Bank',
      'asset': '',
      'isOther': false,
    },
    {
      'name': 'SBI FASTag',
      'asset': 'assets/fastagicons/SBI.png',
      'isOther': false,
    },
    {
      'name': 'Axis Bank',
      'asset': 'assets/fastagicons/Axis.png',
      'isOther': false,
    },
    {
      'name': 'IDBI Bank',
      'asset': 'assets/fastagicons/idbi.png',
      'isOther': false,
    },
    {
      'name': 'Kotak',
      'asset': 'assets/fastagicons/kotak.png',
      'isOther': false,
    },
    {
      'name': 'IDFC',
      'asset': 'assets/fastagicons/idfc.png',
      'isOther': false,
    },
    {
      'name': 'Other Bank',
      'asset': '',
      'isOther': true,
    },
  ];

  @override
  void dispose() {
    _vehicleNumberController.dispose();
    super.dispose();
  }

  void _onBankSelected(Map<String, dynamic> bank) {
    if (bank['isOther'] == true) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => SelectBankScreen(
            vehicleNumber: _vehicleNumberController.text.trim(),
          ),
        ),
      );
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => EnterDetailsScreen(
            bankName: bank['name'] as String,
            assetPath: bank['asset'] as String?,
            vehicleNumber: _vehicleNumberController.text.trim(),
          ),
        ),
      );
    }
  }

  void _findFastag() {
    final reg = _vehicleNumberController.text.trim();
    final regErr = AppValidators.validateVehicleNumber(reg);
    if (regErr != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppTheme.isLight ? const Color(0xFFFEE2E2) : const Color(0xFF2D1214),
          content: Text(
            regErr,
            style: TextStyle(color: AppTheme.isLight ? const Color(0xFFDC2626) : const Color(0xFFFF5252)),
          ),
        ),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EnterDetailsScreen(
          bankName: 'HDFC Bank',
          assetPath: 'assets/fastagicons/HDFC.png',
          vehicleNumber: reg,
        ),
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
                'FASTag',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.2,
                ),
              ),
            ),
            body: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 10),

              // Title & Subtitle
              Text(
                'Add FASTag',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Link your FASTag to check balance, recharge and view transactions.',
                style: TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 13.5,
                  height: 1.4,
                ),
              ),

              const SizedBox(height: 14),

              // 3D Toll Plaza Illustration
              const TollPlazaIllustration(),

              const SizedBox(height: 16),

              // Vehicle Registration Number Input Box
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.cardBg,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppTheme.cardBorder),
                  boxShadow: AppTheme.cardShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Vehicle Registration Number',
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      height: 52,
                      decoration: BoxDecoration(
                        color: AppTheme.inputBg,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppTheme.inputBorder),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: Row(
                        children: [
                          const IndPlateBadge(),
                          const SizedBox(width: 14),
                          Expanded(
                            child: TextField(
                              controller: _vehicleNumberController,
                              inputFormatters: AppValidators.vehicleNumberFormatters,
                              style: TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.0,
                              ),
                              decoration: InputDecoration(
                                hintText: 'e.g. DL 01 AB 1234',
                                hintStyle: TextStyle(
                                  color: AppTheme.textSecondary.withValues(alpha: 0.7),
                                  fontSize: 15,
                                  fontWeight: FontWeight.w500,
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

              const SizedBox(height: 16),

              // Find FASTag Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _findFastag,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: isLight ? Colors.white : Colors.black,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(26),
                    ),
                  ),
                  child: Text(
                    'Find FASTag',
                    style: TextStyle(
                      color: isLight ? Colors.white : Colors.black,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 22),

              // OR Divider
              Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 1,
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E293B),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: Text(
                      'OR',
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Container(
                      height: 1,
                      color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E293B),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Section: Select your bank
              Text(
                'Select your bank',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Choose your FASTag issuer for direct balance check',
                style: TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 12,
                ),
              ),

              const SizedBox(height: 14),

              // 4 Columns x 2 Rows Grid of 8 Banks
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _popularBanks.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 4,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 10,
                  childAspectRatio: 0.85,
                ),
                itemBuilder: (context, index) {
                  final bank = _popularBanks[index];
                  final isOther = bank['isOther'] == true;

                  return InkWell(
                    onTap: () => _onBankSelected(bank),
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppTheme.cardBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.cardBorder),
                        boxShadow: AppTheme.cardShadow,
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 4,
                        vertical: 10,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (isOther)
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF142238),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Center(
                                child: Icon(
                                  Icons.more_horiz_rounded,
                                  color: AppTheme.primaryColor,
                                  size: 22,
                                ),
                              ),
                            )
                          else
                            BankLogoWidget(
                              bankName: bank['name'] as String,
                              assetPath: bank['asset'] as String?,
                              size: 36,
                            ),
                          const SizedBox(height: 8),
                          Text(
                            bank['name'] as String,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),

              const SizedBox(height: 28),
            ],
          ),
        ),
      ),
    ),
  );
      },
    );
  }
}
