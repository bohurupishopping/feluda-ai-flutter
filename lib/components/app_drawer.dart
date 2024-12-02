// ignore_for_file: unused_element

import 'package:flutter/material.dart';
import 'package:feluda_ai/utils/theme.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:feluda_ai/services/conversation_service.dart';
import 'package:feluda_ai/utils/assets.dart';
import 'package:feluda_ai/pages/chat_page.dart';
import 'package:feluda_ai/pages/imagine_page.dart';
import 'dart:ui';

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

class _AppDrawerState extends State<AppDrawer> with SingleTickerProviderStateMixin {
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
    _subscription = Supabase.instance.client
        .channel('public:conversations')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'conversations',
          callback: (payload) {
            if (mounted) {
              _loadChatSessions();
            }
          },
        );

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
    if (!mounted) return;

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
          .eq('user_id', user?.id ?? '')
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

      if (!mounted) return;

      setState(() {
        _chatSessions.clear();
        _chatSessions.addAll(recentSessions);
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading chat sessions: $e');
      
      if (!mounted) return;
      
      setState(() => _isLoading = false);
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error loading chat sessions: $e'),
          backgroundColor: Colors.red,
        ),
      );
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
    return ClipRRect(
      borderRadius: const BorderRadius.only(
        topRight: Radius.circular(24),
        bottomRight: Radius.circular(24),
      ),
      child: Drawer(
        backgroundColor: Colors.transparent,
        child: Stack(
          children: [
            // Glassmorphic background
            BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      const Color(0xFFCCEBFC).withOpacity(0.95),  // Lighter blue
                      const Color(0xFFFFF6F3).withOpacity(0.9),   // Lighter peach
                    ],
                    stops: const [0.0, 0.8],
                  ),
                  border: Border(
                    right: BorderSide(
                      color: Colors.white.withOpacity(0.5),
                      width: 1,
                    ),
                  ),
                ),
              ),
            ),
            Column(
              children: [
                // Profile Header
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Theme.of(context).primaryColor,
                        Color.lerp(
                          Theme.of(context).primaryColor,
                          Colors.purple,
                          0.3,
                        )!,
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Theme.of(context).primaryColor.withOpacity(0.2),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              _buildAvatarContainer(),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _displayName ?? 'User',
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.white,
                                        shadows: [
                                          Shadow(
                                            color: Colors.black26,
                                            offset: Offset(0, 2),
                                            blurRadius: 4,
                                          ),
                                        ],
                                      ),
                                    ),
                                    Text(
                                      _userEmail ?? '',
                                      style: TextStyle(
                                        color: Colors.white.withOpacity(0.9),
                                        fontSize: 14,
                                        shadows: const [
                                          Shadow(
                                            color: Colors.black12,
                                            offset: Offset(0, 1),
                                            blurRadius: 2,
                                          ),
                                        ],
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
                  child: _buildNewChatButton(),
                ),

                // Imagine Button
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          const Color(0xFF4B7BFF).withOpacity(0.2),
                          const Color(0xFF6C63FF).withOpacity(0.15),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: const Color(0xFF4B7BFF).withOpacity(0.2),
                      ),
                    ),
                    child: Icon(
                      Icons.image_outlined,
                      color: Theme.of(context).primaryColor,
                      size: 20,
                    ),
                  ),
                  title: const Text(
                    'Imagine',
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  subtitle: Text(
                    'Generate AI Images',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey.shade600,
                    ),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const ImaginePage(),
                      ),
                    );
                  },
                ),

                // Add a Divider after the Imagine button
                const Divider(height: 24),

                // Chat Sessions List
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : ListView.builder(
                          itemCount: _chatSessions.length,
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          itemBuilder: (context, index) {
                            final session = _chatSessions[index];
                            final colors = [
                              const Color(0xFF4B7BFF),  // Blue
                              const Color(0xFF6C63FF),  // Indigo
                              const Color(0xFF8B5CF6),  // Purple
                              const Color(0xFFEC4899),  // Pink
                              const Color(0xFF0D9488),  // Teal
                              const Color(0xFF0891B2),  // Cyan
                              const Color(0xFF059669),  // Green
                            ];
                            final color = colors[index % colors.length];
                            return _buildSessionCard(session, color);
                          },
                        ),
                ),

                // Bottom Actions
                _buildBottomActions(),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatarContainer() {
    return Container(
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withOpacity(0.9),
            Colors.white.withOpacity(0.7),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            spreadRadius: 1,
          ),
        ],
      ),
      child: CircleAvatar(
        radius: 30,
        backgroundImage: AssetImage(Assets.userAvatar),
        onBackgroundImageError: (exception, stackTrace) {
          debugPrint('Error loading avatar: $exception');
        },
      ),
    );
  }

  Widget _buildNewChatButton() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Theme.of(context).primaryColor,
            Color.lerp(
              Theme.of(context).primaryColor,
              Colors.purple,
              0.3,
            )!,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).primaryColor.withOpacity(0.2),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.pop(context);
            Navigator.pushNamed(context, '/chat');
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              vertical: 12,
              horizontal: 16,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.add_circle_outline,
                  color: Colors.white,
                  size: 20,
                ),
                const SizedBox(width: 8),
                const Text(
                  'New Chat',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSessionCard(ChatSession session, Color color) {
    return Card(
      margin: const EdgeInsets.symmetric(
        horizontal: 4,
        vertical: 4,
      ),
      elevation: 0,
      color: Colors.white.withOpacity(0.7),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: color.withOpacity(0.1),
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 8,
        ),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                color.withOpacity(0.2),
                color.withOpacity(0.1),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: color.withOpacity(0.2),
            ),
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
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey.shade600,
          ),
        ),
        trailing: _buildSessionMenu(session),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
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
  }

  Widget _buildBottomActions() {
    return ClipRRect(
      borderRadius: const BorderRadius.only(
        topLeft: Radius.circular(20),
        topRight: Radius.circular(20),
      ),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withOpacity(0.9),
                Colors.white.withOpacity(0.8),
              ],
            ),
            border: Border(
              top: BorderSide(
                color: Colors.grey.withOpacity(0.1),
                width: 1,
              ),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 20,
                offset: const Offset(0, -5),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildActionButton(
                icon: Icons.settings,
                label: 'Settings',
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushNamed(context, '/settings');
                },
              ),
              _buildActionButton(
                icon: Icons.logout,
                label: 'Logout',
                color: Colors.red.shade300,
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
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required Function() onTap,
    Color color = Colors.black,
  }) {
    return ListTile(
      leading: Icon(
        icon,
        color: color,
      ),
      title: Text(
        label,
        style: TextStyle(
          color: color,
        ),
      ),
      onTap: onTap,
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

  Widget _buildSessionMenu(ChatSession session) {
    return PopupMenuButton(
      icon: Icon(
        Icons.more_vert,
        size: 20,
        color: Colors.grey.shade600,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      elevation: 8,
      color: Colors.white.withOpacity(0.98),
      position: PopupMenuPosition.under,
      itemBuilder: (context) => [
        PopupMenuItem(
          height: 48,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Theme.of(context).primaryColor.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.visibility_outlined,
                  size: 16,
                  color: Theme.of(context).primaryColor,
                ),
              ),
              const SizedBox(width: 12),
              const Text('View'),
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
          height: 48,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.delete_outline,
                  size: 16,
                  color: Colors.red.shade300,
                ),
              ),
              const SizedBox(width: 12),
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
    );
  }
} 