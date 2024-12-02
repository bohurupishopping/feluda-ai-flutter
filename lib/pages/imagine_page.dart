import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:feluda_ai/utils/theme.dart';
import 'package:feluda_ai/components/app_drawer.dart';
import 'package:feluda_ai/services/api_service.dart';
import 'package:feluda_ai/utils/assets.dart';
import 'package:feluda_ai/services/image_service.dart';
import 'package:feluda_ai/components/imagine/style_selector.dart';
import 'package:feluda_ai/components/imagine/model_selector.dart';
import 'package:feluda_ai/components/imagine/size_selector.dart';
import 'package:feluda_ai/components/imagine/image_history_grid.dart';
import 'package:feluda_ai/components/imagine/image_preview.dart';
import 'package:feluda_ai/services/prompt_enhancement_service.dart';

// Define image size options
enum ImageSize {
  square('1024x1024', 'Square'),
  portrait('1024x1792', 'Portrait'),
  landscape('1792x1024', 'Landscape');

  final String dimensions;
  final String label;
  const ImageSize(this.dimensions, this.label);
}

// Define image style options
enum ImageStyle {
  photoRealism(
    'Photo Realism',
    '(photorealistic:1.4), (hyperrealistic:1.3), masterpiece, professional photography, 8k resolution, highly detailed, sharp focus, HDR, cinematic lighting',
  ),
  comic(
    'Comic Style',
    'comic book style, vibrant colors, bold lines, dynamic composition, comic book illustration, detailed linework, cel shading',
  ),
  oilPainting(
    'Oil Painting',
    'oil painting masterpiece, traditional art, detailed brushstrokes, rich colors, impasto technique, canvas texture, classical painting style',
  ),
  digitalArt(
    'Digital Art',
    'digital art masterpiece, professional illustration, detailed artwork, vibrant colors, clean lines, modern illustration style',
  );

  final String label;
  final String prompt;
  const ImageStyle(this.label, this.prompt);
}

// Define AI models
enum AIModel {
  flux('black-forest-labs/FLUX.1-schnell-Free', 'FLUX.1 Schnell'),
  stableDiffusion('stabilityai/stable-diffusion-xl-base-1.0', 'Stable Diffusion XL');

  final String id;
  final String label;
  const AIModel(this.id, this.label);
}

class ImaginePage extends StatefulWidget {
  const ImaginePage({super.key});

  @override
  State<ImaginePage> createState() => _ImaginePageState();
}

class _ImaginePageState extends State<ImaginePage> {
  final TextEditingController _promptController = TextEditingController();
  final ImageService _imageService = ImageService();
  bool _isGenerating = false;
  bool _isLoading = false;
  ImageSize _selectedSize = ImageSize.square;
  ImageStyle _selectedStyle = ImageStyle.photoRealism;
  AIModel _selectedModel = AIModel.flux;
  ImageSession? _selectedImage;
  List<ImageSession> _imageHistory = [];
  bool _isEnhancing = false;
  final _promptEnhancementService = PromptEnhancementService();

