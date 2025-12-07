import 'package:flutter/material.dart';
import '../data/models.dart';
import '../api/course_service.dart';

class CourseProvider with ChangeNotifier {
  List<Course> _courses = [];
  List<Course> _filteredCourses = [];
  bool _isLoading = false;
  String? _error;

  // Filters
  String? _selectedDepartment;
  int? _selectedLevel;
  String _searchQuery = '';

  List<Course> get courses => _filteredCourses;
  List<Course> get allCourses => _courses;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get selectedDepartment => _selectedDepartment;
  int? get selectedLevel => _selectedLevel;
  String get searchQuery => _searchQuery;

  /// Fetch all courses
  Future<void> fetchCourses({String? token}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await CourseService.getAllCourses(token: token);

      if (result['success']) {
        _courses = (result['courses'] as List)
            .map((json) => Course.fromJson(json as Map<String, dynamic>))
            .toList();
        _applyFilters();
        _error = null;
      } else {
        _error = result['message'];
        _courses = [];
        _filteredCourses = [];
      }
    } catch (e) {
      _error = 'Error loading courses: $e';
      _courses = [];
      _filteredCourses = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch courses by department
  Future<void> fetchCoursesByDepartment({
    required String department,
    String? token,
  }) async {
    _isLoading = true;
    _error = null;
    _selectedDepartment = department;
    notifyListeners();

    try {
      final result = await CourseService.getCoursesByDepartment(
        department: department,
        token: token,
      );

      if (result['success']) {
        _courses = (result['courses'] as List)
            .map((json) => Course.fromJson(json as Map<String, dynamic>))
            .toList();
        _applyFilters();
        _error = null;
      } else {
        _error = result['message'];
        _courses = [];
        _filteredCourses = [];
      }
    } catch (e) {
      _error = 'Error loading courses: $e';
      _courses = [];
      _filteredCourses = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Create a new course
  Future<bool> createCourse({
    required Map<String, dynamic> courseData,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await CourseService.createCourse(
        courseData: courseData,
        token: token,
      );

      if (result['success']) {
        // Refresh the courses list
        await fetchCourses(token: token);
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error creating course: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Update a course
  Future<bool> updateCourse({
    required String courseCode,
    required Map<String, dynamic> courseData,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await CourseService.updateCourse(
        courseCode: courseCode,
        courseData: courseData,
        token: token,
      );

      if (result['success']) {
        // Refresh the courses list
        await fetchCourses(token: token);
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error updating course: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Apply filters to courses
  void _applyFilters() {
    _filteredCourses = _courses.where((course) {
      // Filter by department
      if (_selectedDepartment != null &&
          _selectedDepartment != 'all' &&
          course.department != _selectedDepartment) {
        return false;
      }

      // Filter by level
      if (_selectedLevel != null && course.level != _selectedLevel) {
        return false;
      }

      // Filter by search query
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        return course.code.toLowerCase().contains(query) ||
            course.name.toLowerCase().contains(query);
      }

      return true;
    }).toList();
  }

  /// Set department filter
  void setDepartmentFilter(String? department) {
    _selectedDepartment = department;
    _applyFilters();
    notifyListeners();
  }

  /// Set level filter
  void setLevelFilter(int? level) {
    _selectedLevel = level;
    _applyFilters();
    notifyListeners();
  }

  /// Set search query
  void setSearchQuery(String query) {
    _searchQuery = query;
    _applyFilters();
    notifyListeners();
  }

  /// Clear all filters
  void clearFilters() {
    _selectedDepartment = null;
    _selectedLevel = null;
    _searchQuery = '';
    _applyFilters();
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearCourses() {
    _courses = [];
    _filteredCourses = [];
    _error = null;
    notifyListeners();
  }
}
