/**
 * Common utility functions for N.F.T.A-CORP
 */

// Example: Function to format dates
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US');
}

// Example: Function to generate a random ID
function generateId(length = 8) {
    return Math.random().toString(36).substr(2, length);
}

// Example: Function to check if a value is empty
function isEmpty(value) {
    return value === undefined || value === null || value === '';
}

// Export functions (if using modules)
export { formatDate, generateId, isEmpty };