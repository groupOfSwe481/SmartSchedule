import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../providers/course_provider.dart';
import '../providers/section_provider.dart';
import '../data/models.dart';

class SectionManagementScreen extends StatefulWidget {
  const SectionManagementScreen({super.key});

  @override
  State<SectionManagementScreen> createState() => _SectionManagementScreenState();
}

class _SectionManagementScreenState extends State<SectionManagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _currentTabIndex = 0;

  // Filters
  String _filterDepartment = 'all';
  int _filterLevel = 0;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {
          _currentTabIndex = _tabController.index;
        });
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final userProvider = context.read<UserProvider>();
      final courseProvider = context.read<CourseProvider>();
      final sectionProvider = context.read<SectionProvider>();
      final token = userProvider.token;

      courseProvider.fetchCourses(token: token);
      sectionProvider.fetchSections(token: token);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1e293b),
      appBar: AppBar(
        title: const Text('Section Management'),
        backgroundColor: const Color(0xFF334155),
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF6366f1),
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(
              icon: Icon(Icons.book),
              text: 'Courses',
            ),
            Tab(
              icon: Icon(Icons.door_front_door),
              text: 'Sections',
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildCoursesTab(),
          _buildSectionsTab(),
        ],
      ),
    );
  }

  Widget _buildCoursesTab() {
    return Column(
      children: [
        // Filter bar
        Container(
          padding: const EdgeInsets.all(16),
          color: const Color(0xFF334155),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _filterDepartment,
                      decoration: const InputDecoration(
                        labelText: 'Department',
                        labelStyle: TextStyle(color: Colors.white70),
                        filled: true,
                        fillColor: Color(0xFF1e293b),
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      dropdownColor: const Color(0xFF334155),
                      style: const TextStyle(color: Colors.white),
                      items: const [
                        DropdownMenuItem(value: 'all', child: Text('All Departments')),
                        DropdownMenuItem(value: 'Physics & Astronomy', child: Text('Physics & Astronomy')),
                        DropdownMenuItem(value: 'Computer Science', child: Text('Computer Science')),
                        DropdownMenuItem(value: 'Mathematics', child: Text('Mathematics')),
                        DropdownMenuItem(value: 'Botany & Microbiology', child: Text('Botany & Microbiology')),
                        DropdownMenuItem(value: 'Islamic Culture', child: Text('Islamic Culture')),
                        DropdownMenuItem(value: 'Statistics & Operations Research', child: Text('Statistics & OR')),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            _filterDepartment = value;
                          });
                          final courseProvider = context.read<CourseProvider>();
                          courseProvider.setDepartmentFilter(
                            value == 'all' ? null : value,
                          );
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<int>(
                      value: _filterLevel,
                      decoration: const InputDecoration(
                        labelText: 'Level',
                        labelStyle: TextStyle(color: Colors.white70),
                        filled: true,
                        fillColor: Color(0xFF1e293b),
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      dropdownColor: const Color(0xFF334155),
                      style: const TextStyle(color: Colors.white),
                      items: const [
                        DropdownMenuItem(value: 0, child: Text('All Levels')),
                        DropdownMenuItem(value: 3, child: Text('Level 3')),
                        DropdownMenuItem(value: 4, child: Text('Level 4')),
                        DropdownMenuItem(value: 5, child: Text('Level 5')),
                        DropdownMenuItem(value: 6, child: Text('Level 6')),
                        DropdownMenuItem(value: 7, child: Text('Level 7')),
                        DropdownMenuItem(value: 8, child: Text('Level 8')),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            _filterLevel = value;
                          });
                          final courseProvider = context.read<CourseProvider>();
                          courseProvider.setLevelFilter(
                            value == 0 ? null : value,
                          );
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Search courses...',
                  labelStyle: TextStyle(color: Colors.white70),
                  filled: true,
                  fillColor: Color(0xFF1e293b),
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.search, color: Colors.white70),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                style: const TextStyle(color: Colors.white),
                onChanged: (value) {
                  setState(() {
                    _searchQuery = value;
                  });
                  final courseProvider = context.read<CourseProvider>();
                  courseProvider.setSearchQuery(value);
                },
              ),
            ],
          ),
        ),

        // Courses list
        Expanded(
          child: Consumer<CourseProvider>(
            builder: (context, courseProvider, child) {
              if (courseProvider.isLoading) {
                return const Center(
                  child: CircularProgressIndicator(color: Color(0xFF6366f1)),
                );
              }

              if (courseProvider.error != null) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error, size: 64, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(
                        courseProvider.error!,
                        style: const TextStyle(color: Colors.white70),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                );
              }

              if (courseProvider.courses.isEmpty) {
                return const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.book_outlined, size: 64, color: Colors.white54),
                      SizedBox(height: 16),
                      Text(
                        'No courses found',
                        style: TextStyle(color: Colors.white70, fontSize: 18),
                      ),
                    ],
                  ),
                );
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: courseProvider.courses.length,
                itemBuilder: (context, index) {
                  final course = courseProvider.courses[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    color: const Color(0xFF334155),
                    child: ExpansionTile(
                      title: Text(
                        course.code,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      subtitle: Text(
                        course.name,
                        style: const TextStyle(color: Colors.white70),
                      ),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: course.isElective
                              ? const Color(0xFF10b981)
                              : const Color(0xFF6366f1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          course.isElective ? 'Elective' : 'Core',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                          ),
                        ),
                      ),
                      iconColor: Colors.white70,
                      collapsedIconColor: Colors.white70,
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildCourseDetailRow('Department', course.department),
                              _buildCourseDetailRow('College', course.college),
                              if (course.level != null)
                                _buildCourseDetailRow('Level', 'Level ${course.level}'),
                              _buildCourseDetailRow('Credit Hours', '${course.creditHours}'),
                              _buildCourseDetailRow('Duration', '${course.duration}'),
                              _buildCourseDetailRow(
                                'Pattern',
                                'Lec: ${course.pattern.lectureHours}, Lab: ${course.pattern.labHours}, Tut: ${course.pattern.tutorialHours}',
                              ),
                              if (course.prerequisites.isNotEmpty)
                                _buildCourseDetailRow(
                                  'Prerequisites',
                                  course.prerequisites.join(', '),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSectionsTab() {
    return Column(
      children: [
        // Filter bar
        Container(
          padding: const EdgeInsets.all(16),
          color: const Color(0xFF334155),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<int>(
                      value: _filterLevel,
                      decoration: const InputDecoration(
                        labelText: 'Level',
                        labelStyle: TextStyle(color: Colors.white70),
                        filled: true,
                        fillColor: Color(0xFF1e293b),
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      dropdownColor: const Color(0xFF334155),
                      style: const TextStyle(color: Colors.white),
                      items: const [
                        DropdownMenuItem(value: 0, child: Text('All Levels')),
                        DropdownMenuItem(value: 3, child: Text('Level 3')),
                        DropdownMenuItem(value: 4, child: Text('Level 4')),
                        DropdownMenuItem(value: 5, child: Text('Level 5')),
                        DropdownMenuItem(value: 6, child: Text('Level 6')),
                        DropdownMenuItem(value: 7, child: Text('Level 7')),
                        DropdownMenuItem(value: 8, child: Text('Level 8')),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            _filterLevel = value;
                          });
                          final sectionProvider = context.read<SectionProvider>();
                          sectionProvider.setLevelFilter(
                            value == 0 ? null : value,
                          );
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Search sections...',
                  labelStyle: TextStyle(color: Colors.white70),
                  filled: true,
                  fillColor: Color(0xFF1e293b),
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.search, color: Colors.white70),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                style: const TextStyle(color: Colors.white),
                onChanged: (value) {
                  final sectionProvider = context.read<SectionProvider>();
                  sectionProvider.setSearchQuery(value);
                },
              ),
            ],
          ),
        ),

        // Sections list
        Expanded(
          child: Consumer<SectionProvider>(
            builder: (context, sectionProvider, child) {
              if (sectionProvider.isLoading) {
                return const Center(
                  child: CircularProgressIndicator(color: Color(0xFF6366f1)),
                );
              }

              if (sectionProvider.error != null) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error, size: 64, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(
                        sectionProvider.error!,
                        style: const TextStyle(color: Colors.white70),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                );
              }

              if (sectionProvider.sections.isEmpty) {
                return const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.door_front_door_outlined, size: 64, color: Colors.white54),
                      SizedBox(height: 16),
                      Text(
                        'No sections found',
                        style: TextStyle(color: Colors.white70, fontSize: 18),
                      ),
                    ],
                  ),
                );
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: sectionProvider.sections.length,
                itemBuilder: (context, index) {
                  final section = sectionProvider.sections[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    color: const Color(0xFF334155),
                    child: ExpansionTile(
                      title: Text(
                        '${section.courseCode} - ${section.secNum}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      subtitle: Text(
                        section.type,
                        style: const TextStyle(color: Colors.white70),
                      ),
                      trailing: section.level != null
                          ? Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF6366f1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                'L${section.level}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                ),
                              ),
                            )
                          : null,
                      iconColor: Colors.white70,
                      collapsedIconColor: Colors.white70,
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Schedule Times:',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 8),
                              ...section.timeSlot.map((time) => Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: Row(
                                  children: [
                                    const Icon(Icons.access_time, size: 16, color: Color(0xFF6366f1)),
                                    const SizedBox(width: 8),
                                    Text(
                                      time,
                                      style: const TextStyle(color: Colors.white70),
                                    ),
                                  ],
                                ),
                              )),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildCourseDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: const TextStyle(
                color: Colors.white70,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
