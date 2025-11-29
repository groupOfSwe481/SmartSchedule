import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class UserProvider extends ChangeNotifier {
  Map<String, dynamic>? _userData;
  String? _token;

  Map<String, dynamic>? get userData => _userData;
  String? get token => _token;
  bool get isLoggedIn => _userData != null && _token != null;

  void setUser(Map<String, dynamic> user, String token) {
    _userData = user;
    _token = token;
    _saveToPreferences();
    notifyListeners();
  }

  void logout() {
    _userData = null;
    _token = null;
    _clearPreferences();
    notifyListeners();
  }

  Future<void> _saveToPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (_userData != null && _token != null) {
        await prefs.setString('user', jsonEncode(_userData));
        await prefs.setString('token', _token!);
      }
    } catch (e) {
      print('Error saving preferences: $e');
    }
  }

  Future<void> _clearPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('user');
      await prefs.remove('token');
    } catch (e) {
      print('Error clearing preferences: $e');
    }
  }

  Future<void> loadFromPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userStr = prefs.getString('user');
      final token = prefs.getString('token');

      if (userStr != null && token != null) {
        _userData = jsonDecode(userStr);
        _token = token;
        notifyListeners();
      }
    } catch (e) {
      print('Error loading preferences: $e');
    }
  }

  String get displayName {
    if (_userData == null) return 'User';

    final fullName =
        '${_userData!['First_Name'] ?? ''} ${_userData!['Last_Name'] ?? ''}'
            .trim();

    if (fullName.isEmpty) {
      return _userData!['Email'] ?? _userData!['email'] ?? 'User';
    }

    return fullName;
  }

  String get userId => _userData?['_id'] ?? _userData?['id'] ?? '';
  String get userRole => _userData?['role'] ?? 'Student';
}
