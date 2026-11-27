import 'package:flutter/material.dart';
import '../../widgets/animated_back_arrow.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../services/localization_service.dart';

class LanguageOption {
  final String code;
  final String badge;
  final String title;
  final String subtitle;

  const LanguageOption({
    required this.code,
    required this.badge,
    required this.title,
    required this.subtitle,
  });
}

/// Language Selection Screen
class LanguageScreen extends StatefulWidget {
  final String currentLanguage;

  const LanguageScreen({
    super.key,
    this.currentLanguage = 'English (India)',
  });

  @override
  State<LanguageScreen> createState() => _LanguageScreenState();
}

class _LanguageScreenState extends State<LanguageScreen> {
  late String _selectedLanguage;
  late String _selectedCode;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  bool _isSaving = false;

  final List<LanguageOption> _allLanguages = const [
    LanguageOption(
      code: 'en_IN',
      badge: 'EN',
      title: 'English (India)',
      subtitle: 'Default in-cabin telematics language',
    ),
    LanguageOption(
      code: 'hi_IN',
      badge: 'हि',
      title: 'Hindi',
      subtitle: 'हिंदी (भारत)',
    ),
    LanguageOption(
      code: 'mr_IN',
      badge: 'म',
      title: 'Marathi',
      subtitle: 'मराठी (महाराष्ट्र)',
    ),
    LanguageOption(
      code: 'gu_IN',
      badge: 'ગુ',
      title: 'Gujarati',
      subtitle: 'ગુજરાતી (ભારત)',
    ),
    LanguageOption(
      code: 'ta_IN',
      badge: 'த',
      title: 'Tamil',
      subtitle: 'தமிழ் (இந்தியா)',
    ),
    LanguageOption(
      code: 'te_IN',
      badge: 'తె',
      title: 'Telugu',
      subtitle: 'తెలుగు (భారతదేశం)',
    ),
    LanguageOption(
      code: 'kn_IN',
      badge: 'ಕ',
      title: 'Kannada',
      subtitle: 'ಕನ್ನಡ (ಕರ್ನಾಟಕ)',
    ),
    LanguageOption(
      code: 'bn_IN',
      badge: 'বা',
      title: 'Bengali',
      subtitle: 'বাংলা (ভারত)',
    ),
    LanguageOption(
      code: 'pa_IN',
      badge: 'ਪੰ',
      title: 'Punjabi',
      subtitle: 'ਪੰਜਾਬੀ (ਭਾਰਤ)',
    ),
    LanguageOption(
      code: 'ml_IN',
      badge: 'മ',
      title: 'Malayalam',
      subtitle: 'മലയാളം (കേരളം)',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _selectedLanguage = widget.currentLanguage;
    final match = _allLanguages.firstWhere(
      (l) => l.title == widget.currentLanguage,
      orElse: () => _allLanguages.first,
    );
    _selectedCode = match.code;
    _loadSavedLanguage();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadSavedLanguage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedTitle = prefs.getString('app_selected_language');
      final savedCode = prefs.getString('app_selected_language_code');

      if (savedTitle != null && savedTitle.isNotEmpty && mounted) {
        setState(() {
          _selectedLanguage = savedTitle;
          _selectedCode = savedCode ?? _selectedCode;
        });
      }
    } catch (_) {
      // fallback to initial
    }
  }

  Future<void> _saveAndApplyLanguage() async {
    if (_isSaving) return;

    setState(() {
      _isSaving = true;
    });

    try {
      await LocalizationService.setLanguage(_selectedLanguage, _selectedCode);

      if (!mounted) return;

      final isLight = AppTheme.isLightNotifier.value;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          backgroundColor: isLight ? const Color(0xFF0F172A) : const Color(0xFF1E293B),
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Color(0xFF0066FF), size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '${'Language updated to'.tr} $_selectedLanguage',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          duration: const Duration(seconds: 2),
        ),
      );

