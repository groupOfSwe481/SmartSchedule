import 'package:flutter/material.dart';
import '../data/models.dart';
import '../api/irregular_service.dart';

class IrregularProvider with ChangeNotifier {
  List<IrregularStudent> _students = [];
  List<Map<String, dynamic>> _coursesForLevel = [];
  ImpactReport? _latestImpactReport;
  bool _isLoading = false;
  String? _error;

  List<IrregularStudent> get students => _students;
  List<Map<String, dynamic>> get coursesForLevel => _coursesForLevel;
  ImpactReport? get latestImpactReport => _latestImpactReport;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Fetch all irregular students
  Future<void> fetchIrregularStudents({String? token}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await IrregularService.getAllIrregularStudents(token: token);

      if (result['success']) {
        _students = (result['students'] as List)
            .map((json) => IrregularStudent.fromJson(json as Map<String, dynamic>))
            .toList();
        _error = null;
      } else {
        _error = result['message'];
        _students = [];
      }
    } catch (e) {
      _error = 'Error loading irregular students: $e';
      _students = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch courses for a specific level
  Future<bool> fetchCoursesForLevel(int level, {String? token}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await IrregularService.getCoursesForLevel(
        level: level,
        token: token,
      );

      if (result['success']) {
        _coursesForLevel = (result['courses'] as List)
            .map((json) => json as Map<String, dynamic>)
            .toList();
        _error = null;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = result['message'];
        _coursesForLevel = [];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error loading courses: $e';
      _coursesForLevel = [];
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Add a new irregular student
  Future<bool> addIrregularStudent({
    required String studentId,
    required int level,
    required List<String> remainingCourses,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await IrregularService.addIrregularStudent(
        studentId: studentId,
        level: level,
        remainingCourses: remainingCourses,
        token: token,
      );

      if (result['success']) {
        // Refresh the list
        await fetchIrregularStudents(token: token);
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error adding student: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Update an irregular student
  Future<bool> updateIrregularStudent({
    required String studentId,
    required int level,
    required List<String> remainingCourses,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await IrregularService.updateIrregularStudent(
        studentId: studentId,
        level: level,
        remainingCourses: remainingCourses,
        token: token,
      );

      if (result['success']) {
        // Refresh the list
        await fetchIrregularStudents(token: token);
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error updating student: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Delete (remove irregular status from) a student
  Future<bool> deleteIrregularStudent({
    required String studentId,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await IrregularService.deleteIrregularStudent(
        studentId: studentId,
        token: token,
      );

      if (result['success']) {
        // Refresh the list
        await fetchIrregularStudents(token: token);
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error removing student: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Check schedule impact on irregular students
  Future<bool> checkScheduleImpact({
    required String draftScheduleId,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    _latestImpactReport = null;
    notifyListeners();

    try {
      final result = await IrregularService.checkScheduleImpact(
        draftScheduleId: draftScheduleId,
        token: token,
      );

      if (result['success']) {
        _latestImpactReport = ImpactReport.fromJson(
          result['impactReport'] as Map<String, dynamic>,
        );
        _error = null;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error checking impact: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearImpactReport() {
    _latestImpactReport = null;
    notifyListeners();
  }

  void clearStudents() {
    _students = [];
    _error = null;
    notifyListeners();
  }
}
