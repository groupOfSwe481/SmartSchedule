import 'package:flutter/material.dart';
import '../../api/schedule_service.dart';

class ScheduleProvider extends ChangeNotifier {
  int _currentLevel = 3;
  bool _isLoading = false;
  Map<String, dynamic>? _scheduleData;
  String? _errorMessage;

  int get currentLevel => _currentLevel;
  bool get isLoading => _isLoading;
  Map<String, dynamic>? get scheduleData => _scheduleData;
  String? get errorMessage => _errorMessage;

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
}
