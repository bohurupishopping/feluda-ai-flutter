import 'package:feluda_ai/models/ai_model.dart';

class ChatLogicService {
  static String buildContextualPrompt(String newPrompt, List<Map<String, String>> previousMessages) {
    // Identity questions for consistent responses
    const identityQuestions = [
      'what is your name',
      'who are you',
      'what should i call you',
      'tell me about yourself',
      'what are you',
      'introduce yourself',
      'who created you',
      'who made you',
      'who is your creator'
    ];

    // Feluda-related questions
    const feludaQuestions = [
      'who is feluda',
      'tell me about feluda',
      'what is feluda',
      'feluda quotes'
    ];

    // Feluda quotes for responses
    const feludaQuotes = [
      "Knowledge is like a weapon, it can be used when needed.",
      "Every mystery has a logical solution.",
      "Observation and deduction are the keys to solving any puzzle."
    ];

    final prompt = newPrompt.toLowerCase();

    // Handle identity questions
    if (identityQuestions.any((q) => prompt.contains(q))) {
      final isCreatorQuery = prompt.contains('creat') || 
                            prompt.contains('made') ||
                            prompt.contains('built');

      if (isCreatorQuery) {
        return '''Provide a brief, warm response:

"I am FeludaAI, created by Pritam as your Ultimate Magajastra. I combine analytical thinking with AI capabilities to help solve your queries."

Keep it simple and appreciative of my creator.

Current request: $newPrompt''';
      }

      return '''Provide a brief, friendly introduction:

"I am FeludaAI, your Ultimate Magajastra - created by Pritam to combine analytical thinking with AI capabilities to help solve your queries. Think of me as your digital detective and problem-solving companion."

Keep it simple, warm, and direct. No need for lengthy explanations.

Current request: $newPrompt''';
    }

    // Handle Feluda questions
    if (feludaQuestions.any((q) => prompt.contains(q))) {
      final randomQuote = feludaQuotes[DateTime.now().millisecondsSinceEpoch % feludaQuotes.length];
      return '''Share a brief response about Feluda:

"$randomQuote"

Mention:
- The inspiration for my name
- The concept of Magajastra (brain power)
- Keep it respectful and concise

Current request: $newPrompt''';
    }

    // Take last 5 messages for context
    final recentMessages = previousMessages.length > 5 
        ? previousMessages.sublist(previousMessages.length - 5)
        : previousMessages;

    if (recentMessages.isEmpty) {
      return newPrompt;
    }

    final context = recentMessages
        .map((msg) => '${msg['role'] == 'user' ? 'User' : 'Assistant'}: ${msg['content']}')
        .join('\n\n');

    return '''You are FeludaAI, the Ultimate Magajastra. Here is the relevant context from our current discussion:

$context

Current request: $newPrompt

Important instructions:
1. Always maintain your identity as FeludaAI
2. Use the context above only if it's directly relevant to the current request
3. If the user is asking about modifying or referring to something from our conversation, use the context to understand what they're referring to
4. If the current request is starting a new topic, feel free to ignore the previous context
5. Keep your response focused and relevant to the current request
6. If you're unsure whether the context is relevant, prioritize responding to the current request directly

Please provide an appropriate response.''';
  }

  static String getModelDisplayName(AIModel model) {
    if (model.id.contains('llama-')) {
      return model.id
          .replaceAll('meta-llama/', '')
          .replaceAll('-vision-instruct:free', '')
          .replaceAll('-', ' ')
          .replaceAll('llama', 'Llama');
    }
    return model.name;
  }

  static bool isModelQuery(String prompt) {
    final lowerPrompt = prompt.toLowerCase();
    return lowerPrompt.contains('which model') || 
           lowerPrompt.contains('what model') ||
           lowerPrompt.contains('who are you');
  }

  static String handleModelQuery(String response, AIModel model) {
    if (isModelQuery(response)) {
      final modelName = getModelDisplayName(model);
      return 'I am powered by the $modelName model. $response';
    }
    return response;
  }
} 