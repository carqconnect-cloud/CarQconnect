import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

class QrCodeWidget extends StatelessWidget {
  final double size;
  final Color darkColor;
  final Color lightColor;
  final bool hasRoundedCorners;
  final String data;
  final bool isEncrypted;
  final String lockMessage;

  const QrCodeWidget({
    super.key,
    this.size = 200,
    this.darkColor = Colors.black,
    this.lightColor = Colors.white,
    this.hasRoundedCorners = true,
    this.data = 'https://car-qconnect.vercel.app',
    this.isEncrypted = true,
    this.lockMessage = 'Purchase the physical\nQR tag to view your code',
  });

  @override
  Widget build(BuildContext context) {
    final qrContent = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: lightColor,
        borderRadius: BorderRadius.circular(hasRoundedCorners ? 20 : 0),
      ),
      padding: EdgeInsets.all(size * 0.08),
      child: QrImageView(
        data: data,
        version: QrVersions.auto,
        size: size * 0.84,
        gapless: false,
        backgroundColor: Colors.transparent,
        eyeStyle: QrEyeStyle(
          eyeShape: QrEyeShape.square,
          color: darkColor,
        ),
        dataModuleStyle: QrDataModuleStyle(
          dataModuleShape: QrDataModuleShape.square,
          color: darkColor,
        ),
      ),
    );

    if (!isEncrypted) {
      return qrContent;
    }

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(hasRoundedCorners ? 20 : 0),
        border: Border.all(
          color: const Color(0xFF000000).withValues(alpha: 0.08),
          width: 1,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(hasRoundedCorners ? 19 : 0),
        child: SizedBox(
          width: size,
          height: size,
          child: Stack(
          alignment: Alignment.center,
          children: [
            // 1. Gaussian blur showing blurred QR matrix matching Image 1
            ImageFiltered(
              imageFilter: ui.ImageFilter.blur(sigmaX: 7.0, sigmaY: 7.0),
              child: qrContent,
            ),

            // 2. Translucent dark tint overlay
            Container(
              width: size,
              height: size,
              color: Colors.black.withValues(alpha: 0.32),
            ),

            // 3. Center frosted lock circle & description text matching Screenshot 2
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.20),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.28),
                        width: 1.2,
                      ),
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.lock_rounded,
                        color: Colors.white,
                        size: 26,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    lockMessage,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      height: 1.35,
                      letterSpacing: 0.2,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ));
  }
}
