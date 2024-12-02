import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class NetworkUtils {
  static final Connectivity _connectivity = Connectivity();

  static Future<bool> hasInternetConnection() async {
    if (kIsWeb) return true; // Always return true for web platform
    
    try {
      final result = await _connectivity.checkConnectivity();
      return result != ConnectivityResult.none;
    } catch (e) {
      return true; // Default to true if check fails
    }
  }

  static Stream<ConnectivityResult> get onConnectivityChanged {
    if (kIsWeb) {
      // Return a stream that never emits offline state for web
      return Stream.value(ConnectivityResult.wifi);
    }
    return _connectivity.onConnectivityChanged;
  }
} 