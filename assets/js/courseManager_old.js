// ============================================
// Course Manager - IMPROVED VERSION
// Features:
// - Prerequisites can be typed (credit hours)
// - Filter prerequisites by level
// - Show selected prerequisites
// - Optional level field
// ============================================

class CourseManager {
    constructor() {
        this.formCounter = 0;
        this.allCourses = [];
    }

    async loadAllCoursesForPrerequisites() {
        try {
            if (typeof APIClient === 'undefined') {
                console.error('❌ APIClient not loaded yet!');
                return;
            }
            
            const response = await APIClient.get('/all-courses');
            this.allCourses = response.courses || [];
            console.log('✅ Loaded courses for prerequisites:', this.allCourses.length);
        } catch (error) {
            console.error('Error loading courses:', error);
            if (window.NotificationManager) {
                NotificationManager.error('Failed to load courses: ' + error.message);
            }
        }
    }

    addCourseForm() {
        this.formCounter++;
        window.courseFormCounter = this.formCounter;
        const formId = this.formCounter;
        
        const container = document.getElementById('coursesContainer');
        
        const courseForm = document.createElement('div');
        courseForm.className = 'card mb-3 course-form-card';
        courseForm.id = `courseForm_${formId}`;
        courseForm.innerHTML = `
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                <h6 class="mb-0"><i class="bi bi-book-fill"></i> Course #${formId}</h6>
                <button type="button" class="btn btn-sm btn-danger" onclick="window.courseManager.removeCourseForm(${formId})">
                    <i class="bi bi-trash"></i> Remove
                </button>
            </div>
            <div class="card-body">
                ${this.generateCourseFormFields(formId)}
            </div>
        `;
        
        container.appendChild(courseForm);
        this.populatePrerequisitesDropdown(formId);
    }

