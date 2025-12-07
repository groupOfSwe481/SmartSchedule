import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../api/schedule_service.dart';
import '../data/models.dart';
import 'package:intl/intl.dart';

class VersionControlScreen extends StatefulWidget {
  const VersionControlScreen({super.key});

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
      backgroundColor: const Color(0xFF1e293b),
      appBar: _buildAppBar(),
      endDrawer: _buildEndDrawer(),
      body: _buildBody(),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      elevation: 0,
      backgroundColor: const Color(0xFF1e293b),
      title: Row(
        children: [
          const Icon(Icons.history, size: 24),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _selectedScheduleId != null ? 'Version History' : 'Version Control',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
          ),
          if (_selectedLevel != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Level $_selectedLevel',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
      actions: [
        Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu, color: Colors.white),
            onPressed: () => Scaffold.of(ctx).openEndDrawer(),
          ),
        ),
      ],
    );
  }

Widget _buildEndDrawer() {
  return Drawer(
    child: Container(
      color: const Color(0xFF2d3748),
      child: Column(
        children: [
          // thin header strip (optional, just colour)
          Container(
            height: 100,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
              ),
            ),
          ),
          // level list only
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: 6,
              itemBuilder: (_, index) {
                final level = index + 3;
                final isSelected = _selectedLevel == level;
                return _buildLevelMenuItem(level, isSelected);
              },
            ),
          ),
        ],
      ),
    ),
  );
}

  Widget _drawerTile(IconData icon, String title, VoidCallback onTap,
      {Color? textColor}) {
    return ListTile(
      leading: Icon(icon, color: textColor ?? Colors.white70),
      title: Text(title,
          style: TextStyle(
              color: textColor ?? Colors.white70, fontWeight: FontWeight.w500)),
      onTap: () {
        Navigator.pop(context);
        onTap();
      },
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      hoverColor: Colors.white10,
    );
  }

  Widget _buildLevelMenuItem(int level, bool isSelected) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.pop(context);
            _loadSchedulesForLevel(level);
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              gradient: isSelected
                  ? const LinearGradient(
                      colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)])
                  : null,
              color: isSelected ? null : Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: isSelected
                      ? Colors.transparent
                      : Colors.white.withOpacity(0.1),
                  width: 1),
            ),
            child: Row(
              children: [
                Icon(Icons.circle,
                    color: isSelected ? Colors.white : const Color(0xFF6366f1),
                    size: 8),
                const SizedBox(width: 12),
                Text('Level $level',
                    style: TextStyle(
                        color: isSelected ? Colors.white : Colors.white70,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        fontSize: 15))
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_selectedLevel == null) {
      return _buildEmptyState(
          icon: Icons.history,
          title: 'Select a Level',
          subtitle: 'Open the menu and choose a level to view version history');
    }
    if (_selectedScheduleId != null) return _buildVersionTimeline();
    return _buildSchedulesList();
  }

  Widget _buildEmptyState(
      {required IconData icon,
      required String title,
      required String subtitle}) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 80, color: Colors.white54),
          const SizedBox(height: 16),
          Text(title,
              style: const TextStyle(
                  fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(subtitle,
                style: const TextStyle(fontSize: 14, color: Colors.white70),
                textAlign: TextAlign.center),
          ),
        ],
      ),
    );
  }

  Widget _buildSchedulesList() {
    if (_isLoadingSchedules) {
      return const Center(
          child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366f1))));
    }
    if (_schedules.isEmpty) {
      return _buildEmptyState(
          icon: Icons.inbox,
          title: 'No Schedules Found',
          subtitle: 'No schedules found for Level $_selectedLevel');
    }

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 20,
              offset: const Offset(0, 10))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children:  [
            const Icon(Icons.schedule, color: Color(0xFF1e293b)),
            const SizedBox(width: 12),
            Expanded(
                child: Text('Schedules - Level ${_selectedLevel!}',
                    style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1e293b))))
          ]),
          const SizedBox(height: 16),
          Expanded(
            child: ListView.separated(
              itemCount: _schedules.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, index) => _buildScheduleCard(_schedules[index]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleCard(Schedule schedule) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _loadHistoryForSchedule(schedule.id, schedule.section),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                const Color(0xFF6366f1).withOpacity(0.1),
                const Color(0xFF8b5cf6).withOpacity(0.1),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            border: const Border(
                left: BorderSide(color: Color(0xFF6366f1), width: 4)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(schedule.section,
                        style: const TextStyle(
                            color: Color(0xFF6366f1),
                            fontSize: 16,
                            fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text('Last Edit (History v${schedule.historyVersion ?? 1})',
                        style:
                            const TextStyle(color: Colors.black54, fontSize: 12)),
                    const SizedBox(height: 4),
                    Row(children: [
                      Icon(
                          schedule.isPublished
                              ? Icons.check_circle
                              : Icons.edit,
                          size: 14,
                          color: schedule.isPublished
                              ? const Color(0xFF10b981)
                              : const Color(0xFFf59e0b)),
                      const SizedBox(width: 4),
                      Text(schedule.isPublished ? 'Published (v${schedule.version})' : 'Draft',
                          style: TextStyle(
                              color: schedule.isPublished
                                  ? const Color(0xFF10b981)
                                  : const Color(0xFFf59e0b),
                              fontSize: 12))
                    ])
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.black54)
            ],
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
                        valueColor:
                            AlwaysStoppedAnimation<Color>(Color(0xFF6366f1))))
                : _historyVersions.isEmpty
                    ? _buildEmptyState(
                        icon: Icons.inbox,
                        title: 'No History',
                        subtitle: 'This schedule has no recorded changes yet')
                    : _buildHistoryList()),
      ],
    );
  }

