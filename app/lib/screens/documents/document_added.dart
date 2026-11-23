import 'package:flutter/material.dart';
import 'document_model.dart';
import 'document_details.dart';
import 'add_documents.dart';
import '../../globals.dart';
import '../../theme/app_theme.dart';
import '../../widgets/animated_back_arrow.dart';

class DocumentAddedScreen extends StatelessWidget {
  final VehicleDocument? document;

  const DocumentAddedScreen({super.key, this.document});

  @override
  Widget build(BuildContext context) {
    final realOwner = '${Globals.firstName} ${Globals.lastName}'.trim();
    final doc = document ??
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
              leadingWidth: 56,
              leading: AnimatedBackArrowButton(onTap: () {
                  // Pop back to the vehicle documents screen
                  Navigator.popUntil(context, (route) => route.isFirst);
                }),
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                    const SizedBox(height: 10),

                    // Document Illustration with Confetti & Checkmark
                    Center(
                      child: SizedBox(
                        width: 170,
                        height: 180,
                        child: Stack(
                          clipBehavior: Clip.none,
                          alignment: Alignment.center,
                          children: [
                            // Confetti items
                            // 1. Orange angled pill (top left)
                            Positioned(
                              top: 24,
                              left: 18,
                              child: Transform.rotate(
                                angle: -0.6,
                                child: Container(
                                  width: 14,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFF9800),
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                ),
                              ),
                            ),
                            // 2. Yellow dot (top center)
                            Positioned(
                              top: 14,
                              left: 95,
                              child: Container(
                                width: 7,
                                height: 7,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFFFD54F),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                            // 3. Cyan angled pill (top right)
                            Positioned(
                              top: 26,
                              right: 20,
                              child: Transform.rotate(
                                angle: 0.5,
                                child: Container(
                                  width: 14,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF00C2FF),
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                ),
                              ),
                            ),
                            // 4. Cyan 4-point star (mid left)
                            const Positioned(
                              top: 68,
                              left: 6,
                              child: Icon(
                                Icons.auto_awesome,
                                size: 14,
                                color: Color(0xFF00C2FF),
                              ),
                            ),
                            // 5. Yellow dot (bottom left)
                            Positioned(
                              bottom: 38,
                              left: 14,
                              child: Container(
                                width: 7,
                                height: 7,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFFFB300),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                            // 6. Cyan 4-point star (mid right)
                            const Positioned(
                              top: 74,
                              right: 6,
                              child: Icon(
                                Icons.auto_awesome,
                                size: 13,
                                color: Color(0xFF00C2FF),
                              ),
                            ),
                            // 7. Cyan small dot (bottom right)
                            Positioned(
                              bottom: 28,
                              right: 22,
                              child: Container(
                                width: 5,
                                height: 5,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF00C2FF),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),

                            // Main Document Sheet
                            Container(
                              width: 110,
                              height: 135,
                              decoration: BoxDecoration(
                                color: isLight ? Colors.white : const Color(0xFF141D2C),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF23324C),
                                  width: 1.4,
                                ),
                                boxShadow: isLight ? AppTheme.cardShadow : null,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Cyan Top Header Bar
                                  Container(
                                    height: 18,
                                    margin: const EdgeInsets.only(
                                      top: 8,
                                      left: 10,
                                      right: 10,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                                      borderRadius: BorderRadius.circular(5),
                                    ),
                                  ),
                                  const SizedBox(height: 14),
                                  // Horizontal lines
                                  Container(
                                    height: 6,
                                    width: 62,
                                    margin: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isLight ? const Color(0xFF94A3B8) : Colors.white,
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Container(
                                    height: 6,
                                    width: 80,
                                    margin: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isLight ? const Color(0xFF94A3B8) : Colors.white,
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Container(
                                    height: 6,
                                    width: 64,
                                    margin: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isLight ? const Color(0xFF94A3B8) : Colors.white,
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Container(
                                    height: 6,
                                    width: 40,
                                    margin: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isLight ? const Color(0xFF94A3B8) : Colors.white,
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Green Checkmark Circular Badge
                            Positioned(
                              bottom: 12,
                              right: 18,
                              child: Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF00C853),
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF00C853)
                                          .withValues(alpha: 0.4),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: const Center(
                                  child: Icon(
                                    Icons.check,
                                    color: Colors.white,
                                    size: 26,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 18),

                    // Headings
                    Text(
                      'Document Added!',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Your ${doc.docType.toUpperCase() == 'RC' ? 'RC' : doc.title} has been added successfully.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                        fontSize: 14,
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Document Card Preview
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: isLight ? Colors.white : const Color(0xFF101726),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C)),
                        boxShadow: isLight ? AppTheme.cardShadow : null,
                      ),
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 46,
                                height: 46,
                                decoration: BoxDecoration(
                                  color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF142238),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Center(
                                  child: Icon(
                                    Icons.credit_card_rounded,
                                    color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                                    size: 24,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      doc.docType.toUpperCase() == 'RC'
                                          ? 'RC'
                                          : doc.title,
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                        fontSize: 16.5,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      doc.docType.toUpperCase() == 'RC'
                                          ? '(Registration Certificate)'
                                          : doc.regNumber,
                                      style: TextStyle(
                                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                                        fontSize: 12.5,
                                      ),
                                    ),
                                  ],
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
                                  border: Border.all(
                                    color: isLight ? const Color(0xFF6EE7B7) : const Color(0xFF104A3A),
                                  ),
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
                          const SizedBox(height: 16),
                          Divider(
                            color: isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C),
                            height: 1,
                          ),
                          const SizedBox(height: 14),
                          Text(
                            'Valid till',
                            style: TextStyle(
                              color: isLight ? const Color(0xFF64748B) : const Color(0xFF8E9BAE),
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            doc.expiryDate,
                            style: TextStyle(
                              color: isLight ? const Color(0xFF0F172A) : Colors.white,
                              fontSize: 14.5,
                              fontWeight: FontWeight.w600,
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

            // Two Bottom Action Buttons
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
              decoration: BoxDecoration(
                color: isLight ? Colors.white : const Color(0xFF090E17),
                border: Border(
                  top: BorderSide(
                    color: isLight ? const Color(0xFFE2E8F0) : Colors.transparent,
                    width: 1,
                  ),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // 1. View Document Button (Cyan / Blue)
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder: (context) =>
                                DocumentDetailsScreen(document: doc),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                        foregroundColor: isLight ? Colors.white : Colors.black,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(26),
                        ),
                      ),
                      child: Text(
                        'View Document',
                        style: TextStyle(
                          color: isLight ? Colors.white : Colors.black,
                          fontSize: 15.5,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  // 2. Add Another Document Button
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const AddDocumentsScreen(),
                          ),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        backgroundColor: isLight ? Colors.white : const Color(0xFF101726),
                        side: BorderSide(color: isLight ? const Color(0xFFCBD5E1) : const Color(0xFF1E2B40)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(26),
                        ),
                      ),
                      child: Text(
                        'Add Another Document',
                        style: TextStyle(
                          color: isLight ? const Color(0xFF0F172A) : Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ),
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
