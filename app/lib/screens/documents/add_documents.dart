import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';

import '../../globals.dart';
import '../../utils/api_config.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../services/screen_refresh_service.dart';

import 'package:flutter/material.dart';

import 'document_model.dart';
import 'document_added.dart';
import '../../widgets/animated_back_arrow.dart';

class AddDocumentsScreen extends StatefulWidget {
  const AddDocumentsScreen({super.key});

  @override
  State<AddDocumentsScreen> createState() => _AddDocumentsScreenState();
}

class _AddDocumentsScreenState extends State<AddDocumentsScreen>
    with RefreshOnRouteReturn<AddDocumentsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  String _vehicleName = 'Loading...';
  String _vehicleReg = '';

  @override
  void initState() {
    super.initState();
    _fetchVehicle();
  }

  Future<void> _fetchVehicle({bool showFailure = true}) async {
    try {
      final response = await http.get(
        ApiConfig.uri('/app-qr/vehicles'),
        headers: {'Authorization': 'Bearer ${Globals.accessToken}'},
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] &&
            data['data'] != null &&
            (data['data'] as List).isNotEmpty) {
          final v = data['data'][0];
          if (mounted) {
            setState(() {
              _vehicleName = v['name'] ?? 'Unknown Vehicle';
              _vehicleReg = v['regNumber'] ?? '';
            });
          }
        } else {
          if (mounted) {
            setState(() {
              _vehicleName = 'No Vehicle Found';
              _vehicleReg = '';
            });
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading vehicle for documents: $e');
      if (mounted && showFailure) {
        setState(() {
          _vehicleName = 'Error Loading Vehicle';
          _vehicleReg = '';
        });
      }
    }
  }

  @override
  Future<void> refreshOnRouteReturn() => _fetchVehicle(showFailure: false);

  final List<Map<String, dynamic>> _documentCategories = [
    {
      'title': 'Registration\nCertificate (RC)',
      'name': 'Registration Certificate (RC)',
      'icon': Icons.credit_card_rounded,
      'isCustomIcon': false,
    },
    {
      'title': 'Insurance',
      'name': 'Insurance',
      'icon': Icons.shield_outlined,
      'isCustomIcon': false,
    },
    {
      'title': 'PUC\nCertificate',
      'name': 'PUC Certificate',
      'icon': Icons.cloud_outlined,
      'isCustomIcon': true,
      'customType': 'puc',
    },
    {
      'title': 'Driving\nLicense',
      'name': 'Driving License',
      'icon': Icons.account_box_outlined,
      'isCustomIcon': false,
    },
    {
      'title': 'Fitness\nCertificate',
      'name': 'Fitness Certificate',
      'icon': Icons.monitor_heart_outlined,
      'isCustomIcon': false,
    },
    {
      'title': 'Emission\nCertificate',
      'name': 'Emission Certificate',
      'icon': Icons.cloud_done_outlined,
      'isCustomIcon': false,
    },
    {
      'title': 'Permit',
      'name': 'Permit',
      'icon': Icons.verified_user_outlined,
      'isCustomIcon': false,
    },
    {
      'title': 'Tax Receipt',
      'name': 'Tax Receipt',
      'icon': Icons.receipt_long_outlined,
      'isCustomIcon': false,
    },
    {
      'title': 'Custom\nDocument',
      'name': 'Custom Document',
      'icon': Icons.add_rounded,
      'isCustomIcon': false,
      'isCustom': true,
    },
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _navigateToForm(String docName) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AddRCScreen(
          documentType: docName,
          title: docName == 'Registration Certificate (RC)'
              ? 'Add RC'
              : 'Add $docName',
        ),
      ),
    );
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
              'Add Documents',
              style: TextStyle(
                color: isLight ? const Color(0xFF0F172A) : Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        content: Text(
          'Select the document type you want to upload or pick a file directly from your device gallery. We will auto-extract registration and expiry information for you.',
          style: TextStyle(
            color: isLight ? const Color(0xFF475569) : const Color(0xFFCBD5E1),
            fontSize: 13.5,
            height: 1.5,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Understood',
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

  @override
  Widget build(BuildContext context) {
    final filteredCategories = _documentCategories.where((category) {
      final name = (category['name'] as String).toLowerCase();
      return name.contains(_searchQuery.toLowerCase());
    }).toList();

    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        return Container(
          decoration: BoxDecoration(gradient: AppTheme.bgGradient),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            appBar: AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              centerTitle: true,
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),
              title: Text(
                'Add Documents',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.2,
                ),
              ),
              actions: [
                IconButton(
                  icon: Icon(
                    Icons.help_outline_rounded,
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    size: 22,
                  ),
                  onPressed: _showHelpDialog,
                ),
              ],
            ),
            body: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 6),

                    // Search Bar
                    Container(
                      height: 48,
                      decoration: BoxDecoration(
                        color: isLight ? Colors.white : const Color(0xFF101726),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF1E2B40),
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
                          color: isLight
                              ? const Color(0xFF0F172A)
                              : Colors.white,
                          fontSize: 14,
                        ),
                        decoration: InputDecoration(
                          prefixIcon: Icon(
                            Icons.search,
                            color: isLight
                                ? const Color(0xFF94A3B8)
                                : const Color(0xFF64748B),
                            size: 22,
                          ),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: Icon(
                                    Icons.close,
                                    color: isLight
                                        ? const Color(0xFF94A3B8)
                                        : const Color(0xFF64748B),
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
                          hintText: 'Search documents',
                          hintStyle: TextStyle(
                            color: isLight
                                ? const Color(0xFF94A3B8)
                                : const Color(0xFF64748B),
                            fontSize: 14,
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            vertical: 14,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Vehicle Card
                    VehicleSelectorCard(
                      vehicleName: _vehicleName,
                      vehicleNumber: _vehicleReg,
                    ),

                    const SizedBox(height: 18),

                    // 3x3 Grid of Document Categories
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: filteredCategories.length,
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            mainAxisSpacing: 10,
                            crossAxisSpacing: 10,
                            childAspectRatio: 0.95,
                          ),
                      itemBuilder: (context, index) {
                        final item = filteredCategories[index];
                        final isPuc = item['customType'] == 'puc';
                        final isCustom = item['isCustom'] == true;

                        return InkWell(
                          onTap: () => _navigateToForm(item['name'] as String),
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            decoration: BoxDecoration(
                              color: isLight
                                  ? Colors.white
                                  : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isLight
                                    ? const Color(0xFFE2E8F0)
                                    : const Color(0xFF1C273C),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 12,
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: isLight
                                        ? const Color(0xFFEFF6FF)
                                        : const Color(0xFF142238),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Center(
                                    child: isPuc
                                        ? Stack(
                                            alignment: Alignment.center,
                                            children: [
                                              Container(
                                                width: 28,
                                                height: 28,
                                                decoration: BoxDecoration(
                                                  shape: BoxShape.circle,
                                                  border: Border.all(
                                                    color: const Color(
                                                      0xFF0066FF,
                                                    ),
                                                    width: 1.4,
                                                  ),
                                                ),
                                              ),
                                              const Column(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Text(
                                                    'PUC',
                                                    style: TextStyle(
                                                      color: Color(0xFF0066FF),
                                                      fontSize: 7.5,
                                                      fontWeight:
                                                          FontWeight.w900,
                                                    ),
                                                  ),
                                                  Icon(
                                                    Icons.cloud_outlined,
                                                    size: 10,
                                                    color: Color(0xFF0066FF),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          )
                                        : Icon(
                                            item['icon'] as IconData,
                                            color: isCustom
                                                ? (isLight
                                                      ? const Color(0xFF64748B)
                                                      : const Color(0xFFCBD5E1))
                                                : const Color(0xFF0066FF),
                                            size: 22,
                                          ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  item['title'] as String,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: isLight
                                        ? const Color(0xFF0F172A)
                                        : Colors.white,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w500,
                                    height: 1.25,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),

                    const SizedBox(height: 20),

                    // Section: Or Upload Document
                    Text(
                      'Or Upload Document',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.1,
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Dashed Box: Upload from Gallery
                    InkWell(
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            backgroundColor: isLight
                                ? const Color(0xFF0F172A)
                                : const Color(0xFF101726),
                            content: const Text(
                              'Opening file picker for PDF, JPG, PNG...',
                              style: TextStyle(color: Colors.white),
                            ),
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        );
                        Future.delayed(const Duration(milliseconds: 600), () {
                          if (mounted) {
                            _navigateToForm('Registration Certificate (RC)');
                          }
                        });
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: CustomPaint(
                        painter: DashedRectPainter(
                          color: isLight
                              ? const Color(0xFFCBD5E1)
                              : const Color(0xFF1E2B40),
                          strokeWidth: 1.3,
                          dashWidth: 6,
                          dashSpace: 4,
                          cornerRadius: 16,
                        ),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 22),
                          decoration: BoxDecoration(
                            color: isLight
                                ? const Color(0xFFF8FAFC)
                                : const Color(0xFF0B1220),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  color: isLight
                                      ? const Color(0xFFEFF6FF)
                                      : const Color(0xFF142036),
                                  borderRadius: BorderRadius.circular(24),
                                ),
                                child: const Center(
                                  child: Icon(
                                    Icons.cloud_upload_outlined,
                                    color: Color(0xFF0066FF),
                                    size: 24,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'Upload from Gallery',
                                style: TextStyle(
                                  color: isLight
                                      ? const Color(0xFF0F172A)
                                      : Colors.white,
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'PDF, JPG, PNG (Max 5 MB)',
                                style: TextStyle(
                                  color: isLight
                                      ? const Color(0xFF64748B)
                                      : const Color(0xFF64748B),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

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

/// Screen matching Images 4 & 5: Add RC form
class AddRCScreen extends StatefulWidget {
  final String documentType;
  final String title;

  final VehicleDocument? documentToEdit;

  const AddRCScreen({
    super.key,
    this.documentType = 'Registration Certificate (RC)',
    this.title = 'Add RC',
    this.documentToEdit,
  });

  @override
  State<AddRCScreen> createState() => _AddRCScreenState();
}

class _AddRCScreenState extends State<AddRCScreen> {
  late TextEditingController _regNumberController;
  late TextEditingController _ownerNameController;
  late TextEditingController _issueDateController;
  late TextEditingController _expiryDateController;

  bool _frontUploaded = false;
  bool _backUploaded = false;
  bool _setRenewalReminder = true;
  bool _isLoading = false;
  DateTime? _selectedIssueDate;
  DateTime? _selectedExpiryDate;

  final ImagePicker _picker = ImagePicker();
  String? _frontImageUrl;
  String? _backImageUrl;

  @override
  void initState() {
    super.initState();
    final doc = widget.documentToEdit;
    _regNumberController = TextEditingController(text: doc?.regNumber ?? '');
    _ownerNameController = TextEditingController(text: doc?.ownerName ?? '');
    _issueDateController = TextEditingController(text: doc?.issueDate ?? '');
    _expiryDateController = TextEditingController(text: doc?.expiryDate ?? '');

    if (doc != null) {
      if (doc.issueDate.isNotEmpty) {
        _selectedIssueDate = DateTime.tryParse(doc.issueDate);
      }
      if (doc.expiryDate.isNotEmpty) {
        _selectedExpiryDate = DateTime.tryParse(doc.expiryDate);
      }
      _setRenewalReminder = doc.reminderEnabled;
      if (doc.frontImageUrl != null && doc.frontImageUrl!.isNotEmpty) {
        _frontUploaded = true;
        _frontImageUrl = doc.frontImageUrl;
      }
      if (doc.backImageUrl != null && doc.backImageUrl!.isNotEmpty) {
        _backUploaded = true;
        _backImageUrl = doc.backImageUrl;
      }
    }
  }

  @override
  void dispose() {
    _regNumberController.dispose();
    _ownerNameController.dispose();
    _issueDateController.dispose();
    _expiryDateController.dispose();
    super.dispose();
  }

  Future<void> _pickDate(
    TextEditingController controller,
    DateTime initialDate,
  ) async {
    final isLight = AppTheme.isLightNotifier.value;
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(2000),
      lastDate: DateTime(2045),
      builder: (context, child) {
        return Theme(
          data: isLight
              ? ThemeData.light().copyWith(
                  colorScheme: const ColorScheme.light(
                    primary: Color(0xFF0066FF),
                    onPrimary: Colors.white,
                    surface: Colors.white,
                    onSurface: Color(0xFF0F172A),
                  ),
                )
              : Theme.of(context).copyWith(
                  colorScheme: const ColorScheme.dark(
                    primary: Color(0xFF00C2FF),
                    onPrimary: Colors.black,
                    surface: Color(0xFF101726),
                    onSurface: Colors.white,
                  ),
                ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      final months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      final formatted =
          '${picked.day.toString().padLeft(2, '0')} ${months[picked.month - 1]} ${picked.year}';
      setState(() {
        controller.text = formatted;
        if (controller == _issueDateController) {
          _selectedIssueDate = picked;
        } else if (controller == _expiryDateController) {
          _selectedExpiryDate = picked;
        }
      });
    }
  }

  Future<void> _pickAndUploadImage(bool isFront) async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
    if (image == null) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final request = http.MultipartRequest(
        'POST',
        ApiConfig.uri('/documents/upload'),
      );
      request.headers['Authorization'] = 'Bearer ${Globals.accessToken}';

      final fileBytes = await image.readAsBytes();
      final multipartFile = http.MultipartFile.fromBytes(
        'file',
        fileBytes,
        filename: image.name,
      );

      request.files.add(multipartFile);

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();
      final data = jsonDecode(responseBody);

      if (response.statusCode == 200 && data['success']) {
        if (mounted) {
          setState(() {
            if (isFront) {
              _frontUploaded = true;
              _frontImageUrl = data['url'];
            } else {
              _backUploaded = true;
              _backImageUrl = data['url'];
            }
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Image uploaded successfully')),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(const SnackBar(content: Text('Upload failed')));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Network error')));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _saveDocument() async {
    if (_regNumberController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF2D1214),
          content: const Text(
            'Please enter a valid Registration Number',
            style: TextStyle(color: Color(0xFFFF5252)),
          ),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final isEdit = widget.documentToEdit != null;
      final url = isEdit
          ? ApiConfig.url('/documents/${widget.documentToEdit!.id}')
          : ApiConfig.url('/documents');

      final requestBody = jsonEncode({
        'title': widget.title.replaceAll('Add ', '').replaceAll('Edit ', ''),
        'docType': widget.documentType.toLowerCase().contains('rc')
            ? 'rc'
            : 'document',
        'status': 'Valid',
        'regNumber': _regNumberController.text.trim(),
        'ownerName': _ownerNameController.text.trim(),
        'issueDate': _selectedIssueDate?.toUtc().toIso8601String(),
        'expiryDate': _selectedExpiryDate?.toUtc().toIso8601String(),
        'reminderEnabled': _setRenewalReminder,
        'frontImageUrl': _frontImageUrl,
        'backImageUrl': _backImageUrl,
      });

      final response = isEdit
          ? await http.patch(
              Uri.parse(url),
              headers: {
                'Authorization': 'Bearer ${Globals.accessToken}',
                'Content-Type': 'application/json',
              },
              body: requestBody,
            )
          : await http.post(
              Uri.parse(url),
              headers: {
                'Authorization': 'Bearer ${Globals.accessToken}',
                'Content-Type': 'application/json',
              },
              body: requestBody,
            );

      final data = jsonDecode(response.body);

      if ((response.statusCode == 201 || response.statusCode == 200) &&
          data['success']) {
        final newDoc = VehicleDocument.fromJson(data['data']);
        if (mounted) {
          if (widget.documentToEdit != null) {
            // Pop back twice to documents list
            Navigator.pop(context, true);
          } else {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (context) => DocumentAddedScreen(document: newDoc),
              ),
            );
          }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Failed to save document: ${data['message'] ?? 'Unknown error'}',
              ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Network error')));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Widget _buildUploadBox({
    required String label,
    required bool isUploaded,
    required VoidCallback onTap,
    required bool isLight,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: CustomPaint(
          painter: DashedRectPainter(
            color: isUploaded
                ? const Color(0xFF00E676)
                : (isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1E2B40)),
            strokeWidth: 1.3,
            dashWidth: 6,
            dashSpace: 4,
            cornerRadius: 16,
          ),
          child: Container(
            height: 120,
            decoration: BoxDecoration(
              color: isLight ? Colors.white : const Color(0xFF101726),
              borderRadius: BorderRadius.circular(16),
              boxShadow: isLight ? AppTheme.cardShadow : null,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isUploaded
                        ? (isLight
                              ? const Color(0xFFE8FDF2)
                              : const Color(0xFF0B2B24))
                        : (isLight
                              ? const Color(0xFFEBF3FF)
                              : const Color(0xFF142238)),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Icon(
                      isUploaded
                          ? Icons.check_circle_outline
                          : Icons.camera_alt_outlined,
                      color: isUploaded
                          ? const Color(0xFF00E676)
                          : (isLight
                                ? const Color(0xFF0066FF)
                                : const Color(0xFF00C2FF)),
                      size: 22,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  isUploaded ? '$label (Added)' : label,
                  style: TextStyle(
                    color: isUploaded
                        ? const Color(0xFF00E676)
                        : (isLight
                              ? const Color(0xFF64748B)
                              : const Color(0xFF8E9BAE)),
                    fontSize: 12.5,
                    fontWeight: isUploaded ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
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
                widget.title,
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

                          // Section: Upload RC (Front & Back) *
                          RichText(
                            text: TextSpan(
                              children: [
                                TextSpan(
                                  text:
                                      'Upload ${widget.title.replaceAll('Add ', '')} (Front & Back) ',
                                  style: TextStyle(
                                    color: isLight
                                        ? const Color(0xFF0F172A)
                                        : Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const TextSpan(
                                  text: '*',
                                  style: TextStyle(
                                    color: Colors.redAccent,
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 12),

                          // Front & Back side upload buttons
                          Row(
                            children: [
                              _buildUploadBox(
                                label: 'Front Side',
                                isUploaded: _frontUploaded,
                                onTap: () => _pickAndUploadImage(true),
                                isLight: isLight,
                              ),
                              const SizedBox(width: 12),
                              _buildUploadBox(
                                label: 'Back Side',
                                isUploaded: _backUploaded,
                                onTap: () => _pickAndUploadImage(false),
                                isLight: isLight,
                              ),
                            ],
                          ),

                          const SizedBox(height: 22),

                          // Divider: or add manually
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  height: 1,
                                  color: isLight
                                      ? const Color(0xFFE2E8F0)
                                      : const Color(0xFF1E293B),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                ),
                                child: Text(
                                  'or add manually',
                                  style: TextStyle(
                                    color: isLight
                                        ? const Color(0xFF64748B)
                                        : const Color(0xFF8E9BAE),
                                    fontSize: 12.5,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Container(
                                  height: 1,
                                  color: isLight
                                      ? const Color(0xFFE2E8F0)
                                      : const Color(0xFF1E293B),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 22),

                          // Field 1: Registration Number *
                          RichText(
                            text: TextSpan(
                              children: [
                                TextSpan(
                                  text: 'Registration Number ',
                                  style: TextStyle(
                                    color: isLight
                                        ? const Color(0xFF475569)
                                        : const Color(0xFFCBD5E1),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const TextSpan(
                                  text: '*',
                                  style: TextStyle(
                                    color: Colors.redAccent,
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            height: 50,
                            decoration: BoxDecoration(
                              color: isLight
                                  ? Colors.white
                                  : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isLight
                                    ? const Color(0xFFE2E8F0)
                                    : const Color(0xFF1E2B40),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: TextField(
                              controller: _regNumberController,
                              style: TextStyle(
                                color: isLight
                                    ? const Color(0xFF0F172A)
                                    : Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.5,
                              ),
                              decoration: InputDecoration(
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 14,
                                ),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    Icons.crop_free_rounded,
                                    color: isLight
                                        ? const Color(0xFF0066FF)
                                        : const Color(0xFF00C2FF),
                                    size: 22,
                                  ),
                                  onPressed: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        backgroundColor: isLight
                                            ? const Color(0xFF0F172A)
                                            : const Color(0xFF101726),
                                        content: const Text(
                                          'Scanning registration card...',
                                          style: TextStyle(color: Colors.white),
                                        ),
                                        behavior: SnackBarBehavior.floating,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 16),

                          // Field 2: Owner Name
                          Text(
                            'Owner Name',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF475569)
                                  : const Color(0xFFCBD5E1),
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            height: 50,
                            decoration: BoxDecoration(
                              color: isLight
                                  ? Colors.white
                                  : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isLight
                                    ? const Color(0xFFE2E8F0)
                                    : const Color(0xFF1E2B40),
                              ),
                              boxShadow: isLight ? AppTheme.cardShadow : null,
                            ),
                            child: TextField(
                              controller: _ownerNameController,
                              style: TextStyle(
                                color: isLight
                                    ? const Color(0xFF0F172A)
                                    : Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                              decoration: const InputDecoration(
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 14,
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 16),

                          // Field 3: Issue Date
                          Text(
                            'Issue Date',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF475569)
                                  : const Color(0xFFCBD5E1),
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          GestureDetector(
                            onTap: () => _pickDate(
                              _issueDateController,
                              DateTime(2020, 1, 12),
                            ),
                            child: Container(
                              height: 50,
                              decoration: BoxDecoration(
                                color: isLight
                                    ? Colors.white
                                    : const Color(0xFF101726),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isLight
                                      ? const Color(0xFFE2E8F0)
                                      : const Color(0xFF1E2B40),
                                ),
                                boxShadow: isLight ? AppTheme.cardShadow : null,
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      _issueDateController.text,
                                      style: TextStyle(
                                        color: isLight
                                            ? const Color(0xFF0F172A)
                                            : Colors.white,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                  Icon(
                                    Icons.calendar_today_outlined,
                                    color: isLight
                                        ? const Color(0xFF94A3B8)
                                        : const Color(0xFF64748B),
                                    size: 19,
                                  ),
                                ],
                              ),
                            ),
                          ),

                          const SizedBox(height: 16),

                          // Field 4: Expiry Date
                          Text(
                            'Expiry Date',
                            style: TextStyle(
                              color: isLight
                                  ? const Color(0xFF475569)
                                  : const Color(0xFFCBD5E1),
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          GestureDetector(
                            onTap: () => _pickDate(
                              _expiryDateController,
                              DateTime(2030, 1, 12),
                            ),
                            child: Container(
                              height: 50,
                              decoration: BoxDecoration(
                                color: isLight
                                    ? Colors.white
                                    : const Color(0xFF101726),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isLight
                                      ? const Color(0xFFE2E8F0)
                                      : const Color(0xFF1E2B40),
                                ),
                                boxShadow: isLight ? AppTheme.cardShadow : null,
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      _expiryDateController.text,
                                      style: TextStyle(
                                        color: isLight
                                            ? const Color(0xFF0F172A)
                                            : Colors.white,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                  Icon(
                                    Icons.calendar_today_outlined,
                                    color: isLight
                                        ? const Color(0xFF94A3B8)
                                        : const Color(0xFF64748B),
                                    size: 19,
                                  ),
                                ],
                              ),
                            ),
                          ),

                          const SizedBox(height: 20),

                          // Checkbox: Set renewal reminder
                          InkWell(
                            onTap: () {
                              setState(() {
                                _setRenewalReminder = !_setRenewalReminder;
                              });
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Container(
                                  width: 22,
                                  height: 22,
                                  decoration: BoxDecoration(
                                    color: _setRenewalReminder
                                        ? (isLight
                                              ? const Color(0xFF0066FF)
                                              : const Color(0xFF00C2FF))
                                        : Colors.transparent,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                      color: _setRenewalReminder
                                          ? (isLight
                                                ? const Color(0xFF0066FF)
                                                : const Color(0xFF00C2FF))
                                          : (isLight
                                                ? const Color(0xFF94A3B8)
                                                : const Color(0xFF64748B)),
                                      width: 1.6,
                                    ),
                                  ),
                                  child: _setRenewalReminder
                                      ? Center(
                                          child: Icon(
                                            Icons.check,
                                            size: 16,
                                            color: isLight
                                                ? Colors.white
                                                : Colors.black,
                                          ),
                                        )
                                      : null,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Set renewal reminder',
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF0F172A)
                                              : Colors.white,
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        "We'll notify you before expiry.",
                                        style: TextStyle(
                                          color: isLight
                                              ? const Color(0xFF64748B)
                                              : const Color(0xFF8E9BAE),
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 28),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Save Document Button
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                    decoration: BoxDecoration(
                      color: isLight ? Colors.white : const Color(0xFF090E17),
                      border: Border(
                        top: BorderSide(
                          color: isLight
                              ? const Color(0xFFE2E8F0)
                              : Colors.transparent,
                          width: 1,
                        ),
                      ),
                    ),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _saveDocument,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isLight
                              ? const Color(0xFF0066FF)
                              : const Color(0xFF00C2FF),
                          foregroundColor: isLight
                              ? Colors.white
                              : Colors.black,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(26),
                          ),
                        ),
                        child: _isLoading
                            ? const AppLoadingSpinner(size: 20)
                            : Text(
                                'Save Document',
                                style: TextStyle(
                                  color: isLight ? Colors.white : Colors.black,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.2,
                                ),
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
