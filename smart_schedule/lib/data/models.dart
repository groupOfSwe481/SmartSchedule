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

// DTO for Schedule History/Version Control
class ScheduleHistory {
  final String id;
  final String scheduleId;
  final int historyVersion;
  final DateTime timestamp;
  final Map<String, dynamic> delta;
  final String userId;
  final String summary;

  ScheduleHistory({
    required this.id,
    required this.scheduleId,
    required this.historyVersion,
    required this.timestamp,
    required this.delta,
    required this.userId,
    required this.summary,
  });

  factory ScheduleHistory.fromJson(Map<String, dynamic> json) {
    return ScheduleHistory(
      id: json['_id'] as String,
      scheduleId: json['schedule_id'] as String,
      historyVersion: json['history_version'] as int,
      timestamp: DateTime.parse(json['timestamp'] as String),
      delta: json['delta'] as Map<String, dynamic>? ?? {},
      userId: json['user_id'] as String,
      summary: json['summary'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'schedule_id': scheduleId,
    'history_version': historyVersion,
    'timestamp': timestamp.toIso8601String(),
    'delta': delta,
    'user_id': userId,
    'summary': summary,
  };
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

// Course Pattern Model
class CoursePattern {
  final String type;
  final int lectureHours;
  final int labHours;
  final int tutorialHours;
  final int totalHours;

  CoursePattern({
    required this.type,
    required this.lectureHours,
    required this.labHours,
    required this.tutorialHours,
    required this.totalHours,
  });

  factory CoursePattern.fromJson(Map<String, dynamic> json) {
    return CoursePattern(
      type: json['type'] as String? ?? 'custom',
      lectureHours: json['lecture_hours'] as int? ?? 0,
      labHours: json['lab_hours'] as int? ?? 0,
      tutorialHours: json['tutorial_hours'] as int? ?? 0,
      totalHours: json['total_hours'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'type': type,
    'lecture_hours': lectureHours,
    'lab_hours': labHours,
    'tutorial_hours': tutorialHours,
    'total_hours': totalHours,
  };
}

// Course Model
class Course {
  final String code;
  final String name;
  final int creditHours;
  final int duration;
  final bool isElective;
  final String department;
  final String college;
  final int? level;
  final String? examDate;
  final String? examTime;
  final List<String> prerequisites;
  final CoursePattern pattern;
  final DateTime createdAt;
  final DateTime updatedAt;

  Course({
    required this.code,
    required this.name,
    required this.creditHours,
    required this.duration,
    this.isElective = false,
    required this.department,
    required this.college,
    this.level,
    this.examDate,
    this.examTime,
    this.prerequisites = const [],
    required this.pattern,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Course.fromJson(Map<String, dynamic> json) {
    return Course(
      code: json['code'] as String,
      name: json['name'] as String,
      creditHours: json['credit_hours'] as int? ?? 0,
      duration: json['Duration'] as int? ?? 0,
      isElective: json['is_elective'] as bool? ?? false,
      department: json['department'] as String? ?? '',
      college: json['college'] as String? ?? '',
      level: json['level'] as int?,
      examDate: json['exam_date'] as String?,
      examTime: json['exam_time'] as String?,
      prerequisites: (json['prerequisites'] as List<dynamic>?)
          ?.where((e) => e != null)
          .map((e) => e as String)
          .toList() ?? [],
      pattern: CoursePattern.fromJson(json['pattern'] as Map<String, dynamic>),
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'code': code,
    'name': name,
    'credit_hours': creditHours,
    'Duration': duration,
    'is_elective': isElective,
    'department': department,
    'college': college,
    if (level != null) 'level': level,
    if (examDate != null) 'exam_date': examDate,
    if (examTime != null) 'exam_time': examTime,
    'prerequisites': prerequisites.isEmpty ? [null] : prerequisites,
    'pattern': pattern.toJson(),
    'created_at': createdAt.toIso8601String(),
    'updated_at': updatedAt.toIso8601String(),
  };
}

// Section Time Model
class SectionTime {
  final String day;
  final String startTime;
  final String endTime;

  SectionTime({required this.day, required this.startTime, required this.endTime});

  factory SectionTime.fromJson(Map<String, dynamic> json) {
    return SectionTime(
      day: json['day'] as String? ?? '',
      startTime: json['start_time'] as String? ?? '',
      endTime: json['end_time'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'day': day,
    'start_time': startTime,
    'end_time': endTime,
  };
}

// Section Model
class Section {
  final String secNum;
  final String courseCode;
  final String type;
  final List<String> timeSlot;
  final List<SectionTime> timeSlotDetails;
  final int? level;

  Section({
    required this.secNum,
    required this.courseCode,
    required this.type,
    required this.timeSlot,
    required this.timeSlotDetails,
    this.level,
  });

  factory Section.fromJson(Map<String, dynamic> json) {
    return Section(
      secNum: json['sec_num'] as String? ?? '',
      courseCode: json['course'] as String? ?? '',
      type: json['type'] as String? ?? '',
      timeSlot: (json['time_Slot'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ?? [],
      timeSlotDetails: (json['time_slots_detail'] as List<dynamic>?)
          ?.map((e) => SectionTime.fromJson(e as Map<String, dynamic>))
          .toList() ?? [],
      level: json['academic_level'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
    'sec_num': secNum,
    'course': courseCode,
    'type': type,
    'time_Slot': timeSlot,
    'time_slots_detail': timeSlotDetails.map((t) => t.toJson()).toList(),
    if (level != null) 'academic_level': level,
  };
}

// Student Level Data Model
class StudentLevelData {
  final int levelNum;
  final int studentCount;
  final int courseCount;
  final Map<String, int> courseEnrollments;
  final List<Course> courses;
  final DateTime? updatedAt;

  StudentLevelData({
    required this.levelNum,
    required this.studentCount,
    required this.courseCount,
    required this.courseEnrollments,
    required this.courses,
    this.updatedAt,
  });

  factory StudentLevelData.fromJson(Map<String, dynamic> json) {
    return StudentLevelData(
      levelNum: json['level_num'] as int,
      studentCount: json['student_count'] as int? ?? 0,
      courseCount: json['course_count'] as int? ?? 0,
      courseEnrollments: (json['course_enrollments'] as Map<String, dynamic>?)
          ?.map((key, value) => MapEntry(key, value as int)) ?? {},
      courses: (json['courses'] as List<dynamic>?)
          ?.map((e) => Course.fromJson(e as Map<String, dynamic>))
          .toList() ?? [],
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'level_num': levelNum,
    'student_count': studentCount,
    'course_count': courseCount,
    'course_enrollments': courseEnrollments,
    'courses': courses.map((c) => c.toJson()).toList(),
    if (updatedAt != null) 'updated_at': updatedAt!.toIso8601String(),
  };
}

// Rule Model
class Rule {
  final String id;
  final String ruleName;
  final String ruleDescription;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Rule({
    required this.id,
    required this.ruleName,
    required this.ruleDescription,
    this.createdAt,
    this.updatedAt,
  });

  factory Rule.fromJson(Map<String, dynamic> json) {
    return Rule(
      id: json['_id'] as String? ?? '',
      ruleName: json['rule_name'] as String? ?? '',
      ruleDescription: json['rule_description'] as String? ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'rule_name': ruleName,
    'rule_description': ruleDescription,
  };
}

// Notification Model
class AppNotification {
  final String id;
  final String userId;
  final String title;
  final String message;
  final bool read;
  final List<String>? role;
  final String? relatedId;
  final DateTime createdAt;

  AppNotification({
    required this.id,
    required this.userId,
    required this.title,
    required this.message,
    required this.read,
    this.role,
    this.relatedId,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['_id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      message: json['message'] as String? ?? '',
      read: json['read'] as bool? ?? false,
      role: (json['role'] as List<dynamic>?)?.map((e) => e as String).toList(),
      relatedId: json['relatedId'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'userId': userId,
    'title': title,
    'message': message,
    'read': read,
    if (role != null) 'role': role,
    if (relatedId != null) 'relatedId': relatedId,
    'createdAt': createdAt.toIso8601String(),
  };
}
