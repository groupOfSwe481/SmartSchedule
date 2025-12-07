class FacultyLevelSummary {
  final int level;
  final int totalStudents;
  final int submissions;
  final int submissionRate;
  final bool electiveSelected;

  FacultyLevelSummary({
    required this.level,
    required this.totalStudents,
    required this.submissions,
    required this.submissionRate,
    required this.electiveSelected,
  });

  factory FacultyLevelSummary.fromJson(Map<String, dynamic> json) {
    return FacultyLevelSummary(
      level: json['level'],
      totalStudents: json['total_students'] ?? 0,
      submissions: json['submissions'] ?? 0,
      submissionRate: json['submission_rate'] ?? 0,
      electiveSelected: json['elective_selected'] ?? false,
    );
  }
}

class ElectiveCourseStat {
  final String code;
  final String name;
  final int creditHours;
  final String department;
  final int count;
  final int percentage;

  ElectiveCourseStat({
    required this.code,
    required this.name,
    required this.creditHours,
    required this.department,
    required this.count,
    required this.percentage,
  });

  factory ElectiveCourseStat.fromJson(Map<String, dynamic> json) {
    return ElectiveCourseStat(
      code: json['course_code'] ?? '',
      name: json['course_name'] ?? 'Unknown',
      creditHours: json['credit_hours'] ?? 0,
      department: json['department'] ?? '',
      count: json['count'] ?? 0,
      percentage: json['percentage'] ?? 0,
    );
  }
}

class FacultyDashboardData {
  final bool isFormEnded;
  final String? deadlineDescription;
  final List<FacultyLevelSummary> levels;
  final DateTime? formEndDate;

  FacultyDashboardData({
    required this.isFormEnded,
    this.deadlineDescription,
    required this.levels,
    this.formEndDate,
  });

  factory FacultyDashboardData.fromJson(Map<String, dynamic> json) {
    return FacultyDashboardData(
      isFormEnded: json['is_form_ended'] ?? false,
      deadlineDescription: json['deadline_description'],
      formEndDate: json['form_ended'] != null
          ? DateTime.parse(json['form_ended'])
          : null,
      levels: (json['levels'] as List)
          .map((e) => FacultyLevelSummary.fromJson(e))
          .toList(),
    );
  }
}
