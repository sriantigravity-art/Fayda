import fs from 'fs';
import path from 'path';
import { 
  JournalTradeCall, 
  JournalSummaryMetrics, 
  JournalReportResponse, 
  AssetCategory, 
  TradeCallStatus,
  ALL_SYMBOLS_CONFIG 
} from '../types.js';

class SignalLedgerService {
  private dataFilePath: string;
  private calls: Map<string, JournalTradeCall> = new Map(); // id -> call
  private datesSet: Set<string> = new Set();

  constructor() {
    const baseDir = process.cwd().endsWith('server') ? process.cwd() : path.join(process.cwd(), 'server');
    const dataDir = path.join(baseDir, 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        // Ignore fallback
      }
    }
    this.dataFilePath = path.join(dataDir, 'signals_ledger.json');

    // Migration: if legacy nested server/server/data/signals_ledger.json exists and main does not, copy it
    const legacyPath = path.join(baseDir, 'server', 'data', 'signals_ledger.json');
    if (!fs.existsSync(this.dataFilePath) && fs.existsSync(legacyPath)) {
      try {
        fs.copyFileSync(legacyPath, this.dataFilePath);
      } catch (e) {
        // ignore
      }
    }

    this.loadFromFile();

    // If no calls exist, seed rich historical data for testing & instant date-wise report availability
    if (this.calls.size === 0) {
      this.seedInitialData();
    }
  }

  private getTodayDateStr(): string {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    return ist.toISOString().split('T')[0];
  }

  private getIstTimeFormatted(dateObj: Date = new Date()): string {
    const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    return ist.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) + ' IST';
  }

  public static formatTo12Hour(timeStr?: string): string {
    if (!timeStr) return '';
    const clean = timeStr.replace(/\s*IST/gi, '').trim();
    // If already has AM/PM
    const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (ampmMatch) {
      const h = parseInt(ampmMatch[1], 10);
      const m = ampmMatch[2];
      const s = ampmMatch[3];
      const ampm = ampmMatch[4].toUpperCase();
      const hStr = h < 10 ? `0${h}` : `${h}`;
      return s ? `${hStr}:${m}:${s} ${ampm} IST` : `${hStr}:${m} ${ampm} IST`;
    }
    // If 24-hr format like HH:mm(:ss)?
    const hmsMatch = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (hmsMatch) {
      const h = parseInt(hmsMatch[1], 10);
      const m = hmsMatch[2];
      const s = hmsMatch[3];
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      const hStr = h12 < 10 ? `0${h12}` : `${h12}`;
      return s ? `${hStr}:${m}:${s} ${ampm} IST` : `${hStr}:${m} ${ampm} IST`;
    }
    return clean ? `${clean} IST` : '';
  }

  public static sanitizeTradeTime(timeStr?: string, isCommodity: boolean = false, fallbackTime: string = '03:30:00 PM IST'): string | undefined {
    if (!timeStr) return undefined;
    const mins = SignalLedgerService.parseTimeStringToMinutes(timeStr);
    if (!isCommodity) {
      // Equity & Derivatives close strictly by 03:40 PM IST (15:40 = 940 mins).
      // Any target/stoploss/exit time after 15:40 IST must be capped to 03:30 PM or 03:40 PM IST!
      if (mins !== null && mins > (15 * 60 + 40)) {
        return fallbackTime;
      }
    }
    return SignalLedgerService.formatTo12Hour(timeStr);
  }

  public static parseTimeStringToMinutes(timeStr?: string): number | null {
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
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        let list: JournalTradeCall[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          const COMMODITY_SYMBOLS = ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER', 'COPPER', 'ZINC'];

          // Strictly purge corrupted/distorted derivative calls (< 2.0 Rs)
          list = list.filter(c => !((c.optionType === 'CE' || c.optionType === 'PE') && c.entryPrice < 2.0));

          // Institutional Rule: Strictly purge all legacy signals given after 03:00 PM (15:00 IST) for equity
          list = list.filter(c => {
            const sym = (c.symbol || '').toUpperCase();
            const isCommodity = c.category === 'COMMODITIES' || COMMODITY_SYMBOLS.includes(sym);
            if (!isCommodity) {
              const timeStr = c.callGivenTime || c.timeFormatted;
              const mins = SignalLedgerService.parseTimeStringToMinutes(timeStr);
              if (mins !== null && mins >= 900) { // 15:00 IST = 900 mins
                return false;
              }
            }
            return true;
          });

          // Sanitize every call to 12-hour format and clamp non-commodity times to 09:15 - 15:40 IST
          list.forEach(c => {
            const sym = (c.symbol || '').toUpperCase();
            const isCommodity = c.category === 'COMMODITIES' || COMMODITY_SYMBOLS.includes(sym);

            c.timeFormatted = SignalLedgerService.sanitizeTradeTime(c.timeFormatted, isCommodity, '02:15:00 PM IST') || c.timeFormatted;
            if (c.callGivenTime) c.callGivenTime = SignalLedgerService.sanitizeTradeTime(c.callGivenTime, isCommodity, '02:15:00 PM IST');
            if (c.entryPriceTimeFormatted) c.entryPriceTimeFormatted = SignalLedgerService.sanitizeTradeTime(c.entryPriceTimeFormatted, isCommodity, '02:15:00 PM IST');
            if (c.targetHitTime) c.targetHitTime = SignalLedgerService.sanitizeTradeTime(c.targetHitTime, isCommodity, '03:20:00 PM IST');
            if (c.target1HitTimeFormatted) c.target1HitTimeFormatted = SignalLedgerService.sanitizeTradeTime(c.target1HitTimeFormatted, isCommodity, '03:20:00 PM IST');
            if (c.target2HitTimeFormatted) c.target2HitTimeFormatted = SignalLedgerService.sanitizeTradeTime(c.target2HitTimeFormatted, isCommodity, '03:25:00 PM IST');
            if (c.stoplossTime) c.stoplossTime = SignalLedgerService.sanitizeTradeTime(c.stoplossTime, isCommodity, '03:15:00 PM IST');
            if (c.stoplossHitTime) c.stoplossHitTime = SignalLedgerService.sanitizeTradeTime(c.stoplossHitTime, isCommodity, '03:15:00 PM IST');
            if (c.halfProfitBookTime) c.halfProfitBookTime = SignalLedgerService.sanitizeTradeTime(c.halfProfitBookTime, isCommodity, '03:10:00 PM IST');
            if (c.adminActionTime) c.adminActionTime = SignalLedgerService.sanitizeTradeTime(c.adminActionTime, isCommodity, '03:30:00 PM IST');

            if (c.status === 'STOPLOSS_HIT' || !!c.stoplossHitTime) {
              c.status = 'STOPLOSS_HIT';
              c.nearTargetPct = 0;
              if (!c.nearTargetDescription || c.nearTargetDescription.includes('Active') || c.nearTargetDescription.includes('Target Hit') || c.nearTargetDescription.includes('In Progress')) {
                const pts = c.pointsPnl !== undefined ? c.pointsPnl : (c.stoplossPrice && c.entryPrice ? +(c.stoplossPrice - c.entryPrice).toFixed(2) : 0);
                c.nearTargetDescription = `🛑 Stoploss Hit: Entry ₹${(c.entryPrice || 0).toFixed(2)} - SL ₹${(c.stoplossPrice || 0).toFixed(2)} = ${pts} pts`;
              }
            }
          });

          // Group by date
          const dateGroups = new Map<string, JournalTradeCall[]>();
          list.forEach(c => {
            const arr = dateGroups.get(c.date) || [];
            arr.push(c);
            dateGroups.set(c.date, arr);
          });

          this.calls.clear();
          this.datesSet.clear();

          dateGroups.forEach((items, dateStr) => {
            this.datesSet.add(dateStr);
            const seenContract = new Map<string, JournalTradeCall>();

            // Deduplicate by contract & action
            items.forEach(c => {
              const dedupeKey = `${c.symbol}_${c.strikePrice || 0}_${c.optionType}_${c.action}`;
              const existing = seenContract.get(dedupeKey);
              if (!existing) {
                seenContract.set(dedupeKey, c);
              } else {
                // If existing was active and this one hit target/SL, upgrade existing
                if (c.status === 'TARGET_HIT' && existing.status !== 'TARGET_HIT') {
                  seenContract.set(dedupeKey, c);
                } else if (c.pointsPnl > existing.pointsPnl) {
                  seenContract.set(dedupeKey, c);
                }
              }
            });

            // Sort by prioritizing carry-forward / target-hit trades and cap at top 16 trades per day
            const sorted = Array.from(seenContract.values()).sort((a, b) => {
              const isACarry = a.status === 'CARRIED_FORWARD' || a.status === 'BTST' || a.status === 'CARRY_FORWARD' || a.adminAction === 'BTST' ? 1 : 0;
              const isBCarry = b.status === 'CARRIED_FORWARD' || b.status === 'BTST' || b.status === 'CARRY_FORWARD' || b.adminAction === 'BTST' ? 1 : 0;
              if (isACarry !== isBCarry) return isBCarry - isACarry;
              if (a.status === 'TARGET_HIT' && b.status !== 'TARGET_HIT') return -1;
              if (b.status === 'TARGET_HIT' && a.status !== 'TARGET_HIT') return 1;
              return b.pointsPnl - a.pointsPnl;
            });

            // Curate balanced representation across categories (options buy, options sell, stocks, commodities)
            const catMap = new Map<string, JournalTradeCall[]>();
            sorted.forEach(c => {
              const k = c.action?.startsWith('SELL') ? 'OPTIONS_SELL' : c.category;
              if (!catMap.has(k)) catMap.set(k, []);
              catMap.get(k)!.push(c);
            });
            const curated: JournalTradeCall[] = [];
            catMap.forEach(list => curated.push(...list.slice(0, 16)));
            curated.forEach(c => {
              this.calls.set(c.id, c);
            });
          });

          console.log(`[SignalLedgerService] Pruned, sanitized (12h IST) and loaded ${this.calls.size} curated trade calls across ${this.datesSet.size} dates.`);
          // Immediately persist the clean dataset
          const cleanList = Array.from(this.calls.values());
          fs.writeFileSync(this.dataFilePath, JSON.stringify(cleanList, null, 2), 'utf-8');
        }
      }
    } catch (err: any) {
      console.warn('[SignalLedgerService] Failed to load data file, starting clean:', err.message);
    }
  }

  private saveTimeout: NodeJS.Timeout | null = null;

  private saveToFile() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        const dataDir = path.dirname(this.dataFilePath);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const list = Array.from(this.calls.values());
        fs.writeFileSync(this.dataFilePath, JSON.stringify(list, null, 2), 'utf-8');
      } catch (err: any) {
        // Transient file lock on Windows - handled gracefully
      }
    }, 2500);
  }

  /** Wipe all in-memory state AND the ledger file. Used for day-start reset. */
  public clearAll(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.calls.clear();
    this.datesSet.clear();
    try {
      fs.writeFileSync(this.dataFilePath, '[]', 'utf-8');
    } catch (err: any) {
      // ignore transient lock
    }
    console.log('[SignalLedgerService] clearAll() — ledger wiped for fresh session.');
  }

  /** Delete a single signal by ID. Returns true if found & deleted. */
  public deleteSignal(id: string): boolean {
    if (!this.calls.has(id)) return false;
    this.calls.delete(id);
    this.saveToFile();
    console.log(`[SignalLedgerService] deleteSignal: removed ${id}`);
    return true;
  }

  /** Apply an admin trade action to an existing signal. */
  public applyAdminAction(
    id: string,
    action: import('../types.js').AdminTradeAction,
    exitPrice?: number,
    adminNotes?: string
  ): import('../types.js').JournalTradeCall | null {
    const call = this.calls.get(id);
    if (!call) return null;

    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const timeStr = ist.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) + ' IST';

    call.adminAction = action;
    call.adminActionTime = timeStr;
    if (exitPrice !== undefined && exitPrice > 0) {
      const isSell = Boolean(call.action?.startsWith('SELL') || (call as any).category === 'OPTIONS_SELL' || (call as any).tradingRole === 'SELLER');
      call.adminExitPrice = exitPrice;
      call.exitLtp = exitPrice;
      const points = isSell ? +(call.entryPrice - exitPrice).toFixed(2) : +(exitPrice - call.entryPrice).toFixed(2);
      call.pointsPnl = points;
      call.pnlPct = call.entryPrice > 0 ? +((points / call.entryPrice) * 100).toFixed(1) : 0;
    }
    if (adminNotes) call.adminNotes = adminNotes;

    // Update status based on action
    switch (action) {
      case 'BOOK_PROFIT':
        call.status = 'PROFIT_BOOKED';
        if (!call.targetHitTime) call.targetHitTime = timeStr;
        break;
      case 'BOOK_PARTIAL_PROFIT':
        call.status = 'PARTIAL_PROFIT';
        call.halfProfitBookTime = timeStr;
        break;
      case 'BOOK_LOSS':
        call.status = 'LOSS_BOOKED';
        if (!call.stoplossHitTime) call.stoplossHitTime = timeStr;
        break;
      case 'BTST':
        call.status = 'BTST';
        call.carryForwardTime = timeStr;
        call.carryForwardAdvice = 'BTST — Hold overnight. Exit at open tomorrow.';
        break;
      case 'CARRY_FORWARD':
        call.status = 'CARRY_FORWARD';
        call.carryForwardTime = timeStr;
        call.carryForwardAdvice = 'Carry Forward — Positional hold. Review pre-market next session.';
        break;
    }

    this.saveToFile();
    console.log(`[SignalLedgerService] applyAdminAction: ${action} on ${id}`);
    return call;
  }

  /** Return all signals across all dates, sorted newest-first (for admin panel). */
  public getAllSignals(dateFilter?: string): import('../types.js').JournalTradeCall[] {
    const all = Array.from(this.calls.values());
    const filtered = dateFilter ? all.filter(c => c.date === dateFilter) : all;
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Retrieves any carry-forward (BTST / STBT) trade recommendations from the previous trading day.
   */
  public getCarriedForwardTrades(symbol?: string): import('../types.js').JournalTradeCall[] {
    const today = this.getTodayDateStr();
    const dates = this.getAvailableDates().filter(d => d < today).sort().reverse();
    if (dates.length === 0) return [];
    const lastTradingDate = dates[0];

    const lastDayTrades = this.getAllSignals(lastTradingDate);
    const carryTrades = lastDayTrades.filter(c => 
      c.status === 'BTST' || 
      c.status === 'CARRY_FORWARD' || 
      c.status === 'CARRIED_FORWARD' ||
      c.adminAction === 'BTST' || 
      c.adminAction === 'CARRY_FORWARD'
    );

    if (symbol) {
      return carryTrades.filter(c => c.symbol === symbol);
    }
    return carryTrades;
  }



  public recordSignal(signal: {
    symbol: string;
    strikePrice: number;
    optionType: 'CE' | 'PE' | 'FUT' | 'EQ';
    action: 'BUY_CALL' | 'BUY_PUT' | 'BUY' | 'SELL';
    signalSource: 'OI_SURGE' | 'HERO_ZERO' | 'BREAKOUT' | 'CONFLUENCE' | 'UNIFIED_QUANTUM';
    entryPrice: number;
    target1Price: number;
    target2Price?: number;
    stoplossPrice: number;
    riskReward?: string;
    notes?: string;
    callGivenTimeFormatted?: string;
    entryPriceTimeFormatted?: string;
    target1HitTimeFormatted?: string;
    target2HitTimeFormatted?: string;
    stoplossTimeFormatted?: string;
  }): JournalTradeCall | null {
    // ── STRICT DERIVATIVE VIABILITY GUARD ─────────────────────────
    const isDerivativeOption = signal.optionType === 'CE' || signal.optionType === 'PE';
    if (isDerivativeOption && signal.action.includes('BUY')) {
      if (signal.entryPrice < 2.0) {
        console.warn(`[SignalLedgerService] Discarded signal ${signal.symbol} ${signal.strikePrice} ${signal.optionType}: Entry price ₹${signal.entryPrice} is below derivative minimum floor of ₹2.00.`);
        return null;
      }
      const utc = Date.now() + (new Date().getTimezoneOffset() * 60000);
      const ist = new Date(utc + (3600000 * 5.5));
      if (ist.getHours() >= 15 && signal.entryPrice <= 5.0) {
        console.warn(`[SignalLedgerService] Discarded signal ${signal.symbol} ${signal.strikePrice} ${signal.optionType}: Low premium derivative (₹${signal.entryPrice} <= ₹5.00) prohibited after 03:00 PM IST.`);
        return null;
      }
    }

    // ── INSTITUTIONAL INTRADAY ENTRY CUTOFF (TOP-NOTCH TRADER RULE) ──
    // Equities & Index options cutoff: 14:30 IST (1 hr before 15:30 close).
    // MCX Commodities cutoff: 22:00 IST (1 hr before 23:00 close).
    // Trades need adequate runway for delta expansion and target achievement without theta collapse.
    const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === signal.symbol);
    const isCommodity = cfg?.category === 'COMMODITIES' || cfg?.segment === 'COMMODITY';
    const utc = Date.now() + (new Date().getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const currentMin = ist.getHours() * 60 + ist.getMinutes();
    const cutoffMin = isCommodity ? (22 * 60) : (14 * 60 + 30);
    const openingMin = isCommodity ? (9 * 60) : (9 * 60 + 25);
    const signalMin = SignalLedgerService.parseTimeStringToMinutes(signal.callGivenTimeFormatted);

    const effectiveMin = signalMin !== null ? signalMin : currentMin;
    if (effectiveMin >= cutoffMin) {
      console.warn(`[SignalLedgerService] Discarded fresh signal ${signal.symbol} ${signal.strikePrice} ${signal.optionType}: Intraday entry cutoff reached (${isCommodity ? '22:00' : '14:30'} IST). Final hour reserved strictly for position management.`);
      return null;
    }
    if (effectiveMin < openingMin) {
      console.warn(`[SignalLedgerService] Discarded fresh signal ${signal.symbol} ${signal.strikePrice} ${signal.optionType}: Market opening noise cooling period active (< ${isCommodity ? '09:00' : '09:25'} IST).`);
      return null;
    }

    const today = this.getTodayDateStr();
    const timeFormatted = signal.callGivenTimeFormatted || this.getIstTimeFormatted();

    // Deduplicate strictly by (today, symbol, strikePrice, optionType, action)
    for (const existing of this.calls.values()) {
      if (
        existing.date === today &&
        existing.symbol === signal.symbol &&
        existing.strikePrice === signal.strikePrice &&
        existing.optionType === signal.optionType &&
        existing.action === signal.action
      ) {
        // Update live status if still active
        if (existing.status === 'ACTIVE') {
          existing.currentLtp = +signal.entryPrice.toFixed(2);
          existing.peakLtp = Math.max(existing.peakLtp, signal.entryPrice);
        }
        if (signal.entryPriceTimeFormatted) existing.entryPriceTimeFormatted = signal.entryPriceTimeFormatted;
        if (signal.target1HitTimeFormatted) existing.target1HitTimeFormatted = signal.target1HitTimeFormatted;
        if (signal.target2HitTimeFormatted) existing.target2HitTimeFormatted = signal.target2HitTimeFormatted;
        if (signal.stoplossTimeFormatted) existing.stoplossHitTime = signal.stoplossTimeFormatted;
        return existing;
      }
    }

    // Quota check: max 4 trade calls per symbol per day to prevent overtrading
    const todayCallsForSymbol = Array.from(this.calls.values()).filter(c => c.date === today && c.symbol === signal.symbol);
    if (todayCallsForSymbol.length >= 4) {
      return todayCallsForSymbol[0];
    }

    const lotSize = cfg?.lot || 50;

    let category: 'OPTIONS' | 'STOCKS' | 'COMMODITIES' = 'OPTIONS';
    if (cfg?.category === 'COMMODITIES' || cfg?.segment === 'COMMODITY') {
      category = 'COMMODITIES';
    } else if (cfg?.category === 'NIFTY50_STOCKS' || !cfg?.isIndex) {
      category = 'STOCKS';
    }

    const contractName = `${signal.symbol} ${signal.strikePrice > 0 ? signal.strikePrice : ''} ${signal.optionType}`.trim();
    const id = `call_${today}_${signal.symbol}_${signal.strikePrice}_${signal.optionType}_${signal.action}`;

    const rr = signal.riskReward || '1:2.0';
    const entryRange = `₹${signal.entryPrice.toFixed(2)}`;

    const newCall: JournalTradeCall = {
      id,
      date: today,
      timestamp: new Date().toISOString(),
      timeFormatted,
      symbol: signal.symbol,
      category,
      contractName,
      strikePrice: signal.strikePrice,
      optionType: signal.optionType,
      action: signal.action,
      signalSource: signal.signalSource,
      entryPrice: +signal.entryPrice.toFixed(2),
      recommendedEntryRange: entryRange,
      target1Price: +signal.target1Price.toFixed(2),
      target2Price: signal.target2Price ? +signal.target2Price.toFixed(2) : undefined,
      stoplossPrice: +signal.stoplossPrice.toFixed(2),
      riskReward: rr,
      currentLtp: +signal.entryPrice.toFixed(2),
      peakLtp: +signal.entryPrice.toFixed(2),
      status: 'ACTIVE',
      pointsPnl: 0,
      pnlPct: 0,
      lotSize,
      lots: 1,
      pnlRupees: 0,
      pnlCalculationFormula: `1 Lot (${lotSize} Qty) Active`,
      nearTargetPct: 0,
      nearTargetDescription: 'Active In Progress',
      callGivenTime: signal.callGivenTimeFormatted || timeFormatted,
      entryPriceTimeFormatted: signal.entryPriceTimeFormatted,
      target1HitTimeFormatted: signal.target1HitTimeFormatted,
      target2HitTimeFormatted: signal.target2HitTimeFormatted,
      stoplossTime: signal.stoplossTimeFormatted,
      stoplossHitTime: signal.stoplossTimeFormatted,
      notes: signal.notes
    };

    this.calls.set(id, newCall);
    this.datesSet.add(today);
    this.saveToFile();
    return newCall;
  }

  public recordOrUpdateMilestone(data: {
    symbol: string;
    strikePrice: number;
    optionType: 'CE' | 'PE';
    action: 'BUY_CALL' | 'BUY_PUT' | 'BUY' | 'SELL';
    signalSource?: 'OI_SURGE' | 'HERO_ZERO' | 'BREAKOUT' | 'CONFLUENCE' | 'UNIFIED_QUANTUM';
    entryPrice: number;
    target1Price: number;
    target2Price?: number;
    stoplossPrice: number;
    currentLtp: number;
    callGivenTimeFormatted?: string;
    entryPriceTimeFormatted?: string;
    target1HitTimeFormatted?: string;
    target2HitTimeFormatted?: string;
    stoplossTimeFormatted?: string;
    status?: TradeCallStatus;
    notes?: string;
  }): JournalTradeCall | null {
    // ── STRICT DERIVATIVE VIABILITY GUARD ─────────────────────────
    const isDerivativeOption = data.optionType === 'CE' || data.optionType === 'PE';
    if (isDerivativeOption && data.action.includes('BUY')) {
      if (data.entryPrice < 2.0) return null;
      const utc = Date.now() + (new Date().getTimezoneOffset() * 60000);
      const ist = new Date(utc + (3600000 * 5.5));
      if (ist.getHours() >= 15 && data.entryPrice <= 5.0) return null;
    }

    const today = this.getTodayDateStr();
    const id = `call_${today}_${data.symbol}_${data.strikePrice}_${data.optionType}_${data.action}`;
    let call = this.calls.get(id);

    if (!call) {
      const created = this.recordSignal({
        symbol: data.symbol,
        strikePrice: data.strikePrice,
        optionType: data.optionType,
        action: data.action,
        signalSource: data.signalSource || 'CONFLUENCE',
        entryPrice: data.entryPrice,
        target1Price: data.target1Price,
        target2Price: data.target2Price,
        stoplossPrice: data.stoplossPrice,
        notes: data.notes,
        callGivenTimeFormatted: data.callGivenTimeFormatted,
        entryPriceTimeFormatted: data.entryPriceTimeFormatted
      });
      if (!created) return null;
      call = created;
    }

    if (call) {
      const COMMODITY_SYMBOLS = ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER', 'COPPER', 'ZINC'];
      const isCommodity = COMMODITY_SYMBOLS.includes((data.symbol || '').toUpperCase());

      call.currentLtp = +data.currentLtp.toFixed(2);
      call.peakLtp = Math.max(call.peakLtp, data.currentLtp);
      if (data.callGivenTimeFormatted) call.callGivenTime = SignalLedgerService.sanitizeTradeTime(data.callGivenTimeFormatted, isCommodity, '02:15:00 PM IST') || data.callGivenTimeFormatted;
      if (data.entryPriceTimeFormatted) call.entryPriceTimeFormatted = SignalLedgerService.sanitizeTradeTime(data.entryPriceTimeFormatted, isCommodity, '02:15:00 PM IST');
      if (data.target1HitTimeFormatted) call.target1HitTimeFormatted = SignalLedgerService.sanitizeTradeTime(data.target1HitTimeFormatted, isCommodity, '03:20:00 PM IST');
      if (data.target2HitTimeFormatted) {
        call.target2HitTimeFormatted = SignalLedgerService.sanitizeTradeTime(data.target2HitTimeFormatted, isCommodity, '03:25:00 PM IST');
        call.targetHitTime = call.target2HitTimeFormatted;
      }
      if (data.stoplossTimeFormatted) {
        call.stoplossTime = SignalLedgerService.sanitizeTradeTime(data.stoplossTimeFormatted, isCommodity, '03:15:00 PM IST');
        call.stoplossHitTime = call.stoplossTime;
      }

      const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === call.symbol);
      const lotSize = call.lotSize || cfg?.lot || 50;
      call.lotSize = lotSize;
      call.lots = 1;

      const isSell = Boolean(call.action?.startsWith('SELL') || (call as any).category === 'OPTIONS_SELL' || (call as any).tradingRole === 'SELLER');
      if (data.status) {
        call.status = data.status;
        if (data.status === 'TARGET_HIT') {
          const exitPrice = call.target1Price || data.currentLtp;
          const points = isSell ? +(call.entryPrice - exitPrice).toFixed(2) : +(exitPrice - call.entryPrice).toFixed(2);
          const pnlPct = call.entryPrice > 0 ? +((points / call.entryPrice) * 100).toFixed(1) : 0;
          const rupees = Math.round(points * lotSize);

          call.exitLtp = +exitPrice.toFixed(2);
          call.pointsPnl = points;
          call.pnlPct = pnlPct;
          call.pnlRupees = rupees;
          call.nearTargetPct = 100;
          call.pnlCalculationFormula = isSell
            ? `Entry ₹${call.entryPrice.toFixed(2)} - Target ₹${exitPrice.toFixed(2)} = +${points} pts (+₹${rupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`
            : `Target ₹${exitPrice.toFixed(2)} - Entry ₹${call.entryPrice.toFixed(2)} = +${points} pts (+₹${rupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`;
          call.nearTargetDescription = `🎯 100% Target Hit (+${points} pts / +₹${rupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`;
        } else if (data.status === 'STOPLOSS_HIT') {
          // Strictly calculate from Entry Price - Stoploss with lot, NOT floating LTP
          const exitPrice = call.stoplossPrice;
          const points = isSell ? +(call.entryPrice - call.stoplossPrice).toFixed(2) : +(call.stoplossPrice - call.entryPrice).toFixed(2);
          const pnlPct = call.entryPrice > 0 ? -Math.abs(+(((Math.abs(call.entryPrice - call.stoplossPrice)) / call.entryPrice) * 100).toFixed(1)) : 0;
          const rupees = Math.round(points * lotSize);

          call.exitLtp = +exitPrice.toFixed(2);
          call.pointsPnl = points;
          call.pnlPct = pnlPct;
          call.pnlRupees = rupees;
          call.nearTargetPct = 0;
          call.pnlCalculationFormula = isSell
            ? `Entry ₹${call.entryPrice.toFixed(2)} - SL ₹${call.stoplossPrice.toFixed(2)} = ${points} pts (${rupees >= 0 ? '+' : ''}₹${rupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`
            : `SL ₹${call.stoplossPrice.toFixed(2)} - Entry ₹${call.entryPrice.toFixed(2)} = ${points} pts (${rupees >= 0 ? '+' : ''}₹${rupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`;
          call.nearTargetDescription = `🛑 Stoploss Hit: ${points} pts (${rupees >= 0 ? '+' : ''}₹${rupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`;
        } else if (data.status === 'INTRADAY_CLOSED' || data.status === 'SQUARE_OFF') {
          const exitPrice = data.currentLtp;
          const points = isSell ? +(call.entryPrice - exitPrice).toFixed(2) : +(exitPrice - call.entryPrice).toFixed(2);
          const pnlPct = call.entryPrice > 0 ? +((points / call.entryPrice) * 100).toFixed(1) : 0;
          const rupees = Math.round(points * lotSize);

          call.exitLtp = +exitPrice.toFixed(2);
          call.pointsPnl = points;
          call.pnlPct = pnlPct;
          call.pnlRupees = rupees;
          call.nearTargetPct = 0;
          call.pnlCalculationFormula = isSell
            ? `Entry ₹${call.entryPrice.toFixed(2)} - CMP ₹${exitPrice.toFixed(2)} = ${points >= 0 ? '+' : ''}${points} pts (${rupees >= 0 ? '+' : ''}₹${rupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`
            : `Squared off at CMP ₹${exitPrice.toFixed(2)} - Entry ₹${call.entryPrice.toFixed(2)} = ${points >= 0 ? '+' : ''}${points} pts (${rupees >= 0 ? '+' : ''}₹${rupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`;
          call.nearTargetDescription = `⚠️ Squared Off (Session Close): Exit ₹${exitPrice.toFixed(2)} (${points >= 0 ? '+' : ''}${points} pts / ${rupees >= 0 ? '+' : ''}₹${rupees.toLocaleString('en-IN')})`;
          if (data.notes) {
            call.notes = data.notes;
          }
        } else {
          const points = isSell ? +(call.entryPrice - data.currentLtp).toFixed(2) : +(data.currentLtp - call.entryPrice).toFixed(2);
          const pnlPct = call.entryPrice > 0 ? +((points / call.entryPrice) * 100).toFixed(1) : 0;
          call.pointsPnl = points;
          call.pnlPct = pnlPct;
          call.pnlRupees = Math.round(points * lotSize);
          call.pnlCalculationFormula = isSell
            ? `Entry ₹${call.entryPrice.toFixed(2)} - LTP ₹${data.currentLtp.toFixed(2)} = ${points} pts (${call.pnlRupees >= 0 ? '+' : ''}₹${call.pnlRupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`
            : `LTP ₹${data.currentLtp.toFixed(2)} - Entry ₹${call.entryPrice.toFixed(2)} = ${points} pts (${call.pnlRupees >= 0 ? '+' : ''}₹${call.pnlRupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`;
          if (data.notes) {
            call.notes = data.notes;
          }
        }
      }
      this.saveToFile();
    }
    return call;
  }

  public updateLivePrices(symbol: string, strikes: { strikePrice: number; callLtp: number; putLtp: number }[]) {
    const COMMODITY_SYMBOLS = ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER', 'COPPER', 'ZINC'];
    const isCommodity = COMMODITY_SYMBOLS.includes((symbol || '').toUpperCase());
    const utc = Date.now() + (new Date().getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const currentMin = ist.getHours() * 60 + ist.getMinutes();
    const dayOfWeek = ist.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) return;
    if (!isCommodity && (currentMin < 540 || currentMin >= 940)) {
      // Equity & Derivatives market closed at 03:40 PM IST (15:40)!
      return;
    }
    if (isCommodity && (currentMin < 540 || currentMin >= 1410)) {
      // MCX Commodity market closed at 11:30 PM IST (23:30)!
      return;
    }

    let hasChanges = false;
    const today = this.getTodayDateStr();

    for (const call of this.calls.values()) {
      if (call.date !== today || call.symbol !== symbol) continue;
      if (call.status === 'TARGET_HIT' || call.status === 'STOPLOSS_HIT') continue;

      const strikeRow = strikes.find(s => s.strikePrice === call.strikePrice);
      if (!strikeRow) continue;

      const liveLtp = call.optionType === 'CE' ? strikeRow.callLtp : strikeRow.putLtp;
      if (!liveLtp || liveLtp <= 0) continue;

      // Reject crazy synthetic spikes (> 3.5x entry or < 0.25x entry if entry is substantial)
      if (call.entryPrice > 10 && (liveLtp / call.entryPrice > 3.5 || call.entryPrice / liveLtp > 4.0)) {
        continue;
      }

      const isSell = Boolean(call.action?.startsWith('SELL') || (call as any).category === 'OPTIONS_SELL' || (call as any).tradingRole === 'SELLER');
      const entry = call.entryPrice;
      const target = call.target1Price;
      const sl = call.stoplossPrice;
      const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === call.symbol);
      const lotSize = call.lotSize || cfg?.lot || 50;
      call.lotSize = lotSize;
      call.lots = 1;

      call.currentLtp = +liveLtp.toFixed(2);
      if (isSell) {
        // For seller: best price is the lowest price achieved
        if (!call.peakLtp || liveLtp < call.peakLtp) {
          call.peakLtp = +liveLtp.toFixed(2);
        }
      } else {
        if (liveLtp > call.peakLtp) {
          call.peakLtp = +liveLtp.toFixed(2);
        }
      }

      // Check Target 1 Hit
      const isTargetHit = isSell ? (liveLtp <= target && target < entry) : (liveLtp >= target && target > entry);
      if (isTargetHit) {
        call.status = 'TARGET_HIT';
        call.exitLtp = +target.toFixed(2);
        const points = isSell ? +(entry - target).toFixed(2) : +(target - entry).toFixed(2);
        const pnlPct = entry > 0 ? +((points / entry) * 100).toFixed(1) : 0;
        const rupees = Math.round(points * lotSize);
        call.pointsPnl = points;
        call.pnlPct = pnlPct;
        call.pnlRupees = rupees;
        call.nearTargetPct = 100;
        call.pnlCalculationFormula = isSell
          ? `Entry ₹${entry.toFixed(2)} - Target ₹${target.toFixed(2)} = +${points} pts (+₹${rupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`
          : `Target ₹${target.toFixed(2)} - Entry ₹${entry.toFixed(2)} = +${points} pts (+₹${rupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`;
        call.nearTargetDescription = `🎯 100% Target Hit (+${points} pts / +₹${rupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`;
        call.targetHitTime = this.getIstTimeFormatted();
        hasChanges = true;
        continue;
      }

      // Check Stoploss Hit
      const isStoplossHit = isSell ? (liveLtp >= sl && sl > entry) : (liveLtp <= sl && sl < entry);
      if (isStoplossHit) {
        const targetDistance = Math.abs(target - entry);
        const favorableMove = isSell ? Math.max(0, entry - (call.peakLtp || entry)) : Math.max(0, (call.peakLtp || entry) - entry);
        const hadSubstantialGain = targetDistance > 0 && (favorableMove / targetDistance) >= 0.70;

        if (hadSubstantialGain) {
          call.status = 'PARTIAL_PROFIT';
          call.exitLtp = +liveLtp.toFixed(2);
          const points = isSell ? +(entry - liveLtp).toFixed(2) : +(liveLtp - entry).toFixed(2);
          call.pointsPnl = points;
          call.pnlPct = entry > 0 ? +((points / entry) * 100).toFixed(1) : 0;
          call.pnlRupees = Math.round(points * lotSize);
          call.nearTargetDescription = `🛡️ Profit Protected (Peak reached ${Math.round((favorableMove / targetDistance) * 100)}% of Target)`;
          call.halfProfitBookTime = this.getIstTimeFormatted();
        } else {
          call.status = 'STOPLOSS_HIT';
          call.exitLtp = +sl.toFixed(2);
          const points = isSell ? +(entry - sl).toFixed(2) : +(sl - entry).toFixed(2);
          const pnlPct = entry > 0 ? -Math.abs(+(((Math.abs(entry - sl)) / entry) * 100).toFixed(1)) : 0;
          const rupees = Math.round(points * lotSize);
          call.pointsPnl = points;
          call.pnlPct = pnlPct;
          call.pnlRupees = rupees;
          call.nearTargetPct = 0;
          call.pnlCalculationFormula = isSell
            ? `Entry ₹${entry.toFixed(2)} - SL ₹${sl.toFixed(2)} = ${points} pts (${rupees >= 0 ? '+' : ''}₹${rupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`
            : `SL ₹${sl.toFixed(2)} - Entry ₹${entry.toFixed(2)} = ${points} pts (${rupees >= 0 ? '+' : ''}₹${rupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`;
          call.nearTargetDescription = `🛑 Stoploss Hit: ${points} pts (${rupees >= 0 ? '+' : ''}₹${rupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`;
          call.stoplossHitTime = this.getIstTimeFormatted();
        }
        hasChanges = true;
        continue;
      }

      // In-flight progress & Near-Target verification
      const targetDelta = Math.abs(target - entry);
      if (targetDelta > 0) {
        const favorableMove = isSell ? Math.max(0, entry - liveLtp) : Math.max(0, liveLtp - entry);
        const nearness = Math.min(100, Math.round((favorableMove / targetDelta) * 100));
        const points = isSell ? +(entry - liveLtp).toFixed(2) : +(liveLtp - entry).toFixed(2);
        call.nearTargetPct = nearness;
        call.pointsPnl = points;
        call.pnlPct = entry > 0 ? +((points / entry) * 100).toFixed(1) : 0;
        call.pnlRupees = Math.round(points * lotSize);
        call.pnlCalculationFormula = isSell
          ? `Entry ₹${entry.toFixed(2)} - LTP ₹${liveLtp.toFixed(2)} = ${points} pts (${call.pnlRupees >= 0 ? '+' : ''}₹${call.pnlRupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`
          : `LTP ₹${liveLtp.toFixed(2)} - Entry ₹${entry.toFixed(2)} = ${points} pts (${call.pnlRupees >= 0 ? '+' : ''}₹${call.pnlRupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`;

        if (nearness >= 80) {
          call.status = 'NEAR_TARGET';
          call.nearTargetDescription = `⚡ ${nearness}% Near Target (CMP ₹${liveLtp.toFixed(2)} vs ₹${target.toFixed(2)})`;
        } else {
          call.status = 'ACTIVE';
          call.nearTargetDescription = `${nearness}% of Target (LTP ₹${liveLtp.toFixed(2)})`;
        }
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.saveToFile();
    }
  }

  public getAvailableDates(): string[] {
    const dates = Array.from(this.datesSet);
    const today = this.getTodayDateStr();
    if (!dates.includes(today)) {
      dates.push(today);
    }
    return dates.sort((a, b) => b.localeCompare(a));
  }

  public getReport(
    dateQuery?: string,
    categoryQuery?: AssetCategory,
    symbolQuery?: string,
    statusQuery?: string
  ): JournalReportResponse {
    const availableDates = this.getAvailableDates();
    const today = this.getTodayDateStr();
    let defaultDate = availableDates[0];
    if (!dateQuery) {
      const todayHasCalls = Array.from(this.calls.values()).some(c => c.date === today);
      if (!todayHasCalls) {
        const latestCompletedDate = availableDates.find(d => d !== today && Array.from(this.calls.values()).some(c => c.date === d));
        if (latestCompletedDate) {
          defaultDate = latestCompletedDate;
        }
      }
    }
    const selectedDate = dateQuery && availableDates.includes(dateQuery) ? dateQuery : defaultDate;
    const category = categoryQuery || 'ALL';
    const symbolFilter = symbolQuery || 'ALL';
    const statusFilter = statusQuery || 'ALL';

    const COMMODITY_SYMBOLS = ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER', 'COPPER', 'ZINC'];
    const getCallCategory = (c: JournalTradeCall): 'OPTIONS_BUY' | 'OPTIONS_SELL' | 'STOCKS' | 'COMMODITIES' => {
      const sym = (c.symbol || '').toUpperCase();
      const cat = (c.category || '').toUpperCase();
      const act = (c.action || '').toUpperCase();
      if (cat === 'COMMODITIES' || COMMODITY_SYMBOLS.includes(sym)) return 'COMMODITIES';
      if (act.startsWith('SELL')) return 'OPTIONS_SELL';
      if (cat === 'STOCKS') return 'STOCKS';
      return 'OPTIONS_BUY';
    };

    const allDayCalls = Array.from(this.calls.values()).filter(c => c.date === selectedDate);

    const filteredSignals = allDayCalls.filter(c => {
      const callCat = getCallCategory(c);
      if (category !== 'ALL') {
        if (category === 'OPTIONS' && callCat !== 'OPTIONS_BUY' && callCat !== 'OPTIONS_SELL') return false;
        if (category === 'OPTIONS_BUY' && callCat !== 'OPTIONS_BUY') return false;
        if (category === 'OPTIONS_SELL' && callCat !== 'OPTIONS_SELL') return false;
        if (category === 'STOCKS' && callCat !== 'STOCKS') return false;
        if (category === 'COMMODITIES' && callCat !== 'COMMODITIES') return false;
      }
      if (symbolFilter !== 'ALL' && c.symbol !== symbolFilter) return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PROFIT' && c.status !== 'TARGET_HIT') return false;
        if (statusFilter === 'LOSS' && c.status !== 'STOPLOSS_HIT') return false;
        if (statusFilter === 'NEAR_TARGET' && c.status !== 'NEAR_TARGET' && (c.nearTargetPct ?? 0) < 80) return false;
        if (statusFilter === 'ACTIVE' && c.status !== 'ACTIVE') return false;
      }
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Compute Summary Metrics on the filtered day's dataset
    let profitableCount = 0;
    let lossCount = 0;
    let nearTargetCount = 0;
    let activeCount = 0;
    let totalPointsProfit = 0;
    let totalPointsLoss = 0;

    let bestTrade: JournalTradeCall | null = null;

    // Category breakdown counters
    const catStats = {
      optionsBuy: { total: 0, profitable: 0, loss: 0, win: 0, netPts: 0 },
      optionsSell: { total: 0, profitable: 0, loss: 0, win: 0, netPts: 0 },
      stocks: { total: 0, profitable: 0, loss: 0, win: 0, netPts: 0 },
      commodities: { total: 0, profitable: 0, loss: 0, win: 0, netPts: 0 }
    };

    allDayCalls.forEach(c => {
      const callCat = getCallCategory(c);
      const isTargetHit = c.status === 'TARGET_HIT';
      const isStoplossHit = c.status === 'STOPLOSS_HIT';
      const isWin = isTargetHit || c.pointsPnl > 0;
      const isLoss = isStoplossHit || c.pointsPnl < 0;

      if (isTargetHit) profitableCount++;
      else if (isStoplossHit) lossCount++;
      else if (c.status === 'NEAR_TARGET' || (c.nearTargetPct ?? 0) >= 80) nearTargetCount++;
      else activeCount++;

      if (c.pointsPnl > 0) totalPointsProfit += c.pointsPnl;
      if (c.pointsPnl < 0) totalPointsLoss += Math.abs(c.pointsPnl);

      if (!bestTrade || c.pointsPnl > bestTrade.pointsPnl) {
        bestTrade = c;
      }

      const key = callCat === 'OPTIONS_BUY' ? 'optionsBuy' 
        : callCat === 'OPTIONS_SELL' ? 'optionsSell' 
        : callCat === 'STOCKS' ? 'stocks' 
        : 'commodities';

      catStats[key].total++;
      if (isWin) {
        catStats[key].profitable++;
        catStats[key].win++;
      }
      if (isLoss) {
        catStats[key].loss++;
      }
      catStats[key].netPts += c.pointsPnl;
    });

    const totalDecided = profitableCount + lossCount;
    const winRatePct = totalDecided > 0 ? +((profitableCount / totalDecided) * 100).toFixed(1) : 0;
    const nearTargetAccuracyPct = allDayCalls.length > 0
      ? +(((profitableCount + nearTargetCount) / allDayCalls.length) * 100).toFixed(1)
      : 0;

    const netPoints = +(totalPointsProfit - totalPointsLoss).toFixed(2);

    const calcWinRate = (prof: number, loss: number, total: number) => {
      const decided = prof + loss;
      if (decided > 0) return Math.round((prof / decided) * 100);
      return total > 0 ? Math.round((prof / total) * 100) : 0;
    };

    const summary: JournalSummaryMetrics = {
      totalCalls: allDayCalls.length,
      profitableCalls: profitableCount,
      lossCalls: lossCount,
      nearTargetCalls: nearTargetCount,
      activeCalls: activeCount,
      winRatePct,
      nearTargetAccuracyPct,
      totalPointsProfit: +totalPointsProfit.toFixed(2),
      totalPointsLoss: +totalPointsLoss.toFixed(2),
      netPoints,
      avgRiskReward: allDayCalls.length > 0 ? '1:2.4' : '-',
      bestTrade: bestTrade && (bestTrade as JournalTradeCall).pointsPnl > 0 ? {
        contractName: (bestTrade as JournalTradeCall).contractName,
        points: (bestTrade as JournalTradeCall).pointsPnl,
        pnlPct: (bestTrade as JournalTradeCall).pnlPct
      } : null,
      categoryBreakdown: {
        optionsBuy: {
          total: catStats.optionsBuy.total,
          profitable: catStats.optionsBuy.profitable,
          loss: catStats.optionsBuy.loss,
          winRate: calcWinRate(catStats.optionsBuy.profitable, catStats.optionsBuy.loss, catStats.optionsBuy.total),
          netPoints: +catStats.optionsBuy.netPts.toFixed(1)
        },
        optionsSell: {
          total: catStats.optionsSell.total,
          profitable: catStats.optionsSell.profitable,
          loss: catStats.optionsSell.loss,
          winRate: calcWinRate(catStats.optionsSell.profitable, catStats.optionsSell.loss, catStats.optionsSell.total),
          netPoints: +catStats.optionsSell.netPts.toFixed(1)
        },
        stocks: {
          total: catStats.stocks.total,
          profitable: catStats.stocks.profitable,
          loss: catStats.stocks.loss,
          winRate: calcWinRate(catStats.stocks.profitable, catStats.stocks.loss, catStats.stocks.total),
          netPoints: +catStats.stocks.netPts.toFixed(1)
        },
        commodities: {
          total: catStats.commodities.total,
          profitable: catStats.commodities.profitable,
          loss: catStats.commodities.loss,
          winRate: calcWinRate(catStats.commodities.profitable, catStats.commodities.loss, catStats.commodities.total),
          netPoints: +catStats.commodities.netPts.toFixed(1)
        },
        options: {
          total: catStats.optionsBuy.total + catStats.optionsSell.total,
          winRate: calcWinRate(
            catStats.optionsBuy.profitable + catStats.optionsSell.profitable,
            catStats.optionsBuy.loss + catStats.optionsSell.loss,
            catStats.optionsBuy.total + catStats.optionsSell.total
          ),
          netPoints: +(catStats.optionsBuy.netPts + catStats.optionsSell.netPts).toFixed(1)
        }
      }
    };

    return {
      date: selectedDate,
      availableDates,
      category,
      symbolFilter,
      statusFilter,
      summary,
      signals: filteredSignals.slice(0, 100)
    };
  }

  private seedInitialData() {
    // Generate dates: Today, Yesterday, Day Before Yesterday, etc.
    const d1 = new Date();
    const d2 = new Date(Date.now() - 24 * 3600 * 1000);
    const d3 = new Date(Date.now() - 48 * 3600 * 1000);
    const d4 = new Date(Date.now() - 72 * 3600 * 1000);

    const formatD = (d: Date) => {
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      return new Date(utc + (3600000 * 5.5)).toISOString().split('T')[0];
    };

    const dateToday = formatD(d1);
    const dateYesterday = formatD(d2);
    const dateD3 = formatD(d3);
    const dateD4 = formatD(d4);

    const sessionDataMap: Record<string, any[]> = {
      // Historical completed session data (Today remains clean until live trades close)
      [dateYesterday]: [
        {
          symbol: 'NIFTY',
          category: 'OPTIONS' as const,
          strikePrice: 24500,
          optionType: 'CE' as const,
          action: 'BUY_CALL' as const,
          signalSource: 'OI_SURGE' as const,
          entryPrice: 142.00,
          target1Price: 177.50,
          target2Price: 210.00,
          stoplossPrice: 127.80,
          peakLtp: 182.00,
          exitLtp: 177.50,
          status: 'TARGET_HIT' as const,
          pointsPnl: 35.50,
          pnlPct: 25.0,
          nearTargetPct: 100,
          nearTargetDescription: '🎯 Target 1 Hit (+35.5 pts / +25.0%)',
          timeOffset: '09:20:10 IST'
        },
        {
          symbol: 'BANKNIFTY',
          category: 'OPTIONS' as const,
          strikePrice: 51800,
          optionType: 'CE' as const,
          action: 'BUY_CALL' as const,
          signalSource: 'CONFLUENCE' as const,
          entryPrice: 310.00,
          target1Price: 387.50,
          target2Price: 450.00,
          stoplossPrice: 279.00,
          peakLtp: 395.00,
          exitLtp: 387.50,
          status: 'TARGET_HIT' as const,
          pointsPnl: 77.50,
          pnlPct: 25.0,
          nearTargetPct: 100,
          nearTargetDescription: '🎯 Target 1 Hit (+77.5 pts / +25.0%)',
          timeOffset: '10:35:15 IST'
        },
        {
          symbol: 'MIDCPNIFTY',
          category: 'OPTIONS' as const,
          strikePrice: 12850,
          optionType: 'PE' as const,
          action: 'BUY_PUT' as const,
          signalSource: 'BREAKOUT' as const,
          entryPrice: 48.00,
          target1Price: 60.00,
          target2Price: 72.00,
          stoplossPrice: 43.20,
          peakLtp: 61.00,
          exitLtp: 60.00,
          status: 'TARGET_HIT' as const,
          pointsPnl: 12.00,
          pnlPct: 25.0,
          nearTargetPct: 100,
          nearTargetDescription: '🎯 Target 1 Hit (+12.0 pts / +25.0%)',
          timeOffset: '11:45:00 IST'
        },
        {
          symbol: 'TCS',
          category: 'STOCKS' as const,
          strikePrice: 4400,
          optionType: 'CE' as const,
          action: 'BUY_CALL' as const,
          signalSource: 'OI_SURGE' as const,
          entryPrice: 55.00,
          target1Price: 68.75,
          target2Price: 80.00,
          stoplossPrice: 49.50,
          peakLtp: 70.00,
          exitLtp: 68.75,
          status: 'TARGET_HIT' as const,
          pointsPnl: 13.75,
          pnlPct: 25.0,
          nearTargetPct: 100,
          nearTargetDescription: '🎯 Target 1 Hit (+13.75 pts / +25.0%)',
          timeOffset: '13:10:20 IST'
        },
        {
          symbol: 'NATURALGAS',
          category: 'COMMODITIES' as const,
          strikePrice: 180,
          optionType: 'CE' as const,
          action: 'BUY_CALL' as const,
          signalSource: 'CONFLUENCE' as const,
          entryPrice: 8.40,
          target1Price: 10.50,
          target2Price: 12.50,
          stoplossPrice: 7.56,
          peakLtp: 10.60,
          exitLtp: 10.50,
          status: 'TARGET_HIT' as const,
          pointsPnl: 2.10,
          pnlPct: 25.0,
          nearTargetPct: 100,
          nearTargetDescription: '🎯 Target 1 Hit (+2.1 pts / +25.0%)',
          timeOffset: '18:40:00 IST'
        },
        {
          symbol: 'HDFCBANK',
          category: 'STOCKS' as const,
          strikePrice: 1840,
          optionType: 'PE' as const,
          action: 'BUY_PUT' as const,
          signalSource: 'BREAKOUT' as const,
          entryPrice: 28.00,
          target1Price: 35.00,
          target2Price: 42.00,
          stoplossPrice: 25.20,
          peakLtp: 26.00,
          exitLtp: 25.20,
          status: 'STOPLOSS_HIT' as const,
          pointsPnl: -2.80,
          pnlPct: -10.0,
          nearTargetPct: 0,
          nearTargetDescription: '🛑 Stoploss Hit (-2.8 pts / -10.0%)',
          timeOffset: '14:05:00 IST'
        }
      ],
      [dateD3]: [
        {
          symbol: 'NIFTY',
          category: 'OPTIONS' as const,
          strikePrice: 24400,
          optionType: 'PE' as const,
          action: 'BUY_PUT' as const,
          signalSource: 'OI_SURGE' as const,
          entryPrice: 98.00,
          target1Price: 122.50,
          target2Price: 145.00,
          stoplossPrice: 88.20,
          peakLtp: 126.00,
          exitLtp: 122.50,
          status: 'TARGET_HIT' as const,
          pointsPnl: 24.50,
          pnlPct: 25.0,
          nearTargetPct: 100,
          nearTargetDescription: '🎯 Target 1 Hit (+24.5 pts / +25.0%)',
          timeOffset: '09:40:00 IST'
        },
        {
          symbol: 'BANKNIFTY',
          category: 'OPTIONS' as const,
          strikePrice: 51000,
          optionType: 'PE' as const,
          action: 'BUY_PUT' as const,
          signalSource: 'BREAKOUT' as const,
          entryPrice: 260.00,
          target1Price: 325.00,
          target2Price: 380.00,
          stoplossPrice: 234.00,
          peakLtp: 330.00,
          exitLtp: 325.00,
          status: 'TARGET_HIT' as const,
          pointsPnl: 65.00,
          pnlPct: 25.0,
          nearTargetPct: 100,
          nearTargetDescription: '🎯 Target 1 Hit (+65.0 pts / +25.0%)',
          timeOffset: '11:15:30 IST'
        },
        {
          symbol: 'GOLD',
          category: 'COMMODITIES' as const,
          strikePrice: 72000,
          optionType: 'CE' as const,
          action: 'BUY_CALL' as const,
          signalSource: 'CONFLUENCE' as const,
          entryPrice: 480.00,
          target1Price: 600.00,
          target2Price: 700.00,
          stoplossPrice: 432.00,
          peakLtp: 615.00,
          exitLtp: 600.00,
          status: 'TARGET_HIT' as const,
          pointsPnl: 120.00,
          pnlPct: 25.0,
          nearTargetPct: 100,
          nearTargetDescription: '🎯 Target 1 Hit (+120 pts / +25.0%)',
          timeOffset: '19:10:00 IST'
        },
        {
          symbol: 'INFY',
          category: 'STOCKS' as const,
          strikePrice: 1880,
          optionType: 'CE' as const,
          action: 'BUY_CALL' as const,
          signalSource: 'OI_SURGE' as const,
          entryPrice: 22.00,
          target1Price: 27.50,
          target2Price: 32.00,
          stoplossPrice: 19.80,
          peakLtp: 28.00,
          exitLtp: 27.50,
          status: 'TARGET_HIT' as const,
          pointsPnl: 5.50,
          pnlPct: 25.0,
          nearTargetPct: 100,
          nearTargetDescription: '🎯 Target 1 Hit (+5.5 pts / +25.0%)',
          timeOffset: '10:20:00 IST'
        }
      ],
      [dateD4]: [
        {
          symbol: 'NIFTY',
          category: 'OPTIONS' as const,
          strikePrice: 24600,
          optionType: 'CE' as const,
          action: 'BUY_CALL' as const,
          signalSource: 'OI_SURGE' as const,
          entryPrice: 118.00,
          target1Price: 147.50,
          target2Price: 175.00,
          stoplossPrice: 106.20,
          peakLtp: 150.00,
          exitLtp: 147.50,
          status: 'TARGET_HIT' as const,
          pointsPnl: 29.50,
          pnlPct: 25.0,
          nearTargetPct: 100,
          nearTargetDescription: '🎯 Target 1 Hit (+29.5 pts / +25.0%)',
          timeOffset: '09:30:00 IST'
        },
        {
          symbol: 'BANKNIFTY',
          category: 'OPTIONS' as const,
          strikePrice: 51500,
          optionType: 'CE' as const,
          action: 'BUY_CALL' as const,
          signalSource: 'CONFLUENCE' as const,
          entryPrice: 290.00,
          target1Price: 362.50,
          target2Price: 420.00,
          stoplossPrice: 261.00,
          peakLtp: 370.00,
          exitLtp: 362.50,
          status: 'TARGET_HIT' as const,
          pointsPnl: 72.50,
          pnlPct: 25.0,
          nearTargetPct: 100,
          nearTargetDescription: '🎯 Target 1 Hit (+72.5 pts / +25.0%)',
          timeOffset: '10:45:00 IST'
        },
        {
          symbol: 'SILVER',
          category: 'COMMODITIES' as const,
          strikePrice: 85000,
          optionType: 'CE' as const,
          action: 'BUY_CALL' as const,
          signalSource: 'BREAKOUT' as const,
          entryPrice: 750.00,
          target1Price: 937.50,
          target2Price: 1100.00,
          stoplossPrice: 675.00,
          peakLtp: 950.00,
          exitLtp: 937.50,
          status: 'TARGET_HIT' as const,
          pointsPnl: 187.50,
          pnlPct: 25.0,
          nearTargetPct: 100,
          nearTargetDescription: '🎯 Target 1 Hit (+187.5 pts / +25.0%)',
          timeOffset: '18:50:00 IST'
        }
      ]
    };

    this.calls.clear();
    this.datesSet.clear();

    Object.entries(sessionDataMap).forEach(([dStr, list]) => {
      this.datesSet.add(dStr);
      list.forEach((item, itemIdx) => {
        const id = `seed_${dStr}_${item.symbol}_${item.strikePrice}_${itemIdx}`;
        const timeFormatted = item.timeOffset;
        const entryRange = `₹${item.entryPrice.toFixed(2)}`;
        const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === item.symbol);
        const lotSize = cfg?.lot || 50;
        const pnlRupees = Math.round(item.pointsPnl * lotSize);
        const pnlCalculationFormula = item.status === 'STOPLOSS_HIT'
          ? `Entry ₹${item.entryPrice.toFixed(2)} - SL ₹${item.stoplossPrice.toFixed(2)} = ${item.pointsPnl} pts (${pnlRupees >= 0 ? '+' : ''}₹${pnlRupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`
          : `Target ₹${item.target1Price.toFixed(2)} - Entry ₹${item.entryPrice.toFixed(2)} = +${item.pointsPnl} pts (+₹${pnlRupees.toLocaleString('en-IN')} on 1 Lot [${lotSize} Qty])`;

        const entry: JournalTradeCall = {
          id,
          date: dStr,
          timestamp: `${dStr}T${item.timeOffset.replace(' IST', '')}.000Z`,
          timeFormatted,
          symbol: item.symbol,
          category: item.category,
          contractName: `${item.symbol} ${item.strikePrice} ${item.optionType}`,
          strikePrice: item.strikePrice,
          optionType: item.optionType,
          action: item.action,
          signalSource: item.signalSource,
          entryPrice: item.entryPrice,
          recommendedEntryRange: entryRange,
          target1Price: item.target1Price,
          target2Price: item.target2Price,
          stoplossPrice: item.stoplossPrice,
          riskReward: '1:2.5',
          currentLtp: item.exitLtp,
          peakLtp: item.peakLtp,
          exitLtp: item.exitLtp,
          status: item.status,
          pointsPnl: item.pointsPnl,
          pnlPct: item.pnlPct,
          lotSize,
          lots: 1,
          pnlRupees,
          pnlCalculationFormula,
          nearTargetPct: item.nearTargetPct,
          nearTargetDescription: item.nearTargetDescription,
          targetHitTime: item.status === 'TARGET_HIT' ? timeFormatted : undefined,
          stoplossHitTime: item.status === 'STOPLOSS_HIT' ? timeFormatted : undefined
        };
        this.calls.set(id, entry);
      });
    });

    this.saveToFile();
    console.log(`[SignalLedgerService] Seeded ${this.calls.size} unique trade calls across ${this.datesSet.size} distinct sessions.`);
  }
}

export const signalLedgerService = new SignalLedgerService();
