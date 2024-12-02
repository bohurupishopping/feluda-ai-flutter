import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:feluda_ai/utils/theme.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:feluda_ai/services/api_service.dart';
import 'package:feluda_ai/components/app_drawer.dart';
import 'package:feluda_ai/models/ai_model.dart';
import 'package:feluda_ai/components/model_selector.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:feluda_ai/components/typing_indicator.dart';
import 'package:feluda_ai/services/conversation_service.dart';
import 'package:feluda_ai/utils/assets.dart';
import 'package:feluda_ai/components/network_aware_widget.dart';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:feluda_ai/services/file_picker_service.dart';
import 'package:cross_file/cross_file.dart';
import 'package:flutter/services.dart' show Clipboard, ClipboardData;
import 'package:flutter_markdown/flutter_markdown.dart';

class ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final String role;

  ChatMessage({
    required this.text,
    required this.isUser,
    required this.timestamp,
    required this.role,
  });

  Map<String, String> toJson() => {
    'role': role,
    'content': text,
  };
}

class ChatPage extends StatefulWidget {
  final String? sessionId;
  
  const ChatPage({
    super.key,
    this.sessionId,
  });

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMessage> _messages = [];
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  late AIModel _selectedModel;
  bool _isTyping = false;
  late GlobalKey<AnimatedListState> _listKey;
  late final ConversationService _conversationService;
  String? _currentSessionId;
  bool _isLoadingHistory = false;
  XFile? _selectedFile;
  bool _isFileUploading = false;
  final _filePickerService = FilePickerService();

  @override
  void initState() {
    super.initState();
    _listKey = GlobalKey<AnimatedListState>();
    _selectedModel = AIModels.getDefaultModel();
    _loadSavedModel();
    _currentSessionId = widget.sessionId;
    _conversationService = ConversationService(sessionId: _currentSessionId);
    
    if (_currentSessionId != null) {
      _loadChatHistory();
    } else {
      _showWelcomeMessage();
    }
  }

  Future<void> _loadSavedModel() async {
    final prefs = await SharedPreferences.getInstance();
    final savedModelId = prefs.getString('selectedModel');
    if (savedModelId != null) {
      final model = AIModels.getModelById(savedModelId);
      if (model != null) {
        setState(() {
          _selectedModel = model;
        });
      }
    }
  }

  Future<void> _handleModelChange(AIModel model) async {
    setState(() {
      _selectedModel = model;
    });
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('selectedModel', model.id);
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _addMessage(ChatMessage message) {
    setState(() {
      _messages.add(message);
      // Only animate if the list is already built
      if (_listKey.currentState != null) {
        _listKey.currentState!.insertItem(_messages.length - 1);
      }
    });
  }

  void _showWelcomeMessage() {
    _messages.clear();
    _addMessage(ChatMessage(
      text: '''# Welcome to Feluda AI!

I'm your AI assistant, ready to help you with:

- 🔍 **Problem Solving**
- 📚 **Knowledge Sharing**
- 💡 **Creative Tasks**
- 🤝 **Discussions**

*How can I assist you today?* 🕵️‍♂️''',
      isUser: false,
      timestamp: DateTime.now(),
      role: 'welcome',
    ));
  }

  Future<void> _loadChatHistory() async {
    try {
      setState(() => _isLoadingHistory = true);

      final messages = await _conversationService.loadChatSession(_currentSessionId!);
      if (mounted) {
        setState(() {
          _messages.clear();
          _resetList();
          messages.forEach(_addMessage);
          _isLoadingHistory = false;
        });
        
        _scrollToBottom();
      }
    } catch (e) {
      debugPrint('Error loading chat history: $e');
      if (mounted) {
        setState(() => _isLoadingHistory = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading chat history: ${e.toString()}'),
            backgroundColor: FeludaTheme.errorColor,
          ),
        );
      }
    }
  }

