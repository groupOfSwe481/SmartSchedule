import 'package:flutter/material.dart';
import '../api/faculty_service.dart';
import '../data/faculty_models.dart';

class FacultyProvider with ChangeNotifier {
  bool _isLoading = false;
  String? _error;

  // Dashboard Data
  FacultyDashboardData? _dashboardData;

  // Detail View Data
  List<ElectiveCourseStat> _courseStats = [];
  List<String> _currentSelection = [];
  String _selectionMode = 'auto'; // 'auto' or 'manual'
  List<String> _autoSelectedCodes = []; // To store the top 3

  // Getters
  bool get isLoading => _isLoading;
  String? get error => _error;
  FacultyDashboardData? get dashboardData => _dashboardData;
  List<ElectiveCourseStat> get courseStats => _courseStats;
  List<String> get currentSelection => _currentSelection;
  String get selectionMode => _selectionMode;

  // 1. Fetch Dashboard Summary
  Future<void> fetchSummary(String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await FacultyService.getSelectionSummary(token);

    if (result['success']) {
      _dashboardData = result['data'];
    } else {
      _error = result['message'];
    }

    _isLoading = false;
    notifyListeners();
  }

  // 2. Fetch Detail Stats for Level
  Future<void> fetchLevelStats(int level, String token) async {
    _isLoading = true;
    _courseStats = [];
    _currentSelection = [];
    notifyListeners();

    final result = await FacultyService.getLevelStats(level, token);

    if (result['success']) {
      final data = result['data'];

      // Parse Course Stats
      _courseStats = (data['course_selections'] as List)
          .map((e) => ElectiveCourseStat.fromJson(e))
          .toList();

      // Determine existing selection
      final savedSelection = (data['current_selection'] as List)
          .map((e) => e.toString())
          .toList();

      // Calculate Auto Selection (Top 3)
      _autoSelectedCodes = _courseStats
          .where((c) => c.count > 0)
          .take(3)
          .map((c) => c.code)
          .toList();

      // Set Mode
      if (savedSelection.isNotEmpty) {
        // If saved selection matches auto exactly, we can call it auto, else manual
        bool matchesAuto =
            _autoSelectedCodes.length == savedSelection.length &&
            savedSelection.every((e) => _autoSelectedCodes.contains(e));
        _selectionMode = matchesAuto ? 'auto' : 'manual';
        _currentSelection = savedSelection;
      } else {
        // Default to auto
        _selectionMode = 'auto';
        _currentSelection = List.from(_autoSelectedCodes);
      }
    } else {
      _error = result['message'];
    }

    _isLoading = false;
    notifyListeners();
  }

  // 3. Toggle Mode
  void setSelectionMode(String mode) {
    _selectionMode = mode;
    if (mode == 'auto') {
      _currentSelection = List.from(_autoSelectedCodes);
    }
    notifyListeners();
  }

  // 4. Toggle Course (Manual Mode)
  void toggleCourse(String code) {
    if (_selectionMode == 'auto') return; // Locked in auto mode

    if (_currentSelection.contains(code)) {
      _currentSelection.remove(code);
    } else {
      _currentSelection.add(code);
    }
    notifyListeners();
  }

  // 5. Save
  Future<bool> saveSelection(
    int level,
    String token,
    String facultyName,
  ) async {
    if (_currentSelection.isEmpty) return false;

    _isLoading = true;
    notifyListeners();

    bool success = await FacultyService.saveSelection(
      level: level,
      courses: _currentSelection,
      mode: _selectionMode,
      token: token,
      selectedBy: facultyName,
    );

    if (success) {
      // Refresh dashboard to show "Completed" status
      await fetchSummary(token);
    }

    _isLoading = false;
    notifyListeners();
    return success;
  }
}