    generateCourseFormFields(formId) {
        return `
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label fw-bold">Course Name *</label>
                        <input type="text" class="form-control" id="courseName_${formId}" 
                               placeholder="e.g., General Physics (1)" 
                               onblur="window.courseManager.checkCourseExists(${formId}, 'name')"
                               required />
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label fw-bold">Course Code *</label>
                        <input type="text" class="form-control" id="courseCode_${formId}" 
                               placeholder="e.g., PHYS103" 
                               onblur="window.courseManager.checkCourseExists(${formId}, 'code')"
                               required />
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-3">
                    <div class="mb-3">
                        <label class="form-label fw-bold">Credit Hours *</label>
                        <select class="form-control" id="creditHours_${formId}" required>
                            <option value="">Select hours</option>
                            <option value="1">1 Credit Hour</option>
                            <option value="2">2 Credit Hours</option>
                            <option value="3">3 Credit Hours</option>
                            <option value="4">4 Credit Hours</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="mb-3">
                        <label class="form-label fw-bold">Duration (hours/week) *
                            <small class="text-muted d-block">Use 0 for independent study</small>
                        </label>
                        <input type="number" class="form-control" id="duration_${formId}" 
                               placeholder="e.g., 5 (or 0)" min="0" max="10" required 
                               onchange="window.courseManager.validatePatternHours(${formId})" />
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="mb-3">
                        <label class="form-label fw-bold">Is Elective? *</label>
                        <select class="form-control" id="isElective_${formId}" required>
                            <option value="false">No (Required)</option>
                            <option value="true">Yes (Elective)</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="mb-3">
                        <label class="form-label fw-bold">Course Pattern *</label>
                        <select class="form-control" id="coursePattern_${formId}" 
                                onchange="window.courseManager.updatePatternInfo(${formId})" required>
                            <option value="">Select Pattern</option>
                            <option value="lecture_only">Lecture Only</option>
                            <option value="lecture_tutorial">Lecture + Tutorial</option>
                            <option value="lecture_lab">Lecture + Lab</option>
                            <option value="lecture_lab_tutorial">Lecture + Lab + Tutorial</option>
                            <option value="lab_only">Lab Only</option>
                            <option value="independent_study">Independent Study (Graduation Project)</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label fw-bold">Department *</label>
                        <select class="form-control" id="department_${formId}" required>
                            <option value="">Select Department</option>
                            <option value="Physics & Astronomy">Physics & Astronomy</option>
                            <option value="Computer Science">Computer Science</option>
                            <option value="Software Engineering">Software Engineering</option>
                            <option value="Information Technology">Information Technology</option>
                            <option value="Information Systems">Information Systems</option>
                            <option value="Mathematics">Mathematics</option>
                            <option value="Computer engineering">Computer engineering</option>
                            <option value="Botany & Microbiology">Botany & Microbiology</option>
                            <option value="Islamic Culture">Islamic Culture</option>
                            <option value="Islamic study">Islamic study</option>
                             <option value="OPER">Statistics & Operations Research</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label fw-bold">College *</label>
                        <select class="form-control" id="college_${formId}" required>
                            <option value="">Select College</option>
                            <option value="Computer and Information Sciences">Computer and Information Sciences</option>
                            <option value="Sciences">Sciences</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Business Administration">Business Administration</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label fw-bold">Level (Optional)</label>
                        <select class="form-control" id="level_${formId}" 
                                onchange="window.courseManager.updatePrerequisitesBasedOnLevel(${formId})">
                            <option value="">Not specified</option>
                            <option value="3">Level 3</option>
                            <option value="4">Level 4</option>
                            <option value="5">Level 5</option>
                            <option value="6">Level 6</option>
                            <option value="7">Level 7</option>
                            <option value="8">Level 8</option>
                        </select>
                        <small class="form-text text-muted">Select level to filter available prerequisites</small>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label fw-bold">Prerequisites</label>
                        <p class="text-muted mb-2" style="font-size: 0.875rem;">
                            <i class="bi bi-info-circle"></i> Select from courses below or add credit hours requirement
                        </p>
                    </div>
                </div>
            </div>

            <!-- Selected Prerequisites -->
            <div class="row">
                <div class="col-12">
                    <div class="mb-3">
                        <label class="form-label fw-bold">Selected Prerequisites:</label>
                        <div id="selectedPrereqs_${formId}" class="border rounded p-2" style="min-height: 50px;">
                            <span class="text-muted"><i class="bi bi-info-circle"></i> No prerequisites selected</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Prerequisites Dropdown -->
            <div class="row">
                <div class="col-12">
                    <div class="mb-3">
                        <label class="form-label fw-bold">Select from Existing Courses:</label>
                        <div class="d-flex gap-2 mb-2">
                            <button type="button" class="btn btn-sm btn-outline-secondary" 
                                    onclick="window.courseManager.showAddHoursModal(${formId})"
                                    title="Want to add hours instead?">
                                <i class="bi bi-clock"></i> Add Credit Hours Requirement
                            </button>
                        </div>
                        <input type="text" class="form-control mb-2" id="prereqSearch_${formId}" 
                               placeholder="Search courses..." 
                               onkeyup="window.courseManager.filterPrerequisites(${formId})">
                        <div id="prerequisites_${formId}" class="border rounded p-2" 
                             style="max-height: 200px; overflow-y: auto;">
                            Loading courses...
                        </div>
                    </div>
                </div>
            </div>

            <!-- Pattern Details -->
            <div id="patternDetails_${formId}" class="row" style="display: none;">
                <div class="col-12">
                    <div class="alert alert-secondary">
                        <h6 class="fw-bold">Pattern Details</h6>
                        <div class="row">
                            <div class="col-md-4">
                                <label class="form-label">Lecture Hours</label>
                                <input type="number" class="form-control" id="lectureHours_${formId}" 
                                       min="0" max="10" value="0" 
                                       onchange="window.courseManager.validatePatternHours(${formId})" />
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Lab Hours</label>
                                <input type="number" class="form-control" id="labHours_${formId}" 
                                       min="0" max="10" value="0" 
                                       onchange="window.courseManager.validatePatternHours(${formId})" />
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Tutorial Hours</label>
                                <input type="number" class="form-control" id="tutorialHours_${formId}" 
                                       min="0" max="10" value="0" 
                                       onchange="window.courseManager.validatePatternHours(${formId})" />
                            </div>
                        </div>
                        <div class="mt-2">
                            <span id="patternValidation_${formId}" class="text-danger"></span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Exam Information (Optional) -->
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Exam Date (Optional)</label>
                        <input type="date" class="form-control" id="examDate_${formId}" />
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Exam Time (Optional)</label>
                        <input type="time" class="form-control" id="examTime_${formId}" />
                    </div>
                </div>
            </div>
        `;
    }

