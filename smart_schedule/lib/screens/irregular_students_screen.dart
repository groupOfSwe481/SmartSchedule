import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../providers/irregular_provider.dart';
import '../data/models.dart';

class IrregularStudentsScreen extends StatefulWidget {
  const IrregularStudentsScreen({super.key});

  @override
  State<IrregularStudentsScreen> createState() => _IrregularStudentsScreenState();
}

class _IrregularStudentsScreenState extends State<IrregularStudentsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _studentIdController = TextEditingController();
  int _selectedLevel = 7;
  List<String> _selectedCourses = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final userProvider = context.read<UserProvider>();
      final irregularProvider = context.read<IrregularProvider>();
      final token = userProvider.token;

      irregularProvider.fetchIrregularStudents(token: token);
    });
  }

  @override
  void dispose() {
    _studentIdController.dispose();
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

  Future<void> _showAddStudentDialog() async {
    final userProvider = context.read<UserProvider>();
    final irregularProvider = context.read<IrregularProvider>();
    final token = userProvider.token;

    if (token == null) {
      _showSnackBar('Authentication required', Colors.red);
      return;
    }

    _studentIdController.clear();
    _selectedLevel = 7;
    _selectedCourses = [];

    // Load courses for the default level
    await irregularProvider.fetchCoursesForLevel(_selectedLevel, token: token);

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.person_add, color: Color(0xFF6366f1)),
                SizedBox(width: 12),
                Text('Add Irregular Student'),
              ],
            ),
            content: Form(
              key: _formKey,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Student ID input
                    TextFormField(
                      controller: _studentIdController,
                      decoration: const InputDecoration(
                        labelText: 'Student ID',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.badge),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter student ID';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Level dropdown
                    DropdownButtonFormField<int>(
                      value: _selectedLevel,
                      decoration: const InputDecoration(
                        labelText: 'Current Level',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.school),
                      ),
                      items: [7, 8, 9, 10].map((level) {
                        return DropdownMenuItem(
                          value: level,
                          child: Text('Level $level'),
                        );
                      }).toList(),
                      onChanged: (value) async {
                        if (value != null) {
                          setState(() {
                            _selectedLevel = value;
                            _selectedCourses = [];
                          });
                          await irregularProvider.fetchCoursesForLevel(value, token: token);
                        }
                      },
                    ),
                    const SizedBox(height: 16),

                    // Courses multi-select
                    Consumer<IrregularProvider>(
                      builder: (context, provider, child) {
                        if (provider.isLoading) {
                          return const Center(child: CircularProgressIndicator());
                        }

                        if (provider.coursesForLevel.isEmpty) {
                          return const Text(
                            'No courses available for this level',
                            style: TextStyle(color: Colors.grey),
                          );
                        }

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Remaining Courses from Past Levels',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              constraints: const BoxConstraints(maxHeight: 200),
                              decoration: BoxDecoration(
                                border: Border.all(color: Colors.grey),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: ListView.builder(
                                shrinkWrap: true,
                                itemCount: provider.coursesForLevel.length,
                                itemBuilder: (context, index) {
                                  final course = provider.coursesForLevel[index];
                                  final courseCode = course['code'] as String;
                                  final courseName = course['name'] as String? ?? courseCode;
                                  final isSelected = _selectedCourses.contains(courseCode);

                                  return CheckboxListTile(
                                    dense: true,
                                    title: Text(
                                      courseCode,
                                      style: const TextStyle(fontSize: 13),
                                    ),
                                    subtitle: Text(
                                      courseName,
                                      style: const TextStyle(fontSize: 11),
                                    ),
                                    value: isSelected,
                                    onChanged: (checked) {
                                      setState(() {
                                        if (checked == true) {
                                          _selectedCourses.add(courseCode);
                                        } else {
                                          _selectedCourses.remove(courseCode);
                                        }
                                      });
                                    },
                                  );
                                },
                              ),
                            ),
                            if (_selectedCourses.isEmpty)
                              const Padding(
                                padding: EdgeInsets.only(top: 8),
                                child: Text(
                                  'Please select at least one course',
                                  style: TextStyle(color: Colors.red, fontSize: 12),
                                ),
                              ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton.icon(
                onPressed: () async {
                  if (_formKey.currentState!.validate() && _selectedCourses.isNotEmpty) {
                    Navigator.pop(context);

                    final success = await irregularProvider.addIrregularStudent(
                      studentId: _studentIdController.text.trim(),
                      level: _selectedLevel,
                      remainingCourses: _selectedCourses,
                      token: token,
                    );

                    if (mounted) {
                      _showSnackBar(
                        success
                            ? 'Student added successfully!'
                            : irregularProvider.error ?? 'Failed to add student',
                        success ? Colors.green : Colors.red,
                      );
                    }
                  }
                },
                icon: const Icon(Icons.save),
                label: const Text('Save'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366f1),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _deleteStudent(IrregularStudent student) async {
    final userProvider = context.read<UserProvider>();
    final irregularProvider = context.read<IrregularProvider>();
    final token = userProvider.token;

    if (token == null) {
      _showSnackBar('Authentication required', Colors.red);
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Delete'),
        content: Text(
          'Remove irregular status for student ${student.studentId}?\n\nThis will NOT delete the student record, only remove the irregular status.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Remove'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await irregularProvider.deleteIrregularStudent(
        studentId: student.id,
        token: token,
      );

      if (mounted) {
        _showSnackBar(
          success
              ? 'Irregular status removed successfully!'
              : irregularProvider.error ?? 'Failed to remove student',
          success ? Colors.green : Colors.red,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1e293b),
      appBar: AppBar(
        title: const Text('Irregular Students Management'),
        backgroundColor: const Color(0xFF334155),
        elevation: 0,
      ),
      body: Consumer<IrregularProvider>(
        builder: (context, irregularProvider, child) {
          if (irregularProvider.isLoading) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFF6366f1)),
            );
          }

          if (irregularProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    irregularProvider.error!,
                    style: const TextStyle(color: Colors.white70),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          if (irregularProvider.students.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.people_outline, size: 64, color: Colors.white54),
                  const SizedBox(height: 16),
                  const Text(
                    'No irregular students found',
                    style: TextStyle(color: Colors.white70, fontSize: 18),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: _showAddStudentDialog,
                    icon: const Icon(Icons.add),
                    label: const Text('Add First Student'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366f1),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    ),
                  ),
                ],
              ),
            );
          }

          return Column(
            children: [
              // Header with count and add button
              Container(
                padding: const EdgeInsets.all(16),
                color: const Color(0xFF334155),
                child: Row(
                  children: [
                    const Icon(Icons.people, color: Colors.white70),
                    const SizedBox(width: 12),
                    Text(
                      '${irregularProvider.students.length} Irregular Student${irregularProvider.students.length != 1 ? 's' : ''}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    ElevatedButton.icon(
                      onPressed: _showAddStudentDialog,
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Add Student'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366f1),
                      ),
                    ),
                  ],
                ),
              ),

              // Students list
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: irregularProvider.students.length,
                  itemBuilder: (context, index) {
                    final student = irregularProvider.students[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      color: const Color(0xFF334155),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF6366f1).withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(
                                    Icons.person,
                                    color: Color(0xFF6366f1),
                                    size: 24,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        student.studentId,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        'Level ${student.level}',
                                        style: const TextStyle(
                                          color: Colors.white70,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete, color: Colors.red),
                                  onPressed: () => _deleteStudent(student),
                                  tooltip: 'Remove irregular status',
                                ),
                              ],
                            ),
                            if (student.remainingCoursesFromPastLevels.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              const Divider(color: Colors.white24),
                              const SizedBox(height: 8),
                              const Text(
                                'Remaining Courses:',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: student.remainingCoursesFromPastLevels.map((course) {
                                  return Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10b981).withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: const Color(0xFF10b981),
                                        width: 1,
                                      ),
                                    ),
                                    child: Text(
                                      course,
                                      style: const TextStyle(
                                        color: Color(0xFF10b981),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
