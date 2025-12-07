import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'schedule_service.dart';

class StudentService {
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

  /// GET /api/students/levels - Get all levels with student counts
  static Future<Map<String, dynamic>> getAllLevels({String? token}) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      print('🔍 Fetching from: ${ApiConfig.baseUrl}/api/students/levels');

      final response = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}/api/students/levels'),
            headers: headers,
          )
          .timeout(const Duration(seconds: 10));

      print('📡 Response status: ${response.statusCode}');
      print('📦 Response body: ${response.body.substring(0, response.body.length > 200 ? 200 : response.body.length)}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ Data parsed successfully, items: ${(data['data'] as List?)?.length ?? 0}');
        return {
          'success': true,
          'data': data['data'] ?? [],
        };
      } else {
        final data = jsonDecode(response.body);
        print('❌ Error response: ${data['error']}');
        return {
          'success': false,
          'message': data['error'] ?? 'Failed to fetch levels'
        };
      }
    } catch (e) {
      print('💥 Exception in getAllLevels: $e');
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  /// PUT /api/students/level/:levelNum - Update student count for a level
  static Future<Map<String, dynamic>> updateLevel({
    required int levelNum,
    int? studentCount,
    Map<String, int>? courseEnrollments,
    required String token,
  }) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

      final body = <String, dynamic>{};
      if (studentCount != null) {
        body['student_count'] = studentCount;
      }
      if (courseEnrollments != null) {
        body['course_enrollments'] = courseEnrollments;
      }

      final response = await http
          .put(
            Uri.parse('${ApiConfig.baseUrl}/api/students/level/$levelNum'),
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'message': data['message'] ?? 'Data updated successfully',
          'data': data['data'],
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['error'] ?? 'Failed to update level'
        };
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  /// DELETE /api/students/level/:levelNum - Clear all student data for a level
  static Future<Map<String, dynamic>> clearLevelData({
    required int levelNum,
    required String token,
  }) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

      final response = await http
          .delete(
            Uri.parse('${ApiConfig.baseUrl}/api/students/level/$levelNum'),
            headers: headers,
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'message': data['message'] ?? 'Data cleared successfully',
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['error'] ?? 'Failed to clear data'
        };
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }

  /// POST /api/students/upload - Upload image file for OCR processing
  static Future<Map<String, dynamic>> uploadImageFile({
    required File imageFile,
    required int levelNum,
    required String token,
  }) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/students/upload');
      final request = http.MultipartRequest('POST', uri);

      request.headers['Authorization'] = 'Bearer $token';
      request.fields['levelNum'] = levelNum.toString();
      request.files.add(
        await http.MultipartFile.fromPath('file', imageFile.path),
      );

      final streamedResponse = await request.send().timeout(const Duration(seconds: 30));
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'message': data['message'] ?? 'Image processed successfully',
          'data': data['data'],
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['error'] ?? 'Failed to process image'
        };
      }
    } catch (e) {
      return {'success': false, 'message': _getErrorMessage(e)};
    }
  }
}
