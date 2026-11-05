import 'package:flutter/material.dart';

/// Bottom nav Pebble: bar melayang, tab aktif = pil tinta.
/// Dua destinasi root: Perangkat dan Boards.
class PebbleNavBar extends StatelessWidget {
  const PebbleNavBar({
    super.key,
    required this.index,
    required this.onTap,
  });

  final int index;
  final void Function(int) onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: BoxDecoration(
          color: cs.surface,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: cs.onSurface.withValues(alpha: 0.08)),
        ),
        child: Row(
          children: [
            _item(
              context,
              active: index == 0,
              icon: Icons.memory_outlined,
              label: 'Perangkat',
              onTap: () => onTap(0),
            ),
            _item(
              context,
              active: index == 1,
              icon: Icons.dashboard_outlined,
              label: 'Boards',
              onTap: () => onTap(1),
            ),
          ],
        ),
      ),
    );
  }

  Widget _item(
    BuildContext context, {
    required bool active,
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    final cs = Theme.of(context).colorScheme;
    final fg = active ? cs.surface : cs.onSurface.withValues(alpha: 0.6);
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: active ? cs.onSurface : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 22, color: fg),
              const SizedBox(width: 8),
              Text(
                label,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: fg,
                      fontSize: 14,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Pindah tab root tanpa animasi geser dan tanpa menumpuk rute.
void switchRootTab(BuildContext context, Widget page) {
  Navigator.of(context).pushReplacement(
    PageRouteBuilder(
      pageBuilder: (_, _, _) => page,
      transitionDuration: Duration.zero,
      reverseTransitionDuration: Duration.zero,
    ),
  );
}
