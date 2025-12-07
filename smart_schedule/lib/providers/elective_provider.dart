import 'package:flutter/material.dart';
import '../api/elective_service.dart';
import '../data/models.dart';

class ElectiveProvider with ChangeNotifier {
  bool _isLoading = false;
  String? _error;

  // Form State
  bool _isFormActive = false;
  DateTime? _deadline;
  List<ElectiveCourse> _availableCourses = [];

  // Selection State
  List<String> _selectedCourseCodes = [];
  String _suggestions = "";
  bool _isSubmitted = false;

  // Getters
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isFormActive => _isFormActive;
  DateTime? get deadline => _deadline;
  List<ElectiveCourse> get availableCourses => _availableCourses;
  List<String> get selectedCourseCodes => _selectedCourseCodes;
  String get suggestions => _suggestions;
  bool get isSubmitted => _isSubmitted;

  Future<void> loadElectiveData(String studentId, String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // 1. Fetch Available Courses & General Status
      final coursesResult = await ElectiveService.getElectiveCourses(token);

      if (!coursesResult['success']) {
        if (coursesResult['message'].toString().contains(
          'not currently active',
        )) {
          _isFormActive = false;
          _isLoading = false;
          notifyListeners();
          return;
        }
        _error = coursesResult['message'];
        _isLoading = false;
        notifyListeners();
        return;
      }

      final data = coursesResult['data'];
      _isFormActive = data['form_active'] ?? false;
      _deadline = data['deadline'] != null
          ? DateTime.parse(data['deadline'])
          : null;
      _availableCourses = (data['courses'] as List)
          .map((c) => ElectiveCourse.fromJson(c))
          .toList();

      if (_isFormActive) {
        // 2. Fetch Student's specific submission/draft
        final subResult = await ElectiveService.getStudentSubmission(
          studentId,
          token,
        );

        if (subResult['submission'] != null) {
          final sub = ElectiveSubmission.fromJson(subResult['submission']);
          _selectedCourseCodes = sub.selectedCourses;
          _suggestions = sub.suggestions;
          _isSubmitted = sub.status == 'submitted';
        } else {
          // No submission exists, create a draft immediately
          await ElectiveService.startDraft(studentId, token);
          _selectedCourseCodes = [];
          _suggestions = "";
          _isSubmitted = false;
        }
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void toggleCourse(String courseCode, String studentId, String token) {
    if (_isSubmitted) return;

    if (_selectedCourseCodes.contains(courseCode)) {
      _selectedCourseCodes.remove(courseCode);
    } else {
      _selectedCourseCodes.add(courseCode);
    }
    notifyListeners();
    _autoSave(studentId, token);
  }

  void updateSuggestions(String text, String studentId, String token) {
    if (_isSubmitted) return;
    _suggestions = text;
    // Don't notify listeners on every keystroke to avoid UI lag,
    // but do trigger autosave (maybe with debounce in real app)
    _autoSave(studentId, token);
  }

  Future<void> _autoSave(String studentId, String token) async {
    await ElectiveService.saveDraft(
      studentId,
      _selectedCourseCodes,
      _suggestions,
      token,
    );
  }

  Future<bool> submitFinal(String studentId, String token) async {
    _isLoading = true;
    notifyListeners();

    final result = await ElectiveService.submitFinal(studentId, token);

    _isLoading = false;
    if (result['success']) {
      _isSubmitted = true;
      notifyListeners();
      return true;
    } else {
      _error = result['message'];
      notifyListeners();
      return false;
    }
  }
}
