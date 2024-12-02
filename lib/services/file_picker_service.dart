import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:feluda_ai/services/permission_service.dart';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:cross_file/cross_file.dart';

class FilePickerService {
  final PermissionService _permissionService = PermissionService();
  
  static const List<String> _supportedExtensions = [
    'jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'txt'
  ];

  Future<XFile?> pickFile() async {
    try {
      // For web, use FilePicker directly
      if (kIsWeb) {
        final result = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: _supportedExtensions,
          allowMultiple: false,
          withData: true,
        );

        if (result != null && result.files.isNotEmpty) {
          final file = result.files.first;
          if (file.bytes != null) {
            return XFile.fromData(
              file.bytes!,
              name: file.name,
              mimeType: _getMimeType(file.extension ?? ''),
            );
          }
        }
        return null;
      }

      // For mobile platforms
      if (!kIsWeb) {
        final hasPermission = await _permissionService.requestStoragePermission();
        if (!hasPermission) {
          throw Exception('Storage permission denied');
        }
      }

      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: _supportedExtensions,
        allowMultiple: false,
        withData: kIsWeb,
      );

      if (result != null && result.files.isNotEmpty) {
        final pickedFile = result.files.first;
        
        // For web platform
        if (kIsWeb && pickedFile.bytes != null) {
          return XFile.fromData(
            pickedFile.bytes!,
            name: pickedFile.name,
            mimeType: _getMimeType(pickedFile.extension ?? ''),
          );
        }
        
        // For mobile platforms
        if (!kIsWeb && pickedFile.path != null) {
          return XFile(pickedFile.path!);
        }
      }
      
      return null;
    } catch (e) {
      debugPrint('Error picking file: $e');
      throw Exception('Error picking file: $e');
    }
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