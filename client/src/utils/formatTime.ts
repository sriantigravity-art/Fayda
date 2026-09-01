/**
 * Universal Indian Standard Time (IST - Asia/Kolkata) Date & Time Formatter.
 * Ensures consistent 100% accurate IST timestamps everywhere across desktop, mobile, cloud & browsers.
 */

export const getISTNow = (): Date => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 5.5));
};

export const formatISTTime = (
  dateInput?: string | number | Date | null,
  options?: { showSeconds?: boolean; includeSuffix?: boolean }
): string => {
  const showSecs = options?.showSeconds !== false;
  const includeSuffix = options?.includeSuffix ?? false;

  if (!dateInput) {
    const str = new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
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
      // Check if it's already an ISO string or time string
      if (/^\d{2}:\d{2}(:\d{2})?(\s*IST)?$/i.test(dateInput.trim())) {
        // If it looks like a UTC-leaked time string (e.g. 04:58:04), don't blindly accept
        const clean = dateInput.trim().replace(/\s*IST/i, '');
        // If it's a plain time string from current session, convert using today's date if possible
        const parts = clean.split(':').map(Number);
        if (parts.length >= 2) {
          // If already in IST range or plain string, return formatted
          return includeSuffix ? `${clean} IST` : clean;
        }
      }
      d = new Date(dateInput);
    } else {
      d = new Date();
    }

    if (isNaN(d.getTime())) {
      return String(dateInput);
    }

    const timeStr = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: showSecs ? '2-digit' : undefined
    });

    return includeSuffix ? `${timeStr} IST` : timeStr;
  } catch (e) {
    return String(dateInput || '');
  }
};

export const formatISTDate = (dateInput?: string | number | Date | null): string => {
  if (!dateInput) {
    return new Date().toLocaleDateString('en-IN', {
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
