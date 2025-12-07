// main.js
(function () {
  "use strict";

  // 🧩 SMART SCHEDULE FRONTEND LOGIC (v2.0)
  // ========================================

  // Environment-aware API URL
  const API_BASE =
    window.API_URL ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === ""
      ? "http://localhost:4000/api"
      : "/api";

  let selectedLevel = 3;

  document.addEventListener("DOMContentLoaded", () => {
    setupLevelButtonListeners();
    setupGenerateButtonListener();
    // Only fetch schedule if schedule container exists (not on all pages)
    if (document.getElementById("schedule-container")) {
      fetchLatestSchedule(selectedLevel);
    }
  });

  function setupLevelButtonListeners() {
    const levelButtons = document.querySelectorAll(".level-btn-group .btn"); // Changed selector for specificity
    if (!levelButtons.length) return console.warn("⚠️ No level buttons found.");

    levelButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const clicked = e.currentTarget; // Use currentTarget for safety // 1. Deactivate all buttons

        levelButtons.forEach((b) => {
          b.classList.remove("btn-dark");
          b.classList.remove("active"); // <-- FIX 1: Remove active class
          b.classList.add("btn-outline-dark");
        }); // 2. Activate only the clicked button

        clicked.classList.remove("btn-outline-dark");
        clicked.classList.add("btn-dark");
        clicked.classList.add("active"); // <-- FIX 2: Add active class // 3. Update level and fetch

        selectedLevel = parseInt(clicked.dataset.level); // Use data-level for robustness
        fetchLatestSchedule(selectedLevel);
      });
    });
  }

  // -------------------------------
  // ⚙️ Generate Schedule Button Logic
  // -------------------------------
  // -------------------------------
  // ⚙️ Generate Schedule Button Logic
  // -------------------------------
  function setupGenerateButtonListener() {
    const generateBtn = document.getElementById("generateBtn");
    if (!generateBtn) return; // Silently return if button doesn't exist // Call the new refactored function

    generateBtn.addEventListener("click", handleGenerateSchedule);
  }

  // -------------------------------
  // 📡 Fetch Latest Schedule by Level
  // -------------------------------
  // ========================================
  // 📡 FETCH LATEST SCHEDULE (Updated)
  // ========================================
  async function fetchLatestSchedule(level) {
    const container = document.getElementById("schedule-container");
    if (!container) return; // Exit if element doesn't exist
    container.innerHTML = `<p class="text-center text-secondary mt-5">Fetching latest schedule for Level ${level}...</p>`;

    try {
      const res = await fetch(`${API_BASE}/schedule/level/${level}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load schedule.");

      if (!data.schedules?.length) {
        // ✅ UPDATED: Call the new function
        displayEmptyState(
          level,
          `No schedules are available for Level ${level}.`
        );
        return;
      }

      displaySchedules(data.schedules);
    } catch (err) {
      console.error("❌ Failed to fetch schedule:", err);
      // ✅ UPDATED: Call the new function on error
      displayEmptyState(level, `Error loading schedule: ${err.message}`);
    }
  }

  // -------------------------------
  // 🧱 Display Schedules as Cards
  // -------------------------------
  function displaySchedules(schedules) {
    const container = document.getElementById("schedule-container");
    if (!container) return; // Exit if element doesn't exist
    container.innerHTML = "";

    schedules.forEach((schedule) => {
      const card = document.createElement("div");
      card.className = "card shadow-sm border-0 rounded-3 p-3 mb-4";

      card.innerHTML = `
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

      const table = generateTable(schedule.grid);
      card.appendChild(table);
      container.appendChild(card);
    });

    attachPublishHandlers();
    attachEditHandlers();
    attachRegenerateHandlers();
    attachImpactCheckHandlers();
  }

  // -------------------------------
  // 📅 Generate Table for Schedule Grid
  // ------------------------------
  function generateTable(grid) {
    const table = document.createElement("table");
    table.className = "table table-bordered text-center align-middle";

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
        // ✅ FIX: Safely handle all types
        const rawValue = grid[day]?.[time];
        const course =
          rawValue === null || rawValue === undefined ? "" : String(rawValue);
        console.log(course);
        let courseText = "";

        if (typeof rawValue === "string") {
          courseText = rawValue.trim();
        } else if (rawValue && typeof rawValue === "object") {
          courseText =
            rawValue.code || rawValue.name || JSON.stringify(rawValue);
        } else {
          courseText = "";
        }

        const isBreak = courseText.toLowerCase() === "break";

        const cell = isBreak
          ? `<td class="bg-light-subtle fw-bold">${course}</td>`
          : `<td>${course}</td>`;

        row.innerHTML += cell;
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

        if (
          !confirm(
            `Are you sure you want to publish schedule for ${section} - Level ${level}?`
          )
        )
          return;

        btn.disabled = true;
        btn.innerHTML =
          '<i class="bi bi-hourglass-split me-1"></i>Publishing...';

        try {
          const res = await fetch(
            `${API_BASE}/schedule/publish/${scheduleId}`,
            {
              method: "POST",
            }
          );

          const data = await res.json();
          if (!res.ok)
            throw new Error(data.error || "Failed to publish schedule.");

          // ✅ Success Feedback
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
  // ✏️ EDIT + SAVE HANDLERS
  // ========================================
  function attachEditHandlers() {
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const scheduleId = btn.dataset.id;
        const card = btn.closest(".card");
        const table = card.querySelector("table");

        // Disable other edit buttons
        document
          .querySelectorAll(".edit-btn")
          .forEach((b) => (b.disabled = true));

        // Create a Save button dynamically
        const saveBtn = document.createElement("button");
        saveBtn.className = "btn btn-success btn-sm ms-2";
        saveBtn.innerHTML = '<i class="bi bi-save me-1"></i>Save';
        btn.after(saveBtn);

        // Convert cells to editable inputs
        table.querySelectorAll("tbody tr").forEach((row) => {
          row.querySelectorAll("td").forEach((cell) => {
            const val = cell.innerText.trim();
            cell.innerHTML = `<input type="text" class="form-control form-control-sm text-center" value="${val}">`;
          });
        });

        btn.classList.add("btn-secondary");
        btn.innerHTML = '<i class="bi bi-pencil me-1"></i>Editing...';

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
            if (!data.success)
              throw new Error(data.error || "Failed to save schedule.");

            alert("✅ Schedule saved successfully!");
            fetchLatestSchedule(selectedLevel); // Refresh display
          } catch (err) {
            alert("❌ Error saving schedule: " + err.message);
            console.error("Save failed:", err);
          }
        });
      });
    });
  }

  // ========================================
  // 🔄 REGENERATE HANDLERS
  // ========================================
  function attachRegenerateHandlers() {
    document.querySelectorAll(".regenerate-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        // 1. Get the level from the button
        const levelToRegenerate = btn.dataset.level;

        if (
          confirm(
            `Are you sure you want to regenerate all schedules for Level ${levelToRegenerate}? This will delete all current drafts for this level.`
          )
        ) {
          // 2. Set the global level variable
          selectedLevel = parseInt(levelToRegenerate);

          // 3. CALL THE FUNCTION DIRECTLY (Do not use .click())
          handleGenerateSchedule();
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

        // Show loading state
        btn.disabled = true;
        btn.innerHTML =
          '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Checking...';

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

          // Display the report in modal
          displayImpactReport(data, section);
        } catch (err) {
          console.error("❌ Impact check error:", err);
          alert(`Error checking impact: ${err.message}`);
        } finally {
          // Restore button
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-people-fill me-1"></i>Check Impact';
        }
      });
    });
  }

  // ========================================
  // ✨ DISPLAY IMPACT REPORT IN MODAL
  // ========================================
  function displayImpactReport(data, section) {
    const hasConflicts =
      data.impactedStudents && data.impactedStudents.length > 0;
    const totalIrregulars = data.totalIrregulars || 0;
    const affectedCount =
      data.affectedCount || data.impactedStudents?.length || 0;
    const impactRate =
      totalIrregulars > 0
        ? ((affectedCount / totalIrregulars) * 100).toFixed(1)
        : 0;

    // Update header
    const header = document.getElementById("impactModalHeader");
    const icon = document.getElementById("impactModalIcon");
    const subtitle = document.getElementById("impactModalSubtitle");

    if (hasConflicts) {
      header.className = "modal-header text-white bg-danger";
      icon.className = "bi bi-exclamation-triangle-fill fs-2";
    } else {
      header.className = "modal-header text-white bg-success";
      icon.className = "bi bi-check-circle-fill fs-2";
    }

    subtitle.textContent = `${section} - Level ${data.level || "?"}`;

    // Update summary cards
    document.getElementById("totalIrregulars").textContent = totalIrregulars;
    document.getElementById("affectedCount").textContent = affectedCount;
    document.getElementById("impactRate").textContent = `${impactRate}%`;

    // Update affected card color
    const affectedCard = document.getElementById("affectedCard");
    const affectedLabel = document.getElementById("affectedLabel");
    if (hasConflicts) {
      affectedCard.className =
        "card border-2 border-danger bg-danger bg-opacity-10 h-100";
      affectedLabel.className = "text-danger fw-semibold mb-2";
      document.getElementById("affectedCount").className =
        "display-4 fw-bold text-danger";
    } else {
      affectedCard.className =
        "card border-2 border-success bg-success bg-opacity-10 h-100";
      affectedLabel.className = "text-success fw-semibold mb-2";
      document.getElementById("affectedCount").className =
        "display-4 fw-bold text-success";
    }

    // Update status alert
    const statusAlert = document.getElementById("statusAlert");
    const statusIcon = document.getElementById("statusIcon");
    const statusTitle = document.getElementById("statusTitle");
    const statusMessage = document.getElementById("statusMessage");

    if (hasConflicts) {
      statusAlert.className =
        "alert alert-danger d-flex align-items-start gap-3";
      statusIcon.className = "bi bi-exclamation-triangle-fill fs-3";
      statusTitle.textContent = "Schedule Conflicts Detected";
    } else {
      statusAlert.className =
        "alert alert-success d-flex align-items-start gap-3";
      statusIcon.className = "bi bi-check-circle-fill fs-3";
      statusTitle.textContent = "All Clear!";
    }

    statusMessage.textContent = data.message;

    // Show/hide sections
    const affectedSection = document.getElementById("affectedStudentsSection");
    const noConflictsSection = document.getElementById("noConflictsSection");

    if (hasConflicts) {
      affectedSection.style.display = "block";
      noConflictsSection.style.display = "none";

      // Build students list
      const studentsList = document.getElementById("studentsList");
      studentsList.innerHTML = data.impactedStudents
        .map(
          (student, idx) => `
        <div class="card mb-3 border-2 border-danger">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <small class="text-muted d-block mb-1">Student ID</small>
                <h5 class="fw-bold mb-0">${student.student_id}</h5>
              </div>
              <span class="badge bg-danger fs-6 px-3 py-2">
                ${student.conflicts.length} Conflict${
            student.conflicts.length > 1 ? "s" : ""
          }
              </span>
            </div>
  
            <div class="border-top pt-3">
              <h6 class="fw-semibold text-muted mb-3">
                <i class="bi bi-book me-2"></i>Conflicting Courses
              </h6>
              <div class="row g-2">
                ${student.conflicts
                  .map(
                    (conflict) => `
                  <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center bg-danger bg-opacity-10 border border-danger rounded p-3">
                      <div class="d-flex align-items-center gap-3">
                        <span class="badge bg-danger fs-6 px-3 py-2">${
                          conflict.code
                        }</span>
                        <span class="fw-medium">${
                          conflict.type || "Course"
                        }</span>
                      </div>
                      <div class="text-muted">
                        <i class="bi bi-calendar me-1"></i>
                        <small>From Level ${conflict.level}</small>
                      </div>
                    </div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          </div>
        </div>
      `
        )
        .join("");
    } else {
      affectedSection.style.display = "none";
      noConflictsSection.style.display = "block";
    }

    // Update timestamp
    document.getElementById(
      "reportTimestamp"
    ).textContent = `Generated: ${new Date().toLocaleString()}`;

    // Show the modal
    const modal = new bootstrap.Modal(
      document.getElementById("impactReportModal")
    );
    modal.show();
  }

  // ========================================
  // 📭 DISPLAY EMPTY STATE (New Function)
  // ========================================
  // ========================================
  // 📭 DISPLAY EMPTY STATE (Updated)
  // ========================================
  function displayEmptyState(level, message) {
    const container = document.getElementById("schedule-container");
    if (!container) return;

    container.innerHTML = `
      <div class="text-center py-5" style="border-radius: 20px; background: #f8f9fa;">
        <i class="bi bi-journal-x" style="font-size: 3.5rem; color: #6c757d;"></i>
        <h4 class="mt-3 text-muted fw-bold">No Schedules Found</h4>
        <p class="text-muted mb-4">${message}</p>
        
        <button class="btn btn-warning btn-lg" id="generate-from-empty">
          <i class="bi bi-arrow-repeat me-1"></i> Generate for Level ${level}
        </button>
      </div>
    `; // Find the new button we just created

    const newBtn = document.getElementById("generate-from-empty");

    if (newBtn) {
      // ✅ FIX: Attach the generation logic directly to this button's click event
      newBtn.addEventListener("click", handleGenerateSchedule);
    }
  }
  // ========================================
  async function handleGenerateSchedule() {
    if (!selectedLevel) {
      alert("Please select an academic level first.");
      return;
    }

    const container = document.getElementById("schedule-container");
    if (!container) return; // Exit if container doesn't exist
    container.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-warning" role="status"></div>
        <p class="mt-3 fw-bold text-secondary">Generating schedule for Level ${selectedLevel}...</p>
      </div>
    `;

    try {
      const res = await fetch(`${API_BASE}/schedule/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: selectedLevel }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to generate schedule.");

      if (!data.schedules?.length) {
        // If generation succeeds but creates no schedules, show empty state
        displayEmptyState(
          selectedLevel,
          "Generation complete, but no schedules were created."
        );
        return;
      }

      displaySchedules(data.schedules);
    } catch (err) {
      console.error("❌ Schedule generation failed:", err); // Show a clear error message in the empty state box
      displayEmptyState(selectedLevel, `Generation Failed: ${err.message}`);
    }
  }
})();
