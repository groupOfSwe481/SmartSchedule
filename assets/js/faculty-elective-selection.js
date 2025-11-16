// assets/js/faculty-elective-selection.js - FIXED VERSION
const API_BASE = 'http://localhost:4000/api';

// State management
let currentLevel = null;
let currentStats = null;
let selectionMode = 'auto';
let selectedCourses = new Set();
let topCoursesChart = null;
let selectionModal = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Faculty Elective Selection Page Loaded');
  selectionModal = new bootstrap.Modal(document.getElementById('selectionModal'));
  await loadFacultyInfo();
  await loadDeadlineInfo();
  await loadLevelSummary();
});

// Load faculty information
async function loadFacultyInfo() {
  const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('user') || '{}');
  const facultyName = userData.username || userData.First_Name || 'Faculty Member';
  const facultyNameElement = document.getElementById('sidebarFacultyName');
  if (facultyNameElement) {
    facultyNameElement.textContent = facultyName;
  }
  console.log('👤 Faculty:', facultyName);
}

// Load deadline information
async function loadDeadlineInfo() {
  try {
    console.log('📅 Loading deadline info...');
    const response = await fetch(`${API_BASE}/deadlines`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    let deadlines = result.data || result.deadlines || result;
    
    if (!Array.isArray(deadlines)) {
      deadlines = [];
    }
    
    console.log('📅 Deadlines:', deadlines);
    
    const electiveFormDeadline = deadlines.find(d => d.type === 'elective_form');
    
    const formPeriodInfo = document.getElementById('formPeriodInfo');
    const facultyDeadlineEl = document.getElementById('facultyDeadline');
    const deadlineBanner = document.getElementById('deadlineBanner');
    
    if (electiveFormDeadline) {
      const endDate = new Date(electiveFormDeadline.end_date);
      const now = new Date();
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      
      if (now > endDate) {
        formPeriodInfo.textContent = `Student form period ended on ${endDate.toLocaleDateString()}. You can now finalize elective selections.`;
        facultyDeadlineEl.textContent = 'Form period completed';
        deadlineBanner.classList.remove('warning');
      } else {
        formPeriodInfo.textContent = `Student form period: ${electiveFormDeadline.description || 'Elective Form Submission'}`;
        facultyDeadlineEl.textContent = endDate.toLocaleDateString();
        
        if (daysRemaining <= 3) {
          deadlineBanner.classList.add('warning');
        }
      }
    } else {
      formPeriodInfo.textContent = 'No active elective form period. You can still make selections.';
      facultyDeadlineEl.textContent = 'Not set';
      deadlineBanner.classList.remove('warning');
    }
  } catch (error) {
    console.error('❌ Error loading deadline info:', error);
    document.getElementById('formPeriodInfo').textContent = 'Unable to load deadline information. You can still make selections.';
    document.getElementById('facultyDeadline').textContent = 'Not available';
  }
}

// Load level summary cards
async function loadLevelSummary() {
  try {
    console.log('📊 Loading level summary...');
    const response = await fetch(`${API_BASE}/faculty/elective-selection-summary`);
    
    if (!response.ok) {
      console.error('❌ Summary API failed:', response.status);
      createDummyLevelCards();
      return;
    }
    
    const data = await response.json();
    console.log('📊 Summary data:', data);
    
    const levelCardsContainer = document.getElementById('levelCards');
    levelCardsContainer.innerHTML = '';
    
    if (!data.levels || data.levels.length === 0) {
      createDummyLevelCards();
      return;
    }
    
    data.levels.forEach(level => {
      const card = createLevelCard(level);
      levelCardsContainer.appendChild(card);
    });
    
  } catch (error) {
    console.error('❌ Error loading level summary:', error);
    showError('Failed to load level summary. Check console for details.');
    createDummyLevelCards();
  }
}

// Create dummy level cards if no data available
function createDummyLevelCards() {
  const levels = [3, 4, 5, 6, 7, 8];
  const levelCardsContainer = document.getElementById('levelCards');
  levelCardsContainer.innerHTML = '';
  
  levels.forEach(level => {
    const dummyData = {
      level: level,
      total_students: 0,
      submissions: 0,
      submission_rate: 0,
      elective_selected: false
    };
    const card = createLevelCard(dummyData);
    levelCardsContainer.appendChild(card);
  });
}

// Create level card
function createLevelCard(levelData) {
  const col = document.createElement('div');
  col.className = 'col-md-4 mb-3';
  
  const completedClass = levelData.elective_selected ? 'completed' : '';
  
  col.innerHTML = `
    <div class="dashboard-card level-card ${completedClass}" onclick="selectLevel(${levelData.level})">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4 class="fw-bold mb-0">Level ${levelData.level}</h4>
        ${levelData.elective_selected ? 
          '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Completed</span>' : 
          '<span class="badge bg-warning">Pending</span>'}
      </div>
      <div class="row text-center">
        <div class="col-6">
          <h5 class="mb-0">${levelData.total_students}</h5>
          <small class="text-muted">Total Students</small>
        </div>
        <div class="col-6">
          <h5 class="mb-0">${levelData.submissions}</h5>
          <small class="text-muted">Submissions</small>
        </div>
      </div>
      <div class="mt-3">
        <div class="progress" style="height: 25px;">
          <div class="progress-bar bg-success" role="progressbar" style="width: ${levelData.submission_rate}%">
            ${levelData.submission_rate}% Submitted
          </div>
        </div>
      </div>
      <div class="mt-3 text-center">
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); selectLevel(${levelData.level})">
          <i class="bi bi-gear"></i> ${levelData.elective_selected ? 'View/Edit Selection' : 'Select Electives'}
        </button>
      </div>
    </div>
  `;
  
  return col;
}

// Select a level to view details
async function selectLevel(level) {
  console.log(`🎯 Selecting Level ${level}...`);
  currentLevel = level;
  
  // Update modal title and level display
  document.getElementById('selectionTitle').textContent = `Level ${level} - Elective Selection`;
  const levelDisplay = document.getElementById('currentLevelDisplay');
  if (levelDisplay) {
    levelDisplay.textContent = level;
  }
  
  // Show modal
  selectionModal.show();
  console.log('✅ Modal opened for Level', level);
  
  // Load level statistics
  await loadLevelStats(level);
}

// Load statistics for a specific level
async function loadLevelStats(level) {
  try {
    console.log(`📊 Loading stats for Level ${level}...`);
    const response = await fetch(`${API_BASE}/faculty/elective-stats/${level}`);
    
    if (!response.ok) {
      console.error('❌ Stats API failed:', response.status);
      showInfo('No student data available. Loading courses for manual selection...');
      currentStats = {
        level: level,
        total_students: 0,
        total_submissions: 0,
        submission_rate: 0,
        course_selections: [],
        current_selection: []
      };
      updateStatsDisplay();
      await loadManualCourses(level);
      return;
    }
    
    currentStats = await response.json();
    console.log('📊 Stats loaded for Level', level, ':', currentStats);
    
    // Update stats display
    updateStatsDisplay();
    
    // Create chart with current level data
    if (currentStats.course_selections && currentStats.course_selections.length > 0) {
      console.log(`📈 Creating chart for Level ${level} with`, currentStats.course_selections.length, 'courses');
      createTopCoursesChart(currentStats.course_selections);
      loadCourseSelectionList(currentStats.course_selections, currentStats.current_selection || []);
    } else {
      console.log('📊 No course selections data for chart');
      document.querySelector('.chart-container').innerHTML = '<p class="text-center text-muted py-4">No student preferences available for this level</p>';
      await loadManualCourses(level);
    }
    
  } catch (error) {
    console.error('❌ Error loading level statistics:', error);
    showError('Failed to load statistics: ' + error.message);
  }
}

// Helper function to update stats display
function updateStatsDisplay() {
  document.getElementById('totalStudents').textContent = currentStats.total_students || 0;
  document.getElementById('totalSubmissions').textContent = currentStats.total_submissions || 0;
  document.getElementById('submissionRate').textContent = (currentStats.submission_rate || 0) + '%';
  document.getElementById('uniqueCourses').textContent = (currentStats.course_selections || []).length;
}

// Create chart showing top courses for the current level
function createTopCoursesChart(courseSelections) {
  const ctx = document.getElementById('topCoursesChart');
  
  if (!ctx) {
    console.error('❌ Chart canvas not found');
    return;
  }
  
  // Destroy existing chart
  if (topCoursesChart) {
    topCoursesChart.destroy();
    topCoursesChart = null;
  }
  
  // Clear any existing content and recreate canvas
  const chartContainer = document.getElementById('chartContainer');
  if (chartContainer) {
    chartContainer.innerHTML = '<canvas id="topCoursesChart"></canvas>';
  }
  
  const newCtx = document.getElementById('topCoursesChart');
  if (!newCtx) {
    console.error('❌ New chart canvas not found');
    return;
  }
  
  // Take top 10 courses with count > 0, sorted by count descending
  const topCourses = courseSelections
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  if (topCourses.length === 0) {
    chartContainer.innerHTML = '<p class="text-center text-muted py-4">No student selections yet for Level ' + currentLevel + '</p>';
    return;
  }
  
  // Ensure chart container has proper dimensions
  chartContainer.style.height = '300px';
  chartContainer.style.minHeight = '300px';
  
  try {
    topCoursesChart = new Chart(newCtx, {
      type: 'bar',
      data: {
        labels: topCourses.map(c => c.course_code),
        datasets: [{
          label: 'Number of Students',
          data: topCourses.map(c => c.count),
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            display: true,
            position: 'top'
          },
          title: { 
            display: true,
            text: `Top ${topCourses.length} Courses for Level ${currentLevel}`,
            font: { size: 16 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Students'
            },
            ticks: { 
              stepSize: 1,
              precision: 0
            }
          },
          x: {
            title: {
              display: true,
              text: 'Course Code'
            }
          }
        }
      }
    });
    
    console.log('✅ Chart created successfully for Level', currentLevel, 'with', topCourses.length, 'courses');
  } catch (error) {
    console.error('❌ Error creating chart:', error);
    chartContainer.innerHTML = '<p class="text-center text-muted py-4">Error displaying chart for Level ' + currentLevel + '</p>';
  }
}

// The rest of your functions remain the same (loadManualCourses, loadCourseSelectionList, etc.)
// ... keep all your existing functions from the original file

// Load courses for manual selection (when no student data)
async function loadManualCourses(level) {
  console.log(`📚 Loading courses for manual selection...`);
  
  // Use the course_selections from stats if available
  if (currentStats && currentStats.course_selections && currentStats.course_selections.length > 0) {
    console.log(`✅ Using ${currentStats.course_selections.length} courses from stats`);
    
    // Update stats
    updateStatsDisplay();
    
    // Clear chart
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
      chartContainer.innerHTML = '<p class="text-center text-muted py-4">Manual selection mode - Select courses below</p>';
    }
    
    // Force manual mode
    selectionMode = 'manual';
    setSelectionMode('manual');
    loadCourseSelectionList(currentStats.course_selections, currentStats.current_selection || []);
  } else {
    // No courses at all - show empty state
    console.log('⚠️ No courses available');
    updateStatsDisplay();
    
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
      chartContainer.innerHTML = '<p class="text-center text-muted py-4">No elective courses available for this level</p>';
    }
    
    const container = document.getElementById('courseSelectionList');
    container.innerHTML = '<p class="text-center text-muted py-4">No elective courses found. Please add courses to the database first.</p>';
  }
}

