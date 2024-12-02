import 'dart:typed_data';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import 'package:feluda_ai/utils/env.dart';

// Move StylePrompt class to top level
class StylePrompt {
  final String prompt;
  final String negativePrompt;
  final int steps;
  final double guidanceScale;

  StylePrompt({
    required this.prompt,
    required this.negativePrompt,
    required this.steps,
    required this.guidanceScale,
  });
}

// Enhanced negative prompt for better results
const String _enhancedNegativePrompt = 
  'cartoon, anime, illustration, painting, drawing, art, '
  'low quality, low resolution, blurry, noisy, grainy, '
  'oversaturated, overexposed, underexposed, '
  'deformed, distorted, disfigured, '
  'watermark, signature, text, logo, '
  'bad anatomy, bad proportions, amateur, unprofessional, '
  'wrong aspect ratio, stretched image, poorly cropped, '
  'without face tattoo, without text, without design on t-shirt, '
  'flat lighting, awkward poses, lack of emotion, unclear symbolism, '
  'generic patterns, bland textures, messy composition, pixelation';

class ImageSession {
  final String id;
  final String sessionId;
  final String prompt;
  final String imageUrl;
  final String? storagePath;
  final String? negativePrompt;
  final String? userId;
  final DateTime timestamp;

  ImageSession({
    required this.id,
    required this.sessionId,
    required this.prompt,
    required this.imageUrl,
    this.storagePath,
    this.negativePrompt,
    this.userId,
    required this.timestamp,
  });

  factory ImageSession.fromJson(Map<String, dynamic> json) {
    return ImageSession(
      id: json['id'],
      sessionId: json['session_id'],
      prompt: json['prompt'],
      imageUrl: json['image_url'],
      storagePath: json['storage_path'],
      negativePrompt: json['negative_prompt'],
      userId: json['user_id'],
      timestamp: DateTime.parse(json['timestamp']),
    );
  }
}

class ImageService {
  static final ImageService _instance = ImageService._internal();
  factory ImageService() => _instance;
  ImageService._internal();

  final _supabase = Supabase.instance.client;
  final _uuid = const Uuid();
  final _baseUrl = Env.togetherApiBaseUrl;

  static const String _storageBucket = 'ai-generated-images';

