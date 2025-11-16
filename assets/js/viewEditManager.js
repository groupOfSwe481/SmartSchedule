// ============================================
// View & Edit Manager - COMPLETE VERSION
// Matches CREATE functionality 100%
// ============================================

class ViewEditManager {
    constructor() {
        this.allCourses = [];
        this.allSections = [];
        this.filteredData = [];
        this.currentView = 'courses';
        this.editingCourse = null;
        this.editingSection = null;
        this.currentFormId = 'edit';
        this.timeSlots = {};
    }

    async initialize() {
        console.log('🔧 Initializing ViewEditManager...');
        await this.loadAllData();
        this.setupEventListeners();
        this.initializeModals();
    }

    setupEventListeners() {
        const viewEditTab = document.getElementById('view-edit-tab');
        if (viewEditTab) {
            viewEditTab.addEventListener('shown.bs.tab', () => {
                this.refreshView();
            });
        }
    }

    initializeModals() {
        if (!document.getElementById('editCourseModal')) {
            this.createEditCourseModal();
        }
        
        if (!document.getElementById('editSectionModal')) {
            this.createEditSectionModal();
        }
    }

    createEditCourseModal() {
        const modalHTML = `
            <div class="modal fade" id="editCourseModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog modal-lg modal-dialog-scrollable" style="max-width: 90%;">
                    <div class="modal-content" style="border-radius: 16px; overflow: hidden;">
                        <div class="modal-header" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 1.5rem;">
                            <h5 class="modal-title fw-bold">
                                <i class="bi bi-pencil-square"></i> Edit Course
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" style="background: #f8f9fa; padding: 2rem;">
                            <form id="editCourseForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Course Name *</label>
                                            <input type="text" class="form-control" id="edit_courseName" 
                                                   placeholder="e.g., General Physics (1)" 
                                                   onblur="window.viewEditManager.checkCourseExistsEdit('name')"
                                                   required />
                                            <div id="edit_nameCheck" class="form-text"></div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Course Code *</label>
                                            <input type="text" class="form-control" id="edit_courseCode" 
                                                   placeholder="e.g., PHYS103" disabled
                                                   required />
                                            <small class="text-muted">Course code cannot be changed</small>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-3">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Credit Hours *</label>
                                            <select class="form-control" id="edit_creditHours" required>
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
                                            <input type="number" class="form-control" id="edit_duration" 
                                                   placeholder="e.g., 5 (or 0)" min="0" max="10" required 
                                                   onchange="window.viewEditManager.validatePatternHoursEdit()" />
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Is Elective? *</label>
                                            <select class="form-control" id="edit_isElective" required>
                                                <option value="false">No (Required)</option>
                                                <option value="true">Yes (Elective)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Course Pattern *</label>
                                            <select class="form-control" id="edit_coursePattern" 
                                                    onchange="window.viewEditManager.updatePatternInfoEdit()" required>
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
                                            <select class="form-control" id="edit_department" required>
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
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">College *</label>
                                            <select class="form-control" id="edit_college" required>
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
                                            <select class="form-control" id="edit_level" 
                                                    onchange="window.viewEditManager.updatePrerequisitesBasedOnLevelEdit()">
                                                <option value="">Not specified</option>
                                                <option value="3">Level 3</option>
                                                <option value="4">Level 4</option>
                                                <option value="5">Level 5</option>
                                                <option value="6">Level 6</option>
                                                <option value="7">Level 7</option>
                                                <option value="8">Level 8</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <!-- Selected Prerequisites Display -->
                                <div class="row">
                                    <div class="col-12">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">
                                                Selected Prerequisites
                                                <small class="text-muted">(These will be saved)</small>
                                            </label>
                                            <div id="edit_selectedPrereqs" class="selected-prereqs-container border rounded p-2">
                                                <span class="text-muted"><i class="bi bi-info-circle"></i> No prerequisites selected</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Prerequisites Selection -->
                                <div class="row">
                                    <div class="col-12">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Select from Existing Courses:</label>
                                            <div class="d-flex gap-2 mb-2">
                                                <button type="button" class="btn btn-sm btn-outline-secondary" 
                                                        onclick="window.viewEditManager.showAddHoursModalEdit()"
                                                        title="Want to add hours instead?">
                                                    <i class="bi bi-clock"></i> Add Credit Hours Requirement
                                                </button>
                                            </div>
                                            <input type="text" class="form-control mb-2" id="edit_prereqSearch" 
                                                   placeholder="Search courses..." 
                                                   onkeyup="window.viewEditManager.filterPrerequisitesEdit()">
                                            <div id="edit_prerequisites" class="border rounded p-2" 
                                                 style="max-height: 200px; overflow-y: auto;">
                                                Loading courses...
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Pattern Details -->
                                <div id="edit_patternDetails" class="row" style="display: none;">
                                    <div class="col-12">
                                        <div class="alert alert-secondary">
                                            <h6 class="fw-bold">Pattern Details</h6>
                                            <div class="row">
                                                <div class="col-md-4">
                                                    <label class="form-label">Lecture Hours</label>
                                                    <input type="number" class="form-control" id="edit_lectureHours" 
                                                           min="0" max="10" value="0" 
                                                           onchange="window.viewEditManager.validatePatternHoursEdit()" />
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Lab Hours</label>
                                                    <input type="number" class="form-control" id="edit_labHours" 
                                                           min="0" max="10" value="0" 
                                                           onchange="window.viewEditManager.validatePatternHoursEdit()" />
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Tutorial Hours</label>
                                                    <input type="number" class="form-control" id="edit_tutorialHours" 
                                                           min="0" max="10" value="0" 
                                                           onchange="window.viewEditManager.validatePatternHoursEdit()" />
                                                </div>
                                            </div>
                                            <div class="mt-2">
                                                <span id="edit_patternValidation" class="text-danger"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Exam Information -->
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Exam Date (Optional)</label>
                                            <input type="date" class="form-control" id="edit_examDate" />
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Exam Time (Optional)</label>
                                            <input type="time" class="form-control" id="edit_examTime" />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer" style="padding: 1.5rem; background: white;">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle me-2"></i> Cancel
                            </button>
                            <button type="button" class="btn-modern" onclick="window.viewEditManager.saveEditedCourse()">
                                <i class="bi bi-check-circle me-2"></i> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    createEditSectionModal() {
        const modalHTML = `
            <div class="modal fade" id="editSectionModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog modal-lg modal-dialog-scrollable" style="max-width: 90%;">
                    <div class="modal-content" style="border-radius: 16px; overflow: hidden;">
                        <div class="modal-header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1.5rem;">
                            <h5 class="modal-title fw-bold">
                                <i class="bi bi-pencil-square"></i> Edit Section
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" style="background: #f8f9fa; padding: 2rem;">
                            <form id="editSectionForm">
                                <!-- Basic Info -->
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Section Number *</label>
                                            <input type="text" class="form-control" id="edit_section_num" required disabled>
                                            <small class="text-muted">Cannot be changed</small>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Course Code *</label>
                                            <input type="text" class="form-control" id="edit_section_course" required disabled>
                                            <small class="text-muted">Cannot be changed</small>
                                        </div>
                                    </div>
                                </div>

                                <!-- Pattern Guidance Alert -->
                                <div id="edit_patternGuidanceAlert" class="alert alert-info" style="display: none;">
                                    <h6 class="alert-heading"><i class="bi bi-info-circle"></i> Course Pattern Requirements</h6>
                                    <div id="edit_patternRequirements"></div>
                                </div>

                                <!-- Section Details -->
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Classroom</label>
                                            <input type="text" class="form-control" id="edit_classroom" placeholder="e.g., 2A44">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Max Students</label>
                                            <input type="number" class="form-control" id="edit_max_students" min="1" placeholder="e.g., 35">
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Section Type *</label>
                                            <select class="form-select" id="edit_section_type" required>
                                                <option value="lecture">Lecture</option>
                                                <option value="lab">Lab</option>
                                                <option value="tutorial">Tutorial</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Academic Level</label>
                                            <select class="form-select" id="edit_academic_level">
                                                <option value="">Not specified</option>
                                                <option value="3">Level 3</option>
                                                <option value="4">Level 4</option>
                                                <option value="5">Level 5</option>
                                                <option value="6">Level 6</option>
                                                <option value="7">Level 7</option>
                                                <option value="8">Level 8</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <!-- Time Slots -->
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Time Slots *</label>
                                    <div id="edit_time_slots_container"></div>
                                    <button type="button" class="btn btn-sm btn-outline-primary mt-2" 
                                            onclick="window.viewEditManager.addEditTimeSlot()">
                                        <i class="bi bi-plus"></i> Add Time Slot
                                    </button>
                                </div>

                                <!-- Hours Summary -->
                                <div id="edit_hoursSummary" class="alert alert-light" style="display: none;">
                                    <strong>Total Hours for this section:</strong>
                                    <div id="edit_hoursSummaryContent" class="mt-2"></div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer" style="padding: 1.5rem; background: white;">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle me-2"></i> Cancel
                            </button>
                            <button type="button" class="btn-modern" onclick="window.viewEditManager.saveEditedSection()">
                                <i class="bi bi-check-circle me-2"></i> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // ==========================================
    // DATA LOADING
    // ==========================================
    async loadAllData() {
        try {
            console.log('📥 Loading courses and sections...');
            
            const coursesResponse = await APIClient.get('/all-courses');
            this.allCourses = coursesResponse.courses || [];
            
            const sectionsResponse = await APIClient.get('/sections');
            this.allSections = sectionsResponse.sections || [];
            
            console.log(`✅ Loaded ${this.allCourses.length} courses and ${this.allSections.length} sections`);
            
            this.filterData();
        } catch (error) {
            console.error('❌ Error loading data:', error);
            if (window.NotificationManager) {
                NotificationManager.error('Failed to load data: ' + error.message);
            }
        }
    }

    // ==========================================
    // VIEW MANAGEMENT
    // ==========================================
    changeView() {
        const viewType = document.getElementById('viewType').value;
        this.currentView = viewType;
        
        const coursesView = document.getElementById('coursesView');
        const sectionsView = document.getElementById('sectionsView');
        
        if (viewType === 'courses') {
            coursesView.style.display = 'block';
            sectionsView.style.display = 'none';
        } else {
            coursesView.style.display = 'none';
            sectionsView.style.display = 'block';
        }
        
        this.filterData();
    }

    filterData() {
        const department = document.getElementById('filterDepartment').value;
        const level = document.getElementById('filterLevel').value;
        const searchQuery = document.getElementById('searchQuery').value.toLowerCase();
        
        if (this.currentView === 'courses') {
            let filtered = this.allCourses;
            
            if (department !== 'all') {
                filtered = filtered.filter(c => c.department === department);
            }
            
            if (level !== 'all') {
                filtered = filtered.filter(c => c.level && c.level.toString() === level);
            }
            
            if (searchQuery) {
                filtered = filtered.filter(c => 
                    c.name.toLowerCase().includes(searchQuery) ||
                    c.code.toLowerCase().includes(searchQuery)
                );
            }
            
            this.filteredData = filtered;
            this.renderCourses();
        } else {
            let filtered = this.allSections;
            
            if (department !== 'all') {
                const deptCourses = this.allCourses
                    .filter(c => c.department === department)
                    .map(c => c.code);
                filtered = filtered.filter(s => deptCourses.includes(s.course));
            }
            
            if (searchQuery) {
                filtered = filtered.filter(s => 
                    s.course.toLowerCase().includes(searchQuery) ||
                    s.sec_num.toLowerCase().includes(searchQuery)
                );
            }
            
            this.filteredData = filtered;
            this.renderSections();
        }
    }

    refreshView() {
        this.loadAllData();
    }

    // ==========================================
    // RENDERING
    // ==========================================
    renderCourses() {
        const container = document.getElementById('coursesListContainer');
        const countBadge = document.getElementById('coursesCount');
        
        if (!container) return;
        
        countBadge.textContent = this.filteredData.length;
        
        if (this.filteredData.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> No courses found matching your filters.
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        this.filteredData.forEach(course => {
            const card = this.createCourseCard(course);
            container.appendChild(card);
        });
    }

    createCourseCard(course) {
        const card = document.createElement('div');
        card.className = 'card course-edit-card mb-3';
        card.innerHTML = `
            <div class="card-header bg-light">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">
                        <i class="bi bi-book-fill text-primary"></i>
                        <strong>${course.code}</strong> - ${course.name}
                    </h6>
                    <div>
                        <button class="btn btn-sm btn-outline-primary" onclick="window.viewEditManager.editCourse('${course.code}')">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.viewEditManager.deleteCourse('${course.code}')">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <p class="mb-1"><strong>Department:</strong> ${course.department}</p>
                        <p class="mb-1"><strong>College:</strong> ${course.college}</p>
                        <p class="mb-1"><strong>Credit Hours:</strong> ${course.credit_hours}</p>
                        <p class="mb-1"><strong>Duration:</strong> ${course.Duration} hours/week</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-1"><strong>Level:</strong> ${course.level ? `Level ${course.level}` : 'Not specified'}</p>
                        <p class="mb-1"><strong>Elective:</strong> ${course.is_elective ? 'Yes' : 'No'}</p>
                        <p class="mb-1"><strong>Pattern:</strong> ${course.pattern ? this.formatPattern(course.pattern.type) : 'N/A'}</p>
                        <p class="mb-1"><strong>Prerequisites:</strong> ${this.formatPrerequisites(course.prerequisites)}</p>
                    </div>
                </div>
            </div>
        `;
        return card;
    }

    formatPattern(type) {
        const patterns = {
            'lecture_only': 'Lecture Only',
            'lecture_tutorial': 'Lecture + Tutorial',
            'lecture_lab': 'Lecture + Lab',
            'lecture_lab_tutorial': 'Lecture + Lab + Tutorial',
            'lab_only': 'Lab Only',
            'independent_study': 'Independent Study',
            'custom': 'Custom'
        };
        return patterns[type] || type;
    }

    // Update the formatPrerequisites method
formatPrerequisites(course) {
  const coursePrereqs = course.prerequisites_details?.map(p => p.code) || [];
  const hourPrereqs = course.hour_prerequisites || [];
  
  if (coursePrereqs.length === 0 && hourPrereqs.length === 0) {
    return 'None';
  }
  
  const parts = [];
  if (coursePrereqs.length > 0) {
    parts.push(`Courses: ${coursePrereqs.join(', ')}`);
  }
  if (hourPrereqs.length > 0) {
    parts.push(`Requirements: ${hourPrereqs.join(', ')}`);
  }
  
  return parts.join('; ');
}

    renderSections() {
        const container = document.getElementById('sectionsListContainer');
        const countBadge = document.getElementById('sectionsCount');
        
        if (!container) return;
        
        countBadge.textContent = this.filteredData.length;
        
        if (this.filteredData.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> No sections found matching your filters.
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        this.filteredData.forEach(section => {
            const card = this.createSectionCard(section);
            container.appendChild(card);
        });
    }

    createSectionCard(section) {
        const card = document.createElement('div');
        card.className = 'card section-edit-card mb-3';
        card.innerHTML = `
            <div class="card-header bg-light">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">
                        <i class="bi bi-door-open-fill text-success"></i>
                        Section <strong>${section.sec_num}</strong> - ${section.course}
                    </h6>
                    <div>
                        <button class="btn btn-sm btn-outline-primary" onclick="window.viewEditManager.editSection('${section.sec_num}')">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.viewEditManager.deleteSection('${section.sec_num}')">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <p class="mb-1"><strong>Course:</strong> ${section.course}</p>
                        <p class="mb-1"><strong>Classroom:</strong> ${section.classroom || 'Not assigned'}</p>
                        <p class="mb-1"><strong>Max Students:</strong> ${section.max_Number || 'Not set'}</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-1"><strong>Type:</strong> ${section.type || 'Not specified'}</p>
                        <p class="mb-1"><strong>Academic Level:</strong> ${section.academic_level || 'Not specified'}</p>
                        <p class="mb-1"><strong>Time Slots:</strong></p>
                        <ul class="small mb-0">
                            ${section.time_Slot ? section.time_Slot.map(slot => `<li>${slot}</li>`).join('') : '<li>No time slots</li>'}
                        </ul>
                    </div>
                </div>
            </div>
        `;
        return card;
    }

    // ==========================================
    // COURSE EDITING
    // ==========================================
    async editCourse(courseCode) {
        try {
            const response = await APIClient.get(`/course-details/${courseCode}`);
            this.editingCourse = response;
            
            // Populate basic fields
            document.getElementById('edit_courseCode').value = response.code;
            document.getElementById('edit_courseName').value = response.name;
            document.getElementById('edit_department').value = response.department;
            document.getElementById('edit_college').value = response.college;
            document.getElementById('edit_creditHours').value = response.credit_hours;
            document.getElementById('edit_duration').value = response.duration;
            document.getElementById('edit_level').value = response.level || '';
            document.getElementById('edit_isElective').value = response.is_elective ? 'true' : 'false';
            document.getElementById('edit_examDate').value = '';
            document.getElementById('edit_examTime').value = '';
            
            // Populate pattern
            if (response.pattern) {
                document.getElementById('edit_coursePattern').value = response.pattern.type;
                document.getElementById('edit_lectureHours').value = response.pattern.lecture_hours;
                document.getElementById('edit_labHours').value = response.pattern.lab_hours;
                document.getElementById('edit_tutorialHours').value = response.pattern.tutorial_hours;
                this.updatePatternInfoEdit();
            }
            
            // Populate prerequisites
            await this.populatePrerequisitesDropdownEdit();
            
            const prereqs = response.prerequisites && response.prerequisites.length > 0 && response.prerequisites[0] !== null 
                ? response.prerequisites 
                : [];
            
            document.getElementById('edit_selectedPrereqs').innerHTML = prereqs.length === 0 
                ? '<span class="text-muted"><i class="bi bi-info-circle"></i> No prerequisites selected</span>'
                : '';
            
            prereqs.forEach(prereq => {
                const isManual = !/^[A-Z]{2,4}\d{3,4}$/i.test(prereq);
                this.addSelectedPrerequisiteEdit(prereq, isManual);
                
                if (!isManual) {
                    const checkboxes = document.querySelectorAll('.prereq-checkbox-edit');
                    checkboxes.forEach(cb => {
                        if (cb.value === prereq) {
                            cb.checked = true;
                        }
                    });
                }
            });
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editCourseModal'));
            modal.show();
            
        } catch (error) {
            alert(`Failed to load course details: ${error.message}`);
        }
    }

    // Check if course name exists (for editing)
    async checkCourseExistsEdit(field) {
        const name = document.getElementById('edit_courseName').value.trim();
        const currentCode = document.getElementById('edit_courseCode').value.trim();
        const checkDiv = document.getElementById('edit_nameCheck');
        
        if (!name) {
            checkDiv.textContent = '';
            return;
        }
        
        try {
            const existingCourse = this.allCourses.find(c => 
                c.name.toLowerCase() === name.toLowerCase() && c.code !== currentCode
            );
            
            if (existingCourse) {
                checkDiv.innerHTML = '<span class="text-danger">⚠️ Course name already exists!</span>';
                checkDiv.className = 'form-text text-danger';
            } else {
                checkDiv.innerHTML = '<span class="text-success">✓ Course name available</span>';
                checkDiv.className = 'form-text text-success';
            }
        } catch (error) {
            console.error('Error checking course:', error);
        }
    }

    // Pattern management for edit
    updatePatternInfoEdit() {
        const patternType = document.getElementById('edit_coursePattern').value;
        const detailsDiv = document.getElementById('edit_patternDetails');
        const durationInput = document.getElementById('edit_duration');
        
        if (!patternType || patternType === 'independent_study') {
            detailsDiv.style.display = 'none';
            if (patternType === 'independent_study') {
                durationInput.value = '0';
                this.validatePatternHoursEdit();
            }
            return;
        }
        
        detailsDiv.style.display = 'block';
        
        // Auto-set pattern hours based on pattern type
        const lectureInput = document.getElementById('edit_lectureHours');
        const labInput = document.getElementById('edit_labHours');
        const tutorialInput = document.getElementById('edit_tutorialHours');
        
        switch(patternType) {
            case 'lecture_only':
                lectureInput.value = durationInput.value || 3;
                labInput.value = 0;
                tutorialInput.value = 0;
                break;
            case 'lecture_tutorial':
                lectureInput.value = 2;
                labInput.value = 0;
                tutorialInput.value = 1;
                break;
            case 'lecture_lab':
                lectureInput.value = 2;
                labInput.value = 2;
                tutorialInput.value = 0;
                break;
            case 'lecture_lab_tutorial':
                lectureInput.value = 2;
                labInput.value = 2;
                tutorialInput.value = 1;
                break;
            case 'lab_only':
                lectureInput.value = 0;
                labInput.value = durationInput.value || 2;
                tutorialInput.value = 0;
                break;
        }
        
        this.validatePatternHoursEdit();
    }

    validatePatternHoursEdit() {
        const duration = parseInt(document.getElementById('edit_duration').value) || 0;
        const patternType = document.getElementById('edit_coursePattern').value;
        const validationSpan = document.getElementById('edit_patternValidation');
        
        if (patternType === 'independent_study' || duration === 0) {
            validationSpan.textContent = '✓ Independent study course (no pattern required)';
            validationSpan.className = 'text-success';
            return true;
        }
        
        const lecture = parseInt(document.getElementById('edit_lectureHours').value) || 0;
        const lab = parseInt(document.getElementById('edit_labHours').value) || 0;
        const tutorial = parseInt(document.getElementById('edit_tutorialHours').value) || 0;
        const total = lecture + lab + tutorial;
        
        if (total !== duration) {
            validationSpan.textContent = `❌ Pattern hours (${total}) must equal Duration (${duration})`;
            validationSpan.className = 'text-danger';
            return false;
        }
        
        validationSpan.textContent = `✓ Pattern hours match duration (${total} = ${duration})`;
        validationSpan.className = 'text-success';
        return true;
    }

    // Prerequisites management for edit
    async populatePrerequisitesDropdownEdit() {
        const container = document.getElementById('edit_prerequisites');
        if (!container) return;
        
        const selectedLevel = document.getElementById('edit_level').value;
        
        container.innerHTML = `
            <div class="form-check prereq-item" data-course-text="no prerequisites">
                <input class="form-check-input" type="checkbox" value="" 
                       id="prereq_none_edit" 
                       onchange="window.viewEditManager.toggleNoPrerequisitesEdit()">
                <label class="form-check-label" for="prereq_none_edit">
                    <strong>No prerequisites</strong>
                </label>
            </div>
            <hr class="my-2">
        `;
        
        let filteredCourses = this.allCourses;
        if (selectedLevel) {
            filteredCourses = this.allCourses.filter(course => {
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
                <input class="form-check-input prereq-checkbox-edit" 
                       type="checkbox" value="${course.code}" 
                       id="prereq_edit_${index}" 
                       onchange="window.viewEditManager.handlePrereqCheckboxEdit('${course.code}')">
                <label class="form-check-label" for="prereq_edit_${index}">
                    <strong>${course.code}</strong> - ${course.name}
                    ${course.level ? `<span class="badge bg-secondary ms-2">L${course.level}</span>` : ''}
                </label>
            `;
            container.appendChild(checkbox);
        });
    }

    filterPrerequisitesEdit() {
        const searchQuery = document.getElementById('edit_prereqSearch').value.toLowerCase();
        const items = document.querySelectorAll('#edit_prerequisites .prereq-item');
        
        items.forEach(item => {
            const text = item.getAttribute('data-course-text');
            if (text && text.includes(searchQuery)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    updatePrerequisitesBasedOnLevelEdit() {
        this.populatePrerequisitesDropdownEdit();
    }

    handlePrereqCheckboxEdit(courseCode) {
        const checkbox = document.querySelector(`input[value="${courseCode}"].prereq-checkbox-edit`);
        
        if (checkbox.checked) {
            this.addSelectedPrerequisiteEdit(courseCode, false);
        } else {
            this.removeSelectedPrerequisiteEdit(courseCode);
        }
    }

    toggleNoPrerequisitesEdit() {
        const noneCheckbox = document.getElementById('prereq_none_edit');
        const container = document.getElementById('edit_selectedPrereqs');
        
        if (noneCheckbox.checked) {
            container.innerHTML = '<span class="text-muted"><i class="bi bi-info-circle"></i> No prerequisites selected</span>';
            
            const checkboxes = document.querySelectorAll('.prereq-checkbox-edit');
            checkboxes.forEach(cb => cb.checked = false);
        }
    }

    showAddHoursModalEdit() {
        const hours = prompt('Enter credit hours requirement (e.g., "3" or "3 hours"):');
        
        if (!hours) return;
        
        const hoursText = hours.trim();
        if (!hoursText) {
            alert('Please enter a valid credit hours requirement');
            return;
        }
        
        let formattedHours = hoursText;
        if (!hoursText.toLowerCase().includes('hour')) {
            const num = parseInt(hoursText);
            if (!isNaN(num)) {
                formattedHours = `${num} credit hour${num !== 1 ? 's' : ''}`;
            }
        }
        
        this.addSelectedPrerequisiteEdit(formattedHours, true);
    }

    addSelectedPrerequisiteEdit(value, isManual = false) {
        const container = document.getElementById('edit_selectedPrereqs');
        
        if (container.querySelector('.text-muted')) {
            container.innerHTML = '';
        }
        
        if (container.querySelector(`[data-prereq="${value}"]`)) {
            return;
        }
        
        const badge = document.createElement('span');
        badge.className = 'selected-prereq-badge';
        badge.setAttribute('data-prereq', value);
        badge.setAttribute('data-manual', isManual);
        badge.innerHTML = `
            ${value}
            <span class="remove-prereq" onclick="window.viewEditManager.removeSelectedPrerequisiteEdit('${value}')">×</span>
        `;
        
        container.appendChild(badge);
        
        const noneCheckbox = document.getElementById('prereq_none_edit');
        if (noneCheckbox) {
            noneCheckbox.checked = false;
        }
    }

    removeSelectedPrerequisiteEdit(value) {
        const container = document.getElementById('edit_selectedPrereqs');
        const badge = container.querySelector(`[data-prereq="${value}"]`);
        
        if (badge) {
            const isManual = badge.getAttribute('data-manual') === 'true';
            badge.remove();
            
            if (!isManual) {
                const checkboxes = document.querySelectorAll('.prereq-checkbox-edit');
                checkboxes.forEach(cb => {
                    if (cb.value === value) {
                        cb.checked = false;
                    }
                });
            }
        }
        
        if (container.children.length === 0) {
            container.innerHTML = '<span class="text-muted"><i class="bi bi-info-circle"></i> No prerequisites selected</span>';
        }
    }

    getSelectedPrerequisitesEdit() {
        const container = document.getElementById('edit_selectedPrereqs');
        const badges = container.querySelectorAll('.selected-prereq-badge');
        return Array.from(badges).map(badge => badge.getAttribute('data-prereq'));
    }

    async saveEditedCourse() {
        try {
            const courseCode = document.getElementById('edit_courseCode').value;
            
            // Validate pattern hours
            const patternType = document.getElementById('edit_coursePattern').value;
            if (patternType && patternType !== 'independent_study') {
                if (!this.validatePatternHoursEdit()) {
                    alert('Please fix pattern hours before saving');
                    return;
                }
            }
            
            // Collect data
            const updateData = {
                name: document.getElementById('edit_courseName').value.trim(),
                department: document.getElementById('edit_department').value,
                college: document.getElementById('edit_college').value,
                credit_hours: parseInt(document.getElementById('edit_creditHours').value),
                Duration: parseInt(document.getElementById('edit_duration').value),
                level: document.getElementById('edit_level').value ? parseInt(document.getElementById('edit_level').value) : null,
                is_elective: document.getElementById('edit_isElective').value === 'true'
            };
            
            // Pattern
            if (patternType && patternType !== 'independent_study') {
                updateData.pattern = {
                    type: patternType,
                    lecture_hours: parseInt(document.getElementById('edit_lectureHours').value) || 0,
                    lab_hours: parseInt(document.getElementById('edit_labHours').value) || 0,
                    tutorial_hours: parseInt(document.getElementById('edit_tutorialHours').value) || 0
                };
            }
            
            // Prerequisites
            const prereqs = this.getSelectedPrerequisitesEdit();
            if (prereqs.length > 0) {
                updateData.prerequisites = prereqs;
            }
            
            // Send update
            await APIClient.put(`/update-course/${courseCode}`, updateData);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editCourseModal'));
            modal.hide();
            
            if (window.NotificationManager) {
                NotificationManager.success(`Course ${courseCode} updated successfully`);
            } else {
                alert(`Course ${courseCode} updated successfully`);
            }
            
            await this.loadAllData();
            
        } catch (error) {
            alert(`Failed to update course: ${error.message}`);
        }
    }

    // ==========================================
    // SECTION EDITING
    // ==========================================
    async editSection(sectionNum) {
        try {
            const response = await APIClient.get(`/section-details/${sectionNum}`);
            this.editingSection = response;
            this.timeSlots['edit'] = [];
            
            // Populate fields
            document.getElementById('edit_section_num').value = response.sec_num;
            document.getElementById('edit_section_course').value = response.course;
            document.getElementById('edit_classroom').value = response.classroom || '';
            document.getElementById('edit_max_students').value = response.max_Number || '';
            document.getElementById('edit_section_type').value = response.type || 'lecture';
            document.getElementById('edit_academic_level').value = response.academic_level || '';
            
            // Load pattern guidance
            await this.loadAndDisplayCoursePatternEdit(response.course);
            
            // Populate time slots
            const container = document.getElementById('edit_time_slots_container');
            container.innerHTML = '';
            
            if (response.time_slots_detail && response.time_slots_detail.length > 0) {
                response.time_slots_detail.forEach(slot => {
                    this.addEditTimeSlot(slot);
                });
            } else {
                this.addEditTimeSlot();
            }
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editSectionModal'));
            modal.show();
            
        } catch (error) {
            alert(`Failed to load section details: ${error.message}`);
        }
    }

    async loadAndDisplayCoursePatternEdit(courseCode) {
        try {
            const response = await APIClient.get(`/course-details/${courseCode}`);
            
            if (response.pattern) {
                this.displayPatternGuidanceEdit(response.pattern, response.credit_hours);
            }
        } catch (error) {
            console.error('Error loading course pattern:', error);
        }
    }

    displayPatternGuidanceEdit(pattern, creditHours) {
        const alert = document.getElementById('edit_patternGuidanceAlert');
        const requirements = document.getElementById('edit_patternRequirements');
        
        let html = `
            <div class="row">
                <div class="col-md-6">
                    <p class="mb-2"><strong>Pattern Type:</strong> ${pattern.type.replace(/_/g, ' ').toUpperCase()}</p>
                    <p class="mb-2"><strong>Credit Hours:</strong> ${creditHours}</p>
                    <p class="mb-0"><strong>Total Duration:</strong> ${pattern.total_hours}h/week</p>
                </div>
                <div class="col-md-6">
                    <strong>Required Sections:</strong>
                    <div class="mt-2">
        `;
        
        if (pattern.lecture_hours > 0) {
            html += `<div class="badge bg-primary me-2 mb-2">🎓 Lecture: <strong>${pattern.lecture_hours}h</strong></div>`;
        }
        if (pattern.lab_hours > 0) {
            html += `<div class="badge bg-success me-2 mb-2">🧪 Lab: <strong>${pattern.lab_hours}h</strong></div>`;
        }
        if (pattern.tutorial_hours > 0) {
            html += `<div class="badge bg-info me-2 mb-2">📚 Tutorial: <strong>${pattern.tutorial_hours}h</strong></div>`;
        }
        
        html += `
                    </div>
                </div>
            </div>
            <div class="alert alert-warning mt-3 mb-0">
                <i class="bi bi-exclamation-triangle"></i> 
                <strong>Important:</strong> Each section MUST have exactly these hours:
                <ul class="mb-0 mt-2">
                    ${pattern.lecture_hours > 0 ? `<li>Lectures: Exactly ${pattern.lecture_hours} hours total</li>` : ''}
                    ${pattern.lab_hours > 0 ? `<li>Labs: Exactly ${pattern.lab_hours} hours total</li>` : ''}
                    ${pattern.tutorial_hours > 0 ? `<li>Tutorials: Exactly ${pattern.tutorial_hours} hours total</li>` : ''}
                </ul>
            </div>
        `;
        
        requirements.innerHTML = html;
        alert.style.display = 'block';
    }

    addEditTimeSlot(slot = null) {
        const container = document.getElementById('edit_time_slots_container');
        const slotId = Date.now();
        
        const div = document.createElement('div');
        div.className = 'card mb-2';
        div.setAttribute('data-slot-id', slotId);
        div.innerHTML = `
            <div class="card-body p-2">
                <div class="row g-2">
                    <div class="col-md-3">
                        <select class="form-select form-select-sm slot-day" required>
                            <option value="">Select Day</option>
                            <option value="Sunday" ${slot && slot.day === 'Sunday' ? 'selected' : ''}>Sunday</option>
                            <option value="Monday" ${slot && slot.day === 'Monday' ? 'selected' : ''}>Monday</option>
                            <option value="Tuesday" ${slot && slot.day === 'Tuesday' ? 'selected' : ''}>Tuesday</option>
                            <option value="Wednesday" ${slot && slot.day === 'Wednesday' ? 'selected' : ''}>Wednesday</option>
                            <option value="Thursday" ${slot && slot.day === 'Thursday' ? 'selected' : ''}>Thursday</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <input type="time" class="form-control form-control-sm slot-start" 
                               value="${slot ? slot.start_time : ''}" 
                               onchange="window.viewEditManager.calculateSlotDuration(${slotId})" required>
                    </div>
                    <div class="col-md-3">
                        <input type="time" class="form-control form-control-sm slot-end" 
                               value="${slot ? slot.end_time : ''}" 
                               onchange="window.viewEditManager.calculateSlotDuration(${slotId})" required>
                    </div>
                    <div class="col-md-2">
                        <input type="text" class="form-control form-control-sm slot-duration" 
                               value="${slot && slot.duration ? slot.duration + 'h' : ''}" 
                               readonly placeholder="Duration">
                    </div>
                    <div class="col-md-1">
                        <button type="button" class="btn btn-sm btn-outline-danger w-100" 
                                onclick="window.viewEditManager.removeEditTimeSlot(${slotId})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
        
        if (slot) {
            this.calculateSlotDuration(slotId);
        }
        
        this.updateHoursSummaryEdit();
    }

    calculateSlotDuration(slotId) {
        const card = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (!card) return;
        
        const startInput = card.querySelector('.slot-start');
        const endInput = card.querySelector('.slot-end');
        const durationInput = card.querySelector('.slot-duration');
        
        const start = startInput.value;
        const end = endInput.value;
        
        if (start && end) {
            const startTime = new Date(`2000-01-01 ${start}`);
            const endTime = new Date(`2000-01-01 ${end}`);
            const diff = (endTime - startTime) / (1000 * 60 * 60);
            
            if (diff > 0) {
                durationInput.value = diff + 'h';
            } else {
                durationInput.value = 'Invalid';
            }
        }
        
        this.updateHoursSummaryEdit();
    }

    removeEditTimeSlot(slotId) {
        const card = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (card) {
            card.remove();
            this.updateHoursSummaryEdit();
        }
    }

    updateHoursSummaryEdit() {
        const cards = document.querySelectorAll('#edit_time_slots_container .card');
        let totalHours = 0;
        
        cards.forEach(card => {
            const durationText = card.querySelector('.slot-duration').value;
            const duration = parseFloat(durationText);
            if (!isNaN(duration)) {
                totalHours += duration;
            }
        });
        
        const summary = document.getElementById('edit_hoursSummary');
        const content = document.getElementById('edit_hoursSummaryContent');
        
        if (totalHours > 0) {
            content.innerHTML = `<span class="badge bg-primary">${totalHours} hours total</span>`;
            summary.style.display = 'block';
        } else {
            summary.style.display = 'none';
        }
    }

    async saveEditedSection() {
        try {
            const sectionNum = document.getElementById('edit_section_num').value;
            
            // Collect time slots
            const slotCards = document.querySelectorAll('#edit_time_slots_container .card');
            const timeSlots = [];
            
            slotCards.forEach(card => {
                const day = card.querySelector('.slot-day').value;
                const startTime = card.querySelector('.slot-start').value;
                const endTime = card.querySelector('.slot-end').value;
                const durationText = card.querySelector('.slot-duration').value;
                const duration = parseFloat(durationText);
                
                if (day && startTime && endTime && !isNaN(duration)) {
                    timeSlots.push({
                        day: day,
                        start_time: startTime,
                        end_time: endTime,
                        duration: duration
                    });
                }
            });
            
            if (timeSlots.length === 0) {
                alert('Please add at least one valid time slot');
                return;
            }
            
            const updateData = {
                classroom: document.getElementById('edit_classroom').value.trim() || null,
                max_number: document.getElementById('edit_max_students').value ? 
                    parseInt(document.getElementById('edit_max_students').value) : null,
                type: document.getElementById('edit_section_type').value,
                academic_level: document.getElementById('edit_academic_level').value ? 
                    parseInt(document.getElementById('edit_academic_level').value) : null,
                time_slots: timeSlots
            };
            
            await APIClient.put(`/update-section/${sectionNum}`, updateData);
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('editSectionModal'));
            modal.hide();
            
            if (window.NotificationManager) {
                NotificationManager.success(`Section ${sectionNum} updated successfully`);
            } else {
                alert(`Section ${sectionNum} updated successfully`);
            }
            
            await this.loadAllData();
            
        } catch (error) {
            alert(`Failed to update section: ${error.message}`);
        }
    }

    // ==========================================
    // DELETE OPERATIONS
    // ==========================================
    async deleteCourse(courseCode) {
        if (!confirm(`Are you sure you want to delete course ${courseCode}?\n\nThis action cannot be undone.`)) {
            return;
        }
        
        try {
            await APIClient.delete(`/delete-course/${courseCode}`);
            
            if (window.NotificationManager) {
                NotificationManager.success(`Course ${courseCode} deleted successfully`);
            } else {
                alert(`Course ${courseCode} deleted successfully`);
            }
            
            await this.loadAllData();
        } catch (error) {
            alert(`Failed to delete course: ${error.message}`);
        }
    }

    async deleteSection(sectionNum) {
        if (!confirm(`Are you sure you want to delete section ${sectionNum}?\n\nThis action cannot be undone.`)) {
            return;
        }
        
        try {
            await APIClient.delete(`/delete-section/${sectionNum}`);
            
            if (window.NotificationManager) {
                NotificationManager.success(`Section ${sectionNum} deleted successfully`);
            } else {
                alert(`Section ${sectionNum} deleted successfully`);
            }
            
            await this.loadAllData();
        } catch (error) {
            alert(`Failed to delete section: ${error.message}`);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.viewEditManager = new ViewEditManager();

    const modal = document.getElementById('departmentModal');
    const isCourseMgmtPage = window.location.pathname.includes('course-management.html');

    if (modal) {
        // If modal exists, initialize when modal is shown
        modal.addEventListener('shown.bs.modal', () => {
            if (window.viewEditManager) {
                window.viewEditManager.initialize();
            }
        });
    } else if (isCourseMgmtPage) {
        // If on dedicated course management page, initialize immediately
        if (window.viewEditManager) {
            window.viewEditManager.initialize();
        }
    }
});

console.log('✅ ViewEditManager (COMPLETE) loaded');