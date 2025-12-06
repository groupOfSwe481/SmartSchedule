import 'package:flutter/material.dart';
import '../data/models.dart';
import '../api/section_service.dart';

class SectionProvider with ChangeNotifier {
  List<Section> _sections = [];
  List<Section> _filteredSections = [];
  bool _isLoading = false;
  String? _error;

  // Filters
  String? _selectedDepartment;
  int? _selectedLevel;
  String _searchQuery = '';

  List<Section> get sections => _filteredSections;
  List<Section> get allSections => _sections;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get selectedDepartment => _selectedDepartment;
  int? get selectedLevel => _selectedLevel;
  String get searchQuery => _searchQuery;

  /// Fetch all sections
  Future<void> fetchSections({String? token}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await SectionService.getAllSections(token: token);

      if (result['success']) {
        _sections = (result['sections'] as List)
            .map((json) => Section.fromJson(json as Map<String, dynamic>))
            .toList();
        _applyFilters();
        _error = null;
      } else {
        _error = result['message'];
        _sections = [];
        _filteredSections = [];
      }
    } catch (e) {
      _error = 'Error loading sections: $e';
      _sections = [];
      _filteredSections = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch lecture sections for a course
  Future<List<Section>> fetchLectureSections({
    required String courseCode,
    String? token,
  }) async {
    try {
      final result = await SectionService.getLectureSections(
        courseCode: courseCode,
        token: token,
      );

      if (result['success']) {
        return (result['sections'] as List)
            .map((json) => Section.fromJson(json as Map<String, dynamic>))
            .toList();
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }

  /// Create a new section
  Future<bool> createSection({
    required Map<String, dynamic> sectionData,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await SectionService.createSection(
        sectionData: sectionData,
        token: token,
      );

      if (result['success']) {
        // Refresh the sections list
        await fetchSections(token: token);
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error creating section: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Create section with unified approach
  Future<bool> createSectionUnified({
    required Map<String, dynamic> sectionData,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await SectionService.createSectionUnified(
        sectionData: sectionData,
        token: token,
      );

      if (result['success']) {
        // Refresh the sections list
        await fetchSections(token: token);
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error creating section: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Update a section
  Future<bool> updateSection({
    required String sectionNum,
    required Map<String, dynamic> sectionData,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await SectionService.updateSection(
        sectionNum: sectionNum,
        sectionData: sectionData,
        token: token,
      );

      if (result['success']) {
        // Refresh the sections list
        await fetchSections(token: token);
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error updating section: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Delete a section
  Future<bool> deleteSection({
    required String sectionNum,
    required String token,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await SectionService.deleteSection(
        sectionNum: sectionNum,
        token: token,
      );

      if (result['success']) {
        // Refresh the sections list
        await fetchSections(token: token);
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error deleting section: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Apply filters to sections
  void _applyFilters() {
    _filteredSections = _sections.where((section) {
      // Filter by level
      if (_selectedLevel != null && section.level != _selectedLevel) {
        return false;
      }

      // Filter by search query
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        return section.courseCode.toLowerCase().contains(query) ||
            section.secNum.toLowerCase().contains(query);
      }

      return true;
    }).toList();
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
    _selectedLevel = null;
    _searchQuery = '';
    _applyFilters();
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearSections() {
    _sections = [];
    _filteredSections = [];
    _error = null;
    notifyListeners();
  }
}