    // Show modal to add credit hours requirement
    showAddHoursModal(formId) {
        const hours = prompt('Enter credit hours requirement (e.g., "3" or "3 hours"):');
        
        if (!hours) {
            return; // User cancelled
        }
        
        const hoursText = hours.trim();
        if (!hoursText) {
            alert('Please enter a valid credit hours requirement');
            return;
        }
        
        // Format the text nicely
        let formattedHours = hoursText;
        if (!hoursText.toLowerCase().includes('hour')) {
            // If user just typed a number, add "credit hours"
            const num = parseInt(hoursText);
            if (!isNaN(num)) {
                formattedHours = `${num} credit hour${num !== 1 ? 's' : ''}`;
            }
        }
        
        this.addSelectedPrerequisite(formId, formattedHours, true);
    }

    // Add manual prerequisite (for backward compatibility)
    addManualPrerequisite(formId) {
        this.showAddHoursModal(formId);
    }

    // Add selected prerequisite badge
    addSelectedPrerequisite(formId, value, isManual = false) {
        const container = document.getElementById(`selectedPrereqs_${formId}`);
        
        // Clear "no prerequisites" message
        if (container.querySelector('.text-muted')) {
            container.innerHTML = '';
        }
        
        // Check if already added
        if (container.querySelector(`[data-prereq="${value}"]`)) {
            return;
        }
        
        const badge = document.createElement('span');
        badge.className = 'selected-prereq-badge';
        badge.setAttribute('data-prereq', value);
        badge.setAttribute('data-manual', isManual);
        badge.innerHTML = `
            ${value}
            <span class="remove-prereq" onclick="window.courseManager.removeSelectedPrerequisite(${formId}, '${value}')">×</span>
        `;
        
        container.appendChild(badge);
        
        // Uncheck "No prerequisites" if checked
        const noneCheckbox = document.getElementById(`prereq_none_${formId}`);
        if (noneCheckbox) {
            noneCheckbox.checked = false;
        }
    }

    // Remove selected prerequisite
    removeSelectedPrerequisite(formId, value) {
        const container = document.getElementById(`selectedPrereqs_${formId}`);
        const badge = container.querySelector(`[data-prereq="${value}"]`);
        
        if (badge) {
            const isManual = badge.getAttribute('data-manual') === 'true';
            badge.remove();
            
            // Uncheck the corresponding checkbox if not manual
            if (!isManual) {
                const checkboxes = document.querySelectorAll(`.prereq-checkbox-${formId}`);
                checkboxes.forEach(cb => {
                    if (cb.value === value) {
                        cb.checked = false;
                    }
                });
            }
        }
        
        // If no prerequisites left, show message
        if (container.children.length === 0) {
            container.innerHTML = '<span class="text-muted"><i class="bi bi-info-circle"></i> No prerequisites selected</span>';
        }
    }

    // Get all selected prerequisites
    getSelectedPrerequisites(formId) {
        const container = document.getElementById(`selectedPrereqs_${formId}`);
        const badges = container.querySelectorAll('.selected-prereq-badge');
        return Array.from(badges).map(badge => badge.getAttribute('data-prereq'));
    }

    // Update prerequisites based on selected level
    updatePrerequisitesBasedOnLevel(formId) {
        this.populatePrerequisitesDropdown(formId);
    }

