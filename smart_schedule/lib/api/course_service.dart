import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'schedule_service.dart';

class CourseService {
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

  /// GET /api/all-courses - Get all courses
  static Future<Map<String, dynamic>> getAllCourses({String? token}) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      final response = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}/api/all-courses'),
            headers: headers,
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final List courses = jsonDecode(response.body);
        return {
          'success': true,
          'courses': courses,
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

  /// GET /api/courses-by-department?department=... - Get courses by department
  static Future<Map<String, dynamic>> getCoursesByDepartment({
    required String department,
    String? token,
  }) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      final response = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}/api/courses-by-department?department=$department'),
            headers: headers,
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final List courses = jsonDecode(response.body);
        return {
          'success': true,
          'courses': courses,
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

  /// GET /api/course-details/:courseCode - Get course details
  static Future<Map<String, dynamic>> getCourseDetails({
    required String courseCode,
    String? token,
  }) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      final response = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}/api/course-details/$courseCode'),
            headers: headers,
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final course = jsonDecode(response.body);
        return {
          'success': true,
          'course': course,
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch course details'
        };
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  /// POST /api/create-course - Create a new course
  static Future<Map<String, dynamic>> createCourse({
    required Map<String, dynamic> courseData,
    required String token,
  }) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

      final response = await http
          .post(
            Uri.parse('${ApiConfig.baseUrl}/api/create-course'),
            headers: headers,
            body: jsonEncode(courseData),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'message': data['message'] ?? 'Course created successfully',
          'course': data['course'],
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to create course'
        };
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  /// PUT /api/update-course/:courseCode - Update a course
  static Future<Map<String, dynamic>> updateCourse({
    required String courseCode,
    required Map<String, dynamic> courseData,
    required String token,
  }) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

      final response = await http
          .put(
            Uri.parse('${ApiConfig.baseUrl}/api/update-course/$courseCode'),
            headers: headers,
            body: jsonEncode(courseData),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'message': data['message'] ?? 'Course updated successfully',
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to update course'
        };
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }
}
