import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../providers/comment_provider.dart';

class CommentsManagementScreen extends StatefulWidget {
  const CommentsManagementScreen({super.key});

  @override
  State<CommentsManagementScreen> createState() => _CommentsManagementScreenState();
}

class _CommentsManagementScreenState extends State<CommentsManagementScreen> {
  String _filterStatus = 'all';
  final Map<String, TextEditingController> _procedureControllers = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final userProvider = context.read<UserProvider>();
      final commentProvider = context.read<CommentProvider>();
      final token = userProvider.token;

      commentProvider.fetchAllComments(token: token);
    });
  }

  @override
  void dispose() {
    _procedureControllers.forEach((key, controller) => controller.dispose());
    super.dispose();
  }

  TextEditingController _getController(String commentId, String? initialText) {
    if (!_procedureControllers.containsKey(commentId)) {
      _procedureControllers[commentId] = TextEditingController(text: initialText ?? '');
    }
    return _procedureControllers[commentId]!;
  }

  Future<void> _updateCommentStatus(
    String commentId,
    String newStatus,
    String? procedures,
  ) async {
    final userProvider = context.read<UserProvider>();
    final commentProvider = context.read<CommentProvider>();
    final token = userProvider.token;
    final userName = userProvider.displayName;

    if (token == null) {
      _showSnackBar('Authentication required', Colors.red);
      return;
    }

    final success = await commentProvider.updateCommentStatus(
      commentId: commentId,
      status: newStatus,
      reviewedBy: userName,
      procedures: procedures,
      token: token,
    );

    if (success) {
      _showSnackBar('Comment status updated successfully', Colors.green);
    } else {
      _showSnackBar(
        commentProvider.error ?? 'Failed to update comment',
        Colors.red,
      );
    }
  }

  Future<void> _deleteComment(String commentId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning, color: Colors.orange),
            SizedBox(width: 12),
            Text('Delete Comment'),
          ],
        ),
        content: const Text('Are you sure you want to delete this comment?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final userProvider = context.read<UserProvider>();
    final commentProvider = context.read<CommentProvider>();
    final token = userProvider.token;

    if (token == null) {
      _showSnackBar('Authentication required', Colors.red);
      return;
    }

    final success = await commentProvider.deleteComment(
      commentId: commentId,
      token: token,
    );

    if (success) {
      _showSnackBar('Comment deleted successfully', Colors.green);
    } else {
      _showSnackBar(
        commentProvider.error ?? 'Failed to delete comment',
        Colors.red,
      );
    }
  }

  void _showSnackBar(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: color,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1e293b),
      appBar: _buildAppBar(),
      body: RefreshIndicator(
        onRefresh: () async {
          final userProvider = context.read<UserProvider>();
          final commentProvider = context.read<CommentProvider>();
          await commentProvider.fetchAllComments(token: userProvider.token);
        },
        child: Consumer<CommentProvider>(
          builder: (context, commentProvider, child) {
            if (commentProvider.isLoading) {
              return const Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366f1)),
                ),
              );
            }

            if (commentProvider.error != null) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 64),
                    const SizedBox(height: 16),
                    Text(
                      commentProvider.error!,
                      style: const TextStyle(color: Colors.white70),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              );
            }

            final allComments = commentProvider.comments;
            final filteredComments = _filterStatus == 'all'
                ? allComments
                : allComments.where((c) => c.status == _filterStatus).toList();

            if (filteredComments.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.comment_outlined, color: Colors.white38, size: 64),
                    const SizedBox(height: 16),
                    Text(
                      _filterStatus == 'all'
                          ? 'No comments yet'
                          : 'No $_filterStatus comments',
                      style: const TextStyle(color: Colors.white70, fontSize: 18),
                    ),
                  ],
                ),
              );
            }

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatsCards(commentProvider.stats),
                  const SizedBox(height: 24),
                  _buildFilterChips(),
                  const SizedBox(height: 24),
                  ...filteredComments.map((comment) => _buildCommentCard(comment)),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      elevation: 0,
      flexibleSpace: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
          ),
        ),
      ),
      title: const Row(
        children: [
          Icon(Icons.chat_bubble_outline, size: 28),
          SizedBox(width: 12),
          Text(
            'Comments Management',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsCards(Map<String, dynamic>? stats) {
    if (stats == null) return const SizedBox.shrink();

    final byStatus = stats['by_status'] as Map<String, dynamic>? ?? {};

    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            'Total',
            stats['total']?.toString() ?? '0',
            Icons.chat_bubble_outline,
            const Color(0xFF6366f1),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            'Pending',
            byStatus['pending']?.toString() ?? '0',
            Icons.pending_outlined,
            Colors.orange,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            'Reviewed',
            byStatus['reviewed']?.toString() ?? '0',
            Icons.visibility_outlined,
            Colors.blue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            'Resolved',
            byStatus['resolved']?.toString() ?? '0',
            Icons.check_circle_outline,
            Colors.green,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF334155),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3), width: 2),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 32),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips() {
    return Wrap(
      spacing: 12,
      children: [
        _buildFilterChip('all', 'All'),
        _buildFilterChip('pending', 'Pending'),
        _buildFilterChip('reviewed', 'Reviewed'),
        _buildFilterChip('resolved', 'Resolved'),
      ],
    );
  }

  Widget _buildFilterChip(String value, String label) {
    final isSelected = _filterStatus == value;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          _filterStatus = value;
        });
      },
      selectedColor: const Color(0xFF6366f1),
      backgroundColor: const Color(0xFF334155),
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : Colors.white70,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }

  Widget _buildCommentCard(comment) {
    final controller = _getController(comment.id, comment.procedures);

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      color: const Color(0xFF334155),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _buildStatusBadge(comment.status),
                const Spacer(),
                Text(
                  _formatDate(comment.createdAt),
                  style: const TextStyle(color: Colors.white54, fontSize: 12),
                ),
                IconButton(
                  icon: const Icon(Icons.delete, color: Colors.red),
                  onPressed: () => _deleteComment(comment.id),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6366f1).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    comment.courseCode,
                    style: const TextStyle(
                      color: Color(0xFF6366f1),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  comment.courseName ?? '',
                  style: const TextStyle(color: Colors.white70),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.calendar_today, size: 16, color: Colors.white54),
                const SizedBox(width: 4),
                Text(
                  comment.day,
                  style: const TextStyle(color: Colors.white54, fontSize: 14),
                ),
                const SizedBox(width: 16),
                const Icon(Icons.access_time, size: 16, color: Colors.white54),
                const SizedBox(width: 4),
                Text(
                  comment.timeSlot,
                  style: const TextStyle(color: Colors.white54, fontSize: 14),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF475569),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                comment.commentText,
                style: const TextStyle(color: Colors.white),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.person, size: 16, color: Colors.white54),
                const SizedBox(width: 4),
                Text(
                  comment.studentId,
                  style: const TextStyle(color: Colors.white54, fontSize: 14),
                ),
                if (comment.studentName != null) ...[
                  const SizedBox(width: 4),
                  Text(
                    '- ${comment.studentName}',
                    style: const TextStyle(color: Colors.white54, fontSize: 14),
                  ),
                ],
              ],
            ),
            if (comment.reviewedBy != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.verified, size: 16, color: Colors.green),
                  const SizedBox(width: 4),
                  Text(
                    'Reviewed by ${comment.reviewedBy}',
                    style: const TextStyle(color: Colors.green, fontSize: 14),
                  ),
                ],
              ),
            ],
            const Divider(color: Color(0xFF64748b), height: 24),
            TextField(
              controller: controller,
              maxLines: 3,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Procedures / Response',
                labelStyle: const TextStyle(color: Colors.white70),
                hintText: 'Enter procedures taken or response...',
                hintStyle: const TextStyle(color: Colors.white38),
                filled: true,
                fillColor: const Color(0xFF475569),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (comment.status != 'pending')
                  TextButton.icon(
                    onPressed: () => _updateCommentStatus(
                      comment.id,
                      'pending',
                      controller.text,
                    ),
                    icon: const Icon(Icons.undo),
                    label: const Text('Mark Pending'),
                    style: TextButton.styleFrom(foregroundColor: Colors.orange),
                  ),
                if (comment.status != 'reviewed')
                  TextButton.icon(
                    onPressed: () => _updateCommentStatus(
                      comment.id,
                      'reviewed',
                      controller.text,
                    ),
                    icon: const Icon(Icons.visibility),
                    label: const Text('Mark Reviewed'),
                    style: TextButton.styleFrom(foregroundColor: Colors.blue),
                  ),
                if (comment.status != 'resolved')
                  ElevatedButton.icon(
                    onPressed: () => _updateCommentStatus(
                      comment.id,
                      'resolved',
                      controller.text,
                    ),
                    icon: const Icon(Icons.check_circle),
                    label: const Text('Mark Resolved'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    IconData icon;
    switch (status) {
      case 'pending':
        color = Colors.orange;
        icon = Icons.pending;
        break;
      case 'reviewed':
        color = Colors.blue;
        icon = Icons.visibility;
        break;
      case 'resolved':
        color = Colors.green;
        icon = Icons.check_circle;
        break;
      default:
        color = Colors.grey;
        icon = Icons.help;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(
            status.toUpperCase(),
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '';
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        return '${difference.inMinutes}m ago';
      }
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}
