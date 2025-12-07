import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../providers/faculty_provider.dart';
import 'level_elective_detail_screen.dart';
import '../data/faculty_models.dart';

class SchedulerElectivesScreen extends StatefulWidget {
  const SchedulerElectivesScreen({super.key});

  @override
  State<SchedulerElectivesScreen> createState() =>
      _SchedulerElectivesScreenState();
}

class _SchedulerElectivesScreenState extends State<SchedulerElectivesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final userProvider = context.read<UserProvider>();
      context.read<FacultyProvider>().fetchSummary(userProvider.token!);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Elective Selection',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1e293b),
        elevation: 0,
      ),
      body: Consumer<FacultyProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.dashboardData == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final data = provider.dashboardData;
          if (data == null)
            return const Center(child: Text("Failed to load data"));

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Deadline Banner
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
                    ),
                    borderRadius: BorderRadius.circular(16),
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
                        size: 30,
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              data.isFormEnded
                                  ? "Selection Period Ended"
                                  : "Faculty Decision Period",
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              "Deadline: ${data.formEndDate?.toString().split(' ')[0] ?? 'N/A'}",
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),
                const Text(
                  "Academic Levels",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1e293b),
                  ),
                ),
                const SizedBox(height: 12),

                // Level Cards Grid
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2, // 2 columns
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.85, // Adjust height
                  ),
                  itemCount: data.levels.length,
                  itemBuilder: (context, index) {
                    final level = data.levels[index];
                    return _buildLevelCard(level);
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildLevelCard(FacultyLevelSummary level) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => LevelElectiveDetailScreen(levelNum: level.level),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: level.electiveSelected
              ? Border.all(color: const Color(0xFF10b981), width: 2)
              : Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Level ${level.level}",
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (level.electiveSelected)
                  const Icon(
                    Icons.check_circle,
                    color: Color(0xFF10b981),
                    size: 20,
                  ),
              ],
            ),

            // Circular Progress
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  height: 60,
                  width: 60,
                  child: CircularProgressIndicator(
                    value: level.submissionRate / 100,
                    backgroundColor: Colors.grey[200],
                    color: const Color(0xFF6366f1),
                    strokeWidth: 6,
                  ),
                ),
                Text(
                  "${level.submissionRate}%",
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),

            Column(
              children: [
                Text(
                  "${level.submissions} / ${level.totalStudents}",
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const Text(
                  "Submissions",
                  style: TextStyle(fontSize: 11, color: Colors.grey),
                ),
              ],
            ),

            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 6),
              decoration: BoxDecoration(
                color: level.electiveSelected
                    ? const Color(0xFFd1fae5)
                    : const Color(0xFFEEF2FF),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                level.electiveSelected ? "Completed" : "Pending",
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: level.electiveSelected
                      ? const Color(0xFF065f46)
                      : const Color(0xFF4F46E5),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
