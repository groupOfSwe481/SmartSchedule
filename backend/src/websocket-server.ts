import WebSocket, { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import http from 'http';

const PORT = process.env.WS_PORT || 1234;

// Create HTTP server for WebSocket
const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('SmartSchedule WebSocket Server Running\n');
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store shared documents
interface WSSharedDoc {
  name: string;
  doc: Y.Doc;
  conns: Map<WebSocket, Set<number>>;
  awareness: awarenessProtocol.Awareness;
}

const docs = new Map<string, WSSharedDoc>();

/**
 * Get or create a shared Y.Doc
 */
function getYDoc(docname: string): WSSharedDoc {
  let sharedDoc = docs.get(docname);
  
  if (!sharedDoc) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    
    sharedDoc = {
      name: docname,
      doc,
      conns: new Map(),
      awareness
    };
    
    docs.set(docname, sharedDoc);
    console.log(`📄 Created new document: ${docname}`);
  }
  
  return sharedDoc;
}

/**
 * Message types
 */
const messageSync = 0;
const messageAwareness = 1;

/**
 * Setup WebSocket connection
 */
function setupWSConnection(
  conn: WebSocket,
  req: http.IncomingMessage,
  docName: string
) {
  conn.binaryType = 'arraybuffer';
  
  const sharedDoc = getYDoc(docName);
  sharedDoc.conns.set(conn, new Set());

  // Send sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, sharedDoc.doc);
  conn.send(encoding.toUint8Array(encoder));

  // Send awareness states
  const awarenessStates = sharedDoc.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, messageAwareness);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(
        sharedDoc.awareness,
        Array.from(awarenessStates.keys())
      )
    );
    conn.send(encoding.toUint8Array(awarenessEncoder));
  }

  // Handle incoming messages
  conn.on('message', (message: Buffer) => {
    try {
      const uint8Array = new Uint8Array(message);
      const decoder = decoding.createDecoder(uint8Array);
      const encoder = encoding.createEncoder();
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.readSyncMessage(
            decoder,
            encoder,
            sharedDoc.doc,
            conn
          );
          
          // Send response if there's something to send
          if (encoding.length(encoder) > 1) {
            conn.send(encoding.toUint8Array(encoder));
          }
          break;

        case messageAwareness:
          awarenessProtocol.applyAwarenessUpdate(
            sharedDoc.awareness,
            decoding.readVarUint8Array(decoder),
            conn
          );
          break;
      }
    } catch (err) {
      console.error('❌ Error handling message:', err);
    }
  });

  // Broadcast document updates to all connections
  const updateHandler = (update: Uint8Array, origin: any) => {
    if (origin !== conn) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      
      sharedDoc.conns.forEach((_, client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  };

  sharedDoc.doc.on('update', updateHandler);

  // Broadcast awareness updates to all connections
  const awarenessChangeHandler = ({ added, updated, removed }: any, origin: any) => {
    const changedClients = added.concat(updated).concat(removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(sharedDoc.awareness, changedClients)
    );
    const buff = encoding.toUint8Array(encoder);
    
    sharedDoc.conns.forEach((_, client) => {
      if (client !== origin && client.readyState === WebSocket.OPEN) {
        client.send(buff);
      }
    });
  };

  sharedDoc.awareness.on('update', awarenessChangeHandler);

  // Handle connection close
  conn.on('close', () => {
    sharedDoc.doc.off('update', updateHandler);
    sharedDoc.awareness.off('update', awarenessChangeHandler);
    sharedDoc.conns.delete(conn);
    
    // Remove awareness state
    awarenessProtocol.removeAwarenessStates(
      sharedDoc.awareness,
      Array.from(sharedDoc.conns.keys()).map((c) => (sharedDoc.conns.get(c) as Set<number>).values().next().value),
      null
    );

    // Clean up empty documents after timeout
    if (sharedDoc.conns.size === 0) {
      setTimeout(() => {
        if (sharedDoc.conns.size === 0) {
          sharedDoc.doc.destroy();
          docs.delete(docName);
          console.log(`🗑️  Removed inactive document: ${docName}`);
        }
      }, 60000); // 1 minute timeout
    }
  });

  // Handle errors
  conn.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
}

console.log('🚀 Initializing SmartSchedule WebSocket Server...');

// Handle new connections
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const ip = req.socket.remoteAddress;
  const url = req.url || '/';
  
  // Extract document name from URL (e.g., /schedule-CS-L3-F2024)
  const docName = url.slice(1).split('?')[0] || 'default';
  
  console.log(`🔌 New connection from ${ip} - Document: ${docName}`);

  setupWSConnection(ws, req, docName);
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  SmartSchedule WebSocket Server           ║
║  Real-time Collaboration Enabled          ║
║                                            ║
║  📡 WebSocket: ws://localhost:${PORT}      ║
║  ✅ Status: Running                        ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down WebSocket server...');
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