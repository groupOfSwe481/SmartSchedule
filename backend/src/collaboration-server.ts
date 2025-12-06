import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';

const PORT = process.env.COLLAB_PORT || 4001;

// Create HTTP server for WebSocket
const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('SmartSchedule Collaboration Server Running\n');
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store active connections by schedule
interface CollaborationClient {
  ws: WebSocket;
  clientId: string;
  userId: string;
  userName: string;
  scheduleId: string;
  activeCell: string | null;
}

const scheduleRooms = new Map<string, Map<string, CollaborationClient>>();

/**
 * Get or create a room for a schedule
 */
function getRoom(scheduleId: string): Map<string, CollaborationClient> {
  let room = scheduleRooms.get(scheduleId);
  if (!room) {
    room = new Map();
    scheduleRooms.set(scheduleId, room);
    console.log(`📄 Created new room for schedule: ${scheduleId}`);
  }
  return room;
}

/**
 * Broadcast message to all clients in a room except sender
 */
function broadcastToRoom(
  scheduleId: string,
  message: any,
  excludeClientId?: string
) {
  const room = scheduleRooms.get(scheduleId);
  if (!room) return;

  const messageStr = JSON.stringify(message);
  room.forEach((client, clientId) => {
    if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

/**
 * Send list of active users to all clients in a room
 */
function sendActiveUsers(scheduleId: string) {
  const room = scheduleRooms.get(scheduleId);
  if (!room) return;

  const users = Array.from(room.values()).map((client) => ({
    clientId: client.clientId,
    userId: client.userId,
    userName: client.userName,
    activeCell: client.activeCell,
  }));

  const message = {
    type: 'awareness',
    users,
  };

  broadcastToRoom(scheduleId, message);
}

console.log('🚀 Initializing SmartSchedule Collaboration Server...');

// Handle new connections
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const ip = req.socket.remoteAddress;
  const url = req.url || '/';

  console.log(`🔌 New connection from ${ip} - URL: ${url}`);

  let client: CollaborationClient | null = null;

  // Handle incoming messages
  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      const { type } = message;

      console.log(`📨 Received message type: ${type}`);

      switch (type) {
        case 'join': {
          const { scheduleId, clientId, user } = message;
          const room = getRoom(scheduleId);

          client = {
            ws,
            clientId,
            userId: user.userId,
            userName: user.userName,
            scheduleId,
            activeCell: null,
          };

          room.set(clientId, client);
          console.log(`👋 User joined: ${user.userName} (${clientId}) - Room: ${scheduleId}`);

          // Notify others about new user
          broadcastToRoom(scheduleId, {
            type: 'userJoined',
            user: {
              clientId,
              userId: user.userId,
              userName: user.userName,
            },
          }, clientId);

          // Send current active users to the new client
          sendActiveUsers(scheduleId);
          break;
        }

        case 'awareness': {
          if (!client) break;
          const { activeCell } = message;
          client.activeCell = activeCell;
          console.log(`👁️  Awareness update: ${client.userName} ${activeCell ? `editing ${activeCell}` : 'idle'}`);
          sendActiveUsers(client.scheduleId);
          break;
        }

        case 'cellUpdate': {
          if (!client) break;
          const { cellId, cellData } = message;
          console.log(`📝 Cell update: ${cellId} by ${client.userName}`);

          // Broadcast to others in the room
          broadcastToRoom(client.scheduleId, {
            type: 'cellUpdate',
            clientId: client.clientId,
            cellId,
            cellData,
          }, client.clientId);
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }

        case 'leave': {
          // Handle graceful leave (disconnect will also trigger cleanup)
          console.log(`👋 User leaving: ${client?.userName}`);
          break;
        }

        default:
          console.log(`⚠️  Unknown message type: ${type}`);
      }
    } catch (err) {
      console.error('❌ Error handling message:', err);
    }
  });

  // Handle connection close
  ws.on('close', () => {
    if (client) {
      const room = scheduleRooms.get(client.scheduleId);
      if (room) {
        room.delete(client.clientId);
        console.log(`🚪 User left: ${client.userName} (${client.clientId})`);

        // Notify others
        broadcastToRoom(client.scheduleId, {
          type: 'userLeft',
          clientId: client.clientId,
        });

        // Send updated user list
        sendActiveUsers(client.scheduleId);

        // Clean up empty rooms
        if (room.size === 0) {
          scheduleRooms.delete(client.scheduleId);
          console.log(`🗑️  Removed empty room: ${client.scheduleId}`);
        }
      }
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  SmartSchedule Collaboration Server       ║
║  JSON-based Real-time Collaboration       ║
║                                            ║
║  📡 WebSocket: ws://localhost:${PORT}      ║
║  ✅ Status: Running                        ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down collaboration server...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Server closed gracefully');
      process.exit(0);
    });
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
