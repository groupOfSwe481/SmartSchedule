import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';
import '../providers/user_provider.dart';
import '../data/models.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({Key? key}) : super(key: key);

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadNotifications();
    });
  }

  void _loadNotifications() {
    final userProvider = context.read<UserProvider>();
    final notificationProvider = context.read<NotificationProvider>();

    if (userProvider.isLoggedIn && userProvider.userId.isNotEmpty) {
      notificationProvider.loadNotifications(
        userProvider.userId,
        userProvider.token!,
      );
    }
  }

  Future<void> _markAllAsRead() async {
    final userProvider = context.read<UserProvider>();
    final notificationProvider = context.read<NotificationProvider>();

    if (userProvider.isLoggedIn && userProvider.userId.isNotEmpty) {
      await notificationProvider.markAllAsRead(
        userProvider.userId,
        userProvider.token!,
      );
    }
  }

  String _getTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 365) {
      return '${(difference.inDays / 365).floor()} years ago';
    } else if (difference.inDays > 30) {
      return '${(difference.inDays / 30).floor()} months ago';
    } else if (difference.inDays > 0) {
      return '${difference.inDays} days ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} hours ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} minutes ago';
    } else {
      return 'Just now';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: const Text(
          'Notifications',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF6366f1),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          Consumer<NotificationProvider>(
            builder: (context, notificationProvider, child) {
              if (notificationProvider.unreadCount > 0) {
                return TextButton.icon(
                  onPressed: _markAllAsRead,
                  icon: const Icon(Icons.done_all, color: Colors.white),
                  label: const Text(
                    'Mark all read',
                    style: TextStyle(color: Colors.white),
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ],
      ),
      body: Consumer<NotificationProvider>(
        builder: (context, notificationProvider, child) {
          if (notificationProvider.isLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (notificationProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Colors.red[300],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    notificationProvider.error!,
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _loadNotifications,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366f1),
                      foregroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
            );
          }

          final notifications = notificationProvider.notifications;

          if (notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.notifications_none,
                    size: 80,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No notifications',
                    style: TextStyle(
                      fontSize: 18,
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'You\'re all caught up!',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              _loadNotifications();
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: notifications.length,
              itemBuilder: (context, index) {
                final notification = notifications[index];
                return _buildNotificationCard(notification);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildNotificationCard(AppNotification notification) {
    return Card(
      elevation: notification.read ? 0 : 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: notification.read ? Colors.grey[200]! : const Color(0xFF6366f1).withOpacity(0.3),
          width: notification.read ? 1 : 2,
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: notification.read ? Colors.white : const Color(0xFF6366f1).withOpacity(0.05),
        ),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          leading: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: notification.read
                  ? Colors.grey[200]
                  : const Color(0xFF6366f1).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              _getNotificationIcon(notification.title),
              color: notification.read ? Colors.grey[600] : const Color(0xFF6366f1),
              size: 24,
            ),
          ),
          title: Row(
            children: [
              if (!notification.read)
                Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: const BoxDecoration(
                    color: Color(0xFF6366f1),
                    shape: BoxShape.circle,
                  ),
                ),
              Expanded(
                child: Text(
                  notification.title,
                  style: TextStyle(
                    fontWeight: notification.read ? FontWeight.w500 : FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
              ),
            ],
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              Text(
                notification.message,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey[700],
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(
                    Icons.access_time,
                    size: 12,
                    color: Colors.grey[500],
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _getTimeAgo(notification.createdAt),
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[500],
                    ),
                  ),
                  if (notification.read) ...[
                    const SizedBox(width: 12),
                    Icon(
                      Icons.check,
                      size: 12,
                      color: Colors.green[600],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Read',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.green[600],
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getNotificationIcon(String title) {
    final titleLower = title.toLowerCase();

    if (titleLower.contains('comment')) {
      return Icons.comment;
    } else if (titleLower.contains('schedule') || titleLower.contains('published')) {
      return Icons.calendar_today;
    } else if (titleLower.contains('resolved')) {
      return Icons.check_circle;
    } else if (titleLower.contains('update')) {
      return Icons.update;
    } else {
      return Icons.notifications;
    }
  }
}
