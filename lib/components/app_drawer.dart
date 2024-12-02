// ignore_for_file: unused_element

import 'package:flutter/material.dart';
import 'package:feluda_ai/utils/theme.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:feluda_ai/services/conversation_service.dart';
import 'package:feluda_ai/utils/assets.dart';
import 'package:feluda_ai/pages/chat_page.dart';

class ChatSession {
  final String sessionId;
  final String lastMessage;
  final int messageCount;
  final DateTime timestamp;
  final Map<String, dynamic>? metadata;

  ChatSession({
    required this.sessionId,
    required this.lastMessage,
    required this.messageCount,
    required this.timestamp,
    this.metadata,
  });
}

class AppDrawer extends StatefulWidget {
  const AppDrawer({super.key});

  @override
  State<AppDrawer> createState() => _AppDrawerState();
}

class _AppDrawerState extends State<AppDrawer> {
  final List<ChatSession> _chatSessions = [];
  String? _userEmail;
  String? _displayName;
  bool _isLoading = true;
  final _conversationService = ConversationService();
  RealtimeChannel? _subscription;

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
    _loadChatSessions();
    _setupChatUpdateListener();
  }

  void _setupChatUpdateListener() {
    // Create the channel first
    _subscription = Supabase.instance.client
        .channel('public:conversations')
        .on(
          RealtimeListenTypes.postgresChanges,
          ChannelFilter(
            event: 'INSERT',
            schema: 'public',
            table: 'conversations',
          ),
          (payload, [ref]) {
            _loadChatSessions();
          },
        );

    // Then subscribe to it
    if (_subscription != null) {
      _subscription!.subscribe();
    }
  }

  @override
  void dispose() {
    // Clean up subscription
    if (_subscription != null) {
      _subscription!.unsubscribe();
    }
    super.dispose();
  }

  Future<void> _loadUserProfile() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        final response = await Supabase.instance.client
            .from('user_profiles')
            .select()
            .eq('user_id', user.id)
            .single();

        if (mounted) {
          setState(() {
            _userEmail = user.email;
            _displayName = response['display_name'] as String?;
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading user profile: $e');
    }
  }

  Future<void> _loadChatSessions() async {
    try {
      setState(() => _isLoading = true);

      final user = Supabase.instance.client.auth.currentUser;
      
      // First get all sessions for the user
      final sessionsResponse = await Supabase.instance.client
          .from('conversations')
          .select('''
            session_id,
            user_id,
            timestamp,
            prompt,
            response,
            metadata
          ''')
          .eq('is_deleted', false)
          .eq('user_id', user?.id)
          .order('timestamp', ascending: false);

      // Process and group by session
      final Map<String, ChatSession> sessionMap = {};
      
      for (final msg in sessionsResponse as List) {
        final sessionId = msg['session_id'] as String;
        
        if (!sessionMap.containsKey(sessionId)) {
          // Get the last message for preview
          final lastMessage = msg['prompt'] as String;
          
          // Count messages in this session using count() function
          final countResponse = await Supabase.instance.client
              .rpc('count_session_messages', params: {
                'p_session_id': sessionId,
              });
              
          final messageCount = (countResponse as int?) ?? 0;

          sessionMap[sessionId] = ChatSession(
            sessionId: sessionId,
            lastMessage: lastMessage,
            messageCount: messageCount,
            timestamp: DateTime.parse(msg['timestamp']),
            metadata: msg['metadata'] as Map<String, dynamic>?,
          );
        }
      }

      // Convert to list and sort by timestamp
      final sessions = sessionMap.values.toList()
        ..sort((a, b) => b.timestamp.compareTo(a.timestamp));

      // Take only the last 7 sessions
      final recentSessions = sessions.take(7).toList();

      if (mounted) {
        setState(() {
          _chatSessions.clear();
          _chatSessions.addAll(recentSessions);
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading chat sessions: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading chat sessions: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleDeleteSession(String sessionId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Chat'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Are you sure you want to delete this chat?'),
            const SizedBox(height: 8),
            Text(
              'This action cannot be undone.',
              style: TextStyle(
                color: Colors.red.shade300,
                fontSize: 12,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _conversationService.deleteChatSession(sessionId);
        await _loadChatSessions();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Chat deleted successfully')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error deleting chat: $e')),
          );
        }
      }
    }
  }

  void _showProfileMenu() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.person_outline),
              title: const Text('Edit Profile'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/profile');
              },
            ),
            ListTile(
              leading: const Icon(Icons.settings_outlined),
              title: const Text('Settings'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/settings');
              },
            ),
            const Divider(),
            ListTile(
              leading: Icon(
                Icons.logout,
                color: Colors.red.shade300,
              ),
              title: Text(
                'Logout',
                style: TextStyle(
                  color: Colors.red.shade300,
                ),
              ),
              onTap: () async {
                try {
                  await Supabase.instance.client.auth.signOut();
                  if (mounted) {
                    Navigator.pushReplacementNamed(context, '/login');
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Error signing out: $e')),
                    );
                  }
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: Colors.white.withOpacity(0.95),
      child: Column(
        children: [
          // Profile Header
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [FeludaTheme.primaryColor, Color(0xFF7C3AED)],
              ),
            ),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(2),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: Colors.white.withOpacity(0.5),
                              width: 2,
                            ),
                          ),
                          child: CircleAvatar(
                            radius: 30,
                            backgroundImage: AssetImage(Assets.userAvatar),
                            onBackgroundImageError: (exception, stackTrace) {
                              debugPrint('Error loading avatar: $exception');
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _displayName ?? 'User',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                _userEmail ?? '',
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.8),
                                  fontSize: 14,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // New Chat Button
          Padding(
            padding: const EdgeInsets.all(12),
            child: FilledButton.icon(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/chat');
              },
              style: FilledButton.styleFrom(
                backgroundColor: FeludaTheme.primaryColor,
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              icon: const Icon(Icons.add),
              label: const Text('New Chat'),
            ),
          ),

          // Chat Sessions
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    itemCount: _chatSessions.length,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    itemBuilder: (context, index) {
                      final session = _chatSessions[index];
                      final colors = [
                        Colors.blue,
                        Colors.purple,
                        Colors.pink,
                        Colors.indigo,
                        Colors.teal,
                        Colors.cyan,
                        Colors.green,
                      ];
                      final color = colors[index % colors.length];

                      return Card(
                        margin: const EdgeInsets.symmetric(
                          horizontal: 4,
                          vertical: 4,
                        ),
                        elevation: 0,
                        color: Colors.transparent,
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: color.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              Icons.chat_bubble_outline,
                              color: color,
                              size: 20,
                            ),
                          ),
                          title: Text(
                            session.lastMessage,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          subtitle: Text(
                            '${session.messageCount} messages • ${_formatTimestamp(session.timestamp)}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          trailing: PopupMenuButton(
                            icon: const Icon(Icons.more_vert, size: 20),
                            itemBuilder: (context) => [
                              PopupMenuItem(
                                child: const Row(
                                  children: [
                                    Icon(Icons.visibility, size: 20),
                                    SizedBox(width: 8),
                                    Text('View'),
                                  ],
                                ),
                                onTap: () {
                                  Navigator.pop(context);
                                  Navigator.pushNamed(
                                    context,
                                    '/chat',
                                    arguments: {'sessionId': session.sessionId},
                                  );
                                },
                              ),
                              PopupMenuItem(
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.delete,
                                      size: 20,
                                      color: Colors.red.shade300,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Delete',
                                      style: TextStyle(
                                        color: Colors.red.shade300,
                                      ),
                                    ),
                                  ],
                                ),
                                onTap: () {
                                  Navigator.pop(context);
                                  _handleDeleteSession(session.sessionId);
                                },
                              ),
                            ],
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          onTap: () {
                            Navigator.pop(context);
                            Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ChatPage(sessionId: session.sessionId),
                              ),
                            );
                          },
                        ),
                      );
                    },
                  ),
          ),

          // Bottom Actions
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: const Icon(Icons.settings),
                  title: const Text('Settings'),
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.pushNamed(context, '/settings');
                  },
                ),
                ListTile(
                  leading: Icon(
                    Icons.logout,
                    color: Colors.red.shade300,
                  ),
                  title: Text(
                    'Logout',
                    style: TextStyle(
                      color: Colors.red.shade300,
                    ),
                  ),
                  onTap: () async {
                    try {
                      await Supabase.instance.client.auth.signOut();
                      if (mounted) {
                        Navigator.pushReplacementNamed(context, '/login');
                      }
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Error signing out: $e')),
                        );
                      }
                    }
                  },
                ),
              ],
            ),
          ),
        ],
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