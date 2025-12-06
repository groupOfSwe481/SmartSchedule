import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../api/schedule_service.dart';
import '../providers/user_provider.dart';
import 'faculty_home_screen.dart';
import 'scheduler_home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  int _currentStep = 0; // 0: Login/Register Tabs, 1: Verification

  // --- Login Controllers ---
  final _loginEmailController = TextEditingController();
  final _loginPasswordController = TextEditingController();
  bool _loginPasswordVisible = false;

  // --- Verification Controller ---
  final _verificationCodeController = TextEditingController();

  // --- Register Controllers ---
  final _registerFirstNameController = TextEditingController();
  final _registerLastNameController = TextEditingController();
  final _registerEmailController = TextEditingController();
  final _registerPasswordController = TextEditingController();
  bool _registerPasswordVisible = false;
  String _selectedRole = 'Student';

  // --- State Variables ---
  bool _isLoading = false;
  String? _currentEmail;
  String? _currentPassword;

  @override
  void dispose() {
    _loginEmailController.dispose();
    _loginPasswordController.dispose();
    _verificationCodeController.dispose();
    _registerFirstNameController.dispose();
    _registerLastNameController.dispose();
    _registerEmailController.dispose();
    _registerPasswordController.dispose();
    super.dispose();
  }

  // --- Helpers ---
  void _showAlert(String message, bool isError) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  // --- Action: Login ---
  Future<void> _handleLogin() async {
    if (_loginEmailController.text.isEmpty ||
        _loginPasswordController.text.isEmpty) {
      _showAlert('Please fill in all fields', true);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final result = await ScheduleService.login(
        email: _loginEmailController.text.trim(),
        password: _loginPasswordController.text,
      );

      if (mounted) {
        if (result['success']) {
          _currentEmail = _loginEmailController.text.trim();
          _currentPassword = _loginPasswordController.text;
          _handleSuccessfulLogin(result['user'], result['token']);
        } else if (result['requiresVerification'] == true) {
          // If 2FA is needed, move to verification step
          _currentEmail = _loginEmailController.text.trim();
          _currentPassword = _loginPasswordController.text;
          _showAlert(result['message'] ?? 'Verification code sent', false);
          setState(() => _currentStep = 1);
        } else {
          _showAlert(result['message'] ?? 'Login failed', true);
        }
      }
    } catch (e) {
      if (mounted) _showAlert('Error: ${e.toString()}', true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // --- Action: Verify OTP ---
  Future<void> _handleVerification() async {
    if (_verificationCodeController.text.isEmpty ||
        _verificationCodeController.text.length != 6) {
      _showAlert('Enter a valid 6-digit code', true);
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Call login again, but this time with the code
      final result = await ScheduleService.login(
        email: _currentEmail!,
        password: _currentPassword!,
        verificationCode: _verificationCodeController.text,
      );

      if (mounted) {
        if (result['success']) {
          _handleSuccessfulLogin(result['user'], result['token']);
        } else {
          _showAlert(result['message'] ?? 'Invalid code', true);
        }
      }
    } catch (e) {
      if (mounted) _showAlert('Error: ${e.toString()}', true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // --- Action: Successful Login & Routing ---
  void _handleSuccessfulLogin(Map<String, dynamic> user, String token) {
    context.read<UserProvider>().setUser(user, token);
    _showAlert('Welcome back, ${user['First_Name']}', false);

    Future.delayed(const Duration(milliseconds: 800), () {
      if (mounted) {
        // Navigate based on user role
        final userRole = user['role'] as String?;
        Widget homeScreen;

        switch (userRole) {
          case 'Scheduler':
            homeScreen = const SchedulerHomeScreen();
            break;
          case 'Faculty':
          case 'LoadCommittee':
          case 'Student':
          default:
            homeScreen = const FacultyHomeScreen();
            break;
        }

        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => homeScreen),
          (route) => false,
        );
      }

      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => targetScreen),
        (route) => false,
      );
    });
  }

  // --- Action: Register ---
  Future<void> _handleRegister() async {
    if (_registerFirstNameController.text.isEmpty ||
        _registerLastNameController.text.isEmpty ||
        _registerEmailController.text.isEmpty ||
        _registerPasswordController.text.isEmpty) {
      _showAlert('Please fill in all fields', true);
      return;
    }

    if (_registerPasswordController.text.length < 6) {
      _showAlert('Password must be at least 6 characters', true);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final result = await ScheduleService.register(
        firstName: _registerFirstNameController.text.trim(),
        lastName: _registerLastNameController.text.trim(),
        email: _registerEmailController.text.trim(),
        password: _registerPasswordController.text,
        role: _selectedRole,
      );

      if (mounted) {
        if (result['success']) {
          _showAlert('Registration successful! Please login.', false);
          Future.delayed(const Duration(milliseconds: 1500), () {
            if (mounted) {
              _clearRegistrationForm();
              // Switch back to Login tab (handled by TabController usually,
              // but here we just reset state if needed or user manually switches)
              _showAlert('Please switch to Login tab', false);
            }
          });
        } else {
          _showAlert(result['message'] ?? 'Registration failed', true);
        }
      }
    } catch (e) {
      if (mounted) _showAlert('Error: ${e.toString()}', true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _clearRegistrationForm() {
    _registerFirstNameController.clear();
    _registerLastNameController.clear();
    _registerEmailController.clear();
    _registerPasswordController.clear();
    setState(() => _selectedRole = 'Student');
  }

  void _backToLogin() {
    setState(() {
      _currentStep = 0;
      _verificationCodeController.clear();
    });
  }

  // --- UI Building ---
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF667eea), Color(0xFF764ba2)],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(
              horizontal: 16,
              vertical: MediaQuery.of(context).viewInsets.bottom > 0 ? 16 : 32,
            ),
            child: _currentStep == 0
                ? _buildTabsWidget()
                : _buildVerificationWidget(),
          ),
        ),
      ),
    );
  }

  Widget _buildTabsWidget() {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header Area
          Container(
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF667eea), Color(0xFF764ba2)],
              ),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            child: Column(
              children: const [
                Icon(Icons.calendar_month, size: 40, color: Colors.white),
                SizedBox(height: 8),
                Text(
                  'SmartSchedule',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                Text(
                  'Academic scheduling solution',
                  style: TextStyle(color: Color(0xFFE8E8FF), fontSize: 12),
                ),
              ],
            ),
          ),
          // Tabs
          DefaultTabController(
            length: 2,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const TabBar(
                  labelColor: Color(0xFF667eea),
                  unselectedLabelColor: Colors.grey,
                  indicatorColor: Color(0xFF667eea),
                  tabs: [
                    Tab(text: 'Login'),
                    Tab(text: 'Register'),
                  ],
                ),
                SizedBox(
                  height: 420, // Fixed height for tab content
                  child: TabBarView(
                    children: [_buildLoginForm(), _buildRegistrationForm()],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoginForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _loginEmailController,
            textInputAction: TextInputAction.next,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(
              labelText: 'Email Address',
              prefixIcon: const Icon(Icons.email_outlined),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _loginPasswordController,
            textInputAction: TextInputAction.done,
            obscureText: !_loginPasswordVisible,
            decoration: InputDecoration(
              labelText: 'Password',
              prefixIcon: const Icon(Icons.lock_outlined),
              suffixIcon: IconButton(
                icon: Icon(
                  _loginPasswordVisible
                      ? Icons.visibility
                      : Icons.visibility_off,
                ),
                onPressed: () => setState(
                  () => _loginPasswordVisible = !_loginPasswordVisible,
                ),
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleLogin,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF667eea),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 24,
                      width: 24,
                      child: CircularProgressIndicator(color: Colors.white),
                    )
                  : const Text(
                      'Login',
                      style: TextStyle(fontSize: 16, color: Colors.white),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRegistrationForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _registerFirstNameController,
            decoration: InputDecoration(
              labelText: 'First Name',
              prefixIcon: const Icon(Icons.person_outlined),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _registerLastNameController,
            decoration: InputDecoration(
              labelText: 'Last Name',
              prefixIcon: const Icon(Icons.person_outlined),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _registerEmailController,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(
              labelText: 'Email Address',
              prefixIcon: const Icon(Icons.email_outlined),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _registerPasswordController,
            obscureText: !_registerPasswordVisible,
            decoration: InputDecoration(
              labelText: 'Password',
              prefixIcon: const Icon(Icons.lock_outlined),
              suffixIcon: IconButton(
                icon: Icon(
                  _registerPasswordVisible
                      ? Icons.visibility
                      : Icons.visibility_off,
                ),
                onPressed: () => setState(
                  () => _registerPasswordVisible = !_registerPasswordVisible,
                ),
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _selectedRole,
            items: ['Student', 'Faculty', 'Committee', 'Scheduler']
                .map((role) => DropdownMenuItem(value: role, child: Text(role)))
                .toList(),
            onChanged: (val) => setState(() => _selectedRole = val!),
            decoration: InputDecoration(
              labelText: 'Role',
              prefixIcon: const Icon(Icons.badge_outlined),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleRegister,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF667eea),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text(
                      'Register',
                      style: TextStyle(fontSize: 16, color: Colors.white),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVerificationWidget() {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          children: [
            const Icon(
              Icons.shield_outlined,
              size: 60,
              color: Color(0xFF667eea),
            ),
            const SizedBox(height: 20),
            const Text(
              'Verify Your Email',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Text(
              'Enter the code sent to $_currentEmail',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _verificationCodeController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              textAlign: TextAlign.center,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: const TextStyle(fontSize: 24, letterSpacing: 8),
              decoration: InputDecoration(
                hintText: '000000',
                counterText: '',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleVerification,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF667eea),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text(
                        'Verify & Login',
                        style: TextStyle(color: Colors.white),
                      ),
              ),
            ),
            const SizedBox(height: 12),
            TextButton.icon(
              onPressed: _backToLogin,
              icon: const Icon(Icons.arrow_back),
              label: const Text('Back to Login'),
            ),
          ],
        ),
      ),
    );
  }
}
