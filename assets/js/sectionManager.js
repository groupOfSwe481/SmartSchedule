// ============================================
// Section Manager - COMPLETE FULL VERSION
// ============================================
 

class SectionManager {
    constructor() {
        this.formCounter = 0;
        this.timeSlots = {};
        this.creditHoursMap = {};
        this.availableLectureSections = {};
    }

    // ==========================================
    // COURSE FILTERING & SELECTION
    // ==========================================
    async filterCourses() {
        const department = document.getElementById('sectionDepartment').value;
        const courseCodeSelect = document.getElementById('sectionCourseCode');
        
        courseCodeSelect.innerHTML = '<option value="">Select Course Code</option>';
        document.getElementById('sectionCourseName').value = '';
        
        if (!department) {
            return;
        }

        try {
            const actualDepartment = window.departmentMapping[department] || department;
            const response = await fetch(`${window.API_URL}/courses-by-department?department=${encodeURIComponent(actualDepartment)}`);
            const data = await response.json();
            
            if (response.ok && data.courses) {
                data.courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.code;
                    option.textContent = `${course.code} - ${course.name}`;
                    option.setAttribute('data-name', course.name);
                    courseCodeSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    }

    async updateCourseName() {
        const courseCodeSelect = document.getElementById('sectionCourseCode');
        const selectedOption = courseCodeSelect.options[courseCodeSelect.selectedIndex];
        const courseName = document.getElementById('sectionCourseName');
        
        if (selectedOption.value) {
            courseName.value = selectedOption.getAttribute('data-name');
            
            // Load course pattern for guidance
            await this.loadAndDisplayCoursePattern(selectedOption.value);
            
            // Load lecture sections for this course
            await this.loadLectureSections(selectedOption.value);
        } else {
            courseName.value = '';
            document.getElementById('patternGuidanceAlert').style.display = 'none';
        }
    }

    // ==========================================
    // PATTERN GUIDANCE
    // ==========================================
    async loadAndDisplayCoursePattern(courseCode) {
        try {
            const response = await fetch(`${window.API_URL}/course-details/${courseCode}`);
            const course = await response.json();
            
            if (course.pattern) {
                this.displayPatternGuidance(course.pattern, course.credit_hours);
            }
        } catch (error) {
            console.error('Error loading course pattern:', error);
        }
    }

   displayPatternGuidance(pattern, creditHours) {
    const alert = document.getElementById('patternGuidanceAlert');
    const requirements = document.getElementById('patternRequirements');
    
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



    // ==========================================
// PATTERN VALIDATION HELPERS
// ==========================================

isSlotTypeAllowed(slotType, pattern) {
    const normalizedType = slotType.toLowerCase();
    
    switch(pattern.type) {
        case 'lecture_only':
            return normalizedType === 'lecture';
        case 'lecture_tutorial':
            return normalizedType === 'lecture' || normalizedType === 'tutorial';
        case 'lecture_lab':
            return normalizedType === 'lecture' || normalizedType.includes('lab');
        case 'lecture_lab_tutorial':
            return ['lecture', 'tutorial'].includes(normalizedType) || normalizedType.includes('lab');
        case 'lab_only':
            return normalizedType.includes('lab');
        case 'custom':
            return true;
        default:
            return true;
    }
}

getAllowedTypes(pattern) {
    switch(pattern.type) {
        case 'lecture_only':
            return ['Lecture'];
        case 'lecture_tutorial':
            return ['Lecture', 'Tutorial'];
        case 'lecture_lab':
            return ['Lecture', 'Lab', 'Lab A', 'Lab B'];
        case 'lecture_lab_tutorial':
            return ['Lecture', 'Lab', 'Lab A', 'Lab B', 'Tutorial'];
        case 'lab_only':
            return ['Lab', 'Lab A', 'Lab B'];
        case 'custom':
            return ['Lecture', 'Lab', 'Lab A', 'Lab B', 'Tutorial'];
        default:
            return ['Lecture', 'Lab', 'Tutorial'];
    }
}

calculateTypeHours(sectionId, slotType) {
    const slots = this.timeSlots[sectionId] || [];
    const normalizedType = slotType.toLowerCase();
    
    return slots
        .filter(slot => {
            const slotNormalized = slot.type.toLowerCase();
            if (normalizedType.includes('lab')) {
                return slotNormalized.includes('lab');
            }
            return slotNormalized === normalizedType;
        })
        .reduce((sum, slot) => sum + slot.duration, 0);
}

getExpectedHours(slotType, pattern) {
    const normalizedType = slotType.toLowerCase();
    
    if (normalizedType === 'lecture') {
        return pattern.lecture_hours;
    } else if (normalizedType.includes('lab')) {
        return pattern.lab_hours;
    } else if (normalizedType === 'tutorial') {
        return pattern.tutorial_hours;
    }
    
    return 0;
}


    // ==========================================
    // LECTURE SECTIONS LOADING
    // ==========================================
    async loadLectureSections(courseCode) {
        try {
            const response = await fetch(`${window.API_URL}/lecture-sections/${courseCode}`);
            if (response.ok) {
                const data = await response.json();
                this.availableLectureSections[courseCode] = data.lecture_sections || [];
                return data.lecture_sections || [];
            }
            return [];
        } catch (error) {
            console.error('Error loading lecture sections:', error);
            return [];
        }
    }

    // ==========================================
    // ADD SECTION FORM
    // ==========================================
    async addSectionForm() {
        const courseCode = document.getElementById('sectionCourseCode').value;
        
        if (!courseCode) {
            alert('Please select Course Code first');
            return;
        }
        
        this.formCounter++;
        window.sectionFormCounter = this.formCounter; // ✅ SYNC GLOBAL
        const formId = this.formCounter;
        
        const container = document.getElementById('sectionsContainer');
        
        this.timeSlots[formId] = [];
        window.sectionTimeSlotsMap[formId] = []; // ✅ SYNC GLOBAL
        
        const sectionForm = document.createElement('div');
        sectionForm.className = 'card mb-3 section-form-card';
        sectionForm.id = `sectionForm_${formId}`;
        sectionForm.innerHTML = `
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                <h6 class="mb-0"><i class="bi bi-door-open"></i> Section #${formId}</h6>
                <button type="button" class="btn btn-sm btn-danger" onclick="window.sectionManager.removeSectionForm(${formId})">
                    <i class="bi bi-trash"></i> Remove
                </button>
            </div>
            <div class="card-body">
                <div class="alert alert-info mb-3">
    <i class="bi bi-info-circle"></i> <strong>Unified Section:</strong> 
    Add all time slots (lectures, labs, tutorials) to this single section.
</div>
                
                <!-- Parent Lecture Selection (hidden by default) -->
                <div id="lectureSelectContainer_${formId}" style="display: none;">
                    <div class="mb-3">
                        <label class="form-label fw-bold" id="lectureLabel_${formId}">
                            <i class="bi bi-link-45deg"></i> Parent Lecture Section
                        </label>
                        <input type="text" class="form-control mb-2" id="lectureSearch_${formId}" 
                               placeholder="Search lecture sections..." 
                               onkeyup="window.sectionManager.searchLectureSections(${formId})">
                        <select class="form-control" id="followsLecture_${formId}">
                            <option value="">Select Lecture Section</option>
                        </select>
                        <small class="text-muted" id="lectureHelp_${formId}">Link this section to a lecture</small>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label fw-bold"><i class="bi bi-clock"></i> Time Slots</label>
                   <div class="row mb-2">
    <div class="col-md-2">
        <select class="form-control" id="slotType_${formId}">
            <option value="">Type</option>
            <option value="lecture">Lecture</option>
            <option value="lab">Lab</option>
            <option value="lab a">Lab A</option>
            <option value="lab b">Lab B</option>
            <option value="tutorial">Tutorial</option>
        </select>
    </div>
    <div class="col-md-2">
        <select class="form-control" id="dayOfWeek_${formId}">
                                <option value="">Select Day</option>
                                <option value="Sunday">Sunday</option>
                                <option value="Monday">Monday</option>
                                <option value="Tuesday">Tuesday</option>
                                <option value="Wednesday">Wednesday</option>
                                <option value="Thursday">Thursday</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <select class="form-control" id="startTime_${formId}">
                                <option value="">Start Time</option>
                                <option value="8:00">8:00 AM</option>
                                <option value="9:00">9:00 AM</option>
                                <option value="10:00">10:00 AM</option>
                                <option value="11:00">11:00 AM</option>
                                <option value="12:00">12:00 PM</option>
                                <option value="13:00">1:00 PM</option>
                                <option value="14:00">2:00 PM</option>
                                <option value="15:00">3:00 PM</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <select class="form-control" id="endTime_${formId}">
                                <option value="">End Time</option>
                                <option value="9:00">9:00 AM</option>
                                <option value="10:00">10:00 AM</option>
                                <option value="11:00">11:00 AM</option>
                                <option value="12:00">12:00 PM</option>
                                <option value="13:00">1:00 PM</option>
                                <option value="14:00">2:00 PM</option>
                                <option value="15:00">3:00 PM</option>
                                <option value="16:00">4:00 PM</option>
                                <option value="17:00">5:00 PM</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <button type="button" class="btn btn-primary w-100" onclick="window.sectionManager.addTimeSlot(${formId})">
                                <i class="bi bi-plus"></i> Add Slot
                            </button>
                        </div>
                    </div>
                    
                    <div class="mb-2">
                        <small class="text-muted">
                            <i class="bi bi-info-circle"></i> 
                            Credit Hours Tracking: <span id="creditHoursStatus_${formId}">0/0</span>
                            <span id="creditHoursWarning_${formId}" class="ms-2"></span>
                        </small>
                    </div>
                    
                    <div id="timeSlotsContainer_${formId}">
                        <p class="text-muted small">No time slots added yet</p>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(sectionForm);
        
        // Load course credit hours for this section
        await this.loadCourseCreditHoursForSection(formId, courseCode);
    }

    // ==========================================
    // CREDIT HOURS TRACKING
    // ==========================================
    async loadCourseCreditHoursForSection(sectionId, courseCode) {
        try {
            const response = await fetch(`${window.API_URL}/course-details/${courseCode}`);
            if (response.ok) {
                const courseData = await response.json();
                const creditHours = courseData.credit_hours || 0;
                
                // Store credit hours for this section
                this.creditHoursMap[sectionId] = creditHours;
                window.sectionCreditHoursMap[sectionId] = creditHours; // ✅ SYNC GLOBAL
                
                // Update the display
                this.updateCreditHoursStatus(sectionId);
            }
        } catch (error) {
            console.error('Error loading course credit hours:', error);
        }
    }

    // ==========================================
    // SECTION TYPE CHANGE
    // ==========================================
   

    // ==========================================
    // PATTERN VALIDATION NOTE
    // ==========================================
    

    // ==========================================
    // POPULATE LECTURE SECTIONS
    // ==========================================
   

    

    // ==========================================
    // ADD TIME SLOT WITH OVERLAP DETECTION
    // ==========================================
    async addTimeSlot(sectionId) {
    const slotType = document.getElementById(`slotType_${sectionId}`).value;
    const day = document.getElementById(`dayOfWeek_${sectionId}`).value;
    const startTime = document.getElementById(`startTime_${sectionId}`).value;
    const endTime = document.getElementById(`endTime_${sectionId}`).value;

    if (!slotType || !day || !startTime || !endTime) {
        alert('Please fill all fields: Type, Day, Start Time, and End Time');
        return;
    }

    // ✅ STEP 1: VALIDATE AGAINST COURSE PATTERN FIRST
    const courseCode = document.getElementById('sectionCourseCode').value;
    
    try {
        const courseResponse = await fetch(`${window.API_URL}/course-details/${courseCode}`);
        const courseData = await courseResponse.json();
        
        if (courseData.pattern) {
            const pattern = courseData.pattern;
            
            // Check if this slot type is allowed by the pattern
            const isTypeAllowed = this.isSlotTypeAllowed(slotType, pattern);
            if (!isTypeAllowed) {
                const allowedTypes = this.getAllowedTypes(pattern);
                alert(`❌ This course pattern (${pattern.type.replace(/_/g, ' ')}) does not allow "${slotType}" sections.\n\nAllowed types: ${allowedTypes.join(', ')}`);
                return;
            }
            
            // Calculate duration
            const startHour = parseFloat(startTime.split(':')[0]);
            const endHour = parseFloat(endTime.split(':')[0]);
            const duration = endHour - startHour;
            
            // Check if adding this slot would exceed the type-specific limit
            const currentTypeHours = this.calculateTypeHours(sectionId, slotType);
            const expectedHours = this.getExpectedHours(slotType, pattern);
            
            if (expectedHours > 0 && (currentTypeHours + duration) > expectedHours) {
                alert(`❌ Cannot add ${duration}h ${slotType} slot!\n\nCurrent ${slotType} hours: ${currentTypeHours}h\nMaximum allowed: ${expectedHours}h\nYou can only add ${expectedHours - currentTypeHours}h more for ${slotType}.`);
                return;
            }
        }
    } catch (error) {
        console.error('Error validating pattern:', error);
        alert('Error validating course pattern. Please try again.');
        return;
    }
    
    // ✅ STEP 2: TIME VALIDATION
    const startHour = parseFloat(startTime.split(':')[0]);
    const endHour = parseFloat(endTime.split(':')[0]);
    
    if (startHour >= endHour) {
        alert('End time must be after start time');
        return;
    }
    
    const duration = endHour - startHour;
    
    // ✅ STEP 3: CHECK FOR OVERLAPS WITHIN THIS SECTION
    const existingSlots = this.timeSlots[sectionId].filter(slot => slot.day === day);
    const hasOverlap = existingSlots.some(slot => {
        const existingStart = parseFloat(slot.start_time.split(':')[0]);
        const existingEnd = parseFloat(slot.end_time.split(':')[0]);
        
        return (startHour < existingEnd && endHour > existingStart);
    });
    
    if (hasOverlap) {
        alert('This time slot overlaps with an existing slot on the same day');
        return;
    }
    
    // ✅ STEP 4: CHECK FOR DUPLICATES
    const duplicate = existingSlots.find(slot => 
        slot.start_time === startTime && slot.end_time === endTime
    );
    
    if (duplicate) {
        alert('This exact time slot has already been added');
        return;
    }
    
    // ✅ STEP 5: CHECK IF TUTORIAL/LAB OVERLAPS WITH PARENT LECTURE (if applicable)
    if (slotType === 'tutorial' || slotType.includes('lab')) {
        const followsLectureSelect = document.getElementById(`followsLecture_${sectionId}`);
        
        if (followsLectureSelect && followsLectureSelect.value) {
            const parentLectureValue = followsLectureSelect.value;
            let lectureTimeSlots = [];
            
            // Check if it's a pending section
            if (parentLectureValue.startsWith('pending_')) {
                const pendingSectionId = parseInt(parentLectureValue.split('_')[1]);
                
                // Get time slots from the pending section
                if (this.timeSlots[pendingSectionId]) {
                    lectureTimeSlots = this.timeSlots[pendingSectionId];
                    console.log('📋 Checking against PENDING lecture slots:', lectureTimeSlots);
                }
            } else {
                // This is an existing lecture section from database
                const selectedOption = followsLectureSelect.options[followsLectureSelect.selectedIndex];
                const optionText = selectedOption.textContent;
                
                console.log('📋 Parsing lecture time slots from:', optionText);
                
                // Parse time slots from option text
                // Format: "Section 72681 - Sunday 10:00-12:00, Tuesday 10:00-12:00 (6h)"
                const timeSlotPattern = /(\w+)\s+(\d+):(\d+)-(\d+):(\d+)/g;
                let match;
                
                while ((match = timeSlotPattern.exec(optionText)) !== null) {
                    lectureTimeSlots.push({
                        day: match[1],
                        start_time: `${match[2]}:${match[3]}`,
                        end_time: `${match[4]}:${match[5]}`,
                        duration: parseInt(match[4]) - parseInt(match[2])
                    });
                }
                
                console.log('📋 Parsed lecture slots:', lectureTimeSlots);
            }
            
            // Now check for overlaps
            for (const lectureSlot of lectureTimeSlots) {
                if (lectureSlot.day === day) {
                    const lectureStartHour = parseFloat(lectureSlot.start_time.split(':')[0]);
                    const lectureEndHour = parseFloat(lectureSlot.end_time.split(':')[0]);
                    
                    console.log(`🔍 Checking overlap: ${slotType} ${day} ${startHour}:00-${endHour}:00 vs Lecture ${lectureSlot.day} ${lectureStartHour}:00-${lectureEndHour}:00`);
                    
                    // Check if times overlap
                    if (startHour < lectureEndHour && endHour > lectureStartHour) {
                        alert(`❌ This ${slotType} time slot overlaps with the parent lecture!\n\nLecture: ${day} ${lectureStartHour}:00-${lectureEndHour}:00\nYour slot: ${day} ${startHour}:00-${endHour}:00\n\nPlease choose a different time.`);
                        return;
                    }
                }
            }
            
            console.log('✅ No overlap detected with lecture');
        }
    }

    // ✅ STEP 6: CREATE AND ADD THE SLOT
    const newSlot = {
        day: day,
        start_time: startTime,
        end_time: endTime,
        duration: duration,
        type: slotType
    };
    
    this.timeSlots[sectionId].push(newSlot);
    window.sectionTimeSlotsMap[sectionId].push(newSlot);
    
    this.updateTimeSlotsDisplay(sectionId);
    this.updateCreditHoursStatus(sectionId);
    
    // Clear form
    document.getElementById(`slotType_${sectionId}`).value = '';
    document.getElementById(`dayOfWeek_${sectionId}`).value = '';
    document.getElementById(`startTime_${sectionId}`).value = '';
    document.getElementById(`endTime_${sectionId}`).value = '';
}

    updateTimeSlotsDisplay(sectionId) {
        const container = document.getElementById(`timeSlotsContainer_${sectionId}`);
        const slots = this.timeSlots[sectionId];
        
        if (!slots || slots.length === 0) {
            container.innerHTML = '<p class="text-muted small">No time slots added yet</p>';
            return;
        }
        
        // Calculate total hours
        const totalHours = slots.reduce((sum, slot) => sum + slot.duration, 0);
        
        container.innerHTML = slots.map((slot, index) => `
            <div class="alert alert-info alert-dismissible fade show py-2" role="alert">
                <small>
                    <strong>${slot.day}</strong>: ${slot.start_time} - ${slot.end_time} 
                    <span class="badge bg-secondary ms-2">${slot.duration}h</span>
                    <span class="badge bg-primary ms-1">${slot.type}</span>
                </small>
                <button type="button" class="btn-close" onclick="window.sectionManager.removeTimeSlot(${sectionId}, ${index})"></button>
            </div>
        `).join('');
    }

    removeTimeSlot(sectionId, slotIndex) {
        this.timeSlots[sectionId].splice(slotIndex, 1);
        window.sectionTimeSlotsMap[sectionId].splice(slotIndex, 1); // ✅ SYNC GLOBAL
        this.updateTimeSlotsDisplay(sectionId);
        this.updateCreditHoursStatus(sectionId);
    }

    removeSectionForm(sectionId) {
        const form = document.getElementById(`sectionForm_${sectionId}`);
        if (form) {
            form.remove();
            delete this.timeSlots[sectionId];
            delete this.creditHoursMap[sectionId];
            delete window.sectionTimeSlotsMap[sectionId];
            delete window.sectionCreditHoursMap[sectionId];
        }
    }

    // ==========================================
    // CREDIT HOURS STATUS UPDATE
    // ==========================================
    updateCreditHoursStatus(sectionId) {
    const statusElement = document.getElementById(`creditHoursStatus_${sectionId}`);
    const warningElement = document.getElementById(`creditHoursWarning_${sectionId}`);
    
    if (!statusElement) return;
    
    const courseCode = document.getElementById('sectionCourseCode').value;
    
    fetch(`${window.API_URL}/course-details/${courseCode}`)
        .then(res => res.json())
        .then(courseData => {
            if (!courseData.pattern) {
                // No pattern, use simple display
                const creditHours = this.creditHoursMap[sectionId] || 0;
                const slots = this.timeSlots[sectionId] || [];
                const totalHours = slots.reduce((sum, slot) => sum + slot.duration, 0);
                
                statusElement.textContent = `${totalHours}/${creditHours}`;
                this.updateStatusColor(statusElement, warningElement, totalHours, creditHours);
                return;
            }
            
            const pattern = courseData.pattern;
            
            // Calculate hours by type
            const lectureHours = this.calculateTypeHours(sectionId, 'lecture');
            const labHours = this.calculateTypeHours(sectionId, 'lab');
            const tutorialHours = this.calculateTypeHours(sectionId, 'tutorial');
            const totalHours = lectureHours + labHours + tutorialHours;
            
            // Build status text
            let statusParts = [];
            if (pattern.lecture_hours > 0) {
                statusParts.push(`L:${lectureHours}/${pattern.lecture_hours}`);
            }
            if (pattern.lab_hours > 0) {
                statusParts.push(`Lab:${labHours}/${pattern.lab_hours}`);
            }
            if (pattern.tutorial_hours > 0) {
                statusParts.push(`T:${tutorialHours}/${pattern.tutorial_hours}`);
            }
            
            statusElement.textContent = statusParts.join(' | ') + ` (${totalHours}h)`;
            
            // Check if all types match
            const lectureMatch = pattern.lecture_hours === 0 || lectureHours === pattern.lecture_hours;
            const labMatch = pattern.lab_hours === 0 || labHours === pattern.lab_hours;
            const tutorialMatch = pattern.tutorial_hours === 0 || tutorialHours === pattern.tutorial_hours;
            
            if (lectureMatch && labMatch && tutorialMatch) {
                statusElement.className = 'text-success fw-bold';
                warningElement.innerHTML = '<i class="bi bi-check-circle"></i> Perfect!';
                warningElement.className = 'text-success';
            } else {
                statusElement.className = 'text-warning fw-bold';
                let warnings = [];
                
                if (!lectureMatch && pattern.lecture_hours > 0) {
                    const diff = pattern.lecture_hours - lectureHours;
                    warnings.push(`${diff > 0 ? 'Need' : 'Over'} ${Math.abs(diff)}h lecture`);
                }
                if (!labMatch && pattern.lab_hours > 0) {
                    const diff = pattern.lab_hours - labHours;
                    warnings.push(`${diff > 0 ? 'Need' : 'Over'} ${Math.abs(diff)}h lab`);
                }
                if (!tutorialMatch && pattern.tutorial_hours > 0) {
                    const diff = pattern.tutorial_hours - tutorialHours;
                    warnings.push(`${diff > 0 ? 'Need' : 'Over'} ${Math.abs(diff)}h tutorial`);
                }
                
                warningElement.innerHTML = `<i class="bi bi-exclamation-triangle"></i> ${warnings.join(', ')}`;
                warningElement.className = 'text-warning';
            }
        })
        .catch(error => console.error('Error:', error));
}

updateStatusColor(statusElement, warningElement, totalHours, creditHours) {
    if (creditHours > 0) {
        if (totalHours === creditHours) {
            statusElement.className = 'text-success fw-bold';
            warningElement.innerHTML = '<i class="bi bi-check-circle"></i> Perfect match!';
            warningElement.className = 'text-success';
        } else if (totalHours < creditHours) {
            statusElement.className = 'text-warning fw-bold';
            warningElement.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Need ${creditHours - totalHours} more hour(s)`;
            warningElement.className = 'text-warning';
        } else {
            statusElement.className = 'text-danger fw-bold';
            warningElement.innerHTML = `<i class="bi bi-x-circle"></i> ${totalHours - creditHours} hour(s) over`;
            warningElement.className = 'text-danger';
        }
    }
}


    updateCreditHoursFromLecture(sectionId) {
        console.log('🔍 updateCreditHoursFromLecture called for section:', sectionId);
        
        const lectureSelect = document.getElementById(`followsLecture_${sectionId}`);
        const selectedOption = lectureSelect.options[lectureSelect.selectedIndex];
        const sectionType = document.getElementById(`sectionType_${sectionId}`).value;
        
        console.log('Selected option:', selectedOption);
        console.log('Selected value:', selectedOption?.value);
        
        if (!selectedOption || !selectedOption.value) {
            console.log('❌ No lecture selected, using only lab/tutorial hours');
            this.updateCreditHoursStatus(sectionId);
            return;
        }
        
        // Get lecture hours from data attribute
        const lectureHours = parseInt(selectedOption.getAttribute('data-lecture-hours') || 0);
        console.log('🎓 Lecture hours from data attribute:', lectureHours);
        
        // Calculate lab/tutorial hours
        const labTutorialSlots = this.timeSlots[sectionId] || [];
        const labTutorialHours = labTutorialSlots.reduce((sum, slot) => sum + slot.duration, 0);
        console.log('🧪 Lab/Tutorial hours:', labTutorialHours);
        
        // Total hours = lecture + lab/tutorial
        const totalHours = lectureHours + labTutorialHours;
        console.log('📈 Total hours:', totalHours);
        
        const creditHours = this.creditHoursMap[sectionId] || 0;
        console.log('💯 Credit hours required:', creditHours);
        
        const statusElement = document.getElementById(`creditHoursStatus_${sectionId}`);
        const warningElement = document.getElementById(`creditHoursWarning_${sectionId}`);
        
        if (statusElement) {
            // Get the course details to find expected hours for this section type
            const courseCode = document.getElementById('sectionCourseCode').value;
            
            fetch(`${window.API_URL}/course-details/${courseCode}`)
                .then(res => res.json())
                .then(courseData => {
                    if (!courseData.pattern) {
                        // No pattern, show basic hours
                        statusElement.textContent = `${labTutorialHours}/${creditHours}`;
                        return;
                    }
                    
                    const pattern = courseData.pattern;
                    let expectedHours = 0;
                    
                    if (sectionType === 'tutorial') {
                        expectedHours = pattern.tutorial_hours;
                    } else if (sectionType.includes('lab')) {
                        expectedHours = pattern.lab_hours;
                    }
                    
                    // Show breakdown with expected hours for this section type only
                    if (labTutorialHours > 0) {
                        statusElement.textContent = `${lectureHours}+${labTutorialHours}/${expectedHours}`;
                    } else {
                        statusElement.textContent = `${lectureHours}+0/${expectedHours}`;
                    }
                    
                    console.log('✏️ Updated status display to:', statusElement.textContent);
                    
                    // Add color coding based on expected hours
                    if (expectedHours > 0) {
                        if (labTutorialHours === expectedHours) {
                            statusElement.className = 'text-success fw-bold';
                            warningElement.innerHTML = '<i class="bi bi-check-circle"></i> Perfect match!';
                            warningElement.className = 'text-success';
                        } else if (labTutorialHours < expectedHours) {
                            statusElement.className = 'text-warning fw-bold';
                            const remaining = expectedHours - labTutorialHours;
                            warningElement.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Need ${remaining} more hour(s) for ${sectionType}`;
                            warningElement.className = 'text-warning';
                        } else {
                            statusElement.className = 'text-danger fw-bold';
                            const excess = labTutorialHours - expectedHours;
                            warningElement.innerHTML = `<i class="bi bi-x-circle"></i> ${excess} hour(s) over limit`;
                            warningElement.className = 'text-danger';
                        }
                    } else {
                        statusElement.className = 'text-muted';
                        warningElement.innerHTML = '';
                    }
                    
                    console.log('✅ Credit hours update complete!');
                })
                .catch(error => console.error('Error fetching pattern:', error));
        } else {
            console.error('❌ Status element not found!');
        }
    }

    // ==========================================
    // CREATE ALL SECTIONS
    // ==========================================
    async createAllSections() {
        const academicLevel = document.getElementById('sectionAcademicLevel').value;
        const courseCode = document.getElementById('sectionCourseCode').value;
        const sectionForms = document.querySelectorAll('.section-form-card');
        
        if (!courseCode) {
            alert('Please select Course Code');
            return;
        }
        
        if (sectionForms.length === 0) {
            alert('Please add at least one section first');
            return;
        }
        
        // Get course details to check credit hours
        let courseCreditHours = 0;
        let courseName = '';
        try {
            const response = await fetch(`${window.API_URL}/course-details/${courseCode}`);
            if (response.ok) {
                const courseData = await response.json();
                courseCreditHours = courseData.credit_hours || 0;
                courseName = courseData.name || courseCode;
            }
        } catch (error) {
            console.error('Error fetching course details:', error);
        }
        
        const sections = [];
        const errors = [];
        const warnings = [];
        
sectionForms.forEach(form => {
    const sectionId = parseInt(form.id.split('_')[1]);
    const slots = this.timeSlots[sectionId];
    
    if (!slots || slots.length === 0) {
        errors.push(`Section #${sectionId}: No time slots added`);
        return;
    }
    
    // Calculate total hours for this section
    const totalHours = slots.reduce((sum, slot) => sum + slot.duration, 0);
    
    // Validate against credit hours
    if (courseCreditHours > 0) {
        if (totalHours < courseCreditHours) {
            warnings.push(`Section #${sectionId}: Only ${totalHours}h (needs ${courseCreditHours}h)`);
        } else if (totalHours > courseCreditHours + 2) {
            warnings.push(`Section #${sectionId}: ${totalHours}h (significantly exceeds ${courseCreditHours}h)`);
        }
    }

            
            // Convert to unified format: "type: Day HH:MM-HH:MM"
const timeSlotStrings = slots.map(slot => 
    `${slot.type}: ${slot.day} ${slot.start_time}-${slot.end_time}`
);

sections.push({
    section_id: sectionId,
    time_Slot: timeSlotStrings,
    time_slots_detail: slots
});

        });
        
        if (errors.length > 0) {
            alert('Please fix the following errors:\n\n' + errors.join('\n'));
            return;
        }
        
        let confirmMsg = `Create ${sections.length} section(s) for ${courseCode} - ${courseName}?\n\n`;
        
        sections.forEach(s => {
    const totalHours = s.time_slots_detail.reduce((sum, slot) => sum + slot.duration, 0);
    const status = courseCreditHours > 0 ? 
        (totalHours === courseCreditHours ? '✅' : 
         totalHours < courseCreditHours ? '⚠️' : '❌') : 'ℹ️';
    
    // Count slot types
    const lectureCount = s.time_slots_detail.filter(slot => slot.type === 'lecture').length;
    const labCount = s.time_slots_detail.filter(slot => slot.type.includes('lab')).length;
    const tutorialCount = s.time_slots_detail.filter(slot => slot.type === 'tutorial').length;
    
    let typeInfo = '';
    if (lectureCount > 0) typeInfo += `${lectureCount}L `;
    if (labCount > 0) typeInfo += `${labCount}Lab `;
    if (tutorialCount > 0) typeInfo += `${tutorialCount}T`;
    
    confirmMsg += `${status} Section #${s.section_id} [${typeInfo.trim()}]: ${totalHours}h/${courseCreditHours}h\n`;
});

        
        if (courseCreditHours > 0) {
            confirmMsg += `\nCourse Credit Hours: ${courseCreditHours}`;
        }
        
        if (warnings.length > 0) {
            confirmMsg += `\n\nWarnings:\n${warnings.join('\n')}`;
        }
        
        if (!confirm(confirmMsg)) {
            return;
        }
        
        let successCount = 0;
        let failCount = 0;
        const results = [];
        
        for (const section of sections) {
            try {
                const response = await fetch(`${window.API_URL}/create-section-unified`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        course_code: courseCode,
        classroom: null,
        max_Number: null,
        time_Slot: section.time_Slot,
        time_slots_detail: section.time_slots_detail,
        academic_level: academicLevel ? parseInt(academicLevel) : null,
        created_by: 'manual_entry'
    })
});
                
                const data = await response.json();
                
                if (response.ok) {
                    successCount++;
                   const totalHours = section.time_slots_detail.reduce((sum, slot) => sum + slot.duration, 0);
const status = courseCreditHours > 0 ? 
    (totalHours === courseCreditHours ? '✅' : 
     totalHours < courseCreditHours ? '⚠️' : '❌') : '✅';
results.push(`${status} Section ${data.section.sec_num}: ${totalHours}h with ${section.time_Slot.length} slots`);

                } else {
                    failCount++;
                    results.push(`❌ Section #${section.section_id} (${section.type}): ${data.error}`);
                }
            } catch (error) {
                failCount++;
                results.push(`❌ Section #${section.section_id} (${section.type}): Connection error`);
            }
        }
        
        alert(`Section Creation Complete!\n\n` +
              `✅ Successful: ${successCount}\n` +
              `❌ Failed: ${failCount}\n\n` +
              `Details:\n${results.join('\n')}`);
        
        if (successCount > 0) {
            document.getElementById('sectionsContainer').innerHTML = '';
            this.formCounter = 0;
            window.sectionFormCounter = 0;
            this.timeSlots = {};
            this.creditHoursMap = {};
            window.sectionTimeSlotsMap = {};
            window.sectionCreditHoursMap = {};
        }
    }

    reset() {
        document.getElementById('sectionsContainer').innerHTML = '';
        this.formCounter = 0;
        window.sectionFormCounter = 0;
        this.timeSlots = {};
        this.creditHoursMap = {};
        window.sectionTimeSlotsMap = {};
        window.sectionCreditHoursMap = {};
        if (document.getElementById('sectionForm')) {
            document.getElementById('sectionForm').reset();
        }
    }
}

// ✅ EXPOSE TO WINDOW
window.sectionManager = null;
console.log('✅ SectionManager COMPLETE loaded');