import 'package:flutter/material.dart';
import '../data/models.dart';
import '../api/schedule_service.dart';

class ScheduleProvider with ChangeNotifier {
  List<Schedule> _schedules = [];
  List<Schedule> _allVersions = [];
  bool _isLoading = false;
  String? _error;
  int _currentLevel = 3;

  List<Schedule> get schedules => _schedules;
  List<Schedule> get allVersions => _allVersions;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get currentLevel => _currentLevel;

  Schedule? get currentSchedule => _schedules.isNotEmpty ? _schedules.first : null;

  void setLevel(int level) {
    _currentLevel = level;
    notifyListeners();
  }

  /// Fetch schedules for Students (Published only, Version 2+)
  Future<void> fetchStudentSchedule(int level) async {
    _isLoading = true;
    _error = null;
    _currentLevel = level;
    notifyListeners();

    try {
      final result = await ScheduleService.getStudentScheduleByLevel(level);

      if (result['success']) {
        _schedules = (result['schedules'] as List)
            .map((json) => Schedule.fromJson(json as Map<String, dynamic>))
            .toList();
        _error = null;
      } else {
        _error = result['message'];
        _schedules = [];
      }
    } catch (e) {
      _error = 'Error loading schedule: $e';
      _schedules = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch schedules for LoadCommittee/Faculty (All versions, Version 1+)
  Future<void> fetchCommitteeSchedule(int level, {String? token}) async {
    _isLoading = true;
    _error = null;
    _currentLevel = level;
    notifyListeners();

    try {
      final result = await ScheduleService.getCommitteeScheduleByLevel(level, token: token);

      if (result['success']) {
        _schedules = (result['schedules'] as List)
            .map((json) => Schedule.fromJson(json as Map<String, dynamic>))
            .toList();

        if (result['allVersions'] != null) {
          _allVersions = (result['allVersions'] as List)
              .map((json) => Schedule.fromJson(json as Map<String, dynamic>))
              .toList();
        }

        _error = null;
      } else {
        _error = result['message'];
        _schedules = [];
        _allVersions = [];
      }
    } catch (e) {
      _error = 'Error loading schedule: $e';
      _schedules = [];
      _allVersions = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch schedules for Scheduler (Drafts and Published)
  Future<void> fetchSchedulerSchedules(int level, {String? token}) async {
    _isLoading = true;
    _error = null;
    _currentLevel = level;
    notifyListeners();

    try {
      final result = await ScheduleService.getSchedulesByLevel(level, token: token);

      if (result['success']) {
        _schedules = (result['schedules'] as List)
            .map((json) => Schedule.fromJson(json as Map<String, dynamic>))
            .toList();
        _error = null;
      } else {
        _error = result['message'];
        _schedules = [];
      }
    } catch (e) {
      _error = 'Error loading schedules: $e';
      _schedules = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Generate new schedule using Gemini AI
  Future<bool> generateSchedule(int level, {required String token}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ScheduleService.generateSchedule(level, token: token);

      if (result['success']) {
        _schedules = (result['schedules'] as List)
            .map((json) => Schedule.fromJson(json as Map<String, dynamic>))
            .toList();
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
      _error = 'Error generating schedule: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Update schedule grid (for LoadCommittee/Scheduler)
  Future<bool> updateSchedule({
    required String scheduleId,
    required Map<String, dynamic> grid,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ScheduleService.updateSchedule(
        scheduleId: scheduleId,
        grid: grid,
        token: token,
      );

      if (result['success']) {
        // Update the schedule in the list
        final updatedSchedule = Schedule.fromJson(result['schedule'] as Map<String, dynamic>);
        final index = _schedules.indexWhere((s) => s.id == scheduleId);
        if (index != -1) {
          _schedules[index] = updatedSchedule;
        }
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
      _error = 'Error updating schedule: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Publish schedule (for Scheduler only)
  Future<bool> publishSchedule({
    required String scheduleId,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ScheduleService.publishSchedule(
        scheduleId: scheduleId,
        token: token,
      );

      if (result['success']) {
        // Refresh the schedules to get updated status
        await fetchSchedulerSchedules(_currentLevel, token: token);
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error publishing schedule: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Restore schedule to previous version
  Future<bool> restoreVersion({
    required String scheduleId,
    required int version,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ScheduleService.restoreScheduleVersion(
        scheduleId: scheduleId,
        version: version,
        token: token,
      );

      if (result['success']) {
        // Update the schedule in the list
        final restoredSchedule = Schedule.fromJson(result['schedule'] as Map<String, dynamic>);
        final index = _schedules.indexWhere((s) => s.id == scheduleId);
        if (index != -1) {
          _schedules[index] = restoredSchedule;
        }
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
      _error = 'Error restoring version: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearSchedules() {
    _schedules = [];
    _allVersions = [];
    _error = null;
    notifyListeners();
  }
}
