// ========================================
// ELECTIVE FORM MANAGER - FIXED VERSION
// Compatible with Friend's Auth System
// ========================================

const API_URL = window.API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '')
  ? 'http://localhost:4000/api'
  : '/api';

class ElectiveFormManager {
    constructor() {
        this.studentData = null;
        this.userData = null;
        this.selectedCourses = [];
        this.allCourses = [];
        this.formStatus = 'idle';
        this.formDeadline = null;
        this.coursesTaken = [];
        this.existingSubmission = null;
        this.isFormActive = false;
        this.hasLoadedTakenCourses = false;
    }

    async init() {
        // Get user data from sessionStorage (friend's auth system)
        const userStr = sessionStorage.getItem('user');
        if (!userStr) {
            window.location.href = 'LoginReg.html';
            return;
        }
        
        try {
            this.userData = JSON.parse(userStr);
            console.log('👤 Logged in user:', this.userData);
            
            // Fetch student data using userID from User table
            // FIXED: Changed from /api/student-profile to /api/student
            await this.fetchStudentData();
            
            if (!this.studentData) {
                alert('Student profile not found. Please contact administration.');
                return;
            }
            
            this.updateWelcomeMessage();
            
            // Load taken courses FIRST
            await this.fetchStudentCoursesTaken();
            
            // Check form status
            await this.checkFormStatus();
            
            // Setup event listener for elective tab
            const electiveTab = document.getElementById('elective-tab');
            if (electiveTab) {
                electiveTab.addEventListener('click', () => {
                    this.loadElectiveForm();
                });
            }
        } catch (error) {
            console.error('❌ Initialization error:', error);
            alert('Error loading student data. Please try logging in again.');
            sessionStorage.clear();
            window.location.href = 'LoginReg.html';
        }
    }

    async fetchStudentData() {
        try {
            // FIXED: Changed endpoint from /student-profile to /student
            const response = await fetch(`${API_URL}/student/${this.userData.id}`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Student not found`);
            }
            
            const data = await response.json();
            
            // Map student data to expected format
            this.studentData = {
                student_id: data.student_id,
                user_id: data.user_id,
                first_name: this.userData.First_Name,
                last_name: this.userData.Last_Name,
                level: data.level,
                courses_taken: data.courses_taken || [],
                user_elective_choice: data.user_elective_choice || [],
                irregulars: data.irregulars || false
            };
            
            console.log('✅ Student data loaded:', this.studentData);
            
        } catch (error) {
            console.error('❌ Error fetching student data:', error);
            this.studentData = null;
        }
    }

    async fetchStudentCoursesTaken() {
        try {
            if (!this.studentData) {
                console.warn('⚠️ No student data available');
                return;
            }
            
            // Courses taken already loaded from fetchStudentData
            this.coursesTaken = this.studentData.courses_taken || [];
            this.hasLoadedTakenCourses = true;
            
            console.log(`✅ Loaded ${this.coursesTaken.length} taken courses:`, this.coursesTaken);
            
        } catch (error) {
            console.error('❌ Error fetching student courses:', error);
            this.coursesTaken = [];
            this.hasLoadedTakenCourses = false;
        }
    }

    async checkFormStatus() {
        try {
            if (!this.studentData) return false;
            
            const response = await fetch(`${API_URL}/student-electives/${this.studentData.student_id}`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            this.isFormActive = data.form_active;
            
            if (data.form_active && data.submission && data.submission.submission_status === 'submitted') {
                this.showAlreadySubmittedState(data.submission);
                return true;
            }
            
            if (!data.form_active) {
                this.showFormInactive(data.message);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error checking form status:', error);
            return false;
        }
    }

    updateWelcomeMessage() {
        // Update welcome message if elements exist
        const welcomeName = document.getElementById('welcomeName');
        const studentLevel = document.getElementById('studentLevel');
        const studentId = document.getElementById('studentId');
        
        if (welcomeName && this.studentData.first_name) {
            welcomeName.textContent = this.studentData.first_name;
        }
        
        if (studentLevel && this.studentData.level) {
            studentLevel.textContent = this.studentData.level;
        }
        
        if (studentId && this.studentData.student_id) {
            studentId.textContent = this.studentData.student_id;
        }
    }

    async loadElectiveForm() {
        const shouldBlockForm = await this.checkFormStatus();
        if (shouldBlockForm) {
            return;
        }
        
        if (this.allCourses.length > 0) return;
        
        try {
            const response = await fetch(`${API_URL}/elective-courses`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                this.showFormInactive(data.error || 'Form is not active');
                return;
            }
            
            if (!this.hasLoadedTakenCourses) {
                await this.fetchStudentCoursesTaken();
            }
            
            const originalCount = data.courses.length;
            this.allCourses = this.filterOutTakenCourses(data.courses);
            const filteredCount = originalCount - this.allCourses.length;
            
            console.log(`📊 Course filtering: ${originalCount} total, ${filteredCount} taken, ${this.allCourses.length} available`);
            
            this.formDeadline = new Date(data.deadline);
            this.isFormActive = true;
            
            if (!this.isBeforeDeadline()) {
                this.showDeadlinePassed();
                return;
            }
            
            if (this.allCourses.length === 0) {
                this.showNoAvailableCourses(originalCount, filteredCount);
                return;
            }
            
            this.renderCourses(originalCount, filteredCount);
            this.setupEventListeners();
            await this.checkExistingSubmission();
            
        } catch (error) {
            console.error('Error loading elective form:', error);
            const coursesList = document.getElementById('coursesList');
            if (coursesList) {
                coursesList.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i> Failed to load elective form: ${error.message}
                    </div>
                `;
            }
        }
    }

