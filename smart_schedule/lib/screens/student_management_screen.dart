import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/user_provider.dart';
import '../providers/student_provider.dart';
import '../data/models.dart';

class StudentManagementScreen extends StatefulWidget {
  const StudentManagementScreen({super.key});

  @override
  State<StudentManagementScreen> createState() => _StudentManagementScreenState();
}

class _StudentManagementScreenState extends State<StudentManagementScreen> {
  final Map<int, TextEditingController> _levelControllers = {};
  final Map<String, TextEditingController> _courseControllers = {};

  int? _selectedLevelForCourses;
  bool _isManualEntry = true;
  int? _selectedLevelForUpload;
  File? _selectedImage;
  final ImagePicker _imagePicker = ImagePicker();

  @override
  void initState() {
    super.initState();

    // Initialize controllers for levels 3-8
    for (int i = 3; i <= 8; i++) {
      _levelControllers[i] = TextEditingController();
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final userProvider = context.read<UserProvider>();
      final studentProvider = context.read<StudentProvider>();
      final token = userProvider.token;

      studentProvider.fetchLevels(token: token);
    });
  }

  @override
  void dispose() {
    _levelControllers.values.forEach((controller) => controller.dispose());
    _courseControllers.values.forEach((controller) => controller.dispose());
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

  Future<void> _saveLevelCounts() async {
    final userProvider = context.read<UserProvider>();
    final studentProvider = context.read<StudentProvider>();
    final token = userProvider.token;

    if (token == null) {
      _showSnackBar('Authentication required', Colors.red);
      return;
    }

    int successCount = 0;
    for (int level = 3; level <= 8; level++) {
      final controller = _levelControllers[level]!;
      if (controller.text.isNotEmpty) {
        final count = int.tryParse(controller.text);
        if (count != null && count >= 0) {
          final success = await studentProvider.updateStudentCount(
            levelNum: level,
            studentCount: count,
            token: token,
          );
          if (success) successCount++;
        }
      }
    }

    if (mounted) {
      if (successCount > 0) {
        _showSnackBar('Successfully saved $successCount level(s)', Colors.green);
      } else {
        _showSnackBar('No data to save or invalid input', Colors.orange);
      }
    }
  }

  Future<void> _loadCoursesForLevel(int levelNum) async {
    final studentProvider = context.read<StudentProvider>();
    final levelData = studentProvider.getLevelData(levelNum);

    if (levelData != null && levelData.courses.isNotEmpty) {
      // Clear existing controllers
      _courseControllers.clear();

      // Create controllers for each course
      for (var course in levelData.courses) {
        final currentCount = levelData.courseEnrollments[course.code] ?? 0;
        _courseControllers[course.code] = TextEditingController(
          text: currentCount > 0 ? currentCount.toString() : '',
        );
      }
      setState(() {});
    }
  }

  Future<void> _saveCourseCounts() async {
    if (_selectedLevelForCourses == null) {
      _showSnackBar('Please select a level', Colors.orange);
      return;
    }

    final userProvider = context.read<UserProvider>();
    final studentProvider = context.read<StudentProvider>();
    final token = userProvider.token;

    if (token == null) {
      _showSnackBar('Authentication required', Colors.red);
      return;
    }

    final courseEnrollments = <String, int>{};
    _courseControllers.forEach((courseCode, controller) {
      if (controller.text.isNotEmpty) {
        final count = int.tryParse(controller.text);
        if (count != null && count >= 0) {
          courseEnrollments[courseCode] = count;
        }
      }
    });

    if (courseEnrollments.isEmpty) {
      _showSnackBar('No valid counts entered', Colors.orange);
      return;
    }

    final success = await studentProvider.updateCourseEnrollments(
      levelNum: _selectedLevelForCourses!,
      courseEnrollments: courseEnrollments,
      token: token,
    );

    if (mounted) {
      _showSnackBar(
        success
            ? 'Course counts saved successfully!'
            : studentProvider.error ?? 'Failed to save course counts',
        success ? Colors.green : Colors.red,
      );
    }
  }

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (image != null) {
        setState(() {
          _selectedImage = File(image.path);
        });
      }
    } catch (e) {
      _showSnackBar('Error picking image: $e', Colors.red);
    }
  }

  Future<void> _uploadImage() async {
    if (_selectedImage == null || _selectedLevelForUpload == null) {
      _showSnackBar('Please select both image and level', Colors.orange);
      return;
    }

    final userProvider = context.read<UserProvider>();
    final studentProvider = context.read<StudentProvider>();
    final token = userProvider.token;

    if (token == null) {
      _showSnackBar('Authentication required', Colors.red);
      return;
    }

    final success = await studentProvider.uploadImageFile(
      imageFile: _selectedImage!,
      levelNum: _selectedLevelForUpload!,
      token: token,
    );

    if (mounted) {
      if (success) {
        setState(() {
          _selectedImage = null;
          _selectedLevelForUpload = null;
        });
        _showSnackBar('Image processed successfully!', Colors.green);
      } else {
        _showSnackBar(
          studentProvider.error ?? 'Failed to process image',
          Colors.red,
        );
      }
    }
  }

  Future<void> _clearLevelData(int levelNum) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Clear'),
        content: Text(
          'Are you sure you want to clear all data for Level $levelNum?\n\nThis will remove both student count and course enrollments.',
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
            child: const Text('Clear'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final userProvider = context.read<UserProvider>();
    final studentProvider = context.read<StudentProvider>();
    final token = userProvider.token;

    if (token == null) {
      _showSnackBar('Authentication required', Colors.red);
      return;
    }

    final success = await studentProvider.clearLevelData(
      levelNum: levelNum,
      token: token,
    );

    if (mounted) {
      if (success) {
        _levelControllers[levelNum]?.clear();
        _showSnackBar('Data cleared successfully!', Colors.green);
      } else {
        _showSnackBar(
          studentProvider.error ?? 'Failed to clear data',
          Colors.red,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1e293b),
      appBar: AppBar(
        title: const Text('Student Management'),
        backgroundColor: const Color(0xFF334155),
        elevation: 0,
      ),
      body: Consumer<StudentProvider>(
        builder: (context, studentProvider, child) {
          // Update level controllers with fetched data
          if (!studentProvider.isLoading && studentProvider.levels.isNotEmpty) {
            for (var levelData in studentProvider.levels) {
              final controller = _levelControllers[levelData.levelNum];
              if (controller != null && controller.text.isEmpty) {
                controller.text = levelData.studentCount > 0
                    ? levelData.studentCount.toString()
                    : '';
              }
            }
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSection3CurrentData(studentProvider),
                const SizedBox(height: 24),
                _buildSection1LevelCounts(),
                const SizedBox(height: 24),
                _buildSection2CourseCounts(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSection1LevelCounts() {
    return Card(
      color: const Color(0xFF334155),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.looks_one, color: Color(0xFF6366f1)),
                SizedBox(width: 12),
                Text(
                  'Student Count Per Level',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              'Enter the total number of students for each level (3-8)',
              style: TextStyle(color: Colors.white70, fontSize: 14),
            ),
            const SizedBox(height: 20),
            _buildLevelInputs(),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _saveLevelCounts,
              icon: const Icon(Icons.save),
              label: const Text('Save Level Counts'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366f1),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLevelInputs() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _buildLevelInput(3)),
            const SizedBox(width: 12),
            Expanded(child: _buildLevelInput(4)),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _buildLevelInput(5)),
            const SizedBox(width: 12),
            Expanded(child: _buildLevelInput(6)),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _buildLevelInput(7)),
            const SizedBox(width: 12),
            Expanded(child: _buildLevelInput(8)),
          ],
        ),
      ],
    );
  }

  Widget _buildLevelInput(int level) {
    return TextField(
      controller: _levelControllers[level],
      keyboardType: TextInputType.number,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: 'Level $level',
        labelStyle: const TextStyle(color: Colors.white70),
        filled: true,
        fillColor: const Color(0xFF1e293b),
        border: const OutlineInputBorder(),
        prefixIcon: const Icon(Icons.school, color: Color(0xFF6366f1)),
      ),
    );
  }

  Widget _buildSection2CourseCounts() {
    return Card(
      color: const Color(0xFF334155),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.looks_two, color: Color(0xFF10b981)),
                SizedBox(width: 12),
                Text(
                  'Student Count Per Course',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              'Choose method: Upload file or manually enter counts',
              style: TextStyle(color: Colors.white70, fontSize: 14),
            ),
            const SizedBox(height: 20),
            _buildMethodToggle(),
            const SizedBox(height: 20),
            if (_isManualEntry)
              _buildManualEntrySection()
            else
              _buildUploadSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildMethodToggle() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => setState(() => _isManualEntry = true),
            icon: const Icon(Icons.edit),
            label: const Text('Manual Entry'),
            style: OutlinedButton.styleFrom(
              foregroundColor: _isManualEntry ? Colors.white : Colors.white54,
              side: BorderSide(
                color: _isManualEntry ? const Color(0xFF6366f1) : Colors.white24,
                width: 2,
              ),
              backgroundColor: _isManualEntry ? const Color(0xFF6366f1) : Colors.transparent,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => setState(() => _isManualEntry = false),
            icon: const Icon(Icons.cloud_upload),
            label: const Text('Upload File'),
            style: OutlinedButton.styleFrom(
              foregroundColor: !_isManualEntry ? Colors.white : Colors.white54,
              side: BorderSide(
                color: !_isManualEntry ? const Color(0xFF6366f1) : Colors.white24,
                width: 2,
              ),
              backgroundColor: !_isManualEntry ? const Color(0xFF6366f1) : Colors.transparent,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildManualEntrySection() {
    final studentProvider = context.read<StudentProvider>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        DropdownButtonFormField<int>(
          value: _selectedLevelForCourses,
          decoration: const InputDecoration(
            labelText: 'Select Level to Load Courses',
            labelStyle: TextStyle(color: Colors.white70),
            filled: true,
            fillColor: Color(0xFF1e293b),
            border: OutlineInputBorder(),
          ),
          dropdownColor: const Color(0xFF334155),
          style: const TextStyle(color: Colors.white),
          items: [3, 4, 5, 6, 7, 8].map((level) {
            return DropdownMenuItem(
              value: level,
              child: Text('Level $level'),
            );
          }).toList(),
          onChanged: (value) {
            if (value != null) {
              setState(() {
                _selectedLevelForCourses = value;
              });
              _loadCoursesForLevel(value);
            }
          },
        ),
        const SizedBox(height: 16),
        if (_selectedLevelForCourses != null) _buildCoursesList(),
      ],
    );
  }

  Widget _buildCoursesList() {
    final studentProvider = context.read<StudentProvider>();
    final levelData = studentProvider.getLevelData(_selectedLevelForCourses!);

    if (levelData == null || levelData.courses.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.orange.withOpacity(0.1),
          border: Border.all(color: Colors.orange),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Row(
          children: [
            Icon(Icons.warning, color: Colors.orange),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'No courses found for this level',
                style: TextStyle(color: Colors.orange),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.green.withOpacity(0.1),
            border: Border.all(color: Colors.green),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.green),
              const SizedBox(width: 12),
              Text(
                'Found ${levelData.courses.length} courses for Level $_selectedLevelForCourses',
                style: const TextStyle(color: Colors.green),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        ...levelData.courses.map((course) => _buildCourseItem(course)),
        const SizedBox(height: 16),
        ElevatedButton.icon(
          onPressed: _saveCourseCounts,
          icon: const Icon(Icons.save),
          label: const Text('Save Course Counts'),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF10b981),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          ),
        ),
      ],
    );
  }

  Widget _buildCourseItem(Course course) {
    final controller = _courseControllers[course.code];
    if (controller == null) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF6366f1).withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: const Border(
          left: BorderSide(color: Color(0xFF6366f1), width: 4),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  course.code,
                  style: const TextStyle(
                    color: Color(0xFF6366f1),
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  course.name,
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 100,
            child: TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Count',
                labelStyle: TextStyle(color: Colors.white70, fontSize: 12),
                filled: true,
                fillColor: Color(0xFF1e293b),
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUploadSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        DropdownButtonFormField<int>(
          value: _selectedLevelForUpload,
          decoration: const InputDecoration(
            labelText: 'Select Level for Upload',
            labelStyle: TextStyle(color: Colors.white70),
            filled: true,
            fillColor: Color(0xFF1e293b),
            border: OutlineInputBorder(),
          ),
          dropdownColor: const Color(0xFF334155),
          style: const TextStyle(color: Colors.white),
          items: [3, 4, 5, 6, 7, 8].map((level) {
            return DropdownMenuItem(
              value: level,
              child: Text('Level $level'),
            );
          }).toList(),
          onChanged: (value) => setState(() => _selectedLevelForUpload = value),
        ),
        const SizedBox(height: 16),
        GestureDetector(
          onTap: _pickImage,
          child: Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: const Color(0xFF1e293b),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: _selectedImage != null ? const Color(0xFF6366f1) : Colors.white24,
                width: 3,
                style: BorderStyle.solid,
              ),
            ),
            child: Center(
              child: _selectedImage != null
                  ? Column(
                      children: [
                        const Icon(Icons.check_circle, color: Color(0xFF10b981), size: 48),
                        const SizedBox(height: 12),
                        Text(
                          _selectedImage!.path.split('/').last,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        TextButton.icon(
                          onPressed: () => setState(() => _selectedImage = null),
                          icon: const Icon(Icons.close, color: Colors.red),
                          label: const Text('Remove', style: TextStyle(color: Colors.red)),
                        ),
                      ],
                    )
                  : Column(
                      children: [
                        Icon(Icons.cloud_upload, color: const Color(0xFF6366f1), size: 48),
                        const SizedBox(height: 12),
                        const Text(
                          'Tap to Select Image',
                          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Supported formats: JPG, PNG (Max 10MB)',
                          style: TextStyle(color: Colors.white54, fontSize: 12),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Image should contain course codes and student counts',
                          style: TextStyle(color: Colors.white54, fontSize: 12),
                        ),
                      ],
                    ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        ElevatedButton.icon(
          onPressed: _selectedImage != null && _selectedLevelForUpload != null
              ? _uploadImage
              : null,
          icon: const Icon(Icons.upload),
          label: const Text('Upload & Process'),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF10b981),
            disabledBackgroundColor: Colors.grey,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          ),
        ),
      ],
    );
  }

  Widget _buildSection3CurrentData(StudentProvider studentProvider) {
    return Card(
      color: const Color(0xFF334155),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.table_chart, color: Color(0xFF06b6d4)),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Current Student Data Summary',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'View existing student counts before making changes',
                        style: TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (studentProvider.isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32.0),
                  child: CircularProgressIndicator(color: Color(0xFF6366f1)),
                ),
              )
            else if (studentProvider.levels.isEmpty)
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  border: Border.all(color: Colors.orange),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Center(
                  child: Column(
                    children: [
                      Icon(Icons.info_outline, color: Colors.orange, size: 48),
                      SizedBox(height: 12),
                      Text(
                        'No student data available yet',
                        style: TextStyle(color: Colors.orange, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Use the forms below to add student counts',
                        style: TextStyle(color: Colors.white70, fontSize: 14),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              )
            else
              ...studentProvider.levels.map((level) => _buildLevelDataCard(level)),
          ],
        ),
      ),
    );
  }

  Widget _buildLevelDataCard(StudentLevelData level) {
    return Card(
      color: const Color(0xFF1e293b),
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Level ${level.levelNum}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  onPressed: () => _clearLevelData(level.levelNum),
                  icon: const Icon(Icons.delete, color: Colors.red),
                  tooltip: 'Clear Data',
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildDataRow('Total Students', '${level.studentCount} students'),
            _buildDataRow('Courses with Data', '${level.courseEnrollments.length} courses'),
            if (level.updatedAt != null)
              _buildDataRow(
                'Last Updated',
                '${level.updatedAt!.toLocal().toString().split('.')[0]}',
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDataRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(color: Colors.white70, fontSize: 14),
          ),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
