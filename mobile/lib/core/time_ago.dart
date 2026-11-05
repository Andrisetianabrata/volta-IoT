/// Format relatif Indonesia untuk timestamp unix (detik).
String timeAgo(int unixSeconds, {int? nowSeconds}) {
  final now = nowSeconds ??
      DateTime.now().millisecondsSinceEpoch ~/ 1000;
  final diff = now - unixSeconds;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return '${diff ~/ 60} mnt lalu';
  if (diff < 86400) return '${diff ~/ 3600} jam lalu';
  final days = diff ~/ 86400;
  if (days < 30) return '$days hari lalu';
  final d = DateTime.fromMillisecondsSinceEpoch(unixSeconds * 1000);
  return '${d.day}/${d.month}/${d.year}';
}
