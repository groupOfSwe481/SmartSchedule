// assets/js/irregulars.js
// Use environment-aware API URL (set by api.js)
const API_BASE = window.API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '')
  ? 'http://localhost:4000/api'
  : '/api';

let allCourses = [];

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("[IRREGULARS] Script loaded");
  setupIrregularsButton();
});

/**
 * Setup the "Manage Students" button to open the modal
 */
function setupIrregularsButton() {
  const btnIrregulars = document.getElementById("btnIrregulars");
  
  console.log("[IRREGULARS] Button found:", !!btnIrregulars);
  
  if (btnIrregulars) {
    btnIrregulars.addEventListener("click", () => {
      console.log("[IRREGULARS] Button clicked!");
      openIrregularsModal();
    });
  } else {
    console.error("[IRREGULARS] Button #btnIrregulars not found!");
  }

  // Setup "Add Irregular" button in the modal
  const openAddBtn = document.getElementById("openAddIrregularModal");
  if (openAddBtn) {
    openAddBtn.addEventListener("click", () => {
      console.log("[IRREGULARS] Add button clicked!");
      openAddIrregularModal();
    });
  }

  // Setup form submission
  const addForm = document.getElementById("addIrregularForm");
  if (addForm) {
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveIrregularStudent();
    });
  }

  // Setup level dropdown change to load courses
  const levelSelect = document.getElementById("irLevel");
  if (levelSelect) {
    levelSelect.addEventListener("change", (e) => {
      loadCoursesForLevel(e.target.value);
    });
  }
}

/**
 * Open the irregulars modal and load data
 */
function openIrregularsModal() {
  console.log("[IRREGULARS] Opening modal...");
  
  // Open modal using Bootstrap
  const modalEl = document.getElementById("irregularsModal");
  if (!modalEl) {
    console.error("[IRREGULARS] Modal element not found!");
    return;
  }
  
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
  
  // Load students
  loadIrregularStudents();
}

/**
 * Load all irregular students
 */
