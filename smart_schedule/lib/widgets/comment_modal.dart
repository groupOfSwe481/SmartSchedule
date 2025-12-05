import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../providers/comment_provider.dart';

// Define the types of users who can comment
enum CommentUserType { faculty, committee, student }

class CommentModal extends StatefulWidget {
  final Map<String, dynamic> cellInfo;
  final CommentUserType userType;

  const CommentModal({
    Key? key,
    required this.cellInfo,
    this.userType = CommentUserType.faculty, // Default
  }) : super(key: key);

  @override
  State<CommentModal> createState() => _CommentModalState();
}

class _CommentModalState extends State<CommentModal> {
  final TextEditingController _commentController = TextEditingController();

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  // --- Dynamic UI Strings based on User Type ---
  String get _title {
    switch (widget.userType) {
      case CommentUserType.student:
        return 'Add Student Comment';
      case CommentUserType.committee:
        return 'Add Committee Comment';
      case CommentUserType.faculty:
      default:
        return 'Add Faculty Comment';
    }
  }

  String get _hintText {
    if (widget.userType == CommentUserType.student) {
      return 'Share your thoughts about this course...\n\nExamples:\n- I have a conflict with another course\n- The timing is not suitable for me';
    }
    return 'Share your thoughts about this course...\n\nExamples:\n- This course conflicts with a faculty meeting\n- The assigned room is not suitable';
  }

  IconData get _icon {
    return widget.userType == CommentUserType.student
        ? Icons.comment
        : Icons.chat_bubble;
  }

  // --- Submit Logic ---
  Future<void> _submitComment() async {
    final text = _commentController.text.trim();
    if (text.length < 5) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('⚠️ Please enter at least 5 characters'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final userProvider = context.read<UserProvider>();
    final commentProvider = context.read<CommentProvider>();

    if (userProvider.userData == null || userProvider.token == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('❌ Error: User not logged in'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    bool success = false;

    // ✅ LOGIC SWITCH: Call different Provider methods based on User Type
    if (widget.userType == CommentUserType.student) {
      success = await commentProvider.submitStudentComment(
        token: userProvider.token!,
        studentData: userProvider.userData!,
        cellInfo: widget.cellInfo,
        commentText: text,
      );
    } else {
      // Faculty and Committee share the same submission logic (but different roles in userData)
      success = await commentProvider.submitComment(
        userData: userProvider.userData!,
        token: userProvider.token!,
        cellInfo: widget.cellInfo,
        commentText: text,
      );
    }

    if (mounted) {
      if (success) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Comment submitted successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Failed to submit comment'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
        ),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(_icon, color: const Color(0xFF6366f1)),
                  const SizedBox(width: 10),
                  Text(
                    _title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF6366f1),
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const Divider(),
          const SizedBox(height: 10),
          _buildInfoRow('Course', widget.cellInfo['courseName']),
          const SizedBox(height: 8),
          _buildInfoRow(
            'Time',
            '${widget.cellInfo['day']}, ${widget.cellInfo['timeSlot']}',
          ),

          const SizedBox(height: 20),
          const Text(
            'Your Comment:',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _commentController,
            maxLines: 5,
            decoration: InputDecoration(
              hintText: _hintText,
              hintStyle: const TextStyle(fontSize: 13, color: Colors.grey),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: Color(0xFF6366f1)),
              ),
            ),
          ),
          const SizedBox(height: 5),
          const Text(
            'Minimum 5 characters required',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
          const SizedBox(height: 20),

          Consumer<CommentProvider>(
            builder: (context, provider, _) {
              return ElevatedButton.icon(
                onPressed: provider.isSubmitting ? null : _submitComment,
                icon: provider.isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Icon(Icons.send),
                label: Text(
                  provider.isSubmitting ? 'Saving...' : 'Submit Comment',
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366f1),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('$label: ', style: const TextStyle(fontWeight: FontWeight.bold)),
        Expanded(
          child: Text(value, style: const TextStyle(color: Colors.black87)),
        ),
      ],
    );
  }
}
