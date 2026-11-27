import 'package:flutter/material.dart';
import '../../globals.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_icons.dart';
import 'reminder_models.dart';
import 'set_reminder_screen.dart';
import 'add_custom_reminder_screen.dart';
import '../../widgets/animated_back_arrow.dart';

class SelectReminderTypeScreen extends StatefulWidget {
  const SelectReminderTypeScreen({super.key});

  @override
  State<SelectReminderTypeScreen> createState() =>
      _SelectReminderTypeScreenState();
}

class _SelectReminderTypeScreenState extends State<SelectReminderTypeScreen> {
  String _selectedId = 'service';

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
                'Reminders',
                style: TextStyle(
                  color: isLight ? const Color(0xFF0F172A) : Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            body: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),

                    // Vehicle Selector Card
                    VehicleSelectorCard(
                      vehicleName: Globals.vehicleModel.isNotEmpty ? Globals.vehicleModel : 'Vehicle Model',
                      vehicleNumber: Globals.vehicleRegistration.isNotEmpty ? Globals.vehicleRegistration : 'XX 00 XX 0000',
                    ),

                    const SizedBox(height: 22),

                    // Section Title
                    Text(
                      'Select Reminder Type',
                      style: TextStyle(
                        color: isLight ? const Color(0xFF0F172A) : Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),

                    const SizedBox(height: 16),

                    // 2x3 Grid of Types
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 0.95,
                      ),
                      itemCount: kReminderTypes.length,
                      itemBuilder: (context, index) {
                        final type = kReminderTypes[index];
                        final isSelected = type.id == _selectedId;

                        return GestureDetector(
                          onTap: () async {
                            setState(() {
                              _selectedId = type.id;
                            });

                            final result = await Navigator.push<ReminderItem>(
                              context,
                              MaterialPageRoute(
                                builder: (context) => type.id == 'custom'
                                    ? const AddCustomReminderScreen()
                                    : SetReminderScreen(typeInfo: type),
                              ),
                            );

                            if (!mounted) return;
                            if (result != null) {
                              Navigator.of(this.context).pop(result);
                            }
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isLight
                                  ? (isSelected ? const Color(0xFFEFF6FF) : Colors.white)
                                  : const Color(0xFF101726),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isSelected
                                    ? const Color(0xFF0066FF)
                                    : (isLight ? const Color(0xFFE2E8F0) : const Color(0xFF1C273C)),
                                width: isSelected ? 2.0 : 1.0,
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  width: 52,
                                  height: 52,
                                  decoration: BoxDecoration(
                                    color: isLight ? const Color(0xFFEFF6FF) : const Color(0xFF14243B),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Center(
                                    child: type.svgAsset != null
                                        ? AppIcons.svg(
                                            type.svgAsset!,
                                            color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                                            width: 26,
                                            height: 26,
                                          )
                                        : Icon(
                                            type.icon,
                                            color: isLight ? const Color(0xFF0066FF) : const Color(0xFF00C2FF),
                                            size: 26,
                                          ),
                                  ),
                                ),
                                const SizedBox(height: 14),
                                Text(
                                  type.title,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: isLight ? const Color(0xFF0F172A) : Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    height: 1.25,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
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
