import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:typed_data';
import '../../utils/share_helper.dart';
import '../../utils/gallery_saver.dart';
import 'document_model.dart';
import '../../globals.dart';
import 'add_documents.dart';
import '../../utils/api_config.dart';
import '../../theme/app_theme.dart';
import '../../loading.dart';
import '../../widgets/animated_back_arrow.dart';

class DocumentDetailsScreen extends StatefulWidget {
  final VehicleDocument? document;
  final String vehicleName;
  final String vehicleNumber;

  const DocumentDetailsScreen({
    super.key,
    this.document,
    this.vehicleName = 'Unknown Vehicle',
    this.vehicleNumber = '',
  });

  @override
  State<DocumentDetailsScreen> createState() => _DocumentDetailsScreenState();
}

class _DocumentDetailsScreenState extends State<DocumentDetailsScreen> {
  bool _reminderEnabled = true;

  @override
  void initState() {
    super.initState();
    _reminderEnabled = widget.document?.reminderEnabled ?? true;
  }

  @override
  Widget build(BuildContext context) {
    final realOwner = '${Globals.firstName} ${Globals.lastName}'.trim();
    final doc = widget.document ??
        VehicleDocument(
          id: '',
          title: 'Registration Certificate (RC)',
          subtitle: '',
          docType: 'rc',
          status: DocumentStatus.valid,
          regNumber: Globals.vehicleRegistration.isNotEmpty ? Globals.vehicleRegistration : '',
          ownerName: realOwner.isNotEmpty ? realOwner : 'Vehicle Owner',
          issueDate: '',
          expiryDate: '',
        );

    final cleanReg = doc.regNumber.replaceAll(' ', '');

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
                'Document Details',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.2,
                ),
              ),
              actions: [
                PopupMenuButton<String>(
                  icon: Icon(Icons.more_vert, color: isLight ? const Color(0xFF0F172A) : Colors.white),
                  color: isLight ? Colors.white : const Color(0xFF101726),
                  onSelected: (value) {
                    if (value == 'edit') {
                      _editDocument(doc);
                    } else if (value == 'delete') {
                      _deleteDocument(doc);
                    } else if (value == 'share') {
                      _shareDocument(doc);
                    }
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: 'edit',
                      child: Row(
                        children: [
                          Icon(Icons.edit_outlined, color: isLight ? const Color(0xFF0F172A) : Colors.white, size: 20),
                          const SizedBox(width: 8),
                          Text('Edit', style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white)),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: 'share',
                      child: Row(
                        children: [
                          Icon(Icons.share_outlined, color: isLight ? const Color(0xFF0F172A) : Colors.white, size: 20),
                          const SizedBox(width: 8),
                          Text('Share', style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white)),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                          SizedBox(width: 8),
                          Text('Delete', style: TextStyle(color: Colors.redAccent)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            body: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),

                    // Vehicle Card
                    VehicleSelectorCard(
                      vehicleName: widget.vehicleName,
                      vehicleNumber: widget.vehicleNumber.isNotEmpty ? widget.vehicleNumber : doc.regNumber,
                    ),

              const SizedBox(height: 18),

              // Show Uploaded Image if present, else fallback to Smart Card UI
              if (doc.frontImageUrl != null && doc.frontImageUrl!.isNotEmpty)
                Container(
                  width: double.infinity,
                  height: 220,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.25),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: Image.network(
                      doc.frontImageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        debugPrint('Error loading image: $error');
                        return Container(
                          color: const Color(0xFF101726),
                          child: const Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.broken_image_rounded, color: Colors.white54, size: 40),
                                SizedBox(height: 8),
                                Text('Failed to load image', style: TextStyle(color: Colors.white54)),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                )
              else
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.25),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header with Ashok Chakra / Emblem & Title
                      Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: const Color(0xFF1B3B6F),
                                width: 1.5,
                              ),
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.flare_rounded,
                                size: 14,
                                color: Color(0xFF1B3B6F),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Indian Union',
                                style: TextStyle(
                                  color: Color(0xFF1B3B6F),
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              Text(
                                'Registration Certificate',
                                style: TextStyle(
                                  color: Color(0xFF64748B),
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          const Spacer(),
                          Container(
                            width: 28,
                            height: 20,
                            decoration: BoxDecoration(
                              color: const Color(0xFFE2E8F0),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: const Color(0xFFCBD5E1)),
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.sim_card_outlined,
                                size: 13,
                                color: Color(0xFF475569),
                              ),
                            ),
                          ),
                        ],
                      ),
  
                      const SizedBox(height: 16),
  
                      // Big Registration Number Plate
                      Center(
                        child: Text(
                          cleanReg,
                          style: const TextStyle(
                            color: Color(0xFF0F172A),
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 2.5,
                          ),
                        ),
                      ),
  
                      const SizedBox(height: 16),
  
                      // Smart Card Details Rows
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildSmartCardItem('Owner Name', doc.ownerName),
                                const SizedBox(height: 8),
                                _buildSmartCardItem(
                                  'Chassis No.',
                                  'MA3NB81S7RK123456',
                                ),
                              ],
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildSmartCardItem('Vehicle No.', doc.regNumber),
                                const SizedBox(height: 8),
                                _buildSmartCardItem('Engine No.', 'G4FGKU123456'),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 20),

              // Document Details Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: isLight ? Colors.white : const Color(0xFF101726),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C)),
                  boxShadow: isLight ? AppTheme.cardShadow : null,
                ),
                child: Column(
                  children: [
                    _buildDetailRow(
                      label: 'Document Type',
                      value: doc.title,
                      isBold: true,
                      isLight: isLight,
                    ),
                    Divider(color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1A263D), height: 16),
                    _buildDetailRow(
                      label: 'Registration No.',
                      value: doc.regNumber,
                      isBold: true,
                      isLight: isLight,
                    ),
                    Divider(color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1A263D), height: 16),
                    _buildDetailRow(
                      label: 'Owner Name',
                      value: doc.ownerName,
                      isLight: isLight,
                    ),
                    Divider(color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1A263D), height: 16),
                    _buildDetailRow(
                      label: 'Issue Date',
                      value: doc.issueDate,
                      isLight: isLight,
                    ),
                    Divider(color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1A263D), height: 16),
                    _buildDetailRow(
                      label: 'Valid Till',
                      value: doc.expiryDate,
                      isLight: isLight,
                    ),
                    Divider(color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1A263D), height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Status',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                            fontSize: 13,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: isLight ? const Color(0xFFE8FDF2) : const Color(0xFF0B2B24),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isLight ? const Color(0xFF6EE7B7) : const Color(0xFF104A3A)),
                          ),
                          child: Text(
                            'Valid',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF10B981) : const Color(0xFF00E676),
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Action Buttons Row: Download & Share
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: OutlinedButton.icon(
                        onPressed: () => _downloadDocument(doc),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                          side: BorderSide(color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1E2B40)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        icon: Icon(
                          Icons.download_rounded,
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          size: 19,
                        ),
                        label: Text(
                          'Download',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: OutlinedButton.icon(
                        onPressed: () => _shareDocument(doc),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                          side: BorderSide(color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1E2B40)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        icon: Icon(
                          Icons.share_outlined,
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          size: 18,
                        ),
                        label: Text(
                          'Share',
                          style: TextStyle(
                            color: isLight ? const Color(0xFF0F172A) : Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Set Reminder Card
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: isLight ? Colors.white : const Color(0xFF101726),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C)),
                  boxShadow: isLight ? AppTheme.cardShadow : null,
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF162238),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Center(
                        child: Icon(
                          Icons.notifications_active_outlined,
                          color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
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
                            'Set Reminder',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "We'll notify you before expiry",
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _reminderEnabled,
                      activeThumbColor: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                      activeTrackColor:
                          (isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF)).withValues(alpha: 0.3),
                      inactiveThumbColor: isLight ? const Color(0xFF94A3B8) : const Color(0xFF8E9BAE),
                      inactiveTrackColor: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF162238),
                      onChanged: (val) {
                        setState(() {
                          _reminderEnabled = val;
                        });
                      },
                    ),
                  ],
                ),
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

  Widget _buildSmartCardItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF64748B),
            fontSize: 9.5,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            color: Color(0xFF0F172A),
            fontSize: 11.5,
            fontWeight: FontWeight.bold,
          ),
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildDetailRow({
    required String label,
    required String value,
    bool isBold = false,
    bool isLight = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
            fontSize: 13,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: isLight ? const Color(0xFF0F172A) : Colors.white,
            fontSize: 13,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ],
    );
  }

  void _editDocument(VehicleDocument doc) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AddRCScreen(
          title: 'Edit ${doc.title}',
          documentType: doc.title,
          documentToEdit: doc,
        ),
      ),
    );
    if (result == true && mounted) {
      // Pop and refresh parent
      Navigator.pop(context, true);
    }
  }

  Future<void> _shareDocument(VehicleDocument doc) async {
    final vehicle = widget.vehicleName.isNotEmpty && widget.vehicleName != 'Unknown Vehicle'
        ? '${widget.vehicleName} (${widget.vehicleNumber.isNotEmpty ? widget.vehicleNumber : doc.regNumber})'
        : (doc.regNumber.isNotEmpty ? doc.regNumber : widget.vehicleNumber);

    final buffer = StringBuffer();
    buffer.writeln('📄 Vehicle Document: ${doc.title}');
    if (vehicle.isNotEmpty) buffer.writeln('🚗 Vehicle: $vehicle');
    if (doc.regNumber.isNotEmpty) buffer.writeln('🔢 Reg Number: ${doc.regNumber}');
    if (doc.ownerName.isNotEmpty) buffer.writeln('👤 Owner: ${doc.ownerName}');
    if (doc.issueDate.isNotEmpty) buffer.writeln('📅 Issue Date: ${doc.issueDate}');
    if (doc.expiryDate.isNotEmpty) buffer.writeln('⏳ Valid Till: ${doc.expiryDate}');
    buffer.writeln('🛡️ Status: ${doc.statusText}');
    if (doc.frontImageUrl != null && doc.frontImageUrl!.startsWith('http')) {
      buffer.writeln('\n🔗 Document Link: ${doc.frontImageUrl}');
    }
    buffer.writeln('\nShared securely via CarQConnect');

    await ShareHelper.shareText(
      text: buffer.toString(),
      subject: 'Vehicle Document: ${doc.title} (${doc.regNumber})',
      title: 'Share ${doc.title}',
    );
  }

  Future<void> _downloadDocument(VehicleDocument doc) async {
    final isLight = AppTheme.isLightNotifier.value;
    try {
      if (doc.frontImageUrl != null && doc.frontImageUrl!.isNotEmpty) {
        Uint8List? bytes;
        if (doc.frontImageUrl!.startsWith('data:image')) {
          final base64Str = doc.frontImageUrl!.split(',').last;
          bytes = base64Decode(base64Str);
        } else if (doc.frontImageUrl!.startsWith('http')) {
          final res = await http.get(Uri.parse(doc.frontImageUrl!)).timeout(const Duration(seconds: 8));
          if (res.statusCode == 200) {
            bytes = res.bodyBytes;
          }
        }

        if (bytes != null) {
          final filename = '${doc.title.replaceAll(' ', '_')}_${doc.regNumber.replaceAll(' ', '')}.png';
          final saved = await GallerySaver.saveImage(bytes, filename: filename);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                backgroundColor: const Color(0xFF10B981),
                content: Text(saved ? 'Document saved to Gallery successfully!' : 'Document downloaded successfully!'),
              ),
            );
          }
          return;
        }
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: isLight ? const Color(0xFF0F172A) : const Color(0xFF101726),
            content: Text('${doc.title} details are active & valid.'),
          ),
        );
      }
    } catch (e) {
      debugPrint('Download document error: $e');
    }
  }

  void _deleteDocument(VehicleDocument doc) async {
    final isLight = AppTheme.isLightNotifier.value;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
        title: Text('Delete Document', style: TextStyle(color: isLight ? const Color(0xFF0F172A) : Colors.white)),
        content: Text('Are you sure you want to delete this document?', style: TextStyle(color: isLight ? const Color(0xFF475569) : Colors.white70)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel', style: TextStyle(color: isLight ? const Color(0xFF64748B) : Colors.white70)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: AppLoadingSpinner(
          size: 70,
          primaryColor: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
        ),
      ),
    );

    try {
      final response = await http.delete(
        ApiConfig.uri('/documents/${doc.id}'),
        headers: {'Authorization': 'Bearer ${Globals.accessToken}'},
      );
      
      if (mounted) Navigator.pop(context); // hide loading

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Document deleted')));
          Navigator.pop(context, true); // trigger refresh
        }
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete document')));
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // hide loading
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Network error')));
      }
    }
  }
}