async function loadIrregularStudents() {
  console.log("[IRREGULARS] loadIrregularStudents() called");
  
  const tbody = document.getElementById("irregularsTbody");
  
  if (!tbody) {
    console.error("[IRREGULARS] tbody not found!");
    return;
  }

  // Show loading
  tbody.innerHTML = `
    <tr>
      <td colspan="4" class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-danger me-2"></div>
        Loading irregular students...
      </td>
    </tr>
  `;

  try {
    console.log("[IRREGULARS] Fetching from:", `${API_BASE}/irregulars`);
    
    const response = await fetch(`${API_BASE}/irregulars`);
    const data = await response.json();

    console.log("[IRREGULARS] Response:", data);

    if (!data.success) {
      throw new Error(data.error || "Failed to load irregular students");
    }

    if (data.data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted py-4">
            <i class="bi bi-inbox fs-3 d-block mb-2"></i>
            No irregular students found.
          </td>
        </tr>
      `;
      return;
    }

    console.log("[IRREGULARS] Displaying", data.data.length, "students");

    // Display students
    tbody.innerHTML = data.data
      .map(
        (student) => `
        <tr>
          <td class="fw-semibold">${student.student_id}</td>
          <td><span class="badge bg-primary">Level ${student.level}</span></td>
          <td>
            <div class="d-flex flex-wrap gap-1">
              ${student.remaining_courses_from_past_levels && student.remaining_courses_from_past_levels.length > 0
                ? student.remaining_courses_from_past_levels
                    .map(
                      (course) =>
                        `<span class="badge bg-warning text-dark">${course}</span>`
                    )
                    .join("")
                : '<span class="text-muted fst-italic">No remaining courses</span>'}
            </div>
          </td>
          <td>
            <button class="btn btn-sm btn-outline-danger" 
              onclick="deleteIrregularStudent('${student._id}', '${student.student_id}')"
              title="Remove from irregular list">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `
      )
      .join("");
      
    console.log("[IRREGULARS] Display complete!");
  } catch (error) {
    console.error("[IRREGULARS] Error:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-danger py-4">
          <i class="bi bi-exclamation-triangle me-2"></i>
          ${error.message}
        </td>
      </tr>
    `;
  }
}

/**
 * Open the Add Irregular Student modal
 */
function openAddIrregularModal() {
  console.log("[IRREGULARS] Opening add modal...");
  
  // Close the view modal
  const viewModal = bootstrap.Modal.getInstance(
    document.getElementById("irregularsModal")
  );
  if (viewModal) viewModal.hide();

  // Reset form
  document.getElementById("addIrregularForm").reset();
  
  // Clear courses
  document.getElementById("irRemainingCourses").innerHTML = 
    '<option value="" disabled selected>Select a level first</option>';

  // Open add modal
  const addModal = new bootstrap.Modal(
    document.getElementById("addIrregularModal")
  );
  addModal.show();
}

/**
 * Load courses for the selected level
 */
async function loadCoursesForLevel(level) {
  console.log("[IRREGULARS] Loading courses for level:", level);
  
  const coursesSelect = document.getElementById("irRemainingCourses");
  
  if (!level) {
    coursesSelect.innerHTML = '<option value="" disabled>Select a level first</option>';
    return;
  }

  coursesSelect.innerHTML = '<option value="" disabled>Loading courses...</option>';

  try {
    const response = await fetch(`${API_BASE}/irregulars/courses/${level}`);
    const data = await response.json();

    console.log("[IRREGULARS] Courses response:", data);

    if (!data.success) {
      throw new Error(data.error || "Failed to load courses");
    }

    allCourses = data.data;

    if (allCourses.length === 0) {
      coursesSelect.innerHTML = '<option value="" disabled>No courses available</option>';
      return;
    }

    // Populate courses
    coursesSelect.innerHTML = allCourses
      .map(
        (course) =>
          `<option value="${course.code}">${course.code} - ${course.name}</option>`
      )
      .join("");
      
    console.log("[IRREGULARS] Loaded", allCourses.length, "courses");
  } catch (error) {
    console.error("[IRREGULARS] Error loading courses:", error);
    coursesSelect.innerHTML = `<option value="" disabled>${error.message}</option>`;
  }
}

/**
 * Save irregular student
 */
async function saveIrregularStudent() {
  console.log("[IRREGULARS] Saving student...");
  
  const studentId = document.getElementById("irStudentId").value.trim();
  const level = parseInt(document.getElementById("irLevel").value);
  const coursesSelect = document.getElementById("irRemainingCourses");
  
  // Get selected courses
  const selectedCourses = Array.from(coursesSelect.selectedOptions).map(
    (option) => option.value
  );

  console.log("[IRREGULARS] Data:", { studentId, level, selectedCourses });

  if (!studentId) {
    alert("Please enter a student ID");
    return;
  }

  if (!level) {
    alert("Please select a level");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/irregulars`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: studentId,
        level: level,
        remaining_courses: selectedCourses,
      }),
    });

    const data = await response.json();

    console.log("[IRREGULARS] Save response:", data);

    if (!data.success) {
      throw new Error(data.error || "Failed to add irregular student");
    }

    // Close add modal
    const addModal = bootstrap.Modal.getInstance(
      document.getElementById("addIrregularModal")
    );
    if (addModal) addModal.hide();

    // Show success message
    alert(`✅ ${data.message}`);

    // Reload the list
    loadIrregularStudents();

    // Reopen view modal
    const viewModal = new bootstrap.Modal(
      document.getElementById("irregularsModal")
    );
    viewModal.show();
  } catch (error) {
    console.error("[IRREGULARS] Save error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

/**
 * Delete irregular student
 */
async function deleteIrregularStudent(studentId, studentName) {
  console.log("[IRREGULARS] Deleting:", studentId, studentName);
  
  if (!confirm(`Remove ${studentName} from irregular students list?`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/irregulars/${studentId}`, {
      method: "DELETE",
    });

    const data = await response.json();

    console.log("[IRREGULARS] Delete response:", data);

    if (!data.success) {
      throw new Error(data.error || "Failed to delete irregular student");
    }

    alert(`✅ ${data.message}`);

    // Reload the list
    loadIrregularStudents();
  } catch (error) {
    console.error("[IRREGULARS] Delete error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

// Export functions for use in HTML onclick handlers
window.deleteIrregularStudent = deleteIrregularStudent;
window.loadIrregularStudents = loadIrregularStudents;

console.log("[IRREGULARS] Script initialization complete");