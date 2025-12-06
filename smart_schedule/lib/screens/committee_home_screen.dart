// lib/screens/committee_home_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../providers/schedule_provider.dart';
// Removed unused import: comment_provider.dart
import '../widgets/comment_modal.dart'; // Make sure this file contains the Enum definition

class CommitteeHomeScreen extends StatefulWidget {
  const CommitteeHomeScreen({Key? key}) : super(key: key);

  @override
  State<CommitteeHomeScreen> createState() => _CommitteeHomeScreenState();
}

class _CommitteeHomeScreenState extends State<CommitteeHomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ScheduleProvider>().fetchSchedule();
    });
  }

  void _openCommentModal(Map<String, dynamic> cellInfo) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CommentModal(
        cellInfo: cellInfo,
        // ✅ FIXED: Use the enum instead of isCommittee boolean
        userType: CommentUserType.committee,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1e293b),
      appBar: _buildAppBar(),
      body: RefreshIndicator(
        onRefresh: () => context.read<ScheduleProvider>().fetchSchedule(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              _buildWelcomeHeader(),
              _buildLevelSelector(),
              _buildScheduleSection(),
            ],
          ),
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
      title: Row(
        children: const [
          Icon(Icons.calendar_today, size: 28),
          SizedBox(width: 12),
          Text(
            'SmartSchedule',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
        ],
      ),
      actions: [
        Consumer<UserProvider>(
          builder: (context, userProvider, child) {
            final userName = userProvider.displayName;
            return PopupMenuButton(
              icon: CircleAvatar(
                backgroundColor: Colors.white24,
                child: Text(
                  userName.isNotEmpty ? userName[0].toUpperCase() : 'C',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              itemBuilder: (context) => <PopupMenuEntry<dynamic>>[
                PopupMenuItem(
                  child: Row(
                    children: const [
                      Icon(Icons.person, size: 20),
                      SizedBox(width: 12),
                      Text('Profile'),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  onTap: () {
                    Future.delayed(Duration.zero, () {
                      userProvider.logout();
                      Navigator.pushReplacementNamed(context, '/login');
                    });
                  },
                  child: Row(
                    children: const [
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
              Text(
                'Welcome back, ${userProvider.displayName}!',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Role: ${userProvider.userRole}',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.95),
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.2)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: const [
                    Text(
                      'Current Semester',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'Fall 2025',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
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
            color: Colors.black.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
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
          Consumer<ScheduleProvider>(
            builder: (context, scheduleProvider, child) {
              return Wrap(
                spacing: 8,
                runSpacing: 8,
                children: List.generate(6, (index) {
                  final level = index + 3;
                  final isSelected = scheduleProvider.currentLevel == level;
                  return _buildLevelButton(
                    level,
                    isSelected,
                    () => scheduleProvider.switchLevel(level),
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
                    color: const Color(0xFF6366f1).withOpacity(0.3),
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
            color: Colors.black.withOpacity(0.1),
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
                      'Academic Schedule - Level ${scheduleProvider.currentLevel}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1e293b),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Committee-specific info banner
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFd1ecf1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF0c5460), width: 1),
                ),
                child: Row(
                  children: const [
                    Icon(
                      Icons.info_outline,
                      color: Color(0xFF0c5460),
                      size: 20,
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Committee Note: You are viewing all schedule versions including drafts (v1+). Click on any course to add your comments for review.',
                        style: TextStyle(
                          color: Color(0xFF0c5460),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
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
              else if (scheduleProvider.errorMessage != null)
                Center(
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
                          scheduleProvider.errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                )
              else if (scheduleProvider.scheduleData != null)
                _buildScheduleTable(scheduleProvider),
            ],
          );
        },
      ),
    );
  }

  Widget _buildScheduleTable(ScheduleProvider scheduleProvider) {
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

    final grid = scheduleProvider.scheduleData?['grid'] ?? {};

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowColor: MaterialStateProperty.all(const Color(0xFFe3f2fd)),
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
                final cellData = grid[day]?[timeSlot];
                return _buildScheduleCell(
                  day,
                  timeSlot,
                  cellData,
                  scheduleProvider.currentLevel,
                );
              }),
            ],
          );
        }).toList(),
      ),
    );
  }

  DataCell _buildScheduleCell(
    String day,
    String timeSlot,
    dynamic cellData,
    int level,
  ) {
    if (cellData == null) {
      return const DataCell(
        Center(
          child: Text('-', style: TextStyle(color: Colors.grey)),
        ),
      );
    }

    String courseName = '';
    String courseCode = '';

    if (cellData is String) {
      courseName = cellData;
      final match = RegExp(r'^([A-Z]{2,4}\d{3})').firstMatch(cellData);
      courseCode = match?.group(1) ?? cellData.split(' ')[0];
    } else if (cellData is Map) {
      courseName = cellData['course'] ?? '';
      courseCode = cellData['code'] ?? courseName.split(' ')[0];
    }

    if (courseName.trim().isEmpty) {
      return const DataCell(
        Center(
          child: Text('-', style: TextStyle(color: Colors.grey)),
        ),
      );
    }

    return DataCell(
      InkWell(
        onTap: () {
          _openCommentModal({
            'courseCode': courseCode,
            'courseName': courseName,
            'day': day,
            'timeSlot': timeSlot,
            'level': level,
          });
        },
        child: Container(
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
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(
                    Icons.chat_bubble_outline,
                    size: 12,
                    color: Color(0xFF1976d2),
                  ),
                  SizedBox(width: 4),
                  Text(
                    'Comment',
                    style: TextStyle(color: Color(0xFF1976d2), fontSize: 10),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
