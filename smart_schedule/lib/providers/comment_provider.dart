import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../api/schedule_service.dart';
import '../data/models.dart';

class Comment {
  final String id;
  final String studentId;
  final String? studentName;
  final String courseCode;
  final String? courseName;
  final String timeSlot;
  final String day;
  final String commentText;
  final String status; // pending, reviewed, resolved
  final int studentLevel;
  final String? reviewedBy;
  final DateTime? reviewedAt;
  final String? procedures;
  final DateTime createdAt;

  Comment({
    required this.id,
    required this.studentId,
    this.studentName,
    required this.courseCode,
    this.courseName,
    required this.timeSlot,
    required this.day,
    required this.commentText,
    required this.status,
    required this.studentLevel,
    this.reviewedBy,
    this.reviewedAt,
    this.procedures,
    required this.createdAt,
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['_id'] as String,
      studentId: json['student_id'] as String,
      studentName: json['student_name'] as String?,
      courseCode: json['course_code'] as String,
      courseName: json['course_name'] as String?,
      timeSlot: json['time_slot'] as String,
      day: json['day'] as String,
      commentText: json['comment_text'] as String,
      status: json['status'] as String? ?? 'pending',
      studentLevel: json['student_level'] as int,
      reviewedBy: json['reviewed_by'] as String?,
      reviewedAt: json['reviewed_at'] != null
          ? DateTime.parse(json['reviewed_at'] as String)
          : null,
      procedures: json['procedures'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
    );
  }
}

class CommentProvider extends ChangeNotifier {
  bool _isSubmitting = false;
  bool _isLoading = false;
  String? _error;
  List<Comment> _comments = [];
  Map<String, dynamic>? _stats;

  bool get isSubmitting => _isSubmitting;
  bool get isLoading => _isLoading;
  String? get error => _error;
  List<Comment> get comments => _comments;
  Map<String, dynamic>? get stats => _stats;

  /// Submit comment based on user role (Student, Faculty, or LoadCommittee)
  Future<bool> submitComment({
    required Map<String, dynamic> userData,
    required String token,
    required Map<String, dynamic> cellInfo,
    required String commentText,
  }) async {
    _isSubmitting = true;
    notifyListeners();

    final userRole = userData['role'] as String?;
    Map<String, dynamic> result;

    if (userRole == 'Student') {
      // Student comment submission
      final commentData = {
        'student_id': _extractStudentId(userData['Email'] ?? userData['email'] ?? ''),
        'course_code': cellInfo['courseCode'],
        'course_name': cellInfo['courseName'],
        'time_slot': cellInfo['timeSlot'],
        'day': cellInfo['day'],
        'comment_text': commentText,
      };

      result = await ScheduleService.submitStudentComment(
        token: token,
        commentData: commentData,
      );
    } else {
      // Faculty or LoadCommittee comment submission
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

      result = await ScheduleService.submitFacultyComment(
        token: token,
        commentData: commentData,
      );
    }

    _isSubmitting = false;
    notifyListeners();

    return result['success'];
  }

  /// Extract student ID from email (first 9 digits)
  String _extractStudentId(String email) {
    final match = RegExp(r'^\d{9}').firstMatch(email);
    return match?.group(0) ?? '';
  }

  /// Fetch all comments for management
  Future<void> fetchAllComments({String? token, String? status}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final headers = <String, String>{
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      final queryParams = status != null && status != 'all'
          ? '?status=$status'
          : '';

      final response = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}/api/comments/all$queryParams'),
            headers: headers,
          )
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _comments = (data['data'] as List)
            .map((json) => Comment.fromJson(json as Map<String, dynamic>))
            .toList();
        _stats = data['stats'] as Map<String, dynamic>?;
        _error = null;
      } else {
        final data = jsonDecode(response.body);
        _error = data['error'] ?? 'Failed to fetch comments';
        _comments = [];
        _stats = null;
      }
    } catch (e) {
      _error = 'Error loading comments: $e';
      _comments = [];
      _stats = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Update comment status
  Future<bool> updateCommentStatus({
    required String commentId,
    required String status,
    required String reviewedBy,
    String? procedures,
    required String token,
  }) async {
    try {
      final headers = <String, String>{
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

      final body = {
        'status': status,
        'reviewed_by': reviewedBy,
        if (procedures != null) 'procedures': procedures,
      };

      final response = await http
          .put(
            Uri.parse('${ApiConfig.baseUrl}/api/comments/$commentId/status'),
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        // Refresh comments list
        await fetchAllComments(token: token);
        return true;
      } else {
        final data = jsonDecode(response.body);
        _error = data['error'] ?? 'Failed to update comment';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error updating comment: $e';
      notifyListeners();
      return false;
    }
  }

  /// Delete a comment
  Future<bool> deleteComment({
    required String commentId,
    required String token,
  }) async {
    try {
      final headers = <String, String>{
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

      final response = await http
          .delete(
            Uri.parse('${ApiConfig.baseUrl}/api/comments/$commentId'),
            headers: headers,
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        // Refresh comments list
        await fetchAllComments(token: token);
        return true;
      } else {
        final data = jsonDecode(response.body);
        _error = data['error'] ?? 'Failed to delete comment';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error deleting comment: $e';
      notifyListeners();
      return false;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
