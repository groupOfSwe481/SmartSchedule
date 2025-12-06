import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../providers/schedule_provider.dart';
import '../providers/irregular_provider.dart';
import '../services/collaboration_manager.dart';
import '../data/models.dart';

class SchedulerHomeScreen extends StatefulWidget {
  const SchedulerHomeScreen({super.key});

  @override
  State<SchedulerHomeScreen> createState() => _SchedulerHomeScreenState();
}

class _SchedulerHomeScreenState extends State<SchedulerHomeScreen> {
  int _selectedScheduleIndex = 0;
  bool _isEditMode = false;
  Map<String, Map<String, TextEditingController>> _editControllers = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final userProvider = context.read<UserProvider>();
      final scheduleProvider = context.read<ScheduleProvider>();
      final token = userProvider.token;

      scheduleProvider.fetchSchedulerSchedules(3, token: token);
    });
  }

  @override
  void dispose() {
    _disposeControllers();
    super.dispose();
  }

  void _disposeControllers() {
    _editControllers.forEach((day, timeSlots) {
      timeSlots.forEach((timeSlot, controller) {
        controller.dispose();
      });
    });
    _editControllers.clear();
  }

  Future<void> _generateSchedule(int level) async {
    final userProvider = context.read<UserProvider>();
    final scheduleProvider = context.read<ScheduleProvider>();
    final token = userProvider.token;

    if (token == null) {
      _showSnackBar('Authentication required', Colors.red);
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.auto_awesome, color: Color(0xFF6366f1)),
            SizedBox(width: 12),
            Text('Generate Schedule'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Generate new schedule for Level $level using Gemini AI?'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFe3f2fd),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, size: 20, color: Color(0xFF1976d2)),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'This will create a new draft schedule',
                      style: TextStyle(fontSize: 13, color: Color(0xFF1976d2)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(context, true),
            icon: const Icon(Icons.auto_awesome),
            label: const Text('Generate'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6366f1),
            ),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await scheduleProvider.generateSchedule(level, token: token);
      if (mounted) {
        _showSnackBar(
          success
              ? 'Schedule generated successfully!'
              : scheduleProvider.error ?? 'Failed to generate schedule',
          success ? Colors.green : Colors.red,
        );
      }
    }
  }

  void _showSnackBar(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _enterEditMode(Schedule schedule) async {
    final userProvider = context.read<UserProvider>();
    final collaborationManager = context.read<CollaborationManager>();

    setState(() {
      _isEditMode = true;
      _disposeControllers();
      _editControllers = {};

      // Initialize controllers with current schedule data
      final days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
      final timeSlots = [
        '8:00-8:50',
        '9:00-9:50',
        '10:00-10:50',
        '11:00-11:50',
        '12:00-12:50',
        '1:00-1:50',
        '2:00-2:50',
        '3:00-3:50',
      ];

      for (var day in days) {
        _editControllers[day] = {};
        for (var timeSlot in timeSlots) {
          final course = schedule.grid[day]?[timeSlot];
          _editControllers[day]![timeSlot] = TextEditingController(
            text: course?.course ?? '',
          );
        }
      }
    });

    // Initialize real-time collaboration
    try {
      await collaborationManager.init(schedule.id, userProvider.userData!);

      // Listen for cell updates from other users
      collaborationManager.addListener(_handleCollaborationUpdate);

      if (mounted) {
        _showSnackBar('Real-time collaboration enabled!', Colors.green);
      }
    } catch (e) {
      if (mounted) {
        _showSnackBar(
          'Collaboration unavailable. You can still edit offline.',
          Colors.orange,
        );
      }
    }
  }

  void _handleCollaborationUpdate() {
    final collaborationManager = context.read<CollaborationManager>();
    final update = collaborationManager.latestCellUpdate;

    if (update != null) {
      final cellId = update['cellId'] as String;
      final cellData = update['cellData'] as Map<String, dynamic>;
      final courseValue = cellData['course'] as String;

      // Parse cellId (format: "day-timeSlot")
      final parts = cellId.split('-');
      if (parts.length == 2) {
        final day = parts[0];
        final timeSlot = parts[1];

        // Update the controller if it exists
        final controller = _editControllers[day]?[timeSlot];
        if (controller != null && controller.text != courseValue) {
          // Only update if the value is different to avoid cursor jumping
          controller.text = courseValue;
        }
      }

      // Clear the update
      collaborationManager.clearLatestCellUpdate();
    }
  }

  void _cancelEditMode() {
    final collaborationManager = context.read<CollaborationManager>();
    collaborationManager.removeListener(_handleCollaborationUpdate);
    collaborationManager.disconnect();

    setState(() {
      _isEditMode = false;
      _disposeControllers();
    });
  }

  Future<void> _saveEditMode(Schedule schedule) async {
    final userProvider = context.read<UserProvider>();
    final scheduleProvider = context.read<ScheduleProvider>();
    final collaborationManager = context.read<CollaborationManager>();
    final token = userProvider.token;

    if (token == null) {
      _showSnackBar('Authentication required', Colors.red);
      return;
    }

    // Build the updated grid from controllers
    final updatedGrid = <String, Map<String, dynamic>>{};

    _editControllers.forEach((day, timeSlots) {
      updatedGrid[day] = {};
      timeSlots.forEach((timeSlot, controller) {
        final value = controller.text.trim();
        if (value.isNotEmpty) {
          updatedGrid[day]![timeSlot] = {
            'course': value,
            'code': null,
            'location': null,
          };
        }
      });
    });

    // Save to backend
    final success = await scheduleProvider.updateSchedule(
      scheduleId: schedule.id,
      grid: updatedGrid,
      token: token,
    );

    if (mounted) {
      _showSnackBar(
        success
            ? 'Schedule saved successfully!'
            : scheduleProvider.error ?? 'Failed to save schedule',
        success ? Colors.green : Colors.red,
      );

      if (success) {
        // Disconnect collaboration
        collaborationManager.removeListener(_handleCollaborationUpdate);
        collaborationManager.disconnect();

        setState(() {
          _isEditMode = false;
          _disposeControllers();
        });

        // Refresh the schedules
        await scheduleProvider.fetchSchedulerSchedules(
          scheduleProvider.currentLevel,
          token: token,
        );
      }
    }
  }

  Future<void> _publishSchedule(Schedule schedule) async {
    final userProvider = context.read<UserProvider>();
    final scheduleProvider = context.read<ScheduleProvider>();
    final token = userProvider.token;

    if (token == null) {
      _showSnackBar('Authentication required', Colors.red);
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.publish, color: Color(0xFF10b981)),
            SizedBox(width: 12),
            Text('Publish Schedule'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Publish this schedule (Version ${schedule.version})?'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFe3f2fd),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, size: 20, color: Color(0xFF1976d2)),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Once published, the schedule will be visible to students and faculty.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF1976d2)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(context, true),
            icon: const Icon(Icons.publish),
            label: const Text('Publish'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10b981),
            ),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await scheduleProvider.publishSchedule(
        scheduleId: schedule.id,
        token: token,
      );

      if (mounted) {
        _showSnackBar(
          success
              ? 'Schedule published successfully!'
              : scheduleProvider.error ?? 'Failed to publish schedule',
          success ? Colors.green : Colors.red,
        );
      }
    }
  }

  Future<void> _checkImpact(Schedule schedule) async {
    final userProvider = context.read<UserProvider>();
    final irregularProvider = context.read<IrregularProvider>();
    final token = userProvider.token;

    if (token == null) {
      _showSnackBar('Authentication required', Colors.red);
      return;
    }

    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Checking impact on irregular students...'),
              ],
            ),
          ),
        ),
      ),
    );

    final success = await irregularProvider.checkScheduleImpact(
      draftScheduleId: schedule.id,
      token: token,
    );

    if (!mounted) return;

    // Close loading dialog
    Navigator.pop(context);

    if (success) {
      // Show impact report dialog
      _showImpactReportDialog(irregularProvider.latestImpactReport!);
    } else {
      _showSnackBar(
        irregularProvider.error ?? 'Failed to check impact',
        Colors.red,
      );
    }
  }

  void _showImpactReportDialog(ImpactReport report) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              report.impactedCount > 0 ? Icons.warning : Icons.check_circle,
              color: report.impactedCount > 0 ? const Color(0xFFf59e0b) : const Color(0xFF10b981),
            ),
            const SizedBox(width: 12),
            const Text('Schedule Impact Report'),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Summary
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: report.impactedCount > 0
                      ? const Color(0xFFfef3c7)
                      : const Color(0xFFd1fae5),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: report.impactedCount > 0
                        ? const Color(0xFFf59e0b)
                        : const Color(0xFF10b981),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Draft: ${report.draftSection}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      report.impactedCount == 0
                          ? '✓ No irregular students will be impacted by this schedule'
                          : '⚠ ${report.impactedCount} irregular student${report.impactedCount > 1 ? 's' : ''} will be impacted',
                      style: TextStyle(
                        fontSize: 13,
                        color: report.impactedCount > 0
                            ? const Color(0xFF92400e)
                            : const Color(0xFF065f46),
                      ),
                    ),
                  ],
                ),
              ),

              // Impacted students list
              if (report.impactedStudents.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Impacted Students:',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 8),
                Flexible(
                  child: Container(
                    constraints: const BoxConstraints(maxHeight: 300),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: report.impactedStudents.length,
                      separatorBuilder: (context, index) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final student = report.impactedStudents[index];
                        return ExpansionTile(
                          dense: true,
                          title: Text(
                            student.studentId,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          subtitle: Text(
                            'Level ${student.level} • ${student.conflictingCourses.length} conflict${student.conflictingCourses.length > 1 ? 's' : ''}',
                            style: const TextStyle(fontSize: 11),
                          ),
                          children: [
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Conflicting Courses:',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  ...student.conflictingCourses.map((course) {
                                    return Padding(
                                      padding: const EdgeInsets.only(left: 8, top: 4),
                                      child: Row(
                                        children: [
                                          const Icon(
                                            Icons.circle,
                                            size: 6,
                                            color: Color(0xFFf59e0b),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            '${course.code} (Level ${course.level})',
                                            style: const TextStyle(fontSize: 11),
                                          ),
                                        ],
                                      ),
                                    );
                                  }),
                                ],
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          if (report.impactedCount > 0)
            TextButton.icon(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/irregular-students');
              },
              icon: const Icon(Icons.edit, size: 18),
              label: const Text('Manage Irregular Students'),
            ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1e293b),
      appBar: _buildAppBar(),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildWelcomeHeader(),
            _buildLevelSelector(),
            _buildScheduleSection(),
          ],
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
          Icon(Icons.schedule, size: 28),
          SizedBox(width: 12),
          Text(
            'SmartSchedule - Scheduler',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
        ],
      ),
      actions: [
        Consumer<UserProvider>(
          builder: (context, userProvider, child) {
            final userName = userProvider.displayName;

            return PopupMenuButton<Object?>(
              icon: CircleAvatar(
                backgroundColor: Colors.white24,
                child: Text(
                  userName.isNotEmpty ? userName[0].toUpperCase() : 'S',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              itemBuilder: (BuildContext context) => [
                const PopupMenuItem(
                  child: Row(
                    children: [
                      Icon(Icons.person, size: 20),
                      SizedBox(width: 12),
                      Text('Profile'),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  onTap: () {
                    Navigator.pushNamed(context, '/irregular-students');
                  },
                  child: const Row(
                    children: [
                      Icon(Icons.school_outlined, size: 20),
                      SizedBox(width: 12),
                      Text('Irregular Students'),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  onTap: () async {
                    userProvider.logout();
                    if (!mounted) return;
                    Navigator.pushReplacementNamed(context, '/login');
                  },
                  child: const Row(
                    children: [
                      Icon(Icons.logout, size: 20),
                      SizedBox(width: 12),
                      Text('Logout'),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ],
    );
  }

  Widget _buildWelcomeHeader() {
    return Consumer<UserProvider>(
      builder: (context, userProvider, child) {
        return Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Welcome, ${userProvider.displayName}!',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Role: Scheduler',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Current Semester',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Fall 2025',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    Icon(
                      Icons.calendar_today,
                      color: Colors.white,
                      size: 32,
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLevelSelector() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.layers, color: Color(0xFF1e293b)),
              SizedBox(width: 12),
              Text(
                'Select Academic Level',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1e293b),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Consumer2<ScheduleProvider, UserProvider>(
            builder: (context, scheduleProvider, userProvider, child) {
              return Wrap(
                spacing: 8,
                runSpacing: 8,
                children: List.generate(6, (index) {
                  final level = index + 3; // Start from level 3 (3, 4, 5, 6, 7, 8)
                  final isSelected = scheduleProvider.currentLevel == level;
                  return _buildLevelButton(
                    level,
                    isSelected,
                    () {
                      scheduleProvider.setLevel(level);
                      scheduleProvider.fetchSchedulerSchedules(
                        level,
                        token: userProvider.token,
                      );
                    },
                  );
                }),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildLevelButton(int level, bool isSelected, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        decoration: BoxDecoration(
          gradient: isSelected
              ? const LinearGradient(
                  colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
                )
              : null,
          color: isSelected ? null : Colors.white,
          border: Border.all(
            color: isSelected ? Colors.transparent : const Color(0xFFe2e8f0),
            width: 2,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF6366f1).withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Text(
          'Level $level',
          style: TextStyle(
            color: isSelected ? Colors.white : const Color(0xFF1e293b),
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
      ),
    );
  }

  Widget _buildScheduleSection() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Consumer<ScheduleProvider>(
        builder: (context, scheduleProvider, child) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.calendar_today, color: Color(0xFF1e293b)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Schedules - Level ${scheduleProvider.currentLevel}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1e293b),
                      ),
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: scheduleProvider.isLoading
                        ? null
                        : () => _generateSchedule(scheduleProvider.currentLevel),
                    icon: const Icon(Icons.auto_awesome, size: 18),
                    label: const Text('Generate'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366f1),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFe3f2fd),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      color: Color(0xFF1976d2),
                      size: 20,
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Tip: Click "Edit" to enter edit mode, make your changes, then click "Save".',
                        style: TextStyle(
                          color: Color(0xFF1976d2),
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              if (scheduleProvider.isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (scheduleProvider.error != null)
                _buildErrorState(scheduleProvider.error!)
              else if (scheduleProvider.schedules.isEmpty)
                _buildEmptyState(scheduleProvider.currentLevel)
              else
                _buildSchedulesList(scheduleProvider.schedules),
            ],
          );
        },
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          children: [
            const Icon(
              Icons.warning_amber_rounded,
              size: 48,
              color: Colors.orange,
            ),
            const SizedBox(height: 16),
            Text(
              error,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(int level) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          children: [
            const Icon(
              Icons.calendar_today,
              size: 64,
              color: Colors.grey,
            ),
            const SizedBox(height: 16),
            Text(
              'No schedules available for Level $level',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 8),
            const Text(
              'Generate a new schedule to get started',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _generateSchedule(level),
              icon: const Icon(Icons.auto_awesome),
              label: const Text('Generate Schedule'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366f1),
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 16,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSchedulesList(List<Schedule> schedules) {
    // Ensure selected index is within bounds
    if (_selectedScheduleIndex >= schedules.length) {
      _selectedScheduleIndex = 0;
    }

    return Column(
      children: [
        // Schedule selector tabs
        if (schedules.length > 1)
          Container(
            height: 50,
            margin: const EdgeInsets.only(bottom: 16),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: schedules.length,
              itemBuilder: (context, index) {
                final schedule = schedules[index];
                final isSelected = _selectedScheduleIndex == index;
                return GestureDetector(
                  onTap: () => setState(() => _selectedScheduleIndex = index),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? const Color(0xFF6366f1)
                          : Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Text(
                          schedule.section,
                          style: TextStyle(
                            color: isSelected ? Colors.white : Colors.black,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: schedule.isPublished
                                ? Colors.green
                                : Colors.orange,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            schedule.status,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        // Selected schedule
        _buildScheduleCard(schedules[_selectedScheduleIndex]),
      ],
    );
  }

  Widget _buildScheduleCard(Schedule schedule) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Level ${schedule.level} - ${schedule.section}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: schedule.isPublished ? Colors.green : Colors.orange,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          schedule.status,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      if (schedule.version > 0) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF6366f1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'v${schedule.version}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
              // Action buttons
              Row(
                children: [
                  if (_isEditMode) ...[
                    // Cancel button
                    TextButton.icon(
                      onPressed: _cancelEditMode,
                      icon: const Icon(Icons.cancel, size: 18),
                      label: const Text('Cancel'),
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.grey.shade700,
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Save button
                    ElevatedButton.icon(
                      onPressed: () => _saveEditMode(schedule),
                      icon: const Icon(Icons.save, size: 18),
                      label: const Text('Save'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ] else ...[
                    // Edit button
                    ElevatedButton.icon(
                      onPressed: () => _enterEditMode(schedule),
                      icon: const Icon(Icons.edit, size: 18),
                      label: const Text('Edit'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366f1),
                        foregroundColor: Colors.white,
                      ),
                    ),
                    // Publish button - only show for Draft schedules
                    if (schedule.isDraft) ...[
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        onPressed: () => _publishSchedule(schedule),
                        icon: const Icon(Icons.publish, size: 18),
                        label: const Text('Publish'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10b981),
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                    // Check Impact button - show for all schedules
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      onPressed: () => _checkImpact(schedule),
                      icon: const Icon(Icons.warning_amber, size: 18),
                      label: const Text('Check Impact'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFf59e0b),
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Show active collaborators when in edit mode
          if (_isEditMode) _buildActiveUsersWidget(),
          if (_isEditMode) const SizedBox(height: 16),
          _buildScheduleTable(schedule),
        ],
      ),
    );
  }

  Widget _buildActiveUsersWidget() {
    return Consumer<CollaborationManager>(
      builder: (context, collaborationManager, child) {
        if (!collaborationManager.isConnected) {
          return Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.orange.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.orange.shade200),
            ),
            child: Row(
              children: [
                Icon(Icons.cloud_off, size: 16, color: Colors.orange.shade700),
                const SizedBox(width: 8),
                Text(
                  'Offline mode - Changes will sync when reconnected',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.orange.shade700,
                  ),
                ),
              ],
            ),
          );
        }

        final activeUsers = collaborationManager.activeUsers;
        if (activeUsers.isEmpty) {
          return Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.green.shade200),
            ),
            child: Row(
              children: [
                Icon(Icons.check_circle, size: 16, color: Colors.green.shade700),
                const SizedBox(width: 8),
                Text(
                  'Real-time collaboration active - You\'re editing alone',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.green.shade700,
                  ),
                ),
              ],
            ),
          );
        }

        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.blue.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.people, size: 16, color: Colors.blue.shade700),
                  const SizedBox(width: 8),
                  Text(
                    'Editing with ${activeUsers.length} other${activeUsers.length > 1 ? 's' : ''}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue.shade700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: activeUsers.map((user) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.blue.shade300),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircleAvatar(
                          radius: 8,
                          backgroundColor: Colors.blue.shade700,
                          child: Text(
                            user.userName[0].toUpperCase(),
                            style: const TextStyle(
                              fontSize: 8,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          user.userName,
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.blue.shade900,
                          ),
                        ),
                        if (user.activeCell != null) ...[
                          const SizedBox(width: 4),
                          Icon(
                            Icons.edit,
                            size: 10,
                            color: Colors.orange.shade700,
                          ),
                        ],
                      ],
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildScheduleTable(Schedule schedule) {
    final days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    final timeSlots = [
      '8:00-8:50',
      '9:00-9:50',
      '10:00-10:50',
      '11:00-11:50',
      '12:00-12:50',
      '1:00-1:50',
      '2:00-2:50',
      '3:00-3:50',
    ];

    final grid = schedule.grid;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowColor: WidgetStateProperty.all(
          const Color(0xFFe3f2fd),
        ),
        border: TableBorder.all(color: const Color(0xFFe2e8f0), width: 1),
        columnSpacing: 8,
        dataRowMinHeight: 60,
        dataRowMaxHeight: 80,
        columns: [
          const DataColumn(
            label: Text(
              'Day/Time',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          ...timeSlots.map(
            (slot) => DataColumn(
              label: Text(
                slot,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                ),
              ),
            ),
          ),
        ],
        rows: days.map((day) {
          return DataRow(
            cells: [
              DataCell(
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    day,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              ...timeSlots.map((timeSlot) {
                final course = grid[day]?[timeSlot];
                return _buildScheduleCell(
                  schedule,
                  day,
                  timeSlot,
                  course,
                );
              }),
            ],
          );
        }).toList(),
      ),
    );
  }

  DataCell _buildScheduleCell(
    Schedule schedule,
    String day,
    String timeSlot,
    ScheduleCourse? course,
  ) {
    // In edit mode, show text input with real-time collaboration
    if (_isEditMode) {
      final controller = _editControllers[day]?[timeSlot];
      if (controller == null) {
        return const DataCell(Center(child: Text('-')));
      }

      final cellId = '$day-$timeSlot';

      return DataCell(
        Consumer<CollaborationManager>(
          builder: (context, collaborationManager, child) {
            // Check if another user is editing this cell
            final otherUserEditing = collaborationManager.activeUsers
                .where((u) => u.clientId != collaborationManager.clientId)
                .any((u) => u.activeCell == cellId);

            return Container(
              width: 100,
              padding: const EdgeInsets.all(4),
              decoration: otherUserEditing
                  ? BoxDecoration(
                      border: Border.all(color: Colors.orange, width: 2),
                      borderRadius: BorderRadius.circular(4),
                    )
                  : null,
              child: TextField(
                controller: controller,
                style: const TextStyle(fontSize: 11),
                textAlign: TextAlign.center,
                decoration: InputDecoration(
                  border: const OutlineInputBorder(),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                  isDense: true,
                  filled: otherUserEditing,
                  fillColor: otherUserEditing
                      ? Colors.orange.withValues(alpha: 0.1)
                      : null,
                ),
                onTap: () {
                  // Notify others that we're editing this cell
                  collaborationManager.setActiveCell(cellId);
                },
                onChanged: (value) {
                  // Send real-time updates as user types
                  collaborationManager.updateCell(cellId, {
                    'course': value,
                    'day': day,
                    'time': timeSlot,
                  });
                },
                onEditingComplete: () {
                  // Clear active cell when done
                  collaborationManager.clearActiveCell();
                },
              ),
            );
          },
        ),
      );
    }

    // In view mode, show course info
    if (course == null || course.isEmpty) {
      return const DataCell(
        Center(
          child: Text('-', style: TextStyle(color: Colors.grey)),
        ),
      );
    }

    final courseName = course.course;

    if (courseName.trim().isEmpty) {
      return const DataCell(
        Center(
          child: Text('-', style: TextStyle(color: Colors.grey)),
        ),
      );
    }

    return DataCell(
      Container(
        width: 100,
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: const Color(0xFFe3f2fd),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              courseName,
              style: const TextStyle(
                color: Color(0xFF1976d2),
                fontWeight: FontWeight.bold,
                fontSize: 11,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            if (course.location != null && course.location!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                course.location!,
                style: const TextStyle(
                  fontSize: 10,
                  color: Colors.grey,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

}
