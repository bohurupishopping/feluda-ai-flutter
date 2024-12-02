import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/foundation.dart';

class PermissionService {
  Future<bool> requestStoragePermission() async {
    if (kIsWeb) return true;
    
    // For Android 13 and above
    if (await Permission.photos.request().isGranted &&
        await Permission.videos.request().isGranted &&
        await Permission.audio.request().isGranted) {
      return true;
    }

    // For Android 12 and below
    if (await Permission.storage.request().isGranted) {
      return true;
    }

    // If permissions are permanently denied, suggest app settings
    if (await Permission.storage.isPermanentlyDenied ||
        await Permission.photos.isPermanentlyDenied ||
        await Permission.videos.isPermanentlyDenied ||
        await Permission.audio.isPermanentlyDenied) {
      // Open settings and return false to indicate permission not granted
      await openAppSettings();
      return false;
    }

    return false;
  }

  Future<bool> requestCameraPermission() async {
    if (kIsWeb) return true;

    final status = await Permission.camera.request();
    if (status.isPermanentlyDenied) {
      // Open settings and return false to indicate permission not granted
      await openAppSettings();
      return false;
    }
    return status.isGranted;
  }

  Future<Map<Permission, PermissionStatus>> requestAllPermissions() async {
    if (kIsWeb) {
      return {
        Permission.storage: PermissionStatus.granted,
        Permission.camera: PermissionStatus.granted,
      };
    }

    return await [
      Permission.storage,
      Permission.photos,
      Permission.videos,
      Permission.audio,
      Permission.camera,
    ].request();
  }

  Future<bool> checkStoragePermission() async {
    if (kIsWeb) return true;

    // For Android 13 and above
    if (await Permission.photos.isGranted &&
        await Permission.videos.isGranted &&
        await Permission.audio.isGranted) {
      return true;
    }

    // For Android 12 and below
    return await Permission.storage.isGranted;
  }

  Future<bool> checkCameraPermission() async {
    if (kIsWeb) return true;
    return await Permission.camera.isGranted;
  }

  Future<bool> openSettings() async {
    return await openAppSettings();
  }
} 