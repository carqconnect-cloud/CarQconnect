import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../services/plan_limits_service.dart';
import '../../globals.dart';
import 'document_model.dart';
import 'add_documents.dart';
import '../../widgets/animated_back_arrow.dart';

class DocumentPage extends StatelessWidget {
  final Future<void> Function()? onRefresh;
  final VoidCallback? onDocumentAdded;

  const DocumentPage({
    super.key,
    this.onRefresh,
    this.onDocumentAdded,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppTheme.isLightNotifier,
      builder: (context, isLight, _) {
        Widget content = SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 8),

              // Vehicle Card
              const VehicleSelectorCard(),

              const SizedBox(height: 36),

              // Empty State Illustration
              Center(
                child: SizedBox(
                  width: 140,
                  height: 165,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      // Document card body
                      Container(
                        width: 125,
                        height: 155,
                        decoration: BoxDecoration(
                          color: AppTheme.cardBg,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: AppTheme.cardBorder,
                            width: 1.5,
                          ),
                          boxShadow: isLight ? AppTheme.cardShadow : null,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header Bar
                            Container(
                              height: 22,
                              margin: const EdgeInsets.only(
                                top: 10,
                                left: 12,
                                right: 12,
                              ),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryBlue,
                                borderRadius: BorderRadius.circular(6),
                              ),
                            ),
                            const SizedBox(height: 16),
                            // Document Content Lines
                            Container(
                              height: 8,
                              width: 70,
                              margin: const EdgeInsets.symmetric(
                                horizontal: 12,
                              ),
                              decoration: BoxDecoration(
                                color: isLight ? const Color(0xFFCBD5E1) : Colors.white,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Container(
                              height: 8,
                              width: 95,
                              margin: const EdgeInsets.symmetric(
                                horizontal: 12,
                              ),
                              decoration: BoxDecoration(
                                color: isLight ? const Color(0xFFE2E8F0) : Colors.white70,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Container(
                              height: 8,
                              width: 75,
                              margin: const EdgeInsets.symmetric(
                                horizontal: 12,
                              ),
                              decoration: BoxDecoration(
                                color: isLight ? const Color(0xFFE2E8F0) : Colors.white70,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Floating Fold Corner Icon
                      Positioned(
                        right: 8,
                        bottom: 0,
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: AppTheme.primaryBlue,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.description_rounded,
                            color: Colors.white,
                            size: 24,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Heading
              Text(
                'No Document Added Yet',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.2,
                ),
              ),

              const SizedBox(height: 8),

              // Subtitle
              Text(
                'Keep your vehicle documents safe and\naccessible anytime.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 14,
                  height: 1.45,
                ),
              ),

              const SizedBox(height: 28),

              // "Why add documents?" Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppTheme.cardBg,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppTheme.cardBorder),
                  boxShadow: isLight ? AppTheme.cardShadow : null,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Why add documents?',
                      style: TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 14.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildBenefitRow(
                      icon: Icons.description_outlined,
                      title: 'Access anytime, anywhere',
                      isLight: isLight,
                    ),
                    const SizedBox(height: 14),
                    _buildBenefitRow(
                      icon: Icons.notifications_none_rounded,
                      title: 'Get expiry reminders',
                      isLight: isLight,
                    ),
                    const SizedBox(height: 14),
                    _buildBenefitRow(
                      icon: Icons.shield_outlined,
                      title: 'Keep your vehicle details safe',
                      isLight: isLight,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        );

        if (onRefresh != null) {
          content = RefreshIndicator(
            color: AppTheme.primaryBlue,
            backgroundColor: AppTheme.cardBg,
            onRefresh: onRefresh!,
            child: content,
          );
        }

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
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(child: content),

                  // Bottom Add Document Button
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                    decoration: const BoxDecoration(color: Colors.transparent),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: () async {
                          if (!PlanLimitsService.canUploadDocument(0)) {
                            final limit = PlanLimitsService.getDocumentLimit();
                            PlanLimitsService.showUpgradeDialog(
                              context: context,
                              title: 'Document Limit Reached',
                              message:
                                  'Your ${Globals.currentPlan.isEmpty ? "Free" : Globals.currentPlan} plan allows up to $limit ${limit == 1 ? "document" : "documents"}. Upgrade your membership to upload more documents.',
                              limit: limit,
                              reason: 'document',
                            );
                            return;
                          }
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const AddDocumentsScreen(currentDocCount: 0),
                            ),
                          );
                          onDocumentAdded?.call();
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

  Widget _buildBenefitRow({required IconData icon, required String title, required bool isLight}) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: isLight ? const Color(0xFFF1F5F9) : const Color(0xFF162030),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Icon(
              icon,
              color: isLight ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
              size: 19,
            ),
          ),
        ),
        const SizedBox(width: 14),
        Text(
          title,
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 13.5,
            fontWeight: FontWeight.w400,
          ),
        ),
      ],
    );
  }
}
