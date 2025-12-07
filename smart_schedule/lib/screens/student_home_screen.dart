import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../providers/schedule_provider.dart';
import '../providers/notification_provider.dart';
import '../providers/elective_provider.dart'; // Ensure this is imported
import '../widgets/comment_modal.dart';
import 'notifications_screen.dart';

class StudentHomeScreen extends StatefulWidget {
  const StudentHomeScreen({super.key});

  @override
  State<StudentHomeScreen> createState() => _StudentHomeScreenState();
}

class _StudentHomeScreenState extends State<StudentHomeScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  // Controller for suggestions to prevent cursor jumping during rebuilds
  late TextEditingController _suggestionsController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _suggestionsController = TextEditingController();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final scheduleProvider = context.read<ScheduleProvider>();
      final notificationProvider = context.read<NotificationProvider>();
      final userProvider = context.read<UserProvider>();
      final electiveProvider = context.read<ElectiveProvider>();

      // 1. Load student's schedule (Default Level 4)
      scheduleProvider.fetchStudentSchedule(4);

      // 2. Start auto-refresh for notifications
      if (userProvider.isLoggedIn && userProvider.userId.isNotEmpty) {
        notificationProvider.startAutoRefresh(
          userProvider.userId,
          userProvider.token!,
        );
        notificationProvider.loadNotificationCount(
          userProvider.userId,
          userProvider.token!,
        );
      }

      // 3. Load Elective Data
      String studentId = _extractStudentId(
        userProvider.userData?['Email'] ??
            userProvider.userData?['email'] ??
            '',
      );
      if (userProvider.isLoggedIn && studentId != '---') {
        electiveProvider.loadElectiveData(studentId, userProvider.token!).then((
          _,
        ) {
          // Sync text controller with loaded data once available
          if (mounted) {
            _suggestionsController.text = electiveProvider.suggestions;
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _suggestionsController.dispose();
    context.read<NotificationProvider>().stopAutoRefresh();
    super.dispose();
  }

  void _openCommentModal(Map<String, dynamic> cellInfo) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CommentModal(cellInfo: cellInfo),
    );
  }

  String _extractStudentId(String email) {
    // Extract first 9 digits from email
    final match = RegExp(r'^\d{9}').firstMatch(email);
    return match?.group(0) ?? '---';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: _buildAppBar(),
      body: Column(
        children: [
          _buildWelcomeHeader(),
          _buildTabBar(),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildScheduleTab(),
                _buildElectiveTab(), // New Logic Here
              ],
            ),
          ),
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
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
          ),
        ),
      ),
      title: const Row(
        children: [
          Icon(Icons.calendar_month, size: 28, color: Colors.white),
          SizedBox(width: 12),
          Text(
            'SmartSchedule',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ],
      ),
      actions: [
        Consumer<NotificationProvider>(
          builder: (context, notificationProvider, child) {
            return Stack(
              children: [
                IconButton(
                  icon: const Icon(
                    Icons.notifications_outlined,
                    color: Colors.white,
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const NotificationsScreen(),
                      ),
                    );
                  },
                ),
                if (notificationProvider.unreadCount > 0)
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 16,
                        minHeight: 16,
                      ),
                      child: Text(
                        notificationProvider.unreadCount > 9
                            ? '9+'
                            : notificationProvider.unreadCount.toString(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
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
                color: Colors.black.withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.school, color: Colors.white, size: 32),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome, ${userProvider.displayName}!',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          userProvider.userData?['Email'] ??
                              userProvider.userData?['email'] ??
                              '',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.9),
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Colors.white.withOpacity(0.2),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    Column(
                      children: [
                        const Text(
                          'Student ID',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _extractStudentId(
                            userProvider.userData?['Email'] ??
                                userProvider.userData?['email'] ??
                                '',
                          ),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const Column(
                      children: [
                        Text(
                          'Current Semester',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Fall 2025',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
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

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        labelColor: Colors.white,
        unselectedLabelColor: const Color(0xFF64748b),
        labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        tabs: const [
          Tab(icon: Icon(Icons.calendar_today, size: 20), text: 'My Schedule'),
          Tab(icon: Icon(Icons.edit_note, size: 20), text: 'Elective Form'),
        ],
      ),
    );
  }

  // ==================== SCHEDULE TAB LOGIC ====================

  Widget _buildScheduleTab() {
    return RefreshIndicator(
      onRefresh: () async {
        final scheduleProvider = context.read<ScheduleProvider>();
        await scheduleProvider.fetchStudentSchedule(
          scheduleProvider.currentLevel,
        );
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildLevelSelector(),
              const SizedBox(height: 16),
              _buildInfoCard(),
              const SizedBox(height: 16),
              _buildScheduleSection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLevelSelector() {
    return Consumer<ScheduleProvider>(
      builder: (context, scheduleProvider, child) {
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.layers, color: Color(0xFF6366f1), size: 24),
                  SizedBox(width: 8),
                  Text(
                    'Select Academic Level',
                    style: TextStyle(
                      color: Color(0xFF1e293b),
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: List.generate(6, (index) {
                  final level = index + 3;
                  final isSelected = scheduleProvider.currentLevel == level;

                  return Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () {
                        scheduleProvider.fetchStudentSchedule(level);
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: 100,
                        padding: const EdgeInsets.symmetric(
                          vertical: 12,
                          horizontal: 16,
                        ),
                        decoration: BoxDecoration(
                          gradient: isSelected
                              ? const LinearGradient(
                                  colors: [
                                    Color(0xFF6366f1),
                                    Color(0xFF8b5cf6),
                                  ],
                                )
                              : null,
                          color: isSelected ? null : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected
                                ? Colors.transparent
                                : const Color(0xFFE2E8F0),
                            width: 2,
                          ),
                        ),
                        child: Text(
                          'Level $level',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: isSelected
                                ? Colors.white
                                : const Color(0xFF64748b),
                            fontWeight: isSelected
                                ? FontWeight.bold
                                : FontWeight.w500,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFEEF2FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
      ),
      child: const Row(
        children: [
          Icon(Icons.info_outline, color: Color(0xFF6366F1), size: 24),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Tip: Click on any course to add your comments and feedback!',
              style: TextStyle(color: Color(0xFF4F46E5), fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleSection() {
    return Consumer<ScheduleProvider>(
      builder: (context, scheduleProvider, child) {
        if (scheduleProvider.isLoading) {
          return Container(
            padding: const EdgeInsets.all(40),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Center(
              child: Column(
                children: [
                  CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(
                      Color(0xFF6366f1),
                    ),
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Loading schedule...',
                    style: TextStyle(color: Color(0xFF475569)),
                  ),
                ],
              ),
            ),
          );
        }

        if (scheduleProvider.error != null) {
          return Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Center(
              child: Column(
                children: [
                  const Icon(Icons.error_outline, color: Colors.red, size: 48),
                  const SizedBox(height: 12),
                  Text(
                    scheduleProvider.error!,
                    style: const TextStyle(color: Color(0xFF475569)),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        }

        final schedules = scheduleProvider.schedules;
        if (schedules.isEmpty) {
          return Container(
            padding: const EdgeInsets.all(40),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Center(
              child: Column(
                children: [
                  Icon(
                    Icons.calendar_today_outlined,
                    color: Color(0xFF94a3b8),
                    size: 64,
                  ),
                  SizedBox(height: 16),
                  Text(
                    'No schedule available for this level',
                    style: TextStyle(color: Color(0xFF475569), fontSize: 16),
                  ),
                ],
              ),
            ),
          );
        }

        return Column(
          children: schedules.asMap().entries.map((entry) {
            final index = entry.key;
            final schedule = entry.value;
            return Container(
              margin: EdgeInsets.only(
                bottom: index < schedules.length - 1 ? 16 : 0,
              ),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.calendar_month,
                          color: Color(0xFF6366f1),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Level ${scheduleProvider.currentLevel} - ${schedule.section}',
                          style: const TextStyle(
                            color: Color(0xFF1e293b),
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10b981),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            'v${schedule.version}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(color: Color(0xFFE2E8F0), height: 1),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: _buildScheduleTable(schedule),
                  ),
                ],
              ),
            );
          }).toList(),
        );
      },
    );
  }

  Widget _buildScheduleTable(schedule) {
    final days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    final times = [
      '8:00-8:50',
      '9:00-9:50',
      '10:00-10:50',
      '11:00-11:50',
      '12:00-12:50',
      '1:00-1:50',
      '2:00-2:50',
    ];

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Table(
        border: TableBorder.all(
          color: const Color(0xFFE2E8F0),
          width: 1,
          borderRadius: BorderRadius.circular(8),
        ),
        defaultColumnWidth: const FixedColumnWidth(140),
        children: [
          TableRow(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
              ),
            ),
            children: [
              _buildTableHeader('Time'),
              ...days.map((day) => _buildTableHeader(day)),
            ],
          ),
          ...times.map((time) {
            return TableRow(
              children: [
                _buildTimeCell(time),
                ...days.map((day) {
                  final cell = schedule.grid[day]?[time];
                  return _buildScheduleCell(cell, day, time);
                }),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _buildTableHeader(String text) {
    return Container(
      padding: const EdgeInsets.all(12),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 13,
        ),
      ),
    );
  }

  Widget _buildTimeCell(String time) {
    return Container(
      padding: const EdgeInsets.all(12),
      color: const Color(0xFFF1F5F9),
      child: Text(
        time,
        textAlign: TextAlign.center,
        style: const TextStyle(
          color: Color(0xFF1e293b),
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _buildScheduleCell(cell, String day, String time) {
    final isEmpty = cell == null || cell.isEmpty;
    final scheduleProvider = context.read<ScheduleProvider>();

    return InkWell(
      onTap: isEmpty
          ? null
          : () {
              _openCommentModal({
                'courseCode': cell.code ?? '',
                'courseName': cell.course ?? '',
                'day': day,
                'timeSlot': time,
                'level': scheduleProvider.currentLevel,
              });
            },
      child: Container(
        padding: const EdgeInsets.all(8),
        color: Colors.white,
        child: isEmpty
            ? const SizedBox(height: 50)
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (cell.code != null)
                    Text(
                      cell.code!,
                      style: const TextStyle(
                        color: Color(0xFF6366f1),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  const SizedBox(height: 4),
                  Text(
                    cell.course,
                    style: const TextStyle(
                      color: Color(0xFF1e293b),
                      fontSize: 11,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (cell.location != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(
                          Icons.location_on,
                          size: 10,
                          color: Color(0xFF64748b),
                        ),
                        const SizedBox(width: 2),
                        Expanded(
                          child: Text(
                            cell.location!,
                            style: const TextStyle(
                              color: Color(0xFF64748b),
                              fontSize: 10,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
      ),
    );
  }

  // ==================== ELECTIVE TAB LOGIC ====================

  Widget _buildElectiveTab() {
    return Consumer<ElectiveProvider>(
      builder: (context, provider, child) {
        final userProvider = context.read<UserProvider>();
        final studentId = _extractStudentId(
          userProvider.userData?['Email'] ??
              userProvider.userData?['email'] ??
              '',
        );
        final token = userProvider.token!;

        if (provider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        // State: Form Inactive
        if (!provider.isFormActive) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.timer_off_outlined,
                  size: 64,
                  color: Colors.grey,
                ),
                const SizedBox(height: 16),
                const Text(
                  "Elective Form is currently closed",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 8),
                if (provider.error != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: Text(
                      provider.error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.red),
                    ),
                  ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () {
                    provider.loadElectiveData(studentId, token);
                  },
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        // State: Active Form
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Status Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF6366f1).withOpacity(0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.access_time_filled,
                      color: Colors.white,
                      size: 28,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Elective Registration Open",
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "Deadline: ${provider.deadline?.toString().split(' ')[0] ?? 'Soon'}",
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (provider.isSubmitted)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          "SUBMITTED",
                          style: TextStyle(
                            color: Colors.green,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 2. Courses Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Available Courses",
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1e293b),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEEF2FF),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: const Color(0xFF6366f1).withOpacity(0.3),
                      ),
                    ),
                    child: Text(
                      '${provider.selectedCourseCodes.length} Selected',
                      style: const TextStyle(
                        color: Color(0xFF6366f1),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              if (provider.availableCourses.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(20.0),
                  child: Center(child: Text("No elective courses found.")),
                ),

              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: provider.availableCourses.length,
                itemBuilder: (context, index) {
                  final course = provider.availableCourses[index];
                  final isSelected = provider.selectedCourseCodes.contains(
                    course.code,
                  );

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? const Color(0xFF6366f1)
                            : const Color(0xFFE2E8F0),
                        width: isSelected ? 2 : 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.02),
                          blurRadius: 5,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: CheckboxListTile(
                      activeColor: const Color(0xFF6366f1),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      title: Text(
                        "${course.code} - ${course.name}",
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.grey[100],
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  "${course.creditHours} CH",
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey[800],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                course.department,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                          if (course.description.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              course.description,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ],
                      ),
                      value: isSelected,
                      onChanged: provider.isSubmitted
                          ? null
                          : (bool? value) {
                              provider.toggleCourse(
                                course.code,
                                studentId,
                                token,
                              );
                            },
                    ),
                  );
                },
              ),

              const SizedBox(height: 24),
              const Text(
                "Suggestions & Needs",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1e293b),
                ),
              ),
              const SizedBox(height: 8),

              // 3. Suggestions TextField
              TextField(
                controller: _suggestionsController,
                enabled: !provider.isSubmitted,
                maxLines: 4,
                style: const TextStyle(fontSize: 14),
                decoration: InputDecoration(
                  hintText:
                      "Example: I need evening classes, or request specific course...",
                  hintStyle: TextStyle(color: Colors.grey[400]),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.all(16),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF6366f1)),
                  ),
                ),
                onChanged: (val) {
                  provider.updateSuggestions(val, studentId, token);
                },
              ),

              const SizedBox(height: 30),

              // 4. Submit Button
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed:
                      (provider.isSubmitted ||
                          provider.selectedCourseCodes.isEmpty)
                      ? null
                      : () async {
                          bool success = await provider.submitFinal(
                            studentId,
                            token,
                          );
                          if (success && mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  "Electives Submitted Successfully!",
                                ),
                                backgroundColor: Colors.green,
                              ),
                            );
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366f1),
                    disabledBackgroundColor: const Color(
                      0xFF6366f1,
                    ).withOpacity(0.5),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 4,
                  ),
                  child: provider.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.send_rounded, color: Colors.white),
                            SizedBox(width: 8),
                            Text(
                              "Submit Choices",
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 50),
            ],
          ),
        );
      },
    );
  }
}