Widget _buildBreadcrumb() {
  return Container(
    width: double.infinity,
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    color: Colors.white,
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
          icon: const Icon(Icons.arrow_back, size: 20),
          label: const Text('Back to Schedules'),
          style: TextButton.styleFrom(foregroundColor: const Color(0xFF6366f1)),
        ),
        const Spacer(),
        Chip(
          label: Text('Level $_selectedLevel',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          backgroundColor: const Color(0xFFF1F5F9),
          padding: EdgeInsets.zero,
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        const SizedBox(width: 6),
        Chip(
          label: Text(_selectedSection ?? '',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
          backgroundColor: const Color(0xFF6366f1),
          padding: EdgeInsets.zero,
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
      ],
    ),
  );
}

  Widget _buildHistoryList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _historyVersions.length,
      itemBuilder: (_, index) {
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
            width: isCurrent ? 2 : 1),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 2))
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              if (isCurrent)
                Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: const BoxDecoration(
                        gradient: LinearGradient(
                            colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)]),
                        borderRadius: BorderRadius.all(Radius.circular(6))),
                    child: const Row(children: [
                      Icon(Icons.star, color: Colors.white, size: 14),
                      SizedBox(width: 4),
                      Text('CURRENT',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.bold))
                    ])),
              if (isCurrent) const SizedBox(width: 12),
              Text('History v${history.historyVersion}',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isCurrent
                          ? const Color(0xFF6366f1)
                          : const Color(0xFF1e293b))),
              const Spacer(),
              Text(_getRelativeTime(history.timestamp),
                  style: const TextStyle(fontSize: 13, color: Color(0xFF64748b)))
            ]),
            const SizedBox(height: 8),
            Text(DateFormat('MMM d, yyyy h:mm a').format(history.timestamp),
                style: const TextStyle(fontSize: 13, color: Color(0xFF94a3b8))),
            const SizedBox(height: 12),
            Text('Modified by: ${history.userId}',
                style: const TextStyle(fontSize: 14, color: Color(0xFF64748b))),
            const SizedBox(height: 4),
            Text('Summary: ${history.summary}',
                style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF1e293b),
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 16),
            const Text('Changes Made:',
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1e293b))),
            const SizedBox(height: 8),
            _buildChangesSection(history.delta),
            if (!isCurrent) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _restoreVersion(history.historyVersion),
                  icon: const Icon(Icons.restore, size: 18),
                  label: const Text('Restore This Version'),
                  style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366f1),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12))),
                ),
              )
            ]
          ],
        ),
      ),
    );
  }

Widget _buildChangesSection(Map<String, dynamic> delta) {
  final rawGrid = delta['grid'];
  final gridChanges =
      rawGrid is Map<String, dynamic> ? rawGrid : <String, dynamic>{};

  if (gridChanges.isEmpty) {
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

  final changeWidgets = <Widget>[];
  var changeCount = 0;

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
          Row(children: [
            const Icon(Icons.arrow_forward, size: 14, color: Color(0xFF6366f1)),
            const SizedBox(width: 4),
            Text('$day at $timeSlot',
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1e293b)))
          ]),
          const SizedBox(height: 4),
          Row(children: [
            const SizedBox(width: 18),
            const Text('- ',
                style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
            Expanded(
                child: Text(oldValue.isEmpty ? '(empty)' : oldValue,
                    style: TextStyle(
                        color: Colors.red.shade700,
                        fontSize: 12,
                        decoration: TextDecoration.lineThrough)))
          ]),
          Row(children: [
            const SizedBox(width: 18),
            const Text('+ ',
                style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
            Expanded(
                child: Text(newValue.isEmpty ? '(empty)' : newValue,
                    style: TextStyle(
                        color: Colors.green.shade700,
                        fontSize: 12,
                        fontWeight: FontWeight.bold)))
          ]),
        ],
      ),
    );
  }

  String _getRelativeTime(DateTime timestamp) {
    final now = DateTime.now();
    final diff = now.difference(timestamp);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    if (diff.inDays < 30) return '${diff.inDays}d ago';
    return DateFormat('MMM d').format(timestamp);
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
      builder: (_) => AlertDialog(
        title: const Text('Restore Version'),
        content: Text(
            'Are you sure you want to restore History v$version?\n\n'
            'This will create a new history entry with the restored state.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366f1)),
              child: const Text('Restore'))
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

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['success']
              ? (result['message'] ?? 'Version restored successfully')
              : (result['message'] ?? 'Failed to restore version')),
          backgroundColor: result['success'] ? Colors.green : Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );

      if (result['success']) {
        _loadHistoryForSchedule(_selectedScheduleId!, _selectedSection!);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}