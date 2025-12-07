import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiConfig {
  static const String baseUrl = 'https://smart-schedule-mhs1.vercel.app';
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
            Uri.parse('${ApiConfig.baseUrl}/api/auth/login'),
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
            'rateLimitInfo': data['rateLimitInfo'],
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
    try {
      final response = await http
          .post(
            Uri.parse('${ApiConfig.baseUrl}/api/auth/register'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'First_Name': firstName,
              'Last_Name': lastName,
              'Email': email,
              'Password': password,
              'role': role,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'message': data['message'], 'user': data['user']};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['message'] ?? 'Registration failed'};
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
            Uri.parse('${ApiConfig.baseUrl}/api/auth/forgot-password'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'Email': email}),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'message': data['message']};
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
    required String resetCode,
    required String newPassword,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('${ApiConfig.baseUrl}/api/auth/reset-password'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'Email': email,
              'resetCode': resetCode,
              'newPassword': newPassword,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'message': data['message']};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['message'] ?? 'Failed to reset password'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  // ================= SCHEDULES =================
  static Future<Map<String, dynamic>> getStudentScheduleByLevel(int level) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/student-schedules/$level'),
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'schedules': data['schedules'], 'level': data['level']};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['message'] ?? 'No schedules found'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<Map<String, dynamic>> getCommitteeScheduleByLevel(int level, {String? token}) async {
    try {
      final headers = <String, String>{};
      if (token != null) headers['Authorization'] = 'Bearer $token';

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/committee-schedules/$level'),
        headers: headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'schedules': data['schedules'],
          'allVersions': data['allVersions'],
          'count': data['count'],
          'level': data['level']
        };
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['message'] ?? 'No schedules found'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<Map<String, dynamic>> getSchedulesByLevel(int level, {String? token}) async {
    try {
      final headers = <String, String>{};
      if (token != null) headers['Authorization'] = 'Bearer $token';

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/schedule/level/$level'),
        headers: headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'schedules': data['schedules']};
      } else {
        return {'success': false, 'message': 'Failed to load schedules'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<Map<String, dynamic>> generateSchedule(int level, {required String token}) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/schedule/generate'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'level': level}),
      ).timeout(const Duration(seconds: 120));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'schedules': data['schedules']};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['error'] ?? 'Failed to generate schedule'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<Map<String, dynamic>> updateSchedule({
    required String scheduleId,
    required Map<String, dynamic> grid,
    required String token,
  }) async {
    try {
      final response = await http.put(
        Uri.parse('${ApiConfig.baseUrl}/api/update/$scheduleId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'grid': grid}),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'schedule': data['schedule'],
          'historyVersion': data['historyVersion'],
          'message': data['message']
        };
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['error'] ?? 'Failed to update schedule'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<Map<String, dynamic>> publishSchedule({
    required String scheduleId,
    required String token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/schedule/publish/$scheduleId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'message': data['message'],
          'version': data['version'],
          'recipients': data['recipients']
        };
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['error'] ?? 'Failed to publish schedule'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<Map<String, dynamic>> restoreScheduleVersion({
    required String scheduleId,
    required int version,
    required String token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/schedule/restore/$scheduleId/$version'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'message': data['message'],
          'newHistoryVersion': data['newHistoryVersion'],
          'schedule': data['schedule']
        };
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['error'] ?? 'Failed to restore version'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  static Future<Map<String, dynamic>> getScheduleHistory({
    required String scheduleId,
    String? token,
  }) async {
    try {
      final headers = <String, String>{};
      if (token != null) headers['Authorization'] = 'Bearer $token';

      final response = await http
          .get(Uri.parse('${ApiConfig.baseUrl}/api/schedule/history/$scheduleId'), headers: headers)
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'history': data['history']};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['error'] ?? 'Failed to load history'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  // ================= COMMENTS =================
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
        Uri.parse('${ApiConfig.baseUrl}/api/comments/student'),
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

  // Get all rules
  static Future<Map<String, dynamic>> getAllRules({String? token}) async {
    try {
      final headers = <String, String>{};
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/rules'),
        headers: headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'rules': data['data'] ?? []};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['error'] ?? 'Failed to load rules'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  // Create a new rule
  static Future<Map<String, dynamic>> createRule({
    required String token,
    required String ruleName,
    required String ruleDescription,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/rules'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'rule_name': ruleName,
          'rule_description': ruleDescription,
        }),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'rule': data['rule'], 'message': data['message']};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['error'] ?? 'Failed to create rule'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  // Update an existing rule
  static Future<Map<String, dynamic>> updateRule({
    required String token,
    required String ruleId,
    required String ruleName,
    required String ruleDescription,
  }) async {
    try {
      final response = await http.put(
        Uri.parse('${ApiConfig.baseUrl}/api/rules/$ruleId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'rule_name': ruleName,
          'rule_description': ruleDescription,
        }),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'rule': data['rule'], 'message': data['message']};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['error'] ?? 'Failed to update rule'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  // Delete a rule
  static Future<Map<String, dynamic>> deleteRule({
    required String token,
    required String ruleId,
  }) async {
    try {
      final response = await http.delete(
        Uri.parse('${ApiConfig.baseUrl}/api/rules/$ruleId'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'message': data['message']};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['error'] ?? 'Failed to delete rule'};
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }
}