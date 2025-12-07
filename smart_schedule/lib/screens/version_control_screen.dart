import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../providers/schedule_provider.dart';
import '../api/schedule_service.dart';
import '../data/models.dart';
import 'package:intl/intl.dart';

class VersionControlScreen extends StatefulWidget {
  const VersionControlScreen({Key? key}) : super(key: key);

  @override
  State<VersionControlScreen> createState() => _VersionControlScreenState();
}

class _VersionControlScreenState extends State<VersionControlScreen> {
  int? _selectedLevel;
  String? _selectedScheduleId;
  String? _selectedSection;
  List<Schedule> _schedules = [];
  List<ScheduleHistory> _historyVersions = [];
  bool _isLoadingSchedules = false;
  bool _isLoadingHistory = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: _buildAppBar(),
      body: Row(
        children: [
          _buildSidebar(),
          Expanded(child: _buildMainContent()),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      elevation: 0,
      flexibleSpace: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
          ),
        ),
      ),
      title: const Row(
        children: [
          Icon(Icons.history, size: 28),
          SizedBox(width: 12),
          Text(
            'Version Control & History',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }

  Widget _buildSidebar() {
    return Container(
      width: 280,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          right: BorderSide(color: const Color(0xFFE2E8F0), width: 1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Text(
              'Filter by Level',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF1e293b),
              ),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: 6,
              itemBuilder: (context, index) {
                final level = index + 3;
                final isSelected = _selectedLevel == level;
                return _buildLevelButton(level, isSelected);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLevelButton(int level, bool isSelected) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _loadSchedulesForLevel(level),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              gradient: isSelected
                  ? const LinearGradient(
                      colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
                    )
                  : null,
              color: isSelected ? null : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected
                    ? Colors.transparent
                    : const Color(0xFFE2E8F0),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.layers,
                  color: isSelected ? Colors.white : const Color(0xFF64748b),
                  size: 20,
                ),
                const SizedBox(width: 12),
                Text(
                  'Level $level',
                  style: TextStyle(
                    color: isSelected ? Colors.white : const Color(0xFF1e293b),
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMainContent() {
    if (_selectedLevel == null) {
      return _buildEmptyState(
        icon: Icons.history,
        title: 'Select a Level',
        subtitle: 'Choose a level from the sidebar to view version history',
      );
    }

    if (_selectedScheduleId != null) {
      return _buildVersionTimeline();
    }

    return _buildSchedulesList();
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 80, color: const Color(0xFF94a3b8)),
          const SizedBox(height: 16),
          Text(
            title,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1e293b),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF64748b),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildSchedulesList() {
    if (_isLoadingSchedules) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366f1)),
        ),
      );
    }

    if (_schedules.isEmpty) {
      return _buildEmptyState(
        icon: Icons.inbox,
        title: 'No Schedules Found',
        subtitle: 'No draft schedules found for Level $_selectedLevel',
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Schedules for Level $_selectedLevel',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1e293b),
            ),
          ),
          const SizedBox(height: 20),
          ...(_schedules.map((schedule) => _buildScheduleCard(schedule))),
        ],
      ),
    );
  }

  Widget _buildScheduleCard(Schedule schedule) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _loadHistoryForSchedule(schedule.id, schedule.section),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.description, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        schedule.section,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1e293b),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Last Edit: History v${schedule.historyVersion ?? 1}',
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF64748b),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: schedule.status == 'Published'
                              ? const Color(0xFF10b981)
                              : const Color(0xFF6366f1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          schedule.status == 'Published'
                              ? 'Published (v${schedule.version})'
                              : 'Draft',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_ios, color: Color(0xFF94a3b8), size: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildVersionTimeline() {
    return Column(
      children: [
        _buildBreadcrumb(),
        Expanded(
          child: _isLoadingHistory
              ? const Center(
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366f1)),
                  ),
                )
              : _historyVersions.isEmpty
                  ? _buildEmptyState(
                      icon: Icons.inbox,
                      title: 'No History',
                      subtitle: 'This schedule has no recorded changes yet',
                    )
                  : _buildHistoryList(),
        ),
      ],
    );
  }

  Widget _buildBreadcrumb() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Color(0xFFE2E8F0)),
        ),
      ),
      child: Row(
        children: [
          TextButton.icon(
            onPressed: () {
              setState(() {
                _selectedScheduleId = null;
                _selectedSection = null;
                _historyVersions = [];
              });
            },
            icon: const Icon(Icons.arrow_back, size: 18),
            label: const Text('Back'),
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF6366f1),
            ),
          ),
          const SizedBox(width: 12),
          const Icon(Icons.chevron_right, color: Color(0xFF94a3b8), size: 20),
          const SizedBox(width: 12),
          Text(
            'Level $_selectedLevel',
            style: const TextStyle(
              color: Color(0xFF64748b),
              fontSize: 15,
            ),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.chevron_right, color: Color(0xFF94a3b8), size: 20),
          const SizedBox(width: 8),
          Text(
            _selectedSection ?? '',
            style: const TextStyle(
              color: Color(0xFF1e293b),
              fontSize: 15,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryList() {
    return ListView.builder(
      padding: const EdgeInsets.all(24),
      itemCount: _historyVersions.length,
      itemBuilder: (context, index) {
        final history = _historyVersions[index];
        final isCurrent = index == 0;
        return _buildHistoryCard(history, isCurrent);
      },
    );
  }

  Widget _buildHistoryCard(ScheduleHistory history, bool isCurrent) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCurrent ? const Color(0xFF6366f1) : const Color(0xFFE2E8F0),
          width: isCurrent ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (isCurrent)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
                      ),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.star, color: Colors.white, size: 14),
                        SizedBox(width: 4),
                        Text(
                          'CURRENT DRAFT',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                if (isCurrent) const SizedBox(width: 12),
                Text(
                  'History v${history.historyVersion}',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isCurrent ? const Color(0xFF6366f1) : const Color(0xFF1e293b),
                  ),
                ),
                const Spacer(),
                Text(
                  _getRelativeTime(history.timestamp),
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748b),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              DateFormat('MMM d, yyyy h:mm a').format(history.timestamp),
              style: const TextStyle(
                fontSize: 13,
                color: Color(0xFF94a3b8),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Modified by: ${history.userId}',
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF64748b),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Summary: ${history.summary}',
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF1e293b),
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Changes Made:',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1e293b),
              ),
            ),
            const SizedBox(height: 8),
            _buildChangesSection(history.delta),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _viewFullSchedule(history),
                    icon: const Icon(Icons.visibility, size: 18),
                    label: const Text('View Full Schedule'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF6366f1),
                      side: const BorderSide(color: Color(0xFF6366f1)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                if (!isCurrent) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _restoreVersion(history.historyVersion),
                      icon: const Icon(Icons.restore, size: 18),
                      label: const Text('Restore'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366f1),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChangesSection(Map<String, dynamic> delta) {
    final gridChanges = delta['grid'] as Map<String, dynamic>?;

    if (gridChanges == null || gridChanges.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Text(
          'No changes detected',
          style: TextStyle(color: Color(0xFF64748b)),
        ),
      );
    }

    List<Widget> changeWidgets = [];
    int changeCount = 0;

    gridChanges.forEach((day, timeSlots) {
      (timeSlots as Map<String, dynamic>).forEach((timeSlot, change) {
        if (change is List && change.length == 2) {
          changeCount++;
          changeWidgets.add(_buildChangeItem(day, timeSlot, change[0], change[1]));
        }
      });
    });

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$changeCount change${changeCount != 1 ? 's' : ''} detected',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Color(0xFF6366f1),
            ),
          ),
          const SizedBox(height: 8),
          ...changeWidgets,
        ],
      ),
    );
  }

  Widget _buildChangeItem(String day, String timeSlot, String oldValue, String newValue) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.arrow_forward, size: 14, color: Color(0xFF6366f1)),
              const SizedBox(width: 4),
              Text(
                '$day at $timeSlot',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1e293b),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const SizedBox(width: 18),
              const Text('- ', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
              Text(
                oldValue.isEmpty ? '(empty)' : oldValue,
                style: TextStyle(
                  color: Colors.red.shade700,
                  fontSize: 12,
                  decoration: TextDecoration.lineThrough,
                ),
              ),
            ],
          ),
          Row(
            children: [
              const SizedBox(width: 18),
              const Text('+ ', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
              Text(
                newValue.isEmpty ? '(empty)' : newValue,
                style: TextStyle(
                  color: Colors.green.shade700,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _getRelativeTime(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes} minute${difference.inMinutes != 1 ? 's' : ''} ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours} hour${difference.inHours != 1 ? 's' : ''} ago';
    } else if (difference.inDays < 30) {
      return '${difference.inDays} day${difference.inDays != 1 ? 's' : ''} ago';
    } else {
      return DateFormat('MMM d, yyyy').format(timestamp);
    }
  }

  Future<void> _loadSchedulesForLevel(int level) async {
    setState(() {
      _selectedLevel = level;
      _selectedScheduleId = null;
      _selectedSection = null;
      _isLoadingSchedules = true;
      _error = null;
      _historyVersions = [];
    });

    try {
      final userProvider = context.read<UserProvider>();
      final result = await ScheduleService.getSchedulesByLevel(
        level,
        token: userProvider.token,
      );

      if (result['success']) {
        setState(() {
          _schedules = (result['schedules'] as List)
              .map((json) => Schedule.fromJson(json as Map<String, dynamic>))
              .toList();
          _isLoadingSchedules = false;
        });
      } else {
        setState(() {
          _error = result['message'];
          _schedules = [];
          _isLoadingSchedules = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _schedules = [];
        _isLoadingSchedules = false;
      });
    }
  }

  Future<void> _loadHistoryForSchedule(String scheduleId, String section) async {
    setState(() {
      _selectedScheduleId = scheduleId;
      _selectedSection = section;
      _isLoadingHistory = true;
    });

    try {
      final userProvider = context.read<UserProvider>();
      final result = await ScheduleService.getScheduleHistory(
        scheduleId: scheduleId,
        token: userProvider.token,
      );

      if (result['success']) {
        setState(() {
          _historyVersions = (result['history'] as List)
              .map((json) => ScheduleHistory.fromJson(json as Map<String, dynamic>))
              .toList();
          _isLoadingHistory = false;
        });
      } else {
        setState(() {
          _error = result['message'];
          _historyVersions = [];
          _isLoadingHistory = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _historyVersions = [];
        _isLoadingHistory = false;
      });
    }
  }

  Future<void> _restoreVersion(int version) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Restore Version'),
        content: Text(
          'Are you sure you want to restore History v$version?\n\n'
          'This will create a new history entry and update the current draft. '
          'Published schedules will not be affected.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6366f1),
            ),
            child: const Text('Restore'),
          ),
        ],
      ),
    );

    if (confirmed != true || _selectedScheduleId == null) return;

    try {
      final userProvider = context.read<UserProvider>();
      final result = await ScheduleService.restoreScheduleVersion(
        scheduleId: _selectedScheduleId!,
        version: version,
        token: userProvider.token!,
      );

      if (mounted) {
        if (result['success']) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Version restored successfully'),
              backgroundColor: Colors.green,
            ),
          );
          // Reload history
          _loadHistoryForSchedule(_selectedScheduleId!, _selectedSection!);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Failed to restore version'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _viewFullSchedule(ScheduleHistory history) {
    // TODO: Implement full schedule view modal
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('View Full Schedule - Coming Soon')),
    );
  }
}
