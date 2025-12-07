import 'dart:convert';
import 'package:http/http.dart' as http;
import '../data/faculty_models.dart';
import 'schedule_service.dart'; // To get ApiConfig.baseUrl

class FacultyService {
  // GET Summary for all levels
  static Future<Map<String, dynamic>> getSelectionSummary(String token) async {
    try {
      final response = await http.get(
        Uri.parse(
          '${ApiConfig.baseUrl}/api/faculty/elective-selection-summary',
        ),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': FacultyDashboardData.fromJson(jsonDecode(response.body)),
        };
      }
      return {'success': false, 'message': 'Failed to load summary'};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // GET Detailed Stats for specific level
  static Future<Map<String, dynamic>> getLevelStats(
    int level,
    String token,
  ) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/faculty/elective-stats/$level'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        return {'success': true, 'data': jsonDecode(response.body)};
      }
      return {'success': false, 'message': 'Failed to load stats'};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // POST Save Selection
  static Future<bool> saveSelection({
    required int level,
    required List<String> courses,
    required String mode,
    required String token,
    required String selectedBy,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/faculty/save-elective-selection'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'level': level,
          'elective_courses': courses,
          'selection_mode': mode,
          'selected_by': selectedBy,
        }),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}