  Future<void> _pickFile() async {
    try {
      final file = await _filePickerService.pickFile();
      if (file != null) {
        await _filePickerService.validateFile(file);
        setState(() {
          _selectedFile = file;
        });
        
        // Show selected file name
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Selected file: ${file.name}'),
              action: SnackBarAction(
                label: 'Remove',
                onPressed: () {
                  setState(() {
                    _selectedFile = null;
                  });
                },
              ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _sendMessage() async {
    final message = _messageController.text.trim();
    if (message.isEmpty && _selectedFile == null) return;

    if (_messages.length == 1 && !_messages[0].isUser && _currentSessionId == null) {
      setState(() {
        _messages.clear();
        _resetList();
      });
    }

    _addMessage(ChatMessage(
      text: message,
      isUser: true,
      timestamp: DateTime.now(),
      role: 'user',
    ));

    setState(() {
      _isLoading = true;
      _isTyping = true;
      _messageController.clear();
    });

    _scrollToBottom();

    try {
      String response;
      
      if (_selectedFile != null) {
        // Handle file upload and processing
        setState(() => _isFileUploading = true);
        
        response = await _apiService.getChatCompletionWithFile(
          prompt: message,
          file: _selectedFile!,
          model: _selectedModel,
        );
        
        setState(() {
          _isFileUploading = false;
          _selectedFile = null;
        });
      } else {
        // Regular text message
        response = await _apiService.getChatCompletion(
          message,
          _messages
              .where((msg) => msg.role != 'welcome')
              .map((msg) => msg.toJson())
              .toList(),
          model: _selectedModel,
        );
      }

      if (mounted) {
        _addMessage(ChatMessage(
          text: response,
          isUser: false,
          timestamp: DateTime.now(),
          role: 'assistant',
        ));

        setState(() {
          _isLoading = false;
          _isTyping = false;
        });
        
        await _conversationService.saveConversation(message, response);
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isTyping = false;
          _selectedFile = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: FeludaTheme.errorColor,
          ),
        );
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _handleSessionChange(String? newSessionId) async {
    if (_currentSessionId != newSessionId) {
      setState(() {
        _currentSessionId = newSessionId;
        _conversationService = ConversationService(sessionId: newSessionId);
      });
      if (newSessionId != null) {
        await _loadChatHistory();
      } else {
        _showWelcomeMessage();
      }
    }
  }

  void _startNewChat() {
    setState(() {
      _messages.clear();
      _currentSessionId = null;
      _conversationService = ConversationService();
      _resetList();
      _showWelcomeMessage();
    });
  }

  void _resetList() {
    _listKey = GlobalKey<AnimatedListState>();
  }

  void _handleMessageEdit(String originalText) {
    _messageController.text = originalText;
    _messageController.selection = TextSelection.fromPosition(
      TextPosition(offset: originalText.length),
    );
    FocusScope.of(context).requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    return NetworkAwareWidget(
      child: Scaffold(
        appBar: AppBar(
          elevation: 0,
          backgroundColor: Colors.transparent,
          flexibleSpace: ClipRect(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFFE8EEFF),  // Light professional blue
                      Color(0xFFE2E8FF),  // Slightly deeper professional blue
                    ],
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
                    color: Theme.of(context).primaryColor.withOpacity(0.2),
                    width: 0.5,
                  ),
                  gradient: LinearGradient(
                    colors: [
                      Theme.of(context).primaryColor.withOpacity(0.1),
                      Theme.of(context).primaryColor.withOpacity(0.05),
                    ],
                  ),
                ),
                child: CircleAvatar(
                  radius: 12,
                  backgroundImage: AssetImage(Assets.aiIcon),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'FeludaAI',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (_currentSessionId != null)
                      Text(
                        'Continuing conversation',
                        style: TextStyle(
                          fontSize: 10,
                          color: Theme.of(context).textTheme.bodySmall?.color,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: ModelSelector(
                selectedModel: _selectedModel,
                onModelChange: _handleModelChange,
              ),
            ),
            SizedBox(
              width: 32,
              child: IconButton(
                icon: const Icon(Icons.clear, size: 20),
                onPressed: () async {
                  try {
                    await _conversationService.clearConversationHistory();
                    setState(() {
                      _messages.clear();
                    });
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Chat history cleared')),
                      );
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Error clearing chat history: ${e.toString()}'),
                          backgroundColor: FeludaTheme.errorColor,
                        ),
                      );
                    }
                  }
                },
                tooltip: 'Clear chat',
                padding: EdgeInsets.zero,
              ),
            ),
            SizedBox(
              width: 32,
              child: IconButton(
                icon: const Icon(Icons.add, size: 20),
                onPressed: _startNewChat,
                tooltip: 'New Chat',
                padding: EdgeInsets.zero,
              ),
            ),
            const SizedBox(width: 4),
          ],
        ),
        drawer: const AppDrawer(),
        body: _isLoadingHistory
            ? const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(
                      strokeWidth: 2,
                    ),
                    SizedBox(height: 12),
                    Text(
                      'Loading conversation...',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              )
            : Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    stops: [0.0, 0.3, 0.6, 1.0],
                    colors: [
                      Color(0xFFE8EEFF),  // Light professional blue
                      Color(0xFFE2E8FF),  // Slightly deeper professional blue
                      Color(0xFFDBE4FF),  // Medium professional blue
                      Color(0xFFD4E0FF),  // Deep professional blue
                    ],
                  ),
                ),
                child: Column(
                  children: [
                    Expanded(
                      child: AnimatedList(
                        key: _listKey,
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(
                          horizontal: FeludaTheme.spacing16,
                          vertical: FeludaTheme.spacing8,
                        ),
                        initialItemCount: _messages.length,
                        itemBuilder: (context, index, animation) {
                          final message = _messages[index];
                          return SlideTransition(
                            position: animation.drive(Tween(
                              begin: Offset(
                                message.isUser ? 1.0 : -1.0,
                                0.0,
                              ),
                              end: Offset.zero,
                            ).chain(CurveTween(
                              curve: Curves.easeOutCubic,
                            ))),
                            child: ChatBubble(
                              message: message,
                              animation: animation,
                              onEdit: message.isUser ? _handleMessageEdit : null,
                            ),
                          );
                        },
                      ),
                    ),
                    if (_isTyping)
                      const TypingIndicator(),
                    Container(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Color(0xFFE8EEFF),  // Light professional blue
                            Color(0xFFE2E8FF),  // Slightly deeper professional blue
                          ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF4B7BFF).withOpacity(0.03),
                            blurRadius: 8,
                            offset: const Offset(0, -2),
                          ),
                        ],
                      ),
                      child: ClipRect(
                        child: BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                          child: Padding(
                            padding: EdgeInsets.only(
                              left: FeludaTheme.spacing16,
                              right: FeludaTheme.spacing16,
                              top: FeludaTheme.spacing12,
                              bottom: MediaQuery.of(context).padding.bottom + FeludaTheme.spacing12,
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(24),
                                      border: Border.all(
                                        color: const Color(0xFFCCDBFF),  // Darker blue border
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: const Color(0xFF3366FF).withOpacity(0.05),  // Darker blue shadow
                                          blurRadius: 4,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    child: Row(
                                      children: [
                                        IconButton(
                                          onPressed: _pickFile,
                                          icon: Icon(
                                            Icons.attach_file,
                                            size: 20,
                                            color: Colors.grey.shade600,
                                          ),
                                          tooltip: 'Attach file',
                                        ),
                                        Expanded(
                                          child: TextField(
                                            controller: _messageController,
                                            decoration: InputDecoration(
                                              hintText: 'Type a message...',
                                              hintStyle: TextStyle(
                                                color: Colors.grey.shade400,
                                                fontSize: 14,
                                              ),
                                              border: InputBorder.none,
                                              contentPadding: const EdgeInsets.symmetric(
                                                horizontal: 16,
                                                vertical: 12,
                                              ),
                                            ),
                                            minLines: 1,
                                            maxLines: 5,
                                            textInputAction: TextInputAction.newline,
                                            onSubmitted: (value) {
                                              if (!_isLoading) _sendMessage();
                                            },
                                          ),
                                        ),
                                        Container(
                                          margin: const EdgeInsets.all(4),
                                          decoration: BoxDecoration(
                                            gradient: LinearGradient(
                                              colors: [
                                                Theme.of(context).primaryColor,
                                                Theme.of(context).primaryColor.withOpacity(0.8),
                                              ],
                                            ),
                                            borderRadius: BorderRadius.circular(20),
                                          ),
                                          child: Material(
                                            color: Colors.transparent,
                                            child: IconButton(
                                              onPressed: _isLoading ? null : _sendMessage,
                                              icon: AnimatedSwitcher(
                                                duration: const Duration(milliseconds: 200),
                                                child: _isLoading
                                                    ? const SizedBox(
                                                        width: 20,
                                                        height: 20,
                                                        child: CircularProgressIndicator(
                                                          strokeWidth: 2,
                                                          valueColor: AlwaysStoppedAnimation<Color>(
                                                            Colors.white,
                                                          ),
                                                        ),
                                                      )
                                                    : const Icon(
                                                        Icons.send_rounded,
                                                        color: Colors.white,
                                                      ),
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
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
              // Delay the edit to allow menu to close
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
            onEnter: (_) => setState(() => _isHovered = true),
            onExit: (_) => setState(() => _isHovered = false),
            child: GestureDetector(
              onLongPressStart: (details) => _showContextMenu(
                context,
                details.globalPosition,
              ),
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