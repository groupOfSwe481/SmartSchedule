import 'package:flutter/material.dart';

class UserProvider extends ChangeNotifier {
  Map<String, dynamic>? _userData;
  String? _token;

  Map<String, dynamic>? get userData => _userData;
  String? get token => _token;
  bool get isLoggedIn => _userData != null && _token != null;

  void setUser(Map<String, dynamic> user, String token) {
    _userData = user;
    _token = token;
    notifyListeners();
  }

  void logout() {
    _userData = null;
    _token = null;
    notifyListeners();
  }

  String get displayName {
    if (_userData == null) return 'Faculty Member';

    // FIX: Extract the full name and check if it's empty
    final fullName =
        '${_userData!['First_Name'] ?? ''} ${_userData!['Last_Name'] ?? ''}'
            .trim();

    if (fullName.isEmpty) {
      // If the name is empty, fall back to email or a default
      return _userData!['email'] ?? 'Faculty Member';
    }

    return fullName;
  }

  String get userId => _userData?['_id'] ?? _userData?['id'] ?? '';
  String get userRole => _userData?['role'] ?? 'Faculty';
}
