import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../theme/app_theme.dart';
import '../../widgets/animated_back_arrow.dart';

/// Full-screen camera QR Code Scanner with real-time detection,
/// glowing laser overlay, torch toggle, camera switch, and gallery upload.
class QrScannerScreen extends StatefulWidget {
  final ValueChanged<String>? onScanResult;

  const QrScannerScreen({super.key, this.onScanResult});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  late final MobileScannerController _controller;

  bool _isProcessing = false;
  bool _isTorchOn = false;
  final CameraFacing _facing = CameraFacing.back;

  @override
  void initState() {
    super.initState();
    _controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: _facing,
      returnImage: false,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_isProcessing) return;

    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final rawValue = barcodes.first.rawValue?.trim();
    if (rawValue == null || rawValue.isEmpty) return;

    setState(() {
      _isProcessing = true;
    });

    HapticFeedback.mediumImpact();

    if (widget.onScanResult != null) {
      widget.onScanResult!(rawValue);
      Navigator.pop(context, rawValue);
    } else {
      _showScanResultSheet(rawValue);
    }
  }

  Future<void> _scanFromGallery() async {
    try {
      final picker = ImagePicker();
      final image = await picker.pickImage(source: ImageSource.gallery);
      if (image == null) return;

      final capture = await _controller.analyzeImage(image.path);
      if (capture != null && capture.barcodes.isNotEmpty) {
        final rawValue = capture.barcodes.first.rawValue?.trim();
        if (rawValue != null && rawValue.isNotEmpty) {
          _onDetect(capture);
          return;
        }
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No valid QR code found in selected image.'),
            backgroundColor: Color(0xFF1E293B),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gallery scan error: $e'),
            backgroundColor: const Color(0xFF280B0B),
          ),
        );
      }
    }
  }

  Future<void> _toggleTorch() async {
    try {
      await _controller.toggleTorch();
      if (mounted) {
        setState(() {
          _isTorchOn = !_isTorchOn;
        });
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Flashlight is supported in the Android App build.'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  void _showScanResultSheet(String scannedValue) {
    final isUrl =
        scannedValue.startsWith('http://') ||
        scannedValue.startsWith('https://');
    final isLight = AppTheme.isLight;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isLight ? Colors.white : const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            16,
            20,
            MediaQuery.of(ctx).viewInsets.bottom + 28,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isLight
                        ? const Color(0xFFCBD5E1)
                        : const Color(0xFF334155),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFF00C2FF).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: const Color(0xFF00C2FF).withValues(alpha: 0.4),
                      ),
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.qr_code_scanner_rounded,
                        color: Color(0xFF00C2FF),
                        size: 22,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isUrl ? 'Scanned Link' : 'Scanned QR Code',
                          style: TextStyle(
                            color: isLight
                                ? const Color(0xFF0F172A)
                                : Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isUrl ? 'Web URL detected' : 'Code value extracted',
                          style: TextStyle(
                            color: isLight
                                ? const Color(0xFF64748B)
                                : const Color(0xFF94A3B8),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Scanned content box
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isLight
                      ? const Color(0xFFF1F5F9)
                      : const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isLight
                        ? const Color(0xFFE2E8F0)
                        : const Color(0xFF334155),
                  ),
                ),
                child: SelectableText(
                  scannedValue,
                  style: TextStyle(
                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                    fontSize: 14.5,
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),

              const SizedBox(height: 18),

              // Action Buttons
              if (isUrl) ...[
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      final uri = Uri.tryParse(scannedValue);
                      if (uri != null && await canLaunchUrl(uri)) {
                        await launchUrl(
                          uri,
                          mode: LaunchMode.externalApplication,
                        );
                      }
                    },
                    icon: const Icon(Icons.open_in_browser_rounded, size: 18),
                    label: const Text(
                      'Open Link in Browser',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00C2FF),
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
              ],

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: scannedValue));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Copied to clipboard!'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                      icon: const Icon(Icons.copy_rounded, size: 17),
                      label: const Text('Copy Text'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: isLight
                            ? const Color(0xFF0F172A)
                            : Colors.white,
                        side: BorderSide(
                          color: isLight
                              ? const Color(0xFFCBD5E1)
                              : const Color(0xFF334155),
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(22),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        setState(() {
                          _isProcessing = false;
                        });
                      },
                      icon: const Icon(Icons.refresh_rounded, size: 17),
                      label: const Text('Scan Again'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isLight
                            ? const Color(0xFF0066FF)
                            : const Color(0xFF00C2FF),
                        foregroundColor: isLight ? Colors.white : Colors.black,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(22),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    ).whenComplete(() {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final scanAreaSize = (size.width * 0.72).clamp(240.0, 320.0);

    return Scaffold(
      backgroundColor: Colors.black,
      body: SizedBox.expand(
        child: Stack(
          fit: StackFit.expand,
          children: [
          // 1. Live Camera Preview with MobileScanner
          Positioned.fill(
            child: MobileScanner(
              controller: _controller,
              onDetect: _onDetect,
              errorBuilder: (context, error) {
                return Container(
                  color: const Color(0xFF090E17),
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.camera_alt_outlined,
                          size: 54,
                          color: Color(0xFF64748B),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Camera Access Required',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Please grant camera permission to scan QR codes or pick an image from gallery.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: const Color(0xFF94A3B8),
                            fontSize: 13.5,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 22),
                        ElevatedButton.icon(
                          onPressed: _scanFromGallery,
                          icon: const Icon(
                            Icons.photo_library_rounded,
                            size: 18,
                          ),
                          label: const Text('Select QR from Gallery'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF00C2FF),
                            foregroundColor: Colors.black,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(22),
                            ),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // 2. High-Tech Dark Cutout Overlay with Viewfinder
          Positioned.fill(
            child: CustomPaint(
              painter: _ScannerOverlayPainter(
                scanAreaSize: scanAreaSize,
                cornerColor: const Color(0xFF00C2FF),
              ),
            ),
          ),

          // 3. Instructions under Viewfinder
          Positioned(
            left: 20,
            right: 20,
            top: (size.height / 2) + (scanAreaSize / 2) + 24,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.65),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.15),
                    ),
                  ),
                  child: const Text(
                    'Align QR Code within the frame to scan',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 4. Top Navigation Bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Back Button
                    AnimatedBackArrowButton(onTap: () => Navigator.pop(context)),

                    // Title
                    const Text(
                      'Scan QR Code',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.3,
                      ),
                    ),

                    // Balance spacing for centered title
                    const SizedBox(width: 44),
                  ],
                ),
              ),
            ),
          ),

          // 5. Bottom Floating Controls (Gallery & Light)
          Positioned(
            bottom: 30,
            left: 40,
            right: 40,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF090E17).withValues(alpha: 0.88),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: const Color(0xFF00C2FF).withValues(alpha: 0.3),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.5),
                    blurRadius: 16,
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // Scan from Gallery (replaced Capture)
                  _buildBottomAction(
                    icon: Icons.photo_library_outlined,
                    label: 'Gallery',
                    onTap: _scanFromGallery,
                  ),

                  // Light / Torch Toggle (replaced Gallery, Flip removed)
                  _buildBottomAction(
                    icon: _isTorchOn
                        ? Icons.flash_on_rounded
                        : Icons.flash_off_rounded,
                    label: 'Light',
                    onTap: _toggleTorch,
                    isActive: _isTorchOn,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );
  }

  Widget _buildBottomAction({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool isActive = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: isActive
                  ? const Color(0xFF00C2FF).withValues(alpha: 0.22)
                  : const Color(0xFF101B2E).withValues(alpha: 0.88),
              shape: BoxShape.circle,
              border: Border.all(
                color: isActive
                    ? const Color(0xFF00C2FF)
                    : const Color(0xFF00C2FF).withValues(alpha: 0.4),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: isActive
                      ? const Color(0xFF00C2FF).withValues(alpha: 0.3)
                      : Colors.black.withValues(alpha: 0.5),
                  blurRadius: 12,
                ),
              ],
            ),
            child: Icon(
              icon,
              color: isActive ? const Color(0xFF00C2FF) : Colors.white,
              size: 24,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: TextStyle(
              color: isActive ? const Color(0xFF00C2FF) : Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Custom painter that dims the surrounding area and paints 4 corner brackets
class _ScannerOverlayPainter extends CustomPainter {
  final double scanAreaSize;
  final Color cornerColor;

  _ScannerOverlayPainter({
    required this.scanAreaSize,
    required this.cornerColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final double left = (size.width - scanAreaSize) / 2;
    final double top = (size.height - scanAreaSize) / 2;
    final double right = left + scanAreaSize;
    final double bottom = top + scanAreaSize;

    final rect = Rect.fromLTRB(left, top, right, bottom);
    const r = Radius.circular(20);
    final rrect = RRect.fromRectAndRadius(rect, r);

    // Dim mask outside scan area
    final backgroundPath = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height));
    final cutoutPath = Path()..addRRect(rrect);
    final overlayPath = Path.combine(
      PathOperation.difference,
      backgroundPath,
      cutoutPath,
    );

    final overlayPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.65)
      ..style = PaintingStyle.fill;
    canvas.drawPath(overlayPath, overlayPaint);

    // 4 Corner brackets
    final cornerPaint = Paint()
      ..color = cornerColor
      ..strokeWidth = 4.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    const cornerLength = 28.0;

    // Top-Left
    canvas.drawPath(
      Path()
        ..moveTo(left, top + cornerLength)
        ..lineTo(left, top + 16)
        ..arcToPoint(Offset(left + 16, top), radius: const Radius.circular(16))
        ..lineTo(left + cornerLength, top),
      cornerPaint,
    );

    // Top-Right
    canvas.drawPath(
      Path()
        ..moveTo(right - cornerLength, top)
        ..lineTo(right - 16, top)
        ..arcToPoint(Offset(right, top + 16), radius: const Radius.circular(16))
        ..lineTo(right, top + cornerLength),
      cornerPaint,
    );

    // Bottom-Left
    canvas.drawPath(
      Path()
        ..moveTo(left, bottom - cornerLength)
        ..lineTo(left, bottom - 16)
        ..arcToPoint(
          Offset(left + 16, bottom),
          radius: const Radius.circular(16),
        )
        ..lineTo(left + cornerLength, bottom),
      cornerPaint,
    );

    // Bottom-Right
    canvas.drawPath(
      Path()
        ..moveTo(right - cornerLength, bottom)
        ..lineTo(right - 16, bottom)
        ..arcToPoint(
          Offset(right, bottom - 16),
          radius: const Radius.circular(16),
        )
        ..lineTo(right, bottom - cornerLength),
      cornerPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _ScannerOverlayPainter oldDelegate) {
    return oldDelegate.scanAreaSize != scanAreaSize ||
        oldDelegate.cornerColor != cornerColor;
  }
}
