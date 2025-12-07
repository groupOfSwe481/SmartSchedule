// version-history.js
(function() {
  'use strict';

  // 📜 VERSION HISTORY PAGE LOGIC (version-history.html)
  // ========================================

  // Environment-aware API URL
  const isLocalhost = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';
  const API_BASE = window.API_URL || (isLocalhost ? 'http://localhost:4000/api' : '/api');
  
  let currentVersionLevel = null;
  let currentScheduleForVersion = null;
  let allVersionHistory = []; // Caches history for reconstruction
  
  document.addEventListener("DOMContentLoaded", () => {
    setupVersionHistoryPage();
  });
  
  // ========================================
  // Setup Version History Page
  // ========================================
  function setupVersionHistoryPage() {
    const levelButtons = document.querySelectorAll("#versionLevelButtons button");
    levelButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        levelButtons.forEach((b) => {
          b.classList.remove("active");
          b.classList.remove("list-group-item-primary");
        });
        btn.classList.add("active");
        btn.classList.add("list-group-item-primary");
  
        const level = btn.dataset.level;
        currentVersionLevel = level;
        fetchSchedulesForLevel(level);
      });
    });
  
    const backBtn = document.getElementById("backToSchedules");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        showSchedulesList();
      });
    }
  
    const breadcrumbLevel = document.getElementById("breadcrumbLevel");
    if (breadcrumbLevel) {
      breadcrumbLevel.addEventListener("click", (e) => {
        e.preventDefault();
        showSchedulesList();
      });
    }
  }
  
  // ========================================
  // Fetch Schedules for Selected Level
  // ========================================
  async function fetchSchedulesForLevel(level) {
    const container = document.getElementById("versionSchedulesList");
    const schedulesContainer = document.getElementById(
      "versionSchedulesContainer"
    );
    const loadingState = document.getElementById("versionLoadingState");
    const timelineContainer = document.getElementById("versionTimelineContainer");
    const selectedLevelDisplay = document.getElementById("selectedLevelDisplay");
  
    loadingState.style.display = "none";
    timelineContainer.style.display = "none";
    schedulesContainer.style.display = "block";
  
    selectedLevelDisplay.textContent = level;
    container.innerHTML =
      '<div class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div> Loading schedules...</div>';
  
    try {
      // This route fetches the latest DRAFTS (status: 'Draft')
      const res = await fetch(
        `${API_BASE}/schedule/level/${level}`
      );
      const data = await res.json();
  
      if (!res.ok) {
        if (
          res.status === 404 ||
          (data.schedules && data.schedules.length === 0)
        ) {
          container.innerHTML = `
            <div class="list-group-item text-center py-4">
              <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
              <p class="text-muted mt-3 mb-0">No draft schedules found for Level ${level}</p>
            </div>
          `;
          return;
        }
        throw new Error(data.error || "Failed to load schedules.");
      }
  
      if (!data.schedules || data.schedules.length === 0) {
        container.innerHTML = `
          <div class="list-group-item text-center py-4">
            <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
            <p class="text-muted mt-3 mb-0">No draft schedules found for Level ${level}</p>
          </div>
        `;
        return;
      }
  
      container.innerHTML = data.schedules
        .map(
          (schedule) => `
        <button type="button" class="list-group-item list-group-item-action py-3" 
          onclick="fetchVersionHistory('${schedule._id}', '${
            schedule.section
          }', ${schedule.level})">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-1 fw-bold">
                <i class="bi bi-journal-text text-primary me-2"></i>
                ${schedule.section}
              </h6>
              <small class="text-muted">
                <i class="bi bi-pencil-square me-1"></i>Last Edit (History v${
                  schedule.history_version || 1
                })
                ${
                  schedule.publishedAt
                    ? `<i class="bi bi-check-circle text-success ms-3"></i> Published (v${schedule.version})`
                    : `<i class="bi bi-pencil text-warning ms-3"></i> Draft`
                }
              </small>
            </div>
            <i class="bi bi-chevron-right text-muted"></i>
          </div>
        </button>
      `
        )
        .join("");
    } catch (err) {
      console.error("❌ Failed to fetch schedules:", err);
      container.innerHTML = `
        <div class="list-group-item">
          <div class="alert alert-danger mb-0">
            <i class="bi bi-x-circle me-2"></i>
            ${err.message}
          </div>
        </div>
      `;
    }
  }
  
  // ========================================
  // Fetch Version History for a Schedule
  // ========================================
  async function fetchVersionHistory(scheduleId, section, level) {
    currentScheduleForVersion = { id: scheduleId, section, level };
  
    const timelineContainer = document.getElementById("versionTimelineContainer");
    const schedulesContainer = document.getElementById(
      "versionSchedulesContainer"
    );
    const timeline = document.getElementById("versionTimeline");
    const emptyState = document.getElementById("versionEmptyState");
  
    const timelineTitle = document.getElementById("timelineScheduleTitle");
    const timelineSubtitle = document.getElementById("timelineScheduleSubtitle");
    const breadcrumbLevel = document.getElementById("breadcrumbLevel");
    const breadcrumbSchedule = document.getElementById("breadcrumbSchedule");
  
    breadcrumbLevel.textContent = `Level ${level}`;
    breadcrumbSchedule.textContent = section;
  
    schedulesContainer.style.display = "none";
    timelineContainer.style.display = "block";
    emptyState.style.display = "none";
  
    timelineTitle.textContent = section;
    timelineSubtitle.textContent = `Level ${level} • Version History`;
  
    timeline.innerHTML =
      '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-3">Loading version history...</p></div>';
  
    try {
      // Fetch version history
      const historyRes = await fetch(
        `${API_BASE}/schedule/history/${scheduleId}`
      );
      const historyData = await historyRes.json();
  
      if (!historyRes.ok)
        throw new Error(historyData.error || "Failed to load version history.");
  
      // Fetch current schedule (for reconstruction)
      // We fetch from the 'draft' route, as that's what we are editing
      const scheduleRes = await fetch(
        `${API_BASE}/schedule/level/${level}`
      );
      const scheduleData = await scheduleRes.json();
      const currentSchedule = scheduleData.schedules.find(
        (s) => s._id === scheduleId
      );
  
      if (!historyData.history || historyData.history.length === 0) {
        timelineContainer.style.display = "none";
        emptyState.style.display = "block";
        return;
      }
  
      // Store for reconstruction
      allVersionHistory = historyData.history;
      const currentHistoryVersion =
        currentSchedule?.history_version ||
        historyData.history[0]?.history_version ||
        1;
  
      // Build timeline
      timeline.innerHTML = historyData.history
        .map((version, index) => {
          // FIX: Compare history_version
          const isLatest = version.history_version === currentHistoryVersion;
          const date = new Date(version.createdAt || version.timestamp);
          const formattedDate = date.toLocaleString();
          const relativeTime = getRelativeTime(date);
  
          return `
          <div class="card mb-3 shadow-sm ${
            isLatest ? "border-primary border-3" : "border-2"
          } position-relative">
            ${
              isLatest
                ? '<div class="position-absolute top-0 end-0 m-2"><span class="badge bg-primary"><i class="bi bi-star-fill me-1"></i>Current Draft</span></div>'
                : ""
            }
            
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div class="d-flex align-items-center gap-2">
                  <span class="badge ${
                    isLatest ? "bg-primary" : "bg-secondary"
                  } fs-6 px-3 py-2">
                    <i class="bi bi-tag me-1"></i>History v${
                      version.history_version
                    }
                  </span>
                </div>
                <div class="text-end">
                  <small class="text-muted d-block">
                    <i class="bi bi-clock me-1"></i>${relativeTime}
                  </small>
                  <small class="text-muted">${formattedDate}</small>
                </div>
              </div>
  
              <div class="row mb-3">
                <div class="col-md-6">
                  <small class="text-muted d-block mb-1">Modified by</small>
                  <div class="d-flex align-items-center">
                    <i class="bi bi-person-circle text-primary me-2 fs-5"></i>
                    <strong>${version.user_id || "Unknown User"}</strong>
                  </div>
                </div>
                ${
                  version.summary
                    ? `
                  <div class="col-md-6">
                    <small class="text-muted d-block mb-1">Summary</small>
                    <div class="d-flex align-items-center">
                      <i class="bi bi-chat-left-text text-info me-2"></i>
                      <span>${version.summary}</span>
                    </div>
                  </div>
                  `
                    : ""
                }
              </div>
  
              <div class="bg-light rounded-3 p-3 mb-3">
                <h6 class="fw-bold mb-3">
                  <i class="bi bi-list-check me-2 text-primary"></i>Changes Made
                </h6>
                <div class="changes-summary">
                  ${formatDelta(version.delta)}
                </div>
              </div>
  
              <div class="d-flex gap-2 flex-wrap">
                <button class="btn btn-sm btn-primary" 
                  onclick='viewFullSchedule(${JSON.stringify(
                    currentSchedule?.grid || {}
                  )}, ${version.history_version}, "${section}", ${level})'>
                  <i class="bi bi-calendar-week me-1"></i>View Full Schedule
                </button>
                
                ${
                  !isLatest
                    ? `
                <button class="btn btn-sm btn-success restore-version-btn" 
                  onclick="restoreVersion('${scheduleId}', ${version.history_version}, '${section}', ${level})">
                  <i class="bi bi-arrow-counterclockwise me-1"></i>Restore This Version
                </button>
                <button class="btn btn-sm btn-outline-secondary" 
                  onclick="compareVersions(${version.history_version}, ${currentHistoryVersion})">
                  <i class="bi bi-arrow-left-right me-1"></i>Compare with Current
                </button>
                `
                    : `
                <button class="btn btn-sm btn-outline-secondary" disabled>
                  <i class="bi bi-check-circle me-1"></i>Already Current
                </button>
                `
                }
              </div>
            </div>
          </div>
        `;
        })
        .join("");
    } catch (err) {
      console.error("❌ Failed to fetch version history:", err);
      timeline.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-x-circle me-2"></i>
          ${err.message}
        </div>
      `;
    }
  }
  
  // ========================================
  // 🆕 RESTORE VERSION - Make Past Version Current
  // ========================================
  async function restoreVersion(
    scheduleId,
    targetHistoryVersion,
    section,
    level
  ) {
    // Confirmation dialog
    const confirmed = confirm(
      `⚠️ Restore History v${targetHistoryVersion}?\n\n` +
        `This will:\n` +
        `• Make History Version ${targetHistoryVersion} the current draft\n` +
        `• Create a new history version entry (e.g., v${
          allVersionHistory[0].history_version + 1
        })\n` +
        `• This will NOT change your "Published" schedule.\n\n` +
        `Are you sure you want to continue?`
    );
  
    if (!confirmed) return;
  
    // Find the restore button and show loading state
    const restoreBtn = event.target.closest(".restore-version-btn");
    const originalBtnHtml = restoreBtn.innerHTML;
    restoreBtn.disabled = true;
    restoreBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm me-2"></span>Restoring...';
  
    try {
      // FIX: Call the correct route with historyVersion
      const res = await fetch(
        `${API_BASE}/schedule/restore/${scheduleId}/${targetHistoryVersion}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
  
      const data = await res.json();
  
      if (!res.ok) {
        throw new Error(data.error || "Failed to restore version");
      }
  
      // Success!
      alert(
        `✅ ${data.message}\n\n` +
          `History v${targetHistoryVersion} is now the current draft.\n` +
          `New history version: v${data.newHistoryVersion}\n\n` +
          `The schedule list has been updated.`
      );
  
      // Refresh the timeline to show the new version
      await fetchVersionHistory(scheduleId, section, level);
    } catch (err) {
      console.error("❌ Restore error:", err);
      alert(`❌ Error restoring version: ${err.message}`);
  
      // Restore button state
      restoreBtn.disabled = false;
      restoreBtn.innerHTML = originalBtnHtml;
    }
  }
  
  // ========================================
  // VIEW FULL SCHEDULE AT SPECIFIC VERSION
  // ========================================
  function viewFullSchedule(currentGrid, targetHistoryVersion, section, level) {
    const reconstructedGrid = reconstructScheduleAtVersion(
      currentGrid,
      targetHistoryVersion // Pass history_version
    );
    showScheduleModal(reconstructedGrid, targetHistoryVersion, section, level);
  }
  
  // ========================================
  // RECONSTRUCT SCHEDULE AT VERSION
  // ========================================
  function reconstructScheduleAtVersion(currentGrid, targetHistoryVersion) {
    let grid = JSON.parse(JSON.stringify(currentGrid));
  
    // FIX: Filter by history_version
    const versionsToRevert = allVersionHistory
      .filter((v) => v.history_version > targetHistoryVersion)
      .sort((a, b) => b.history_version - a.history_version); // Sort descending
  
    versionsToRevert.forEach((version) => {
      if (version.delta) {
        grid = applyDeltaReverse(grid, version.delta);
      }
    });
  
    return grid;
  }
  
  // ========================================
  // APPLY DELTA IN REVERSE
  // ========================================
  function applyDeltaReverse(grid, delta) {
    try {
      const deltaObj = typeof delta === "string" ? JSON.parse(delta) : delta;
      // jsondiffpatch stores diffs as [old, new] or [value] (for deletion)
      // To reverse, we always take the value at index 0
      const gridChanges = deltaObj.grid || deltaObj;
  
      for (const day in gridChanges) {
        if (!grid[day]) grid[day] = {};
  
        for (const time in gridChanges[day]) {
          if (Array.isArray(gridChanges[day][time])) {
            const [oldValue] = gridChanges[day][time];
            grid[day][time] = oldValue;
          }
        }
      }
    } catch (err) {
      console.error("Error applying reverse delta:", err);
    }
  
    return grid;
  }
  
  // ========================================
  // SHOW SCHEDULE IN MODAL
  // ========================================
  function showScheduleModal(grid, version, section, level) {
    let modal = document.getElementById("scheduleViewModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "modal fade";
      modal.id = "scheduleViewModal";
      modal.innerHTML = `
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <div>
                <h5 class="modal-title fw-bold mb-1" id="scheduleModalTitle"></h5>
                <p class="mb-0 opacity-90" style="font-size: 0.9rem;" id="scheduleModalSubtitle"></p>
              </div>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4" id="scheduleModalBody"></div>
            <div class="modal-footer bg-light">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="bi bi-x-circle me-1"></i>Close
              </button>
              <button type="button" class="btn btn-primary" onclick="window.print()">
                <i class="bi bi-printer me-1"></i>Print
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
  
    document.getElementById(
      "scheduleModalTitle"
    ).textContent = `${section} - History v${version}`; // Use History Version
    document.getElementById(
      "scheduleModalSubtitle"
    ).textContent = `Level ${level} • Historical Schedule View`;
  
    const tableHtml = generateScheduleTable(grid);
    document.getElementById("scheduleModalBody").innerHTML = tableHtml;
  
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  }
  
  // ========================================
  // GENERATE SCHEDULE TABLE HTML
  // ========================================
  function generateScheduleTable(grid) {
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
  
    let html = `
      <div class="table-responsive">
        <table class="table table-bordered text-center align-middle">
          <thead class="table-light">
            <tr>
              <th style="width: 120px;">Day / Time</th>
              ${slots
                .map((slot) => `<th style="width: 12.5%;">${slot}</th>`)
                .join("")}
            </tr>
          </thead>
          <tbody>
    `;
  
    for (const day of days) {
      html += `<tr><th style="text-align: left; padding-left: 1rem;">${day}</th>`;
  
      for (const time of slots) {
        const course = grid[day]?.[time] || "";
        const courseLower = course.toLowerCase().trim();
  
        const isBlank =
          courseLower === "" ||
          courseLower === "empty" ||
          course.startsWith("-") ||
          course.startsWith(".");
  
        if (isBlank) {
          html += `<td>&nbsp;</td>`;
        } else if (courseLower === "break") {
          html += `<td class="bg-light fw-bold">BREAK</td>`;
        } else if (course.includes("CLASH") || course.includes("CONFLICT")) {
          const parts = course.split(/\s*-\s*(CLASH|CONFLICT)/i);
          const courses = parts[0];
          const conflictType = parts[1] || "CLASH";
          const courseList = courses.split("/").map((c) => c.trim());
  
          let cellContent = courseList
            .map((c) => `<div class="course-item">${c}</div>`)
            .join("");
          cellContent += `<div class="conflict-badge">⚠️ ${conflictType}</div>`;
  
          html += `<td class="conflict-cell">${cellContent}</td>`;
        } else {
          html += `<td><div class="course-item">${course}</div></td>`;
        }
      }
  
      html += `</tr>`;
    }
  
    html += `</tbody></table></div>`;
    return html;
  }
  
  // ========================================
  // Format Delta (Changes) for Display
  // ========================================
  function formatDelta(delta) {
    if (!delta) {
      return '<small class="text-muted"><i class="bi bi-info-circle me-1"></i>No detailed changes recorded</small>';
    }
  
    let changesHtml = '<div class="list-group list-group-flush">';
    let changeCount = 0;
  
    try {
      const deltaObj = typeof delta === "string" ? JSON.parse(delta) : delta;
      const gridChanges = deltaObj.grid || deltaObj;
  
      if (!gridChanges) {
        return '<small class="text-muted"><i class="bi bi-info-circle me-1"></i>No grid changes recorded for this version. (e.g., Publish event)</small>';
      }
  
      for (const day in gridChanges) {
        const dayChanges = gridChanges[day];
        if (dayChanges && typeof dayChanges === "object") {
          for (const time in dayChanges) {
            if (Array.isArray(dayChanges[time])) {
              const [oldValue, newValue] = dayChanges[time];
              changesHtml += `
                <div class="list-group-item border-0 px-0 py-2">
                  <div class="d-flex align-items-start">
                    <i class="bi bi-arrow-right-circle text-primary me-2 mt-1"></i>
                    <div class="flex-grow-1">
                      <strong class="d-block mb-1">${day} at ${time}</strong>
                      <div class="ms-3">
                        <div class="text-danger small">
                          <i class="bi bi-dash-circle me-1"></i>${
                            oldValue || "(empty)"
                          }
                        </div>
                        <div class="text-success small">
                          <i class="bi bi-plus-circle me-1"></i>${
                            newValue || "(empty)"
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
              changeCount++;
            }
          }
        }
      }
  
      if (
        changeCount === 0 &&
        Object.keys(gridChanges).length > 0 &&
        !Array.isArray(gridChanges)
      ) {
        changesHtml +=
          '<div class="list-group-item border-0 px-0"><small class="text-muted"><i class="bi bi-pencil me-1"></i>Schedule was created (first version).</small></div>';
      } else if (changeCount === 0) {
        changesHtml +=
          '<div class="list-group-item border-0 px-0"><small class="text-muted"><i class="bi bi-info-circle me-1"></i>No detailed grid changes recorded.</small></div>';
      } else {
        changesHtml =
          `<div class="alert alert-info alert-sm mb-2"><i class="bi bi-info-circle me-1"></i>${changeCount} change${
            changeCount > 1 ? "s" : ""
          } detected</div>` + changesHtml;
      }
    } catch (err) {
      console.error("Error parsing delta:", err);
      changesHtml +=
        '<div class="list-group-item border-0 px-0"><small class="text-muted">Changes recorded (details unavailable)</small></div>';
    }
  
    changesHtml += "</div>";
    return changesHtml;
  }
  
  // ========================================
  // Get Relative Time
  // ========================================
  function getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
  
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  }
  
  // ========================================
  // Compare Versions
  // ========================================
  function compareVersions(oldVersion, newVersion) {
    alert(
      `Comparing Version ${oldVersion} with Version ${newVersion}\n\nThis feature will show a side-by-side comparison.`
    );
  }
  
  // ========================================
  // Show Schedules List
  // ========================================
  function showSchedulesList() {
    document.getElementById("versionTimelineContainer").style.display = "none";
    document.getElementById("versionSchedulesContainer").style.display = "block";
    document.getElementById("versionEmptyState").style.display = "none";
  }

  // ========================================
  // Expose functions to global scope for onclick handlers
  // ========================================
  window.fetchVersionHistory = fetchVersionHistory;
  window.viewFullSchedule = viewFullSchedule;
  window.restoreVersion = restoreVersion;
  window.compareVersions = compareVersions;
})();
