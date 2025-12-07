import 'dart:io';
import 'package:flutter/material.dart';
import '../data/models.dart';
import '../api/student_service.dart';

class StudentProvider with ChangeNotifier {
  List<StudentLevelData> _levels = [];
  bool _isLoading = false;
  String? _error;

  List<StudentLevelData> get levels => _levels;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Fetch all levels with student data
  Future<void> fetchLevels({String? token}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await StudentService.getAllLevels(token: token);

      if (result['success']) {
        _levels = (result['data'] as List)
            .map((json) => StudentLevelData.fromJson(json as Map<String, dynamic>))
            .toList();
        _error = null;
      } else {
        _error = result['message'];
        _levels = [];
      }
    } catch (e) {
      _error = 'Error loading levels: $e';
      _levels = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Update student count for a level
  Future<bool> updateStudentCount({
    required int levelNum,
    required int studentCount,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await StudentService.updateLevel(
        levelNum: levelNum,
        studentCount: studentCount,
        token: token,
      );

      if (result['success']) {
        // Refresh the levels list
        await fetchLevels(token: token);
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error updating student count: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Update course enrollments for a level
  Future<bool> updateCourseEnrollments({
    required int levelNum,
    required Map<String, int> courseEnrollments,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await StudentService.updateLevel(
        levelNum: levelNum,
        courseEnrollments: courseEnrollments,
        token: token,
      );

      if (result['success']) {
        // Refresh the levels list
        await fetchLevels(token: token);
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error updating course enrollments: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Clear all data for a level
  Future<bool> clearLevelData({
    required int levelNum,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await StudentService.clearLevelData(
        levelNum: levelNum,
        token: token,
      );

      if (result['success']) {
        // Refresh the levels list
        await fetchLevels(token: token);
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error clearing level data: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Upload image file for OCR processing
  Future<bool> uploadImageFile({
    required File imageFile,
    required int levelNum,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await StudentService.uploadImageFile(
        imageFile: imageFile,
        levelNum: levelNum,
        token: token,
      );

      if (result['success']) {
        // Refresh the levels list
        await fetchLevels(token: token);
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
      _error = 'Error uploading image: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Get data for a specific level
  StudentLevelData? getLevelData(int levelNum) {
    try {
      return _levels.firstWhere((level) => level.levelNum == levelNum);
    } catch (e) {
      return null;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearLevels() {
    _levels = [];
    _error = null;
    notifyListeners();
  }
}
