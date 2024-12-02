import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:feluda_ai/utils/constants.dart';
import 'package:feluda_ai/models/ai_model.dart';
import 'package:feluda_ai/services/chat_logic_service.dart';

class ApiService {
  static const String _baseUrl = 'https://openrouter.ai/api/v1';
  
  Future<String> getChatCompletion(
    String message,
    List<Map<String, String>> previousMessages, {
    required AIModel model,
  }) async {
    try {
      // Build contextual prompt
      final contextualPrompt = ChatLogicService.buildContextualPrompt(
        message, 
        previousMessages,
      );

      final response = await http.post(
        Uri.parse('$_baseUrl/chat/completions'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${Constants.openRouterApiKey}',
          'HTTP-Referer': 'app://feluda.ai',
          'X-Title': 'Feluda AI',
        },
        body: jsonEncode({
          'model': model.id,
          'messages': [
            ...previousMessages,
            {'role': 'user', 'content': contextualPrompt},
          ],
          'max_tokens': model.maxTokens,
          'temperature': model.temperature,
          'top_p': model.topP,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final aiResponse = data['choices'][0]['message']['content'] as String;
        
        // Handle model queries and format response
        return ChatLogicService.handleModelQuery(aiResponse, model);
      } else {
        throw Exception('Failed to get response: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error getting chat completion: $e');
    }
  }
} 