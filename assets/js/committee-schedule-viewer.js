// ====== LOAD COMMITTEE VERSION: assets/js/committee-schedule-viewer.js ======
// Shows schedules from Version 1+ (including all drafts and versions)

let currentLevel = 3; // ✅ Default level for committee
let currentCellInfo = null; 
const API_BASE_URL = 'http://localhost:4000';

// ================= INITIALIZATION =================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Load Committee Schedule system initialized');
    
    initializeLevelButtons();
    fetchCommitteeSchedule(currentLevel); 
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
    console.log(`🔄 Committee switching to level: ${level}`);
    
    document.querySelectorAll('#levelButtonsGroup .btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline-primary');
    });
    clickedButton.classList.remove('btn-outline-primary');
    clickedButton.classList.add('btn-primary');
    
    fetchCommitteeSchedule(level);
}

// ================= DATA FETCHING =================

async function fetchCommitteeSchedule(level) {
    const container = document.getElementById("scheduleContainer"); 
    if (!container) {
        console.error('❌ scheduleContainer not found!');
        return;
    }
    
    container.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Loading all schedule versions for Level ${level}...</p>
        </div>
    `;

    try {
        // ✅ استخدام endpoint خاص باللجنة
        const url = `${API_BASE_URL}/api/committee-schedules/${level}`;
        console.log(`📡 [COMMITTEE] Fetching from: ${url}`);
        
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
            return displayError(container, `No schedules available for Level ${level}.`);
        }

        console.log(`✅ Found ${data.count} schedule version(s)`);
        console.log(`📊 Latest version: ${data.schedules[0].version}`);
        
        displaySchedules(data.schedules[0]); 
        updateScheduleTitle(level, data.schedules[0], data.allVersions);
        
        // ✅ عرض معلومات إضافية عن النسخ المتاحة
        displayVersionsInfo(data.allVersions);
        
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

    console.log('🎨 Rendering schedule for committee:', schedule);

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
        
        timeSlots.forEach((timeSlot) => {
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
                    // ✅ نفس التفاعل مثل Faculty
                    tableHTML += `
                        <td class="schedule-cell course-cell" 
                            style="background-color: #e3f2fd; cursor: pointer; position: relative;"
                            onclick="openCommentForCell('${escapeHtml(courseCode)}', '${escapeHtml(courseName)}', '${day}', '${timeSlot}')"
                            title="Click to add committee comment">
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
    
    updateScheduleBadges(schedule.version, schedule.publishedAt);
}

// ================= VERSIONS INFO =================

function displayVersionsInfo(allVersions) {
    const badgesContainer = document.getElementById('scheduleBadges');
    if (!badgesContainer || !allVersions) return;

    const totalVersions = allVersions.length;
    const draftVersions = allVersions.filter(v => !v.publishedAt).length;
    const publishedVersions = allVersions.filter(v => v.publishedAt).length;

    // إضافة معلومات عن جميع النسخ
    const versionsInfo = `
        <div class="d-flex gap-2 align-items-center">
            <span class="badge bg-info">📋 ${totalVersions} Total Versions</span>
            <span class="badge bg-warning">✏️ ${draftVersions} Drafts</span>
            <span class="badge bg-success">✅ ${publishedVersions} Published</span>
        </div>
    `;
    
    // إضافة قبل الـ badges الموجودة
    const existingBadges = badgesContainer.innerHTML;
    badgesContainer.innerHTML = versionsInfo + existingBadges;
}

// ================= HELPER FUNCTIONS =================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Open comment modal for committee member
 */
function openCommentForCell(courseCode, courseName, day, timeSlot) {
    console.log('🖱️ Committee Cell clicked:', { courseCode, courseName, day, timeSlot });
    
    if (window.facultyCommentMaker) {
        window.facultyCommentMaker.openCommentModal({
            courseCode: courseCode,
            courseName: courseName,
            day: day,
            timeSlot: timeSlot,
            level: currentLevel
        });
    } else {
        console.error('❌ Faculty Comment Maker not initialized');
        alert('❌ Comment system not ready. Please refresh the page.');
    }
}

function updateScheduleBadges(version, publishedAt) {
    const badgesContainer = document.getElementById('scheduleBadges');
    if (badgesContainer) {
        let versionBadge = version === 1 
            ? '<span class="badge bg-warning">📝 Version 1 (Draft)</span>'
            : `<span class="badge bg-primary">📄 Version ${version}</span>`;
            
        let statusBadge = publishedAt 
            ? '<span class="badge bg-success">✅ Published</span>'
            : '<span class="badge bg-warning">⏳ Draft</span>';
            
        badgesContainer.innerHTML = `
            <div class="d-flex gap-2">
                ${versionBadge}
                ${statusBadge}
            </div>
        `;
    }
}

function updateScheduleTitle(level, schedule, allVersions) {
    const scheduleTitle = document.getElementById('scheduleTitle');
    if (scheduleTitle && schedule) {
        const versionInfo = allVersions && allVersions.length > 1 
            ? ` (${allVersions.length} versions available)`
            : '';
            
        scheduleTitle.innerHTML = 
            `<i class="bi bi-calendar3"></i> Academic Schedule - Level ${level} - Version ${schedule.version}${versionInfo}`;
    }
}

console.log('✅ committee-schedule-viewer.js loaded successfully');
console.log('📌 Current level:', currentLevel);
console.log('🔗 API Base URL:', API_BASE_URL);
console.log('👥 Load Committee can view ALL versions (v1+)');