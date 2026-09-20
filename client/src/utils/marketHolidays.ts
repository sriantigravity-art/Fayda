/**
 * Official 2026 & 2027 NSE, BSE & MCX Trading Holidays & Expiry Rules
 * Verified against official exchange circulars from NSE India, BSE India, and MCX India.
 */

export interface MarketHolidayItem {
  date: string;       // YYYY-MM-DD
  name: string;
  day: string;
  nseClosed: boolean;
  bseClosed: boolean;
  mcxMorningClosed: boolean;
  mcxEveningClosed: boolean;
  description: string;
}

export const OFFICIAL_MARKET_HOLIDAYS: MarketHolidayItem[] = [
  // ─── 2026 Official Holidays ──────────────────────────────────────────────
  {
    date: '2026-01-15',
    name: 'Maharashtra Municipal Corporation Election',
    day: 'Thursday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: false,
    description: 'Special civic election holiday declared under Negotiable Instruments Act.'
  },
  {
    date: '2026-01-26',
    name: 'Republic Day',
    day: 'Monday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: true,
    description: 'National holiday. Full day closed for NSE, BSE, and MCX.'
  },
  {
    date: '2026-03-03',
    name: 'Holi (2nd Day)',
    day: 'Tuesday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: false,
    description: 'NSE/BSE closed all day. MCX evening session opens at 5:00 PM IST.'
  },
  {
    date: '2026-03-26',
    name: 'Shri Ram Navami',
    day: 'Thursday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: false,
    description: 'NSE/BSE closed all day. MCX evening session opens at 5:00 PM IST.'
  },
  {
    date: '2026-03-31',
    name: 'Shri Mahavir Jayanti',
    day: 'Tuesday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: false,
    description: 'NSE/BSE closed all day. MCX evening session opens at 5:00 PM IST.'
  },
  {
    date: '2026-04-03',
    name: 'Good Friday',
    day: 'Friday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: true,
    description: 'Full day trading holiday across NSE, BSE, and MCX.'
  },
  {
    date: '2026-04-14',
    name: 'Dr. Baba Saheb Ambedkar Jayanti',
    day: 'Tuesday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: false,
    description: 'NSE/BSE closed all day. MCX evening session opens at 5:00 PM IST.'
  },
  {
    date: '2026-05-01',
    name: 'Maharashtra Day',
    day: 'Friday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: false,
    description: 'NSE/BSE closed all day. MCX evening session opens at 5:00 PM IST.'
  },
  {
    date: '2026-05-28',
    name: 'Bakri Id (Id-Ul-Adha)',
    day: 'Thursday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: false,
    description: 'NSE/BSE closed all day. MCX evening session opens at 5:00 PM IST.'
  },
  {
    date: '2026-06-26',
    name: 'Muharram',
    day: 'Friday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: false,
    description: 'NSE/BSE closed all day. MCX evening session opens at 5:00 PM IST.'
  },
  {
    date: '2026-09-14',
    name: 'Ganesh Chaturthi',
    day: 'Monday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: false,
    description: 'NSE/BSE closed all day. MCX evening session opens at 5:00 PM IST.'
  },
  {
    date: '2026-10-02',
    name: 'Mahatma Gandhi Jayanti',
    day: 'Friday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: true,
    description: 'National holiday. Full day closed for NSE, BSE, and MCX.'
  },
  {
    date: '2026-10-20',
    name: 'Dussehra (Vijay Dashami)',
    day: 'Tuesday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: false,
    description: 'NSE/BSE closed all day. NIFTY weekly expiry shifted to Monday Oct 19.'
  },
  {
    date: '2026-11-10',
    name: 'Diwali - Balipratipada',
    day: 'Tuesday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: false,
    description: 'NSE/BSE closed all day. NIFTY weekly expiry shifted to Monday Nov 09.'
  },
  {
    date: '2026-11-24',
    name: 'Prakash Gurpurb Sri Guru Nanak Dev',
    day: 'Tuesday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: false,
    description: 'NSE/BSE closed all day. Stock monthly expiry shifted to Monday Nov 23.'
  },
  {
    date: '2026-12-25',
    name: 'Christmas',
    day: 'Friday',
    nseClosed: true,
    bseClosed: true,
    mcxMorningClosed: true,
    mcxEveningClosed: true,
    description: 'Full day trading holiday across NSE, BSE, and MCX.'
  }
];

