import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'pebble_card.dart';

/// Pratinjau statis controllers. Semua interaksi hanya mengubah state lokal
/// dan tidak mengirim apa pun (segel PRATINJAU di cangkang).

class ButtonPreview extends StatefulWidget {
  const ButtonPreview({super.key});

  @override
  State<ButtonPreview> createState() => _ButtonPreviewState();
}

class _ButtonPreviewState extends State<ButtonPreview> {
  bool _on = false;

  @override
  Widget build(BuildContext context) {
    return PebbleCard(
      title: 'Button push',
      pin: 'relay',
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => setState(() => _on = !_on),
              style: FilledButton.styleFrom(minimumSize: const Size(0, 56)),
              child: Text(_on ? 'ON' : 'OFF'),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Tulis 1 saat ditekan, 0 saat dilepas',
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class StyledButtonPreview extends StatefulWidget {
  const StyledButtonPreview({super.key});

  @override
  State<StyledButtonPreview> createState() => _StyledButtonPreviewState();
}

class _StyledButtonPreviewState extends State<StyledButtonPreview> {
  bool _on = true;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return PebbleCard(
      title: 'Styled button switch',
      pin: 'lamp',
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => setState(() => _on = !_on),
              icon: Icon(
                Icons.lightbulb,
                color: _on ? const Color(0xFFC07A24) : cs.onSurface.withValues(alpha: 0.5),
              ),
              label: Text(_on ? 'Lampu ON' : 'Lampu OFF'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(0, 56)),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Ketuk untuk toggle 1/0',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class HSliderPreview extends StatefulWidget {
  const HSliderPreview({super.key});

  @override
  State<HSliderPreview> createState() => _HSliderPreviewState();
}

class _HSliderPreviewState extends State<HSliderPreview> {
  static const _min = 0.0;
  static const _max = 100.0;
  static const _ppu = 14.0; // piksel per satu unit mistar

  late final ScrollController _ctl;
  final _focus = FocusNode();
  double _v = 80;

  @override
  void initState() {
    super.initState();
    _ctl = ScrollController(initialScrollOffset: _v * _ppu);
    _ctl.addListener(_onScroll);
    _focus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _ctl.removeListener(_onScroll);
    _ctl.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onScroll() {
    final v = (_ctl.offset / _ppu).clamp(_min, _max);
    if ((v - _v).abs() > 0.0001) setState(() => _v = v);
  }

  Future<void> _goTo(double v) {
    return _ctl.animateTo(
      v.clamp(_min, _max) * _ppu,
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
    );
  }

  /// Snap presisi ke unit terdekat saat geseran berhenti.
  void _snap() {
    final snapped = _v.roundToDouble();
    if ((snapped - _v).abs() > 0.0001) _goTo(snapped);
  }

  void _jumpBy(double d) {
    _ctl.jumpTo((_ctl.offset + d * _ppu).clamp(0.0, _max * _ppu));
  }

  KeyEventResult _keys(FocusNode node, KeyEvent event) {
    if (event is KeyDownEvent) {
      if (event.logicalKey == LogicalKeyboardKey.arrowRight) {
        _goTo(_v + 1);
        return KeyEventResult.handled;
      }
      if (event.logicalKey == LogicalKeyboardKey.arrowLeft) {
        _goTo(_v - 1);
        return KeyEventResult.handled;
      }
    }
    return KeyEventResult.ignored;
  }

  void _done() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Nilai ${_v.round()} dikunci (pratinjau, tidak dikirim)'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return PebbleCard(
      title: 'Slider',
      pin: 'pwm',
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _HoldStepper(
                icon: Icons.remove,
                tooltip: 'Kurangi (tahan untuk cepat)',
                onStep: (s) => _jumpBy(-s),
                onEnd: _snap,
              ),
              Expanded(
                child: Text(
                  '${_v.round()}',
                  textAlign: TextAlign.center,
                  style: Theme.of(context)
                      .textTheme
                      .displayLarge
                      ?.copyWith(fontSize: 44),
                ),
              ),
              _HoldStepper(
                icon: Icons.add,
                tooltip: 'Tambah (tahan untuk cepat)',
                onStep: (s) => _jumpBy(s),
                onEnd: _snap,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Semantics(
            label: 'Level penggaris',
            value: '${_v.round()}',
            increasedValue: '${(_v + 1).clamp(_min, _max).toInt()}',
            decreasedValue: '${(_v - 1).clamp(_min, _max).toInt()}',
            onIncrease: () => _goTo(_v + 1),
            onDecrease: () => _goTo(_v - 1),
            child: Focus(
              focusNode: _focus,
              onKeyEvent: _keys,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: _focus.hasFocus
                      ? Border.all(color: cs.onSurface, width: 2)
                      : null,
                ),
                child: NotificationListener<ScrollEndNotification>(
                  onNotification: (_) {
                    _snap();
                    return false;
                  },
                  child: LayoutBuilder(
                    builder: (context, cons) {
                      final half = cons.maxWidth / 2;
                      return Stack(
                        children: [
                          SingleChildScrollView(
                            controller: _ctl,
                            scrollDirection: Axis.horizontal,
                            physics: const ClampingScrollPhysics(),
                            child: Row(
                              children: [
                                SizedBox(width: half),
                                CustomPaint(
                                  size: Size(
                                    (_max - _min) * _ppu,
                                    64,
                                  ),
                                  painter: _RulerPainter(
                                    ink: cs.onSurface,
                                    muted: cs.onSurface
                                        .withValues(alpha: 0.4),
                                  ),
                                ),
                                SizedBox(width: half),
                              ],
                            ),
                          ),
                          const Positioned.fill(
                            child: IgnorePointer(
                              child: Center(child: _RulerNeedle()),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _done,
              style: FilledButton.styleFrom(minimumSize: const Size(0, 52)),
              child: const Text('Done'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Jarum tengah yang diam: garis tembaga + kepala gagang menempel di
/// ujungnya. Motif gagang sama dengan ibu jari fader vertikal
/// (isi + cincin putih) agar satu bahasa di kedua slider.
class _RulerNeedle extends StatelessWidget {
  const _RulerNeedle();

  @override
  Widget build(BuildContext context) {
    const accent = Color(0xFFC07A24);
    return SizedBox(
      width: 20,
      height: 64,
      child: Stack(
        alignment: Alignment.topCenter,
        children: [
          Positioned(
            top: 8,
            bottom: 0,
            child: Container(
              width: 4,
              decoration: BoxDecoration(
                color: accent,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(
              color: accent,
              shape: BoxShape.circle,
              border: Border.all(
                color: const Color(0xFFFFFFFF),
                width: 2.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Mistar 0-100: label tiap 10, tick sedang tiap 5, kecil tiap 1.
class _RulerPainter extends CustomPainter {
  _RulerPainter({required this.ink, required this.muted});

  final Color ink;
  final Color muted;

  @override
  void paint(Canvas canvas, Size size) {
    const ppu = 14.0;
    for (var m = 0; m <= 100; m += 10) {
      final tp = TextPainter(
        text: TextSpan(
          text: '$m',
          style: TextStyle(
            fontSize: 13,
            color: muted,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(m * ppu - tp.width / 2, 0));
    }
    for (var u = 0; u <= 100; u++) {
      final major = u % 10 == 0;
      final h = major ? 30.0 : (u % 5 == 0 ? 20.0 : 11.0);
      canvas.drawLine(
        Offset(u * ppu, 30),
        Offset(u * ppu, 30 + h),
        Paint()
          ..color = major ? ink : muted
          ..strokeWidth = major ? 2.5 : 1.5
          ..strokeCap = StrokeCap.round,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _RulerPainter old) =>
      old.ink != ink || old.muted != muted;
}

/// Tombol stepper tahan: ketuk = 1 langkah, tahan = ulang otomatis
/// dengan langkah membesar (akselerasi untuk rentang lebar).
class _HoldStepper extends StatefulWidget {
  const _HoldStepper({
    required this.icon,
    required this.tooltip,
    required this.onStep,
    this.onEnd,
  });

  final IconData icon;
  final String tooltip;
  final void Function(double step) onStep;
  final VoidCallback? onEnd;

  @override
  State<_HoldStepper> createState() => _HoldStepperState();
}

class _HoldStepperState extends State<_HoldStepper> {
  Timer? _timer;
  double _step = 1;

  void _start() {
    widget.onStep(1);
    _step = 1;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(milliseconds: 110), (_) {
      _step = (_step * 1.4).clamp(1.0, 250.0);
      widget.onStep(_step);
    });
  }

  void _stop() {
    _timer?.cancel();
    _timer = null;
    widget.onEnd?.call();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPressStart: (_) => _start(),
      onLongPressEnd: (_) => _stop(),
      onLongPressCancel: _stop,
      child: IconButton.filledTonal(
        onPressed: () => widget.onStep(1),
        icon: Icon(widget.icon),
        tooltip: widget.tooltip,
      ),
    );
  }
}

class VSliderPreview extends StatefulWidget {
  const VSliderPreview({super.key});

  @override
  State<VSliderPreview> createState() => _VSliderPreviewState();
}

// Mistar tegak: mistar jalan vertikal, jarum mendatar diam di tengah,
// snap presisi saat lepas. Tombol +/- tahan = lompatan berakselerasi
// untuk rentang lebar seperti 0-1000.
class _VSliderPreviewState extends State<VSliderPreview> {
  static const _min = 0.0;
  static const _ppu = 10.0; // piksel per satu unit mistar tegak

  late final ScrollController _ctl;
  final _focus = FocusNode();
  double _max = 100.0;
  double _v = 40;

  @override
  void initState() {
    super.initState();
    _ctl = ScrollController(initialScrollOffset: _v * _ppu);
    _ctl.addListener(_onScroll);
    _focus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _ctl.removeListener(_onScroll);
    _ctl.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onScroll() {
    final v = (_ctl.offset / _ppu).clamp(_min, _max);
    if ((v - _v).abs() > 0.0001) setState(() => _v = v);
  }

  Future<void> _goTo(double v) {
    return _ctl.animateTo(
      v.clamp(_min, _max) * _ppu,
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
    );
  }

  void _jumpBy(double d) {
    _ctl.jumpTo((_ctl.offset + d * _ppu).clamp(0.0, _max * _ppu));
  }

  void _snap() {
    final snapped = _v.roundToDouble();
    if ((snapped - _v).abs() > 0.0001) setState(() => _v = snapped);
  }

  void _setRange(double m) {
    setState(() {
      _max = m;
      _v = _v.clamp(_min, _max);
    });
    _goTo(_v);
  }

  double _page() => ((_max - _min) / 20).clamp(1.0, 100.0);

  KeyEventResult _keys(FocusNode node, KeyEvent event) {
    if (event is KeyDownEvent) {
      if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
        _goTo(_v + 1);
        return KeyEventResult.handled;
      }
      if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
        _goTo(_v - 1);
        return KeyEventResult.handled;
      }
      if (event.logicalKey == LogicalKeyboardKey.pageUp) {
        _goTo(_v + _page());
        return KeyEventResult.handled;
      }
      if (event.logicalKey == LogicalKeyboardKey.pageDown) {
        _goTo(_v - _page());
        return KeyEventResult.handled;
      }
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return PebbleCard(
      title: 'Slider vertical',
      pin: 'valve',
      child: Column(
        children: [
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 6,
            children: [
              for (final r in [100.0, 1000.0])
                ChoiceChip(
                  label: Text('0-${r.toInt()}'),
                  selected: _max == r,
                  onSelected: (_) => _setRange(r),
                ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 260,
            child: Row(
              children: [
                Expanded(
                  child: Semantics(
                    label: 'Penggaris vertikal',
                    value: '${_v.round()}',
                    increasedValue:
                        '${(_v + 1).clamp(_min, _max).toInt()}',
                    decreasedValue:
                        '${(_v - 1).clamp(_min, _max).toInt()}',
                    onIncrease: () => _goTo(_v + 1),
                    onDecrease: () => _goTo(_v - 1),
                    child: Focus(
                      focusNode: _focus,
                      onKeyEvent: _keys,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: _focus.hasFocus
                              ? Border.all(
                                  color: cs.onSurface, width: 2)
                              : null,
                        ),
                        child: NotificationListener<
                            ScrollEndNotification>(
                          onNotification: (_) {
                            _snap();
                            return false;
                          },
                          child: LayoutBuilder(
                            builder: (context, cons) {
                              final half = cons.maxHeight / 2;
                              return Stack(
                                children: [
                                  SingleChildScrollView(
                                    controller: _ctl,
                                    physics:
                                        const ClampingScrollPhysics(),
                                    child: Column(
                                      children: [
                                        SizedBox(height: half),
                                        CustomPaint(
                                          size: Size(
                                            cons.maxWidth,
                                            (_max - _min) * _ppu,
                                          ),
                                          painter: _VRulerPainter(
                                            range: _max - _min,
                                            ink: cs.onSurface,
                                            muted: cs.onSurface.withValues(
                                                alpha: 0.4),
                                          ),
                                        ),
                                        SizedBox(height: half),
                                      ],
                                    ),
                                  ),
                                  Positioned.fill(
                                    child: IgnorePointer(
                                      child: Center(
                                        child: SizedBox(
                                          width: 180,
                                          height: 60,
                                          child: Stack(
                                            alignment: Alignment.center,
                                            children: [
                                              Container(
                                                height: 4,
                                                decoration: BoxDecoration(
                                                  color: const Color(
                                                      0xFFC07A24),
                                                  borderRadius:
                                                      BorderRadius.circular(
                                                          2),
                                                ),
                                              ),
                                              _VRulerNeedle(
                                                value: '${_v.round()}',
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 64,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _HoldStepper(
                        icon: Icons.add,
                        tooltip: 'Tambah (tahan untuk cepat)',
                        onStep: (s) => _jumpBy(s),
                        onEnd: _snap,
                      ),
                      _HoldStepper(
                        icon: Icons.remove,
                        tooltip: 'Kurangi (tahan untuk cepat)',
                        onStep: (s) => _jumpBy(-s),
                        onEnd: _snap,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Lencana nilai besar di tengah jarum: angka menempel pada garis
/// penanda, bukan di kolom terpisah.
class _VRulerNeedle extends StatelessWidget {
  const _VRulerNeedle({required this.value});

  final String value;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    const accent = Color(0xFFC07A24);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
      decoration: BoxDecoration(
        color: cs.surface,
        border: Border.all(color: accent, width: 2),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Text(
        value,
        style: TextStyle(
          fontSize: 40,
          fontWeight: FontWeight.w800,
          color: cs.onSurface,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
    );
  }
}

/// Mistar tegak di lajur kiri: tick menempel kiri, label tiap 10
/// di kanan tick. Sisa lebar untuk garis jarum ke arah angka.
class _VRulerPainter extends CustomPainter {
  _VRulerPainter({
    required this.range,
    required this.ink,
    required this.muted,
  });

  final double range;
  final Color ink;
  final Color muted;

  @override
  void paint(Canvas canvas, Size size) {
    const ppu = 10.0;
    for (var m = 0; m <= range; m += 10) {
      final tp = TextPainter(
        text: TextSpan(
          text: '$m',
          style: TextStyle(
            fontSize: 11,
            color: muted,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(34, m * ppu - tp.height / 2));
    }
    for (var u = 0; u <= range; u++) {
      final major = u % 10 == 0;
      final len = major ? 24.0 : (u % 5 == 0 ? 16.0 : 8.0);
      canvas.drawLine(
        Offset(0, u * ppu),
        Offset(len, u * ppu),
        Paint()
          ..color = major ? ink : muted
          ..strokeWidth = major ? 2.5 : 1.5
          ..strokeCap = StrokeCap.round,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _VRulerPainter old) =>
      old.range != range || old.ink != ink || old.muted != muted;
}

class StepPreview extends StatefulWidget {
  const StepPreview({super.key});

  @override
  State<StepPreview> createState() => _StepPreviewState();
}

class _StepPreviewState extends State<StepPreview> {
  int _v = 4;

  @override
  Widget build(BuildContext context) {
    return PebbleCard(
      title: 'Step control',
      pin: 'dose',
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton.filledTonal(
                onPressed: () => setState(() => _v = (_v - 1).clamp(0, 10)),
                icon: const Icon(Icons.remove),
                tooltip: 'Kurangi',
              ),
              Text('$_v', style: Theme.of(context).textTheme.displayLarge),
              IconButton.filledTonal(
                onPressed: () => setState(() => _v = (_v + 1).clamp(0, 10)),
                icon: const Icon(Icons.add),
                tooltip: 'Tambah',
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text('Step 1, rentang 0-10', style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class JoystickPreview extends StatefulWidget {
  const JoystickPreview({super.key});

  @override
  State<JoystickPreview> createState() => _JoystickPreviewState();
}

class _JoystickPreviewState extends State<JoystickPreview> {
  double _x = 0;
  double _y = 0;

  @override
  Widget build(BuildContext context) {
    return PebbleCard(
      title: 'Joystick',
      pin: 'joy_x joy_y',
      child: Column(
        children: [
          Row(
            children: [
              const Text('X'),
              Expanded(
                child: Slider(
                  value: _x,
                  min: -100,
                  max: 100,
                  divisions: 200,
                  label: _x.toInt().toString(),
                  onChanged: (v) => setState(() => _x = v),
                ),
              ),
              SizedBox(
                width: 48,
                child: Text('${_x.toInt()}', style: Theme.of(context).textTheme.bodySmall),
              ),
            ],
          ),
          Row(
            children: [
              const Text('Y'),
              Expanded(
                child: Slider(
                  value: _y,
                  min: -100,
                  max: 100,
                  divisions: 200,
                  label: _y.toInt().toString(),
                  onChanged: (v) => setState(() => _y = v),
                ),
              ),
              SizedBox(
                width: 48,
                child: Text('${_y.toInt()}', style: Theme.of(context).textTheme.bodySmall),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class ZergbaPreview extends StatefulWidget {
  const ZergbaPreview({super.key});

  @override
  State<ZergbaPreview> createState() => _ZergbaPreviewState();
}

class _ZergbaPreviewState extends State<ZergbaPreview> {
  double _r = 192;
  double _g = 122;
  double _b = 36;

  @override
  Widget build(BuildContext context) {
    final color = Color.fromARGB(255, _r.toInt(), _g.toInt(), _b.toInt());
    return PebbleCard(
      title: 'zeRGBa',
      pin: 'rgb',
      child: Column(
        children: [
          Container(
            height: 56,
            width: double.infinity,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          const SizedBox(height: 8),
          for (final row in [
            ('R', _r, (double v) => setState(() => _r = v)),
            ('G', _g, (double v) => setState(() => _g = v)),
            ('B', _b, (double v) => setState(() => _b = v)),
          ])
            Row(
              children: [
                SizedBox(width: 16, child: Text(row.$1)),
                Expanded(
                  child: Slider(
                    value: row.$2,
                    min: 0,
                    max: 255,
                    divisions: 255,
                    onChanged: row.$3,
                  ),
                ),
                SizedBox(
                  width: 36,
                  child: Text('${row.$2.toInt()}', style: Theme.of(context).textTheme.bodySmall),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

const _dayLabels = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];

class TimerPreview extends StatefulWidget {
  const TimerPreview({super.key});

  @override
  State<TimerPreview> createState() => _TimerPreviewState();
}

class _TimerPreviewState extends State<TimerPreview> {
  final _days = [true, true, true, true, true, false, false];
  bool _enabled = true;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return PebbleCard(
      title: 'Timer',
      pin: 'sched',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('06:30', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            children: [
              for (var i = 0; i < 7; i++)
                ChoiceChip(
                  label: Text(_dayLabels[i]),
                  selected: _days[i],
                  onSelected: (v) => setState(() => _days[i] = v),
                  selectedColor: cs.onSurface,
                  labelStyle: TextStyle(
                    color: _days[i] ? cs.surface : cs.onSurface,
                    fontSize: 12,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Nyalakan lampu'),
              Switch(
                value: _enabled,
                onChanged: (v) => setState(() => _enabled = v),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class RtcPreview extends StatelessWidget {
  const RtcPreview({super.key});

  static String _two(int n) => n.toString().padLeft(2, '0');

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final time = '${_two(now.hour)}:${_two(now.minute)}:${_two(now.second)}';
    return PebbleCard(
      title: 'RTC',
      pin: 'clock',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(time, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 4),
          Text(
            'Jam HP. Sinkron jam server saat connect',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
