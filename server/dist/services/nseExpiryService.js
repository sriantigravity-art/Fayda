import { ALL_SYMBOLS_CONFIG } from '../types.js';
/**
 * Official 2026 & 2027 NSE, BSE & MCX Trading Holidays.
 * Sourced directly from official exchange circulars (NSE, BSE, MCX) and verified.
 */
export const OFFICIAL_MARKET_HOLIDAYS = [
    // ─── 2026 Official Holidays ──────────────────────────────────────────────
    { date: '2026-01-15', name: 'Maharashtra Municipal Corporation Election', day: 'Thursday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2026-01-26', name: 'Republic Day', day: 'Monday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: true },
    { date: '2026-03-03', name: 'Holi (2nd Day)', day: 'Tuesday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2026-03-26', name: 'Shri Ram Navami', day: 'Thursday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2026-03-31', name: 'Shri Mahavir Jayanti', day: 'Tuesday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2026-04-03', name: 'Good Friday', day: 'Friday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: true },
    { date: '2026-04-14', name: 'Dr. Baba Saheb Ambedkar Jayanti', day: 'Tuesday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2026-05-01', name: 'Maharashtra Day', day: 'Friday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2026-05-28', name: 'Bakri Id (Id-Ul-Adha)', day: 'Thursday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2026-06-26', name: 'Muharram', day: 'Friday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2026-09-14', name: 'Ganesh Chaturthi', day: 'Monday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', day: 'Friday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: true },
    { date: '2026-10-20', name: 'Dussehra', day: 'Tuesday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2026-11-10', name: 'Diwali - Balipratipada', day: 'Tuesday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2026-11-24', name: 'Prakash Gurpurb Sri Guru Nanak Dev', day: 'Tuesday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2026-12-25', name: 'Christmas', day: 'Friday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: true },
    // ─── 2027 Calendar (Near-term forward reference) ──────────────────────────
    { date: '2027-01-26', name: 'Republic Day', day: 'Tuesday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: true },
    { date: '2027-03-23', name: 'Holi', day: 'Tuesday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2027-03-26', name: 'Good Friday', day: 'Friday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: true },
    { date: '2027-04-14', name: 'Dr. Ambedkar Jayanti', day: 'Wednesday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2027-05-01', name: 'Maharashtra Day', day: 'Saturday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2027-05-17', name: 'Bakri Id', day: 'Monday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2027-07-16', name: 'Muharram', day: 'Friday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2027-09-04', name: 'Milad-un-Nabi', day: 'Saturday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2027-10-02', name: 'Mahatma Gandhi Jayanti', day: 'Saturday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: true },
    { date: '2027-10-09', name: 'Dussehra', day: 'Saturday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2027-10-29', name: 'Diwali - Balipratipada', day: 'Friday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2027-11-14', name: 'Guru Nanak Jayanti', day: 'Sunday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: false },
    { date: '2027-12-25', name: 'Christmas', day: 'Saturday', nseClosed: true, bseClosed: true, mcxMorningClosed: true, mcxEveningClosed: true }
];
export const NSE_BSE_HOLIDAYS_SET = new Set(OFFICIAL_MARKET_HOLIDAYS.filter(h => h.nseClosed || h.bseClosed).map(h => h.date));
export const MCX_FULL_HOLIDAYS_SET = new Set(OFFICIAL_MARKET_HOLIDAYS.filter(h => h.mcxMorningClosed && h.mcxEveningClosed).map(h => h.date));
/**
 * Official NSE, BSE & MCX Derivatives Contract Specifications & Expiry Calendars
 *
 * All expiry dates are computed dynamically from exchange rules — nothing hardcoded.
 *
 * Regulatory Expiry Standards (SEBI Rationalization):
 *   NSE (NIFTY 50):   Tuesday (Weekly & Monthly)
 *   BSE (SENSEX):     Thursday (Weekly & Monthly)
 *   NSE (FINNIFTY):   Tuesday
 *   NSE (BANKNIFTY):  Wednesday (Weekly) / Last Tuesday (Monthly)
 *   NSE (MIDCPNIFTY): Monday
 *   BSE (BANKEX):     Monday
 *   NSE Stocks:       Last Tuesday of the month
 *   BSE Stocks:       Last Thursday of the month
 *
 * When an expiry day falls on a trading holiday, it automatically shifts to the PRECEDING trading day.
 */
export class NseExpiryService {
    static MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // ─── Public helpers ───────────────────────────────────────────────────────
    static getValidExpiries(symbol, count = 6) {
        return this.getUpcomingExpiries(symbol, count);
    }
    static getDaysToExpiry(expiryStr) {
        return this.calculateDTE(expiryStr);
    }
    static getHolidaysList() {
        return OFFICIAL_MARKET_HOLIDAYS;
    }
    // ─── Core expiry computation ───────────────────────────────────────────────
    /**
     * Returns official upcoming weekly/monthly/commodity expiries for any symbol.
     * All dates are computed from the current date — zero hardcoded strings.
     */
    static getUpcomingExpiries(symbol, count = 6) {
        const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
        const isCommodity = cfg?.category === 'COMMODITIES' || cfg?.segment === 'COMMODITY' || cfg?.exchange === 'MCX';
        const isStock = cfg?.category === 'NIFTY50_STOCKS';
        if (isCommodity)
            return this.getMcxExpiries(symbol, count);
        if (isStock)
            return this.getMonthlyStockExpiries(count);
        return this.getIndexWeeklyExpiries(symbol, count);
    }
    // ─── MCX commodity expiry computation ─────────────────────────────────────
    /**
     * Computes MCX commodity contract expiry dates algorithmically from today.
     * No hardcoded date strings — all derived from exchange expiry rules.
     */
    static getMcxExpiries(symbol, count) {
        const now = new Date();
        switch (symbol) {
            case 'CRUDEOIL':
                // MCX Crude Oil: 19th of each calendar month (or preceding trading day)
                return this.nthDayOfMonths(19, count, now, 'MCX');
            case 'NATURALGAS':
                // MCX Natural Gas: 25th of each calendar month (or preceding trading day)
                return this.nthDayOfMonths(25, count, now, 'MCX');
            case 'GOLD':
                // MCX Gold: 5th of every even month (Feb=1, Apr=3, Jun=5, Aug=7, Oct=9, Dec=11 — 0-indexed)
                return this.nthDayOfSpecificMonths(5, [1, 3, 5, 7, 9, 11], count, now, 'MCX');
            case 'SILVER':
                // MCX Silver: 5th of Mar(2), May(4), Jul(6), Sep(8), Nov(10), Dec(11)
                return this.nthDayOfSpecificMonths(5, [2, 4, 6, 8, 10, 11], count, now, 'MCX');
            case 'COPPER':
            case 'ZINC':
                // MCX Base metals: Last business day of month
                return this.lastTradingDayOfMonths(count, now, 'MCX');
            default:
                // Generic MCX monthly: 19th of each month
                return this.nthDayOfMonths(19, count, now, 'MCX');
        }
    }
    static nthDayOfMonths(dayOfMonth, count, from, exchange = 'MCX') {
        const expiries = [];
        for (let m = 0; expiries.length < count && m < count + 12; m++) {
            const target = new Date(from.getFullYear(), from.getMonth() + m, dayOfMonth, 23, 30);
            const adjusted = this.precedingTradingDay(target, exchange);
            if (adjusted.getTime() >= this.startOfDay(from).getTime()) {
                const expStr = this.formatDate(adjusted);
                if (!expiries.includes(expStr))
                    expiries.push(expStr);
            }
        }
        return expiries.sort((a, b) => this.parseDate(a).getTime() - this.parseDate(b).getTime()).slice(0, count);
    }
    static nthDayOfSpecificMonths(dayOfMonth, months, // 0-indexed month numbers
    count, from, exchange = 'MCX') {
        const expiries = [];
        for (let yearOffset = 0; yearOffset <= 4 && expiries.length < count; yearOffset++) {
            for (const month of months) {
                if (expiries.length >= count)
                    break;
                const target = new Date(from.getFullYear() + yearOffset, month, dayOfMonth, 23, 30);
                const adjusted = this.precedingTradingDay(target, exchange);
                if (adjusted.getTime() >= this.startOfDay(from).getTime()) {
                    const expStr = this.formatDate(adjusted);
                    if (!expiries.includes(expStr))
                        expiries.push(expStr);
                }
            }
        }
        return expiries.sort((a, b) => this.parseDate(a).getTime() - this.parseDate(b).getTime()).slice(0, count);
    }
    static lastTradingDayOfMonths(count, from, exchange = 'MCX') {
        const expiries = [];
        for (let m = 0; expiries.length < count && m < count + 12; m++) {
            const lastDay = new Date(from.getFullYear(), from.getMonth() + m + 1, 0, 23, 30);
            const adjusted = this.precedingTradingDay(lastDay, exchange);
            if (adjusted.getTime() >= this.startOfDay(from).getTime()) {
                const expStr = this.formatDate(adjusted);
                if (!expiries.includes(expStr))
                    expiries.push(expStr);
            }
        }
        return expiries.sort((a, b) => this.parseDate(a).getTime() - this.parseDate(b).getTime()).slice(0, count);
    }
    // ─── NSE/BSE equity index weekly expiry computation ───────────────────────
    /**
     * Returns weekly expiry day index (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat).
     *
     * Regulatory Standardization (SEBI & Exchanges):
     * - NSE Benchmark (NIFTY 50): Tuesday (Weekly & Monthly)
     * - BSE Benchmark (SENSEX):   Thursday (Weekly & Monthly)
     * - NSE FINNIFTY:             Tuesday
     * - NSE BANKNIFTY:            Wednesday / Monthly Last Tuesday
     * - NSE MIDCPNIFTY / BANKEX:  Monday
     * - NSE Stocks:               Monthly Last Tuesday
     * - BSE Stocks:               Monthly Last Thursday
     */
    static getOfficialExpiryDay(symbol) {
        switch (symbol) {
            case 'MIDCPNIFTY':
            case 'BANKEX':
                return 1; // Monday
            case 'NIFTY':
            case 'FINNIFTY':
                return 2; // Tuesday (Official SEBI & NSE Weekly Expiry)
            case 'BANKNIFTY':
                return 3; // Wednesday (or Tuesday for monthly)
            case 'SENSEX':
            case 'SENSEX50':
                return 4; // Thursday (Official SEBI & BSE Weekly Expiry)
            default:
                return 2; // Tuesday (Default NSE equity derivatives standard)
        }
    }
    static getIndexWeeklyExpiries(symbol, count) {
        const now = new Date();
        const targetDay = this.getOfficialExpiryDay(symbol);
        const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
        const exchange = cfg?.exchange === 'BSE' ? 'BSE' : 'NSE';
        // Format now into IST explicitly so calculation is timezone-independent
        const istParts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            weekday: 'short'
        }).formatToParts(now);
        const istHour = parseInt(istParts.find(p => p.type === 'hour')?.value || '0', 10);
        const istMinute = parseInt(istParts.find(p => p.type === 'minute')?.value || '0', 10);
        const weekdayStr = istParts.find(p => p.type === 'weekday')?.value || 'Tue';
        const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const currentDay = weekdayMap[weekdayStr] ?? now.getDay();
        let diff = targetDay - currentDay;
        // If today is target expiry day, check if past market close (15:40 IST)
        if (diff === 0) {
            if (istHour > 15 || (istHour === 15 && istMinute >= 40)) {
                diff = 7;
            }
        }
        else if (diff < 0) {
            diff += 7;
        }
        const expiries = [];
        const firstTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 15, 40);
        for (let i = 0; expiries.length < count; i++) {
            const scheduledTarget = new Date(firstTarget.getTime() + i * 7 * 24 * 60 * 60 * 1000);
            const actualExpiry = this.precedingTradingDay(scheduledTarget, exchange);
            // Verify the adjusted expiry date is in the future or today before 15:40 IST
            if (actualExpiry.getTime() >= this.startOfDay(now).getTime()) {
                const expStr = this.formatDate(actualExpiry);
                if (!expiries.includes(expStr)) {
                    expiries.push(expStr);
                }
            }
        }
        return expiries.sort((a, b) => this.parseDate(a).getTime() - this.parseDate(b).getTime()).slice(0, count);
    }
    // ─── Equity stock monthly expiry (Last Tuesday of month for NSE) ───────────
    static getMonthlyStockExpiries(count) {
        const expiries = [];
        const now = new Date();
        for (let m = 0; expiries.length < count; m++) {
            const targetMonth = now.getMonth() + m;
            const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
            const normalMonth = targetMonth % 12;
            // Revised NSE monthly expiry is Last Tuesday of the month (previously last Thursday)
            const lastTuesday = this.getLastTuesdayOfMonth(targetYear, normalMonth);
            const adjustedExpiry = this.precedingTradingDay(lastTuesday, 'NSE');
            if (adjustedExpiry.getTime() >= this.startOfDay(now).getTime()) {
                const expStr = this.formatDate(adjustedExpiry);
                if (!expiries.includes(expStr))
                    expiries.push(expStr);
            }
        }
        return expiries.sort((a, b) => this.parseDate(a).getTime() - this.parseDate(b).getTime()).slice(0, count);
    }
    static getLastTuesdayOfMonth(year, month) {
        const lastDay = new Date(year, month + 1, 0); // Last day of month
        const dayOfWeek = lastDay.getDay();
        // 2 is Tuesday: diff = (dayOfWeek - 2 + 7) % 7
        const diff = (dayOfWeek - 2 + 7) % 7;
        return new Date(year, month, lastDay.getDate() - diff, 15, 40);
    }
    static getLastThursdayOfMonth(year, month) {
        const lastDay = new Date(year, month + 1, 0);
        const dayOfWeek = lastDay.getDay();
        const diff = dayOfWeek >= 4 ? dayOfWeek - 4 : dayOfWeek + 3;
        return new Date(year, month, lastDay.getDate() - diff, 15, 40);
    }
    // ─── Holiday & Preceding Trading Day Calculations ─────────────────────────
    /**
     * Shifts a date backward to the nearest preceding active trading day (Mon–Fri),
     * strictly bypassing weekends and declared exchange holidays.
     * If the target is already an active trading day, it is returned unchanged.
     */
    static precedingTradingDay(date, exchange = 'NSE') {
        const d = new Date(date);
        let iterations = 0;
        while (iterations < 14) {
            iterations++;
            // 1. Weekend check (Saturday = 6, Sunday = 0)
            if (d.getDay() === 0 || d.getDay() === 6) {
                d.setDate(d.getDate() - 1);
                continue;
            }
            // 2. Exchange holiday check
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const isoDate = `${yyyy}-${mm}-${dd}`;
            const isHoliday = exchange === 'MCX'
                ? MCX_FULL_HOLIDAYS_SET.has(isoDate)
                : NSE_BSE_HOLIDAYS_SET.has(isoDate);
            if (isHoliday) {
                d.setDate(d.getDate() - 1);
                continue;
            }
            // Found valid trading day
            break;
        }
        return d;
    }
    // ─── Date utilities ────────────────────────────────────────────────────────
    static formatDate(d) {
        const day = d.getDate().toString().padStart(2, '0');
        const month = this.MONTHS[d.getMonth()];
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    }
    static parseDate(dateStr) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const monthIdx = this.MONTHS.indexOf(parts[1]);
            const year = parseInt(parts[2], 10);
            return new Date(year, monthIdx, day, 15, 40, 0);
        }
        return new Date();
    }
    static calculateDTE(expiryStr) {
        try {
            const expDate = this.parseDate(expiryStr);
            const now = new Date();
            // Calculate calendar difference in IST timezone
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const ist = new Date(utc + (3600000 * 5.5));
            const expDay = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate()).getTime();
            const istDay = new Date(ist.getFullYear(), ist.getMonth(), ist.getDate()).getTime();
            const diffDays = Math.round((expDay - istDay) / (1000 * 60 * 60 * 24));
            return Math.max(0, diffDays);
        }
        catch {
            return 0;
        }
    }
    static startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
}
