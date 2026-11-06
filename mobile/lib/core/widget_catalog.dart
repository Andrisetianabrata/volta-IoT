/// Katalog 25 kind widget, cermin `webapp/lib/widget-registry.ts`.
/// Galeri dan kanvas membaca daftar ini, bukan daftar hardcoded di UI.
enum WidgetCategory { controllers, displays, notifications, iface, others }

class CatalogEntry {
  const CatalogEntry({
    required this.kind,
    required this.title,
    required this.category,
    required this.pins,
    this.wide = false,
  });

  final String kind;
  final String title;
  final WidgetCategory category;
  final String pins;
  final bool wide;
}

String categoryLabel(WidgetCategory c) => switch (c) {
      WidgetCategory.controllers => 'Controllers',
      WidgetCategory.displays => 'Displays',
      WidgetCategory.notifications => 'Notifications',
      WidgetCategory.iface => 'Interface',
      WidgetCategory.others => 'Others',
    };

String categoryHint(WidgetCategory c) => switch (c) {
      WidgetCategory.controllers => 'App ke hardware: kirim perintah.',
      WidgetCategory.displays => 'Hardware ke app: baca sensor.',
      WidgetCategory.notifications => 'Sistem ke pengguna: peringatan.',
      WidgetCategory.iface => 'Tata letak: tab, menu, tabel, peta.',
      WidgetCategory.others => 'Bridge, webhook, BLE, HTML.',
    };

const widgetCatalog = <CatalogEntry>[
  CatalogEntry(kind: 'button', title: 'Button push', category: WidgetCategory.controllers, pins: 'tulis 1 pin'),
  CatalogEntry(kind: 'styled-button', title: 'Styled button', category: WidgetCategory.controllers, pins: 'tulis 1 pin'),
  CatalogEntry(kind: 'slider', title: 'Slider', category: WidgetCategory.controllers, pins: 'tulis 1 pin'),
  CatalogEntry(kind: 'vslider', title: 'Slider vertical', category: WidgetCategory.controllers, pins: 'tulis 1 pin'),
  CatalogEntry(kind: 'step', title: 'Step control', category: WidgetCategory.controllers, pins: 'tulis 1 pin'),
  CatalogEntry(kind: 'joystick', title: 'Joystick', category: WidgetCategory.controllers, pins: 'tulis 2 pin'),
  CatalogEntry(kind: 'zergba', title: 'zeRGBa', category: WidgetCategory.controllers, pins: 'tulis 1 pin'),
  CatalogEntry(kind: 'timer', title: 'Timer', category: WidgetCategory.controllers, pins: 'tulis 1 pin terjadwal'),
  CatalogEntry(kind: 'rtc', title: 'RTC', category: WidgetCategory.controllers, pins: 'baca jam device'),
  CatalogEntry(kind: 'labeled-value', title: 'Value display', category: WidgetCategory.displays, pins: 'baca 1 pin'),
  CatalogEntry(kind: 'led', title: 'LED', category: WidgetCategory.displays, pins: 'baca 1 pin'),
  CatalogEntry(kind: 'gauge', title: 'Gauge', category: WidgetCategory.displays, pins: 'baca 1 pin'),
  CatalogEntry(kind: 'lcd', title: 'LCD', category: WidgetCategory.displays, pins: 'baca 1-2 pin'),
  CatalogEntry(kind: 'history-chart', title: 'SuperChart', category: WidgetCategory.displays, pins: 'baca history 1 pin', wide: true),
  CatalogEntry(kind: 'terminal', title: 'Terminal', category: WidgetCategory.displays, pins: 'tulis dan baca 1 pin'),
  CatalogEntry(kind: 'level', title: 'Level', category: WidgetCategory.displays, pins: 'baca 1 pin'),
  CatalogEntry(kind: 'push', title: 'Notification push', category: WidgetCategory.notifications, pins: 'dipicu 1 pin'),
  CatalogEntry(kind: 'tabs', title: 'Tabs', category: WidgetCategory.iface, pins: 'tanpa pin'),
  CatalogEntry(kind: 'menu', title: 'Menu', category: WidgetCategory.iface, pins: 'tulis 1 pin'),
  CatalogEntry(kind: 'table', title: 'Table', category: WidgetCategory.iface, pins: 'baca N pin', wide: true),
  CatalogEntry(kind: 'map', title: 'Map', category: WidgetCategory.iface, pins: 'baca 1 pin lat,lon', wide: true),
  CatalogEntry(kind: 'bridge', title: 'Bridge', category: WidgetCategory.others, pins: 'teruskan 1 pin'),
  CatalogEntry(kind: 'webhook', title: 'Webhook', category: WidgetCategory.others, pins: 'kirim 1 pin ke URL'),
  CatalogEntry(kind: 'ble', title: 'Bluetooth BLE', category: WidgetCategory.others, pins: 'lokal tanpa server'),
  CatalogEntry(kind: 'html', title: 'HTML kustom', category: WidgetCategory.others, pins: 'bebas via bridge'),
];
