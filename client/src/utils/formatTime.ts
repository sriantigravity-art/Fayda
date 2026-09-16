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
      if (/^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)(\s*IST)?$/i.test(trimmed)) {
        return includeSuffix && !/IST$/i.test(trimmed) ? `${trimmed} IST` : trimmed;
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
      return String(dateInput);
    }

    const timeStr = d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12,
      hour: '2-digit',
      minute: '2-digit',
      second: showSecs ? '2-digit' : undefined
    });

    return includeSuffix ? `${timeStr} IST` : timeStr;
  } catch {
    return String(dateInput || '');
  }
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
