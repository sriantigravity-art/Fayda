"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NseExpiryService = void 0;
const types_js_1 = require("../types.js");
/**
 * Official NSE, BSE & MCX Derivatives Contract Specifications & Expiry Calendars
 * Reference:
 * - NSE NIFTY 50: Weekly Tuesday / Monthly Expiry
 * - NSE BANKNIFTY: Weekly Wednesday / Monthly Expiry
 * - NSE FINNIFTY: Weekly Tuesday / Monthly Expiry
 * - NSE MIDCPNIFTY: Weekly Monday / Monthly Expiry
 * - BSE SENSEX: Weekly Friday / Monthly Expiry
 * - BSE BANKEX: Weekly Monday / Monthly Expiry
 * - MCX Commodities (CRUDEOIL, GOLD, SILVER): Commodity-specific settlement dates
 * - NIFTY 50 Stocks (RELIANCE, HDFCBANK, TCS): Monthly Last Thursday
 */
class NseExpiryService {
    static MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    /**
     * Returns the weekly expiry day index (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
     */
    static getOfficialExpiryDay(symbol) {
        switch (symbol) {
            case 'MIDCPNIFTY':
            case 'BANKEX':
                return 1; // Monday
            case 'NIFTY':
            case 'FINNIFTY':
                return 2; // Tuesday
            case 'BANKNIFTY':
                return 3; // Wednesday
            case 'SENSEX':
                return 5; // Friday
            default:
                return 4; // Thursday (Standard Stocks & Monthly default)
        }
    }
    static formatDate(d) {
        const day = d.getDate().toString().padStart(2, '0');
        const month = this.MONTHS[d.getMonth()];
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    }
    /**
     * Generates official upcoming weekly and monthly expiries for any specific asset/symbol
     */
    static getUpcomingExpiries(symbol, count = 6) {
        const cfg = types_js_1.ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
        const now = new Date();
        const isCommodity = cfg?.category === 'COMMODITIES' || cfg?.segment === 'COMMODITY' || cfg?.exchange === 'MCX';
        const isStock = cfg?.category === 'NIFTY50_STOCKS';
        // 1. MCX Commodities have specific fixed monthly expiry dates
        if (isCommodity) {
            if (symbol === 'CRUDEOIL') {
                return ['17-Sep-2026', '19-Oct-2026', '17-Nov-2026', '18-Dec-2026'];
            }
            if (symbol === 'NATURALGAS') {
                return ['25-Sep-2026', '27-Oct-2026', '25-Nov-2026', '28-Dec-2026'];
            }
            if (symbol === 'GOLD') {
                return ['05-Oct-2026', '04-Dec-2026', '05-Feb-2027', '05-Apr-2027'];
            }
            if (symbol === 'SILVER') {
                return ['05-Dec-2026', '05-Mar-2027', '05-May-2027'];
            }
            return ['17-Sep-2026', '19-Oct-2026', '17-Nov-2026'];
        }
        // 2. Individual Equity Stocks have Monthly Expiries (Last Thursday of the Month)
        if (isStock) {
            const expiries = [];
            for (let m = 0; m < count; m++) {
                const targetMonth = now.getMonth() + m;
                const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
                const normalizedMonth = targetMonth % 12;
                const monthlyThursday = this.getLastThursdayOfMonth(targetYear, normalizedMonth);
                if (monthlyThursday.getTime() >= now.getTime() - (24 * 60 * 60 * 1000)) {
                    const expStr = this.formatDate(monthlyThursday);
                    if (!expiries.includes(expStr)) {
                        expiries.push(expStr);
                    }
                }
            }
            return expiries.sort((a, b) => this.parseDate(a).getTime() - this.parseDate(b).getTime());
        }
        // 3. Index Weekly & Monthly Derivatives
        const targetDay = this.getOfficialExpiryDay(symbol);
        const expiries = [];
        const currentDay = now.getDay();
        let diff = targetDay - currentDay;
        // If today is Expiry Day, check if past market close (15:40 IST)
        if (diff === 0) {
            if (now.getHours() > 15 || (now.getHours() === 15 && now.getMinutes() >= 40)) {
                diff = 7;
            }
        }
        else if (diff < 0) {
            diff += 7;
        }
        const firstExpiry = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
        // Add weekly expiries
        for (let i = 0; i < count; i++) {
            const expDate = new Date(firstExpiry.getTime() + i * 7 * 24 * 60 * 60 * 1000);
            expiries.push(this.formatDate(expDate));
        }
        return expiries.sort((a, b) => this.parseDate(a).getTime() - this.parseDate(b).getTime());
    }
    static getLastThursdayOfMonth(year, month) {
        const lastDay = new Date(year, month + 1, 0);
        const dayOfWeek = lastDay.getDay();
        const diff = (dayOfWeek >= 4) ? (dayOfWeek - 4) : (dayOfWeek + 3);
        return new Date(year, month, lastDay.getDate() - diff);
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
            if (diffMs <= 0)
                return 0;
            return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }
        catch (e) {
            return 0;
        }
    }
    static getValidExpiries(symbol, count = 6) {
        return this.getUpcomingExpiries(symbol, count);
    }
    static getDaysToExpiry(expiryStr) {
        return this.calculateDTE(expiryStr);
    }
}
exports.NseExpiryService = NseExpiryService;
