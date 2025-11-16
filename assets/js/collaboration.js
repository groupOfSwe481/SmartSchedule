// collaboration.js
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

let ydoc = null;
let provider = null;
let yScheduleMap = null;
let currentScheduleId = null;

// Initialize Yjs for a specific schedule
export function initializeCollaboration(scheduleId, initialGrid) {
  // Clean up existing connection
  cleanupCollaboration();

  currentScheduleId = scheduleId;
  
  // Create new Yjs document
  ydoc = new Y.Doc();
  
  // Connect to WebSocket server
  provider = new WebsocketProvider(
    'ws://localhost:1234', // WebSocket server URL
    `schedule-${scheduleId}`, // Room name (unique per schedule)
    ydoc
  );

  // Get shared map for schedule grid
  yScheduleMap = ydoc.getMap('scheduleGrid');

  // Set initial data if map is empty
  if (yScheduleMap.size === 0 && initialGrid) {
    yScheduleMap.set('grid', initialGrid);
  }

  // Setup awareness for showing active users
  provider.awareness.setLocalStateField('user', {
    name: 'User ' + Math.floor(Math.random() * 100),
    color: getRandomColor()
  });

  return { ydoc, provider, yScheduleMap };
}

// Cleanup function
export function cleanupCollaboration() {
  if (provider) {
    provider.destroy();
    provider = null;
  }
  if (ydoc) {
    ydoc.destroy();
    ydoc = null;
  }
  yScheduleMap = null;
  currentScheduleId = null;
}

// Get current Yjs instances
export function getCollaborationInstances() {
  return { ydoc, provider, yScheduleMap, currentScheduleId };
}

// Helper function for random colors
function getRandomColor() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
  return colors[Math.floor(Math.random() * colors.length)];
}