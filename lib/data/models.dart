import 'dart:convert';

// DTO for Schedule Grid Course
class ScheduleCourse {
  final String code;
  final String course;
  final String location;

  ScheduleCourse.fromJson(dynamic json)
    : code = json['code'] ?? '',
      course = json['course'] ?? (json is String ? json : ''),
      location = json['location'] ?? '';
}

// DTO for the entire Schedule object
class Schedule {
  final int level;
  final String section;
  final Map<String, Map<String, ScheduleCourse>>
  grid; // Day -> TimeSlot -> Course

  Schedule({required this.level, required this.section, required this.grid});

  factory Schedule.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic> rawGrid = json['grid'] ?? {};
    final Map<String, Map<String, ScheduleCourse>> gridMap = {};

    rawGrid.forEach((day, timeSlots) {
      final Map<String, ScheduleCourse> timeSlotMap = {};
      (timeSlots as Map).forEach((timeSlot, courseData) {
        timeSlotMap[timeSlot as String] = ScheduleCourse.fromJson(courseData);
      });
      gridMap[day] = timeSlotMap;
    });

    return Schedule(
      level: json['level'] as int,
      section: json['section'] as String,
      grid: gridMap,
    );
  }
}

// DTO for POST /api/comments/faculty
class FacultyCommentRequest {
  final String facultyId;
  final String facultyName;
  final String courseCode;
  final String courseName;
  final String timeSlot;
  final String day;
  final String commentText;
  final int level;

  FacultyCommentRequest({
    required this.facultyId,
    required this.facultyName,
    required this.courseCode,
    required this.courseName,
    required this.timeSlot,
    required this.day,
    required this.commentText,
    required this.level,
  });

  Map<String, dynamic> toJson() => {
    'faculty_id': facultyId,
    'faculty_name': facultyName,
    'faculty_role': 'Faculty',
    'course_code': courseCode,
    'course_name': courseName,
    'time_slot': timeSlot,
    'day': day,
    'comment_text': commentText,
    'level': level,
  };
}

// DTO for General API Responses
class GenericResponse {
  final bool success;
  final String message;
  GenericResponse.fromJson(Map<String, dynamic> json)
    : success = json['success'] as bool,
      message = json['message'] as String? ?? 'Operation successful';
}

// Mock User Role Enum
enum UserRole { student, faculty, admin }