    filterOutTakenCourses(courses) {
        if (!this.coursesTaken || this.coursesTaken.length === 0) {
            console.log('⚠️ No taken courses data - showing all elective courses');
            return courses;
        }
        
        const availableCourses = courses.filter(course => {
            const isTaken = this.coursesTaken.includes(course.code);
            if (isTaken) {
                console.log(`🚫 Filtered out taken course: ${course.code} - ${course.name}`);
            }
            return !isTaken;
        });
        
        return availableCourses;
    }

    isBeforeDeadline() {
        if (!this.formDeadline) return false;
        const now = new Date();
        return now < this.formDeadline;
    }

    showDeadlinePassed() {
        const coursesList = document.getElementById('coursesList');
        if (!coursesList) return;
        
        const deadlineStr = this.formDeadline.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        coursesList.innerHTML = `
            <div class="alert alert-danger">
                <h5><i class="bi bi-clock"></i> Form Deadline Passed</h5>
                <p>The elective form deadline was on <strong>${deadlineStr}</strong>.</p>
                <p class="mb-0">Submission is no longer allowed.</p>
            </div>
        `;
        
        const submitBtn = document.getElementById('submitElectiveBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-clock"></i> Deadline Passed';
        }
    }

    showFormInactive(message = 'The elective form is not currently available.') {
        const coursesList = document.getElementById('coursesList');
        if (!coursesList) return;
        
        coursesList.innerHTML = `
            <div class="alert alert-warning">
                <h5><i class="bi bi-exclamation-triangle"></i> Form Not Active</h5>
                <p>${message}</p>
                <p class="mb-0">Please check back during the form period.</p>
            </div>
        `;
    }

    showNoAvailableCourses(originalCount, filteredCount) {
        const coursesList = document.getElementById('coursesList');
        if (!coursesList) return;
        
        let message = '';
        if (filteredCount > 0) {
            message = `
                <div class="alert alert-info">
                    <h5><i class="bi bi-info-circle"></i> No Available Elective Courses</h5>
                    <p>There are <strong>${originalCount} elective courses</strong> in total, but:</p>
                    <ul>
                        <li>🚫 <strong>${filteredCount} courses</strong> you've already taken are hidden</li>
                        <li>✅ <strong>0 courses</strong> available for selection</li>
                    </ul>
                    <p class="mb-0">You have completed all available elective courses.</p>
                </div>
            `;
        } else {
            message = `
                <div class="alert alert-warning">
                    <h5><i class="bi bi-exclamation-triangle"></i> No Elective Courses Available</h5>
                    <p>There are currently no elective courses available for your level.</p>
                </div>
            `;
        }
        
        coursesList.innerHTML = message;
    }

