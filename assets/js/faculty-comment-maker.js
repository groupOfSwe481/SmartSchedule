// faculty-comment-maker.js
(function() {
  'use strict';

  // Faculty/Committee Comment System (for making comments)
  const API_BASE = window.API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '')
    ? 'http://localhost:4000/api'
    : '/api';
  
  class FacultyCommentMaker {
      constructor() {
          this.currentCellInfo = null;
          this.userData = null;
      }
  
      init() {
          // Get user data from session
          const userStr = sessionStorage.getItem('user');
  
          if (!userStr) {
              console.error('❌ [Faculty Comments] No user data found');
              return;
          }
  
          try {
              this.userData = JSON.parse(userStr);
              console.log('✅ Faculty comment system initialized for:', this.userData.email);
              
              this.setupEventListeners();
          } catch (error) {
              console.error('❌ Error initializing faculty comment system:', error);
          }
      }
  
      setupEventListeners() {
          const saveCommentBtn = document.getElementById('saveCommentBtn');
          if (saveCommentBtn) {
              saveCommentBtn.addEventListener('click', () => this.saveComment());
          }
  
          const commentModal = document.getElementById('commentModal');
          if (commentModal) {
              commentModal.addEventListener('hidden.bs.modal', () => {
                  this.clearCommentForm();
              });
          }
      }
  
      /**
       * Open comment modal for a specific course cell
       * (Called by faculty-schedule-viewer.js)
       */
      openCommentModal(courseData) {
          this.currentCellInfo = courseData;
  
          console.log('📝 Opening faculty comment modal for:', courseData);
  
          document.getElementById('modalCourseName').textContent = 
              courseData.courseName || courseData.courseCode;
          document.getElementById('modalTimeSlot').textContent = 
              `${courseData.day}, ${courseData.timeSlot}`;
  
          document.getElementById('commentText').value = '';
  
          const modal = new bootstrap.Modal(document.getElementById('commentModal'));
          modal.show();
      }
  
      async saveComment() {
          if (!this.currentCellInfo || !this.userData) {
              alert('❌ Error: User data or course info is missing');
              return;
          }
  
          const commentText = document.getElementById('commentText').value.trim();
  
          if (!commentText || commentText.length < 5) {
              alert('⚠️ Please enter at least 5 characters');
              return;
          }
  
          const saveBtn = document.getElementById('saveCommentBtn');
          saveBtn.disabled = true;
          saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
  
          // ✅ --- التعديل الأهم ---
          // بناء الطلب الخاص بالـ Faculty بدلاً من Student
          const requestBody = {
              faculty_id: this.userData._id || this.userData.id,
              faculty_name: `${this.userData.First_Name} ${this.userData.Last_Name}`.trim(),
              faculty_role: this.userData.role || 'Faculty',
              course_code: this.currentCellInfo.courseCode,
              course_name: this.currentCellInfo.courseName,
              time_slot: this.currentCellInfo.timeSlot,
              day: this.currentCellInfo.day,
              comment_text: commentText,
              level: this.currentCellInfo.level // نحتاج المستوى من الجدول
          };
  
          console.log('📤 [FACULTY] Request body:', requestBody);
          
          try {
              // ✅ تغيير مسار الـ API إلى /faculty
              const response = await fetch(`${API_BASE}/comments/faculty`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                  },
                  body: JSON.stringify(requestBody)
              });
              // --- نهاية التعديل ---
  
              const data = await response.json();
  
              if (response.ok) {
                  alert('✅ Comment submitted successfully!');
                  const modal = bootstrap.Modal.getInstance(document.getElementById('commentModal'));
                  modal.hide();
                  this.clearCommentForm();
              } else {
                  throw new Error(data.error || 'Failed to save comment');
              }
          } catch (error) {
              console.error('❌ [FACULTY] Error saving comment:', error);
              alert('❌ Failed to save comment: ' + error.message);
          } finally {
              saveBtn.disabled = false;
              saveBtn.innerHTML = '<i class="bi bi-send"></i> Submit Comment';
          }
      }
  
      clearCommentForm() {
          document.getElementById('commentText').value = '';
          this.currentCellInfo = null;
      }
  }
  
  // Initialize
  const facultyCommentMaker = new FacultyCommentMaker();
  document.addEventListener('DOMContentLoaded', () => {
      facultyCommentMaker.init();
  });
  
  // ✅ تغيير الاسم العام
  window.facultyCommentMaker = facultyCommentMaker;
  
  console.log('✅ faculty-comment-maker.js loaded');})();