      Navigator.pop(context, _selectedLanguage);
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
        Navigator.pop(context, _selectedLanguage);
      }
    }
  }

  List<LanguageOption> get _filteredLanguages {
    if (_searchQuery.trim().isEmpty) return _allLanguages;
    final q = _searchQuery.toLowerCase().trim();
    return _allLanguages.where((l) {
      return l.title.toLowerCase().contains(q) ||
          l.subtitle.toLowerCase().contains(q) ||
          l.badge.toLowerCase().contains(q) ||
          l.code.toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final cardBg = AppTheme.settingsCardBg;
        final cardBorder = isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1B263C);
        final textPrimary = isLight ? const Color(0xFF0F172A) : Colors.white;
        final textSecondary = isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE);

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
              leading: AnimatedBackArrowButton(
                onTap: () => Navigator.pop(context, _selectedLanguage),
              ),
              title: Text(
                'Language',
                style: TextStyle(
                  color: textPrimary,
                  fontSize: 18.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            body: SafeArea(
              child: Column(
                children: [
                  // Search Box
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                    child: Container(
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: cardBorder),
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
                          color: textPrimary,
                          fontSize: 14.5,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Search language (e.g. Hindi, English)...',
                          hintStyle: TextStyle(color: textSecondary, fontSize: 14),
                          prefixIcon: Icon(Icons.search_rounded, color: textSecondary, size: 20),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: Icon(Icons.close_rounded, color: textSecondary, size: 18),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() {
                                      _searchQuery = '';
                                    });
                                  },
                                )
                              : null,
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                      ),
                    ),
                  ),

                  // Language List
                  Expanded(
                    child: _filteredLanguages.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.translate_rounded, size: 48, color: textSecondary.withValues(alpha: 0.5)),
                                const SizedBox(height: 12),
                                Text(
                                  'No language found for "$_searchQuery"',
                                  style: TextStyle(color: textSecondary, fontSize: 14.5),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                            itemCount: _filteredLanguages.length,
                            itemBuilder: (context, index) {
                              final lang = _filteredLanguages[index];
                              final isSelected = lang.title == _selectedLanguage;

                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: cardBg,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isSelected
                                        ? const Color(0xFF0066FF)
                                        : cardBorder,
                                    width: isSelected ? 1.8 : 1,
                                  ),
                                ),
                                child: Material(
                                  color: Colors.transparent,
                                  child: InkWell(
                                    onTap: () {
                                      setState(() {
                                        _selectedLanguage = lang.title;
                                        _selectedCode = lang.code;
                                      });
                                    },
                                    borderRadius: BorderRadius.circular(16),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 16, vertical: 14),
                                      child: Row(
                                        children: [
                                          // Badge
                                          Container(
                                            width: 44,
                                            height: 44,
                                            decoration: BoxDecoration(
                                              color: isSelected
                                                  ? const Color(0xFF0066FF)
                                                  : (isLight
                                                      ? const Color(0xFFF1F5F9)
                                                      : const Color(0xFF162544)),
                                              borderRadius: BorderRadius.circular(12),
                                              border: Border.all(
                                                color: isSelected
                                                    ? const Color(0xFF0066FF)
                                                    : (isLight
                                                        ? const Color(0xFFE2E8F0)
                                                        : const Color(0xFF1E3A8A).withValues(alpha: 0.4)),
                                              ),
                                            ),
                                            child: Center(
                                              child: Text(
                                                lang.badge,
                                                style: TextStyle(
                                                  color: isSelected
                                                      ? Colors.white
                                                      : textPrimary,
                                                  fontSize: 15,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 14),

                                          // Titles
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  lang.title,
                                                  style: TextStyle(
                                                    color: textPrimary,
                                                    fontSize: 15,
                                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                                  ),
                                                ),
                                                const SizedBox(height: 3),
                                                Text(
                                                  lang.subtitle,
                                                  style: TextStyle(
                                                    color: isSelected ? const Color(0xFF0066FF) : textSecondary,
                                                    fontSize: 12.5,
                                                    fontWeight: isSelected ? FontWeight.w500 : FontWeight.normal,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),

                                          // Radio indicator
                                          Container(
                                            width: 22,
                                            height: 22,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: isSelected
                                                  ? const Color(0xFF0066FF)
                                                  : Colors.transparent,
                                              border: Border.all(
                                                color: isSelected
                                                    ? const Color(0xFF0066FF)
                                                    : (isLight ? const Color(0xFFCBD5E1) : const Color(0xFF334155)),
                                                width: 2,
                                              ),
                                            ),
                                            child: isSelected
                                                ? const Center(
                                                    child: CircleAvatar(
                                                      radius: 4,
                                                      backgroundColor: Colors.white,
                                                    ),
                                                  )
                                                : null,
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

            // Bottom Sticky Save Button
            bottomSheet: Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
              decoration: BoxDecoration(
                color: isLight ? Colors.white : const Color(0xFF0B1022),
                border: Border(
                  top: BorderSide(
                    color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E293B),
                    width: 1,
                  ),
                ),
              ),
              child: SafeArea(
                child: SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _isSaving ? null : _saveAndApplyLanguage,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0066FF),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: _isSaving
                        ? const AppLoadingSpinner(size: 22)
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.check_rounded, size: 20),
                              const SizedBox(width: 8),
                              Text(
                                '${'Apply'.tr} $_selectedLanguage',
                                style: const TextStyle(
                                  fontSize: 15.5,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
