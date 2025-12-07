import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/schedule_provider.dart';
import '../providers/user_provider.dart';
import '../data/models.dart';
import '../widgets/comment_modal.dart';

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  int _currentLevel = 3;
  final List<String> _days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  final List<String> _timeSlots = [
    '8:00-8:50',
    '9:00-9:50',
    '10:00-10:50',
    '11:00-11:50',
    '12:00-12:50',
    '1:00-1:50',
    '2:00-2:50',
    '3:00-3:50',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadSchedule();
    });
  }

  void _loadSchedule() {
    final userProvider = context.read<UserProvider>();
    final scheduleProvider = context.read<ScheduleProvider>();
    final userRole = userProvider.userData?['role'] as String?;
    final token = userProvider.token;

    if (userRole == 'Student') {
      scheduleProvider.fetchStudentSchedule(_currentLevel);
    } else if (userRole == 'Faculty' || userRole == 'LoadCommittee') {
      scheduleProvider.fetchCommitteeSchedule(_currentLevel, token: token);
    } else if (userRole == 'Scheduler') {
      scheduleProvider.fetchSchedulerSchedules(_currentLevel, token: token);
    }
  }

  void _switchLevel(int level) {
    setState(() => _currentLevel = level);
    context.read<ScheduleProvider>().setLevel(level);
    _loadSchedule();
  }

  Future<void> _generateSchedule() async {
    final userProvider = context.read<UserProvider>();
    final scheduleProvider = context.read<ScheduleProvider>();
    final token = userProvider.token;

    if (token == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Authentication required'), backgroundColor: Colors.red),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Generate Schedule'),
        content: Text('Generate new schedule for Level $_currentLevel using AI?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Generate'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await scheduleProvider.generateSchedule(_currentLevel, token: token);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success ? 'Schedule generated successfully' : 'Failed to generate schedule'),
            backgroundColor: success ? Colors.green : Colors.red,
          ),
        );
      }
    }
  }

  void _openCommentModal(ScheduleCourse course, String day, String timeSlot) {
    final userProvider = context.read<UserProvider>();
    final user = userProvider.userData;

    if (user == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => CommentModal(
        cellInfo: {
          'courseCode': course.code ?? '',
          'courseName': course.course,
          'day': day,
          'timeSlot': timeSlot,
          'level': _currentLevel,
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final userProvider = context.watch<UserProvider>();
    final scheduleProvider = context.watch<ScheduleProvider>();
    final userRole = userProvider.userData?['role'] as String?;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Academic Schedule'),
        backgroundColor: const Color(0xFF667eea),
      ),
      body: Column(
        children: [
          // Level Selection Buttons
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF667eea), Color(0xFF764ba2)],
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: List.generate(4, (index) {
                    final level = index + 1;
                    return _buildLevelButton(level);
                  }),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: List.generate(4, (index) {
                    final level = index + 5;
                    return _buildLevelButton(level);
                  }),
                ),
              ],
            ),
          ),

          // Schedule Title and Info
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Level $_currentLevel Schedule',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      if (scheduleProvider.currentSchedule != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          scheduleProvider.currentSchedule!.section,
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                        _buildStatusBadge(scheduleProvider.currentSchedule!),
                      ],
                    ],
                  ),
                ),
                if (userRole == 'Scheduler')
                  ElevatedButton.icon(
                    onPressed: scheduleProvider.isLoading ? null : _generateSchedule,
                    icon: const Icon(Icons.auto_awesome),
                    label: const Text('Generate'),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF667eea)),
                  ),
              ],
            ),
          ),

          // Schedule Grid
          Expanded(
            child: scheduleProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : scheduleProvider.error != null
                    ? _buildErrorWidget(scheduleProvider.error!)
                    : scheduleProvider.currentSchedule == null
                        ? _buildEmptyState()
                        : _buildScheduleGrid(scheduleProvider.currentSchedule!, userRole ?? 'Student'),
          ),
        ],
      ),
    );
  }

  Widget _buildLevelButton(int level) {
    final isSelected = level == _currentLevel;
    return ElevatedButton(
      onPressed: () => _switchLevel(level),
      style: ElevatedButton.styleFrom(
        backgroundColor: isSelected ? Colors.white : Colors.white.withValues(alpha: 0.3),
        foregroundColor: isSelected ? const Color(0xFF667eea) : Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      child: Text('L$level', style: const TextStyle(fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildStatusBadge(Schedule schedule) {
    return Container(
      margin: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: schedule.isPublished ? Colors.green : Colors.orange,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              schedule.status,
              style: const TextStyle(color: Colors.white, fontSize: 12),
            ),
          ),
          if (schedule.version > 0) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF667eea),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'v${schedule.version}',
                style: const TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildScheduleGrid(Schedule schedule, String userRole) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: SingleChildScrollView(
        child: DataTable(
          headingRowColor: WidgetStateProperty.all(const Color(0xFF667eea).withValues(alpha: 0.1)),
          border: TableBorder.all(color: Colors.grey.shade300),
          columns: [
            const DataColumn(label: Text('Day / Time', style: TextStyle(fontWeight: FontWeight.bold))),
            ..._timeSlots.map((slot) => DataColumn(
              label: Text(slot, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            )),
          ],
          rows: _days.map((day) {
            return DataRow(
              cells: [
                DataCell(Text(day, style: const TextStyle(fontWeight: FontWeight.bold))),
                ..._timeSlots.map((timeSlot) {
                  final course = schedule.grid[day]?[timeSlot];
                  return DataCell(_buildCourseCell(course, day, timeSlot, userRole));
                }),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildCourseCell(ScheduleCourse? course, String day, String timeSlot, String userRole) {
    if (course == null || course.isEmpty) {
      return Container(
        constraints: const BoxConstraints(minWidth: 100, minHeight: 50),
        alignment: Alignment.center,
        child: const Text('-', style: TextStyle(color: Colors.grey)),
      );
    }

    final canComment = userRole == 'Faculty' || userRole == 'LoadCommittee';

    return InkWell(
      onTap: canComment ? () => _openCommentModal(course, day, timeSlot) : null,
      child: Container(
        constraints: const BoxConstraints(minWidth: 120, minHeight: 60),
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: const Color(0xFFe3f2fd),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              course.course,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Color(0xFF1976d2),
                fontSize: 12,
              ),
            ),
            if (course.location != null && course.location!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                course.location!,
                style: TextStyle(fontSize: 10, color: Colors.grey[600]),
              ),
            ],
            if (canComment) ...[
              const SizedBox(height: 4),
              const Row(
                children: [
                  Icon(Icons.chat_bubble_outline, size: 12, color: Color(0xFF667eea)),
                  SizedBox(width: 4),
                  Text('Comment', style: TextStyle(fontSize: 10, color: Color(0xFF667eea))),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildErrorWidget(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.orange),
            const SizedBox(height: 16),
            Text(
              error,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadSchedule,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.calendar_today, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              'No schedule available for Level $_currentLevel',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 8),
            const Text(
              'The schedule committee is still working on it.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
