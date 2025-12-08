// student-comments.js
(function() {
  'use strict';

  // Student Comment System
  
  const API_BASE = window.API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '')
    ? 'http://localhost:4000/api'
    : '/api';
  
  class StudentCommentManager {
      constructor() {
          this.currentCellInfo = null;
          this.studentData = null;
          this.userData = null;
      }
  
      init() {
          console.log('🚀 Initializing student comment system...');

          // Get user data
          const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
          const studentDataStr = localStorage.getItem('studentData');

          // Always setup event listeners first!
          this.setupEventListeners();

          if (!userStr) {
              console.error('❌ No user data found in session/local storage');
              return;
          }

          try {
              this.userData = JSON.parse(userStr);
              console.log('✅ User data loaded:', this.userData.email);

              if (studentDataStr) {
                  this.studentData = JSON.parse(studentDataStr);
                  console.log('✅ Student data loaded:', this.studentData.student_id);
              } else {
                  console.warn('⚠️ No student data in localStorage yet, will try to fetch...');
                  this.fetchStudentData();
              }

          } catch (error) {
              console.error('❌ Error initializing comment system:', error);
          }
      }

      async fetchStudentData() {
          if (!this.userData || !this.userData.id) {
              console.error('❌ Cannot fetch student data - no user ID');
              return;
          }

          try {
              console.log(`📡 Fetching student data for user ID: ${this.userData.id}`);

              const token = sessionStorage.getItem('token') || localStorage.getItem('token');
              const response = await fetch(`${API_BASE}/student/${this.userData.id}`, {
                  headers: {
                      'Authorization': `Bearer ${token}`
                  }
              });

              if (response.ok) {
                  const data = await response.json();
                  this.studentData = data;
                  localStorage.setItem('studentData', JSON.stringify(data));
                  console.log('✅ Student data fetched and cached:', data.student_id);
              } else {
                  console.error('❌ Failed to fetch student data:', response.status);
              }
          } catch (error) {
              console.error('❌ Error fetching student data:', error);
          }
      }
  
      setupEventListeners() {
          console.log('🔗 Setting up event listeners...');

          // Save comment button
          const saveCommentBtn = document.getElementById('saveCommentBtn');
          if (saveCommentBtn) {
              saveCommentBtn.addEventListener('click', () => this.saveComment());
              console.log('✅ Submit button listener attached');
          } else {
              console.error('❌ saveCommentBtn not found in DOM');
          }
  
          // Clear form when modal closes
          const commentModal = document.getElementById('commentModal');
          if (commentModal) {
              commentModal.addEventListener('hidden.bs.modal', () => {
                  this.clearCommentForm();
              });
          }
      }
  
      /**
       * Open comment modal for a specific course cell
       */
      openCommentModal(courseData) {
          this.currentCellInfo = courseData;
  
          console.log('📝 Opening comment modal for:', courseData);
  
          // Fill modal with course info
          document.getElementById('modalCourseName').textContent = 
              courseData.courseName || courseData.courseCode;
          document.getElementById('modalTimeSlot').textContent = 
              `${courseData.day}, ${courseData.timeSlot}`;
  
          // Clear previous comment
          document.getElementById('commentText').value = '';
  
          // Show modal
          const modal = new bootstrap.Modal(document.getElementById('commentModal'));
          modal.show();
      }
  
      async saveComment() {
          console.log('💾 Save comment button clicked');

          if (!this.currentCellInfo) {
              alert('❌ Error: No course selected');
              return;
          }

          if (!this.studentData || !this.studentData.student_id) {
              alert('❌ Error: Student data not loaded. Please refresh the page and try again.');
              console.error('❌ Student data missing:', this.studentData);
              return;
          }

          const commentText = document.getElementById('commentText').value.trim();

          if (!commentText || commentText.length < 5) {
              alert('⚠️ Please enter at least 5 characters');
              return;
          }

          console.log('📝 [FRONTEND] Preparing to save comment...');
          console.log('📝 [FRONTEND] Student data:', this.studentData);
          console.log('📝 [FRONTEND] Cell info:', this.currentCellInfo);
  
          const saveBtn = document.getElementById('saveCommentBtn');
          saveBtn.disabled = true;
          saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
  
          const requestBody = {
              student_id: this.studentData.student_id,
              course_code: this.currentCellInfo.courseCode,
              course_name: this.currentCellInfo.courseName,
              time_slot: this.currentCellInfo.timeSlot,
              day: this.currentCellInfo.day,
              comment_text: commentText
          };
  
          console.log('📤 [FRONTEND] Request body:', requestBody);
          console.log('📤 [FRONTEND] API URL:', `${API_BASE}/comments`);
          console.log('📤 [FRONTEND] Token:', sessionStorage.getItem('token') ? 'Present' : 'Missing');
  
          try {
              const response = await fetch(`${API_BASE}/comments`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                  },
                  body: JSON.stringify(requestBody)
              });
  
              console.log('📥 [FRONTEND] Response status:', response.status);
              console.log('📥 [FRONTEND] Response ok:', response.ok);
  
              const data = await response.json();
              console.log('📥 [FRONTEND] Response data:', data);
  
              if (response.ok) {
                  // Success
                  alert('✅ Comment submitted successfully!');
                  console.log('✅ [FRONTEND] Comment saved successfully');
                  
                  // Close modal
                  const modal = bootstrap.Modal.getInstance(document.getElementById('commentModal'));
                  modal.hide();
  
                  // Clear form
                  this.clearCommentForm();
  
                  // Visual feedback
                  this.markCellAsCommented(this.currentCellInfo);
              } else {
                  throw new Error(data.error || 'Failed to save comment');
              }
          } catch (error) {
              console.error('❌ [FRONTEND] Error saving comment:', error);
              console.error('❌ [FRONTEND] Error details:', error.message);
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
  
      markCellAsCommented(cellInfo) {
          console.log('✅ Comment saved for:', cellInfo.courseCode);
          // Optional: Add visual indicator
      }
  
      /**
       * Load student's previous comments
       */
      async loadMyComments() {
          if (!this.studentData) return [];
  
          try {
              const response = await fetch(
                  `${API_BASE}/comments/student/${this.studentData.student_id}`,
                  {
                      headers: {
                          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                      }
                  }
              );
  
              const data = await response.json();
  
              if (response.ok) {
                  return data.data || [];
              } else {
                  console.error('❌ Error loading comments:', data.error);
                  return [];
              }
          } catch (error) {
              console.error('❌ Error fetching comments:', error);
              return [];
          }
      }
  }
  
  // Initialize
  const commentManager = new StudentCommentManager();
  document.addEventListener('DOMContentLoaded', () => {
      commentManager.init();
  });
  
  // Make available globally
  window.commentManager = commentManager;
  
  console.log('✅ student-comments.js loaded');
})();
