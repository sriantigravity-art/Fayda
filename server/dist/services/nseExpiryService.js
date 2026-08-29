"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NseExpiryService = void 0;
const types_js_1 = require("../types.js");
/**
 * Official NSE, BSE & MCX Derivatives Contract Specifications & Expiry Calendars
 *
 * All expiry dates are computed dynamically from exchange rules — nothing hardcoded.
 *
 * NSE Weekly expiry days:
 *   MIDCPNIFTY / BANKEX  → Monday
 *   NIFTY / FINNIFTY     → Tuesday
 *   BANKNIFTY            → Wednesday
 *   SENSEX               → Friday
 *   Stocks (monthly)     → Last Thursday of the month
 *
 * MCX Commodity expiry rules (computed, no hardcoded dates):
 *   CRUDEOIL    → 19th of each month (or preceding business day)
 *   NATURALGAS  → 25th of each month (or preceding business day)
 *   GOLD        → 5th of Feb, Apr, Jun, Aug, Oct, Dec (or preceding business day)
 *   SILVER      → 5th of Mar, Jul, Sep, Dec (or preceding business day)
 *   Others      → 19th of each month (fallback)
 */
class NseExpiryService {
    static MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // ─── Public helpers ───────────────────────────────────────────────────────
    static getValidExpiries(symbol, count = 6) {
        return this.getUpcomingExpiries(symbol, count);
    }
    static getDaysToExpiry(expiryStr) {
        return this.calculateDTE(expiryStr);
    }
    // ─── Core expiry computation ───────────────────────────────────────────────
    /**
     * Returns official upcoming weekly/monthly/commodity expiries for any symbol.
     * All dates are computed from the current date — zero hardcoded strings.
     */
    static getUpcomingExpiries(symbol, count = 6) {
        const cfg = types_js_1.ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
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
                // MCX Crude Oil: 19th of each calendar month (or preceding business day)
                return this.nthDayOfMonths(19, count, now);
            case 'NATURALGAS':
                // MCX Natural Gas: 25th of each calendar month (or preceding business day)
                return this.nthDayOfMonths(25, count, now);
            case 'GOLD':
                // MCX Gold: 5th of every even month (Feb=1, Apr=3, Jun=5, Aug=7, Oct=9, Dec=11 — 0-indexed)
                return this.nthDayOfSpecificMonths(5, [1, 3, 5, 7, 9, 11], count, now);
            case 'SILVER':
                // MCX Silver: 5th of Mar(2), Jul(6), Sep(8), Dec(11) — quarterly
                return this.nthDayOfSpecificMonths(5, [2, 6, 8, 11], count, now);
            default:
                // Generic MCX monthly: 19th of each month
                return this.nthDayOfMonths(19, count, now);
        }
    }
    /**
     * Returns dates where the given day-of-month falls in the next `count` months,
     * adjusted to preceding business day when the target falls on a weekend.
     */
    static nthDayOfMonths(dayOfMonth, count, from) {
        const expiries = [];
        for (let m = 0; expiries.length < count; m++) {
            const target = new Date(from.getFullYear(), from.getMonth() + m, dayOfMonth, 23, 59);
            const adjusted = this.precedingBusinessDay(target);
            // Only include if the adjusted date is in the future (or today)
            if (adjusted.getTime() >= this.startOfDay(from).getTime()) {
                expiries.push(this.formatDate(adjusted));
            }
        }
        return expiries.sort((a, b) => this.parseDate(a).getTime() - this.parseDate(b).getTime()).slice(0, count);
    }
    /**
     * Returns dates on the given day-of-month for specific months only (bi-monthly / quarterly),
     * adjusted to the preceding business day when the target falls on a weekend.
     */
    static nthDayOfSpecificMonths(dayOfMonth, months, // 0-indexed month numbers
    count, from) {
        const expiries = [];
        for (let yearOffset = 0; yearOffset <= 4 && expiries.length < count; yearOffset++) {
            for (const month of months) {
                if (expiries.length >= count)
                    break;
                const target = new Date(from.getFullYear() + yearOffset, month, dayOfMonth, 23, 59);
                const adjusted = this.precedingBusinessDay(target);
                if (adjusted.getTime() >= this.startOfDay(from).getTime()) {
                    expiries.push(this.formatDate(adjusted));
                }
            }
        }
        return expiries.sort((a, b) => this.parseDate(a).getTime() - this.parseDate(b).getTime()).slice(0, count);
    }
    // ─── NSE/BSE equity index weekly expiry computation ───────────────────────
    /**
     * Returns weekly expiry day index (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat).
     */
    static getOfficialExpiryDay(symbol) {
        switch (symbol) {
            case 'MIDCPNIFTY':
            case 'BANKEX': return 1; // Monday
            case 'NIFTY':
            case 'FINNIFTY': return 2; // Tuesday
            case 'BANKNIFTY': return 3; // Wednesday
            case 'SENSEX': return 5; // Friday
            default: return 4; // Thursday (stocks & monthly default)
        }
    }
    static getIndexWeeklyExpiries(symbol, count) {
        const now = new Date();
        const targetDay = this.getOfficialExpiryDay(symbol);
        const expiries = [];
        const currentDay = now.getDay();
        let diff = targetDay - currentDay;
        // If today is expiry day, check if past market close (15:40 IST)
        if (diff === 0) {
            if (now.getHours() > 15 || (now.getHours() === 15 && now.getMinutes() >= 40)) {
                diff = 7;
            }
        }
        else if (diff < 0) {
            diff += 7;
        }
        const firstExpiry = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
        for (let i = 0; i < count; i++) {
            const expDate = new Date(firstExpiry.getTime() + i * 7 * 24 * 60 * 60 * 1000);
            expiries.push(this.formatDate(expDate));
        }
        return expiries.sort((a, b) => this.parseDate(a).getTime() - this.parseDate(b).getTime());
    }
    // ─── Equity stock monthly expiry (Last Thursday of month) ─────────────────
    static getMonthlyStockExpiries(count) {
        const expiries = [];
        const now = new Date();
        for (let m = 0; expiries.length < count; m++) {
            const targetMonth = now.getMonth() + m;
            const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
            const normalMonth = targetMonth % 12;
            const lastThursday = this.getLastThursdayOfMonth(targetYear, normalMonth);
            if (lastThursday.getTime() >= this.startOfDay(now).getTime()) {
                const expStr = this.formatDate(lastThursday);
                if (!expiries.includes(expStr))
                    expiries.push(expStr);
            }
        }
        return expiries.sort((a, b) => this.parseDate(a).getTime() - this.parseDate(b).getTime());
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
            const diffMs = expDate.getTime() - now.getTime();
            return diffMs <= 0 ? 0 : Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }
        catch {
            return 0;
        }
    }
    static getLastThursdayOfMonth(year, month) {
        const lastDay = new Date(year, month + 1, 0);
        const dayOfWeek = lastDay.getDay();
        const diff = dayOfWeek >= 4 ? dayOfWeek - 4 : dayOfWeek + 3;
        return new Date(year, month, lastDay.getDate() - diff);
    }
    /**
     * Shifts a date backward to the nearest preceding weekday (Mon–Fri).
     * If the date is already a weekday it is returned unchanged.
     */
    static precedingBusinessDay(date) {
        const d = new Date(date);
        while (d.getDay() === 0 || d.getDay() === 6) {
            d.setDate(d.getDate() - 1);
        }
        return d;
    }
    static startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
}
exports.NseExpiryService = NseExpiryService;
