import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:feluda_ai/services/permission_service.dart';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:cross_file/cross_file.dart';
import 'package:flutter/material.dart';

class FilePickerService {
  final PermissionService _permissionService = PermissionService();
  
  static const List<String> _supportedExtensions = [
    'jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'txt'
  ];

  Future<XFile?> pickFile({BuildContext? context}) async {
    try {
      // For web, use FilePicker directly
      if (kIsWeb) {
        return await _pickFileWeb();
      }

      // For mobile platforms, check permissions first
      final hasPermission = await _permissionService.requestStoragePermission();
      if (!hasPermission) {
        if (context != null) {
          _showPermissionDeniedDialog(context);
        }
        return null;
      }

      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: _supportedExtensions,
        allowMultiple: false,
      );

      if (result != null && result.files.isNotEmpty && result.files.first.path != null) {
        return XFile(result.files.first.path!);
      }
      
      return null;
    } catch (e) {
      debugPrint('Error picking file: $e');
      if (context != null) {
        _showErrorDialog(context, e.toString());
      }
      return null;
    }
  }

  Future<XFile?> _pickFileWeb() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: _supportedExtensions,
      allowMultiple: false,
      withData: true,
    );

    if (result != null && result.files.isNotEmpty && result.files.first.bytes != null) {
      return XFile.fromData(
        result.files.first.bytes!,
        name: result.files.first.name,
        mimeType: _getMimeType(result.files.first.extension ?? ''),
      );
    }
    return null;
  }

  void _showPermissionDeniedDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Permission Required'),
        content: const Text(
          'Storage permission is required to pick files. Please grant the permission in app settings.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await _permissionService.openSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  void _showErrorDialog(BuildContext context, String error) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Error'),
        content: Text(error),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  bool isFileSupported(String fileName) {
    final extension = fileName.split('.').last.toLowerCase();
    return _supportedExtensions.contains(extension);
  }

  Future<void> validateFile(XFile file) async {
    if (!isFileSupported(file.name)) {
      throw Exception('Unsupported file type. Please select a valid file type: ${_supportedExtensions.join(", ")}');
    }

    final fileSize = await file.length();
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxSize) {
      throw Exception('File size exceeds 10MB limit');
    }
  }

  String _getMimeType(String extension) {
    switch (extension.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'pdf':
        return 'application/pdf';
      case 'doc':
      case 'docx':
        return 'application/msword';
      case 'txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  }
} 