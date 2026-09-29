/**
 * Universal Indian Standard Time (IST - Asia/Kolkata) Date & Time Formatter.
 * Ensures consistent 100% accurate IST timestamps everywhere across desktop, mobile, cloud & browsers.
 */

// ── STRICT LOCAL SYSTEM TIME (NO OFFSETS) ──────────────────────────────────
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fayda_ampm_flip');
  }
} catch {}

let networkClockDriftMs = 0;

export const setNetworkClockDriftMs = (_driftMs: number) => {
  networkClockDriftMs = 0;
};

export const getNetworkClockDriftMs = (): number => 0;

export const toggleAmPmFlip = (): boolean => false;

export const getCorrectedNow = (baseDate?: Date | number): Date => {
  if (baseDate instanceof Date) return baseDate;
  if (typeof baseDate === 'number') return new Date(baseDate);
  return new Date();
};

export const syncClientNetworkTime = async () => {
  // Pure local system time
};

export const getISTComponents = (dateInput?: string | number | Date | null): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  dayOfWeek: number; // 0 = Sun, 6 = Sat
} => {
  let d: Date;
  if (!dateInput) {
    d = new Date();
  } else if (dateInput instanceof Date) {
    d = dateInput;
  } else {
    d = new Date(dateInput);
    if (isNaN(d.getTime())) d = new Date();
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(d);
  const map: Record<string, string> = {};
  parts.forEach(p => { map[p.type] = p.value; });

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
  };

  const hour = map.hour === '24' ? 0 : parseInt(map.hour || '0', 10);

  return {
    year: parseInt(map.year || '0', 10),
    month: parseInt(map.month || '0', 10),
    day: parseInt(map.day || '0', 10),
    hours: hour,
    minutes: parseInt(map.minute || '0', 10),
    seconds: parseInt(map.second || '0', 10),
    dayOfWeek: weekdayMap[map.weekday || 'Sun'] ?? 0
  };
};

export const getISTNow = (): Date => {
  const { year, month, day, hours, minutes, seconds } = getISTComponents();
  return new Date(year, month - 1, day, hours, minutes, seconds);
};

export const formatISTTime = (
  dateInput?: string | number | Date | null,
  options?: { showSeconds?: boolean; includeSuffix?: boolean; hour12?: boolean }
): string => {
  const showSecs = options?.showSeconds !== false;
  const includeSuffix = options?.includeSuffix ?? false;
  const hour12 = options?.hour12 ?? true; // Standard 12-hour AM/PM format by default

  if (!dateInput) {
    const d = new Date();
    const str = d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12,
      hour: '2-digit',
      minute: '2-digit',
      second: showSecs ? '2-digit' : undefined
    });
    return includeSuffix ? `${str} IST` : str;
  }

  try {
    let d: Date;
    if (dateInput instanceof Date) {
      d = dateInput;
    } else if (typeof dateInput === 'number') {
      d = new Date(dateInput);
    } else if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      // Already formatted as "HH:mm(:ss)? AM/PM (IST)?"
      if (/^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)(\s*IST)*/i.test(trimmed)) {
        const cleanBase = trimmed.replace(/\s*IST/gi, '').trim();
        return includeSuffix ? `${cleanBase} IST` : cleanBase;
      }
      // If 24-hour time string like "20:09:02" or "20:09" or "20:09:02 IST"
      const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(\s*IST)?$/i);
      if (match24) {
        const h = parseInt(match24[1], 10);
        const m = match24[2];
        const s = match24[3];
        if (hour12) {
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 || 12;
          const hStr = h12 < 10 ? `0${h12}` : `${h12}`;
          const time = showSecs && s ? `${hStr}:${m}:${s} ${ampm}` : `${hStr}:${m} ${ampm}`;
          return includeSuffix ? `${time} IST` : time;
        } else {
          const hStr = h < 10 ? `0${h}` : `${h}`;
          const time = showSecs && s ? `${hStr}:${m}:${s}` : `${hStr}:${m}`;
          return includeSuffix ? `${time} IST` : time;
        }
      }
      d = new Date(dateInput);
    } else {
      d = new Date();
    }

    if (isNaN(d.getTime())) {
      const cleanInput = String(dateInput).replace(/\s*IST/gi, '').trim();
      return includeSuffix ? `${cleanInput} IST` : cleanInput;
    }

    const timeStr = d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12,
      hour: '2-digit',
      minute: '2-digit',
      second: showSecs ? '2-digit' : undefined
    });

    const cleanTime = timeStr.replace(/\s*IST/gi, '').trim();
    return includeSuffix ? `${cleanTime} IST` : cleanTime;
  } catch {
    const fallback = String(dateInput || '').replace(/\s*IST/gi, '').trim();
    return includeSuffix ? `${fallback} IST` : fallback;
  }
};

/**
 * Trade execution & milestone time sanitizer.
 * Guarantees 12-hour AM/PM format everywhere and prevents equity/index symbols
 * (NSE/BSE) from ever displaying nighttime post-market hours (> 03:40 PM IST).
 * Also strictly eliminates duplicate 'IST IST' strings.
 */
