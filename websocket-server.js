// websocket-server.js
import WebSocket from 'ws';
import http from 'http';
import { setupWSConnection } from 'y-websocket/bin/utils.js';

const PORT = 1234;

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('WebSocket server is running');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req);
  console.log('✅ New WebSocket connection established');
});

server.listen(PORT, () => {
  console.log(`🚀 Yjs WebSocket server running on ws://localhost:${PORT}`);
});