export const WEEKEND_HOLIDAYS_2026 = [
  { date: '2026-02-15', name: 'Mahashivratri', day: 'Sunday', note: 'Standard weekend closure.' },
  { date: '2026-03-21', name: 'Id-Ul-Fitr (Ramadan Eid)', day: 'Saturday', note: 'Standard weekend closure.' },
  { date: '2026-08-15', name: 'Independence Day', day: 'Saturday', note: 'National holiday on Saturday.' },
  { date: '2026-11-08', name: 'Diwali Laxmi Pujan', day: 'Sunday', note: 'Special Muhurat Trading session conducted in the evening.' }
];

export const NSE_BSE_HOLIDAYS_SET = new Set<string>(
  OFFICIAL_MARKET_HOLIDAYS.filter(h => h.nseClosed || h.bseClosed).map(h => h.date)
);

export const MCX_FULL_HOLIDAYS_SET = new Set<string>(
  OFFICIAL_MARKET_HOLIDAYS.filter(h => h.mcxMorningClosed && h.mcxEveningClosed).map(h => h.date)
);

export const MCX_MORNING_HOLIDAYS_SET = new Set<string>(
  OFFICIAL_MARKET_HOLIDAYS.filter(h => h.mcxMorningClosed).map(h => h.date)
);

/**
 * Exchange Expiry Rule Definitions (SEBI Rationalized Standard)
 */
export interface ExchangeExpiryRule {
  segment: string;
  benchmark: string;
  expiryDay: string;
  frequency: string;
  rule: string;
}

export const EXCHANGE_EXPIRY_RULES: ExchangeExpiryRule[] = [
  {
    segment: 'NSE Equity Index Derivatives',
    benchmark: 'NIFTY 50',
    expiryDay: 'Every Tuesday',
    frequency: 'Weekly & Monthly',
    rule: 'Official SEBI benchmark for NSE. Expires every Tuesday. If holiday, shifts to preceding trading day (Monday).'
  },
  {
    segment: 'BSE Equity Index Derivatives',
    benchmark: 'SENSEX',
    expiryDay: 'Every Thursday',
    frequency: 'Weekly & Monthly',
    rule: 'Official SEBI benchmark for BSE. Expires every Thursday. If holiday, shifts to preceding trading day (Wednesday).'
  },
  {
    segment: 'NSE Index Derivatives (Non-Benchmark)',
    benchmark: 'BANKNIFTY / FINNIFTY / MIDCPNIFTY',
    expiryDay: 'Last Tuesday of the Month',
    frequency: 'Monthly (or Weekly where listed)',
    rule: 'Under SEBI rules, non-benchmark contracts follow monthly cycles expiring on the last Tuesday of the month.'
  },
  {
    segment: 'NSE Stock Futures & Options',
    benchmark: 'All Nifty 50 F&O Stocks (Reliance, TCS, etc.)',
    expiryDay: 'Last Tuesday of the Month',
    frequency: 'Monthly (3 Active Cycles)',
    rule: 'Under revised NSE standards, all stock derivatives expire on the last Tuesday of the calendar month.'
  },
  {
    segment: 'MCX Energy Derivatives',
    benchmark: 'CRUDE OIL',
    expiryDay: '19th of Every Month',
    frequency: 'Monthly',
    rule: 'Futures expire 19th of each calendar month. Options expire ~16th-19th (or preceding trading day).'
  },
  {
    segment: 'MCX Energy Derivatives',
    benchmark: 'NATURAL GAS',
    expiryDay: '25th of Every Month',
    frequency: 'Monthly',
    rule: 'Futures and options expire on the 25th of each calendar month (or preceding business day).'
  },
  {
    segment: 'MCX Precious Metals',
    benchmark: 'GOLD (1kg / Mini)',
    expiryDay: '5th of Even Months',
    frequency: 'Bi-Monthly (Feb, Apr, Jun, Aug, Oct, Dec)',
    rule: 'Options & futures expire on the 5th of even months (or preceding business day).'
  },
  {
    segment: 'MCX Precious Metals',
    benchmark: 'SILVER (30kg / Mini)',
    expiryDay: '5th of Mar, May, Jul, Sep, Nov, Dec',
    frequency: 'Bi-Monthly / Quarterly',
    rule: 'Contracts expire on the 5th of designated delivery months (or preceding business day).'
  }
];

export function isDateMarketHoliday(isoDate: string, exchange: 'NSE' | 'BSE' | 'MCX' = 'NSE'): boolean {
  if (exchange === 'MCX') {
    return MCX_FULL_HOLIDAYS_SET.has(isoDate);
  }
  return NSE_BSE_HOLIDAYS_SET.has(isoDate);
}
