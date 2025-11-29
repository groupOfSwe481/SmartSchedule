import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiConfig {
  static const String baseUrl = 'http://10.0.2.2:4000';
}

class ScheduleService {
  static String _getErrorMessage(dynamic error) {
    if (error is SocketException ||
        error.toString().contains('Failed host lookup')) {
      return '❌ Cannot connect to server\nCheck server is running and IP is correct';
    } else if (error is TimeoutException ||
        error.toString().contains('timeout')) {
      return '⏱️ Connection timeout';
    }
    return 'Error: ${error.toString()}';
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? verificationCode,
  }) async {
    try {
      final body = {
        'Email': email,
        'Password': password,
        if (verificationCode != null) 'verificationCode': verificationCode,
      };

      final response = await http
          .post(
            Uri.parse('${ApiConfig.baseUrl}/api/login'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(body),
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

  static Future<Map<String, dynamic>> verifyEmail({
    required String email,
    required String verificationCode,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('${ApiConfig.baseUrl}/api/login'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'Email': email,
              'verificationCode': verificationCode,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'user': data['user'], 'token': data['token']};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['message'] ?? 'Verification failed'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<Map<String, dynamic>> forgotPassword({
    required String email,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('${ApiConfig.baseUrl}/api/forgot-password'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'Email': email}),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'message': data['message'] ?? 'Reset code sent'};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['message'] ?? 'Failed to send reset code'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<Map<String, dynamic>> resetPassword({
    required String email,
    required String verificationCode,
    required String newPassword,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('${ApiConfig.baseUrl}/api/reset-password'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'Email': email,
              'verificationCode': verificationCode,
              'newPassword': newPassword,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'message': data['message'] ?? 'Password reset successful'};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['message'] ?? 'Password reset failed'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

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
}
