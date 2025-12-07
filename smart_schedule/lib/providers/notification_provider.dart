import 'package:flutter/material.dart';
import 'dart:async';
import '../data/models.dart';
import '../api/schedule_service.dart';

class NotificationProvider with ChangeNotifier {
  List<AppNotification> _notifications = [];
  int _unreadCount = 0;
  bool _isLoading = false;
  String? _error;
  Timer? _refreshTimer;

  List<AppNotification> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Start auto-refresh every 30 seconds
  void startAutoRefresh(String userId, String token) {
    stopAutoRefresh();
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      loadNotificationCount(userId, token);
    });
  }

  /// Stop auto-refresh
  void stopAutoRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = null;
  }

  /// Load all notifications
  Future<void> loadNotifications(String userId, String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ScheduleService.getNotifications(
        userId: userId,
        token: token,
      );

      if (result['success']) {
        _notifications = (result['notifications'] as List)
            .map((json) => AppNotification.fromJson(json as Map<String, dynamic>))
            .toList();

        // Update unread count
        _unreadCount = _notifications.where((n) => !n.read).length;

        _error = null;
      } else {
        _error = result['message'];
        _notifications = [];
      }
    } catch (e) {
      _error = 'Error loading notifications: $e';
      _notifications = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Load just the unread count (lighter operation)
  Future<void> loadNotificationCount(String userId, String token) async {
    try {
      final result = await ScheduleService.getNotificationCount(
        userId: userId,
        token: token,
      );

      if (result['success']) {
        _unreadCount = result['count'] as int;
        notifyListeners();
      }
    } catch (e) {
      // Silently fail for background count updates
      debugPrint('Error loading notification count: $e');
    }
  }

  /// Mark all notifications as read
  Future<bool> markAllAsRead(String userId, String token) async {
    try {
      final result = await ScheduleService.markNotificationsAsRead(
        userId: userId,
        token: token,
      );

      if (result['success']) {
        // Update local state
        _notifications = _notifications.map((n) {
          return AppNotification(
            id: n.id,
            userId: n.userId,
            title: n.title,
            message: n.message,
            read: true,
            role: n.role,
            relatedId: n.relatedId,
            createdAt: n.createdAt,
          );
        }).toList();

        _unreadCount = 0;
        notifyListeners();
        return true;
      } else {
        _error = result['message'];
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error marking notifications as read: $e';
      notifyListeners();
      return false;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    stopAutoRefresh();
    super.dispose();
  }
}
