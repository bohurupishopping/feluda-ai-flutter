class AIModel {
  final String id;
  final String name;
  final String provider;
  final int maxTokens;
  final double temperature;
  final double topP;

  const AIModel({
    required this.id,
    required this.name,
    required this.provider,
    this.maxTokens = 8192,
    this.temperature = 0.7,
    this.topP = 0.95,
  });
}

class AIModels {
  static const List<AIModel> models = [
    AIModel(
      id: 'meta-llama/llama-3.2-90b-vision-instruct:free',
      name: 'Llama 90B',
      provider: 'OpenRouter',
      maxTokens: 8192,
    ),
    AIModel(
      id: 'meta-llama/llama-3.2-11b-vision-instruct:free',
      name: 'Llama 11B',
      provider: 'OpenRouter',
      maxTokens: 8192,
    ),
  ];

  static AIModel getDefaultModel() {
    return models.first;
  }

  static AIModel? getModelById(String id) {
    try {
      return models.firstWhere((model) => model.id == id);
    } catch (e) {
      return null;
    }
  }
} 