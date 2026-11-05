import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../core/api_client.dart';
import '../core/server_config.dart';
import '../core/session.dart';
import '../theme/theme_controller.dart';
import 'devices_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _emailNode = FocusNode();
  final _passwordNode = FocusNode();
  String? _savedServer;
  bool _busy = false;
  bool _checking = false;
  bool? _online;
  int _checkSeq = 0;

  @override
  void initState() {
    super.initState();
    ServerConfig.load().then((url) {
      if (!mounted) return;
      setState(() => _savedServer = url);
      _checkServer();
    });
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _emailNode.dispose();
    _passwordNode.dispose();
    super.dispose();
  }

  void _fail(Object e) {
    final message = e is ApiException ? e.message : 'Server tidak terjangkau';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _doLogin(String server) async {
    setState(() => _busy = true);
    try {
      final token = await VoltaApi(baseUrl: server).login(
        _email.text.trim(),
        _password.text,
      );
      await SessionStore().save(token);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => DevicesScreen(baseUrl: server, token: token),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      _fail(e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _doRegister(String server) async {
    setState(() => _busy = true);
    try {
      await VoltaApi(baseUrl: server).register(
        _email.text.trim(),
        _password.text,
      );
      if (!mounted) return;
      await _doLogin(server);
    } catch (e) {
      if (!mounted) return;
      _fail(e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _checkServer() async {
    final url = _savedServer;
    if (url == null) return;
    final seq = ++_checkSeq;
    setState(() => _checking = true);
    final ok = await VoltaApi(baseUrl: url).health();
    if (!mounted || seq != _checkSeq) return;
    setState(() {
      _checking = false;
      _online = ok;
    });
  }

  Future<String?> _askServer() {
    final ctrl = TextEditingController(text: _savedServer ?? '');
    String? error;
    if (!mounted) return Future.value();
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      // Tanpa scrim fade: transisi naik tidak me-repaint full-screen
      // tiap frame, ringan bareng animasi keyboard di HP kentang.
      barrierColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setD) {
            void submit() {
              final url = normalizeServerUrl(ctrl.text);
              if (url == null) {
                setD(() {
                  error = ctrl.text.trim().isEmpty
                      ? 'Isi alamat server dulu'
                      : 'Alamat server tidak valid';
                });
                return;
              }
              final navigator = Navigator.of(context);
              ServerConfig.save(url).then((_) {
                if (!mounted) return;
                setState(() => _savedServer = url);
                navigator.pop(url);
                _checkServer();
              });
            }

            // Sheet 1/4 layar: ringan dibuka, cukup untuk 1 field + aksi.
            // Tinggi ditambah insets keyboard agar isi tidak tertutup.
            final sheetHeight = MediaQuery.sizeOf(context).height / 4;
            final keyboard = MediaQuery.viewInsetsOf(context).bottom;
            return SizedBox(
              height: sheetHeight + keyboard,
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(
                  24,
                  16,
                  24,
                  keyboard + 16,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Alamat server',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: ctrl,
                      keyboardType: TextInputType.url,
                      autofocus: true,
                      decoration: InputDecoration(
                        hintText: '192.168.1.10:9443',
                        errorText: error,
                        suffixIcon: const Icon(Icons.dns),
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
                          child: const Text('Simpan'),
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
  }

  Widget _serverIcon(ColorScheme cs) {
    if (_savedServer == null) return const Icon(Icons.dns, size: 16);
    if (_checking || _online == null) {
      return const SizedBox(
        width: 12,
        height: 12,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    }
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: _online! ? cs.tertiary : cs.error,
      ),
    );
  }

  Widget _serverLabel() {
    final url = _savedServer;
    if (url == null) return const Text('SERVER BELUM DIATUR');
    final suffix = _checking || _online == null
        ? ' • Memeriksa'
        : (_online! ? ' • Online' : ' • Offline');
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Flexible(
          child: Text(url, overflow: TextOverflow.ellipsis),
        ),
        Text(suffix),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: MediaQuery.sizeOf(context).height -
                  MediaQuery.paddingOf(context).top -
                  MediaQuery.paddingOf(context).bottom,
            ),
            child: IntrinsicHeight(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 48),
                  Align(
                    alignment: Alignment.centerRight,
                    child: ValueListenableBuilder<ThemeMode>(
                      valueListenable: themeModeNotifier,
                      builder: (context, mode, _) {
                        return IconButton(
                          onPressed: toggleTheme,
                          icon: Icon(
                            mode == ThemeMode.dark
                                ? Icons.light_mode
                                : Icons.dark_mode,
                          ),
                          tooltip: 'Ganti tema',
                        );
                      },
                    ),
                  ),
                  SvgPicture.asset(
                    dark
                        ? 'assets/logo/volta-wordmark-white.svg'
                        : 'assets/logo/volta-wordmark.svg',
                    width: 220,
                    semanticsLabel: 'VOLTA.',
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Pantau dan kontrol device ESP32 dari HP.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: cs.onSurface.withValues(alpha: 0.7),
                        ),
                  ),
                  const SizedBox(height: 48),
                  TextField(
                    controller: _email,
                    focusNode: _emailNode,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    onSubmitted: (_) => _passwordNode.requestFocus(),
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      hintText: 'nama@contoh.com',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _password,
                    focusNode: _passwordNode,
                    obscureText: true,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _passwordNode.unfocus(),
                    decoration: const InputDecoration(
                      labelText: 'Password',
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _busy
                          ? null
                          : () async {
                              var server = _savedServer;
                              server ??= await _askServer();
                              if (server == null || !mounted) return;
                              await _doLogin(server);
                            },
                      child: _busy
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Masuk'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Center(
                    child: TextButton(
                      onPressed: _busy
                          ? null
                          : () async {
                              var server = _savedServer;
                              server ??= await _askServer();
                              if (server == null || !mounted) return;
                              await _doRegister(server);
                            },
                      child: const Text('Buat akun baru'),
                    ),
                  ),
                  const Spacer(),
                  Center(
                    child: TextButton.icon(
                      onPressed: () async {
                        await _askServer();
                        await _checkServer();
                      },
                      icon: _serverIcon(Theme.of(context).colorScheme),
                      label: _serverLabel(),
                      style: TextButton.styleFrom(
                        textStyle: Theme.of(context).textTheme.labelSmall,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