  Future<String> generateAndSaveImage({
    required String prompt,
    required String model,
    required String size,
    String? negativePrompt,
  }) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) throw Exception('User not authenticated');

      final sessionId = _uuid.v4();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final storagePath = 'generated/$sessionId-$timestamp.png';

      // Get style-specific prompt configuration
      final stylePrompt = _getStyleSpecificPrompt(
        prompt, 
        negativePrompt, 
        size,
      );

      // Combine negative prompts for better results
      final combinedNegativePrompt = [
        stylePrompt.negativePrompt,
        _enhancedNegativePrompt,
        negativePrompt,
      ].where((prompt) => prompt != null && prompt.isNotEmpty).join(', ');

      // Generate image using Together API
      final response = await http.post(
        Uri.parse('$_baseUrl/images/generations'),
        headers: {
          'Authorization': 'Bearer ${Env.togetherApiKey}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'model': model,
          'prompt': stylePrompt.prompt,
          'negative_prompt': combinedNegativePrompt,
          'n': 1,
          'size': size,
          'num_inference_steps': stylePrompt.steps,
          'guidance_scale': stylePrompt.guidanceScale,
          'seed': timestamp % 2147483647,
          'max_sequence_length': 256,
          'num_images_per_prompt': 1,
          'response_format': 'base64',
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to generate image: ${response.body}');
      }

      final data = jsonDecode(response.body);
      if (data['data'] == null || data['data'].isEmpty) {
        throw Exception('No image generated');
      }

      // Get base64 image data and convert to bytes
      final base64Image = data['data'][0]['b64_json'] as String;
      final imageBytes = base64Decode(base64Image);

      // Upload to Supabase storage with proper options
      await _supabase
          .storage
          .from(_storageBucket)
          .uploadBinary(
            storagePath,
            Uint8List.fromList(imageBytes),
            fileOptions: const FileOptions(
              contentType: 'image/png',
              cacheControl: '3600',
              upsert: false,
            ),
          );

      // Get the public URL using the correct bucket
      final publicUrl = _supabase
          .storage
          .from(_storageBucket)
          .getPublicUrl(storagePath);

      // Save metadata to database
      await _supabase.from('image_history').insert({
        'session_id': sessionId,
        'prompt': prompt,
        'image_url': publicUrl,
        'storage_path': storagePath,
        'negative_prompt': negativePrompt,
        'user_id': user.id,
        'timestamp': DateTime.now().toIso8601String(),
      });

      return publicUrl;
    } catch (e) {
      throw Exception('Error generating and saving image: $e');
    }
  }

  Future<List<ImageSession>> getImageHistory() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) return [];

      final response = await _supabase
          .from('image_history')
          .select()
          .eq('user_id', user.id)
          .order('timestamp', ascending: false);

      return (response as List)
          .map((data) => ImageSession.fromJson(data))
          .toList();
    } catch (e) {
      throw Exception('Error fetching image history: $e');
    }
  }

  Future<void> deleteImage(String id) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) throw Exception('User not authenticated');
      
      // Get storage path
      final response = await _supabase
          .from('image_history')
          .select('storage_path')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

      // Delete from storage if path exists
      if (response['storage_path'] != null) {
        try {
          await _supabase
              .storage
              .from(_storageBucket)
              .remove([response['storage_path']]);
        } catch (e) {
          throw Exception('Failed to delete from storage: $e');
        }
      }

      // Delete from database
      await _supabase
          .from('image_history')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
    } catch (e) {
      throw Exception('Error deleting image: $e');
    }
  }

  StylePrompt _getStyleSpecificPrompt(String prompt, String? stylePrompt, String size) {
    // Base negative prompt
    const baseNegativePrompt = 'low quality, low resolution, blurry, noisy, grainy, '
        'oversaturated, overexposed, underexposed, deformed, distorted, disfigured, '
        'watermark, signature, text, logo, bad anatomy, bad proportions, amateur, unprofessional';

    // Get composition guidance based on size
    String compositionGuide = '';
    switch (size) {
      case '1024x1792':
        compositionGuide = 'vertical composition, portrait orientation, full body shot, strong vertical lines, elegant vertical framing';
        break;
      case '1792x1024':
        compositionGuide = 'horizontal composition, landscape orientation, panoramic view, wide angle perspective, cinematic aspect ratio';
        break;
      default: // 1024x1024
        compositionGuide = 'balanced square composition, centered framing, symmetrical arrangement';
    }

    // Get style type safely
    final style = stylePrompt?.toLowerCase() ?? '';

    // Handle different styles
    if (style.isNotEmpty) {
      if (style.contains('comic')) {
        return StylePrompt(
          prompt: '$prompt, comic book style, vibrant colors, bold lines, dynamic composition, '
              'comic book illustration, detailed linework, cel shading, $compositionGuide',
          negativePrompt: '$baseNegativePrompt, realistic, photorealistic, 3d render, photograph',
          steps: 35,
          guidanceScale: 8.0,
        );
      } else if (style.contains('oil painting')) {
        return StylePrompt(
          prompt: '$prompt, oil painting masterpiece, traditional art, detailed brushstrokes, '
              'rich colors, impasto technique, canvas texture, classical painting style, $compositionGuide',
          negativePrompt: '$baseNegativePrompt, digital art, 3d render, photograph, comic',
          steps: 40,
          guidanceScale: 7.5,
        );
      } else if (style.contains('digital art')) {
        return StylePrompt(
          prompt: '$prompt, digital art masterpiece, professional illustration, detailed artwork, '
              'vibrant colors, clean lines, modern illustration style, $compositionGuide',
          negativePrompt: '$baseNegativePrompt, traditional art, oil painting, photograph, realistic',
          steps: 30,
          guidanceScale: 7.0,
        );
      }
    }

    // Photo realism (default)
    return StylePrompt(
      prompt: '$prompt, (photorealistic:1.4), (hyperrealistic:1.3), masterpiece, '
          'professional photography, 8k resolution, highly detailed, sharp focus, HDR, '
          'cinematic lighting, volumetric lighting, $compositionGuide',
      negativePrompt: '$baseNegativePrompt, cartoon, anime, illustration, painting',
      steps: 45,
      guidanceScale: 7.5,
    );
  }
} 