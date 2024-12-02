import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:feluda_ai/utils/env.dart';

class PromptEnhancementService {
  static final PromptEnhancementService _instance = PromptEnhancementService._internal();
  factory PromptEnhancementService() => _instance;
  PromptEnhancementService._internal();

  String _getStyleSpecificSystemPrompt(String styleType, String size) {
    // Get composition guidance based on size
    String compositionGuide = '';
    switch (size) {
      case '1024x1792':
        compositionGuide = 'vertical composition, portrait orientation';
        break;
      case '1792x1024':
        compositionGuide = 'horizontal composition, landscape orientation';
        break;
      default: // 1024x1024
        compositionGuide = 'balanced square composition';
    }

    // Base system prompt
    String basePrompt = 'You are an expert at writing prompts for AI image generation. '
        'Your task is to enhance the given prompt while maintaining the specific style and composition requirements. '
        'Follow these guidelines:\n'
        '- Keep the core subject/idea from the original prompt\n'
        '- Make the prompt detailed but concise (max 200 words)\n'
        '- Consider the $compositionGuide\n'
        '- IMPORTANT: Respond ONLY with the enhanced prompt text\n'
        '- Do NOT include any explanatory text, prefixes, or suffixes\n'
        '- Do NOT include phrases like "Enhanced prompt:" or "This prompt provides..."\n'
        'Do not include negative prompts or technical parameters - only enhance the descriptive content.';

    // Add style-specific guidance
    switch (styleType) {
      case 'photo-realism':
        return '$basePrompt\n'
            'Focus on photorealistic details:\n'
            '- Add specific lighting and atmosphere details\n'
            '- Include technical photography terms\n'
            '- Emphasize realistic textures and materials\n'
            '- Consider natural lighting conditions';
      case 'comic':
        return '$basePrompt\n'
            'Focus on comic book style:\n'
            '- Emphasize dynamic poses and expressions\n'
            '- Consider panel-like composition\n'
            '- Include comic-specific lighting effects\n'
            '- Think about bold colors and strong contrasts';
      case 'oil-painting':
        return '$basePrompt\n'
            'Focus on oil painting characteristics:\n'
            '- Consider brush stroke descriptions\n'
            '- Think about classical painting composition\n'
            '- Include color palette suggestions\n'
            '- Emphasize texture and layering';
      case 'digital-art':
        return '$basePrompt\n'
            'Focus on illustration style:\n'
            '- Consider modern digital art techniques\n'
            '- Think about stylized elements\n'
            '- Include design principles\n'
            '- Emphasize artistic interpretation';
      default:
        return basePrompt;
    }
  }

  Future<String> enhancePrompt({
    required String prompt,
    required String styleType,
    required String size,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('https://api.groq.com/openai/v1/chat/completions'),
        headers: {
          'Authorization': 'Bearer ${Env.groqApiKey}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'model': 'llama-3.2-11b-vision-preview',
          'messages': [
            {
              'role': 'system',
              'content': _getStyleSpecificSystemPrompt(styleType, size),
            },
            {
              'role': 'user',
              'content': prompt,
            },
          ],
          'temperature': 0.7,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to enhance prompt: ${response.body}');
      }

      final data = jsonDecode(response.body);
      String enhancedPrompt = data['choices'][0]['message']['content'].toString().trim();

      // Clean up prefixes
      if (enhancedPrompt.toLowerCase().startsWith('enhanced prompt:')) {
        enhancedPrompt = enhancedPrompt.substring('enhanced prompt:'.length);
      } else if (enhancedPrompt.toLowerCase().startsWith('enhance the prompt:')) {
        enhancedPrompt = enhancedPrompt.substring('enhance the prompt:'.length);
      } else if (enhancedPrompt.toLowerCase().startsWith('this prompt:')) {
        enhancedPrompt = enhancedPrompt.substring('this prompt:'.length);
      } else if (enhancedPrompt.toLowerCase().startsWith("here's the enhanced prompt:")) {
        enhancedPrompt = enhancedPrompt.substring("here's the enhanced prompt:".length);
      }

      // Remove quotes
      if (enhancedPrompt.startsWith('"') || enhancedPrompt.startsWith("'")) {
        enhancedPrompt = enhancedPrompt.substring(1);
      }
      if (enhancedPrompt.endsWith('"') || enhancedPrompt.endsWith("'")) {
        enhancedPrompt = enhancedPrompt.substring(0, enhancedPrompt.length - 1);
      }

      // Remove suffixes
      final suffixes = [
        'this enhanced prompt provides',
        'this description provides',
      ];
      for (final suffix in suffixes) {
        final index = enhancedPrompt.toLowerCase().indexOf(suffix);
        if (index != -1) {
          enhancedPrompt = enhancedPrompt.substring(0, index);
        }
      }

      return enhancedPrompt.trim();
    } catch (e) {
      throw Exception('Error enhancing prompt: $e');
    }
  }
} 