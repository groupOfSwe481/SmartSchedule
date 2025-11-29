import 'package:flutter/material.dart';
import '../../api/schedule_service.dart';

class CommentProvider extends ChangeNotifier {
  bool _isSubmitting = false;

  bool get isSubmitting => _isSubmitting;

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

    final result = await ScheduleService.submitFacultyComment(
      token: token,
      commentData: commentData,
    );

    _isSubmitting = false;
    notifyListeners();

    return result['success'];
  }
}
