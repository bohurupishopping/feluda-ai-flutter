import 'package:permission_handler/permission_handler.dart';

class PermissionService {
  Future<bool> requestStoragePermission() async {
    final status = await Permission.storage.request();
    return status.isGranted;
  }

  Future<bool> requestCameraPermission() async {
    final status = await Permission.camera.request();
    return status.isGranted;
  }

  Future<Map<Permission, PermissionStatus>> requestAllPermissions() async {
    return await [
      Permission.storage,
      Permission.camera,
    ].request();
  }

  Future<bool> checkStoragePermission() async {
    return await Permission.storage.status.isGranted;
  }

  Future<bool> checkCameraPermission() async {
    return await Permission.camera.status.isGranted;
  }

  Future<void> openAppSettings() async {
    await openAppSettings();
  }
} 