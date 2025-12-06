import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/user_provider.dart';
import 'providers/schedule_provider.dart';
import 'providers/comment_provider.dart';
import 'providers/irregular_provider.dart';
import 'providers/course_provider.dart';
import 'providers/section_provider.dart';
import 'providers/student_provider.dart';
import 'services/collaboration_manager.dart';
import 'screens/login_screen.dart';
import 'screens/faculty_home_screen.dart';
import 'screens/scheduler_home_screen.dart';
import 'screens/student_home_screen.dart';
import 'screens/irregular_students_screen.dart';
import 'screens/section_management_screen.dart';
import 'screens/student_management_screen.dart';
import 'screens/comments_management_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => UserProvider()),
        ChangeNotifierProvider(create: (_) => ScheduleProvider()),
        ChangeNotifierProvider(create: (_) => CommentProvider()),
        ChangeNotifierProvider(create: (_) => IrregularProvider()),
        ChangeNotifierProvider(create: (_) => CourseProvider()),
        ChangeNotifierProvider(create: (_) => SectionProvider()),
        ChangeNotifierProvider(create: (_) => StudentProvider()),
        ChangeNotifierProvider(create: (_) => CollaborationManager()),
      ],
      child: MaterialApp(
        title: 'SmartSchedule',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primarySwatch: Colors.indigo,
          fontFamily: 'Roboto',
          visualDensity: VisualDensity.adaptivePlatformDensity,
        ),
        home: const AuthWrapper(),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/faculty-home': (context) => const FacultyHomeScreen(),
          '/scheduler-home': (context) => const SchedulerHomeScreen(),
          '/irregular-students': (context) => const IrregularStudentsScreen(),
          '/section-management': (context) => const SectionManagementScreen(),
          '/student-management': (context) => const StudentManagementScreen(),
          '/comments-management': (context) => const CommentsManagementScreen(),
        },
      ),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    await context.read<UserProvider>().loadFromPreferences();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<UserProvider>(
      builder: (context, userProvider, _) {
        if (userProvider.isLoggedIn) {
          // Route based on user role
          final userRole = userProvider.userRole;

          switch (userRole) {
            case 'Scheduler':
              return const SchedulerHomeScreen();
            case 'Student':
              return const StudentHomeScreen();
            case 'Faculty':
            case 'LoadCommittee':
            default:
              return const FacultyHomeScreen();
          }
        } else {
          return const LoginScreen();
        }
      },
    );
  }
}
