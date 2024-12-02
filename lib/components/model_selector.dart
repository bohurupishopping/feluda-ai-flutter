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

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<AIModel>(
      position: PopupMenuPosition.under,
      offset: const Offset(0, 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: FeludaTheme.spacing12,
          vertical: FeludaTheme.spacing8,
        ),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Theme.of(context).primaryColor.withOpacity(0.1),
              Theme.of(context).primaryColor.withOpacity(0.05),
            ],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: Theme.of(context).primaryColor.withOpacity(0.1),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.auto_awesome,
                size: 12,
                color: Theme.of(context).primaryColor,
              ),
            ),
            const SizedBox(width: FeludaTheme.spacing8),
            Text(
              selectedModel.name,
              style: TextStyle(
                fontSize: 14,
                color: Theme.of(context).primaryColor,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: FeludaTheme.spacing4),
            Icon(
              Icons.arrow_drop_down,
              size: 20,
              color: Theme.of(context).primaryColor,
            ),
          ],
        ),
      ),
      itemBuilder: (context) => AIModels.models
          .map(
            (model) => PopupMenuItem<AIModel>(
              value: model,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: model.id == selectedModel.id
                            ? Theme.of(context).primaryColor.withOpacity(0.1)
                            : Colors.grey.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.auto_awesome,
                        size: 14,
                        color: model.id == selectedModel.id
                            ? Theme.of(context).primaryColor
                            : Colors.grey,
                      ),
                    ),
                    const SizedBox(width: FeludaTheme.spacing12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            model.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            model.provider,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    if (model.id == selectedModel.id)
                      Icon(
                        Icons.check,
                        size: 16,
                        color: Theme.of(context).primaryColor,
                      ),
                  ],
                ),
              ),
            ),
          )
          .toList(),
      onSelected: onModelChange,
    );
  }
} 