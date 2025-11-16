const WebSocket = require('ws');
const http = require('http');
const { setupWSConnection } = require('y-websocket/bin/utils.js');

const PORT = 1234;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req);
  console.log('✅ New WebSocket connection established');
});

server.listen(PORT, () => {
  console.log(`🚀 Yjs WebSocket server running on ws://localhost:${PORT}`);
});
