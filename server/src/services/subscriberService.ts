/**
 * SubscriberService
 * Server-side subscriber/user registry with bcrypt passwords and JWT sessions.
 * Persists to server/data/subscribers.json
 */
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  Subscriber,
  SubscriberPublic,
  SubscriberRole,
  SubscriptionPlan,
  AuthToken
} from '../types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-use-env-var';
const JWT_EXPIRES = '30d';
const BCRYPT_ROUNDS = 10;

function getDataPath(): string {
  const base = process.cwd().endsWith('server') ? process.cwd() : path.join(process.cwd(), 'server');
  const dir = path.join(base, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'subscribers.json');
}

function getIST(): string {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + 3600000 * 5.5).toISOString();
}

class SubscriberService {
  private dataPath: string;
  private subscribers: Map<string, Subscriber> = new Map(); // id → subscriber

  constructor() {
    this.dataPath = getDataPath();
    this.load();
    this.seed();
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  private load() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const list: Subscriber[] = JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'));
        if (Array.isArray(list)) {
          this.subscribers.clear();
          list.forEach(s => this.subscribers.set(s.id, s));
          console.log(`[SubscriberService] Loaded ${this.subscribers.size} subscriber(s).`);
        }
      }
    } catch (err: any) {
      console.warn('[SubscriberService] Load error:', err.message);
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(Array.from(this.subscribers.values()), null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[SubscriberService] Save error:', err.message);
    }
  }

  /** Seed the SuperAdmin account if no subscribers exist */
  private seed() {
    if (this.subscribers.size > 0) return;
    const initPassword = process.env.SUPERADMIN_INIT_PASSWORD || 'ChangeMe@FirstLogin';
    const passwordHash = bcrypt.hashSync(initPassword, BCRYPT_ROUNDS);
    const superAdmin: Subscriber = {
      id: 'ADM-SRIKANT-007',
      fullName: 'Srikant SR',
      email: 'srikantsr@vertexinfo.co.in',
      mobile: '+919876500700',
      passwordHash,
      role: 'SUPERADMIN',
      plan: 'PREMIUM',
      isActive: true,
      isVerified: true,
      emailOptIn: true,
      whatsappOptIn: true,
      smsOptIn: true,
      createdAt: getIST(),
      notes: 'SuperAdmin master account'
    };
    this.subscribers.set(superAdmin.id, superAdmin);
    // Seed a few sample subscribers
    const samples: Partial<Subscriber>[] = [
      { fullName: 'Arjun Mehta', email: 'arjun.mehta@gmail.com', mobile: '+919876543210', plan: 'PRO', role: 'USER', emailOptIn: true, whatsappOptIn: true, smsOptIn: false },
      { fullName: 'Priya Sharma', email: 'priya.sharma@yahoo.com', mobile: '+919876543211', plan: 'BASIC', role: 'USER', emailOptIn: true, whatsappOptIn: false, smsOptIn: true },
      { fullName: 'Rajesh Gupta', email: 'rajesh.gupta@gmail.com', mobile: '+919876543212', plan: 'FREE', role: 'USER', emailOptIn: false, whatsappOptIn: true, smsOptIn: false },
      { fullName: 'Nisha Patel', email: 'nisha.patel@gmail.com', mobile: '+919876543213', plan: 'PREMIUM', role: 'USER', emailOptIn: true, whatsappOptIn: true, smsOptIn: true },
    ];
    samples.forEach((s, i) => {
      const id = `USR-2026-00${i + 1}`;
      this.subscribers.set(id, {
        id,
        fullName: s.fullName!,
        email: s.email!,
        mobile: s.mobile!,
        passwordHash: bcrypt.hashSync('Trader@123', BCRYPT_ROUNDS),
        role: s.role ?? 'USER',
        plan: s.plan ?? 'FREE',
        isActive: true,
        isVerified: true,
        emailOptIn: s.emailOptIn ?? true,
        whatsappOptIn: s.whatsappOptIn ?? true,
        smsOptIn: s.smsOptIn ?? false,
        createdAt: getIST(),
        notes: s.plan === 'FREE' ? 'Free tier user' : undefined
      });
    });
    this.save();
    console.log('[SubscriberService] Seeded SuperAdmin + sample subscribers.');
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────

  public async register(data: {
    fullName: string;
    email: string;
    mobile: string;
    password: string;
    plan?: SubscriptionPlan;
  }): Promise<{ success: boolean; token?: string; subscriber?: SubscriberPublic; error?: string }> {
    const email = data.email.trim().toLowerCase();
    const mobile = data.mobile.replace(/\s/g, '');

    // Check duplicate
    for (const s of this.subscribers.values()) {
      if (s.email === email) return { success: false, error: 'This email is already registered. Please sign in.' };
      if (s.mobile === mobile) return { success: false, error: 'This mobile number is already registered.' };
    }

    const idNum = String(this.subscribers.size + 1).padStart(3, '0');
    const id = `USR-2026-${idNum}`;
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const subscriber: Subscriber = {
      id,
      fullName: data.fullName.trim(),
      email,
      mobile,
      passwordHash,
      role: 'USER',
      plan: data.plan ?? 'FREE',
      isActive: true,
      isVerified: false,
      emailOptIn: true,
      whatsappOptIn: true,
      smsOptIn: false,
      createdAt: getIST()
    };

    this.subscribers.set(id, subscriber);
    this.save();

    const token = this.issueToken(subscriber);
    const { passwordHash: _, ...pub } = subscriber;
    return { success: true, token, subscriber: pub };
  }

  public async login(emailOrMobile: string, password: string): Promise<{
    success: boolean;
    token?: string;
    subscriber?: SubscriberPublic;
    error?: string;
  }> {
    const cleaned = emailOrMobile.trim().toLowerCase();
    const mobileClean = emailOrMobile.replace(/\s/g, '');

    let found: Subscriber | undefined;
    for (const s of this.subscribers.values()) {
      if (s.email === cleaned || s.mobile === mobileClean || s.mobile === `+91${mobileClean}`) {
        found = s;
        break;
      }
    }

    if (!found) return { success: false, error: 'No account found with this email or mobile.' };
    if (!found.isActive) return { success: false, error: 'Your account has been deactivated. Please contact support.' };

    const hashMatch = await bcrypt.compare(password, found.passwordHash);
    if (!hashMatch) return { success: false, error: 'Incorrect password. Please try again.' };

    // Update lastLoginAt
    found.lastLoginAt = getIST();
    this.save();

    const token = this.issueToken(found);
    const { passwordHash: _, ...pub } = found;
    return { success: true, token, subscriber: pub };
  }

  public verifyToken(token: string): AuthToken | null {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthToken;
    } catch {
      return null;
    }
  }

  private issueToken(sub: Subscriber): string {
    const payload: AuthToken = { subscriberId: sub.id, role: sub.role, email: sub.email };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  public getAll(): SubscriberPublic[] {
    return Array.from(this.subscribers.values())
      .map(({ passwordHash: _, ...pub }) => pub)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getById(id: string): SubscriberPublic | null {
    const s = this.subscribers.get(id);
    if (!s) return null;
    const { passwordHash: _, ...pub } = s;
    return pub;
  }

  public update(id: string, patch: Partial<Omit<Subscriber, 'id' | 'passwordHash' | 'createdAt'>>): SubscriberPublic | null {
    const s = this.subscribers.get(id);
    if (!s) return null;
    Object.assign(s, patch);
    this.save();
    const { passwordHash: _, ...pub } = s;
    return pub;
  }

  public async resetPassword(id: string, newPassword: string): Promise<boolean> {
    const s = this.subscribers.get(id);
    if (!s) return false;
    s.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    this.save();
    return true;
  }

  public delete(id: string): boolean {
    if (id === 'ADM-SRIKANT-007') return false; // Protect SuperAdmin
    const existed = this.subscribers.delete(id);
    if (existed) this.save();
    return existed;
  }

  /** Get subscribers filtered by opt-in for a channel */
  public getOptedIn(channel: 'EMAIL' | 'WHATSAPP' | 'SMS', planFilter?: SubscriptionPlan[]): SubscriberPublic[] {
    return Array.from(this.subscribers.values())
      .filter(s => {
        if (!s.isActive) return false;
        if (planFilter && planFilter.length > 0 && !planFilter.includes(s.plan)) return false;
        if (channel === 'EMAIL') return s.emailOptIn;
        if (channel === 'WHATSAPP') return s.whatsappOptIn;
        if (channel === 'SMS') return s.smsOptIn;
        return true;
      })
      .map(({ passwordHash: _, ...pub }) => pub);
  }

  public getStats() {
    const all = Array.from(this.subscribers.values());
    return {
      total: all.length,
      active: all.filter(s => s.isActive).length,
      byPlan: {
        FREE: all.filter(s => s.plan === 'FREE').length,
        BASIC: all.filter(s => s.plan === 'BASIC').length,
        PRO: all.filter(s => s.plan === 'PRO').length,
        PREMIUM: all.filter(s => s.plan === 'PREMIUM').length,
      },
      optIns: {
        email: all.filter(s => s.emailOptIn && s.isActive).length,
        whatsapp: all.filter(s => s.whatsappOptIn && s.isActive).length,
        sms: all.filter(s => s.smsOptIn && s.isActive).length,
      }
    };
  }
}

export const subscriberService = new SubscriberService();
