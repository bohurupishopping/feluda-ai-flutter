class Env {
  static const String togetherApiKey = String.fromEnvironment(
    'TOGETHER_API_KEY',
    defaultValue: '67a253d84efa8baeadbdb0f64a1d8906979889fabf4069e7bc7ee1f34a5d4361',
  );

  static const String togetherApiBaseUrl = 'https://api.together.xyz/v1';

  static const String groqApiKey = String.fromEnvironment(
    'GROQ_API_KEY',
    defaultValue: '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',
  );
} 