import 'dart:convert';

// DTO for Schedule Grid Course - can be a String or Object
class ScheduleCourse {
  final String? code;
  final String course;
  final String? location;

  ScheduleCourse({this.code, required this.course, this.location});

  factory ScheduleCourse.fromJson(dynamic json) {
    if (json == null || json == '') {
      return ScheduleCourse(course: '');
    }

    // Handle string format: "CS101 (Lec)" or "Computer Science"
    if (json is String) {
      final match = RegExp(r'^([A-Z]{2,4}\d{3})').firstMatch(json);
      return ScheduleCourse(
        code: match?.group(1),
        course: json,
      );
    }

    // Handle object format: { "code": "CS101", "course": "...", "location": "..." }
    if (json is Map) {
      return ScheduleCourse(
        code: json['code'] as String?,
        course: json['course'] as String? ?? json.toString(),
        location: json['location'] as String?,
      );
    }

    return ScheduleCourse(course: json.toString());
  }

  bool get isEmpty => course.isEmpty;
  bool get isNotEmpty => course.isNotEmpty;

  Map<String, dynamic> toJson() => {
    if (code != null) 'code': code,
    'course': course,
    if (location != null) 'location': location,
  };
}

// DTO for the entire Schedule object
class Schedule {
  final String id;
  final int level;
  final String section;
  final Map<String, Map<String, ScheduleCourse>> grid;
  final int version;
  final int? historyVersion;
  final String status; // "Draft" | "Published" | "Archived"
  final DateTime? publishedAt;
  final DateTime createdAt;

  Schedule({
    required this.id,
    required this.level,
    required this.section,
    required this.grid,
    this.version = 0,
    this.historyVersion,
    this.status = 'Draft',
    this.publishedAt,
    required this.createdAt,
  });

  factory Schedule.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic> rawGrid = json['grid'] ?? {};
    final Map<String, Map<String, ScheduleCourse>> gridMap = {};

    rawGrid.forEach((day, timeSlots) {
      final Map<String, ScheduleCourse> timeSlotMap = {};
      if (timeSlots is Map) {
        timeSlots.forEach((timeSlot, courseData) {
          timeSlotMap[timeSlot as String] = ScheduleCourse.fromJson(courseData);
        });
      }
      gridMap[day] = timeSlotMap;
    });

    return Schedule(
      id: json['_id'] as String? ?? '',
      level: json['level'] as int,
      section: json['section'] as String,
      grid: gridMap,
      version: json['version'] as int? ?? 0,
      historyVersion: json['history_version'] as int?,
      status: json['status'] as String? ?? 'Draft',
      publishedAt: json['publishedAt'] != null
          ? DateTime.parse(json['publishedAt'] as String)
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : (json['createdAt'] != null
              ? DateTime.parse(json['createdAt'] as String)
              : DateTime.now()),
    );
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> gridJson = {};
    grid.forEach((day, timeSlots) {
      final Map<String, dynamic> timeSlotsJson = {};
      timeSlots.forEach((timeSlot, course) {
        if (course.isNotEmpty) {
          timeSlotsJson[timeSlot] = course.course;
        } else {
          timeSlotsJson[timeSlot] = '';
        }
      });
      gridJson[day] = timeSlotsJson;
    });

    return {
      '_id': id,
      'level': level,
      'section': section,
      'grid': gridJson,
      'version': version,
      if (historyVersion != null) 'history_version': historyVersion,
      'status': status,
      if (publishedAt != null) 'publishedAt': publishedAt!.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
    };
  }

  bool get isPublished => status == 'Published';
  bool get isDraft => status == 'Draft';
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

// Irregular Student Model
class IrregularStudent {
  final String id;
  final String studentId;
  final String userId;
  final int level;
  final bool irregulars;
  final List<String> preventFallingBehindCourses;
  final List<String> remainingCoursesFromPastLevels;
  final List<String> coursesTaken;
  final List<String> userElectiveChoice;

  IrregularStudent({
    required this.id,
    required this.studentId,
    required this.userId,
    required this.level,
    required this.irregulars,
    required this.preventFallingBehindCourses,
    required this.remainingCoursesFromPastLevels,
    required this.coursesTaken,
    required this.userElectiveChoice,
  });

  factory IrregularStudent.fromJson(Map<String, dynamic> json) {
    return IrregularStudent(
      id: json['_id'] as String,
      studentId: json['student_id'] as String,
      userId: json['user_id'] as String? ?? '',
      level: json['level'] as int,
      irregulars: json['irregulars'] as bool? ?? true,
      preventFallingBehindCourses: (json['prevent_falling_behind_courses'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ?? [],
      remainingCoursesFromPastLevels: (json['remaining_courses_from_past_levels'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ?? [],
      coursesTaken: (json['courses_taken'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ?? [],
      userElectiveChoice: (json['user_elective_choice'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'student_id': studentId,
    'user_id': userId,
    'level': level,
    'irregulars': irregulars,
    'prevent_falling_behind_courses': preventFallingBehindCourses,
    'remaining_courses_from_past_levels': remainingCoursesFromPastLevels,
    'courses_taken': coursesTaken,
    'user_elective_choice': userElectiveChoice,
  };
}

// Impact Report Models
class ImpactedStudent {
  final String studentId;
  final int level;
  final List<ConflictingCourse> conflictingCourses;

  ImpactedStudent({
    required this.studentId,
    required this.level,
    required this.conflictingCourses,
  });

  factory ImpactedStudent.fromJson(Map<String, dynamic> json) {
    return ImpactedStudent(
      studentId: json['studentId'] as String? ?? '',
      level: json['level'] as int? ?? 0,
      conflictingCourses: (json['conflictingCourses'] as List<dynamic>?)
          ?.map((e) => ConflictingCourse.fromJson(e as Map<String, dynamic>))
          .toList() ?? [],
    );
  }
}

class ConflictingCourse {
  final String code;
  final int level;

  ConflictingCourse({
    required this.code,
    required this.level,
  });

  factory ConflictingCourse.fromJson(Map<String, dynamic> json) {
    return ConflictingCourse(
      code: json['code'] as String? ?? '',
      level: json['level'] as int? ?? 0,
    );
  }
}

class ImpactReport {
  final int impactedCount;
  final String draftScheduleId;
  final String draftSection;
  final List<ImpactedStudent> impactedStudents;

  ImpactReport({
    required this.impactedCount,
    required this.draftScheduleId,
    required this.draftSection,
    required this.impactedStudents,
  });

  factory ImpactReport.fromJson(Map<String, dynamic> json) {
    return ImpactReport(
      impactedCount: json['impactedCount'] as int? ?? 0,
      draftScheduleId: json['draftScheduleId'] as String? ?? '',
      draftSection: json['draftSection'] as String? ?? '',
      impactedStudents: (json['impactedStudents'] as List<dynamic>?)
          ?.map((e) => ImpactedStudent.fromJson(e as Map<String, dynamic>))
          .toList() ?? [],
    );
  }
}
