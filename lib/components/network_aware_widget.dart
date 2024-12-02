import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:feluda_ai/utils/network_utils.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class NetworkAwareWidget extends StatefulWidget {
  final Widget child;
  final Widget? offlineWidget;

  const NetworkAwareWidget({
    super.key,
    required this.child,
    this.offlineWidget,
  });

  @override
  State<NetworkAwareWidget> createState() => _NetworkAwareWidgetState();
}

class _NetworkAwareWidgetState extends State<NetworkAwareWidget> {
  late Future<bool> _connectionStatus;

  @override
  void initState() {
    super.initState();
    _connectionStatus = NetworkUtils.hasInternetConnection();
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) return widget.child;

    return FutureBuilder<bool>(
      future: _connectionStatus,
      builder: (context, snapshot) {
        return StreamBuilder<ConnectivityResult>(
          stream: NetworkUtils.onConnectivityChanged,
          builder: (context, streamSnapshot) {
            final isOffline = streamSnapshot.data == ConnectivityResult.none ||
                            (snapshot.hasData && !snapshot.data!);

            if (isOffline) {
              return widget.offlineWidget ?? 
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.wifi_off, size: 48),
                      const SizedBox(height: 16),
                      const Text('No Internet Connection'),
                      const SizedBox(height: 8),
                      ElevatedButton(
                        onPressed: () async {
                          setState(() {
                            _connectionStatus = NetworkUtils.hasInternetConnection();
                          });
                          final hasInternet = await NetworkUtils.hasInternetConnection();
                          if (hasInternet && mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Connected to internet')),
                            );
                          }
                        },
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                );
            }
            return widget.child;
          },
        );
      },
    );
  }
} 