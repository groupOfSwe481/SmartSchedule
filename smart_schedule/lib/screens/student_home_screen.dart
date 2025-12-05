import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../providers/schedule_provider.dart';
import '../widgets/comment_modal.dart';
import 'elective_form_screen.dart';

class StudentHomeScreen extends StatefulWidget {
  const StudentHomeScreen({Key? key}) : super(key: key);

  @override
  State<StudentHomeScreen> createState() => _StudentHomeScreenState();
}

class _StudentHomeScreenState extends State<StudentHomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final userProvider = context.read<UserProvider>();
      final level =
          int.tryParse(userProvider.userData?['level']?.toString() ?? '4') ?? 4;
      context.read<ScheduleProvider>().fetchStudentSchedule(level);
    });
  }

  void _openCommentModal(Map<String, dynamic> cellInfo) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) =>
          CommentModal(cellInfo: cellInfo, userType: CommentUserType.student),
    );
  }

  void _navigateToElectiveForm() {
    Navigator.push(
      context,
      MaterialPageRoute(
        // ✅ FIXED: Removed the extra Scaffold wrapper.
        // ElectiveFormScreen already has a Scaffold, so we just return it directly.
        // This ensures the Back Button appears correctly in the AppBar.
        builder: (context) => const ElectiveFormScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFf8f9fa),
      appBar: _buildAppBar(),
      body: Column(
        children: [
          _buildWelcomeSection(),
          Expanded(child: _buildScheduleView()),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _navigateToElectiveForm,
        label: const Text('Elective Form'),
        icon: const Icon(Icons.edit_note),
        backgroundColor: const Color(0xFF6366f1),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      elevation: 4,
      flexibleSpace: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
      ),
      title: Row(
        children: const [
          Icon(Icons.calendar_month, color: Colors.white),
          SizedBox(width: 10),
          Text('SmartSchedule', style: TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
      actions: [
        Stack(
          alignment: Alignment.center,
          children: [
            IconButton(
              icon: const Icon(Icons.notifications),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Notifications feature coming soon!'),
                  ),
                );
              },
            ),
            Positioned(
              top: 10,
              right: 10,
              child: Container(
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: Colors.red,
                  borderRadius: BorderRadius.circular(6),
                ),
                constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                child: const Text(
                  '3',
                  style: TextStyle(color: Colors.white, fontSize: 8),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ],
        ),
        Consumer<UserProvider>(
          builder: (context, user, _) {
            return PopupMenuButton(
              icon: const Icon(Icons.account_circle),
              // ✅ FIXED: Added <PopupMenuEntry<dynamic>> to fix type inference error
              itemBuilder: (context) => <PopupMenuEntry<dynamic>>[
                PopupMenuItem(enabled: false, child: Text(user.displayName)),
                const PopupMenuDivider(),
                const PopupMenuItem(
                  child: Row(
                    children: [
                      Icon(Icons.person, color: Colors.grey),
                      SizedBox(width: 8),
                      Text('Profile'),
                    ],
                  ),
                ),
                PopupMenuItem(
                  onTap: () {
                    user.logout();
                    Navigator.pushReplacementNamed(context, '/login');
                  },
                  child: Row(
                    children: const [
                      Icon(Icons.logout, color: Colors.grey),
                      SizedBox(width: 8),
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

  Widget _buildWelcomeSection() {
    return Consumer<UserProvider>(
      builder: (context, user, _) {
        final studentId = user.userData?['student_id'] ?? 'Unknown ID';
        final level = user.userData?['level'] ?? '-';

        return Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 10,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome back, ${user.userData?['First_Name'] ?? 'Student'}!',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    'Level $level - Software Engineering | ID: $studentId',
                    style: const TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  children: const [
                    Text(
                      'Current Semester',
                      style: TextStyle(color: Colors.white, fontSize: 12),
                    ),
                    Text(
                      'Fall 2025',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
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

  Widget _buildScheduleView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Level Selector Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(15),
              boxShadow: [
                BoxShadow(color: Colors.grey.withOpacity(0.1), blurRadius: 10),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Select Academic Level',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 10),
                Consumer<ScheduleProvider>(
                  builder: (context, provider, _) {
                    return Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: List.generate(6, (index) {
                        int level = index + 3;
                        bool isSelected = provider.currentStudentLevel == level;
                        return OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            backgroundColor: isSelected
                                ? const Color(0xFF6366f1)
                                : Colors.white,
                            foregroundColor: isSelected
                                ? Colors.white
                                : Colors.black87,
                            side: BorderSide(
                              color: isSelected
                                  ? const Color(0xFF6366f1)
                                  : Colors.grey.shade300,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          onPressed: () {
                            provider.fetchStudentSchedule(level);
                          },
                          child: Text('Level $level'),
                        );
                      }),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Schedule Display Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(15),
              boxShadow: [
                BoxShadow(color: Colors.grey.withOpacity(0.1), blurRadius: 10),
              ],
            ),
            child: Consumer<ScheduleProvider>(
              builder: (context, provider, _) {
                if (provider.isLoading) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(40),
                      child: CircularProgressIndicator(),
                    ),
                  );
                }

                if (provider.errorMessage != null) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          const Icon(
                            Icons.warning_amber,
                            color: Colors.orange,
                            size: 40,
                          ),
                          const SizedBox(height: 10),
                          Text(
                            provider.errorMessage!,
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  );
                }

                if (provider.studentScheduleData == null) {
                  return const Center(child: Text("No schedule available."));
                }

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Academic Schedule - Level ${provider.currentStudentLevel}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.green.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Final Version',
                            style: TextStyle(
                              color: Colors.green,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      color: Colors.blue.shade50,
                      child: Row(
                        children: const [
                          Icon(
                            Icons.info_outline,
                            size: 16,
                            color: Colors.blue,
                          ),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Tip: Click on any course to add your comments!',
                              style: TextStyle(
                                color: Colors.blue,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 15),
                    _buildScheduleTable(
                      provider.studentScheduleData!['grid'],
                      provider.currentStudentLevel,
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleTable(Map<String, dynamic> grid, int level) {
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

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowColor: MaterialStateProperty.all(Colors.grey.shade100),
        border: TableBorder.all(color: Colors.grey.shade200),
        columns: [
          const DataColumn(
            label: Text(
              'Day/Time',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          ...timeSlots.map(
            (t) => DataColumn(
              label: Text(
                t,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
        rows: days.map((day) {
          return DataRow(
            cells: [
              DataCell(
                Text(day, style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
              ...timeSlots.map((time) {
                final cellData = grid[day]?[time];
                return _buildCell(cellData, day, time, level);
              }),
            ],
          );
        }).toList(),
      ),
    );
  }

  DataCell _buildCell(dynamic cellData, String day, String time, int level) {
    if (cellData == null) return const DataCell(Text('-'));

    String courseName = '';
    String courseCode = '';
    String location = '';

    if (cellData is String) {
      courseName = cellData;
      courseCode = cellData.split(' ')[0];
    } else if (cellData is Map) {
      courseName = cellData['course'] ?? '';
      courseCode = cellData['code'] ?? courseName.split(' ')[0];
      location = cellData['location'] ?? '';
    }

    if (courseName.isEmpty) return const DataCell(Text('-'));

    return DataCell(
      InkWell(
        onTap: () {
          _openCommentModal({
            'courseCode': courseCode,
            'courseName': courseName,
            'day': day,
            'timeSlot': time,
            'level': level,
          });
        },
        child: Container(
          width: 120,
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                courseName,
                style: const TextStyle(
                  color: Color(0xFF1976d2),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (location.isNotEmpty)
                Text(
                  location,
                  style: const TextStyle(color: Colors.grey, fontSize: 10),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
