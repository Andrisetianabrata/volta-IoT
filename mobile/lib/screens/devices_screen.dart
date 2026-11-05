import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/api_client.dart';
import '../core/session.dart';
import '../core/time_ago.dart';
import 'boards_screen.dart';
import 'device_screen.dart';
import 'login_screen.dart';
import '../widgets/pebble_nav.dart';

class _DeviceRow {
  _DeviceRow(this.device, this.online, this.updatedAt);

  final VoltaDevice device;
  final bool online;
  final int updatedAt;
}

class DevicesScreen extends StatefulWidget {
  const DevicesScreen({
    super.key,
    required this.baseUrl,
    required this.token,
  });

  final String baseUrl;
  final String token;

  @override
  State<DevicesScreen> createState() => _DevicesScreenState();
}

class _DevicesScreenState extends State<DevicesScreen> {
  late Future<List<_DeviceRow>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    setState(() {
      _future = _load();
    });
  }

  Future<List<_DeviceRow>> _load() async {
    final api = VoltaApi(baseUrl: widget.baseUrl);
    final devices = await api.listDevices(widget.token);
    final rows = await Future.wait(devices.map((d) async {
      bool online = false;
      int updated = 0;
      try {
        final st = await api.deviceStatus(widget.token, d.id);
        online = st.online;
        updated = st.updatedAt;
      } catch (_) {}
      return _DeviceRow(d, online, updated);
    }));
    return rows;
  }

  Future<void> _logout() async {
    await SessionStore().clear();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  void _backToLogin(String message) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    });
  }

  Future<void> _createDevice() async {
    final nameCtrl = TextEditingController();
    String? error;
    final name = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      barrierColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setD) {
            void submit() {
              final name = nameCtrl.text.trim();
              if (name.isEmpty) {
                setD(() => error = 'Isi nama device dulu');
                return;
              }
              Navigator.of(context).pop(name);
            }

            final keyboard = MediaQuery.viewInsetsOf(context).bottom;
            return SizedBox(
              height: MediaQuery.sizeOf(context).height / 4 + keyboard,
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(24, 16, 24, keyboard + 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Device baru',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: nameCtrl,
                      autofocus: true,
                      textInputAction: TextInputAction.done,
                      decoration: InputDecoration(
                        labelText: 'Nama device',
                        hintText: 'Pompa kebun',
                        errorText: error,
                      ),
                      onSubmitted: (_) => submit(),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text('Batal'),
                        ),
                        const SizedBox(width: 8),
                        FilledButton(
                          onPressed: submit,
                          child: const Text('Buat'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
    if (name == null || !mounted) return;
    try {
      final creds = await VoltaApi(baseUrl: widget.baseUrl)
          .createDevice(widget.token, name);
      if (!mounted) return;
      _reload();
      _showToken(creds.token);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e is ApiException ? e.message : 'Gagal buat device'),
        ),
      );
    }
  }

  Future<void> _showToken(String token) async {
    await showModalBottomSheet<void>(
      context: context,
      barrierColor: Colors.transparent,
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Token device (sekali tampil)',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'Tempel ke firmware. Token tidak bisa dilihat lagi.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        token,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton.icon(
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: token));
                        Navigator.of(context).pop();
                        ScaffoldMessenger.of(this.context).showSnackBar(
                          const SnackBar(content: Text('Token disalin')),
                        );
                      },
                      icon: const Icon(Icons.copy, size: 16),
                      label: const Text('Salin'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _deleteDevice(_DeviceRow row) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Hapus device?'),
          content: Text('Device "${row.device.name}" akan dihapus. Lanjutkan?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Batal'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Hapus'),
            ),
          ],
        );
      },
    );
    if (confirm != true || !mounted) return;
    try {
      await VoltaApi(baseUrl: widget.baseUrl)
          .deleteDevice(widget.token, row.device.id);
      _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e is ApiException ? e.message : 'Gagal hapus device'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Perangkat'),
        actions: [
          IconButton(
            onPressed: _logout,
            icon: const Icon(Icons.logout),
            tooltip: 'Keluar',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _createDevice,
        tooltip: 'Tambah device',
        child: const Icon(Icons.add),
      ),
      bottomNavigationBar: PebbleNavBar(
        index: 0,
        onTap: (i) {
          if (i == 1) {
            switchRootTab(
              context,
              BoardsScreen(baseUrl: widget.baseUrl, token: widget.token),
            );
          }
        },
      ),
      body: FutureBuilder<List<_DeviceRow>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 12),
                  Text('Memuat perangkat'),
                ],
              ),
            );
          }
          if (snapshot.hasError) {
            final err = snapshot.error;
            if (err is ApiException && err.status == 401) {
              _backToLogin('Sesi berakhir, silakan masuk lagi');
              return const SizedBox.shrink();
            }
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      err is ApiException ? err.message : 'Gagal memuat perangkat',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: _reload,
                      child: const Text('Coba lagi'),
                    ),
                  ],
                ),
              ),
            );
          }
          final rows = snapshot.data ?? [];
          if (rows.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Belum ada device. Tambah device pertama untuk mulai.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _createDevice,
                      child: const Text('Tambah device'),
                    ),
                  ],
                ),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: rows.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final row = rows[i];
              final pill = row.online ? 'Online' : 'Offline';
              final pillColor = row.online ? cs.tertiary : cs.onSurface.withValues(alpha: 0.5);
              final updated = row.updatedAt > 0
                  ? ' • ${timeAgo(row.updatedAt)}'
                  : '';
              return Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  title: Text(row.device.name),
                  subtitle: Text('$pill$updated'),
                  subtitleTextStyle: TextStyle(color: pillColor),
                  trailing: PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert),
                    tooltip: 'Opsi device',
                    onSelected: (value) {
                      if (value == 'hapus') _deleteDevice(row);
                    },
                    itemBuilder: (context) => const [
                      PopupMenuItem(
                        value: 'hapus',
                        child: Text('Hapus'),
                      ),
                    ],
                  ),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => DeviceScreen(
                          baseUrl: widget.baseUrl,
                          token: widget.token,
                          device: row.device,
                          online: row.online,
                          updatedAt: row.updatedAt,
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}
