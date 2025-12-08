// faculty-schedule-viewer.js
(function() {
  'use strict';

  // (Modified from Sschedule.js for Faculty Commenting)
  
  let currentLevel = 3; // ✅ Default level for faculty, matching FacultyHP.html
  let currentCellInfo = null;
  const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '')
    ? 'http://localhost:4000'
    : '';
  
  // ================= INITIALIZATION =================
  
  document.addEventListener('DOMContentLoaded', function() {
      console.log('✅ Faculty Schedule system initialized');
      
      // ✅ تم إزالة البحث عن بيانات الطالب من localStorage
      // سيتم استخدام currentLevel = 3 الافتراضي
      
      initializeLevelButtons();
      fetchLatestSchedule(currentLevel); 
  });
  
  // ================= EVENT HANDLERS & UI =================
  
  function initializeLevelButtons() {
      const levelButtons = document.querySelectorAll('#levelButtonsGroup .btn');
      levelButtons.forEach(button => {
          const level = parseInt(button.getAttribute('data-level'));
          
          // ✅ تعديل ليتوافق مع المستوى الافتراضي 3
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
      console.log(`🔄 Faculty switching to level: ${level}`);
      
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
          // ✅ faculty يستخدمون نفس نقطة النهاية لعرض جداول الطلاب
          const url = `${API_BASE_URL}/api/student-schedules/${level}`;
          console.log(`📡 Fetching from: ${url}`);
          
          const res = await fetch(url);
          const data = await res.json();
  
          if (!res.ok) {
              throw new Error(data.error || `Failed to load schedule. Status: ${res.status}`);
          }
          
          if (!data.schedules || data.schedules.length === 0) {
              return displayError(container, `No schedules available for Level ${level}.`);
          }
  
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
  
  // ================= DISPLAY SCHEDULE TABLE =================
  
  function displaySchedules(schedule) {
      const container = document.getElementById("scheduleContainer"); 
      if (!container) return; 
  
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
      const timeSlots = ['8:00-8:50', '9:00-9:50', '10:00-10:50', '11:00-11:50', 
                         '12:00-12:50', '1:00-1:50', '2:00-2:50', '3:00-3:50'];
  
      const grid = schedule.grid || {};
      
      let tableHTML = `
          <div class="table-responsive">
              <table class="table table-bordered table-hover text-center schedule-table">
                  <thead class="table-primary">
                      <tr>
                          <th style="width: 120px;">Day / Time</th>
                          ${timeSlots.map(slot => `<th>${slot}</th>`).join('')}
                      </tr>
                  </thead>
                  <tbody>
      `;
  
      days.forEach((day) => {
          tableHTML += `<tr><td class="fw-bold table-light">${day}</td>`;
          
          timeSlots.forEach((timeSlot, timeIndex) => {
              const cellData = grid[day] ? grid[day][timeSlot] : null;
              
              if (cellData) {
                  let courseName = '';
                  let courseCode = '';
                  let location = '';
                  
                  if (typeof cellData === 'string') {
                      courseName = cellData;
                      const match = cellData.match(/^([A-Z]{2,4}\d{3})/);
                      courseCode = match ? match[1] : cellData.split(' ')[0];
                  } else if (typeof cellData === 'object') {
                      courseName = cellData.course || '';
                      courseCode = cellData.code || courseName.split(' ')[0];
                      location = cellData.location || '';
                  }
                  
                  if (courseName && courseName.trim() !== '') {
                      // ✅ نفس دالة الـ OnClick
                      tableHTML += `
                          <td class="schedule-cell course-cell" 
                              style="background-color: #e3f2fd; cursor: pointer; position: relative;"
                              onclick="openCommentForCell('${escapeHtml(courseCode)}', '${escapeHtml(courseName)}', '${day}', '${timeSlot}')"
                              title="Click to add faculty comment">
                              <div class="course-name fw-bold" style="color: #1976d2;">
                                  ${courseName}
                              </div>
                              ${location ? `<small class="text-muted d-block">${location}</small>` : ''}
                              <small class="text-primary d-block mt-1">
                                  <i class="bi bi-chat-dots"></i> Comment
                              </small>
                          </td>
                      `;
                  } else {
                      tableHTML += `<td class="free-cell" style="background-color: #f5f5f5;">-</td>`;
                  }
              } else {
                  tableHTML += `<td class="free-cell" style="background-color: #f5f5f5;">-</td>`;
              }
          });
          
          tableHTML += `</tr>`;
      });
  
      tableHTML += `</tbody></table></div>`;
      container.innerHTML = tableHTML;
      
      updateScheduleBadges(schedule.version);
  }
  
  // ================= HELPER FUNCTIONS =================
  
  function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
  }
  
  /**
   * ✅ --- التعديل الأهم ---
   * Open comment modal for a specific cell
   * This function is called when faculty clicks on a course
   */
  function openCommentForCell(courseCode, courseName, day, timeSlot) {
      console.log('🖱️ Faculty Cell clicked:', { courseCode, courseName, day, timeSlot });

      // ✅ 1. استدعاء مدير التعليقات الخاص بالـ Faculty
      if (window.facultyCommentMaker) {

          // ✅ 2. إرسال المستوى الحالي (مهم جداً للـ Backend)
          window.facultyCommentMaker.openCommentModal({
              courseCode: courseCode,
              courseName: courseName,
              day: day,
              timeSlot: timeSlot,
              level: currentLevel // ✅ هذا هو الإضافة الحاسمة
          });
      } else {
          console.error('❌ Faculty Comment Maker not initialized');
          alert('❌ Faculty comment system not ready. Please refresh the page.');
      }
  }

  // ✅ Expose function globally for onclick attributes
  window.openCommentForCell = openCommentForCell;

  function updateScheduleBadges(version) {
      const badgesContainer = document.getElementById('scheduleBadges');
      if (badgesContainer) {
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
  
  console.log('✅ faculty-schedule-viewer.js loaded successfully');
  console.log('📌 Current level:', currentLevel);
  console.log('🔗 API Base URL:', API_BASE_URL);})();
