import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'schedule_service.dart';

class IrregularService {
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

  /// GET /api/irregulars - Get all irregular students
  static Future<Map<String, dynamic>> getAllIrregularStudents({
    String? token,
  }) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      final response = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}/api/irregulars'),
            headers: headers,
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'students': data['data'] ?? [],
          'count': data['count'] ?? 0,
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch irregular students'
        };
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  /// GET /api/irregulars/courses/:level - Get available courses for a level
  static Future<Map<String, dynamic>> getCoursesForLevel({
    required int level,
    String? token,
  }) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      final response = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}/api/irregulars/courses/$level'),
            headers: headers,
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'courses': data['data'] ?? [],
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch courses'
        };
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  /// POST /api/irregulars - Add a new irregular student
  static Future<Map<String, dynamic>> addIrregularStudent({
    required String studentId,
    required int level,
    required List<String> remainingCourses,
    required String token,
  }) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

      final body = {
        'student_id': studentId,
        'level': level,
        'remaining_courses': remainingCourses,
      };

      final response = await http
          .post(
            Uri.parse('${ApiConfig.baseUrl}/api/irregulars'),
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'message': data['message'] ?? 'Student added successfully',
          'student': data['data'],
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to add student'
        };
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  /// PUT /api/irregulars/:id - Update an irregular student
  static Future<Map<String, dynamic>> updateIrregularStudent({
    required String studentId,
    required int level,
    required List<String> remainingCourses,
    required String token,
  }) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

      final body = {
        'level': level,
        'remaining_courses': remainingCourses,
      };

      final response = await http
          .put(
            Uri.parse('${ApiConfig.baseUrl}/api/irregulars/$studentId'),
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'message': data['message'] ?? 'Student updated successfully',
          'student': data['data'],
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to update student'
        };
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  /// DELETE /api/irregulars/:id - Remove irregular status from student
  static Future<Map<String, dynamic>> deleteIrregularStudent({
    required String studentId,
    required String token,
  }) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

      final response = await http
          .delete(
            Uri.parse('${ApiConfig.baseUrl}/api/irregulars/$studentId'),
            headers: headers,
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'message': data['message'] ?? 'Student removed successfully',
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to remove student'
        };
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  /// POST /api/check-impact - Check schedule impact on irregular students
  static Future<Map<String, dynamic>> checkScheduleImpact({
    required String draftScheduleId,
    required String token,
  }) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

      final body = {
        'draftScheduleId': draftScheduleId,
      };

      final response = await http
          .post(
            Uri.parse('${ApiConfig.baseUrl}/api/check-impact'),
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'impactReport': data,
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to check impact'
        };
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }
}
