import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart'; // For kIsWeb
import 'package:http/http.dart' as http;

class ApiConfig {
  // Automatically switches IP based on the platform
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:4000'; // Web
    } else if (Platform.isAndroid) {
      return 'http://10.0.2.2:4000'; // Android Emulator
    } else {
      return 'http://localhost:4000'; // iOS Simulator
    }
  }
}

class ScheduleService {
  // --- HELPER: Error Message Handler ---
  static String _getErrorMessage(dynamic error) {
    if (error is SocketException ||
        error.toString().contains('Failed host lookup') ||
        error.toString().contains('Connection refused')) {
      return '❌ Cannot connect to server at ${ApiConfig.baseUrl}.\nCheck if server is running on Port 4000.';
    } else if (error is TimeoutException ||
        error.toString().contains('timeout')) {
      return '⏱️ Connection timeout. Server might be slow or unreachable.';
    }
    return 'Error: ${error.toString()}';
  }

  // =======================================================================
  // AUTHENTICATION
  // =======================================================================

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? verificationCode,
  }) async {
    try {
      // ✅ Using Capitalized Keys because your backend likely expects 'Email' not 'email'
      final Map<String, dynamic> requestBody = {
        'Email': email,
        'Password': password,
      };

      if (verificationCode != null && verificationCode.isNotEmpty) {
        requestBody['verificationCode'] = verificationCode;
      }

      final response = await http
          .post(
            Uri.parse('${ApiConfig.baseUrl}/api/auth/login'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(requestBody),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['requiresVerification'] == true) {
          return {
            'success': false,
            'requiresVerification': true,
            'message': data['message'],
          };
        }
        return {'success': true, 'user': data['user'], 'token': data['token']};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['message'] ?? 'Login failed'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<Map<String, dynamic>> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    required String role,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/api/auth/register');

    try {
      // ✅ FIXED: Changed keys to match what your backend likely expects.
      // If 'First_Name' fails, try 'FirstName' (Capitalized, no underscore).
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'First_Name': firstName, // Changed from 'firstName'
          'Last_Name': lastName, // Changed from 'lastName'
          'Email': email, // Changed from 'email'
          'Password': password, // Changed from 'password'
          'Role': role, // Changed from 'role'
        }),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'message': 'Registration successful',
          'data': data,
        };
      } else {
        final errorData = jsonDecode(response.body);
        return {
          'success': false,
          'message': errorData['message'] ?? 'Registration failed',
        };
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  // =======================================================================
  // SCHEDULE & COMMENTS
  // =======================================================================

  static Future<Map<String, dynamic>> getScheduleByLevel(int level) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/student-schedules/$level'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'schedules': data['schedules']};
      } else {
        return {'success': false, 'message': 'Failed to load schedule'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<Map<String, dynamic>> submitFacultyComment({
    required String token,
    required Map<String, dynamic> commentData,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/comments/faculty'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(commentData),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'comment': data['comment']};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['error'] ?? 'Failed'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<Map<String, dynamic>> submitStudentComment({
    required String token,
    required Map<String, dynamic> commentData,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/comments'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(commentData),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return {'success': true};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['error'] ?? 'Failed'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  // =======================================================================
  // ELECTIVE FORM METHODS
  // =======================================================================

  static Future<Map<String, dynamic>> checkElectiveFormStatus({
    required String token,
    required String studentId,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/electives/status/$studentId'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return {'success': false, 'message': 'Failed to check status'};
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<Map<String, dynamic>> getStudentData({
    required String token,
    required String studentId,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/students/$studentId'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return {'success': false, 'message': 'Failed to fetch student data'};
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<Map<String, dynamic>> getElectiveCourses({
    required String token,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/electives/courses'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return {'success': false, 'message': 'Failed to fetch courses'};
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<void> saveElectiveForm({
    required String token,
    required String studentId,
    required List<String> selectedCourses,
    required String suggestions,
  }) async {
    try {
      await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/electives/save'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'studentId': studentId,
          'selected_courses': selectedCourses,
          'suggestions': suggestions,
        }),
      );
    } catch (e) {
      print('Error saving draft: $e');
    }
  }

  static Future<Map<String, dynamic>> submitElectiveForm({
    required String token,
    required String studentId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/electives/submit'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'studentId': studentId}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true};
      }
      final data = jsonDecode(response.body);
      return {
        'success': false,
        'message': data['message'] ?? 'Failed to submit',
      };
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }
}
