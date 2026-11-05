import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/core/time_ago.dart';

void main() {
  const now = 1000000;

  test('detik -> baru saja', () {
    expect(timeAgo(now - 10, nowSeconds: now), 'baru saja');
  });

  test('menit dan jam', () {
    expect(timeAgo(now - 5 * 60, nowSeconds: now), '5 mnt lalu');
    expect(timeAgo(now - 3 * 3600, nowSeconds: now), '3 jam lalu');
  });

  test('hari', () {
    expect(timeAgo(now - 2 * 86400, nowSeconds: now), '2 hari lalu');
  });
}
