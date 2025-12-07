import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../api/schedule_service.dart';
import '../data/models.dart';

class RulesManagementScreen extends StatefulWidget {
  const RulesManagementScreen({Key? key}) : super(key: key);

  @override
  State<RulesManagementScreen> createState() => _RulesManagementScreenState();
}

class _RulesManagementScreenState extends State<RulesManagementScreen> {
  List<Rule> _rules = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadRules();
  }

  Future<void> _loadRules() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final userProvider = context.read<UserProvider>();
      final token = userProvider.token;

      final result = await ScheduleService.getAllRules(token: token);

      if (result['success']) {
        final rulesData = result['rules'] as List<dynamic>;
        setState(() {
          _rules = rulesData.map((r) => Rule.fromJson(r)).toList();
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = result['message'];
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error loading rules: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  Future<void> _showAddEditDialog({Rule? rule}) async {
    final nameController = TextEditingController(text: rule?.ruleName ?? '');
    final descriptionController = TextEditingController(text: rule?.ruleDescription ?? '');
    final formKey = GlobalKey<FormState>();

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(rule == null ? 'Add New Rule' : 'Edit Rule'),
        content: Form(
          key: formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Rule Name',
                    hintText: 'Enter rule name',
                    border: OutlineInputBorder(),
                  ),
                  maxLength: 100,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Rule name is required';
                    }
                    if (value.length > 100) {
                      return 'Rule name cannot exceed 100 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Rule Description',
                    hintText: 'Enter rule description',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 5,
                  maxLength: 500,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Rule description is required';
                    }
                    if (value.length > 500) {
                      return 'Rule description cannot exceed 500 characters';
                    }
                    return null;
                  },
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (formKey.currentState?.validate() ?? false) {
                Navigator.pop(context, true);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6366f1),
            ),
            child: Text(rule == null ? 'Add' : 'Update'),
          ),
        ],
      ),
    );

    if (result == true) {
      await _saveRule(
        ruleId: rule?.id,
        ruleName: nameController.text.trim(),
        ruleDescription: descriptionController.text.trim(),
      );
    }
  }

  Future<void> _saveRule({
    String? ruleId,
    required String ruleName,
    required String ruleDescription,
  }) async {
    try {
      final userProvider = context.read<UserProvider>();
      final token = userProvider.token;

      if (token == null) {
        _showMessage('Not authenticated', isError: true);
        return;
      }

      Map<String, dynamic> result;

      if (ruleId == null) {
        // Create new rule
        result = await ScheduleService.createRule(
          token: token,
          ruleName: ruleName,
          ruleDescription: ruleDescription,
        );
      } else {
        // Update existing rule
        result = await ScheduleService.updateRule(
          token: token,
          ruleId: ruleId,
          ruleName: ruleName,
          ruleDescription: ruleDescription,
        );
      }

      if (result['success']) {
        _showMessage(result['message'] ?? 'Rule saved successfully');
        await _loadRules();
      } else {
        _showMessage(result['message'] ?? 'Failed to save rule', isError: true);
      }
    } catch (e) {
      _showMessage('Error saving rule: ${e.toString()}', isError: true);
    }
  }

  Future<void> _deleteRule(Rule rule) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Rule'),
        content: Text('Are you sure you want to delete "${rule.ruleName}"?'),
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
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final userProvider = context.read<UserProvider>();
        final token = userProvider.token;

        if (token == null) {
          _showMessage('Not authenticated', isError: true);
          return;
        }

        final result = await ScheduleService.deleteRule(
          token: token,
          ruleId: rule.id,
        );

        if (result['success']) {
          _showMessage(result['message'] ?? 'Rule deleted successfully');
          await _loadRules();
        } else {
          _showMessage(result['message'] ?? 'Failed to delete rule', isError: true);
        }
      } catch (e) {
        _showMessage('Error deleting rule: ${e.toString()}', isError: true);
      }
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Rules Management'),
        backgroundColor: const Color(0xFF6366f1),
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(_error!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadRules,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _rules.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.rule,
                            size: 64,
                            color: Colors.grey,
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'No rules found',
                            style: TextStyle(
                              fontSize: 18,
                              color: Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Click the + button to add a new rule',
                            style: TextStyle(color: Colors.grey),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadRules,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _rules.length,
                        itemBuilder: (context, index) {
                          final rule = _rules[index];
                          return Card(
                            elevation: 2,
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ExpansionTile(
                              leading: Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF6366f1).withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.rule,
                                  color: Color(0xFF6366f1),
                                ),
                              ),
                              title: Text(
                                rule.ruleName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              subtitle: Text(
                                rule.ruleDescription.length > 60
                                    ? '${rule.ruleDescription.substring(0, 60)}...'
                                    : rule.ruleDescription,
                                style: const TextStyle(
                                  color: Colors.grey,
                                  fontSize: 14,
                                ),
                              ),
                              children: [
                                Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Full Description:',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        rule.ruleDescription,
                                        style: const TextStyle(fontSize: 14),
                                      ),
                                      if (rule.createdAt != null) ...[
                                        const SizedBox(height: 12),
                                        Text(
                                          'Created: ${_formatDate(rule.createdAt!)}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey,
                                          ),
                                        ),
                                      ],
                                      if (rule.updatedAt != null) ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          'Updated: ${_formatDate(rule.updatedAt!)}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey,
                                          ),
                                        ),
                                      ],
                                      const SizedBox(height: 16),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.end,
                                        children: [
                                          OutlinedButton.icon(
                                            onPressed: () => _showAddEditDialog(rule: rule),
                                            icon: const Icon(Icons.edit, size: 18),
                                            label: const Text('Edit'),
                                            style: OutlinedButton.styleFrom(
                                              foregroundColor: const Color(0xFF6366f1),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          ElevatedButton.icon(
                                            onPressed: () => _deleteRule(rule),
                                            icon: const Icon(Icons.delete, size: 18),
                                            label: const Text('Delete'),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: Colors.red,
                                              foregroundColor: Colors.white,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddEditDialog(),
        backgroundColor: const Color(0xFF6366f1),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        return '${difference.inMinutes} minutes ago';
      }
      return '${difference.inHours} hours ago';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}
