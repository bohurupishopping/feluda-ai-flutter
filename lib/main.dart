import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:feluda_ai/pages/auth/login_page.dart';
import 'package:feluda_ai/pages/chat_page.dart';
import 'package:feluda_ai/pages/settings_page.dart';
import 'package:feluda_ai/pages/profile_page.dart';
import 'package:feluda_ai/utils/theme.dart';
import 'package:feluda_ai/utils/constants.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Supabase
  await Supabase.initialize(
    url: Constants.supabaseUrl,
    anonKey: Constants.supabaseAnonKey,
  );
  
  runApp(const FeludaApp());
}

class FeludaApp extends StatelessWidget {
  const FeludaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Feluda AI',
      theme: FeludaTheme.lightTheme,
      darkTheme: FeludaTheme.darkTheme,
      home: const AuthWrapper(),
      routes: {
        '/chat': (context) {
          final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
          return ChatPage(sessionId: args?['sessionId'] as String?);
        },
        '/settings': (context) => const SettingsPage(),
        '/login': (context) => const LoginPage(),
        '/profile': (context) => const ProfilePage(),
      },
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: Supabase.instance.client.auth.onAuthStateChange
          .map((event) => event.session?.user),
      builder: (context, snapshot) {
        if (snapshot.hasData && snapshot.data != null) {
          // Get route arguments if any
          final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
          return ChatPage(sessionId: args?['sessionId'] as String?);
        }
        return const LoginPage();
      },
    );
  }
}
