import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import 'fastag_models.dart';
import 'enter_details_screen.dart';
import '../../widgets/animated_back_arrow.dart';

class SelectBankScreen extends StatefulWidget {
  final String vehicleNumber;

  const SelectBankScreen({super.key, this.vehicleNumber = 'MP 09 AB 1234'});

  @override
  State<SelectBankScreen> createState() => _SelectBankScreenState();
}

class _SelectBankScreenState extends State<SelectBankScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  final List<BankInfo> _popularBanks = const [
    BankInfo(
      id: '1',
      name: 'HDFC Bank',
      assetPath: 'assets/fastagicons/HDFC.png',
      isPopular: true,
    ),
    BankInfo(
      id: '2',
      name: 'ICICI Bank',
      assetPath: 'assets/fastagicons/icici.png',
      isPopular: true,
    ),
    BankInfo(
      id: '3',
      name: 'SBI FASTag',
      assetPath: 'assets/fastagicons/SBI.png',
      isPopular: true,
    ),
    BankInfo(
      id: '4',
      name: 'Axis Bank',
      assetPath: 'assets/fastagicons/Axis.png',
      isPopular: true,
    ),
    BankInfo(
      id: '5',
      name: 'IDBI Bank',
      assetPath: 'assets/fastagicons/idbi.png',
      isPopular: true,
    ),
    BankInfo(
      id: '6',
      name: 'Kotak',
      assetPath: 'assets/fastagicons/kotak.png',
      isPopular: true,
    ),
    BankInfo(
      id: '7',
      name: 'IDFC',
      assetPath: 'assets/fastagicons/idfc.png',
      isPopular: true,
    ),
    BankInfo(
      id: '8',
      name: 'LivQuik',
      assetPath: 'assets/fastagicons/liv.png',
      isPopular: true,
    ),
  ];

  final List<BankInfo> _allBanks = const [
    BankInfo(
      id: '9',
      name: 'Airtel Payments Bank',
      assetPath: 'assets/fastagicons/airtel.png',
    ),
    BankInfo(
      id: '10',
      name: 'AU Small Finance Bank',
      assetPath: 'assets/fastagicons/AU.png',
    ),
    BankInfo(
      id: '11',
      name: 'Canara Bank',
      assetPath: 'assets/fastagicons/canrabank.png',
    ),
    BankInfo(
      id: '12',
      name: 'Central Bank of India',
      assetPath: 'assets/fastagicons/cbi.png',
    ),
    BankInfo(
      id: '13',
      name: 'Federal Bank',
      assetPath: 'assets/fastagicons/fideralbank.png',
    ),
    BankInfo(
      id: '14',
      name: 'Bank of Baroda - Fastag',
      assetPath: 'assets/fastagicons/bob.png',
    ),
    BankInfo(
      id: '15',
      name: 'IndusInd Bank',
      assetPath: 'assets/fastagicons/induslandbank.png',
    ),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSelectBank(BankInfo bank) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EnterDetailsScreen(
          bankName: bank.name,
          assetPath: bank.assetPath,
          vehicleNumber: widget.vehicleNumber,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final filteredPopular = _popularBanks.where((b) {
          return b.name.toLowerCase().contains(_searchQuery.toLowerCase());
        }).toList();

        final filteredAll = _allBanks.where((b) {
          return b.name.toLowerCase().contains(_searchQuery.toLowerCase());
        }).toList();

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
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
              titleSpacing: 0,
              title: Container(
                height: 46,
                margin: const EdgeInsets.only(right: 16),
                decoration: BoxDecoration(
                  color: isLight ? Colors.white : const Color(0xFF101726),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E2B40),
                  ),
                  boxShadow: isLight ? AppTheme.cardShadow : null,
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (val) {
                    setState(() {
                      _searchQuery = val;
                    });
                  },
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14,
                  ),
                  decoration: InputDecoration(
                    prefixIcon: Icon(
                      Icons.search,
                      color: isLight ? AppTheme.primaryColor : const Color(0xFF64748B),
                      size: 20,
                    ),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: Icon(
                              Icons.close,
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF64748B),
                              size: 18,
                            ),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _searchQuery = '';
                              });
                            },
                          )
                        : null,
                    hintText: 'Search bank by name',
                    hintStyle: TextStyle(
                      color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                      fontSize: 14,
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ),
            body: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 16),

                    // Section 1: Popular Banks
                    if (filteredPopular.isNotEmpty) ...[
                      Text(
                        'Popular Banks',
                        style: TextStyle(
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: filteredPopular.length,
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 4,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 10,
                          childAspectRatio: 0.85,
                        ),
                        itemBuilder: (context, index) {
                          final bank = filteredPopular[index];
                          return InkWell(
                            onTap: () => _onSelectBank(bank),
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              decoration: BoxDecoration(
                                color: isLight ? Colors.white : const Color(0xFF101726),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                                ),
                                boxShadow: isLight ? AppTheme.cardShadow : null,
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 4,
                                vertical: 10,
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  BankLogoWidget(
                                    bankName: bank.name,
                                    assetPath: bank.assetPath,
                                    size: 36,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    bank.name,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
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
                      const SizedBox(height: 24),
                    ],

                    // Section 2: All Banks
                    Text(
                      'All Banks',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),

                    if (filteredAll.isEmpty && filteredPopular.isEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 40),
                        alignment: Alignment.center,
                        child: Text(
                          'No banks matching your search',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                            fontSize: 14,
                          ),
                        ),
                      )
                    else
                      ...filteredAll.map((bank) {
                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: InkWell(
                            onTap: () => _onSelectBank(bank),
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 12,
                              ),
                              decoration: BoxDecoration(
                                color: isLight ? Colors.white : const Color(0xFF101726),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                                ),
                                boxShadow: isLight ? AppTheme.cardShadow : null,
                              ),
                              child: Row(
                                children: [
                                  BankLogoWidget(
                                    bankName: bank.name,
                                    assetPath: bank.assetPath,
                                    size: 40,
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Text(
                                      bank.name,
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  Icon(
                                    Icons.chevron_right_rounded,
                                    color: isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                    size: 20,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),

                    const SizedBox(height: 24),
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
