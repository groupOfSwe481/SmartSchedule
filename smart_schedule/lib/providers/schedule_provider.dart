import 'package:flutter/material.dart';
import '../../api/schedule_service.dart';

class ScheduleProvider extends ChangeNotifier {
  // --- Faculty / Committee State ---
  int _currentLevel = 3;
  bool _isLoading = false;
  Map<String, dynamic>? _scheduleData;
  String? _errorMessage;

  int get currentLevel => _currentLevel;
  bool get isLoading => _isLoading;
  Map<String, dynamic>? get scheduleData => _scheduleData;
  String? get errorMessage => _errorMessage;

  // --- Student Specific State ---
  int _currentStudentLevel = 4;
  Map<String, dynamic>? _studentScheduleData;

  int get currentStudentLevel => _currentStudentLevel;
  Map<String, dynamic>? get studentScheduleData => _studentScheduleData;

  // --- Faculty / Committee Method ---
  Future<void> fetchSchedule([int? level]) async {
    if (level != null) _currentLevel = level;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await ScheduleService.getScheduleByLevel(_currentLevel);

    if (result['success']) {
      if (result['schedules'] != null && result['schedules'].isNotEmpty) {
        _scheduleData = result['schedules'][0];
        _errorMessage = null;
      } else {
        _scheduleData = null;
        _errorMessage = 'No schedules available for Level $_currentLevel';
      }
    } else {
      _scheduleData = null;
      _errorMessage = result['message'];
    }

    _isLoading = false;
    notifyListeners();
  }

  void switchLevel(int level) {
    _currentLevel = level;
    fetchSchedule();
  }

  // --- NEW: Student Method ---
  Future<void> fetchStudentSchedule(int level) async {
    _currentStudentLevel = level;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    // We reuse getScheduleByLevel because the endpoint /api/student-schedules/
    // returns the grid structure used by both views.
    final result = await ScheduleService.getScheduleByLevel(level);

    if (result['success']) {
      if (result['schedules'] != null && result['schedules'].isNotEmpty) {
        _studentScheduleData = result['schedules'][0];
        _errorMessage = null;
      } else {
        _studentScheduleData = null;
        _errorMessage = 'No schedules available for Level $level';
      }
    } else {
      _studentScheduleData = null;
      _errorMessage = result['message'];
    }

    _isLoading = false;
    notifyListeners();
  }
}
