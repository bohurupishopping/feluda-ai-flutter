import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:feluda_ai/models/ai_model.dart';
import 'package:feluda_ai/utils/constants.dart';
import 'package:cross_file/cross_file.dart';

class VisionApiService {
  static const String _geminiVisionUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  Future<String> analyzeFile({
    required XFile file,
    required String prompt,
    required AIModel model,
    String? systemPrompt,
  }) async {
    try {
      // Read file as bytes
      final bytes = await file.readAsBytes();
      final base64Image = base64Encode(bytes);
      final mimeType = file.mimeType ?? _getMimeType(file.name);

      final url = Uri.parse('$_geminiVisionUrl/${model.id}:generateContent?key=${Constants.googleApiKey}');

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'contents': [
            {
              'role': 'user',
              'parts': [
                if (systemPrompt != null)
                  {'text': systemPrompt},
                {
                  'inline_data': {
                    'mime_type': mimeType,
                    'data': base64Image
                  }
                },
                {'text': prompt}
              ]
            }
          ],
          'generationConfig': {
            'temperature': model.temperature,
            'topP': model.topP,
            'maxOutputTokens': model.maxTokens,
          },
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['candidates'][0]['content']['parts'][0]['text'] as String;
      } else {
        throw Exception('Failed to analyze file: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error analyzing file: $e');
    }
  }

  String _getMimeType(String filePath) {
    final extension = filePath.split('.').last.toLowerCase();
    switch (extension) {
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