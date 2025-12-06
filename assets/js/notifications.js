// notifications.js - FINAL FIX
(function() {
  'use strict';

    const API_BASE = window.API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '')
      ? 'http://localhost:4000/api'
      : '/api';
  
    let currentUser = null;
  
    // Wait for complete DOM load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      // DOM already loaded
      init();
    }
    
    function init() {
      console.log("[NOTIFICATIONS] Initializing...");
      
      // Wait for everything to be fully rendered
      setTimeout(() => {
        console.log("[NOTIFICATIONS] Starting setup");
        loadCurrentUser();
        setupNotificationButton();
        loadUnreadCount();
        
        // Refresh count every 30 seconds
        setInterval(loadUnreadCount, 30000);
      }, 250); // Increased delay
    }
  
    /**
     * Load current user from session storage
     */
    function loadCurrentUser() {
      const raw = sessionStorage.getItem("user");
      if (raw) {
        try {
          currentUser = JSON.parse(raw);
          console.log("[NOTIFICATIONS] Current user:", currentUser);
        } catch (e) {
          console.error("[NOTIFICATIONS] Error parsing user:", e);
        }
      }
    }
  
    /**
     * Setup notification bell button
     */
    function setupNotificationButton() {
      const modalEl = document.getElementById("notificationsModal");
      
      if (!modalEl) {
        console.error("[NOTIFICATIONS] ❌ Modal not found!");
        // Retry after a delay
        setTimeout(() => {
          console.log("[NOTIFICATIONS] Retrying modal setup...");
          setupNotificationButton();
        }, 500);
        return;
      }
      
      console.log("[NOTIFICATIONS] ✅ Modal found!");
      
      // When modal opens, load data
      modalEl.addEventListener('shown.bs.modal', async function () {
        console.log("[NOTIFICATIONS] Modal opened");
        
        // CRITICAL: Wait for tab content to render
        setTimeout(async () => {
          await loadNotificationsAndDeadlines();
          await markAllAsRead();
        }, 100);
      });
      
      modalEl.addEventListener('hidden.bs.modal', function () {
        console.log("[NOTIFICATIONS] Modal closed");
      });
    }
  
    /**
     * Load unread notification count
     */
    async function loadUnreadCount() {
      if (!currentUser) {
        console.log("[NOTIFICATIONS] No user logged in");
        return;
      }
  
      const userObjectId = currentUser._id || currentUser.id;
      if (!userObjectId) {
        console.log("[NOTIFICATIONS] No user ObjectId found");
        return;
      }
  
      try {
        const response = await fetch(`${API_BASE}/notifications/count/${userObjectId}`);
        const data = await response.json();
  
        if (data.success) {
          updateNotificationBadge(data.count);
        }
      } catch (error) {
        console.error("[NOTIFICATIONS] Error loading count:", error);
      }
    }
  
    /**
     * Update notification badge
     */
    function updateNotificationBadge(count) {
      const badge = document.querySelector(".notification-badge");
      
      if (badge) {
        if (count > 0) {
          badge.textContent = count;
          badge.style.display = "inline-block";
        } else {
          badge.style.display = "none";
        }
      }
    }
  
    /**
     * Load notifications and deadlines
     */
    async function loadNotificationsAndDeadlines() {
      console.log("[NOTIFICATIONS] Loading data...");
      
      // Try multiple times to find elements
      let retries = 0;
      const maxRetries = 5;
      
      while (retries < maxRetries) {
        const notifList = document.getElementById("notificationsList");
        const deadlinesList = document.getElementById("deadlinesList");
        
        if (notifList && deadlinesList) {
          console.log("[NOTIFICATIONS] ✅ Both lists found!");
          await fetchAndDisplayData(notifList, deadlinesList);
          return;
        }
        
        console.log(`[NOTIFICATIONS] ⏳ Retry ${retries + 1}/${maxRetries}...`);
        console.log("[NOTIFICATIONS] notifList:", notifList);
        console.log("[NOTIFICATIONS] deadlinesList:", deadlinesList);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      
      console.error("[NOTIFICATIONS] ❌ Failed to find lists after", maxRetries, "retries");
      console.log("[NOTIFICATIONS] All elements with IDs:", 
        Array.from(document.querySelectorAll('[id]')).map(el => el.id)
      );
    }
    
    /**
     * Fetch and display data
     */
    async function fetchAndDisplayData(notifList, deadlinesList) {
      // Show loading
      notifList.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm me-2"></div>Loading...</div>';
      deadlinesList.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm me-2"></div>Loading...</div>';
  
      try {
        const userRole = currentUser.role === "Scheduler" ? "Scheduling committee" : currentUser.role;
        const userObjectId = currentUser._id || currentUser.id;
        
        // Fetch notifications
        console.log("[NOTIFICATIONS] Fetching notifications for:", userObjectId);
        const notifResponse = await fetch(
          `${API_BASE}/notifications/user/${userObjectId}`,
          {
            headers: {
              'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
          }
        );
        
        if (!notifResponse.ok) {
          throw new Error("Failed to load notifications");
        }
        
        const notifData = await notifResponse.json();
        console.log("[NOTIFICATIONS] Notifications:", notifData);
        
        // Fetch deadlines
        console.log("[NOTIFICATIONS] Fetching deadlines for role:", userRole);
        const deadlinesResponse = await fetch(
          `${API_BASE}/deadlines/role/${encodeURIComponent(userRole)}`,
          {
            headers: {
              'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
          }
        );
        
        if (!deadlinesResponse.ok) {
          throw new Error("Failed to load deadlines");
        }
        
        const deadlinesData = await deadlinesResponse.json();
        console.log("[NOTIFICATIONS] Deadlines:", deadlinesData);
  
        // Display data
        const notifications = notifData.data || notifData.notifications || notifData;
        displayNotifications(Array.isArray(notifications) ? notifications : []);
        
        const deadlines = deadlinesData.data || deadlinesData.deadlines || deadlinesData;
        displayDeadlines(Array.isArray(deadlines) ? deadlines : []);
        
      } catch (error) {
        console.error("[NOTIFICATIONS] Error:", error);
        notifList.innerHTML = `<div class="text-danger text-center py-3">${error.message}</div>`;
        deadlinesList.innerHTML = `<div class="text-danger text-center py-3">${error.message}</div>`;
      }
    }
  
    /**
     * Display notifications
     */
    function displayNotifications(notifications) {
      const notifList = document.getElementById("notificationsList");
      if (!notifList) return;
      
      console.log("[NOTIFICATIONS] Displaying", notifications.length, "notifications");
      
      if (notifications.length === 0) {
        notifList.innerHTML = `
          <div class="text-center text-muted py-4">
            <i class="bi bi-inbox fs-3 d-block mb-2"></i>
            <p class="mb-0">No notifications</p>
          </div>
        `;
        return;
      }
  
      const countHeader = `
        <div class="p-3 bg-light border-bottom">
          <small class="text-muted">
            <strong>${notifications.length}</strong> notification${notifications.length !== 1 ? 's' : ''}
          </small>
        </div>
      `;
  
      notifList.innerHTML = countHeader + notifications
        .map((notif) => {
          const date = new Date(notif.createdAt);
          const timeAgo = getTimeAgo(date);
          
          return `
            <div class="notification-item ${notif.read ? '' : 'unread'} p-3 border-bottom">
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <h6 class="mb-1 fw-semibold">
                    ${!notif.read ? '<i class="bi bi-circle-fill text-primary me-2" style="font-size: 8px;"></i>' : ''}
                    ${notif.title}
                  </h6>
                  <p class="mb-1 text-muted small">${notif.message}</p>
                  <small class="text-muted">
                    <i class="bi bi-clock me-1"></i>${timeAgo}
                    ${notif.read ? ' <span class="text-success">✓ Read</span>' : ''}
                  </small>
                </div>
              </div>
            </div>
          `;
        })
        .join("");
    }
  
    /**
     * Display deadlines
     */
    function displayDeadlines(deadlines) {
      const deadlinesList = document.getElementById("deadlinesList");
      if (!deadlinesList) return;
      
      if (deadlines.length === 0) {
        deadlinesList.innerHTML = `
          <div class="text-center text-muted py-4">
            <i class="bi bi-calendar-check fs-3 d-block mb-2"></i>
            <p class="mb-0">No upcoming deadlines</p>
          </div>
        `;
        return;
      }
  
      deadlinesList.innerHTML = deadlines
        .map((deadline) => {
          const dateInfo = getDeadlineDate(deadline);
          const isUrgent = isDeadlineUrgent(deadline);
          
          return `
            <div class="deadline-item p-3 border-bottom ${isUrgent ? 'border-start border-danger border-3' : ''}">
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <h6 class="mb-2 fw-semibold">
                    ${isUrgent ? '<i class="bi bi-exclamation-triangle-fill text-danger me-2"></i>' : '<i class="bi bi-calendar-event me-2 text-primary"></i>'}
                    ${deadline.task}
                  </h6>
                  <div class="d-flex align-items-center gap-3 text-muted small">
                    <span>
                      <i class="bi bi-clock me-1"></i>${dateInfo}
                    </span>
                    ${deadline.type ? `<span class="badge bg-secondary">${deadline.type}</span>` : ''}
                  </div>
                </div>
              </div>
            </div>
          `;
        })
        .join("");
    }
  
    /**
     * Get deadline date information
     */
    function getDeadlineDate(deadline) {
      if (deadline.time_start && deadline.time_end) {
        const start = new Date(deadline.time_start).toLocaleDateString();
        const end = new Date(deadline.time_end).toLocaleDateString();
        return `${start} - ${end}`;
      } else if (deadline.time) {
        return new Date(deadline.time).toLocaleDateString();
      } else if (deadline.start_date && deadline.end_date) {
        const start = new Date(deadline.start_date).toLocaleDateString();
        const end = new Date(deadline.end_date).toLocaleDateString();
        return `${start} - ${end}`;
      }
      return "No date specified";
    }
  
    /**
     * Check if deadline is urgent (within 3 days)
     */
    function isDeadlineUrgent(deadline) {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      const deadlineDate = deadline.time || deadline.time_end || deadline.end_date;
      
      if (deadlineDate) {
        return new Date(deadlineDate) <= threeDaysFromNow;
      }
      
      return false;
    }
  
    /**
     * Mark all notifications as read
     */
    async function markAllAsRead() {
      if (!currentUser) return;
  
      const userObjectId = currentUser._id || currentUser.id;
      if (!userObjectId) return;
  
      try {
        await fetch(`${API_BASE}/notifications/mark-read`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userObjectId,
          }),
        });
  
        updateNotificationBadge(0);
      } catch (error) {
        console.error("[NOTIFICATIONS] Error marking as read:", error);
      }
    }
  
    /**
     * Get time ago string
     */
    function getTimeAgo(date) {
      const seconds = Math.floor((new Date() - date) / 1000);
      
      let interval = seconds / 31536000;
      if (interval > 1) return Math.floor(interval) + " years ago";
      
      interval = seconds / 2592000;
      if (interval > 1) return Math.floor(interval) + " months ago";
      
      interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + " days ago";
      
      interval = seconds / 3600;
      if (interval > 1) return Math.floor(interval) + " hours ago";
      
      interval = seconds / 60;
      if (interval > 1) return Math.floor(interval) + " minutes ago";
      
      return "Just now";
    }
  
    console.log("[NOTIFICATIONS] Script loaded and ready");
  })();
