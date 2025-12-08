import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../api/schedule_service.dart';
import '../providers/user_provider.dart';
import 'faculty_home_screen.dart';
import 'scheduler_home_screen.dart';
import 'student_home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // Step 0: Login, Step 1: Verification, Step 2: Forgot Password, Step 3: Reset Password
  int _currentStep = 0;

  final _loginEmailController = TextEditingController();
  final _loginPasswordController = TextEditingController();
  bool _loginPasswordVisible = false;

  final _verificationCodeController = TextEditingController();

  final _forgotEmailController = TextEditingController();
  final _resetCodeController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _newPasswordVisible = false;
  bool _confirmPasswordVisible = false;

  bool _isLoading = false;
  String? _currentEmail;
  String? _currentPassword;
  String? _resetEmail;

  @override
  void dispose() {
    _loginEmailController.dispose();
    _loginPasswordController.dispose();
    _verificationCodeController.dispose();
    _forgotEmailController.dispose();
    _resetCodeController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _showAlert(String message, bool isError) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
        duration: const Duration(seconds: 5),
      ),
    );
  }

  Future<void> _handleLogin() async {
    if (_loginEmailController.text.isEmpty || _loginPasswordController.text.isEmpty) {
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
          _currentEmail = _loginEmailController.text.trim();
          _currentPassword = _loginPasswordController.text;
          _showAlert(result['message'] ?? 'Verification code sent', false);
          setState(() => _currentStep = 1);
        } else {
          _showAlert(result['message'] ?? 'Login failed', true);
        }
      }
    } catch (e) {
      if (mounted) {
        _showAlert('Error: ${e.toString()}', true);
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleVerification() async {
    if (_verificationCodeController.text.isEmpty) {
      _showAlert('Please enter verification code', true);
      return;
    }

    if (_verificationCodeController.text.length != 6) {
      _showAlert('Verification code must be 6 digits', true);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final result = await ScheduleService.login(
        email: _currentEmail!,
        password: _currentPassword!,
        verificationCode: _verificationCodeController.text,
      );

      if (mounted) {
        if (result['success']) {
          _handleSuccessfulLogin(result['user'], result['token']);
        } else {
          _showAlert(result['message'] ?? 'Invalid verification code', true);
        }
      }
    } catch (e) {
      if (mounted) {
        _showAlert('Error: ${e.toString()}', true);
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _handleSuccessfulLogin(Map<String, dynamic> user, String token) {
    context.read<UserProvider>().setUser(user, token);
    _showAlert('Login successful! Welcome ${user['First_Name']}', false);

    Future.delayed(const Duration(milliseconds: 800), () {
      if (mounted) {
        // Navigate based on user role
        final userRole = user['role'] as String?;
        Widget homeScreen;

        switch (userRole) {
          case 'Scheduler':
            homeScreen = const SchedulerHomeScreen();
            break;
          case 'Student':
            homeScreen = const StudentHomeScreen();
            break;
          case 'Faculty':
          case 'LoadCommittee':
          default:
            homeScreen = const FacultyHomeScreen();
            break;
        }

        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => homeScreen),
          (route) => false,
        );
      }
    });
  }


  Future<void> _handleForgotPassword() async {
    if (_forgotEmailController.text.isEmpty) {
      _showAlert('Please enter your email', true);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final result = await ScheduleService.forgotPassword(
        email: _forgotEmailController.text.trim(),
      );

      if (mounted) {
        if (result['success']) {
          _resetEmail = _forgotEmailController.text.trim();
          _showAlert('Reset code sent to your email!', false);
          setState(() => _currentStep = 3); // Go to reset password screen
        } else {
          _showAlert(result['message'] ?? 'Failed to send reset code', true);
        }
      }
    } catch (e) {
      if (mounted) {
        _showAlert('Error: ${e.toString()}', true);
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleResetPassword() async {
    if (_resetCodeController.text.isEmpty) {
      _showAlert('Please enter the reset code', true);
      return;
    }

    if (_newPasswordController.text.isEmpty || _confirmPasswordController.text.isEmpty) {
      _showAlert('Please fill in all fields', true);
      return;
    }

    if (_newPasswordController.text != _confirmPasswordController.text) {
      _showAlert('Passwords do not match!', true);
      return;
    }

    if (_newPasswordController.text.length < 6) {
      _showAlert('Password must be at least 6 characters!', true);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final result = await ScheduleService.resetPassword(
        email: _resetEmail!,
        resetCode: _resetCodeController.text,
        newPassword: _newPasswordController.text,
      );

      if (mounted) {
        if (result['success']) {
          _showAlert('Password reset successful! Please login with your new password.', false);
          _resetCodeController.clear();
          _newPasswordController.clear();
          _confirmPasswordController.clear();
          _forgotEmailController.clear();
          Future.delayed(const Duration(milliseconds: 2000), () {
            if (mounted) {
              setState(() => _currentStep = 0);
            }
          });
        } else {
          _showAlert(result['message'] ?? 'Failed to reset password', true);
        }
      }
    } catch (e) {
      if (mounted) {
        _showAlert('Error: ${e.toString()}', true);
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showForgotPassword() {
    setState(() => _currentStep = 2);
  }

  void _backToLogin() {
    setState(() {
      _currentStep = 0;
      _verificationCodeController.clear();
      _forgotEmailController.clear();
      _resetCodeController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();
    });
  }

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
        child: SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: MediaQuery.of(context).viewInsets.bottom > 0 ? 16 : 32,
                  ),
                  child: _buildCurrentStep(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCurrentStep() {
    switch (_currentStep) {
      case 0:
        return _buildLoginWidget();
      case 1:
        return _buildVerificationWidget();
      case 2:
        return _buildForgotPasswordWidget();
      case 3:
        return _buildResetPasswordWidget();
      default:
        return _buildLoginWidget();
    }
  }

  Widget _buildLoginWidget() {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
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
            padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.calendar_month, size: 64, color: Colors.white),
                const SizedBox(height: 12),
                const Text(
                  'SmartSchedule',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 6),
                const Text(
                  'Your intelligent academic scheduling solution',
                  style: TextStyle(
                    color: Color(0xFFE8E8FF),
                    fontSize: 13,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          // Login Form
          SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Welcome Back!',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 24),
                // Email
                TextField(
                  controller: _loginEmailController,
                  textInputAction: TextInputAction.next,
                  decoration: InputDecoration(
                    labelText: 'Email Address',
                    hintText: 'Enter your email',
                    prefixIcon: const Icon(Icons.email_outlined),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFe2e8f0), width: 2),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF667eea), width: 2),
                    ),
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),
                // Password
                TextField(
                  controller: _loginPasswordController,
                  textInputAction: TextInputAction.done,
                  obscureText: !_loginPasswordVisible,
                  onSubmitted: (_) => _handleLogin(),
                  decoration: InputDecoration(
                    labelText: 'Password',
                    hintText: 'Enter your password',
                    prefixIcon: const Icon(Icons.lock_outlined),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _loginPasswordVisible ? Icons.visibility : Icons.visibility_off,
                      ),
                      onPressed: () {
                        setState(() => _loginPasswordVisible = !_loginPasswordVisible);
                      },
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFe2e8f0), width: 2),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF667eea), width: 2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // Forgot Password Link
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: _showForgotPassword,
                    child: const Text(
                      'Forgot Password?',
                      style: TextStyle(
                        color: Color(0xFF667eea),
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                // Login Button
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF667eea),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 24,
                            width: 24,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.login, color: Colors.white),
                              SizedBox(width: 8),
                              Text('Login',
                                  style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
                            ],
                          ),
                  ),
                ),
              ],
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
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF667eea), Color(0xFF764ba2)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.shield_outlined, size: 48, color: Colors.white),
            ),
            const SizedBox(height: 24),
            const Text(
              'Verify Your Email',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Text(
              'We sent a 6-digit code to $_currentEmail',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey, fontSize: 14),
            ),
            const SizedBox(height: 32),
            TextField(
              controller: _verificationCodeController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              textAlign: TextAlign.center,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9]')),
              ],
              decoration: InputDecoration(
                hintText: '000000',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFe2e8f0), width: 2),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF667eea), width: 2),
                ),
                counterText: '',
              ),
              style: const TextStyle(fontSize: 24, letterSpacing: 8, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleVerification,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF667eea),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_circle, color: Colors.white),
                          SizedBox(width: 8),
                          Text('Verify & Login',
                              style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton(
                onPressed: _isLoading ? null : _backToLogin,
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  side: const BorderSide(color: Color(0xFF667eea), width: 2),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.arrow_back, color: Color(0xFF667eea)),
                    SizedBox(width: 8),
                    Text('Back to Login',
                        style: TextStyle(fontSize: 16, color: Color(0xFF667eea), fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildForgotPasswordWidget() {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF667eea), Color(0xFF764ba2)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.lock_reset, size: 48, color: Colors.white),
            ),
            const SizedBox(height: 24),
            const Text(
              'Reset Password',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'Enter your email address and we\'ll send you a reset code.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
            const SizedBox(height: 32),
            TextField(
              controller: _forgotEmailController,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: 'Email Address',
                hintText: 'Enter your email',
                prefixIcon: const Icon(Icons.email_outlined),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFe2e8f0), width: 2),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF667eea), width: 2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleForgotPassword,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF667eea),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.send, color: Colors.white),
                          SizedBox(width: 8),
                          Text('Send Reset Code',
                              style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton(
                onPressed: _isLoading ? null : _backToLogin,
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  side: const BorderSide(color: Color(0xFF667eea), width: 2),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.arrow_back, color: Color(0xFF667eea)),
                    SizedBox(width: 8),
                    Text('Back to Login',
                        style: TextStyle(fontSize: 16, color: Color(0xFF667eea), fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResetPasswordWidget() {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF667eea), Color(0xFF764ba2)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.key, size: 48, color: Colors.white),
            ),
            const SizedBox(height: 24),
            const Text(
              'Enter New Password',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'Enter the code we sent to your email and your new password.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
            const SizedBox(height: 32),
            TextField(
              controller: _resetCodeController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              textAlign: TextAlign.center,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9]')),
              ],
              decoration: InputDecoration(
                labelText: 'Reset Code',
                hintText: '000000',
                prefixIcon: const Icon(Icons.shield_outlined),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFe2e8f0), width: 2),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF667eea), width: 2),
                ),
                counterText: '',
              ),
              style: const TextStyle(fontSize: 20, letterSpacing: 4, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _newPasswordController,
              obscureText: !_newPasswordVisible,
              decoration: InputDecoration(
                labelText: 'New Password',
                hintText: 'Enter new password',
                prefixIcon: const Icon(Icons.lock_outlined),
                suffixIcon: IconButton(
                  icon: Icon(
                    _newPasswordVisible ? Icons.visibility : Icons.visibility_off,
                  ),
                  onPressed: () {
                    setState(() => _newPasswordVisible = !_newPasswordVisible);
                  },
                ),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFe2e8f0), width: 2),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF667eea), width: 2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _confirmPasswordController,
              obscureText: !_confirmPasswordVisible,
              decoration: InputDecoration(
                labelText: 'Confirm Password',
                hintText: 'Confirm new password',
                prefixIcon: const Icon(Icons.lock_outlined),
                suffixIcon: IconButton(
                  icon: Icon(
                    _confirmPasswordVisible ? Icons.visibility : Icons.visibility_off,
                  ),
                  onPressed: () {
                    setState(() => _confirmPasswordVisible = !_confirmPasswordVisible);
                  },
                ),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFe2e8f0), width: 2),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF667eea), width: 2),
                ),
              ),
            ),
            const SizedBox(height: 8),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Password must be at least 6 characters',
                style: TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleResetPassword,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF667eea),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_circle, color: Colors.white),
                          SizedBox(width: 8),
                          Text('Reset Password',
                              style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton(
                onPressed: _isLoading ? null : _backToLogin,
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  side: const BorderSide(color: Color(0xFF667eea), width: 2),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.arrow_back, color: Color(0xFF667eea)),
                    SizedBox(width: 8),
                    Text('Back to Login',
                        style: TextStyle(fontSize: 16, color: Color(0xFF667eea), fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
