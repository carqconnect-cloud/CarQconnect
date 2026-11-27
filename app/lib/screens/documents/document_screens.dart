import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'dart:convert';
import 'dart:async';

import '../../globals.dart';
import '../../services/auth_storage_service.dart';
import '../../services/screen_refresh_service.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import 'document_model.dart';
import 'document_page.dart';
import 'add_documents.dart';
import 'document_details.dart';
import '../../widgets/animated_back_arrow.dart';

export 'document_page.dart';
export 'add_documents.dart';
export 'document_details.dart';
export 'document_added.dart';
export 'document_model.dart';

class VehicleDocumentsScreen extends StatefulWidget {
  const VehicleDocumentsScreen({super.key});

  @override
  State<VehicleDocumentsScreen> createState() => _VehicleDocumentsScreenState();
}

class _VehicleDocumentsScreenState extends State<VehicleDocumentsScreen>
    with RefreshOnRouteReturn<VehicleDocumentsScreen> {
  String _selectedFilter = 'All';

  final List<String> _filters = ['All', 'Valid', 'Expiring Soon', 'Expired'];

  static const String _cacheKey = 'cached_vehicle_documents';
  List<VehicleDocument> _documents = [];
  bool _isLoading = true;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _loadCachedDocuments();
    _fetchDocuments(showSpinner: _documents.isEmpty);
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      if (mounted) {
        _fetchDocuments(showSpinner: false);
      }
    });
  }

  Future<void> _loadCachedDocuments() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedStr = prefs.getString(_cacheKey);
      if (cachedStr != null && cachedStr.isNotEmpty) {
        final List<dynamic> list = jsonDecode(cachedStr);
        if (mounted && list.isNotEmpty) {
          setState(() {
            _documents = list.map((json) => VehicleDocument.fromJson(json)).toList();
            _isLoading = false;
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _cacheDocuments(List<dynamic> docsJson) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, jsonEncode(docsJson));
    } catch (_) {}
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchDocuments({bool showSpinner = false}) async {
    if (showSpinner && _documents.isEmpty) {
      setState(() {
        _isLoading = true;
      });
    }

    try {
      final response = await AuthStorageService.authenticatedGet(
        '/documents',
        timeout: const Duration(seconds: 25),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final List<dynamic> docsJson = data['data'] ?? [];
          _cacheDocuments(docsJson);
          if (mounted) {
            setState(() {
              _documents = docsJson
                  .map((json) => VehicleDocument.fromJson(json))
                  .toList();
              _isLoading = false;
            });
          }
          return;
        }
      }

      // If network fails but we have cached documents or want to show empty page:
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('[VehicleDocuments] Fetch error: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  List<VehicleDocument> get _filteredDocuments {
    if (_selectedFilter == 'All') {
      return _documents;
    } else if (_selectedFilter == 'Valid') {
      return _documents
          .where(
            (doc) =>
                doc.status == DocumentStatus.valid ||
                doc.status == DocumentStatus.active,
          )
          .toList();
    } else if (_selectedFilter == 'Expiring Soon') {
      return _documents
          .where((doc) => doc.status == DocumentStatus.expiringSoon)
          .toList();
    } else if (_selectedFilter == 'Expired') {
      return _documents
          .where((doc) => doc.status == DocumentStatus.expired)
          .toList();
    }
    return _documents;
  }

  void _showHelpDialog() {
    final isLight = AppTheme.isLightNotifier.value;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1E293B),
          ),
        ),
        title: Row(
          children: [
            const Icon(Icons.help_outline_rounded, color: Color(0xFF0066FF)),
            const SizedBox(width: 10),
            Text(
              'Document Help',
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '• Keep digital copies of your vehicle documents safe and easily accessible anywhere.\n\n'
              '• Receive smart expiry reminders before your documents lapse.\n\n'
              '• Tap on any document to inspect details or share with authorities.',
              style: TextStyle(
                color: isLight
                    ? const Color(0xFF475569)
                    : const Color(0xFFCBD5E1),
                fontSize: 13,
                height: 1.5,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Got it',
              style: TextStyle(
                color: Color(0xFF0066FF),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocIcon(String docType, bool isLight) {
    final iconBg = isLight ? const Color(0xFFF1F5F9) : const Color(0xFF162030);
    final iconColor = isLight ? const Color(0xFF334155) : const Color(0xFFCBD5E1);
    switch (docType) {
      case 'rc':
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Icon(Icons.credit_card_rounded, color: iconColor, size: 22),
          ),
        );
      case 'insurance':
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Icon(Icons.shield_outlined, color: iconColor, size: 22),
          ),
        );
      case 'puc':
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: iconColor, width: 1.5),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'PUC',
                      style: TextStyle(
                        color: iconColor,
                        fontSize: 8,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                    Icon(Icons.cloud_outlined, size: 11, color: iconColor),
                  ],
                ),
              ],
            ),
          ),
        );
      case 'license':
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Icon(Icons.account_box_outlined, color: iconColor, size: 22),
          ),
        );
      case 'fastag':
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Text(
              'FASTag',
              style: TextStyle(
                color: iconColor,
                fontSize: 9,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.2,
              ),
            ),
          ),
        );
      case 'fitness':
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Icon(
              Icons.monitor_heart_outlined,
              color: iconColor,
              size: 22,
            ),
          ),
        );
      default:
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Icon(Icons.description_outlined, color: iconColor, size: 22),
          ),
        );
    }
  }

  Widget _buildDocCard(VehicleDocument doc, bool isLight) {
    return GestureDetector(
      onTap: () async {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => DocumentDetailsScreen(
              document: doc,
              vehicleName: Globals.vehicleModel.isNotEmpty
                  ? Globals.vehicleModel
                  : 'My Vehicle',
              vehicleNumber: doc.regNumber.isNotEmpty
                  ? doc.regNumber
                  : Globals.vehicleRegistration,
            ),
          ),
        );
        if (mounted) {
          _fetchDocuments(showSpinner: false);
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.cardBorder),
          boxShadow: isLight ? AppTheme.cardShadow : null,
        ),
        child: Row(
          children: [
            _buildDocIcon(doc.docType, isLight),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    doc.title,
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  () {
                    final expiryInfo = doc.expiryDate.isNotEmpty
                        ? 'Valid till: ${doc.expiryDate}'
                        : 'Document active';
                    final subtitleText = doc.subtitle.isNotEmpty
                        ? doc.subtitle
                        : expiryInfo;
                    return Text(
                      subtitleText,
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w400,
                      ),
                    );
                  }(),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: doc.statusBgColor,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: doc.statusBorderColor),
              ),
              child: Text(
                doc.statusText,
                style: TextStyle(
                  color: doc.statusTextColor,
                  fontSize: 10.5,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Future<void> refreshOnRouteReturn() => _fetchDocuments(showSpinner: false);

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        final filtered = _filteredDocuments;

        if (_isLoading) {
          return Scaffold(
            backgroundColor: isLight
                ? const Color(0xFFF7F9FC)
                : const Color(0xFF040A18),
            body: Center(
              child: AppLoadingSpinner(size: 80, primaryColor: AppTheme.primaryBlue),
            ),
          );
        }

        if (_documents.isEmpty) {
          return DocumentPage(
            onRefresh: () => _fetchDocuments(showSpinner: false),
            onDocumentAdded: () => _fetchDocuments(showSpinner: false),
          );
        }

        return Container(
          decoration: BoxDecoration(gradient: AppTheme.bgGradient),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            appBar: AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              centerTitle: true,
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () {
                  if (Navigator.canPop(context)) {
                    Navigator.pop(context);
                  }
                }),
              title: Text(
                'Vehicle Documents',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.2,
                ),
              ),
              actions: [
                IconButton(
                  icon: Icon(
                    Icons.help_outline_rounded,
                    color: AppTheme.textPrimary,
                    size: 22,
                  ),
                  onPressed: _showHelpDialog,
                ),
              ],
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: RefreshIndicator(
                      color: AppTheme.primaryBlue,
                      backgroundColor: AppTheme.cardBg,
                      onRefresh: () => _fetchDocuments(showSpinner: false),
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 8),

                            // Vehicle Card
                            VehicleSelectorCard(
                              vehicleName: Globals.vehicleModel.isNotEmpty
                                  ? Globals.vehicleModel
                                  : 'My Vehicle',
                              vehicleNumber: Globals.vehicleRegistration,
                              onSwitch: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    backgroundColor: AppTheme.cardBg,
                                    content: Text(
                                      'Only 1 vehicle registered currently',
                                      style: TextStyle(
                                        color: AppTheme.textPrimary,
                                      ),
                                    ),
                                    behavior: SnackBarBehavior.floating,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                );
                              },
                            ),

                            const SizedBox(height: 18),

                            // Filter Chips Bar
                            SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                children: _filters.map((filter) {
                                  final isSelected = _selectedFilter == filter;
                                  return Padding(
                                    padding: const EdgeInsets.only(right: 10),
                                    child: InkWell(
                                      onTap: () {
                                        setState(() {
                                          _selectedFilter = filter;
                                        });
                                      },
                                      borderRadius: BorderRadius.circular(20),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 18,
                                          vertical: 8,
                                        ),
                                        decoration: BoxDecoration(
                                          color: isSelected
                                              ? AppTheme.primaryBlue
                                              : AppTheme.cardBg,
                                          borderRadius: BorderRadius.circular(
                                            20,
                                          ),
                                          border: Border.all(
                                            color: isSelected
                                                ? AppTheme.primaryBlue
                                                : AppTheme.cardBorder,
                                          ),
                                          boxShadow: isSelected
                                              ? []
                                              : (isLight
                                                    ? AppTheme.cardShadow
                                                    : null),
                                        ),
                                        child: Text(
                                          filter,
                                          style: TextStyle(
                                            color: isSelected
                                                ? Colors.white
                                                : AppTheme.textSecondary,
                                            fontSize: 13,
                                            fontWeight: isSelected
                                                ? FontWeight.bold
                                                : FontWeight.w500,
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                            ),

                            const SizedBox(height: 18),

                            // Documents List or Empty placeholder
                            if (filtered.isEmpty)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 40,
                                ),
                                alignment: Alignment.center,
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.folder_off_outlined,
                                      size: 48,
                                      color: AppTheme.textMuted.withValues(
                                        alpha: 0.5,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      'No ${_selectedFilter.toLowerCase()} documents found',
                                      style: TextStyle(
                                        color: AppTheme.textSecondary,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            else
                              ...filtered.map(
                                (doc) => _buildDocCard(doc, isLight),
                              ),

                            const SizedBox(height: 20),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Bottom Add Document Button
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                    decoration: const BoxDecoration(color: Colors.transparent),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const AddDocumentsScreen(),
                            ),
                          );
                          if (mounted) {
                            _fetchDocuments(showSpinner: false);
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryBlue,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(26),
                          ),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add, color: Colors.white, size: 22),
                            SizedBox(width: 6),
                            Text(
                              'Add Document',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 15.5,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.2,
                              ),
                            ),
                          ],
                        ),
                      ),
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