    updatePatternInfo(formId) {
        const patternType = document.getElementById(`coursePattern_${formId}`).value;
        const detailsDiv = document.getElementById(`patternDetails_${formId}`);
        const lectureInput = document.getElementById(`lectureHours_${formId}`);
        const labInput = document.getElementById(`labHours_${formId}`);
        const tutorialInput = document.getElementById(`tutorialHours_${formId}`);
        const durationInput = document.getElementById(`duration_${formId}`);

        if (!patternType) {
            detailsDiv.style.display = 'none';
            return;
        }

        // For independent study, hide pattern details and suggest Duration = 0
        if (patternType === 'independent_study') {
            detailsDiv.style.display = 'none';
            
            // Auto-set Duration to 0 for independent study
            if (durationInput) {
                durationInput.value = '0';
                const validationSpan = document.getElementById(`patternValidation_${formId}`);
                if (validationSpan) {
                    validationSpan.textContent = 'ℹ️ Independent study courses have no scheduled hours';
                    validationSpan.className = 'text-info';
                }
            }
            return;
        }

        detailsDiv.style.display = 'block';

        // Set default values based on pattern
        switch (patternType) {
            case 'lecture_only':
                lectureInput.value = '3';
                labInput.value = '0';
                tutorialInput.value = '0';
                break;
            case 'lecture_tutorial':
                lectureInput.value = '2';
                labInput.value = '0';
                tutorialInput.value = '1';
                break;
            case 'lecture_lab':
                lectureInput.value = '2';
                labInput.value = '3';
                tutorialInput.value = '0';
                break;
            case 'lecture_lab_tutorial':
                lectureInput.value = '2';
                labInput.value = '2';
                tutorialInput.value = '1';
                break;
            case 'lab_only':
                lectureInput.value = '0';
                labInput.value = '3';
                tutorialInput.value = '0';
                break;
            case 'custom':
                lectureInput.value = '0';
                labInput.value = '0';
                tutorialInput.value = '0';
                break;
        }

        this.validatePatternHours(formId);
    }

    validatePatternHours(formId) {
        const duration = parseInt(document.getElementById(`duration_${formId}`).value) || 0;
        const patternType = document.getElementById(`coursePattern_${formId}`).value;
        const validationSpan = document.getElementById(`patternValidation_${formId}`);

        // For independent study or Duration = 0, no validation needed
        if (duration === 0 || patternType === 'independent_study') {
            validationSpan.textContent = 'ℹ️ Independent study courses have no scheduled hours';
            validationSpan.className = 'text-info';
            return;
        }

        const lectureHours = parseInt(document.getElementById(`lectureHours_${formId}`).value) || 0;
        const labHours = parseInt(document.getElementById(`labHours_${formId}`).value) || 0;
        const tutorialHours = parseInt(document.getElementById(`tutorialHours_${formId}`).value) || 0;
        const totalPatternHours = lectureHours + labHours + tutorialHours;

        if (totalPatternHours === duration) {
            validationSpan.textContent = `✓ Pattern hours match duration (${totalPatternHours}/${duration})`;
            validationSpan.className = 'text-success';
        } else {
            validationSpan.textContent = `✗ Pattern hours (${totalPatternHours}) don't match duration (${duration})`;
            validationSpan.className = 'text-danger';
        }
    }

    async checkCourseExists(formId, type) {
        const value = type === 'name' 
            ? document.getElementById(`courseName_${formId}`).value.trim()
            : document.getElementById(`courseCode_${formId}`).value.trim().toUpperCase();

        if (!value) return;

        try {
            const response = await APIClient.get('/all-courses');
            const courses = response.courses || [];
            
            const exists = courses.some(course => {
                if (type === 'name') {
                    return course.name.toLowerCase() === value.toLowerCase();
                } else {
                    return course.code.toUpperCase() === value;
                }
            });

            const inputElement = document.getElementById(type === 'name' ? `courseName_${formId}` : `courseCode_${formId}`);
            
            if (exists) {
                inputElement.classList.add('is-invalid');
                alert(`⚠️ A course with this ${type} already exists!`);
            } else {
                inputElement.classList.remove('is-invalid');
            }
        } catch (error) {
            console.error('Error checking course existence:', error);
        }
    }

