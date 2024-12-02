import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:feluda_ai/utils/theme.dart';
import 'package:feluda_ai/pages/chat_page.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:feluda_ai/utils/assets.dart';

class ChatBubble extends StatefulWidget {
  final ChatMessage message;
  final Animation<double> animation;

  const ChatBubble({
    super.key,
    required this.message,
    required this.animation,
  });

  @override
  State<ChatBubble> createState() => _ChatBubbleState();
}

class _ChatBubbleState extends State<ChatBubble> {
  bool _isCopied = false;
  bool _isHovered = false;

  Future<void> _copyToClipboard() async {
    await Clipboard.setData(ClipboardData(text: widget.message.text));
    setState(() => _isCopied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _isCopied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return SizeTransition(
      sizeFactor: widget.animation,
      child: FadeTransition(
        opacity: widget.animation,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: MouseRegion(
            onEnter: (_) => setState(() => _isHovered = true),
            onExit: (_) => setState(() => _isHovered = false),
            child: Align(
              alignment: widget.message.isUser ? Alignment.centerRight : Alignment.centerLeft,
              child: Stack(
                children: [
                  Container(
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.75,
                    ),
                    margin: EdgeInsets.only(
                      top: FeludaTheme.spacing8,
                      bottom: FeludaTheme.spacing8,
                      left: widget.message.isUser ? FeludaTheme.spacing32 : FeludaTheme.spacing8,
                      right: widget.message.isUser ? FeludaTheme.spacing8 : FeludaTheme.spacing32,
                    ),
                    padding: const EdgeInsets.all(FeludaTheme.spacing16),
                    decoration: BoxDecoration(
                      color: widget.message.isUser
                          ? Theme.of(context).primaryColor
                          : Theme.of(context).cardColor.withOpacity(0.7),
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(20),
                        topRight: const Radius.circular(20),
                        bottomLeft: Radius.circular(widget.message.isUser ? 20 : 8),
                        bottomRight: Radius.circular(widget.message.isUser ? 8 : 20),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 5,
                          offset: const Offset(0, 2),
                        ),
                      ],
                      border: Border.all(
                        color: widget.message.isUser
                            ? Colors.transparent
                            : Theme.of(context).dividerColor.withOpacity(0.1),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (!widget.message.isUser) ...[
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CircleAvatar(
                                radius: 10,
                                backgroundImage: AssetImage(Assets.aiIcon),
                              ),
                              const SizedBox(width: FeludaTheme.spacing8),
                              Text(
                                'FeludaAI',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Theme.of(context).textTheme.bodySmall?.color,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: FeludaTheme.spacing8),
                        ],
                        widget.message.isUser
                            ? Text(
                                widget.message.text,
                                style: const TextStyle(
                                  color: Colors.white,
                                  height: 1.5,
                                ),
                              )
                            : MarkdownBody(
                                data: widget.message.text,
                                styleSheet: MarkdownStyleSheet(
                                  p: TextStyle(
                                    color: Theme.of(context).textTheme.bodyLarge?.color,
                                    height: 1.5,
                                  ),
                                  code: TextStyle(
                                    backgroundColor: Theme.of(context).colorScheme.surface,
                                    fontFamily: 'monospace',
                                  ),
                                  codeblockDecoration: BoxDecoration(
                                    color: Theme.of(context).colorScheme.surface,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                              ),
                        const SizedBox(height: FeludaTheme.spacing4),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _formatTimestamp(widget.message.timestamp),
                              style: TextStyle(
                                fontSize: 10,
                                color: widget.message.isUser
                                    ? Colors.white.withOpacity(0.7)
                                    : Theme.of(context).textTheme.bodySmall?.color,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (!widget.message.isUser && (_isHovered || _isCopied))
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Material(
                        color: Colors.transparent,
                        child: IconButton(
                          icon: Icon(
                            _isCopied ? Icons.check : Icons.copy,
                            size: 16,
                            color: _isCopied
                                ? Colors.green
                                : Theme.of(context).textTheme.bodySmall?.color,
                          ),
                          onPressed: _copyToClipboard,
                          tooltip: _isCopied ? 'Copied!' : 'Copy message',
                          splashRadius: 20,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${timestamp.day}/${timestamp.month}/${timestamp.year}';
    }
  }
} 