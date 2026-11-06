import 'package:flutter/material.dart';

import '../core/models.dart';
import 'previews_controllers.dart';
import 'previews_displays.dart';
import 'previews_system.dart';
import 'unsupported_card.dart';

/// Memetakan kind ke pratinjau statis untuk galeri dan kanvas.
/// Board live tetap memakai kartu live (button/slider/gauge + api).
Widget previewForKind(String kind) => switch (kind) {
      'button' => const ButtonPreview(),
      'styled-button' => const StyledButtonPreview(),
      'slider' => const HSliderPreview(),
      'vslider' => const VSliderPreview(),
      'step' => const StepPreview(),
      'joystick' => const JoystickPreview(),
      'zergba' => const ZergbaPreview(),
      'timer' => const TimerPreview(),
      'rtc' => const RtcPreview(),
      'labeled-value' => const LabeledValuePreview(),
      'led' => const LedPreview(),
      'gauge' => const GaugePreview(),
      'lcd' => const LcdPreview(),
      'history-chart' => const HistoryChartPreview(),
      'terminal' => const TerminalPreview(),
      'level' => const LevelPreview(),
      'push' => const PushPreview(),
      'tabs' => const TabsPreview(),
      'menu' => const MenuPreview(),
      'table' => const TablePreview(),
      'map' => const MapPreview(),
      'bridge' => const BridgePreview(),
      'webhook' => const WebhookPreview(),
      'ble' => const BlePreview(),
      'html' => const HtmlPreview(),
      _ => UnsupportedCard(
          widget: BoardWidget(
            id: '',
            boardId: '',
            kind: kind,
            pin: '',
            config: const {},
          ),
        ),
    };
