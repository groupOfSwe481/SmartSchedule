// lib/widgets/comment_modal.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../providers/comment_provider.dart';

class CommentModal extends StatefulWidget {
  final Map<String, dynamic> cellInfo;

  const CommentModal({Key? key, required this.cellInfo}) : super(key: key);

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

  Future<void> _saveComment() async {
    if (_commentController.text.trim().length < 5) {
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
          content: Text('❌ User not logged in'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    try {
      final success = await commentProvider.submitComment(
        userData: userProvider.userData!,
        token: userProvider.token!,
        cellInfo: widget.cellInfo,
        commentText: _commentController.text.trim(),
      );

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
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _getModalTitle(BuildContext context) {
    final userProvider = context.read<UserProvider>();
    final userRole = userProvider.userData?['role'] as String?;

    switch (userRole) {
      case 'Student':
        return 'Add Student Comment';
      case 'LoadCommittee':
        return 'Add Committee Comment';
      case 'Faculty':
      default:
        return 'Add Faculty Comment';
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
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
                ),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.chat_bubble, color: Colors.white),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _getModalTitle(context),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            // Body
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildInfoRow('Course', widget.cellInfo['courseName'] ?? widget.cellInfo['course'] ?? 'N/A'),
                  const SizedBox(height: 12),
                  _buildInfoRow(
                    'Time',
                    '${widget.cellInfo['day'] ?? ''}, ${widget.cellInfo['timeSlot'] ?? widget.cellInfo['time'] ?? ''}',
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Your Comment:',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),
                  Consumer<UserProvider>(
                    builder: (context, userProvider, child) {
                      final userRole = userProvider.userData?['role'] as String?;
                      String hintText;

                      if (userRole == 'Student') {
                        hintText = 'Share your concerns about this course schedule...\n\nExamples:\n- This course conflicts with another course\n- Time slot doesn\'t work for me\n- Request for alternative section';
                      } else {
                        hintText = 'Share your thoughts about this course...\n\nExamples:\n- This course conflicts with a faculty meeting\n- Suggest moving to another time\n- The assigned room is not suitable';
                      }

                      return TextField(
                        controller: _commentController,
                        maxLines: 5,
                        decoration: InputDecoration(
                          hintText: hintText,
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
                      );
                    },
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Minimum 5 characters required',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                  const SizedBox(height: 24),

                  // Buttons
                  Consumer<CommentProvider>(
                    builder: (context, commentProvider, child) {
                      return Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: commentProvider.isSubmitting
                                  ? null
                                  : () => Navigator.pop(context),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 16,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: const Text('Cancel'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: commentProvider.isSubmitting
                                  ? null
                                  : _saveComment,
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 16,
                                ),
                                backgroundColor: const Color(0xFF6366f1),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: commentProvider.isSubmitting
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor:
                                            AlwaysStoppedAnimation<Color>(
                                              Colors.white,
                                            ),
                                      ),
                                    )
                                  : Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: const [
                                        Icon(Icons.send, size: 18),
                                        SizedBox(width: 8),
                                        Text('Submit'),
                                      ],
                                    ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$label: ',
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 14, color: Colors.grey),
          ),
        ),
      ],
    );
  }
}
