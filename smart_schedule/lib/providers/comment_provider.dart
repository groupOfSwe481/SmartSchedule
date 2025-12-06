import 'package:flutter/material.dart';
import '../../api/schedule_service.dart';

class CommentProvider extends ChangeNotifier {
  bool _isSubmitting = false;

  bool get isSubmitting => _isSubmitting;

  // --- 1. Existing Method for Faculty/Committee ---
  Future<bool> submitComment({
    required Map<String, dynamic> userData,
    required String token,
    required Map<String, dynamic> cellInfo,
    required String commentText,
  }) async {
    _isSubmitting = true;
    notifyListeners();

    final commentData = {
      'faculty_id': userData['_id'] ?? userData['id'],
      'faculty_name':
          '${userData['First_Name'] ?? ''} ${userData['Last_Name'] ?? ''}'
              .trim(),
      'faculty_role': userData['role'] ?? 'Faculty',
      'course_code': cellInfo['courseCode'],
      'course_name': cellInfo['courseName'],
      'time_slot': cellInfo['timeSlot'],
      'day': cellInfo['day'],
      'comment_text': commentText,
      'level': cellInfo['level'],
    };

    // Calls the Faculty endpoint
    final result = await ScheduleService.submitFacultyComment(
      token: token,
      commentData: commentData,
    );

    _isSubmitting = false;
    notifyListeners();

    return result['success'];
  }

  // --- 2. NEW Method for Students ---
  Future<bool> submitStudentComment({
    required String token,
    required Map<String, dynamic> studentData,
    required Map<String, dynamic> cellInfo,
    required String commentText,
  }) async {
    _isSubmitting = true;
    notifyListeners();

    // Prepare data strictly for the Student API
    final requestBody = {
      'student_id': studentData['student_id'] ?? studentData['id'],
      'course_code': cellInfo['courseCode'],
      'course_name': cellInfo['courseName'],
      'time_slot': cellInfo['timeSlot'],
      'day': cellInfo['day'],
      'comment_text': commentText,
    };

    // Calls the Student endpoint
    final result = await ScheduleService.submitStudentComment(
      token: token,
      commentData: requestBody,
    );

    _isSubmitting = false;
    notifyListeners();

    return result['success'];
  }
}
