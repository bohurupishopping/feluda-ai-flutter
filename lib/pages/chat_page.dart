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
      text: '''# নমস্কার! 🙏

আমি ফেলুদা এ.আই। জ্ঞান আর মগজাস্ত্র নিয়ে তোমার কাছে এসেছি, লালমোহন বাবুর মতো গল্প বলার ক্ষমতা আমার নেই, কিন্তু টেলিপ‍্যাথির জোর আছে!

- 🔍 **Problem Solving** 
- 📚 **Knowledge Sharing** 
- 💡 **Creative Assistance**
- 🤝 **Thoughtful Discussions**

*"কোনো প্রশ্ন আছে?" - Do you have any questions?* 🕵️‍♂️''',
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

  Future<void> _sendMessage() async {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;

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
      final previousMessages = _messages
          .where((msg) => msg.role != 'welcome')
          .map((msg) => msg.toJson())
          .toList();

      final response = await _apiService.getChatCompletion(
        message,
        previousMessages,
        model: _selectedModel,
      );

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white.withOpacity(0.8),
        flexibleSpace: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.white.withOpacity(0.7),
                    Colors.white.withOpacity(0.5),
                  ],
                ),
              ),
            ),
          ),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Theme.of(context).primaryColor.withOpacity(0.2),
                    ),
                    gradient: LinearGradient(
                      colors: [
                        Theme.of(context).primaryColor.withOpacity(0.1),
                        Theme.of(context).primaryColor.withOpacity(0.05),
                      ],
                    ),
                  ),
                  child: CircleAvatar(
                    radius: 15,
                    backgroundImage: AssetImage(Assets.aiIcon),
                  ),
                ),
                const SizedBox(width: FeludaTheme.spacing8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'FeludaAI',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (_currentSessionId != null)
                      Text(
                        'Continuing conversation',
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(context).textTheme.bodySmall?.color,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: FeludaTheme.spacing8),
            child: ModelSelector(
              selectedModel: _selectedModel,
              onModelChange: _handleModelChange,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.clear),
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
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _startNewChat,
            tooltip: 'New Chat',
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoadingHistory
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Loading conversation...'),
                ],
              ),
            )
          : Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.blue.withOpacity(0.1),
                    Colors.purple.withOpacity(0.1),
                    Colors.pink.withOpacity(0.1),
                  ],
                ),
              ),
              child: Column(
                children: [
                  Expanded(
                    child: Container(
                      color: Colors.transparent,
                      child: AnimatedList(
                        key: _listKey,
                        controller: _scrollController,
                        padding: const EdgeInsets.all(FeludaTheme.spacing16),
                        initialItemCount: _messages.length,
                        itemBuilder: (context, index, animation) {
                          final message = _messages[index];
                          return ChatBubble(
                            message: message,
                            animation: animation,
                          );
                        },
                      ),
                    ),
                  ),
                  if (_isTyping)
                    const TypingIndicator(),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.8),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 10,
                          offset: const Offset(0, -5),
                        ),
                      ],
                      border: Border(
                        top: BorderSide(
                          color: Colors.grey.withOpacity(0.2),
                        ),
                      ),
                    ),
                    child: ClipRect(
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                        child: Padding(
                          padding: EdgeInsets.only(
                            left: FeludaTheme.spacing16,
                            right: FeludaTheme.spacing16,
                            top: FeludaTheme.spacing16,
                            bottom: MediaQuery.of(context).padding.bottom + FeludaTheme.spacing16,
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(24),
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
                                    children: [
                                      Expanded(
                                        child: TextFormField(
                                          controller: _messageController,
                                          decoration: InputDecoration(
                                            hintText: 'Type a message...',
                                            hintStyle: TextStyle(
                                              color: Colors.grey.withOpacity(0.8),
                                            ),
                                            border: InputBorder.none,
                                            contentPadding: const EdgeInsets.symmetric(
                                              horizontal: FeludaTheme.spacing16,
                                              vertical: FeludaTheme.spacing12,
                                            ),
                                          ),
                                          maxLines: 4,
                                          minLines: 1,
                                          onFieldSubmitted: (_) => _sendMessage(),
                                        ),
                                      ),
                                      IconButton(
                                        icon: Icon(
                                          Icons.attach_file,
                                          color: Theme.of(context).primaryColor.withOpacity(0.7),
                                        ),
                                        onPressed: () {
                                          // TODO: Implement file attachment
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: FeludaTheme.spacing8),
                              Container(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      Theme.of(context).primaryColor,
                                      Theme.of(context).primaryColor.withOpacity(0.8),
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(24),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Theme.of(context).primaryColor.withOpacity(0.3),
                                      blurRadius: 5,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Material(
                                  color: Colors.transparent,
                                  child: IconButton(
                                    onPressed: _isLoading ? null : _sendMessage,
                                    icon: _isLoading
                                        ? const SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                            ),
                                          )
                                        : const Icon(Icons.send, color: Colors.white),
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
    );
  }
}

class ChatBubble extends StatelessWidget {
  final ChatMessage message;
  final Animation<double> animation;

  const ChatBubble({
    super.key,
    required this.message,
    required this.animation,
  });

  @override
  Widget build(BuildContext context) {
    return SizeTransition(
      sizeFactor: animation,
      child: FadeTransition(
        opacity: animation,
        child: Align(
          alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.75,
            ),
            margin: EdgeInsets.only(
              top: FeludaTheme.spacing8,
              bottom: FeludaTheme.spacing8,
              left: message.isUser ? FeludaTheme.spacing32 : 0,
              right: message.isUser ? 0 : FeludaTheme.spacing32,
            ),
            padding: const EdgeInsets.symmetric(
              horizontal: FeludaTheme.spacing16,
              vertical: FeludaTheme.spacing12,
            ),
            decoration: BoxDecoration(
              color: message.isUser
                  ? FeludaTheme.primaryColor
                  : Theme.of(context).cardColor,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(message.isUser ? 16 : 4),
                bottomRight: Radius.circular(message.isUser ? 4 : 16),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 5,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Text(
              message.text,
              style: TextStyle(
                color: message.isUser ? Colors.white : null,
              ),
            ),
          ),
        ),
      ),
    );
  }
} 