    renderCourses(originalCount, filteredCount) {
        const coursesList = document.getElementById('coursesList');
        if (!coursesList) return;
        
        coursesList.innerHTML = '';
        
        // Deadline banner
        if (this.formDeadline) {
            const deadline = new Date(this.formDeadline);
            const now = new Date();
            const timeLeft = deadline - now;
            const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
            const daysLeft = Math.floor(hoursLeft / 24);
            
            const deadlineBanner = document.createElement('div');
            deadlineBanner.className = `alert ${daysLeft < 2 ? 'alert-danger' : 'alert-info'} mb-3`;
            deadlineBanner.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="bi bi-clock-history"></i> <strong>Form Deadline:</strong> 
                        ${deadline.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </div>
                    <div>
                        <strong>${daysLeft > 0 ? daysLeft + ' days' : hoursLeft + ' hours'} remaining</strong>
                    </div>
                </div>
            `;
            coursesList.appendChild(deadlineBanner);
        }
        
        // Filtering info
        if (filteredCount > 0) {
            const filterInfo = document.createElement('div');
            filterInfo.className = 'alert alert-light mb-3';
            filterInfo.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="bi bi-filter"></i> 
                        <strong>Course Filtering Applied:</strong>
                        Showing ${this.allCourses.length} available courses 
                        (${filteredCount} taken courses hidden)
                    </div>
                    <small class="text-muted">
                        Total elective courses: ${originalCount}
                    </small>
                </div>
            `;
            coursesList.appendChild(filterInfo);
        }
        
        // Render courses
        this.allCourses.forEach(course => {
            const courseItem = document.createElement('div');
            courseItem.className = 'course-item';
            courseItem.setAttribute('data-course', course.code);
            courseItem.innerHTML = `
                <div class="course-info">
                    <span class="course-code">${course.code} - ${course.name}</span>
                    <small class="text-muted d-block">${course.department} - ${course.credit_hours} credit hours</small>
                    ${course.description ? `<small class="text-muted d-block mt-1">${course.description}</small>` : ''}
                </div>
                <span class="course-hours">${course.credit_hours} hrs</span>
            `;
            
            courseItem.addEventListener('click', () => {
                this.toggleCourseSelection(course.code, courseItem);
            });
            
            coursesList.appendChild(courseItem);
        });
    }

    async checkExistingSubmission() {
        try {
            if (!this.studentData) return;
            
            const response = await fetch(`${API_URL}/student-electives/${this.studentData.student_id}`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (data.submission) {
                this.existingSubmission = data.submission;
                
                if (data.submission.submission_status === 'submitted') {
                    this.showAlreadySubmittedState(data.submission);
                } else if (data.submission.submission_status === 'draft') {
                    this.formStatus = 'draft';
                    this.selectedCourses = data.submission.selected_courses || [];
                    
                    const suggestionsField = document.getElementById('studentSuggestions');
                    if (suggestionsField) {
                        suggestionsField.value = data.submission.suggestions || '';
                    }
                    
                    this.selectedCourses.forEach(code => {
                        const courseItem = document.querySelector(`.course-item[data-course="${code}"]`);
                        if (courseItem) {
                            courseItem.classList.add('selected');
                            this.addToSelectedList(code, courseItem);
                        }
                    });
                    this.updateCounter();
                }
            }
        } catch (error) {
            console.error('Error checking submission:', error);
        }
    }

    showAlreadySubmittedState(submission) {
        const electiveTab = document.getElementById('elective');
        if (!electiveTab) return;
        
        electiveTab.innerHTML = `
            <div class="dashboard-card">
                <div class="alert alert-success">
                    <h4><i class="bi bi-check-circle"></i> Form Already Submitted</h4>
                    <p>Your elective preferences have been submitted successfully.</p>
                    <p class="mb-0"><small>Submitted on: ${new Date(submission.submitted_at).toLocaleDateString()}</small></p>
                </div>
                
                <div class="submission-details">
                    <h5>Your Submission:</h5>
                    
                    <div class="selected-courses-section mt-3">
                        <h6>Selected Courses:</h6>
                        ${submission.selected_courses.length === 0 
                            ? '<div class="alert alert-light">No courses selected</div>' 
                            : `
                            <div class="selected-courses-list">
                                ${submission.selected_courses.map(code => {
                                    const course = this.allCourses.find(c => c.code === code) || { code: code, name: 'Course' };
                                    return `
                                        <div class="submitted-course-item p-2 mb-2 border rounded">
                                            <strong>${course.code}</strong> - ${course.name}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            `
                        }
                    </div>
                    
                    ${submission.suggestions ? `
                        <div class="suggestions-section mt-3">
                            <h6>Your Suggestions:</h6>
                            <div class="alert alert-light">
                                <p class="mb-0">${submission.suggestions}</p>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    toggleCourseSelection(courseCode, element) {
        if (this.formStatus === 'submitted') return;
        
        const index = this.selectedCourses.indexOf(courseCode);
        
        if (index === -1) {
            this.selectedCourses.push(courseCode);
            element.classList.add('selected');
            this.addToSelectedList(courseCode, element);
        } else {
            this.selectedCourses.splice(index, 1);
            element.classList.remove('selected');
            this.removeFromSelectedList(courseCode);
        }
        
        this.updateCounter();
        this.autosaveDraft();
    }

    addToSelectedList(courseCode, element) {
        const selectedList = document.getElementById('selectedList');
        if (!selectedList) return;
        
        const emptyMsg = selectedList.querySelector('.empty-message');
        if (emptyMsg) emptyMsg.remove();
        
        const courseInfo = element.querySelector('.course-info').innerHTML;
        const selectedItem = document.createElement('div');
        selectedItem.className = 'selected-course';
        selectedItem.setAttribute('data-course', courseCode);
        selectedItem.innerHTML = `
            <div class="course-info">${courseInfo}</div>
            <button class="remove-btn" onclick="electiveForm.removeCourse('${courseCode}')">×</button>
        `;
        
        selectedList.appendChild(selectedItem);
    }

    removeFromSelectedList(courseCode) {
        const selectedItem = document.querySelector(`.selected-course[data-course="${courseCode}"]`);
        if (selectedItem) selectedItem.remove();
        
        const selectedList = document.getElementById('selectedList');
        if (selectedList && selectedList.children.length === 0) {
            selectedList.innerHTML = '<div class="empty-message">No courses selected yet</div>';
        }
    }

    removeCourse(courseCode) {
        const courseItem = document.querySelector(`.course-item[data-course="${courseCode}"]`);
        if (courseItem) {
            this.toggleCourseSelection(courseCode, courseItem);
        }
    }

    updateCounter() {
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = this.selectedCourses.length;
        }
    }

    setupEventListeners() {
        const submitBtn = document.getElementById('submitElectiveBtn');
        if (submitBtn) {
            submitBtn.onclick = () => this.submitSelections();
        }
        
        const suggestionsTextarea = document.getElementById('studentSuggestions');
        if (suggestionsTextarea) {
            suggestionsTextarea.addEventListener('change', () => this.autosaveDraft());
        }
    }

    async autosaveDraft() {
        if (this.formStatus === 'submitted' || !this.isFormActive || !this.studentData) return;
        
        try {
            if (this.formStatus === 'idle') {
                const startResponse = await fetch(`${API_URL}/start-electives/${this.studentData.student_id}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                    }
                });
                
                if (!startResponse.ok) throw new Error('Failed to start form');
                this.formStatus = 'draft';
            }
            
            const suggestions = document.getElementById('studentSuggestions')?.value || '';
            const saveResponse = await fetch(`${API_URL}/save-electives/${this.studentData.student_id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    selected_courses: this.selectedCourses,
                    suggestions: suggestions
                })
            });
            
            if (!saveResponse.ok) {
                console.error('Failed to autosave draft');
            }
        } catch (error) {
            console.error('Autosave error:', error);
        }
    }

    async submitSelections() {
        if (!this.isFormActive) {
            alert('Form is no longer active. Cannot submit.');
            return;
        }

        if (!this.isBeforeDeadline()) {
            this.showDeadlinePassed();
            alert('Cannot submit: The form deadline has passed.');
            return;
        }

        const suggestions = document.getElementById('studentSuggestions')?.value || '';
        
        if (this.selectedCourses.length === 0 && !suggestions.trim()) {
            if (!confirm('You haven\'t selected any courses or provided suggestions. Submit anyway?')) {
                return;
            }
        }

        try {
            const submitBtn = document.getElementById('submitElectiveBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';
            }

            if (this.formStatus === 'idle') {
                const startResponse = await fetch(`${API_URL}/start-electives/${this.studentData.student_id}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                    }
                });
                
                if (!startResponse.ok) {
                    const errorData = await startResponse.json();
                    throw new Error(errorData.error || 'Failed to start form');
                }
            }
            
            const saveResponse = await fetch(`${API_URL}/save-electives/${this.studentData.student_id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    selected_courses: this.selectedCourses,
                    suggestions: suggestions
                })
            });
            
            if (!saveResponse.ok) {
                const errorData = await saveResponse.json();
                throw new Error(errorData.error || 'Failed to save selections');
            }
            
            const submitResponse = await fetch(`${API_URL}/submit-electives/${this.studentData.student_id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });
            
            const data = await submitResponse.json();
            
            if (submitResponse.ok) {
                alert('✓ Elective preferences submitted successfully!');
                this.formStatus = 'submitted';
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                throw new Error(data.error || 'Failed to submit');
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('✗ Failed to submit: ' + error.message);
            
            const submitBtn = document.getElementById('submitElectiveBtn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-send"></i> Submit Elective Preferences';
            }
        }
    }
}

// Initialize
const electiveForm = new ElectiveFormManager();
document.addEventListener('DOMContentLoaded', () => {
    electiveForm.init();
});