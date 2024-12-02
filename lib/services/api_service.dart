import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:feluda_ai/utils/constants.dart';
import 'package:feluda_ai/models/ai_model.dart';
import 'package:feluda_ai/services/chat_logic_service.dart';

class ApiService {
  static const String _openRouterBaseUrl = 'https://openrouter.ai/api/v1';
  static const String _geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  static const String _groqBaseUrl = 'https://api.groq.com/openai/v1';

  Future<String> getChatCompletion(
    String message,
    List<Map<String, String>> previousMessages, {
    required AIModel model,
  }) async {
    try {
      final contextualPrompt = ChatLogicService.buildContextualPrompt(
        message, 
        previousMessages,
      );

      switch (model.provider) {
        case 'Google':
          return await _getGeminiCompletion(
            contextualPrompt,
            previousMessages,
            model,
          );
        case 'Groq':
          return await _getGroqCompletion(
            contextualPrompt,
            previousMessages,
            model,
          );
        default:
          return await _getOpenRouterCompletion(
            contextualPrompt,
            previousMessages,
            model,
          );
      }
    } catch (e) {
      throw Exception('Error getting chat completion: $e');
    }
  }

  Future<String> _getGeminiCompletion(
    String prompt,
    List<Map<String, String>> previousMessages,
    AIModel model,
  ) async {
    final url = Uri.parse('$_geminiBaseUrl/models/${model.id}:generateContent?key=${Constants.googleApiKey}');

    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'contents': [
          {
            'role': 'user',
            'parts': [{'text': prompt}],
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
      final aiResponse = data['candidates'][0]['content']['parts'][0]['text'] as String;
      return ChatLogicService.handleModelQuery(aiResponse, model);
    } else {
      throw Exception('Failed to get Gemini response: ${response.statusCode}');
    }
  }

  Future<String> _getOpenRouterCompletion(
    String prompt,
    List<Map<String, String>> previousMessages,
    AIModel model,
  ) async {
    final response = await http.post(
      Uri.parse('$_openRouterBaseUrl/chat/completions'),
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
          {'role': 'user', 'content': prompt},
        ],
        'max_tokens': model.maxTokens,
        'temperature': model.temperature,
        'top_p': model.topP,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final aiResponse = data['choices'][0]['message']['content'] as String;
      return ChatLogicService.handleModelQuery(aiResponse, model);
    } else {
      throw Exception('Failed to get OpenRouter response: ${response.statusCode}');
    }
  }

  Future<String> _getGroqCompletion(
    String prompt,
    List<Map<String, String>> previousMessages,
    AIModel model,
  ) async {
    final response = await http.post(
      Uri.parse('$_groqBaseUrl/chat/completions'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${Constants.groqApiKey}',
      },
      body: jsonEncode({
        'model': model.id,
        'messages': [
          ...previousMessages,
          {'role': 'user', 'content': prompt},
        ],
        'max_tokens': model.maxTokens,
        'temperature': model.temperature,
        'top_p': model.topP,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final aiResponse = data['choices'][0]['message']['content'] as String;
      return ChatLogicService.handleModelQuery(aiResponse, model);
    } else {
      throw Exception('Failed to get Groq response: ${response.statusCode}');
    }
  }
} 