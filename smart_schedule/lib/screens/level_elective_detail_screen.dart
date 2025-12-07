import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart'; // ADD THIS PACKAGE
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../providers/faculty_provider.dart';

class LevelElectiveDetailScreen extends StatefulWidget {
  final int levelNum;
  const LevelElectiveDetailScreen({super.key, required this.levelNum});

  @override
  State<LevelElectiveDetailScreen> createState() =>
      _LevelElectiveDetailScreenState();
}

class _LevelElectiveDetailScreenState extends State<LevelElectiveDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final userProvider = context.read<UserProvider>();
      context.read<FacultyProvider>().fetchLevelStats(
        widget.levelNum,
        userProvider.token!,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text('Level ${widget.levelNum} Selection'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1e293b),
        elevation: 0,
      ),
      body: Consumer<FacultyProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.courseStats.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildModeSelector(provider),
                const SizedBox(height: 24),
                _buildChartSection(provider),
                const SizedBox(height: 24),
                _buildCourseList(provider),
                const SizedBox(height: 40), // Space for fab
              ],
            ),
          );
        },
      ),
      floatingActionButton: Consumer<FacultyProvider>(
        builder: (context, provider, _) {
          return FloatingActionButton.extended(
            onPressed: provider.isLoading
                ? null
                : () async {
                    final userProvider = context.read<UserProvider>();
                    final success = await provider.saveSelection(
                      widget.levelNum,
                      userProvider.token!,
                      userProvider.displayName,
                    );
                    if (success && mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Selection Saved Successfully'),
                          backgroundColor: Colors.green,
                        ),
                      );
                      Navigator.pop(context);
                    } else if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Failed to save selection'),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  },
            backgroundColor: const Color(0xFF6366f1),
            icon: const Icon(Icons.save),
            label: const Text("Save Selection"),
          );
        },
      ),
    );
  }

  Widget _buildModeSelector(FacultyProvider provider) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _modeButton(
              "Auto Selection",
              "Top 3 Popular",
              "auto",
              provider,
            ),
          ),
          Container(width: 1, height: 60, color: const Color(0xFFE2E8F0)),
          Expanded(
            child: _modeButton("Manual", "Custom Pick", "manual", provider),
          ),
        ],
      ),
    );
  }

  Widget _modeButton(
    String title,
    String subtitle,
    String mode,
    FacultyProvider provider,
  ) {
    final isActive = provider.selectionMode == mode;
    return InkWell(
      onTap: () => provider.setSelectionMode(mode),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        color: isActive ? const Color(0xFFEEF2FF) : Colors.transparent,
        child: Column(
          children: [
            Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: isActive ? const Color(0xFF6366f1) : Colors.black,
              ),
            ),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 11,
                color: isActive ? const Color(0xFF6366f1) : Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChartSection(FacultyProvider provider) {
    // Only show top 5 for mobile readability
    final topCourses = provider.courseStats
        .where((c) => c.count > 0)
        .take(5)
        .toList();

    return Container(
      height: 250,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          const Text(
            "Student Preferences (Top Courses)",
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: topCourses.isEmpty
                ? const Center(child: Text("No student data yet"))
                : BarChart(
                    BarChartData(
                      alignment: BarChartAlignment.spaceAround,
                      maxY: (topCourses.first.count + 2).toDouble(),
                      barTouchData: BarTouchData(enabled: false),
                      titlesData: FlTitlesData(
                        show: true,
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (double value, TitleMeta meta) {
                              if (value.toInt() >= topCourses.length)
                                return const Text('');
                              return Padding(
                                padding: const EdgeInsets.only(top: 8.0),
                                child: Text(
                                  topCourses[value.toInt()].code,
                                  style: const TextStyle(fontSize: 10),
                                ),
                              );
                            },
                          ),
                        ),
                        leftTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                      ),
                      gridData: const FlGridData(show: false),
                      borderData: FlBorderData(show: false),
                      barGroups: topCourses.asMap().entries.map((entry) {
                        return BarChartGroupData(
                          x: entry.key,
                          barRods: [
                            BarChartRodData(
                              toY: entry.value.count.toDouble(),
                              color: const Color(0xFF6366f1),
                              width: 16,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildCourseList(FacultyProvider provider) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              "Course List",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            Text(
              "${provider.currentSelection.length} Selected",
              style: const TextStyle(
                color: Color(0xFF6366f1),
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: provider.courseStats.length,
          itemBuilder: (context, index) {
            final course = provider.courseStats[index];
            final isSelected = provider.currentSelection.contains(course.code);
            final isAutoMode = provider.selectionMode == 'auto';

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected
                      ? const Color(0xFF6366f1)
                      : const Color(0xFFE2E8F0),
                ),
              ),
              child: ListTile(
                onTap: isAutoMode
                    ? null
                    : () => provider.toggleCourse(course.code),
                leading: CircleAvatar(
                  backgroundColor: isSelected
                      ? const Color(0xFF6366f1)
                      : Colors.grey[200],
                  child: Text(
                    "${course.percentage}%",
                    style: TextStyle(
                      fontSize: 10,
                      color: isSelected ? Colors.white : Colors.black,
                    ),
                  ),
                ),
                title: Text(
                  "${course.code} - ${course.name}",
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: Text(
                  "${course.department} • ${course.count} Students",
                ),
                trailing: isSelected
                    ? const Icon(Icons.check_circle, color: Color(0xFF6366f1))
                    : const Icon(Icons.circle_outlined, color: Colors.grey),
              ),
            );
          },
        ),
      ],
    );
  }
}
