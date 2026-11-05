import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../core/api_client.dart';
import '../core/session.dart';
import '../core/time_ago.dart';
import 'board_screen.dart';
import 'devices_screen.dart';
import 'login_screen.dart';
import '../widgets/pebble_nav.dart';

class BoardsScreen extends StatefulWidget {
  const BoardsScreen({
    super.key,
    required this.baseUrl,
    required this.token,
  });

  final String baseUrl;
  final String token;

  @override
  State<BoardsScreen> createState() => _BoardsScreenState();
}

class _BoardsScreenState extends State<BoardsScreen> {
  late Future<List<VoltaBoard>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    setState(() {
      _future = VoltaApi(baseUrl: widget.baseUrl).listDashboards(widget.token);
    });
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

  Future<void> _createBoard() async {
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
                setD(() => error = 'Isi nama board dulu');
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
                      'Board baru',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: nameCtrl,
                      autofocus: true,
                      textInputAction: TextInputAction.done,
                      decoration: InputDecoration(
                        labelText: 'Nama board',
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
      await VoltaApi(baseUrl: widget.baseUrl)
          .createDashboard(widget.token, name);
      if (!mounted) return;
      _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e is ApiException ? e.message : 'Gagal buat board'),
        ),
      );
    }
  }

  Future<void> _deleteBoard(VoltaBoard board) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Hapus board?'),
          content: Text(
            'Board "${board.name}" ikut menghapus share-nya. Lanjutkan?',
          ),
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
          .deleteDashboard(widget.token, board.id);
      _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e is ApiException ? e.message : 'Gagal hapus board'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Boards'),
        actions: [
          IconButton(
            onPressed: _logout,
            icon: const Icon(Icons.logout),
            tooltip: 'Keluar',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _createBoard,
        tooltip: 'Buat board',
        child: const Icon(Icons.add),
      ),
      bottomNavigationBar: PebbleNavBar(
        index: 1,
        onTap: (i) {
          if (i == 0) {
            switchRootTab(
              context,
              DevicesScreen(baseUrl: widget.baseUrl, token: widget.token),
            );
          }
        },
      ),
      body: FutureBuilder<List<VoltaBoard>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 12),
                  Text('Memuat boards'),
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
                      err is ApiException ? err.message : 'Gagal memuat boards',
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
          final boards = snapshot.data ?? [];
          if (boards.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Belum ada board. Buat board pertama untuk mulai.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _createBoard,
                      child: const Text('Buat board'),
                    ),
                  ],
                ),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: boards.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final b = boards[i];
              final dark =
                  Theme.of(context).brightness == Brightness.dark;
              return Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  leading: SvgPicture.asset(
                    dark
                        ? 'assets/logo/volta-symbol-white.svg'
                        : 'assets/logo/volta-symbol.svg',
                    width: 40,
                    semanticsLabel: 'Board',
                  ),
                  title: Text(b.name),
                  subtitle: Text(
                    'Dibuat ${timeAgo(b.createdAt)}',
                  ),
                  trailing: PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert),
                    tooltip: 'Opsi board',
                    onSelected: (value) {
                      if (value == 'hapus') _deleteBoard(b);
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
                        builder: (_) => BoardScreen(
                          baseUrl: widget.baseUrl,
                          token: widget.token,
                          board: b,
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
