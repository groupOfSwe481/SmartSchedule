// js/utils/validation.js - FIXED VERSION
class ValidationUtils {
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validateCourseCode(code) {
        const re = /^[A-Z]{3,4}\d{3}$/i;
        return re.test(code);
    }

    static validateTimeSlot(timeSlot) {
        const re = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return re.test(timeSlot);
    }

    static validateLevel(level) {
        return [3, 4, 5, 6, 7, 8].includes(parseInt(level));
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/[<>]/g, '');
    }
}

// ✅ Make globally available
window.ValidationUtils = ValidationUtils;
console.log('✅ ValidationUtils loaded');