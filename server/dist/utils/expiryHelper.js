/**
 * Utility to accurately parse Indian market option contract expiry dates
 * and determine if a contract or intraday trade tip has expired.
 */
export function parseExpiryDateToIST(dateStr) {
    if (!dateStr)
        return null;
    const s = dateStr.trim();
    // Format: "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        // 15:30 IST is 10:00 UTC
        return new Date(Date.UTC(y, m - 1, d, 10, 0, 0));
    }
    // Format: "DD-Mon-YYYY" (e.g. "02-Sep-2026" or "28-AUG-2026")
    const match = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{4})$/);
    if (match) {
        const d = parseInt(match[1], 10);
        const monthStr = match[2].toLowerCase();
        const y = parseInt(match[3], 10);
        const months = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };
        const m = months[monthStr];
        if (m !== undefined) {
            // 15:30 IST is 10:00 UTC
            return new Date(Date.UTC(y, m, d, 10, 0, 0));
        }
    }
    // Format: "DDMMYYYY" (e.g. "02092026")
    if (/^\d{8}$/.test(s)) {
        const d = parseInt(s.substring(0, 2), 10);
        const m = parseInt(s.substring(2, 4), 10) - 1;
        const y = parseInt(s.substring(4, 8), 10);
        return new Date(Date.UTC(y, m, d, 10, 0, 0));
    }
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) {
        return new Date(parsed);
    }
    return null;
}
export function isContractOrSignalExpired(expiryDateStr, timestampStr, validUntilMinutes) {
    const now = Date.now();
    // 1. Check intraday signal lifetime (e.g. 15-20 min max validity for scalps)
    if (timestampStr) {
        const signalTime = new Date(timestampStr).getTime();
        if (!isNaN(signalTime)) {
            const maxAgeMs = (validUntilMinutes || 20) * 60 * 1000;
            if (now - signalTime > maxAgeMs) {
                return true;
            }
        }
    }
    // 2. Check contract calendar expiry (e.g. contract expired on past date or past 15:30 IST today)
    if (expiryDateStr) {
        const expDate = parseExpiryDateToIST(expiryDateStr);
        if (expDate) {
            if (now > expDate.getTime()) {
                return true;
            }
        }
    }
    return false;
}
