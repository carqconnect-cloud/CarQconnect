import 'package:flutter/material.dart';
import '../qr/select_vehicle_screen.dart';

/// Screen displaying the user's active QR tags (Profile > My QR Tag).
/// Only shows vehicles with activated QR tags, without Add Vehicle or Add QR tag buttons.
class MyQrTagsScreen extends StatelessWidget {
  const MyQrTagsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const SelectVehicleScreen(
      onlyActivated: true,
      showAddVehicle: false,
      title: 'QR Tag',
    );
  }
}

