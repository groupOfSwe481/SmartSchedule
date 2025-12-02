// main.js (WITH REAL-TIME COLLABORATION)
(function() {
  'use strict';

  // 🧩 SMART SCHEDULE FRONTEND LOGIC (v2.0 + COLLABORATION)
  // ========================================
  
  // Environment-aware API URL
  const API_BASE = window.API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '')
    ? 'http://localhost:4000/api'
    : '/api';
  
  let selectedLevel = 3;
  let isEditMode = false;
  let currentEditingScheduleId = null;
  
  document.addEventListener("DOMContentLoaded", () => {
    setupLevelButtonListeners();
    setupGenerateButtonListener();
    // Only fetch schedule if schedule container exists (not on all pages)
    if (document.getElementById("schedule-container")) {
      fetchLatestSchedule(selectedLevel);
    }
  });
  
  function setupLevelButtonListeners() {
    const levelButtons = document.querySelectorAll(".level-btn-group .btn");
    if (!levelButtons.length) return console.warn("⚠️ No level buttons found.");
  
    levelButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const clicked = e.currentTarget;
  
        levelButtons.forEach((b) => {
          b.classList.remove("btn-dark");
          b.classList.remove("active");
          b.classList.add("btn-outline-dark");
        });
  
        clicked.classList.remove("btn-outline-dark");
        clicked.classList.add("btn-dark");
        clicked.classList.add("active");
  
        selectedLevel = parseInt(clicked.dataset.level);
        fetchLatestSchedule(selectedLevel);
      });
    });
  }
  
  function setupGenerateButtonListener() {
    const generateBtn = document.getElementById("generateBtn");
    if (!generateBtn) return;
    generateBtn.addEventListener("click", handleGenerateSchedule);
  }
  
  // ========================================
  // 📡 FETCH LATEST SCHEDULE (Updated)
  // ========================================
  async function fetchLatestSchedule(level) {
    const container = document.getElementById("schedule-container");
    if (!container) return;
    container.innerHTML = `<p class="text-center text-secondary mt-5">Fetching latest schedule for Level ${level}...</p>`;
  
    try {
      const res = await fetch(`${API_BASE}/schedule/level/${level}`);
      const data = await res.json();
  
      if (!res.ok) throw new Error(data.error || "Failed to load schedule.");
  
      if (!data.schedules?.length) {
        displayEmptyState(level, `No schedules are available for Level ${level}.`);
        return;
      }
  
      displaySchedules(data.schedules);
    } catch (err) {
      console.error("❌ Failed to fetch schedule:", err);
      displayEmptyState(level, `Error loading schedule: ${err.message}`);
    }
  }
  
  // -------------------------------
  // 🧱 Display Schedules as Cards
  // -------------------------------
  function displaySchedules(schedules) {
    const container = document.getElementById("schedule-container");
    if (!container) return;
    container.innerHTML = "";
  
    schedules.forEach((schedule) => {
      const card = document.createElement("div");
      card.className = "card shadow-sm border-0 rounded-3 p-3 mb-4";
      card.id = `schedule-card-${schedule._id}`;
  
      card.innerHTML = `
        <!-- Collaboration Status (Hidden by default) -->
        <div id="collab-status-${schedule._id}" class="collaboration-section" style="display: none;">
          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <i class="bi bi-people-fill text-primary"></i>
                <span class="fw-semibold">Real-time Collaboration</span>
              </div>
              <div id="connection-status-${schedule._id}"></div>
            </div>
            <div id="active-users-${schedule._id}"></div>
          </div>
          <hr>
        </div>

        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="fw-semibold mb-0">${schedule.section} - Level ${schedule.level}</h5>
          <div>
            <button class="btn btn-info btn-sm me-2 edit-btn"
              data-id="${schedule._id}"
              data-section="${schedule.section}"
              data-level="${schedule.level}">
              <i class="bi bi-pencil-square me-1"></i>Edit
            </button>
            <button class="btn btn-success btn-sm publish-btn"
              data-id="${schedule._id}"
              data-section="${schedule.section}"
              data-level="${schedule.level}">
              <i class="bi bi-upload me-1"></i>Publish
            </button>
            <button class="btn btn-warning btn-sm regenerate-btn"
              data-id="${schedule._id}"
              data-section="${schedule.section}"
              data-level="${schedule.level}">
              <i class="bi bi-arrow-repeat me-1"></i>Regenerate
            </button>
            <button class="btn btn-primary btn-sm ms-2 impact-btn"
              data-id="${schedule._id}"
              data-section="${schedule.section}">
              <i class="bi bi-people-fill me-1"></i>Check Impact
            </button>
          </div>
        </div>
        <hr class="mt-0">
      `;
  
      const table = generateTable(schedule.grid, schedule._id);
      card.appendChild(table);
      container.appendChild(card);
    });
  
    attachPublishHandlers();
    attachEditHandlers();
    attachRegenerateHandlers();
    attachImpactCheckHandlers();
  }
  
  // -------------------------------
  // 📅 Generate Table for Schedule Grid (WITH COLLABORATION SUPPORT)
  // -------------------------------
  function generateTable(grid, scheduleId) {
    const table = document.createElement("table");
    table.className = "table table-bordered text-center align-middle";
    table.id = `schedule-table-${scheduleId}`;
  
    const thead = document.createElement("thead");
    thead.className = "table-light";
  
    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
      <th>Day / Time</th>
      <th>8:00-8:50</th>
      <th>9:00-9:50</th>
      <th>10:00-10:50</th>
      <th>11:00-11:50</th>
      <th>12:00-12:50</th>
      <th>1:00-1:50</th>
      <th>2:00-2:50</th>
    `;
    thead.appendChild(headerRow);
  
    const tbody = document.createElement("tbody");
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
    const slots = [
      "8:00-8:50",
      "9:00-9:50",
      "10:00-10:50",
      "11:00-11:50",
      "12:00-12:50",
      "1:00-1:50",
      "2:00-2:50",
    ];
  
    for (const day of days) {
      const row = document.createElement("tr");
      row.innerHTML = `<th>${day}</th>`;
      for (const time of slots) {
        const course = grid[day]?.[time] || "";
        // ✅ ADD data-cell-id for collaboration
        const cellId = `${day}-${time}-L${selectedLevel}`.replace(/:/g, '').replace(/\s+/g, '');
        
        const cell = document.createElement("td");
        cell.setAttribute("data-cell-id", cellId);
        cell.setAttribute("data-day", day);
        cell.setAttribute("data-time", time);
        cell.className = "schedule-cell";
        
        if (course.toLowerCase() === "break") {
          cell.className += " bg-light-subtle fw-bold";
        }
        cell.textContent = course;
        
        row.appendChild(cell);
      }
      tbody.appendChild(row);
    }
  
    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
  }
  
  // -------------------------------
  // 🚀 Attach Publish Handlers
  // -------------------------------
  function attachPublishHandlers() {
    document.querySelectorAll(".publish-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const scheduleId = btn.dataset.id;
        const section = btn.dataset.section || "Section ?";
        const level = btn.dataset.level || "?";
  
        if (!scheduleId || scheduleId === "null") {
          alert("❌ Invalid schedule ID.");
          console.warn("Invalid Schedule ID:", scheduleId);
          return;
        }
  
        if (!confirm(`Are you sure you want to publish schedule for ${section} - Level ${level}?`)) {
          return;
        }
  
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Publishing...';
  
        try {
          const res = await fetch(`${API_BASE}/schedule/publish/${scheduleId}`, {
            method: "POST",
          });
  
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to publish schedule.");
  
          btn.classList.remove("btn-success");
          btn.classList.add("btn-secondary");
          btn.innerHTML = `<i class="bi bi-check-circle me-1"></i>Published v${data.version}`;
          btn.disabled = true;
  
          alert(`✅ ${data.message}`);
        } catch (err) {
          console.error("❌ Publish error:", err);
          alert(`Error publishing: ${err.message}`);
          btn.innerHTML = '<i class="bi bi-upload me-1"></i>Publish';
        } finally {
          btn.disabled = false;
        }
      });
    });
  }
  
  // ========================================
  // ✏️ EDIT + SAVE HANDLERS (WITH COLLABORATION)
  // ========================================
  function attachEditHandlers() {
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const scheduleId = btn.dataset.id;
        const section = btn.dataset.section;
        const level = btn.dataset.level;
        const card = btn.closest(".card");
        const table = card.querySelector("table");
        const collabSection = document.getElementById(`collab-status-${scheduleId}`);
  
        // ✅ INITIALIZE COLLABORATION
        if (window.collaborationManager) {
          try {
            const user = JSON.parse(sessionStorage.getItem('user'));
            if (user) {
              console.log('🔗 Initializing collaboration for schedule:', scheduleId);
              
              // Show collaboration section
              if (collabSection) {
                collabSection.style.display = 'block';
              }
              
              // Initialize collaboration with custom containers
              await window.collaborationManager.init(scheduleId, user);
              
              // Override the default container IDs
              window.collaborationManager.activeUsersContainerId = `active-users-${scheduleId}`;
              window.collaborationManager.connectionStatusId = `connection-status-${scheduleId}`;
              
              // Update UI elements manually
              updateCollaborationUI(scheduleId);
              
              isEditMode = true;
              currentEditingScheduleId = scheduleId;
            }
          } catch (error) {
            console.error('❌ Failed to initialize collaboration:', error);
            alert('⚠️ Real-time collaboration unavailable. You can still edit, but changes won\'t sync live.');
          }
        } else {
          console.warn('⚠️ Collaboration manager not loaded');
        }
  
        // Disable other edit buttons
        document.querySelectorAll(".edit-btn").forEach((b) => (b.disabled = true));
  
        // Create Cancel and Save buttons
        const cancelBtn = document.createElement("button");
        cancelBtn.className = "btn btn-secondary btn-sm ms-2";
        cancelBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancel';
        
        const saveBtn = document.createElement("button");
        saveBtn.className = "btn btn-success btn-sm ms-2";
        saveBtn.innerHTML = '<i class="bi bi-save me-1"></i>Save';
        
        btn.after(saveBtn);
        btn.after(cancelBtn);
  
        // Convert cells to editable inputs
        table.querySelectorAll("tbody tr").forEach((row) => {
          row.querySelectorAll("td").forEach((cell) => {
            const val = cell.innerText.trim();
            const cellId = cell.getAttribute('data-cell-id');
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control form-control-sm text-center';
            input.value = val;
            input.setAttribute('data-cell-id', cellId);
            
            // ✅ COLLABORATION: Track when user starts editing a cell
            input.addEventListener('focus', function() {
              if (window.collaborationManager && cellId) {
                window.collaborationManager.setActiveCell(cellId);
              }
            });
            
            // ✅ COLLABORATION: Update cell value in real-time
            input.addEventListener('input', function() {
              if (window.collaborationManager && cellId) {
                const courseData = {
                  course: this.value.trim(),
                  day: cell.getAttribute('data-day'),
                  time: cell.getAttribute('data-time')
                };
                window.collaborationManager.updateCell(cellId, courseData);
              }
            });
            
            // ✅ COLLABORATION: Clear active cell when done
            input.addEventListener('blur', function() {
              if (window.collaborationManager) {
                window.collaborationManager.clearActiveCell();
              }
            });
            
            cell.innerHTML = '';
            cell.appendChild(input);
          });
        });
  
        btn.classList.add("btn-secondary");
        btn.innerHTML = '<i class="bi bi-pencil me-1"></i>Editing...';
  
        // Cancel button handler
        cancelBtn.addEventListener("click", () => {
          // Disconnect collaboration
          if (window.collaborationManager) {
            window.collaborationManager.disconnect();
          }
          
          // Hide collaboration section
          if (collabSection) {
            collabSection.style.display = 'none';
          }
          
          isEditMode = false;
          currentEditingScheduleId = null;
          
          // Refresh the schedule
          fetchLatestSchedule(selectedLevel);
        });
  
        // Save button handler
        saveBtn.addEventListener("click", async () => {
          const updatedGrid = {};
          const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
          const times = [
            "8:00-8:50",
            "9:00-9:50",
            "10:00-10:50",
            "11:00-11:50",
            "12:00-12:50",
            "1:00-1:50",
            "2:00-2:50",
          ];
  
          table.querySelectorAll("tbody tr").forEach((row, rIdx) => {
            const day = days[rIdx];
            updatedGrid[day] = {};
            const inputs = row.querySelectorAll("input");
            inputs.forEach((input, cIdx) => {
              const val = input.value.trim();
              if (val) updatedGrid[day][times[cIdx]] = val;
            });
          });
  
          console.log("🧱 Updated Grid:", updatedGrid);
  
          // Save to backend
          try {
            const res = await fetch(`${API_BASE}/update/${scheduleId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ grid: updatedGrid }),
            });
  
            const data = await res.json();
            if (!data.success) {
              throw new Error(data.error || "Failed to save schedule.");
            }
  
            alert("✅ Schedule saved successfully!");
            
            // Disconnect collaboration
            if (window.collaborationManager) {
              window.collaborationManager.disconnect();
            }
            
            // Hide collaboration section
            if (collabSection) {
              collabSection.style.display = 'none';
            }
            
            isEditMode = false;
            currentEditingScheduleId = null;
            
            fetchLatestSchedule(selectedLevel);
          } catch (err) {
            alert("❌ Error saving schedule: " + err.message);
            console.error("Save failed:", err);
          }
        });
      });
    });
  }
  
  // ========================================
  // ✨ UPDATE COLLABORATION UI
  // ========================================
  function updateCollaborationUI(scheduleId) {
    // This function will be called by collaboration manager's awareness changes
    // We need to update the UI in the specific containers for this schedule
    if (!window.collaborationManager || !window.collaborationManager.awareness) {
      return;
    }
    
    const users = Array.from(window.collaborationManager.awareness.getStates().entries())
      .filter(([clientId, state]) => state.user)
      .map(([clientId, state]) => ({
        clientId,
        ...state.user,
        activeCell: state.activeCell
      }));
    
    const currentUser = window.collaborationManager.currentUser;
    const otherUsers = users.filter(u => u.id !== currentUser.id);
    
    // Update active users container
    const activeUsersContainer = document.getElementById(`active-users-${scheduleId}`);
    if (activeUsersContainer) {
      if (otherUsers.length === 0) {
        activeUsersContainer.innerHTML = `
          <div class="alert alert-info alert-sm mb-0">
            <i class="bi bi-person"></i> You're the only one editing
          </div>
        `;
      } else {
        activeUsersContainer.innerHTML = `
          <div class="d-flex flex-wrap gap-2">
            ${otherUsers.map(user => `
              <div class="user-badge" style="background-color: ${user.color}20; border-left: 3px solid ${user.color};">
                <div class="user-avatar" style="background-color: ${user.color};">
                  ${window.collaborationManager.getInitials(user.name)}
                </div>
                <span class="small">${user.name}</span>
              </div>
            `).join('')}
          </div>
        `;
      }
    }
    
    // Update connection status
    const statusContainer = document.getElementById(`connection-status-${scheduleId}`);
    if (statusContainer && window.collaborationManager.provider) {
      const connected = window.collaborationManager.provider.wsconnected;
      statusContainer.innerHTML = `
        <span class="badge ${connected ? 'bg-success' : 'bg-danger'}">
          <i class="bi bi-${connected ? 'wifi' : 'wifi-off'}"></i>
          ${connected ? 'Connected' : 'Disconnected'}
        </span>
      `;
    }
  }
  
  // ========================================
  // 🔄 REGENERATE HANDLERS
  // ========================================
  function attachRegenerateHandlers() {
    document.querySelectorAll(".regenerate-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const level = btn.dataset.level;
        if (confirm(`Are you sure you want to regenerate all schedules for Level ${level}? This will delete all current drafts for this level.`)) {
          const mainGenerateBtn = document.getElementById("generateBtn");
          if (mainGenerateBtn) {
            mainGenerateBtn.click();
          } else {
            console.error("Could not find main generate button");
          }
        }
      });
    });
  }
  
  // ========================================
  // ✨ IMPACT CHECK WITH MODAL DISPLAY
  // ========================================
  function attachImpactCheckHandlers() {
    document.querySelectorAll(".impact-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const scheduleId = btn.dataset.id;
        const section = btn.dataset.section;
  
        if (!scheduleId) {
          return alert("Error: No schedule ID found on this button.");
        }
  
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Checking...';
  
        try {
          const res = await fetch(`${API_BASE}/check-impact`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draftScheduleId: scheduleId }),
          });
  
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Failed to check impact.");
          }
  
          displayImpactReport(data, section);
        } catch (err) {
          console.error("❌ Impact check error:", err);
          alert(`Error checking impact: ${err.message}`);
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-people-fill me-1"></i>Check Impact';
        }
      });
    });
  }
  
  // ========================================
  // 🎨 DISPLAY FUNCTIONS (Keep your existing ones)
  // ========================================
  function displayEmptyState(level, message) {
    const container = document.getElementById("schedule-container");
    if (!container) return;
    
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-calendar-x" style="font-size: 4rem; color: #6c757d;"></i>
        <h4 class="mt-3 text-muted">${message}</h4>
        <p class="text-muted">Generate a schedule to get started.</p>
      </div>
    `;
  }
  
  function displayImpactReport(data, section) {
    // Your existing impact report code here
    console.log("Impact report:", data);
  }
  
  // ========================================
  // 🧹 CLEANUP ON PAGE UNLOAD
  // ========================================
  window.addEventListener('beforeunload', () => {
    if (window.collaborationManager && isEditMode) {
      window.collaborationManager.disconnect();
    }
  });
  
  // Make functions available globally if needed
  window.scheduleUI = {
    fetchLatestSchedule,
    displaySchedules,
    updateCollaborationUI
  };
  
})();