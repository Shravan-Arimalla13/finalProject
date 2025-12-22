// server/utils/helpers.js
exports.normalizeUSN = (usn) => (usn ? usn.toUpperCase().trim() : null);
exports.normalizeDept = (dept) => (dept ? dept.toUpperCase().trim() : 'GENERAL');
exports.normalizeEmail = (email) => (email ? email.toLowerCase().trim() : null);