import 'package:flutter/material.dart';
import 'package:feluda_ai/utils/theme.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:feluda_ai/services/api_service.dart';

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
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMessage> _messages = [];
  final ApiService _apiService = ApiService();
  bool _isLoading = false;

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;

    setState(() {
      _messages.add(ChatMessage(
        text: message,
        isUser: true,
        timestamp: DateTime.now(),
        role: 'user',
      ));
      _isLoading = true;
      _messageController.clear();
    });

    _scrollToBottom();

    try {
      // Convert previous messages to the format expected by the API
      final previousMessages = _messages
          .map((msg) => msg.toJson())
          .toList();

      // Get AI response
      final response = await _apiService.getChatCompletion(
        message,
        previousMessages,
      );

      if (mounted) {
        setState(() {
          _messages.add(ChatMessage(
            text: response,
            isUser: false,
            timestamp: DateTime.now(),
            role: 'assistant',
          ));
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Feluda AI'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              Supabase.instance.client.auth.signOut();
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Container(
              color: FeludaTheme.backgroundColor,
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(FeludaTheme.spacing16),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final message = _messages[index];
                  return ChatBubble(message: message);
                },
              ),
            ),
          ),
          if (_isLoading)
            Container(
              padding: const EdgeInsets.all(FeludaTheme.spacing16),
              child: const Row(
                children: [
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  SizedBox(width: FeludaTheme.spacing8),
                  Text('AI is typing...'),
                ],
              ),
            ),
          Container(
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            padding: EdgeInsets.only(
              left: FeludaTheme.spacing16,
              right: FeludaTheme.spacing16,
              top: FeludaTheme.spacing16,
              bottom: MediaQuery.of(context).padding.bottom + FeludaTheme.spacing16,
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: FeludaTheme.backgroundColor,
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
                const SizedBox(width: FeludaTheme.spacing8),
                FloatingActionButton(
                  onPressed: _sendMessage,
                  elevation: 0,
                  backgroundColor: FeludaTheme.primaryColor,
                  child: const Icon(
                    Icons.send,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ChatBubble extends StatelessWidget {
  final ChatMessage message;

  const ChatBubble({
    super.key,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
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
    );
  }
} 