import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:cross_file/cross_file.dart';
import 'dart:io';

class ImagePreview extends StatefulWidget {
  final String imageUrl;
  final String prompt;
  final VoidCallback onClose;

  const ImagePreview({
    super.key,
    required this.imageUrl,
    required this.prompt,
    required this.onClose,
  });

  @override
  State<ImagePreview> createState() => _ImagePreviewState();
}

class _ImagePreviewState extends State<ImagePreview> {
  bool _isCopied = false;
  bool _isFullscreen = false;
  bool _isDownloading = false;
  bool _isSharing = false;
  TransformationController _transformationController = TransformationController();

  Future<void> _copyPrompt() async {
    await Clipboard.setData(ClipboardData(text: widget.prompt));
    setState(() => _isCopied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _isCopied = false);
    });
  }

  Future<void> _downloadImage() async {
    if (_isDownloading) return;
    setState(() => _isDownloading = true);

    try {
      final response = await http.get(Uri.parse(widget.imageUrl));
      if (response.statusCode != 200) throw Exception('Failed to download image');

      final directory = await getApplicationDocumentsDirectory();
      final fileName = 'feluda_ai_${DateTime.now().millisecondsSinceEpoch}.png';
      final filePath = '${directory.path}/$fileName';

      await File(filePath).writeAsBytes(response.bodyBytes);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Image downloaded successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error downloading image: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isDownloading = false);
    }
  }

  Future<void> _shareImage() async {
    if (_isSharing) return;
    setState(() => _isSharing = true);

    try {
      final response = await http.get(Uri.parse(widget.imageUrl));
      if (response.statusCode != 200) throw Exception('Failed to fetch image');

      final directory = await getTemporaryDirectory();
      final fileName = 'feluda_ai_${DateTime.now().millisecondsSinceEpoch}.png';
      final filePath = '${directory.path}/$fileName';

      await File(filePath).writeAsBytes(response.bodyBytes);

      if (!mounted) return;

      await Share.shareXFiles(
        [XFile(filePath)],
        text: 'Generated with Feluda AI\nPrompt: ${widget.prompt}',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error sharing image: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSharing = false);
    }
  }

  @override
  void dispose() {
    _transformationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onClose,
      child: Container(
        color: Colors.black.withOpacity(0.9),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Stack(
            children: [
              // Image Container
              Center(
                child: GestureDetector(
                  onTap: () {}, // Prevent closing on image tap
                  child: Container(
                    constraints: BoxConstraints(
                      maxWidth: _isFullscreen ? double.infinity : 800,
                      maxHeight: _isFullscreen ? double.infinity : 600,
                    ),
                    margin: _isFullscreen ? EdgeInsets.zero : const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: _isFullscreen ? null : BorderRadius.circular(16),
                      boxShadow: _isFullscreen ? null : [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: _isFullscreen ? BorderRadius.zero : BorderRadius.circular(16),
                      child: InteractiveViewer(
                        transformationController: _transformationController,
                        minScale: 0.5,
                        maxScale: 4.0,
                        child: Image.network(
                          widget.imageUrl,
                          fit: BoxFit.contain,
                          loadingBuilder: (context, child, loadingProgress) {
                            if (loadingProgress == null) return child;
                            return Center(
                              child: CircularProgressIndicator(
                                value: loadingProgress.expectedTotalBytes != null
                                    ? loadingProgress.cumulativeBytesLoaded /
                                        loadingProgress.expectedTotalBytes!
                                    : null,
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              // Controls
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      IconButton(
                        onPressed: _copyPrompt,
                        icon: Icon(
                          _isCopied ? Icons.check : Icons.copy,
                          color: Colors.white,
                        ),
                        tooltip: 'Copy prompt',
                      ),
                      IconButton(
                        onPressed: _shareImage,
                        icon: Icon(
                          _isSharing ? Icons.sync : Icons.share,
                          color: Colors.white,
                        ),
                        tooltip: 'Share image',
                      ),
                      IconButton(
                        onPressed: _downloadImage,
                        icon: Icon(
                          _isDownloading ? Icons.sync : Icons.download,
                          color: Colors.white,
                        ),
                        tooltip: 'Download image',
                      ),
                      IconButton(
                        onPressed: () {
                          setState(() {
                            _isFullscreen = !_isFullscreen;
                            _transformationController.value = Matrix4.identity();
                          });
                        },
                        icon: Icon(
                          _isFullscreen ? Icons.fullscreen_exit : Icons.fullscreen,
                          color: Colors.white,
                        ),
                        tooltip: _isFullscreen ? 'Exit fullscreen' : 'Fullscreen',
                      ),
                      IconButton(
                        onPressed: widget.onClose,
                        icon: const Icon(Icons.close, color: Colors.white),
                        tooltip: 'Close preview',
                      ),
                    ],
                  ),
                ),
              ),

              // Prompt Display
              if (widget.prompt.isNotEmpty)
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: Container(
                    padding: EdgeInsets.only(
                      left: 16,
                      right: 16,
                      top: 16,
                      bottom: MediaQuery.of(context).padding.bottom + 16,
                    ),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Colors.black.withOpacity(0.7),
                        ],
                      ),
                    ),
                    child: Text(
                      widget.prompt,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
} 