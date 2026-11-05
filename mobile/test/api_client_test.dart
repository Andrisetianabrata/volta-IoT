import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:mobile/core/api_client.dart';

void main() {
  const base = 'http://127.0.0.1:9443';

  group('register', () {
    test('201 mengembalikan user_id', () async {
      final api = VoltaApi(
        baseUrl: base,
        client: MockClient((_) async => http.Response(
              jsonEncode({'user_id': 'u1'}),
              201,
            )),
      );
      expect(await api.register('a@b.c', 'rahasia'), 'u1');
    });

    test('409 melempar EXISTS', () async {
      final api = VoltaApi(
        baseUrl: base,
        client: MockClient((_) async => http.Response(
              jsonEncode({
                'error': {'code': 'EXISTS', 'message': 'sudah ada'}
              }),
              409,
            )),
      );
      expect(
        () => api.register('a@b.c', 'rahasia'),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'EXISTS')),
      );
    });
  });

  group('login', () {
    test('200 mengembalikan token', () async {
      final api = VoltaApi(
        baseUrl: base,
        client: MockClient((_) async => http.Response(
              jsonEncode({'token': 't1'}),
              200,
            )),
      );
      expect(await api.login('a@b.c', 'rahasia'), 't1');
    });

    test('401 membawa pesan server', () async {
      final api = VoltaApi(
        baseUrl: base,
        client: MockClient((_) async => http.Response(
              jsonEncode({
                'error': {'code': 'UNAUTHORIZED', 'message': 'kredensial salah'}
              }),
              401,
            )),
      );
      expect(
        () => api.login('a@b.c', 'salah'),
        throwsA(isA<ApiException>().having((e) => e.message, 'message', 'kredensial salah')),
      );
    });
  });

  group('deviceOnline', () {
    test('true bila online', () async {
      final api = VoltaApi(
        baseUrl: base,
        client: MockClient((_) async => http.Response(
              jsonEncode({'online': true, 'updated_at': 1}),
              200,
            )),
      );
      expect(await api.deviceOnline('t1', 'd1'), isTrue);
    });

    test('false bila offline', () async {
      final api = VoltaApi(
        baseUrl: base,
        client: MockClient((_) async => http.Response(
              jsonEncode({'online': false, 'updated_at': null}),
              200,
            )),
      );
      expect(await api.deviceOnline('t1', 'd1'), isFalse);
    });
  });

  group('health', () {    test('200 berarti online', () async {
      final api = VoltaApi(
        baseUrl: base,
        client: MockClient((_) async => http.Response('{}', 200)),
      );
      expect(await api.health(), isTrue);
    });

    test('server mati berarti offline', () async {
      final api = VoltaApi(
        baseUrl: base,
        client: MockClient((_) async => http.Response('x', 500)),
      );
      expect(await api.health(), isFalse);
    });
  });

  group('listDevices', () {
    test('200 daftar device', () async {
      final api = VoltaApi(
        baseUrl: base,
        client: MockClient((request) async {
          expect(request.headers['Authorization'], 'Bearer t1');
          return http.Response(
            jsonEncode([
              {'id': 'd1', 'user_id': 'u1', 'name': 'Pompa', 'created_at': 1}
            ]),
            200,
          );
        }),
      );
      final list = await api.listDevices('t1');
      expect(list, hasLength(1));
      expect(list.first.name, 'Pompa');
    });

    test('401 melempar UNAUTHORIZED', () async {
      final api = VoltaApi(
        baseUrl: base,
        client: MockClient((_) async => http.Response(
              jsonEncode({
                'error': {'code': 'UNAUTHORIZED', 'message': 'sesi habis'}
              }),
              401,
            )),
      );
      expect(
        () => api.listDevices(' basi'),
        throwsA(isA<ApiException>().having((e) => e.status, 'status', 401)),
      );
    });
  });

  group('dashboards', () {
    test('201 buat board mengembalikan id', () async {
      final api = VoltaApi(
        baseUrl: base,
        client: MockClient((request) async {
          expect(request.headers['Authorization'], 'Bearer t1');
          return http.Response(jsonEncode({'id': 'b1'}), 201);
        }),
      );
      expect(await api.createDashboard('t1', 'Kebun'), 'b1');
    });

    test('200 daftar boards', () async {
      final api = VoltaApi(
        baseUrl: base,
        client: MockClient((_) async => http.Response(
              jsonEncode([
                {'id': 'b1', 'user_id': 'u1', 'name': 'Kebun', 'created_at': 1}
              ]),
              200,
            )),
      );
      final list = await api.listDashboards('t1');
      expect(list, hasLength(1));
      expect(list.first.name, 'Kebun');
    });

    test('hapus board 2xx tanpa error', () async {
      final api = VoltaApi(
        baseUrl: base,
        client: MockClient((request) async {
          expect(request.method, 'DELETE');
          return http.Response(jsonEncode({'ok': true}), 200);
        }),
      );
      await api.deleteDashboard('t1', 'b1');
    });
  });

  group('createDevice', () {
    test('201 mengembalikan kredensial', () async {
      final api = VoltaApi(
        baseUrl: base,
        client: MockClient((_) async => http.Response(
              jsonEncode({'device_id': 'd1', 'token': 'tok32karakterdisini0000000000000'}),
              201,
            )),
      );
      final creds = await api.createDevice('t1', 'Pompa');
      expect(creds.deviceId, 'd1');
      expect(creds.token, isNotEmpty);
    });
  });
}

