import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;

class NetworkUtils {
  static final Connectivity _connectivity = Connectivity();

  static Future<bool> hasInternetConnection() async {
    if (kIsWeb) return true; // Always return true for web platform
    
    try {
      final result = await _connectivity.checkConnectivity();
      if (result == ConnectivityResult.none) return false;

      // Additional check for actual internet connection
      final response = await http.get(Uri.parse('https://google.com'))
          .timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (e) {
      return false; // Return false if any check fails
    }
  }

  static Stream<ConnectivityResult> get onConnectivityChanged {
    if (kIsWeb) {
      // Return a stream that never emits offline state for web
      return Stream.value(ConnectivityResult.wifi);
    }
    
    // For newer versions of connectivity_plus that return List<ConnectivityResult>
    return _connectivity.onConnectivityChanged.asyncMap((results) async {
      // If we have no connectivity results, return none
      if (results.isEmpty) return ConnectivityResult.none;
      
      // If any result is not 'none', we consider it as connected
      if (results.any((result) => result != ConnectivityResult.none)) {
        // Try to verify actual internet connection
        try {
          final response = await http.get(Uri.parse('https://google.com'))
              .timeout(const Duration(seconds: 5));
          if (response.statusCode == 200) {
            return results.first; // Return the first non-none result
          }
        } catch (_) {
          // If verification fails, continue to return none
        }
      }
      
      return ConnectivityResult.none;
    });
  }
} 