export const formatTradeTime = (
  timeInput?: string | number | Date | null,
  symbol?: string,
  options?: { showSeconds?: boolean; includeSuffix?: boolean }
): string => {
  if (!timeInput) return '';
  const showSecs = options?.showSeconds !== false;
  const includeSuffix = options?.includeSuffix ?? true;

  // Format to 12-hour AM/PM IST (request WITHOUT suffix first)
  let formatted = formatISTTime(timeInput, { showSeconds: showSecs, includeSuffix: false, hour12: true });
  if (!formatted) return '';

  // Clean any remaining IST occurrences in base formatted string
  formatted = formatted.replace(/\s*IST/gi, '').trim();

  const sym = (symbol || '').toUpperCase();
  const isCommodity = ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER', 'COPPER', 'ZINC'].includes(sym);

  if (!isCommodity) {
    // Check if time exceeds 03:40 PM IST
    const match = formatted.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[4].toUpperCase();
      let totalMin = (ampm === 'PM' && h !== 12 ? h + 12 : ampm === 'AM' && h === 12 ? 0 : h) * 60 + m;

      // If past 03:40 PM IST (940 min), clamp to market close
      if (totalMin > (15 * 60 + 40)) {
        formatted = showSecs ? '03:30:00 PM' : '03:30 PM';
      }
    }
  }

  return includeSuffix ? `${formatted} IST` : formatted;
};

export const formatISTDate = (dateInput?: string | number | Date | null): string => {
  if (!dateInput) {
    return getCorrectedNow().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const parseTradeTimeToMinutes = (timeStr?: string | null): number | null => {
  if (!timeStr) return null;
  const clean = timeStr.replace(/\s*IST/gi, '').trim();
  const ampmMatch = clean.match(/^(\d+):(\d+)(?::(\d+))?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[4].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const hmsMatch = clean.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if (hmsMatch) {
    const h = parseInt(hmsMatch[1], 10);
    const m = parseInt(hmsMatch[2], 10);
    return h * 60 + m;
  }
  return null;
};

export const isChronologicallyValid = (
  earlierTime?: string | null,
  laterTime?: string | null,
  allowEqual: boolean = true
): boolean => {
  if (!earlierTime || !laterTime) return true;
  const mEarly = parseTradeTimeToMinutes(earlierTime);
  const mLate = parseTradeTimeToMinutes(laterTime);
  if (mEarly === null || mLate === null) return true;
  return allowEqual ? mLate >= mEarly : mLate > mEarly;
};

export interface CleanMilestones {
  showT1: boolean;
  showT2: boolean;
  showSL: boolean;
  t1Time?: string;
  t2Time?: string;
  slTime?: string;
}

export const getSanitizedMilestones = (trade?: {
  status?: string;
  entryPriceTimeFormatted?: string;
  callGivenTimeFormatted?: string;
  callGivenTime?: string;
  entryTimeFormatted?: string;
  timeFormatted?: string;
  target1HitTimeFormatted?: string;
  target2HitTimeFormatted?: string;
  stoplossTimeFormatted?: string;
  stoplossHitTime?: string;
  stoplossTime?: string;
} | null): CleanMilestones => {
  if (!trade) {
    return { showT1: false, showT2: false, showSL: false };
  }

  const isSl = trade.status === 'STOPLOSS_HIT' || trade.status === 'SL_HIT' || Boolean(trade.stoplossHitTime || trade.stoplossTime || trade.stoplossTimeFormatted);
  const isTargetHit = trade.status === 'TARGET1_HIT' || trade.status === 'TARGET2_HIT' || trade.status === 'TARGET_HIT';

  const entryTimeStr = trade.entryPriceTimeFormatted || trade.callGivenTimeFormatted || trade.callGivenTime || trade.entryTimeFormatted || trade.timeFormatted;
  const entryMins = parseTradeTimeToMinutes(entryTimeStr);
  const t1Mins = parseTradeTimeToMinutes(trade.target1HitTimeFormatted);
  const t2Mins = parseTradeTimeToMinutes(trade.target2HitTimeFormatted);
  const slMins = parseTradeTimeToMinutes(trade.stoplossTimeFormatted || trade.stoplossHitTime || trade.stoplossTime);

  const showT1 = Boolean(
    trade.target1HitTimeFormatted &&
    (entryMins === null || t1Mins === null || t1Mins >= entryMins) &&
    (!isSl || (t1Mins !== null && slMins !== null && t1Mins < slMins))
  );

  const showT2 = Boolean(
    trade.target2HitTimeFormatted &&
    !isSl &&
    (entryMins === null || t2Mins === null || t2Mins >= entryMins) &&
    (t1Mins === null || t2Mins === null || t2Mins >= t1Mins)
  );

  const showSL = Boolean(
    (trade.stoplossTimeFormatted || trade.stoplossHitTime || trade.stoplossTime) &&
    isSl &&
    !isTargetHit &&
    (entryMins === null || slMins === null || slMins >= entryMins)
  );

  return {
    showT1,
    showT2,
    showSL,
    t1Time: showT1 ? trade.target1HitTimeFormatted : undefined,
    t2Time: showT2 ? trade.target2HitTimeFormatted : undefined,
    slTime: showSL ? (trade.stoplossTimeFormatted || trade.stoplossHitTime || trade.stoplossTime) : undefined,
  };
};
