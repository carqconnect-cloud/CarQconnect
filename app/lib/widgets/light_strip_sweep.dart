import 'dart:math' as math;

import 'package:flutter/material.dart';

class LightStripSweep extends StatefulWidget {
  final bool active;
  final String imagePath;
  const LightStripSweep({super.key, required this.active, required this.imagePath});

  @override
  State<LightStripSweep> createState() => _LightStripSweepState();
}

class _LightStripSweepState extends State<LightStripSweep>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late final Animation<double> _progress;
  ImageStream? _stream;
  ImageStreamListener? _listener;
  Size? _imageSize;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );
    // Smooth delay then fluid sweep matching cockpit video
    _progress = CurvedAnimation(
      parent: _c,
      curve: const Interval(0.15, 1.0, curve: Curves.easeOutCubic),
    );
    if (widget.active) _c.forward();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_stream != null && _listener != null) {
      _stream!.removeListener(_listener!);
    }
    _stream = AssetImage(widget.imagePath)
        .resolve(createLocalImageConfiguration(context));
    _listener = ImageStreamListener((info, _) {
      if (!mounted) return;
      setState(() => _imageSize =
          Size(info.image.width.toDouble(), info.image.height.toDouble()));
    });
    _stream!.addListener(_listener!);
  }

  @override
  void didUpdateWidget(covariant LightStripSweep old) {
    super.didUpdateWidget(old);
    if (widget.active && !old.active) {
      _c.forward(from: 0);
    } else if (!widget.active && old.active) {
      _c.reset();
    }
  }

  @override
  void dispose() {
    if (_stream != null && _listener != null) {
      _stream!.removeListener(_listener!);
    }
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_imageSize == null) return const SizedBox.shrink();
    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, child) => CustomPaint(
          size: Size.infinite,
          painter: _LightStripPainter(_progress.value, _imageSize!),
        ),
      ),
    );
  }
}

class _LightStripPainter extends CustomPainter {
  final double progress;
  final Size imageSize;
  _LightStripPainter(this.progress, this.imageSize);

  // Exact dashboard trim contour coordinates mapped to onboarding_2.png
  static const _start = Offset(0.352, 0.515);
  static const _end = Offset(1.000, 0.565);

  @override
  void paint(Canvas canvas, Size size) {
    if (progress <= 0) return;

    // Map image-space → screen-space, matching BoxFit.cover
    final scale = math.max(size.width / imageSize.width, size.height / imageSize.height);
    final dx = (size.width - imageSize.width * scale) / 2;
    final dy = (size.height - imageSize.height * scale) / 2;
    Offset map(Offset f) =>
        Offset(dx + f.dx * imageSize.width * scale, dy + f.dy * imageSize.height * scale);

    final a = map(_start);
    final b = map(_end);
    final head = Offset.lerp(a, b, progress)!;

    // Premium ice-blue / electric cyan ambient LED colors
    const ambientNeon = Color(0xFF00B0FF);
    const brightCyan = Color(0xFF40C4FF);
    const laserCore = Color(0xFFE1F5FE);

    // 1. Wide diffuse ambient glow (in-car cabin illumination)
    canvas.drawLine(
      a, head,
      Paint()
        ..color = ambientNeon.withValues(alpha: 0.40)
        ..strokeWidth = 14
        ..strokeCap = StrokeCap.round
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10),
    );

    // 2. Medium vibrant cyan neon beam
    canvas.drawLine(
      a, head,
      Paint()
        ..shader = LinearGradient(
          colors: [
            brightCyan.withValues(alpha: 0.60),
            brightCyan,
            laserCore,
          ],
        ).createShader(Rect.fromPoints(a, head).inflate(2))
        ..strokeWidth = 4.5
        ..strokeCap = StrokeCap.round
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2.5),
    );

    // 3. Crisp razor-sharp optical lightguide core
    canvas.drawLine(
      a, head,
      Paint()
        ..color = laserCore
        ..strokeWidth = 2.0
        ..strokeCap = StrokeCap.round,
    );

    // 4. Bright sweeping comet head with lens flare
    if (progress < 1.0) {
      final headIntensity = (1.0 - progress * 0.3).clamp(0.0, 1.0);
      // Soft bloom halo
      canvas.drawCircle(
        head, 12,
        Paint()
          ..color = brightCyan.withValues(alpha: 0.65 * headIntensity)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8),
      );
      // Hot white center
      canvas.drawCircle(
        head, 3.5,
        Paint()..color = Colors.white.withValues(alpha: 0.95 * headIntensity),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _LightStripPainter old) =>
      old.progress != progress || old.imageSize != imageSize;
}
