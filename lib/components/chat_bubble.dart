import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:feluda_ai/utils/theme.dart';
import 'package:feluda_ai/pages/chat_page.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:feluda_ai/utils/assets.dart';
import 'dart:ui';

class ChatBubble extends StatefulWidget {
  final ChatMessage message;
  final Animation<double> animation;
  final Function(String)? onEdit;

  const ChatBubble({
    super.key,
    required this.message,
    required this.animation,
    this.onEdit,
  });

  @override
  State<ChatBubble> createState() => _ChatBubbleState();
}

class _ChatBubbleState extends State<ChatBubble> with SingleTickerProviderStateMixin {
  bool _isCopied = false;
  bool _isHovered = false;
  late AnimationController _scaleController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.98).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _scaleController.dispose();
    super.dispose();
  }

  Future<void> _copyToClipboard() async {
    await Clipboard.setData(ClipboardData(text: widget.message.text));
    setState(() => _isCopied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _isCopied = false);
    });
  }

  void _showContextMenu(BuildContext context, Offset tapPosition) {
    final RenderBox overlay = Overlay.of(context).context.findRenderObject() as RenderBox;
    
    showMenu(
      context: context,
      position: RelativeRect.fromRect(
        tapPosition & const Size(40, 40),
        Offset.zero & overlay.size,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      items: [
        PopupMenuItem(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.copy,
                size: 16,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              ),
              const SizedBox(width: 8),
              const Text('Copy'),
            ],
          ),
          onTap: _copyToClipboard,
        ),
        if (widget.message.isUser && widget.onEdit != null)
          PopupMenuItem(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.edit,
                  size: 16,
                  color: Theme.of(context).textTheme.bodyLarge?.color,
                ),
                const SizedBox(width: 8),
                const Text('Edit'),
              ],
            ),
            onTap: () {
              Future.delayed(const Duration(milliseconds: 200), () {
                if (widget.onEdit != null) {
                  widget.onEdit!(widget.message.text);
                }
              });
            },
          ),
      ],
    );
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
            onEnter: (_) {
              setState(() => _isHovered = true);
              _scaleController.forward();
            },
            onExit: (_) {
              setState(() => _isHovered = false);
              _scaleController.reverse();
            },
            child: GestureDetector(
              onLongPressStart: (details) => _showContextMenu(context, details.globalPosition),
              child: ScaleTransition(
                scale: _scaleAnimation,
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
                        child: ClipRRect(
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(20),
                            topRight: const Radius.circular(20),
                            bottomLeft: Radius.circular(widget.message.isUser ? 20 : 8),
                            bottomRight: Radius.circular(widget.message.isUser ? 8 : 20),
                          ),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                            child: Container(
                              padding: const EdgeInsets.all(FeludaTheme.spacing16),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: widget.message.isUser
                                      ? [
                                          Theme.of(context).primaryColor,
                                          Color.lerp(
                                            Theme.of(context).primaryColor,
                                            Colors.purple,
                                            0.3,
                                          )!,
                                        ]
                                      : [
                                          Colors.white.withOpacity(0.9),
                                          Colors.white.withOpacity(0.7),
                                        ],
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: (widget.message.isUser
                                            ? Theme.of(context).primaryColor
                                            : Colors.grey)
                                        .withOpacity(0.15),
                                    blurRadius: 12,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                                border: Border.all(
                                  color: widget.message.isUser
                                      ? Colors.white.withOpacity(0.1)
                                      : Colors.grey.withOpacity(0.2),
                                  width: 1,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (!widget.message.isUser) ...[
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(1),
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            gradient: LinearGradient(
                                              begin: Alignment.topLeft,
                                              end: Alignment.bottomRight,
                                              colors: [
                                                Theme.of(context).primaryColor.withOpacity(0.2),
                                                Theme.of(context).primaryColor.withOpacity(0.1),
                                              ],
                                            ),
                                            border: Border.all(
                                              color: Theme.of(context).primaryColor.withOpacity(0.3),
                                              width: 1,
                                            ),
                                          ),
                                          child: CircleAvatar(
                                            radius: 10,
                                            backgroundImage: AssetImage(Assets.aiIcon),
                                          ),
                                        ),
                                        const SizedBox(width: FeludaTheme.spacing8),
                                        Text(
                                          'FeludaAI',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w500,
                                            color: Theme.of(context).primaryColor,
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
                                              backgroundColor: Colors.blue.withOpacity(0.1),
                                              fontFamily: 'monospace',
                                            ),
                                            codeblockDecoration: BoxDecoration(
                                              color: Colors.blue.withOpacity(0.05),
                                              borderRadius: BorderRadius.circular(8),
                                              border: Border.all(
                                                color: Colors.blue.withOpacity(0.1),
                                              ),
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
                                              : Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.6),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      if (!widget.message.isUser && (_isHovered || _isCopied))
                        Positioned(
                          top: 8,
                          right: 8,
                          child: AnimatedOpacity(
                            duration: const Duration(milliseconds: 200),
                            opacity: _isHovered || _isCopied ? 1.0 : 0.0,
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: BackdropFilter(
                                filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: Colors.white.withOpacity(0.2),
                                    ),
                                  ),
                                  child: IconButton(
                                    icon: Icon(
                                      _isCopied ? Icons.check : Icons.copy,
                                      size: 16,
                                      color: _isCopied
                                          ? Colors.green
                                          : Theme.of(context).primaryColor,
                                    ),
                                    onPressed: _copyToClipboard,
                                    tooltip: _isCopied ? 'Copied!' : 'Copy message',
                                    splashRadius: 20,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
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