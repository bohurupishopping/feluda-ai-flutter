class AIModel {
  final String id;
  final String name;
  final String provider;
  final int maxTokens;
  final double temperature;
  final double topP;
  final String? description;
  final String? icon;

  const AIModel({
    required this.id,
    required this.name,
    required this.provider,
    this.maxTokens = 8192,
    this.temperature = 0.7,
    this.topP = 0.95,
    this.description,
    this.icon,
  });
}

class AIModels {
  static const List<AIModel> models = [
    // Gemini Models
    AIModel(
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'Google',
      maxTokens: 1000000,
      temperature: 0.7,
      description: 'Most capable model for text, code, and analysis',
      icon: '🧠',
    ),
    AIModel(
      id: 'gemini-1.5-flash',
      name: 'Gemini Flash',
      provider: 'Google',
      maxTokens: 32768,
      temperature: 0.7,
      description: 'Fast and efficient for most tasks',
      icon: '⚡',
    ),
    AIModel(
      id: 'gemini-exp-1121',
      name: 'Gemini Experimental',
      provider: 'Google',
      maxTokens: 128000,
      temperature: 0.7,
      description: 'Latest experimental features',
      icon: '🔬',
    ),
    // Groq Models
    AIModel(
      id: 'llama-3.2-90b-vision-preview',
      name: 'Llama 90B Vision',
      provider: 'Groq',
      maxTokens: 8192,
      temperature: 0.7,
      description: 'High performance vision model with 90B parameters',
      icon: '👁️',
    ),
    AIModel(
      id: 'llama-3.2-11b-vision-preview',
      name: 'Llama 11B Vision',
      provider: 'Groq',
      maxTokens: 8192,
      temperature: 0.7,
      description: 'Fast vision model with 11B parameters',
      icon: '🔭',
    ),
    // OpenRouter Models
    AIModel(
      id: 'meta-llama/llama-3.2-90b-vision-instruct:free',
      name: 'Llama 90B',
      provider: 'OpenRouter',
      maxTokens: 8192,
      description: 'Advanced model for complex tasks',
      icon: '🦙',
    ),
    AIModel(
      id: 'meta-llama/llama-3.2-11b-vision-instruct:free',
      name: 'Llama 11B',
      provider: 'OpenRouter',
      maxTokens: 8192,
      description: 'Balanced performance and efficiency',
      icon: '🚀',
    ),
  ];

  static AIModel getDefaultModel() {
    return models.first; // Returns Gemini Pro as default
  }

  static AIModel? getModelById(String id) {
    try {
      return models.firstWhere((model) => model.id == id);
    } catch (e) {
      return null;
    }
  }
} 