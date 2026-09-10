/**
 * SubscriptionPlanService
 * Dynamic management of Free, Silver, Gold, and Diamond subscription plans.
 * Persists to server/data/subscription_plans.json so prices, tax, and features
 * can be updated by SuperAdmin without application redeployments.
 */
import fs from 'fs';
import path from 'path';
import { SubscriptionPlanConfig, BillingCycle } from '../types.js';

function getDataPath(): string {
  const base = process.cwd().endsWith('server') ? process.cwd() : path.join(process.cwd(), 'server');
  const dir = path.join(base, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'subscription_plans.json');
}

const DEFAULT_PLANS: SubscriptionPlanConfig[] = [
  {
    id: 'FREE',
    name: 'Free Starter',
    tagline: 'Essential market tracking & educational tools',
    badge: 'STARTER',
    isActive: true,
    features: [
      'Live NSE / BSE Index Spot Tracking',
      'Delayed Options Open Interest Matrix',
      'Daily Pre-Market CPR Checklist',
      'Public Trading Journal & Prediction Audit',
      'Community Terminal Access'
    ],
    entitlements: ['BASIC_TRACKING', 'COMMUNITY_ACCESS', 'CPR_CHECKLIST'],
    pricing: {
      MONTHLY: { price: 0, discountPct: 0, taxPct: 0, effectiveTotal: 0 },
      QUARTERLY: { price: 0, discountPct: 0, taxPct: 0, effectiveTotal: 0 },
      ANNUAL: { price: 0, discountPct: 0, taxPct: 0, effectiveTotal: 0 }
    }
  },
  {
    id: 'SILVER',
    name: 'Silver Active',
    tagline: 'High-frequency OI analytics & live momentum indicators',
    badge: 'POPULAR',
    isPopular: false,
    isActive: true,
    features: [
      'Ultra-Low Latency Live Fyers & Dhan Feed',
      '10 Technical Indicator Confluence Matrix',
      'Real-Time 1-Minute OI Surge Alerts',
      'Tactical Strike Slider Radar (ATM ±3 Steps)',
      'Telegram Priority Signal Notifications',
      'Interactive Risk-Reward & Payoff Simulator'
    ],
    entitlements: ['BASIC_TRACKING', 'COMMUNITY_ACCESS', 'CPR_CHECKLIST', 'LIVE_FEEDS', 'CONFLUENCE_MATRIX', 'SURGE_ALERTS', 'TELEGRAM_ALERTS'],
    pricing: {
      MONTHLY: { price: 999, discountPct: 0, taxPct: 18, effectiveTotal: 1179 },
      QUARTERLY: { price: 2499, discountPct: 15, taxPct: 18, effectiveTotal: 2949 },
      ANNUAL: { price: 7999, discountPct: 33, taxPct: 18, effectiveTotal: 9439 }
    }
  },
  {
    id: 'GOLD',
    name: 'Gold Pro Trader',
    tagline: 'Institutional confluence signals with SMS & WhatsApp execution',
    badge: 'BEST VALUE',
    isPopular: true,
    isActive: true,
    features: [
      'All Silver Features Included',
      'High Alpha CE / PE Trade Recommendations',
      'Instant SMS & WhatsApp Trade Directives',
      'ATM ±3 Strike Cluster Radar & 09:15 Baseline Engine',
      'Greeks Heatmap & Options Matrix Drill-Down',
      'Dynamic Profit Target & Trailing SL Engine',
      'Direct Fyers / Dhan 1-Click Basket Execution'
    ],
    entitlements: ['BASIC_TRACKING', 'COMMUNITY_ACCESS', 'CPR_CHECKLIST', 'LIVE_FEEDS', 'CONFLUENCE_MATRIX', 'SURGE_ALERTS', 'TELEGRAM_ALERTS', 'ALPHA_SIGNALS', 'WHATSAPP_SMS_ALERTS', 'BASKET_ORDERING', 'GREEKS_HEATMAP'],
    pricing: {
      MONTHLY: { price: 1999, discountPct: 0, taxPct: 18, effectiveTotal: 2359 },
      QUARTERLY: { price: 4999, discountPct: 17, taxPct: 18, effectiveTotal: 5899 },
      ANNUAL: { price: 14999, discountPct: 37, taxPct: 18, effectiveTotal: 17699 }
    }
  },
  {
    id: 'DIAMOND',
    name: 'Diamond Elite / VIP',
    tagline: 'VIP 0DTE Gamma Sniper, multi-leg spreads & direct desk access',
    badge: 'MAX ALPHA',
    isPopular: false,
    isActive: true,
    features: [
      'All Gold Pro Features Included',
      '0DTE Expiry Gamma Sniper & Hero-or-Zero Radar',
      'Multi-Leg Spread Builder (Bull Put, Bear Call, Condors)',
      'VIP Priority WebSocket Streaming Pipeline',
      'Dedicated Trading Desk Concierge & Support',
      'Early Beta Access to AI Macro Forecasting Models'
    ],
    entitlements: ['BASIC_TRACKING', 'COMMUNITY_ACCESS', 'CPR_CHECKLIST', 'LIVE_FEEDS', 'CONFLUENCE_MATRIX', 'SURGE_ALERTS', 'TELEGRAM_ALERTS', 'ALPHA_SIGNALS', 'WHATSAPP_SMS_ALERTS', 'BASKET_ORDERING', 'GREEKS_HEATMAP', 'GAMMA_SNIPER', 'MULTI_LEG_SPREADS', 'VIP_CONCIERGE'],
    pricing: {
      MONTHLY: { price: 3999, discountPct: 0, taxPct: 18, effectiveTotal: 4719 },
      QUARTERLY: { price: 9999, discountPct: 16, taxPct: 18, effectiveTotal: 11799 },
      ANNUAL: { price: 29999, discountPct: 38, taxPct: 18, effectiveTotal: 35399 }
    }
  }
];

