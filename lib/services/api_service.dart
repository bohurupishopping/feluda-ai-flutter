import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:feluda_ai/utils/constants.dart';

class ApiService {
  static const String _baseUrl = 'https://openrouter.ai/api/v1';
  
  Future<String> getChatCompletion(String message, List<Map<String, String>> previousMessages) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/chat/completions'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${Constants.openRouterApiKey}',
          'HTTP-Referer': 'app://feluda.ai',
          'X-Title': 'Feluda AI',
        },
        body: jsonEncode({
          'model': 'meta-llama/llama-3.2-11b-vision-instruct:free',
          'messages': [
            ...previousMessages,
            {'role': 'user', 'content': message},
          ],
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['choices'][0]['message']['content'];
      } else {
        throw Exception('Failed to get response: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error getting chat completion: $e');
    }
  }
} 