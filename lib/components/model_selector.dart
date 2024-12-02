import 'package:flutter/material.dart';
import 'package:feluda_ai/models/ai_model.dart';
import 'package:feluda_ai/utils/theme.dart';
import 'dart:ui';

class ModelSelector extends StatefulWidget {
  final AIModel selectedModel;
  final Function(AIModel) onModelChange;

  const ModelSelector({
    super.key,
    required this.selectedModel,
    required this.onModelChange,
  });

  @override
  State<ModelSelector> createState() => _ModelSelectorState();
}

class _ModelSelectorState extends State<ModelSelector> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  bool _isHovered = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _getShortModelName(String name) {
    return name
        .replaceAll('Claude', 'C')
        .replaceAll('GPT-4', 'G4')
        .replaceAll('GPT-3.5', 'G3.5')
        .replaceAll('Turbo', 'T')
        .replaceAll('Gemini', 'Gem');
  }

  @override
  Widget build(BuildContext context) {
    // Define a custom gradient for the selector
    final selectorGradient = [
      const Color(0xFF4B7BFF).withOpacity(0.15),  // Light professional blue
      const Color(0xFF6C63FF).withOpacity(0.1),   // Soft indigo
    ];

    return MouseRegion(
      onEnter: (_) {
        setState(() => _isHovered = true);
        _controller.forward();
      },
      onExit: (_) {
        setState(() => _isHovered = false);
        _controller.reverse();
      },
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: PopupMenuButton<AIModel>(
          position: PopupMenuPosition.under,
          offset: const Offset(0, 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          constraints: const BoxConstraints(
            minWidth: 200,
            maxWidth: 240,
          ),
          elevation: 8,
          color: const Color(0xFFF8FAFF), // Light blue-tinted white
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 8,
            ),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: selectorGradient,
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: const Color(0xFF4B7BFF).withOpacity(_isHovered ? 0.2 : 0.15),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF4B7BFF).withOpacity(0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        const Color(0xFF4B7BFF).withOpacity(0.2),
                        const Color(0xFF6C63FF).withOpacity(0.15),
                      ],
                    ),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFF4B7BFF).withOpacity(0.2),
                      width: 1,
                    ),
                  ),
                  child: Icon(
                    Icons.bolt,
                    size: 10,
                    color: const Color(0xFF4B7BFF),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  _getShortModelName(widget.selectedModel.name),
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF2B4483), // Darker blue for better contrast
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(
                  Icons.expand_more_rounded,
                  size: 16,
                  color: Color(0xFF2B4483),
                ),
              ],
            ),
          ),
          itemBuilder: (context) => [
            PopupMenuItem<AIModel>(
              enabled: false,
              height: 36,
              child: Text(
                'Select AI Model',
                style: TextStyle(
                  fontSize: 12,
                  color: const Color(0xFF4B7BFF).withOpacity(0.8),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const PopupMenuDivider(),
            ...AIModels.models.map(
              (model) => PopupMenuItem<AIModel>(
                value: model,
                height: 56,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Container(
                  decoration: BoxDecoration(
                    gradient: model.id == widget.selectedModel.id
                        ? LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              const Color(0xFF4B7BFF).withOpacity(0.1),
                              const Color(0xFF6C63FF).withOpacity(0.05),
                            ],
                          )
                        : null,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              model.id == widget.selectedModel.id
                                  ? const Color(0xFF4B7BFF).withOpacity(0.2)
                                  : Colors.grey.withOpacity(0.15),
                              model.id == widget.selectedModel.id
                                  ? const Color(0xFF6C63FF).withOpacity(0.15)
                                  : Colors.grey.withOpacity(0.1),
                            ],
                          ),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: model.id == widget.selectedModel.id
                                ? const Color(0xFF4B7BFF).withOpacity(0.2)
                                : Colors.grey.withOpacity(0.2),
                            width: 1,
                          ),
                        ),
                        child: Icon(
                          Icons.bolt,
                          size: 12,
                          color: model.id == widget.selectedModel.id
                              ? const Color(0xFF4B7BFF)
                              : Colors.grey.shade600,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              model.name,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: model.id == widget.selectedModel.id
                                    ? FontWeight.w600
                                    : FontWeight.w500,
                                color: model.id == widget.selectedModel.id
                                    ? const Color(0xFF4B7BFF)
                                    : const Color(0xFF2B4483),
                              ),
                            ),
                            Text(
                              model.provider,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                fontSize: 11,
                                color: const Color(0xFF2B4483).withOpacity(0.6),
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (model.id == widget.selectedModel.id)
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF4B7BFF).withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.check_rounded,
                            size: 12,
                            color: Color(0xFF4B7BFF),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ],
          onSelected: widget.onModelChange,
        ),
      ),
    );
  }
} 