class SubscriptionPlanService {
  private dataPath: string;
  private plans: Map<string, SubscriptionPlanConfig> = new Map();

  constructor() {
    this.dataPath = getDataPath();
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const raw = fs.readFileSync(this.dataPath, 'utf-8');
        const parsed: SubscriptionPlanConfig[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.plans.clear();
          parsed.forEach(p => this.plans.set(p.id, p));
          console.log(`[SubscriptionPlanService] Loaded ${this.plans.size} dynamic plans from disk.`);
          return;
        }
      }
    } catch (err: any) {
      console.warn('[SubscriptionPlanService] Load error, falling back to defaults:', err.message);
    }

    // Seed defaults
    this.plans.clear();
    DEFAULT_PLANS.forEach(p => this.plans.set(p.id, p));
    this.save();
    console.log('[SubscriptionPlanService] Seeded default subscription plans.');
  }

  private save() {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(Array.from(this.plans.values()), null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[SubscriptionPlanService] Save error:', err.message);
    }
  }

  public getAllPlans(): SubscriptionPlanConfig[] {
    return Array.from(this.plans.values()).filter(p => p.isActive);
  }

  public getActivePlans(): SubscriptionPlanConfig[] {
    return this.getAllPlans();
  }

  public getAllPlansAdmin(): SubscriptionPlanConfig[] {
    return Array.from(this.plans.values());
  }

  public getPlanById(planId: string): SubscriptionPlanConfig | undefined {
    const normalized = planId.toUpperCase() as any;
    // Backwards compatibility mapping
    if (normalized === 'BASIC') return this.plans.get('SILVER');
    if (normalized === 'PRO') return this.plans.get('GOLD');
    if (normalized === 'PREMIUM') return this.plans.get('DIAMOND');
    return this.plans.get(normalized);
  }

  /** Calculate order pricing with base, discount, and GST */
  public calculateOrderTotal(planId: string, billingCycle: BillingCycle): {
    plan: SubscriptionPlanConfig;
    billingCycle: BillingCycle;
    basePrice: number;
    discountPct: number;
    discountAmount: number;
    taxableAmount: number;
    taxPct: number;
    taxAmount: number;
    totalAmount: number;
  } | null {
    const plan = this.getPlanById(planId);
    if (!plan) return null;

    const cyclePricing = plan.pricing[billingCycle === 'HALF_YEARLY' ? 'QUARTERLY' : billingCycle] || plan.pricing.MONTHLY;
    const basePrice = cyclePricing.price;
    const discountPct = cyclePricing.discountPct || 0;
    const discountAmount = Math.round((basePrice * discountPct) / 100);
    const taxableAmount = Math.max(0, basePrice - discountAmount);
    const taxPct = cyclePricing.taxPct || (basePrice > 0 ? 18 : 0);
    const taxAmount = Math.round((taxableAmount * taxPct) / 100);
    const totalAmount = taxableAmount + taxAmount;

    return {
      plan,
      billingCycle,
      basePrice,
      discountPct,
      discountAmount,
      taxableAmount,
      taxPct,
      taxAmount,
      totalAmount
    };
  }

  public updatePlan(planId: string, patch: Partial<SubscriptionPlanConfig>): SubscriptionPlanConfig | null {
    const plan = this.plans.get(planId.toUpperCase());
    if (!plan) return null;

    Object.assign(plan, patch);
    this.save();
    return plan;
  }
}

export const subscriptionPlanService = new SubscriptionPlanService();
