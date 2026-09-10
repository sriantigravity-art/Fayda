/**
 * SubscriptionHistoryService
 * Immutable audit logs and transaction history for all subscription lifecycle events.
 * Persists to server/data/subscription_history.json
 */
import fs from 'fs';
import path from 'path';
import { SubscriptionHistoryItem, SubscriptionRecord } from '../types.js';

function getDataPath(): string {
  const base = process.cwd().endsWith('server') ? process.cwd() : path.join(process.cwd(), 'server');
  const dir = path.join(base, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'subscription_history.json');
}

function getIST(): string {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + 3600000 * 5.5).toISOString();
}

class SubscriptionHistoryService {
  private dataPath: string;
  private history: SubscriptionHistoryItem[] = [];

  constructor() {
    this.dataPath = getDataPath();
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const raw = fs.readFileSync(this.dataPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.history = parsed;
          console.log(`[SubscriptionHistoryService] Loaded ${this.history.length} history records.`);
          return;
        }
      }
    } catch (err: any) {
      console.warn('[SubscriptionHistoryService] Load error:', err.message);
    }
    this.history = [];
    this.save();
  }

  private save() {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.history, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[SubscriptionHistoryService] Save error:', err.message);
    }
  }

  public recordEvent(event: Omit<SubscriptionHistoryItem, 'id' | 'timestamp'>): SubscriptionHistoryItem {
    const item: SubscriptionHistoryItem = {
      id: `HIST-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: getIST(),
      ...event
    };
    this.history.unshift(item); // Most recent first
    this.save();
    return item;
  }

  public record(event: Omit<SubscriptionHistoryItem, 'id' | 'timestamp'>): SubscriptionHistoryItem {
    return this.recordEvent(event);
  }

  public getBySubscriberId(subscriberId: string): SubscriptionHistoryItem[] {
    return this.history.filter(h => h.subscriberId === subscriberId || h.userId === subscriberId);
  }

  public getAll(limit = 100): SubscriptionHistoryItem[] {
    return this.history.slice(0, limit);
  }
}

export const subscriptionHistoryService = new SubscriptionHistoryService();
