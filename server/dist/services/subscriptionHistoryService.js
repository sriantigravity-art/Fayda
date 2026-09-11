/**
 * SubscriptionHistoryService
 * Immutable audit logs and transaction history for all subscription lifecycle events.
 * Persists to server/data/subscription_history.json
 */
import fs from 'fs';
import path from 'path';
function getDataPath() {
    const base = process.cwd().endsWith('server') ? process.cwd() : path.join(process.cwd(), 'server');
    const dir = path.join(base, 'data');
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'subscription_history.json');
}
function getIST() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + 3600000 * 5.5).toISOString();
}
class SubscriptionHistoryService {
    dataPath;
    history = [];
    constructor() {
        this.dataPath = getDataPath();
        this.load();
    }
    load() {
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
        }
        catch (err) {
            console.warn('[SubscriptionHistoryService] Load error:', err.message);
        }
        this.history = [];
        this.save();
    }
    save() {
        try {
            fs.writeFileSync(this.dataPath, JSON.stringify(this.history, null, 2), 'utf-8');
        }
        catch (err) {
            console.warn('[SubscriptionHistoryService] Save error:', err.message);
        }
    }
    recordEvent(event) {
        const item = {
            id: `HIST-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
            timestamp: getIST(),
            ...event
        };
        this.history.unshift(item); // Most recent first
        this.save();
        return item;
    }
    record(event) {
        return this.recordEvent(event);
    }
    getBySubscriberId(subscriberId) {
        return this.history.filter(h => h.subscriberId === subscriberId || h.userId === subscriberId);
    }
    getAll(limit = 100) {
        return this.history.slice(0, limit);
    }
}
export const subscriptionHistoryService = new SubscriptionHistoryService();