// Load course selection list
function loadCourseSelectionList(courseSelections, currentSelection) {
  console.log('📋 Loading course list...', courseSelections.length, 'courses');
  
  const container = document.getElementById('courseSelectionList');
  if (!container) {
    console.error('❌ Course list container not found!');
    return;
  }
  
  container.innerHTML = '';
  
  // Reset selected courses
  selectedCourses.clear();
  
  // If auto mode and have data, pre-select top 3 courses
  if (selectionMode === 'auto' && courseSelections.length > 0 && courseSelections[0].count > 0) {
    const topThree = courseSelections.slice(0, Math.min(3, courseSelections.length)).map(c => c.course_code);
    topThree.forEach(code => selectedCourses.add(code));
    console.log('🤖 Auto-selected top 3:', Array.from(selectedCourses));
  } else if (currentSelection && currentSelection.length > 0) {
    // Use existing selection
    currentSelection.forEach(code => selectedCourses.add(code));
    console.log('📋 Loaded existing selection:', Array.from(selectedCourses));
  }
  
  if (courseSelections.length === 0) {
    container.innerHTML = '<p class="text-center text-muted py-4">No elective courses available for this level</p>';
    console.log('⚠️ No courses to display');
    return;
  }
  
  console.log('🎨 Rendering', courseSelections.length, 'course items...');
  
  courseSelections.forEach((course, index) => {
    const isSelected = selectedCourses.has(course.course_code);
    const isAutoSelected = selectionMode === 'auto' && index < 3 && course.count > 0;
    
    const div = document.createElement('div');
    div.className = `course-selection-item ${isSelected ? (isAutoSelected ? 'auto-selected' : 'selected') : ''}`;
    div.onclick = () => toggleCourseSelection(course.course_code);
    
    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div class="flex-grow-1">
          <div class="d-flex align-items-center gap-2">
            <h6 class="mb-0">${course.course_code}</h6>
            <span class="badge bg-primary">${course.credit_hours} Credits</span>
            ${isAutoSelected ? '<span class="badge bg-info">Auto-Selected</span>' : ''}
          </div>
          <p class="mb-1 text-muted small">${course.course_name}</p>
          <small class="text-muted">${course.department}</small>
        </div>
        <div class="text-end me-3">
          <h5 class="mb-0 text-primary">${course.count} students</h5>
          <small class="text-muted">${course.percentage}% selected this</small>
        </div>
        <div>
          ${isSelected ? 
            '<i class="bi bi-check-circle-fill text-success" style="font-size: 1.5rem;"></i>' : 
            '<i class="bi bi-circle" style="font-size: 1.5rem;"></i>'}
        </div>
      </div>
    `;
    
    container.appendChild(div);
  });
  
  console.log('✅ Rendered', container.children.length, 'course items');
  
  updateSelectedBadge();
}

// Toggle course selection
function toggleCourseSelection(courseCode) {
  if (selectionMode === 'auto' && currentStats.course_selections[0]?.count > 0) {
    showError('Switch to Manual Mode to customize course selection');
    return;
  }
  
  if (selectedCourses.has(courseCode)) {
    selectedCourses.delete(courseCode);
  } else {
    selectedCourses.add(courseCode);
  }
  
  console.log('🎯 Selected courses:', Array.from(selectedCourses));
  
  // Reload the list to update UI
  loadCourseSelectionList(currentStats.course_selections, Array.from(selectedCourses));
}

// Set selection mode
function setSelectionMode(mode) {
  selectionMode = mode;
  console.log(`🔧 Selection mode: ${mode}`);
  
  // Update button states
  document.getElementById('autoModeBtn').classList.toggle('active', mode === 'auto');
  document.getElementById('manualModeBtn').classList.toggle('active', mode === 'manual');
  
  // Update title
  const modeTitle = mode === 'auto' ? 
    'Auto-Selected Electives (Top 3 by Popularity)' : 
    'Manual Course Selection';
  document.getElementById('selectionModeTitle').textContent = modeTitle;
  
  // Reload course list
  if (currentStats) {
    loadCourseSelectionList(currentStats.course_selections, currentStats.current_selection || []);
  }
}

// Update selected badge
function updateSelectedBadge() {
  document.getElementById('selectedBadge').textContent = `${selectedCourses.size} Selected`;
}

// Save elective selection
async function saveElectiveSelection() {
  if (selectedCourses.size === 0) {
    showError('Please select at least one elective course');
    return;
  }
  
  const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('user') || '{}');
  const facultyId = userData.userId || userData.id || userData.username || 'faculty';
  
  console.log('💾 Saving selection:', {
    level: currentLevel,
    courses: Array.from(selectedCourses),
    mode: selectionMode,
    faculty: facultyId
  });
  
  try {
    const response = await fetch(`${API_BASE}/faculty/save-elective-selection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: currentLevel,
        elective_courses: Array.from(selectedCourses),
        selection_mode: selectionMode,
        selected_by: facultyId
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      showError(result.error || 'Failed to save selection');
      return;
    }
    
    console.log('✅ Save successful:', result);
    showSuccess(`Successfully saved ${selectedCourses.size} elective courses for Level ${currentLevel}`);
    
    // Close modal and refresh summary
    selectionModal.hide();
    setTimeout(() => loadLevelSummary(), 500);
    
  } catch (error) {
    console.error('❌ Error saving selection:', error);
    showError('Failed to save selection: ' + error.message);
  }
}

// Reset selection
function resetSelection() {
  if (confirm('Are you sure you want to reset the selection?')) {
    selectedCourses.clear();
    loadCourseSelectionList(currentStats.course_selections, []);
  }
}

// Show messages
function showError(message) {
  console.error('❌', message);
  alert('❌ Error: ' + message);
}

function showSuccess(message) {
  console.log('✅', message);
  alert('✅ ' + message);
}

function showInfo(message) {
  console.log('ℹ️', message);
  alert('ℹ️ Info: ' + message);
}