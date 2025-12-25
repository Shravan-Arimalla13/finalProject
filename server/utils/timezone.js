// server/utils/timezone.js - COMPREHENSIVE IST TIMEZONE HELPER

/**
 * Timezone Utility for Indian Standard Time (IST)
 * IST = UTC+5:30 (No DST)
 */

const IST_OFFSET_HOURS = 5;
const IST_OFFSET_MINUTES = 30;
const IST_OFFSET_MS = (IST_OFFSET_HOURS * 60 + IST_OFFSET_MINUTES) * 60 * 1000;

/**
 * Get current time in IST
 * @returns {Date} Current IST time as Date object
 */
function getCurrentIST() {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utcTime + IST_OFFSET_MS);
}

/**
 * Convert any Date to IST Date object
 * @param {Date|string} date - Date to convert
 * @returns {Date} IST Date object
 */
function toIST(date) {
    const d = new Date(date);
    const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utcTime + IST_OFFSET_MS);
}

/**
 * Get IST date string (YYYY-MM-DD)
 * @param {Date} date - Optional date, defaults to now
 * @returns {string} ISO date string in IST
 */
function getISTDateString(date = getCurrentIST()) {
    const istDate = toIST(date);
    return istDate.toISOString().split('T')[0];
}

/**
 * Get IST time string (HH:MM)
 * @param {Date} date - Optional date, defaults to now
 * @returns {string} Time string in HH:MM format
 */
function getISTTimeString(date = getCurrentIST()) {
    const istDate = toIST(date);
    const hours = String(istDate.getHours()).padStart(2, '0');
    const minutes = String(istDate.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Parse event date and time in IST
 * @param {Date|string} eventDate - Event date
 * @param {string} timeString - Time in HH:MM format
 * @returns {Date} Combined datetime in IST
 */
function parseEventTimeIST(eventDate, timeString) {
    const dateStr = getISTDateString(new Date(eventDate));
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Create date in IST context
    const istDate = new Date(dateStr + 'T00:00:00');
    istDate.setHours(hours, minutes, 0, 0);
    
    return istDate;
}

/**
 * Check if current IST time is within event window
 * @param {Date} eventDate - Event date
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @param {number} bufferMinutes - Minutes before start to allow (default: 30)
 * @returns {Object} Validation result
 */
function validateEventTimeIST(eventDate, startTime, endTime, bufferMinutes = 30) {
    const now = getCurrentIST();
    const startDateTime = parseEventTimeIST(eventDate, startTime);
    const endDateTime = parseEventTimeIST(eventDate, endTime);
    const bufferStart = new Date(startDateTime.getTime() - (bufferMinutes * 60 * 1000));
    
    console.log(`🕐 IST Time Check:
    Current IST: ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
    Event Start: ${startDateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
    Event End: ${endDateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
    Buffer Start: ${bufferStart.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    
    if (now < bufferStart) {
        return {
            isValid: false,
            status: 'TOO_EARLY',
            message: `Event opens at ${startTime} IST (${bufferMinutes} min buffer). Current IST: ${getISTTimeString(now)}`
        };
    }
    
    if (now > endDateTime) {
        return {
            isValid: false,
            status: 'TOO_LATE',
            message: `Event ended at ${endTime} IST. Current IST: ${getISTTimeString(now)}`
        };
    }
    
    return {
        isValid: true,
        status: 'VALID',
        message: 'Within valid time window',
        currentIST: now,
        startIST: startDateTime,
        endIST: endDateTime
    };
}

/**
 * Calculate event status based on IST
 * @param {Date} eventDate - Event date
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @returns {string} Status: 'Upcoming', 'Ongoing', 'Completed'
 */
function getEventStatusIST(eventDate, startTime, endTime) {
    const now = getCurrentIST();
    const startDateTime = parseEventTimeIST(eventDate, startTime);
    const endDateTime = parseEventTimeIST(eventDate, endTime);
    
    if (now > endDateTime) return 'Completed';
    if (now >= startDateTime && now <= endDateTime) return 'Ongoing';
    return 'Upcoming';
}

/**
 * Calculate attendance score based on IST punctuality
 * @param {Date} eventDate - Event date
 * @param {string} startTime - Scheduled start time
 * @param {Date} checkInTime - Actual check-in time
 * @returns {number} Score from 50-100
 */
function calculateAttendanceScoreIST(eventDate, startTime, checkInTime) {
    const scheduledStart = parseEventTimeIST(eventDate, startTime);
    const checkIn = toIST(checkInTime);
    
    // On time or early = 100
    if (checkIn <= scheduledStart) return 100;
    
    // Calculate late minutes
    const lateMinutes = (checkIn - scheduledStart) / (1000 * 60);
    const deduction = Math.floor(lateMinutes / 10) * 5;
    
    return Math.max(50, 100 - deduction);
}

/**
 * Format IST datetime for display
 * @param {Date} date - Date to format
 * @param {boolean} includeTime - Include time component
 * @returns {string} Formatted string
 */
function formatISTDisplay(date, includeTime = true) {
    const istDate = toIST(date);
    const options = {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(includeTime && {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    };
    return istDate.toLocaleString('en-IN', options) + ' IST';
}

/**
 * Get IST timestamp for database storage
 * MongoDB stores in UTC, but we want to ensure our logic uses IST
 * @returns {Date} Current IST as Date object (will be stored as UTC in DB)
 */
function getISTTimestamp() {
    return getCurrentIST();
}

/**
 * Compare two times in IST context
 * @param {Date} time1 - First time
 * @param {Date} time2 - Second time
 * @returns {number} -1 if time1 < time2, 0 if equal, 1 if time1 > time2
 */
function compareIST(time1, time2) {
    const ist1 = toIST(time1).getTime();
    const ist2 = toIST(time2).getTime();
    return ist1 < ist2 ? -1 : ist1 > ist2 ? 1 : 0;
}

module.exports = {
    getCurrentIST,
    toIST,
    getISTDateString,
    getISTTimeString,
    parseEventTimeIST,
    validateEventTimeIST,
    getEventStatusIST,
    calculateAttendanceScoreIST,
    formatISTDisplay,
    getISTTimestamp,
    compareIST,
    IST_OFFSET_MS
};