    filterPrerequisites(formId) {
        const searchTerm = document.getElementById(`prereqSearch_${formId}`).value.toLowerCase();
        const items = document.querySelectorAll(`#prerequisites_${formId} .prereq-item`);
        
        items.forEach(item => {
            const text = item.getAttribute('data-course-text') || '';
            if (text.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    toggleNoPrerequisites(formId) {
        const noneCheckbox = document.getElementById(`prereq_none_${formId}`);
        const otherCheckboxes = document.querySelectorAll(`.prereq-checkbox-${formId}`);
        
        if (noneCheckbox.checked) {
            // Clear all selected prerequisites
            const container = document.getElementById(`selectedPrereqs_${formId}`);
            container.innerHTML = '<span class="text-muted"><i class="bi bi-info-circle"></i> No prerequisites selected</span>';
            
            otherCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
    }

    uncheckNoPrerequisites(formId) {
        const noneCheckbox = document.getElementById(`prereq_none_${formId}`);
        if (noneCheckbox) {
            noneCheckbox.checked = false;
        }
    }

    removeCourseForm(formId) {
        const form = document.getElementById(`courseForm_${formId}`);
        if (form) {
            form.remove();
        }
    }

    async createAllCourses() {
        const courseForms = document.querySelectorAll('.course-form-card');
        
        if (courseForms.length === 0) {
            alert('Please add at least one course first');
            return;
        }

        const courses = [];
        const errors = [];

        courseForms.forEach(form => {
            const formId = parseInt(form.id.split('_')[1]);
            const courseData = this.validateCourseForm(formId);
            
            if (courseData) {
                courses.push(courseData);
            } else {
                errors.push(`Course #${formId} has missing required fields`);
            }
        });

        if (errors.length > 0) {
            alert('Please fix the following errors:\n\n' + errors.join('\n'));
            return;
        }

        if (courses.length === 0) {
            alert('No valid courses to create');
            return;
        }

        const confirmMsg = `Are you sure you want to create ${courses.length} course(s)?\n\n` +
            courses.map(c => `• ${c.code} - ${c.name}`).join('\n');
        
        if (!confirm(confirmMsg)) {
            return;
        }

        let successCount = 0;
        let failCount = 0;
        const results = [];

        for (const course of courses) {
            try {
                const response = await fetch(`${window.API_URL}/create-course`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(course)
                });

                const data = await response.json();

                if (response.ok) {
                    successCount++;
                    results.push(`✅ ${course.code}: Created successfully`);
                } else {
                    failCount++;
                    results.push(`❌ ${course.code}: ${data.error || 'Failed'}`);
                }
            } catch (error) {
                failCount++;
                results.push(`❌ ${course.code}: Connection error`);
            }
        }

        alert(`Course Creation Complete!\n\n` +
              `✅ Successful: ${successCount}\n` +
              `❌ Failed: ${failCount}\n\n` +
              `Details:\n${results.join('\n')}`);

        if (successCount > 0) {
            document.getElementById('coursesContainer').innerHTML = '';
            this.formCounter = 0;
            window.courseFormCounter = 0;
            await this.loadAllCoursesForPrerequisites();
        }
    }

    validateCourseForm(formId) {
  const courseName = document.getElementById(`courseName_${formId}`).value.trim();
  const courseCode = document.getElementById(`courseCode_${formId}`).value.trim();
  const creditHours = document.getElementById(`creditHours_${formId}`).value;
  const duration = document.getElementById(`duration_${formId}`).value;
  const isElective = document.getElementById(`isElective_${formId}`).value;
  const department = document.getElementById(`department_${formId}`).value;
  const college = document.getElementById(`college_${formId}`).value;
  const level = document.getElementById(`level_${formId}`).value;
  const patternType = document.getElementById(`coursePattern_${formId}`).value;

  // Validate required fields
  if (!courseName || !courseCode || !creditHours || duration === '' || duration === null || !department || !college || !patternType) {
    return null;
  }

  const durationValue = parseInt(duration);
  const isIndependentStudy = patternType === 'independent_study' || durationValue === 0;
  
  let pattern = null;
  
  if (!isIndependentStudy) {
    const lectureHours = parseInt(document.getElementById(`lectureHours_${formId}`).value) || 0;
    const labHours = parseInt(document.getElementById(`labHours_${formId}`).value) || 0;
    const tutorialHours = parseInt(document.getElementById(`tutorialHours_${formId}`).value) || 0;
    const totalPatternHours = lectureHours + labHours + tutorialHours;

    if (totalPatternHours !== durationValue) {
      alert(`Pattern hours (${totalPatternHours}) don't match duration (${durationValue}). Please adjust the pattern.`);
      return null;
    }
    
    pattern = {
      type: patternType,
      lecture_hours: lectureHours,
      lab_hours: labHours,
      tutorial_hours: tutorialHours,
      total_hours: totalPatternHours
    };
  }

  // Get separated prerequisites
  const { prerequisites, hourPrerequisites } = this.getSeparatedPrerequisites(formId);

  const courseData = {
    name: courseName,
    code: courseCode.toUpperCase(),
    credit_hours: parseInt(creditHours),
    Duration: durationValue,
    is_elective: isElective === 'true',
    department: department,
    college: college,
    prerequisites: prerequisites, // Course codes - will be converted to ObjectIds in backend
    hour_prerequisites: hourPrerequisites, // Credit hours only
    exam_date: document.getElementById(`examDate_${formId}`).value.trim() || null,
    exam_time: document.getElementById(`examTime_${formId}`).value.trim() || null,
    pattern: pattern,
    section: [null]
  };

  // Add level only if specified
  if (level) {
    courseData.level = parseInt(level);
  }

  return courseData;
}

// Add this method to separate prerequisites
getSeparatedPrerequisites(formId) {
  const container = document.getElementById(`selectedPrereqs_${formId}`);
  const badges = container.querySelectorAll('.selected-prereq-badge');
  
  const prerequisites = []; // Course codes
  const hourPrerequisites = []; // Credit hours text
  
  badges.forEach(badge => {
    const value = badge.getAttribute('data-prereq');
    const isManual = badge.getAttribute('data-manual') === 'true';
    
    // Check if it's a course code (2-4 letters + 3-4 digits)
    const isCourseCode = /^[A-Z]{2,4}\d{3,4}$/i.test(value);
    
    if (isCourseCode && !isManual) {
      prerequisites.push(value);
    } else {
      hourPrerequisites.push(value);
    }
  });
  
  return { prerequisites, hourPrerequisites };
}

    populatePrerequisitesDropdown(formId) {
        const container = document.getElementById(`prerequisites_${formId}`);
        if (!container) return;
        
        const selectedLevel = document.getElementById(`level_${formId}`).value;
        
        container.innerHTML = `
            <div class="form-check prereq-item" data-course-text="no prerequisites">
                <input class="form-check-input" type="checkbox" value="" 
                       id="prereq_none_${formId}" 
                       onchange="window.courseManager.toggleNoPrerequisites(${formId})">
                <label class="form-check-label" for="prereq_none_${formId}">
                    <strong>No prerequisites</strong>
                </label>
            </div>
            <hr class="my-2">
        `;
        
        // Filter courses based on level
        let filteredCourses = this.allCourses;
        if (selectedLevel) {
            filteredCourses = this.allCourses.filter(course => {
                // Don't show courses of the same level or higher
                return !course.level || parseInt(course.level) < parseInt(selectedLevel);
            });
        }
        
        if (filteredCourses.length === 0) {
            container.innerHTML += '<div class="text-muted p-2">No courses available as prerequisites</div>';
            return;
        }
        
        filteredCourses.forEach((course, index) => {
            const checkbox = document.createElement('div');
            checkbox.className = 'form-check prereq-item';
            checkbox.setAttribute('data-course-text', `${course.code} ${course.name}`.toLowerCase());
            checkbox.innerHTML = `
                <input class="form-check-input prereq-checkbox-${formId}" 
                       type="checkbox" value="${course.code}" 
                       id="prereq_${formId}_${index}" 
                       onchange="window.courseManager.handlePrereqCheckbox(${formId}, '${course.code}')">
                <label class="form-check-label" for="prereq_${formId}_${index}">
                    <strong>${course.code}</strong> - ${course.name}
                    ${course.level ? `<span class="badge bg-secondary ms-2">L${course.level}</span>` : ''}
                </label>
            `;
            container.appendChild(checkbox);
        });
    }

    // Handle prerequisite checkbox change
    handlePrereqCheckbox(formId, courseCode) {
        const checkbox = document.querySelector(`input[value="${courseCode}"].prereq-checkbox-${formId}`);
        
        if (checkbox.checked) {
            this.addSelectedPrerequisite(formId, courseCode, false);
        } else {
            this.removeSelectedPrerequisite(formId, courseCode);
        }
    }

    reset() {
        document.getElementById('coursesContainer').innerHTML = '';
        this.formCounter = 0;
        window.courseFormCounter = 0;
    }
}

// ✅ EXPOSE TO WINDOW
window.courseManager = null;
console.log(' CourseManager loaded');
