import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Design background gradient matching central AppTheme
LinearGradient get kBotBackgroundGradient => AppTheme.bgGradient;

const Color kBotBgColor = Color(0xFF070B18);
const Color kBotCyan = Color(0xFF00C2FF);
const Color kBotLightCyan = Color(0xFF38BDF8);
const Color kBotUserBubbleColor = Color(0xFF38BDF8);
const Color kBotAssistantBubbleColor = Color(0xFF101726);
const Color kBotCardBorder = Color(0xFF1C273C);

/// Vehicle Health Diagnostics Data
class VehicleHealthData {
  final String carName;
  final String overallHealth;
  final String note;
  final String engine;
  final String battery;
  final String tyrePressure;
  final String recommendation;
  final String carImage;

  const VehicleHealthData({
    this.carName = 'Hyundai Tucson Turbo Hybrid',
    this.overallHealth = 'Good',
    this.note = 'No major issues detected.',
    this.engine = 'Normal',
    this.battery = 'Good',
    this.tyrePressure = 'Normal',
    this.recommendation =
        'All systems are running smoothly. Keep up your regular maintenance for the best performance!',
    this.carImage = 'assets/images/onboarding_1.png',
  });

  Map<String, dynamic> toJson() => {
    'carName': carName,
    'overallHealth': overallHealth,
    'note': note,
    'engine': engine,
    'battery': battery,
    'tyrePressure': tyrePressure,
    'recommendation': recommendation,
    'carImage': carImage,
  };

  factory VehicleHealthData.fromJson(Map<String, dynamic> json) =>
      VehicleHealthData(
        carName: json['carName'] as String? ?? 'Hyundai Tucson Turbo Hybrid',
        overallHealth: json['overallHealth'] as String? ?? 'Good',
        note: json['note'] as String? ?? 'No major issues detected.',
        engine: json['engine'] as String? ?? 'Normal',
        battery: json['battery'] as String? ?? 'Good',
        tyrePressure: json['tyrePressure'] as String? ?? 'Normal',
        recommendation: json['recommendation'] as String? ??
            'All systems are running smoothly. Keep up your regular maintenance for the best performance!',
        carImage: json['carImage'] as String? ?? 'assets/images/onboarding_1.png',
      );
}

class BotMessage {
  final String id;
  final String text;
  final bool isUser;
  final String? imageUrl;
  final String? subtext;
  final DateTime timestamp;
  final bool hasEditOption;
  final bool isVehicleHealthCard;
  final VehicleHealthData? healthData;

  const BotMessage({
    required this.id,
    required this.text,
    required this.isUser,
    this.imageUrl,
    this.subtext,
    required this.timestamp,
    this.hasEditOption = false,
    this.isVehicleHealthCard = false,
    this.healthData,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'text': text,
    'isUser': isUser,
    'imageUrl': imageUrl,
    'subtext': subtext,
    'timestamp': timestamp.toIso8601String(),
    'hasEditOption': hasEditOption,
    'isVehicleHealthCard': isVehicleHealthCard,
    'healthData': healthData?.toJson(),
  };

  factory BotMessage.fromJson(Map<String, dynamic> json) => BotMessage(
    id: json['id'] as String? ?? '',
    text: json['text'] as String? ?? '',
    isUser: json['isUser'] as bool? ?? false,
    imageUrl: json['imageUrl'] as String?,
    subtext: json['subtext'] as String?,
    timestamp: json['timestamp'] != null
        ? DateTime.tryParse(json['timestamp'] as String) ?? DateTime.now()
        : DateTime.now(),
    hasEditOption: json['hasEditOption'] as bool? ?? false,
    isVehicleHealthCard: json['isVehicleHealthCard'] as bool? ?? false,
    healthData: json['healthData'] != null
        ? VehicleHealthData.fromJson(
            json['healthData'] as Map<String, dynamic>)
        : null,
  );
}

/// A conversation session for the Chat History drawer
class ChatSession {
  final String id;
  final String title;
  final DateTime updatedAt;
  final bool isPinned;
  final List<BotMessage> messages;

  ChatSession({
    required this.id,
    required this.title,
    required this.updatedAt,
    this.isPinned = false,
    required this.messages,
  });

  ChatSession copyWith({
    String? id,
    String? title,
    DateTime? updatedAt,
    bool? isPinned,
    List<BotMessage>? messages,
  }) {
    return ChatSession(
      id: id ?? this.id,
      title: title ?? this.title,
      updatedAt: updatedAt ?? this.updatedAt,
      isPinned: isPinned ?? this.isPinned,
      messages: messages ?? this.messages,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'updatedAt': updatedAt.toIso8601String(),
    'isPinned': isPinned,
    'messages': messages.map((m) => m.toJson()).toList(),
  };

  factory ChatSession.fromJson(Map<String, dynamic> json) => ChatSession(
    id: json['id'] as String? ?? '',
    title: json['title'] as String? ?? 'Chat',
    updatedAt: json['updatedAt'] != null
        ? DateTime.tryParse(json['updatedAt'] as String) ?? DateTime.now()
        : DateTime.now(),
    isPinned: json['isPinned'] as bool? ?? false,
    messages: (json['messages'] as List<dynamic>? ?? [])
        .map((m) => BotMessage.fromJson(m as Map<String, dynamic>))
        .toList(),
  );
}

/// Prompt suggestions matching Image 1
const List<String> kBotPromptSuggestions = [
  'Summarize this document for me.',
  'Create an image of a futuristic city',
  'Write a Python code to sort a list',
];

/// Attachment options
class BotAttachmentOption {
  final String title;
  final IconData icon;

  const BotAttachmentOption({
    required this.title,
    required this.icon,
  });
}

const List<BotAttachmentOption> kBotAttachmentOptions = [
  BotAttachmentOption(title: 'Camera', icon: Icons.camera_alt_outlined),
  BotAttachmentOption(title: 'Photos', icon: Icons.image_outlined),
  BotAttachmentOption(title: 'Document', icon: Icons.description_outlined),
];
