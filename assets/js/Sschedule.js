// Sschedule.js
(function() {
  'use strict';

  
  let currentLevel = 4; // Default fallback
  let comments = {};
  let currentCellInfo = null;
  const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '')
    ? 'http://localhost:4000'
    : ''; 
  
  // ================= INITIALIZATION =================
  
  document.addEventListener('DOMContentLoaded', function() {
      console.log('✅ Schedule system initialized');
      
      // ✅ قراءة بيانات الطالب من localStorage
      const studentDataStr = localStorage.getItem('studentData');
      if (studentDataStr) {
          try {
              const studentData = JSON.parse(studentDataStr);
              console.log('📖 Student data:', studentData);
              
              if (studentData && studentData.level) {
                  currentLevel = parseInt(studentData.level);
                  console.log(`✅ Student level set to: ${currentLevel}`);
              }
          } catch (e) {
              console.error("❌ Error parsing studentData from localStorage", e);
          }
      } else {
          console.warn('⚠️ No student data found in localStorage, using default level 4');
      }
      
      initializeLevelButtons();
      fetchLatestSchedule(currentLevel); 
  });
  
  // ================= EVENT HANDLERS & UI =================
  
  function initializeLevelButtons() {
      const levelButtons = document.querySelectorAll('#levelButtonsGroup .btn');
      levelButtons.forEach(button => {
          const level = parseInt(button.getAttribute('data-level'));
          
          if (level === currentLevel) {
              button.classList.remove('btn-outline-primary');
              button.classList.add('btn-primary');
          } else {
              button.classList.remove('btn-primary');
              button.classList.add('btn-outline-primary');
          }
          
          button.addEventListener('click', function() {
              const newLevel = parseInt(this.getAttribute('data-level'));
              switchLevel(newLevel, this);
          });
      });
  }
  
  function switchLevel(level, clickedButton) {
      currentLevel = level;
      console.log(`🔄 Switching to level: ${level}`);
      
      document.querySelectorAll('#levelButtonsGroup .btn').forEach(btn => {
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-outline-primary');
      });
      clickedButton.classList.remove('btn-outline-primary');
      clickedButton.classList.add('btn-primary');
      
      fetchLatestSchedule(level);
  }
  
  // ================= DATA FETCHING =================
  
  async function fetchLatestSchedule(level) {
      const container = document.getElementById("scheduleContainer"); 
      if (!container) {
          console.error('❌ scheduleContainer not found!');
          return;
      }
      
      container.innerHTML = `
          <div class="text-center py-4">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="mt-2 text-muted">Loading schedule for Level ${level}...</p>
          </div>
      `;
  
      try {
          const url = `${API_BASE_URL}/api/student-schedules/${level}`;
          console.log(`📡 Fetching from: ${url}`);
  
          // Add authorization token if available
          const token = sessionStorage.getItem('token');
          const headers = {};
          if (token) {
              headers['Authorization'] = `Bearer ${token}`;
          }
  
          const res = await fetch(url, { headers: headers });
          console.log(`📥 Response status: ${res.status}`);
          
          const data = await res.json();
          console.log('📦 Response data:', data);
  
          if (!res.ok) {
              throw new Error(data.error || `Failed to load schedule. Status: ${res.status}`);
          }
          
          if (!data.schedules || data.schedules.length === 0) {
              return displayError(container, `No schedules available for Level ${level} (version 2+).`);
          }
  
          console.log(`✅ Found ${data.schedules.length} schedule(s)`);
          displaySchedules(data.schedules[0]); 
          updateScheduleTitle(level, data.schedules[0]);
          
      } catch (err) {
          console.error("❌ Failed to fetch schedule:", err);
          
          let errorMessage = 'Error loading schedule';
          
          if (err.message.includes('Failed to fetch')) {
              errorMessage = '⚠️ Cannot connect to server. Make sure the server is running on port 4000';
          } else if (err.message.includes('404')) {
              errorMessage = '⚠️ No schedules found for Level ' + level;
          } else {
              errorMessage = err.message;
          }
          
          displayError(container, errorMessage);
      }
  }
  
  function displayError(container, message) {
      container.innerHTML = `
          <div class="alert alert-warning text-center mt-4" role="alert">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <p class="mb-0 mt-2">${message}</p>
          </div>
      `;
  }
  
  // Display the schedule table
  function displaySchedules(schedule) {
      const container = document.getElementById("scheduleContainer"); 
      if (!container) return; 
  
      console.log('🎨 Rendering schedule:', schedule);
      console.log('📊 Grid data:', schedule.grid);
  
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
      const timeSlots = ['8:00-8:50', '9:00-9:50', '10:00-10:50', '11:00-11:50', 
                         '12:00-12:50', '1:00-1:50', '2:00-2:50', '3:00-3:50'];
  
      const grid = schedule.grid || {};
      
      let tableHTML = `
          <div class="table-responsive">
              <table class="table table-bordered table-hover text-center schedule-table">
                  <thead>
                      <tr>
                          <th>Day / Time</th>
                          ${timeSlots.map(slot => `<th>${slot}</th>`).join('')}
                      </tr>
                  </thead>
                  <tbody>
      `;
  
      days.forEach((day) => {
          tableHTML += `<tr><td class="fw-bold">${day}</td>`;
          
          timeSlots.forEach((timeSlot, timeIndex) => {
              // ✅ التعامل مع البيانات من الـ grid
              const cellData = grid[day] ? grid[day][timeSlot] : null;
              
              console.log(`${day} ${timeSlot}:`, cellData);
              
              // ✅ التعامل مع البيانات سواء كانت string أو object أو undefined
              if (cellData) {
                  let courseName = '';
                  let location = '';
                  
                  if (typeof cellData === 'string') {
                      // البيانات string مباشرة
                      courseName = cellData;
                  } else if (typeof cellData === 'object') {
                      // البيانات object
                      courseName = cellData.course || '';
                      location = cellData.location || '';
                  }
                  
                  if (courseName && courseName.trim() !== '') {
                      // Extract course code
                      let courseCode = '';
                      const match = courseName.match(/^([A-Z]{2,4}\d{3})/);
                      courseCode = match ? match[1] : courseName.split(' ')[0];

                      tableHTML += `
                          <td class="schedule-cell course-cell"
                              style="background-color: #e3f2fd; cursor: pointer; position: relative;"
                              onclick="openStudentCommentModal('${escapeHtml(courseCode)}', '${escapeHtml(courseName)}', '${day}', '${timeSlot}')"
                              title="Click to add your comment">
                              <div class="course-name fw-bold" style="color: #1976d2;">${courseName}</div>
                              ${location ? `<small class="text-muted d-block">${location}</small>` : ''}
                              <small class="text-primary d-block mt-1">
                                  <i class="bi bi-chat-dots"></i> Add comment
                              </small>
                          </td>
                      `;
                  } else {
                      // ✅ خلايا فاضية (بدون BREAK)
                      tableHTML += `<td class="free-cell" style="background-color: #f5f5f5;">-</td>`;
                  }
              } else {
                  // خلية فاضية
                  tableHTML += `<td class="free-cell" style="background-color: #f5f5f5;">-</td>`;
              }
          });
          
          tableHTML += `</tr>`;
      });
  
      tableHTML += `</tbody></table></div>`;
      
      container.innerHTML = tableHTML;
      
      updateScheduleBadges(schedule.version);
      console.log('✅ Schedule rendered successfully');
  }
  
  function updateScheduleBadges(version) {
      const badgesContainer = document.getElementById('scheduleBadges');
      if (badgesContainer) {
          // ✅ إخفاء رقم النسخة - عرض بادج واحد فقط
          badgesContainer.innerHTML = `
              <span class="badge bg-primary">Final Version</span>
          `;
      }
  }
  
  function updateScheduleTitle(level, schedule) {
      const scheduleTitle = document.getElementById('scheduleTitle');
      if (scheduleTitle && schedule) {
          scheduleTitle.innerHTML =
              `<i class="bi bi-calendar3"></i> Academic Schedule - Level ${level} - ${schedule.section || ''}`;
      }
  }

  // ================= HELPER FUNCTIONS =================

  function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
  }

  /**
   * Open comment modal for student
   * Called when student clicks on a course cell
   */
  function openStudentCommentModal(courseCode, courseName, day, timeSlot) {
      console.log('🖱️ Student Cell clicked:', { courseCode, courseName, day, timeSlot });

      if (window.commentManager) {
          window.commentManager.openCommentModal({
              courseCode: courseCode,
              courseName: courseName,
              day: day,
              timeSlot: timeSlot
          });
      } else {
          console.error('❌ Student Comment Manager not initialized');
          alert('❌ Comment system not ready. Please refresh the page.');
      }
  }

  // Expose function globally for onclick attributes
  window.openStudentCommentModal = openStudentCommentModal;
})();