  @override
  void initState() {
    super.initState();
    _loadImageHistory();
  }

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  Future<void> _loadImageHistory() async {
    try {
      setState(() => _isLoading = true);
      final history = await _imageService.getImageHistory();
      setState(() {
        _imageHistory = history;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading images: $e')),
        );
      }
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleDeleteImage(ImageSession image) async {
    try {
      await _imageService.deleteImage(image.id);
      await _loadImageHistory();
      
      if (_selectedImage?.id == image.id) {
        setState(() => _selectedImage = null);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Image deleted successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error deleting image: $e')),
        );
      }
    }
  }

  Future<void> _generateImage() async {
    if (_promptController.text.trim().isEmpty) return;

    setState(() => _isGenerating = true);

    try {
      final imageUrl = await _imageService.generateAndSaveImage(
        prompt: _promptController.text,
        model: _selectedModel.id,
        size: _selectedSize.dimensions,
        negativePrompt: _selectedStyle.prompt,
      );

      await _loadImageHistory();
      _promptController.clear();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Image generated successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error generating image: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isGenerating = false);
      }
    }
  }

  Future<void> _enhancePrompt() async {
    if (_promptController.text.trim().isEmpty) return;

    setState(() => _isEnhancing = true);

    try {
      final enhancedPrompt = await _promptEnhancementService.enhancePrompt(
        prompt: _promptController.text,
        styleType: _selectedStyle.name.toLowerCase(),
        size: _selectedSize.dimensions,
      );

      setState(() {
        _promptController.text = enhancedPrompt;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error enhancing prompt: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isEnhancing = false);
      }
    }
  }

  Widget _buildOptionChip({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 6,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: Colors.grey.withOpacity(0.2),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 5,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: Colors.grey.shade700,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade800,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        flexibleSpace: ClipRRect(
          borderRadius: const BorderRadius.only(
            bottomLeft: Radius.circular(20),
            bottomRight: Radius.circular(20),
          ),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.blue.withOpacity(0.15),
                    Colors.purple.withOpacity(0.05),
                  ],
                ),
                border: Border(
                  bottom: BorderSide(
                    color: Colors.white.withOpacity(0.2),
                    width: 0.5,
                  ),
                ),
              ),
            ),
          ),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(1),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Theme.of(context).primaryColor.withOpacity(0.3),
                  width: 1.5,
                ),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.white.withOpacity(0.8),
                    Colors.white.withOpacity(0.3),
                  ],
                ),
              ),
              child: CircleAvatar(
                radius: 14,
                backgroundImage: AssetImage(Assets.aiIcon),
              ),
            ),
            const SizedBox(width: 10),
            const Text(
              'Imagine',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
      drawer: const AppDrawer(),
      body: Stack(
        children: [
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFFCCEBFC),  // Lighter blue
                  Color(0xFFFFF6F3),  // Lighter peach
                ],
                stops: [0.0, 0.8],
              ),
            ),
            child: Column(
              children: [
                // Image History Grid
                Expanded(
                  child: ImageHistoryGrid(
                    images: _imageHistory,
                    isLoading: _isGenerating,
                    onImageTap: (image) {
                      setState(() {
                        _selectedImage = image;
                      });
                    },
                    onImageDelete: _handleDeleteImage,
                  ),
                ),

                // Input Section
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.95),
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 20,
                        offset: const Offset(0, -5),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Options Row
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _buildOptionChip(
                              icon: Icons.style,
                              label: _selectedStyle.label,
                              onTap: () {
                                showModalBottomSheet(
                                  context: context,
                                  backgroundColor: Colors.transparent,
                                  isScrollControlled: true,
                                  builder: (context) => AnimatedPadding(
                                    padding: MediaQuery.of(context).viewInsets,
                                    duration: const Duration(milliseconds: 100),
                                    child: StyleSelector(
                                      selectedStyle: _selectedStyle,
                                      onStyleChange: (style) {
                                        setState(() => _selectedStyle = style);
                                        Navigator.pop(context);
                                      },
                                    ),
                                  ),
                                );
                              },
                            ),
                            const SizedBox(width: 8),
                            _buildOptionChip(
                              icon: Icons.model_training,
                              label: _selectedModel.label,
                              onTap: () {
                                showModalBottomSheet(
                                  context: context,
                                  backgroundColor: Colors.transparent,
                                  isScrollControlled: true,
                                  builder: (context) => AnimatedPadding(
                                    padding: MediaQuery.of(context).viewInsets,
                                    duration: const Duration(milliseconds: 100),
                                    child: ModelSelector(
                                      selectedModel: _selectedModel,
                                      onModelChange: (model) {
                                        setState(() => _selectedModel = model);
                                        Navigator.pop(context);
                                      },
                                    ),
                                  ),
                                );
                              },
                            ),
                            const SizedBox(width: 8),
                            _buildOptionChip(
                              icon: Icons.aspect_ratio,
                              label: _selectedSize.label,
                              onTap: () {
                                showModalBottomSheet(
                                  context: context,
                                  backgroundColor: Colors.transparent,
                                  isScrollControlled: true,
                                  builder: (context) => AnimatedPadding(
                                    padding: MediaQuery.of(context).viewInsets,
                                    duration: const Duration(milliseconds: 100),
                                    child: SizeSelector(
                                      selectedSize: _selectedSize,
                                      onSizeChange: (size) {
                                        setState(() => _selectedSize = size);
                                        Navigator.pop(context);
                                      },
                                    ),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Input Row
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: Colors.grey.withOpacity(0.2),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _promptController,
                                decoration: const InputDecoration(
                                  hintText: 'Describe the image you want to generate...',
                                  border: InputBorder.none,
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 12,
                                  ),
                                ),
                                maxLines: 3,
                                minLines: 1,
                                onSubmitted: (_) => _generateImage(),
                              ),
                            ),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (_isEnhancing)
                                  Container(
                                    margin: const EdgeInsets.all(8),
                                    width: 24,
                                    height: 24,
                                    child: const CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                else
                                  IconButton(
                                    icon: const Icon(Icons.auto_awesome),
                                    onPressed: _enhancePrompt,
                                    tooltip: 'Enhance prompt',
                                  ),
                                if (_isGenerating)
                                  Container(
                                    margin: const EdgeInsets.all(8),
                                    width: 24,
                                    height: 24,
                                    child: const CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                else
                                  Padding(
                                    padding: const EdgeInsets.only(
                                      right: 8.0,
                                      left: 4.0,
                                    ),
                                    child: IconButton(
                                      icon: const Icon(Icons.send),
                                      onPressed: _generateImage,
                                      tooltip: 'Generate image',
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Image Preview Overlay
          if (_selectedImage != null)
            ImagePreview(
              imageUrl: _selectedImage!.imageUrl,
              prompt: _selectedImage!.prompt,
              onClose: () => setState(() => _selectedImage = null),
            ),
        ],
      ),
    );
  }
} 