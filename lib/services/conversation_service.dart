import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:feluda_ai/pages/chat_page.dart';
import 'package:uuid/uuid.dart';

class ConversationService {
  final String sessionId;
  final SupabaseClient _supabase = Supabase.instance.client;
  final _uuid = const Uuid();

  ConversationService({String? sessionId}) 
    : sessionId = sessionId ?? const Uuid().v4();

  Future<User?> _getCurrentUser() async {
    try {
      final session = await _supabase.auth.currentSession;
      return session?.user;
    } catch (e) {
      throw Exception('Error getting current user: $e');
    }
  }

  Future<String> saveConversation(String prompt, String response) async {
    if (prompt.isEmpty || response.isEmpty) {
      throw Exception('Prompt and response are required');
    }

    try {
      final user = await _getCurrentUser();
      final messageId = _uuid.v4();
      final timestamp = DateTime.now().toUtc();

      final data = {
        'user_id': user?.id,
        'session_id': sessionId,
        'message_id': messageId,
        'prompt': prompt,
        'response': response,
        'timestamp': timestamp.toIso8601String(),
        'metadata': {
          'model': 'feluda-ai',
          'version': '1.0',
          'client': 'mobile',
        },
        'is_deleted': false,
      };

      await _supabase
          .from('conversations')
          .insert(data);

      return messageId;
    } catch (e) {
      throw Exception('Error saving conversation: $e');
    }
  }

  Future<List<ChatMessage>> loadChatSession(String sessionId) async {
    try {
      final user = await _getCurrentUser();
      
      final response = await _supabase
          .from('conversations')
          .select()
          .eq('session_id', sessionId)
          .eq('is_deleted', false)
          .order('timestamp');

      final List<dynamic> result = response;

      // Filter by user_id based on RLS policies
      final filteredResult = result.where((row) => 
        user != null ? row['user_id'] == user.id : row['user_id'] == null
      ).toList();

      return filteredResult.expand((msg) => [
        ChatMessage(
          text: msg['prompt'],
          isUser: true,
          timestamp: DateTime.parse(msg['timestamp']),
          role: 'user',
        ),
        ChatMessage(
          text: msg['response'],
          isUser: false,
          timestamp: DateTime.parse(msg['timestamp']),
          role: 'assistant',
        ),
      ]).toList();
    } catch (e) {
      throw Exception('Error loading chat session: $e');
    }
  }

  Future<void> clearConversationHistory() async {
    try {
      final user = await _getCurrentUser();
      
      final query = _supabase
          .from('conversations')
          .update({'is_deleted': true})
          .eq('session_id', sessionId);

      if (user != null) {
        await query.eq('user_id', user.id);
      } else {
        await query.is_('user_id', null);
      }
    } catch (e) {
      throw Exception('Error clearing conversation history: $e');
    }
  }

  Future<Map<String, dynamic>> getSessionStats() async {
    try {
      final response = await _supabase
          .from('conversation_stats')
          .select()
          .eq('session_id', sessionId)
          .single();

      if (response == null) {
        return {
          'messageCount': 0,
          'sessionStart': DateTime.now(),
          'sessionEnd': DateTime.now(),
        };
      }

      return {
        'messageCount': response['message_count'] as int,
        'sessionStart': DateTime.parse(response['session_start'] as String),
        'sessionEnd': DateTime.parse(response['session_end'] as String),
      };
    } catch (e) {
      throw Exception('Error getting session stats: $e');
    }
  }

  Future<void> deleteChatSession(String sessionId) async {
    try {
      final user = await _getCurrentUser();
      
      final query = _supabase
          .from('conversations')
          .update({'is_deleted': true})
          .eq('session_id', sessionId);

      if (user != null) {
        await query.eq('user_id', user.id);
      } else {
        await query.is_('user_id', null);
      }
    } catch (e) {
      throw Exception('Error deleting chat session: $e');
    }
  }

  String getSessionId() => sessionId;
} 