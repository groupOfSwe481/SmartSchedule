// Faculty Dashboard - Main Initialization

// Global state management
window.courseFormCounter = 0;
window.sectionFormCounter = 0;
window.sectionTimeSlotsMap = {};
window.sectionCreditHoursMap = {};

// Department mapping
window.departmentMapping = {
    'Science': 'Physics & Astronomy',
    'CSC': 'Computer Science',
    'IC': 'Islamic Culture',
    'IT': 'Information Technology',
    'IS': 'Information Systems',
    'Math': 'Mathematics',
    'CEN': 'Computer engineering'
};

// Initialize managers
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Initializing Faculty Dashboard...');
    
    await waitForDependencies();
    
    window.courseManager = new CourseManager();
    window.sectionManager = new SectionManager();
    window.fileUploadManager = new FileUploadManager();
    
    console.log('✅ All managers initialized');
    
    await loadInitialData();
    
    console.log('✅ Dashboard ready!');
});

async function waitForDependencies() {
    const maxAttempts = 50;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        if (typeof APIClient !== 'undefined' && 
            typeof CourseManager !== 'undefined' && 
            typeof SectionManager !== 'undefined' &&
            typeof FileUploadManager !== 'undefined') {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    throw new Error('Failed to load required dependencies');
}

async function loadInitialData() {
    try {
        await window.courseManager.loadAllCoursesForPrerequisites();
        console.log('✅ Courses loaded for prerequisites');
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

// Global functions called from HTML
window.addCourseForm = function() {
    window.courseManager.addCourseForm();
};

window.createAllCourses = async function() {
    await window.courseManager.createAllCourses();
};

window.filterCourses = async function() {
    await window.sectionManager.filterCourses();
};

window.updateCourseName = async function() {
    await window.sectionManager.updateCourseName();
};

window.addSectionForm = async function() {
    await window.sectionManager.addSectionForm();
};

window.createAllSections = async function() {
    await window.sectionManager.createAllSections();
};

window.showManualEntry = function() {
    window.fileUploadManager.showManualEntry();
};

window.showFileUpload = function() {
    window.fileUploadManager.showFileUpload();
};

window.handleFileSelect = async function(event) {
    await window.fileUploadManager.handleFileSelect(event);
};

window.processUploadedSchedule = async function() {
    await window.fileUploadManager.processUploadedSchedule();
};

window.cancelFileUpload = function() {
    window.fileUploadManager.cancelFileUpload();
};

console.log('✅ Faculty Dashboard script loaded');