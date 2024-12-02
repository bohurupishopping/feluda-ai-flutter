import 'package:flutter/material.dart';
import 'package:feluda_ai/utils/theme.dart';
import 'package:feluda_ai/utils/assets.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  String? _userEmail;
  String? _displayName;
  bool _isLoading = false;
  DateTime? _joinDate;

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    try {
      setState(() => _isLoading = true);
      
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        final response = await Supabase.instance.client
            .from('user_profiles')
            .select()
            .eq('user_id', user.id)
            .single();

        setState(() {
          _userEmail = user.email;
          _displayName = response['display_name'] as String?;
          _joinDate = DateTime.parse(response['created_at'] as String);
        });
      }
    } catch (e) {
      debugPrint('Error loading user profile: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading profile: $e')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _updateDisplayName() async {
    final TextEditingController controller = TextEditingController(text: _displayName);
    
    final newName = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Update Display Name'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Display Name',
            hintText: 'Enter your display name',
          ),
          autofocus: true,
          textCapitalization: TextCapitalization.words,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (newName != null && newName.isNotEmpty) {
      try {
        setState(() => _isLoading = true);
        
        final user = Supabase.instance.client.auth.currentUser;
        if (user != null) {
          await Supabase.instance.client
              .from('user_profiles')
              .update({'display_name': newName})
              .eq('user_id', user.id);

          setState(() => _displayName = newName);
          
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Profile updated successfully')),
            );
          }
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error updating profile: $e')),
          );
        }
      } finally {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [FeludaTheme.primaryColor, Color(0xFF7C3AED)],
                      ),
                    ),
                    child: Column(
                      children: [
                        const SizedBox(height: 32),
                        CircleAvatar(
                          radius: 50,
                          backgroundImage: AssetImage(Assets.userAvatar),
                          onBackgroundImageError: (exception, stackTrace) {
                            debugPrint('Error loading avatar: $exception');
                          },
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _displayName ?? 'Set display name',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _userEmail ?? '',
                          style: const TextStyle(
                            color: Colors.white70,
                          ),
                        ),
                        if (_joinDate != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Joined ${_formatDate(_joinDate!)}',
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                        ],
                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Card(
                          child: ListTile(
                            title: const Text('Display Name'),
                            subtitle: Text(_displayName ?? 'Not set'),
                            trailing: IconButton(
                              icon: const Icon(Icons.edit),
                              onPressed: _updateDisplayName,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Card(
                          child: ListTile(
                            title: const Text('Email'),
                            subtitle: Text(_userEmail ?? 'Not available'),
                            trailing: const Icon(Icons.lock),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${months[date.month - 1]} ${date.year}';
  }
} 