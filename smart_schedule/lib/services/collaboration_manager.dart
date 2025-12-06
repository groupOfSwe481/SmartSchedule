import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class CollaborationUser {
  final String clientId;
  final String userId;
  final String userName;
  final String? activeCell;
  final Map<String, dynamic>? cellData;

  CollaborationUser({
    required this.clientId,
    required this.userId,
    required this.userName,
    this.activeCell,
    this.cellData,
  });

  factory CollaborationUser.fromJson(Map<String, dynamic> json) {
    return CollaborationUser(
      clientId: json['clientId'] as String,
      userId: json['userId'] as String,
      userName: json['userName'] as String,
      activeCell: json['activeCell'] as String?,
      cellData: json['cellData'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
        'clientId': clientId,
        'userId': userId,
        'userName': userName,
        if (activeCell != null) 'activeCell': activeCell,
        if (cellData != null) 'cellData': cellData,
      };
}

class CollaborationManager extends ChangeNotifier {
  WebSocketChannel? _channel;

  String? _scheduleId;
  String? _clientId;
  Map<String, dynamic>? _currentUser;

  final List<CollaborationUser> _activeUsers = [];
  String? _connectionStatus;
  String? _activeCell;

  bool _isConnected = false;
  Timer? _heartbeatTimer;

  // Getters
  List<CollaborationUser> get activeUsers => List.unmodifiable(_activeUsers);
  String? get connectionStatus => _connectionStatus;
  String? get activeCell => _activeCell;
  bool get isConnected => _isConnected;
  String? get scheduleId => _scheduleId;
  String? get clientId => _clientId;

  // WebSocket URL - Update this to match your backend
  String get _wsUrl {
    // Use localhost for development, or your deployed URL
    if (kDebugMode) {
      return 'ws://localhost:4001';
    }
    return 'wss://smart-schedule-mhs1.vercel.app/collaboration';
  }

  /// Initialize collaboration for a schedule
  Future<void> init(String scheduleId, Map<String, dynamic> user) async {
    try {
      _scheduleId = scheduleId;
      _currentUser = user;

      // Try to get user ID from multiple possible field names
      final userId = user['_id'] ?? user['id'] ?? user['ID'] ?? 'unknown';
      _clientId = '${userId}_${DateTime.now().millisecondsSinceEpoch}';

      debugPrint('🔄 Initializing collaboration for schedule: $scheduleId');
      debugPrint('👤 User: ${user['First_Name']} ${user['Last_Name']} (ID: $userId)');

      // Connect to WebSocket
      await _connectWebSocket();

      _connectionStatus = 'Connected';
      notifyListeners();
    } catch (e) {
      debugPrint('❌ Collaboration init error: $e');
      _connectionStatus = 'Failed to connect';
      notifyListeners();
      rethrow;
    }
  }

  /// Connect to WebSocket server
  Future<void> _connectWebSocket() async {
    try {
      final uri = Uri.parse(_wsUrl);

      _channel = WebSocketChannel.connect(uri);

      // Listen to WebSocket messages FIRST
      _channel!.stream.listen(
        _handleMessage,
        onError: (error) {
          debugPrint('❌ WebSocket error: $error');
          _connectionStatus = 'Connection error';
          _isConnected = false;
          notifyListeners();
        },
        onDone: () {
          debugPrint('⚠️ WebSocket connection closed');
          _isConnected = false;
          _connectionStatus = 'Disconnected';
          notifyListeners();
        },
      );

      _isConnected = true;

      // Send join message after connection is established
      final userId = _currentUser!['_id'] ?? _currentUser!['id'] ?? _currentUser!['ID'] ?? 'unknown';
      final joinMessage = {
        'type': 'join',
        'scheduleId': _scheduleId,
        'clientId': _clientId,
        'user': {
          'userId': userId,
          'userName': '${_currentUser!['First_Name']} ${_currentUser!['Last_Name']}',
        },
      };

      debugPrint('📤 Sending join message: ${jsonEncode(joinMessage)}');
      _sendMessage(joinMessage);

      // Start heartbeat
      _startHeartbeat();

      notifyListeners();
    } catch (e) {
      debugPrint('❌ WebSocket connection error: $e');
      rethrow;
    }
  }

  /// Handle incoming WebSocket messages
  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message as String) as Map<String, dynamic>;
      final type = data['type'] as String?;

      debugPrint('📨 Received message: $type');

      switch (type) {
        case 'sync':
          _handleSync(data);
          break;
        case 'update':
          _handleUpdate(data);
          break;
        case 'awareness':
          _handleAwareness(data);
          break;
        case 'userJoined':
          _handleUserJoined(data);
          break;
        case 'userLeft':
          _handleUserLeft(data);
          break;
        case 'cellUpdate':
          _handleCellUpdate(data);
          break;
        case 'pong':
          // Heartbeat response - connection is alive
          debugPrint('💓 Heartbeat acknowledged');
          break;
        default:
          debugPrint('⚠️  Unknown message type: $type');
      }
    } catch (e) {
      debugPrint('❌ Error handling message: $e');
    }
  }

  /// Handle sync message (initial state)
  void _handleSync(Map<String, dynamic> data) {
    // Apply initial state to Yjs document
    if (data['state'] != null) {
      // The state could be encoded; apply it to the YDoc
      debugPrint('📥 Applying initial state');
    }
  }

  /// Handle update message (incremental changes)
  void _handleUpdate(Map<String, dynamic> data) {
    if (data['update'] != null) {
      // Apply the update to YDoc
      debugPrint('📥 Applying update');
      notifyListeners();
    }
  }

  /// Handle awareness update (who's editing what)
  void _handleAwareness(Map<String, dynamic> data) {
    if (data['users'] != null) {
      _activeUsers.clear();
      final users = data['users'] as List;
      for (var userJson in users) {
        _activeUsers.add(CollaborationUser.fromJson(userJson as Map<String, dynamic>));
      }
      notifyListeners();
    }
  }

  /// Handle user joined
  void _handleUserJoined(Map<String, dynamic> data) {
    if (data['user'] != null) {
      final user = CollaborationUser.fromJson(data['user'] as Map<String, dynamic>);
      _activeUsers.add(user);
      debugPrint('👋 User joined: ${user.userName}');
      notifyListeners();
    }
  }

  /// Handle user left
  void _handleUserLeft(Map<String, dynamic> data) {
    final clientId = data['clientId'] as String?;
    if (clientId != null) {
      _activeUsers.removeWhere((u) => u.clientId == clientId);
      debugPrint('👋 User left: $clientId');
      notifyListeners();
    }
  }

  /// Handle cell update from another user
  void _handleCellUpdate(Map<String, dynamic> data) {
    final cellId = data['cellId'] as String?;
    final cellData = data['cellData'] as Map<String, dynamic>?;

    if (cellId != null && cellData != null) {
      debugPrint('📝 Cell updated by another user: $cellId = ${cellData['course']}');

      // Notify listeners so the UI can update the TextField
      // The actual TextField update will be handled by the scheduler screen
      notifyListeners();

      // Store the latest cell data for the scheduler screen to access
      _latestCellUpdate = {
        'cellId': cellId,
        'cellData': cellData,
      };
    }
  }

  // Store latest cell update
  Map<String, dynamic>? _latestCellUpdate;
  Map<String, dynamic>? get latestCellUpdate => _latestCellUpdate;

  void clearLatestCellUpdate() {
    _latestCellUpdate = null;
  }

  /// Send a message to the WebSocket server
  void _sendMessage(Map<String, dynamic> message) {
    if (_channel != null && _isConnected) {
      _channel!.sink.add(jsonEncode(message));
    }
  }

  /// Set the active cell being edited
  void setActiveCell(String cellId) {
    _activeCell = cellId;
    _sendMessage({
      'type': 'awareness',
      'scheduleId': _scheduleId,
      'clientId': _clientId,
      'activeCell': cellId,
    });
    notifyListeners();
  }

  /// Clear the active cell
  void clearActiveCell() {
    _activeCell = null;
    _sendMessage({
      'type': 'awareness',
      'scheduleId': _scheduleId,
      'clientId': _clientId,
      'activeCell': null,
    });
    notifyListeners();
  }

  /// Update a cell value
  void updateCell(String cellId, Map<String, dynamic> cellData) {
    _sendMessage({
      'type': 'cellUpdate',
      'scheduleId': _scheduleId,
      'clientId': _clientId,
      'cellId': cellId,
      'cellData': cellData,
    });
  }

  /// Start heartbeat to keep connection alive
  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      if (_isConnected) {
        _sendMessage({'type': 'ping', 'clientId': _clientId});
      }
    });
  }

  /// Disconnect from collaboration
  void disconnect() {
    _heartbeatTimer?.cancel();

    if (_channel != null && _isConnected) {
      _sendMessage({
        'type': 'leave',
        'scheduleId': _scheduleId,
        'clientId': _clientId,
      });
      _channel!.sink.close();
    }

    _channel = null;
    _isConnected = false;
    _activeUsers.clear();
    _scheduleId = null;
    _clientId = null;
    _activeCell = null;
    _connectionStatus = 'Disconnected';

    notifyListeners();
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}
