import 'package:flutter/material.dart';
import 'package:feluda_ai/models/ai_model.dart';
import 'package:feluda_ai/utils/theme.dart';

class ModelSelector extends StatelessWidget {
  final AIModel selectedModel;
  final Function(AIModel) onModelChange;

  const ModelSelector({
    super.key,
    required this.selectedModel,
    required this.onModelChange,
  });

  String _getShortModelName(String name) {
    // Shorten common model names
    return name
        .replaceAll('Claude', 'C')
        .replaceAll('GPT-4', 'G4')
        .replaceAll('GPT-3.5', 'G3.5')
        .replaceAll('Turbo', 'T')
        .replaceAll('Gemini', 'Gem');
  }

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<AIModel>(
      position: PopupMenuPosition.under,
      offset: const Offset(0, 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
      constraints: const BoxConstraints(
        minWidth: 180,
        maxWidth: 220,
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: 8,
          vertical: 4,
        ),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Theme.of(context).primaryColor.withOpacity(0.1),
              Theme.of(context).primaryColor.withOpacity(0.05),
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: Theme.of(context).primaryColor.withOpacity(0.1),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.auto_awesome,
                size: 8,
                color: Theme.of(context).primaryColor,
              ),
            ),
            const SizedBox(width: 4),
            Text(
              _getShortModelName(selectedModel.name),
              style: TextStyle(
                fontSize: 11,
                color: Theme.of(context).primaryColor,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: 2),
            Icon(
              Icons.arrow_drop_down,
              size: 14,
              color: Theme.of(context).primaryColor,
            ),
          ],
        ),
      ),
      itemBuilder: (context) => AIModels.models
          .map(
            (model) => PopupMenuItem<AIModel>(
              value: model,
              height: 40,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: model.id == selectedModel.id
                          ? Theme.of(context).primaryColor.withOpacity(0.1)
                          : Colors.grey.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.auto_awesome,
                      size: 10,
                      color: model.id == selectedModel.id
                          ? Theme.of(context).primaryColor
                          : Colors.grey,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          model.name,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: model.id == selectedModel.id
                                ? FontWeight.w600
                                : FontWeight.w400,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          model.provider,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontSize: 10,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (model.id == selectedModel.id)
                    Icon(
                      Icons.check,
                      size: 12,
                      color: Theme.of(context).primaryColor,
                    ),
                ],
              ),
            ),
          )
          .toList(),
      onSelected: onModelChange,
    );
  }
} 