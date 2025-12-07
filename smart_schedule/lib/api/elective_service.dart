import 'dart:convert';
import 'package:http/http.dart' as http;
import '../data/models.dart';
import 'schedule_service.dart'; // To access ApiConfig.baseUrl

class ElectiveService {
  // GET Available Courses
  static Future<Map<String, dynamic>> getElectiveCourses(String token) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/elective-courses'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'data': data};
      }
      return {
        'success': false,
        'message': data['error'] ?? 'Failed to load courses',
      };
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // GET Student Submission Status
  static Future<Map<String, dynamic>> getStudentSubmission(
    String studentId,
    String token,
  ) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/student-electives/$studentId'),
        headers: {'Authorization': 'Bearer $token'},
      );

      return jsonDecode(response.body);
    } catch (e) {
      return {'error': e.toString()};
    }
  }

  // POST Start Draft
  static Future<void> startDraft(String studentId, String token) async {
    await http.post(
      Uri.parse('${ApiConfig.baseUrl}/api/start-electives/$studentId'),
      headers: {'Authorization': 'Bearer $token'},
    );
  }

  // PUT Save Draft (Autosave)
  static Future<bool> saveDraft(
    String studentId,
    List<String> courses,
    String suggestions,
    String token,
  ) async {
    try {
      final response = await http.put(
        Uri.parse('${ApiConfig.baseUrl}/api/save-electives/$studentId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'selected_courses': courses,
          'suggestions': suggestions,
        }),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // POST Submit Final
  static Future<Map<String, dynamic>> submitFinal(
    String studentId,
    String token,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/submit-electives/$studentId'),
        headers: {'Authorization': 'Bearer $token'},
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'data': data};
      }
      return {'success': false, 'message': data['error']};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }
}
