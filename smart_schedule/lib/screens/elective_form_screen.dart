// lib/screens/elective_form_screen.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../api/schedule_service.dart';

class ElectiveFormScreen extends StatefulWidget {
  const ElectiveFormScreen({Key? key}) : super(key: key);

  @override
  State<ElectiveFormScreen> createState() => _ElectiveFormScreenState();
}

class _ElectiveFormScreenState extends State<ElectiveFormScreen> {
  bool _isLoading = true;
  bool _isFormActive = false;
  bool _isSubmitted = false;
  bool _isSubmitting = false;

  List<Map<String, dynamic>> _allCourses = [];
  List<String> _selectedCourses = [];
  List<String> _coursesTaken = [];

  Map<String, dynamic>? _existingSubmission;
  DateTime? _deadline;
  String? _errorMessage;

  final TextEditingController _suggestionsController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadElectiveForm();
  }

  @override
  void dispose() {
    _suggestionsController.dispose();
    super.dispose();
  }

  Future<void> _loadElectiveForm() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final userProvider = context.read<UserProvider>();
      final token = userProvider.token;
      final studentId =
          userProvider.userData?['student_id'] ??
          userProvider.userData?['_id'] ??
          userProvider.userData?['id'];

      if (token == null || studentId == null) {
        throw Exception('User not logged in properly');
      }

      // 1. Check form status and existing submission
      final statusResult = await ScheduleService.checkElectiveFormStatus(
        token: token,
        studentId: studentId.toString(),
      );

      if (!statusResult['success']) {
        throw Exception(
          statusResult['message'] ?? 'Failed to check form status',
        );
      }

      _isFormActive = statusResult['form_active'] ?? false;
      _existingSubmission = statusResult['submission'];

      // If already submitted, show submission details
      if (_existingSubmission != null &&
          _existingSubmission!['submission_status'] == 'submitted') {
        setState(() {
          _isSubmitted = true;
          _isLoading = false;
        });
        return;
      }

      // If form is not active, show inactive message
      if (!_isFormActive) {
        setState(() {
          _errorMessage =
              statusResult['message'] ?? 'Form is not currently active';
          _isLoading = false;
        });
        return;
      }

      // 2. Load courses taken
      final studentData = await ScheduleService.getStudentData(
        token: token,
        studentId: studentId.toString(),
      );

      if (studentData['success']) {
        _coursesTaken = List<String>.from(
          studentData['student']['courses_taken'] ?? [],
        );
      }

      // 3. Load available elective courses
      final coursesResult = await ScheduleService.getElectiveCourses(
        token: token,
      );

      if (!coursesResult['success']) {
        throw Exception(coursesResult['message'] ?? 'Failed to load courses');
      }

      // Filter out taken courses
      final allCourses = List<Map<String, dynamic>>.from(
        coursesResult['courses'] ?? [],
      );

      _allCourses = allCourses.where((course) {
        return !_coursesTaken.contains(course['code']);
      }).toList();

      // Set deadline if available
      if (coursesResult['deadline'] != null) {
        _deadline = DateTime.parse(coursesResult['deadline']);
      }

      // 4. Load existing draft if available
      if (_existingSubmission != null &&
          _existingSubmission!['submission_status'] == 'draft') {
        _selectedCourses = List<String>.from(
          _existingSubmission!['selected_courses'] ?? [],
        );
        _suggestionsController.text = _existingSubmission!['suggestions'] ?? '';
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _saveDraft() async {
    try {
      final userProvider = context.read<UserProvider>();
      final token = userProvider.token;
      final studentId =
          userProvider.userData?['student_id'] ??
          userProvider.userData?['_id'] ??
          userProvider.userData?['id'];

      if (token == null || studentId == null) return;

      await ScheduleService.saveElectiveForm(
        token: token,
        studentId: studentId.toString(),
        selectedCourses: _selectedCourses,
        suggestions: _suggestionsController.text,
      );
    } catch (e) {
      print('Auto-save error: $e');
    }
  }

  Future<void> _submitForm() async {
    // Check if deadline passed
    if (_deadline != null && DateTime.now().isAfter(_deadline!)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('❌ Cannot submit: The form deadline has passed'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Confirm submission
    if (_selectedCourses.isEmpty &&
        _suggestionsController.text.trim().isEmpty) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Confirm Submission'),
          content: const Text(
            'You haven\'t selected any courses or provided suggestions. Submit anyway?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Submit'),
            ),
          ],
        ),
      );

      if (confirmed != true) return;
    }

    setState(() => _isSubmitting = true);

    try {
      final userProvider = context.read<UserProvider>();
      final token = userProvider.token;
      final studentId =
          userProvider.userData?['student_id'] ??
          userProvider.userData?['_id'] ??
          userProvider.userData?['id'];

      if (token == null || studentId == null) {
        throw Exception('User not logged in');
      }

      // Save before submitting
      await ScheduleService.saveElectiveForm(
        token: token,
        studentId: studentId.toString(),
        selectedCourses: _selectedCourses,
        suggestions: _suggestionsController.text,
      );

      // Submit
      final result = await ScheduleService.submitElectiveForm(
        token: token,
        studentId: studentId.toString(),
      );

      if (mounted) {
        if (result['success']) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✅ Elective preferences submitted successfully!'),
              backgroundColor: Colors.green,
            ),
          );

          // Reload to show submitted state
          await Future.delayed(const Duration(seconds: 1));
          _loadElectiveForm();
        } else {
          throw Exception(result['message'] ?? 'Failed to submit');
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Failed to submit: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  void _toggleCourse(String courseCode) {
    setState(() {
      if (_selectedCourses.contains(courseCode)) {
        _selectedCourses.remove(courseCode);
      } else {
        _selectedCourses.add(courseCode);
      }
    });
    _saveDraft(); // Auto-save
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    // Show submitted state
    if (_isSubmitted && _existingSubmission != null) {
      return _buildSubmittedView();
    }

    // Show error/inactive state
    if (_errorMessage != null || !_isFormActive) {
      return _buildInactiveView();
    }

    // Show form
    return RefreshIndicator(
      onRefresh: _loadElectiveForm,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_deadline != null) _buildDeadlineBanner(),
            const SizedBox(height: 16),
            _buildAvailableCoursesSection(),
            const SizedBox(height: 16),
            _buildSelectedCoursesSection(),
            const SizedBox(height: 16),
            _buildSuggestionsSection(),
            const SizedBox(height: 24),
            _buildSubmitButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildDeadlineBanner() {
    final now = DateTime.now();
    final timeLeft = _deadline!.difference(now);
    final daysLeft = timeLeft.inDays;
    final hoursLeft = timeLeft.inHours;

    final isUrgent = daysLeft < 2;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isUrgent ? Colors.red.shade50 : Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isUrgent ? Colors.red.shade200 : Colors.blue.shade200,
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.access_time, color: isUrgent ? Colors.red : Colors.blue),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Form Deadline',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isUrgent ? Colors.red : Colors.blue,
                  ),
                ),
                Text(
                  '${_deadline!.day}/${_deadline!.month}/${_deadline!.year} at ${_deadline!.hour}:${_deadline!.minute.toString().padLeft(2, '0')}',
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ),
          Text(
            daysLeft > 0 ? '$daysLeft days left' : '$hoursLeft hours left',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: isUrgent ? Colors.red : Colors.blue,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvailableCoursesSection() {
    return Container(
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
            children: [
              const Icon(Icons.list_alt, color: Color(0xFF1e293b)),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Available Elective Courses',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1e293b),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366f1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  'Selected: ${_selectedCourses.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          if (_coursesTaken.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.filter_alt, size: 16, color: Colors.grey),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Filtering: ${_coursesTaken.length} taken courses hidden',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          if (_allCourses.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: Text(
                  'No elective courses available',
                  style: TextStyle(color: Colors.grey),
                ),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _allCourses.length,
              itemBuilder: (context, index) {
                final course = _allCourses[index];
                final isSelected = _selectedCourses.contains(course['code']);

                return InkWell(
                  onTap: () => _toggleCourse(course['code']),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? const Color(0xFFe3f2fd)
                          : Colors.white,
                      border: Border.all(
                        color: isSelected
                            ? const Color(0xFF6366f1)
                            : const Color(0xFFe2e8f0),
                        width: 2,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isSelected
                              ? Icons.check_circle
                              : Icons.circle_outlined,
                          color: isSelected
                              ? const Color(0xFF6366f1)
                              : Colors.grey,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${course['code']} - ${course['name']}',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: isSelected
                                      ? const Color(0xFF6366f1)
                                      : Colors.black,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${course['department']} - ${course['credit_hours']} credit hours',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey,
                                ),
                              ),
                              if (course['description'] != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  course['description'],
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ],
                          ),
                        ),
                        Text(
                          '${course['credit_hours']} hrs',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildSelectedCoursesSection() {
    return Container(
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
              Icon(Icons.check_circle, color: Color(0xFF1e293b)),
              SizedBox(width: 12),
              Text(
                'Selected Electives',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1e293b),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_selectedCourses.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: Text(
                  'No courses selected yet',
                  style: TextStyle(
                    color: Colors.grey,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _selectedCourses.length,
              itemBuilder: (context, index) {
                final courseCode = _selectedCourses[index];
                final course = _allCourses.firstWhere(
                  (c) => c['code'] == courseCode,
                  orElse: () => {'code': courseCode, 'name': 'Unknown Course'},
                );

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFe3f2fd), Color(0xFFede7f6)],
                    ),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF6366f1)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              course['code'],
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF6366f1),
                              ),
                            ),
                            Text(
                              course['name'],
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.red),
                        onPressed: () => _toggleCourse(courseCode),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildSuggestionsSection() {
    return Container(
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
              Icon(Icons.chat_bubble_outline, color: Color(0xFF1e293b)),
              SizedBox(width: 12),
              Text(
                'Suggestions & Needs',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1e293b),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _suggestionsController,
            maxLines: 5,
            decoration: InputDecoration(
              hintText:
                  'Example:\n- I\'m interested in cloud security courses\n- I need evening classes\n- I suggest adding blockchain course\n- I have special scheduling needs...',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                  color: Color(0xFFe2e8f0),
                  width: 2,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                  color: Color(0xFF6366f1),
                  width: 2,
                ),
              ),
            ),
            onChanged: (_) => _saveDraft(),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitButton() {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        onPressed: _isSubmitting ? null : _submitForm,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF6366f1),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: _isSubmitting
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Icon(Icons.send, color: Colors.white),
                  SizedBox(width: 8),
                  Text(
                    'Submit Elective Preferences',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildSubmittedView() {
    final submission = _existingSubmission!;
    final submittedAt = DateTime.parse(submission['submitted_at']);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Container(
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
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.green, size: 32),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Form Already Submitted',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.green,
                          ),
                        ),
                        Text(
                          'Submitted on: ${submittedAt.day}/${submittedAt.month}/${submittedAt.year}',
                          style: const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Selected Courses:',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (submission['selected_courses'] == null ||
                (submission['selected_courses'] as List).isEmpty)
              const Text(
                'No courses selected',
                style: TextStyle(color: Colors.grey),
              )
            else
              ...List<String>.from(submission['selected_courses']).map((code) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.blue.shade200),
                  ),
                  child: Text(
                    code,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                );
              }).toList(),
            if (submission['suggestions'] != null &&
                submission['suggestions'].toString().isNotEmpty) ...[
              const SizedBox(height: 24),
              const Text(
                'Your Suggestions:',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Text(submission['suggestions']),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInactiveView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.orange.shade50,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.orange.shade200),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.warning_amber_rounded,
                size: 64,
                color: Colors.orange.shade700,
              ),
              const SizedBox(height: 16),
              const Text(
                'Form Not Active',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                _errorMessage ??
                    'The elective form is not currently available.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadElectiveForm,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
