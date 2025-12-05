// collaboration.js - Real-time Collaboration Manager for SmartSchedule
// Browser-compatible version (no ES6 imports)
// NO CELL LOCKING - Multiple users can edit the same cell simultaneously

(function() {
  'use strict';

  class CollaborationManager {
    constructor() {
      this.ydoc = null;
      this.provider = null;
      this.ySchedule = null;
      this.awareness = null;
      this.currentUser = null;
      this.activeCell = null;
      this.isInitialized = false;
      this.scheduleId = null;
      this.activeUsersContainerId = 'active-users-container';
      this.connectionStatusId = 'connection-status';
    }

    /**
     * Initialize collaboration for a specific schedule
     * @param {string} scheduleId - Unique identifier for the schedule
     * @param {Object} user - Current user information from session
     */
    async init(scheduleId, user) {
      console.log('🚀 Initializing collaboration for schedule:', scheduleId);

      // Check if Yjs is available
      if (typeof window.Y === 'undefined' || typeof window.WebsocketProvider === 'undefined') {
        console.error('❌ Yjs or WebsocketProvider not loaded!');
        throw new Error('Collaboration dependencies not loaded. Please include Yjs and y-websocket libraries.');
      }

      // Disconnect existing connection if any
      if (this.isInitialized) {
        this.disconnect();
      }

      this.scheduleId = scheduleId;
      
      // Prepare user data
      this.currentUser = {
        id: user._id || user.id || user.Email,
        name: `${user.First_Name || ''} ${user.Last_Name || ''}`.trim() || user.Email,
        email: user.Email,
        role: user.role || 'Scheduler',
        color: this.generateUserColor(user.Email)
      };

      console.log('👤 Current user:', this.currentUser);

      // Create Yjs document for this schedule
      this.ydoc = new window.Y.Doc();
      
      // Create shared types
      this.ySchedule = this.ydoc.getMap('schedule');
      
      // Get WebSocket URL
      const wsUrl = this.getWebSocketUrl();
      const roomName = `schedule-${scheduleId}`;
      
      console.log(`🔗 Connecting to: ${wsUrl}/${roomName}`);

      // Create WebSocket provider
      this.provider = new window.WebsocketProvider(
        wsUrl,
        roomName,
        this.ydoc,
        {
          connect: true,
          // Add reconnection options
          resyncInterval: 5000,
          maxBackoffTime: 5000
        }
      );

      // Get awareness from provider
      this.awareness = this.provider.awareness;

      // Set local user state
      this.awareness.setLocalState({
        user: this.currentUser,
        activeCell: null,
        timestamp: Date.now()
      });

      // Setup listeners
      this.setupAwarenessListeners();
      this.setupDocumentListeners();
      this.setupConnectionListeners();

      this.isInitialized = true;
      console.log('✅ Collaboration initialized successfully');
      console.log('ℹ️  Cell locking is DISABLED - multiple users can edit simultaneously');
    }

    /**
     * Get WebSocket URL based on environment
     */
    getWebSocketUrl() {
      const hostname = window.location.hostname;
      
      // Development
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'ws://localhost:1234';
      }
      
      // Production - adjust this for your deployment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${hostname}:1234`;
    }

    /**
     * Generate consistent color for user
     */
    generateUserColor(email) {
      const colors = [
        '#1976d2', '#d32f2f', '#388e3c', '#f57c00',
        '#7b1fa2', '#0097a7', '#c2185b', '#5d4037',
        '#455a64', '#e64a19', '#00796b', '#1976d2',
        '#7b1fa2', '#c2185b', '#f57c00', '#388e3c'
      ];
      
      let hash = 0;
      for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    }

    /**
     * Setup awareness listeners to track other users
     */
    setupAwarenessListeners() {
      this.awareness.on('change', () => {
        const users = Array.from(this.awareness.getStates().entries())
          .filter(([clientId, state]) => state.user)
          .map(([clientId, state]) => ({
            clientId,
            ...state.user,
            activeCell: state.activeCell,
            timestamp: state.timestamp
          }));

        this.updateActiveUsers(users);
        this.updateCellIndicators(users);
      });

      console.log('✅ Awareness listeners setup');
    }

    /**
     * Setup document listeners to observe changes
     */
    setupDocumentListeners() {
      this.ySchedule.observe((event) => {
        event.changes.keys.forEach((change, key) => {
          if (change.action === 'add' || change.action === 'update') {
            const value = this.ySchedule.get(key);
            if (value && value.updatedBy !== this.currentUser.id) {
              this.handleRemoteUpdate(key, value);
            }
          } else if (change.action === 'delete') {
            this.handleRemoteDelete(key);
          }
        });
      });

      console.log('✅ Document listeners setup');
    }

    /**
     * Setup connection status listeners
     */
    setupConnectionListeners() {
      this.provider.on('status', ({ status }) => {
        console.log('📡 Connection status:', status);
        this.updateConnectionStatus(status);
        
        if (status === 'connected') {
          console.log('✅ Connected to collaboration server');
        } else if (status === 'disconnected') {
          console.warn('⚠️ Disconnected from collaboration server');
          this.showReconnectingMessage();
        }
      });

      this.provider.on('sync', (isSynced) => {
        if (isSynced) {
          console.log('✅ Document synced');
          this.loadScheduleFromYjs();
        }
      });

      console.log('✅ Connection listeners setup');
    }

    /**
     * Update cell value and sync to all users
     */
    updateCell(cellId, courseData) {
      if (!this.isInitialized) {
        console.warn('⚠️ Collaboration not initialized');
        return;
      }

      const cellData = {
        ...courseData,
        updatedBy: this.currentUser.id,
        updatedByName: this.currentUser.name,
        updatedAt: Date.now()
      };

      this.ySchedule.set(cellId, cellData);
      console.log('📤 Updated cell:', cellId, cellData);
    }

    /**
     * Delete cell value
     */
    deleteCell(cellId) {
      if (!this.isInitialized) return;
      this.ySchedule.delete(cellId);
      console.log('🗑️ Deleted cell:', cellId);
    }

    /**
     * Set active cell (user is editing)
     * NOTE: This is for visual indicators only - does NOT lock the cell
     */
    setActiveCell(cellId) {
      if (!this.isInitialized) return;
      
      this.activeCell = cellId;
      this.awareness.setLocalState({
        user: this.currentUser,
        activeCell: cellId,
        timestamp: Date.now()
      });
      
      console.log('✏️ Editing cell (no lock):', cellId);
    }

    /**
     * Clear active cell (user finished editing)
     */
    clearActiveCell() {
      if (!this.isInitialized) return;
      
      const previousCell = this.activeCell;
      this.activeCell = null;
      
      this.awareness.setLocalState({
        user: this.currentUser,
        activeCell: null,
        timestamp: Date.now()
      });
      
      console.log('✅ Finished editing cell:', previousCell);
    }

    /**
     * Handle remote update from another user
     */
    handleRemoteUpdate(cellId, courseData) {
      console.log('📥 Remote update:', cellId, courseData);
      
      // Find the cell in DOM
      const cell = document.querySelector(`[data-cell-id="${cellId}"]`);
      if (cell) {
        // Update cell content
        this.renderCourseInCell(cell, courseData);
        
        // Show flash animation
        cell.classList.add('remote-update-flash');
        setTimeout(() => cell.classList.remove('remote-update-flash'), 1000);
        
        // Show notification
        this.showUpdateNotification(courseData.updatedByName, cellId);
      }
    }

    /**
     * Handle remote delete
     */
    handleRemoteDelete(cellId) {
      console.log('🗑️ Remote delete:', cellId);
      
      const cell = document.querySelector(`[data-cell-id="${cellId}"]`);
      if (cell) {
        cell.textContent = '';
        cell.classList.add('remote-update-flash');
        setTimeout(() => cell.classList.remove('remote-update-flash'), 1000);
      }
    }

    /**
     * Update active users display
     */
    updateActiveUsers(users) {
      const container = document.getElementById(this.activeUsersContainerId);
      if (!container) return;

      const currentUser = this.currentUser;
      const otherUsers = users.filter(u => u.id !== currentUser.id);

      if (otherUsers.length === 0) {
        container.innerHTML = `
          <div class="alert alert-info alert-sm mb-0">
            <i class="bi bi-person"></i> You're the only one editing
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="d-flex flex-wrap gap-2">
            ${otherUsers.map(user => `
              <div class="user-badge" style="background-color: ${user.color}20; border-left: 3px solid ${user.color};">
                <div class="user-avatar" style="background-color: ${user.color};">
                  ${this.getInitials(user.name)}
                </div>
                <span class="small">${user.name}</span>
                ${user.activeCell ? `<span class="badge bg-secondary ms-1">Editing</span>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    /**
     * Update cell indicators showing who is editing
     * Shows indicator but does NOT prevent editing
     */
    updateCellIndicators(users) {
      // Remove all existing indicators
      document.querySelectorAll('.editing-indicator').forEach(el => el.remove());
      document.querySelectorAll('.being-edited').forEach(el => el.classList.remove('being-edited'));

      // Add indicators for cells being edited (visual only, not a lock)
      users.forEach(user => {
        if (user.activeCell && user.id !== this.currentUser.id) {
          const cell = document.querySelector(`[data-cell-id="${user.activeCell}"]`);
          if (cell) {
            // Add visual indicator (but cell is still editable)
            cell.classList.add('being-edited');
            
            // Add indicator badge
            const indicator = document.createElement('div');
            indicator.className = 'editing-indicator';
            indicator.style.backgroundColor = user.color;
            indicator.style.opacity = '0.7'; // Semi-transparent to show it's not a lock
            indicator.textContent = `${user.name} is also editing`;
            indicator.title = 'Another user is editing - your changes will sync automatically';
            cell.style.position = 'relative';
            cell.appendChild(indicator);
          }
        }
      });
    }

    /**
     * Update connection status badge
     */
    updateConnectionStatus(status) {
      const badge = document.getElementById(this.connectionStatusId);
      if (!badge) return;

      let className = 'badge ';
      let icon = '';
      let text = '';

      switch (status) {
        case 'connected':
          className += 'bg-success';
          icon = 'wifi';
          text = 'Connected';
          break;
        case 'connecting':
          className += 'bg-warning';
          icon = 'arrow-repeat';
          text = 'Connecting...';
          break;
        case 'disconnected':
          className += 'bg-danger';
          icon = 'wifi-off';
          text = 'Disconnected';
          break;
        default:
          className += 'bg-secondary';
          icon = 'question-circle';
          text = 'Unknown';
      }

      badge.className = className;
      badge.innerHTML = `<i class="bi bi-${icon}"></i> ${text}`;
    }

    /**
     * Load initial schedule data from Yjs
     */
    loadScheduleFromYjs() {
      console.log('📥 Loading schedule from Yjs...');
      const data = {};
      
      this.ySchedule.forEach((value, key) => {
        data[key] = value;
      });

      console.log('📊 Loaded data:', data);
      return data;
    }

    /**
     * Render course in cell
     */

    /**
     * Render course in cell
     * FIXED: Updates input value without destroying it
     * NO BLUE BACKGROUND
     */
    renderCourseInCell(cell, courseData) {
      // Check if cell is an input (edit mode)
      if (cell && cell.tagName === 'INPUT') {
        // Update the input value without destroying it
        cell.value = courseData.course || '';
        // No background color
      } 
      // If cell is a TD containing an input
      else if (cell && cell.tagName === 'TD') {
        const input = cell.querySelector('input');
        if (input) {
          // Update the input value
          input.value = courseData.course || '';
          // No background color
        } else {
          // No input (view mode) - render as HTML
          if (courseData.course) {
            cell.innerHTML = `
              <div class="course-name fw-bold" style="color: #1976d2;">${courseData.course}</div>
              ${courseData.location ? `<small class="text-muted">${courseData.location}</small>` : ''}
            `;
            cell.style.backgroundColor = '#e3f2fd';
          } else {
            cell.textContent = '';
            cell.style.backgroundColor = '';
          }
        }
      }
    }

    /**
     * Show update notification
     */
    showUpdateNotification(userName, cellId) {
      const notification = document.createElement('div');
      notification.className = 'collaboration-notification';
      notification.innerHTML = `
        <strong>${userName}</strong> updated cell ${cellId}
      `;
      document.body.appendChild(notification);

      setTimeout(() => notification.remove(), 3000);
    }

    /**
     * Show reconnecting message
     */
    showReconnectingMessage() {
      console.log('⚠️ Attempting to reconnect...');
    }

    /**
     * Show connection error
     */
    showConnectionError() {
      alert('⚠️ Could not connect to collaboration server. You can continue editing, but changes won\'t sync in real-time.');
    }

    /**
     * Get user initials
     */
    getInitials(name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }

    /**
     * Get all schedule data
     */
    getScheduleData() {
      return this.loadScheduleFromYjs();
    }

    /**
     * Check if cell is being edited by someone
     * ALWAYS RETURNS FALSE - No locking, everyone can edit
     */
    isCellBeingEdited(cellId) {
      return false; // No locking - always allow editing
    }

    /**
     * Get user editing a specific cell
     * Returns user info for display purposes only (not for locking)
     */
    getUserEditingCell(cellId) {
      if (!this.awareness) return null;
      
      const states = Array.from(this.awareness.getStates().values());
      const state = states.find(s => 
        s.activeCell === cellId && 
        s.user && 
        s.user.id !== this.currentUser.id
      );
      
      return state ? state.user : null;
    }

    /**
     * Disconnect and cleanup
     */
    disconnect() {
      if (this.provider) {
        console.log('🔌 Disconnecting from collaboration server...');
        
        // Clear awareness
        if (this.awareness) {
          this.awareness.setLocalState(null);
        }
        
        // Destroy provider
        this.provider.destroy();
        this.provider = null;
      }

      if (this.ydoc) {
        this.ydoc.destroy();
        this.ydoc = null;
      }

      this.ySchedule = null;
      this.awareness = null;
      this.isInitialized = false;
      this.activeCell = null;
      
      console.log('✅ Disconnected from collaboration');
    }
  }

  // Create singleton instance
  const collaborationManager = new CollaborationManager();

  // Export to window
  window.collaborationManager = collaborationManager;
  console.log('✅ CollaborationManager loaded (browser version - NO CELL LOCKING)');

})();