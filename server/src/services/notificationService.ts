/**
 * NotificationService
 * Handles multi-channel broadcast of professional trade action messages.
 * Channels: Email (SMTP), SMS (Twilio), WhatsApp (Meta Cloud API), Instagram (URL compose)
 */
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { NotificationConfig, BroadcastPayload, AdminTradeAction, JournalTradeCall } from '../types.js';

const CONFIG_PATH = path.resolve(
  process.cwd().endsWith('server') ? process.cwd() : path.join(process.cwd(), 'server'),
  'notificationConfig.json'
);

// ── Message Template Engine ──────────────────────────────────────────────────

interface MessageContext {
  action: AdminTradeAction;
  signal: Partial<JournalTradeCall>;
  exitPrice?: number;
  adminNotes?: string;
}

function getIST(): string {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  return ist.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }) + ' IST';
}

export function composeMessage(ctx: MessageContext): { subject: string; body: string; htmlBody: string } {
  const { action, signal, exitPrice, adminNotes } = ctx;
  const contract = signal.contractName || `${signal.symbol} ${signal.optionType}`;
  const entryPrice = signal.entryPrice?.toFixed(2) ?? '—';
  const exitStr = exitPrice ? `₹${exitPrice.toFixed(2)}` : (signal.currentLtp ? `₹${signal.currentLtp.toFixed(2)}` : '—');
  const pnl = exitPrice && signal.entryPrice ? (exitPrice - signal.entryPrice).toFixed(2) : '—';
  const pnlPct = exitPrice && signal.entryPrice
    ? (((exitPrice - signal.entryPrice) / signal.entryPrice) * 100).toFixed(1)
    : '—';
  const isProfit = exitPrice && signal.entryPrice ? exitPrice > signal.entryPrice : null;
  const time = getIST();

  const brandHeader = '📊 *FAYDA PRO — Trade Advisory*';
  const disclaimer = '\n\n⚠️ *Disclaimer:* This is an educational trade advisory only. Not SEBI registered investment advice. Trade at your own risk. Past performance does not guarantee future results.';

  let subject = '';
  let body = '';

  switch (action) {
    case 'BOOK_PROFIT':
      subject = `✅ TARGET HIT — ${contract} | Book Full Profit Now`;
      body = `${brandHeader}\n\n✅ *BOOK FULL PROFIT — TARGET ACHIEVED*\n\nContract: *${contract}*\nEntry Price: ₹${entryPrice}\nExit Price: *${exitStr}*\nP&L: *${isProfit ? '+' : ''}₹${pnl} (${isProfit ? '+' : ''}${pnlPct}%)*\nTime: ${time}\n\n📌 *Action:* EXIT FULL POSITION — Congratulations! Target has been achieved. Book all profits immediately.\n\nTarget 1: ₹${signal.target1Price?.toFixed(2) ?? '—'} ✅\n${signal.target2Price ? `Target 2: ₹${signal.target2Price.toFixed(2)}\n` : ''}Stoploss was: ₹${signal.stoplossPrice?.toFixed(2) ?? '—'}${adminNotes ? `\n\n📝 *Note:* ${adminNotes}` : ''}${disclaimer}`;
      break;

    case 'BOOK_PARTIAL_PROFIT':
      subject = `💰 PARTIAL PROFIT — ${contract} | Book 50% Now, Hold Rest`;
      body = `${brandHeader}\n\n💰 *BOOK PARTIAL PROFIT (50%)*\n\nContract: *${contract}*\nEntry Price: ₹${entryPrice}\nCurrent Price: *${exitStr}*\nPartial P&L: *${isProfit ? '+' : ''}₹${pnl} per lot (${isProfit ? '+' : ''}${pnlPct}%)*\nTime: ${time}\n\n📌 *Action:* EXIT 50% OF POSITION NOW. Move stoploss to cost price (₹${entryPrice}) for remaining 50%.\n\nRemaining target: ₹${signal.target2Price?.toFixed(2) ?? signal.target1Price?.toFixed(2) ?? '—'}${adminNotes ? `\n\n📝 *Note:* ${adminNotes}` : ''}${disclaimer}`;
      break;

    case 'BOOK_LOSS':
      subject = `🛑 STOP LOSS HIT — ${contract} | Exit Full Position`;
      body = `${brandHeader}\n\n🛑 *STOP LOSS — EXIT FULL POSITION*\n\nContract: *${contract}*\nEntry Price: ₹${entryPrice}\nExit Price: *${exitStr}*\nLoss: *₹${pnl} (${pnlPct}%)*\nTime: ${time}\n\n📌 *Action:* EXIT ALL — Stoploss has been triggered. Do not average down. Preserve capital for the next setup.\n\nStoploss level: ₹${signal.stoplossPrice?.toFixed(2) ?? '—'}${adminNotes ? `\n\n📝 *Note:* ${adminNotes}` : ''}${disclaimer}`;
      break;

    case 'BTST':
      subject = `🌙 BTST ADVISORY — ${contract} | Hold Overnight`;
      body = `${brandHeader}\n\n🌙 *BTST — BUY TODAY SELL TOMORROW*\n\nContract: *${contract}*\nEntry Price: ₹${entryPrice}\nCurrent Price: *${exitStr}*\nTime: ${time}\n\n📌 *Action:* HOLD OVERNIGHT — Do NOT exit today. This trade is being carried to the next session based on strong momentum. Exit tomorrow at market open or as advised.\n\n📊 Current P&L: *${isProfit === true ? '+' : isProfit === false ? '' : ''}${pnl !== '—' ? `₹${pnl} (${pnlPct}%)` : 'Live'}}*\nStoploss: ₹${signal.stoplossPrice?.toFixed(2) ?? '—'}\nTarget: ₹${signal.target1Price?.toFixed(2) ?? '—'}${adminNotes ? `\n\n📝 *Advisory Note:* ${adminNotes}` : ''}${disclaimer}`;
      break;

    case 'CARRY_FORWARD':
      subject = `📅 POSITIONAL CARRY — ${contract} | Multi-Day Hold`;
      body = `${brandHeader}\n\n📅 *CARRY FORWARD — POSITIONAL HOLD*\n\nContract: *${contract}*\nEntry Price: ₹${entryPrice}\nCurrent Price: *${exitStr}*\nTime: ${time}\n\n📌 *Action:* CARRY FORWARD — This trade is being held as a positional setup. Do not panic exit on intraday noise. Review pre-market each session.\n\n📊 Current P&L: *${pnl !== '—' ? `₹${pnl} (${pnlPct}%)` : 'Live'}*\nFinal Target: ₹${signal.target2Price?.toFixed(2) ?? signal.target1Price?.toFixed(2) ?? '—'}\nHard Stoploss: ₹${signal.stoplossPrice?.toFixed(2) ?? '—'}${adminNotes ? `\n\n📝 *Advisory Note:* ${adminNotes}` : ''}${disclaimer}`;
      break;

    default:
      subject = `📊 Trade Update — ${contract}`;
      body = `${brandHeader}\n\nTrade Update for *${contract}*\nTime: ${time}${adminNotes ? `\n\n${adminNotes}` : ''}${disclaimer}`;
  }

  // Generate HTML version for email
  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f1117; color: #e2e8f0; margin: 0; padding: 0; }
  .wrapper { max-width: 560px; margin: 20px auto; background: #1a1d27; border-radius: 16px; overflow: hidden; border: 1px solid #2d3748; }
  .header { background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%); padding: 24px; text-align: center; border-bottom: 1px solid #2d3748; }
  .logo { font-size: 22px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px; }
  .tagline { font-size: 11px; color: #94a3b8; margin-top: 4px; letter-spacing: 2px; text-transform: uppercase; }
  .action-badge { display: inline-block; margin-top: 12px; padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 700; background: ${action === 'BOOK_PROFIT' ? '#16a34a' : action === 'BOOK_PARTIAL_PROFIT' ? '#d97706' : action === 'BOOK_LOSS' ? '#dc2626' : action === 'BTST' ? '#7c3aed' : '#0ea5e9'}; color: white; }
  .content { padding: 24px; }
  .contract { font-size: 20px; font-weight: 700; color: #f8fafc; margin-bottom: 16px; }
  .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .metric { background: #0f1117; border-radius: 10px; padding: 12px; border: 1px solid #2d3748; }
  .metric-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
  .metric-value { font-size: 18px; font-weight: 700; margin-top: 4px; color: #f8fafc; font-family: monospace; }
  .metric-value.profit { color: #4ade80; }
  .metric-value.loss { color: #f87171; }
  .action-box { background: ${action === 'BOOK_PROFIT' ? '#052e16' : action === 'BOOK_LOSS' ? '#2d0e0e' : action === 'BTST' ? '#1a0a3a' : '#0c1a2e'}; border: 1px solid ${action === 'BOOK_PROFIT' ? '#16a34a' : action === 'BOOK_LOSS' ? '#dc2626' : '#0ea5e9'}; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
  .action-title { font-size: 13px; font-weight: 700; color: ${action === 'BOOK_PROFIT' ? '#4ade80' : action === 'BOOK_LOSS' ? '#f87171' : '#38bdf8'}; margin-bottom: 8px; }
  .action-text { font-size: 13px; color: #cbd5e1; line-height: 1.6; }
  .note { background: #1e293b; border-left: 3px solid #f59e0b; padding: 12px; border-radius: 0 8px 8px 0; font-size: 12px; color: #fcd34d; margin-bottom: 16px; }
  .disclaimer { font-size: 10px; color: #475569; border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 8px; line-height: 1.6; }
  .footer { text-align: center; padding: 16px; background: #0f1117; font-size: 11px; color: #475569; }
</style></head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">📊 FAYDA PRO</div>
      <div class="tagline">Market Intelligence Terminal</div>
      <div class="action-badge">${action.replace('_', ' ')}</div>
    </div>
    <div class="content">
      <div class="contract">${contract}</div>
      <div class="metrics">
        <div class="metric"><div class="metric-label">Entry Price</div><div class="metric-value">₹${entryPrice}</div></div>
        <div class="metric"><div class="metric-label">Exit / Current</div><div class="metric-value ${isProfit === true ? 'profit' : isProfit === false ? 'loss' : ''}">${exitStr}</div></div>
        <div class="metric"><div class="metric-label">P&amp;L (Points)</div><div class="metric-value ${isProfit === true ? 'profit' : isProfit === false ? 'loss' : ''}">${pnl !== '—' ? `${isProfit ? '+' : ''}₹${pnl}` : '—'}</div></div>
        <div class="metric"><div class="metric-label">P&amp;L (%)</div><div class="metric-value ${isProfit === true ? 'profit' : isProfit === false ? 'loss' : ''}">${pnlPct !== '—' ? `${isProfit ? '+' : ''}${pnlPct}%` : '—'}</div></div>
      </div>
      <div class="action-box">
        <div class="action-title">📌 Required Action</div>
        <div class="action-text">${body.split('📌 *Action:* ')[1]?.split('\n')[0] ?? 'See message details.'}</div>
      </div>
      ${adminNotes ? `<div class="note">📝 ${adminNotes}</div>` : ''}
      <div class="disclaimer">⚠️ This is an educational trade advisory only. FAYDA PRO is not a SEBI registered investment advisor. This is NOT investment advice. All trading decisions are your own responsibility. Past performance is not indicative of future results.</div>
    </div>
    <div class="footer">FAYDA PRO Market OS &bull; ${time} &bull; Unsubscribe anytime</div>
  </div>
</body>
</html>`;

  return { subject, body, htmlBody };
}

// ── Notification Service Class ───────────────────────────────────────────────

class NotificationService {
  private config: NotificationConfig = {};

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        this.config = JSON.parse(raw);
      }
    } catch {
      this.config = {};
    }
  }

  public getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /** Save updated config (credentials stored server-side, never sent to client in full) */
  public saveConfig(partial: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...partial };
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[NotificationService] Config save error:', err.message);
    }
  }

  // ── Email via Nodemailer ────────────────────────────────────────────────────
  public async sendEmail(payload: BroadcastPayload, ctx: MessageContext): Promise<{ success: boolean; message: string }> {
    const smtp = this.config.smtp;
    const recipients = this.config.emailRecipients ?? [];
    if (!smtp?.host || !smtp.user || !smtp.pass) {
      return { success: false, message: 'SMTP not configured. Go to Admin → Notifications → Email Settings.' };
    }
    if (recipients.length === 0) {
      return { success: false, message: 'No email recipients configured.' };
    }

    try {
      const { subject, htmlBody, body } = composeMessage(ctx);
      const transport = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port || 587,
        secure: smtp.secure ?? false,
        auth: { user: smtp.user, pass: smtp.pass }
      });

      await transport.sendMail({
        from: `"${smtp.fromName || 'Fayda Pro'}" <${smtp.fromEmail || smtp.user}>`,
        to: recipients.join(','),
        subject: payload.subject || subject,
        text: payload.message || body,
        html: htmlBody
      });

      console.log(`[NotificationService] Email sent to ${recipients.length} recipient(s).`);
      return { success: true, message: `Email sent to ${recipients.length} recipient(s).` };
    } catch (err: any) {
      console.error('[NotificationService] Email error:', err.message);
      return { success: false, message: `Email failed: ${err.message}` };
    }
  }

  // ── SMS via Twilio ──────────────────────────────────────────────────────────
  public async sendSms(payload: BroadcastPayload, ctx: MessageContext): Promise<{ success: boolean; message: string }> {
    const twilio = this.config.twilio;
    if (!twilio?.accountSid || !twilio.authToken || !twilio.fromNumber) {
      return { success: false, message: 'Twilio SMS not configured.' };
    }
    if (!twilio.toNumbers || twilio.toNumbers.length === 0) {
      return { success: false, message: 'No SMS recipients configured.' };
    }

    try {
      const { body } = composeMessage(ctx);
      const textBody = (payload.message || body).replace(/\*/g, '').substring(0, 1600); // Strip markdown for SMS

      const auth = Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString('base64');
      const results: string[] = [];

      for (const toNum of twilio.toNumbers) {
        const formData = new URLSearchParams({
          From: twilio.fromNumber,
          To: toNum,
          Body: textBody
        });
        const resp = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
          }
        );
        const json: any = await resp.json();
        if (json.sid) {
          results.push(`✅ ${toNum}: ${json.sid}`);
        } else {
          results.push(`❌ ${toNum}: ${json.message || 'Failed'}`);
        }
      }

      console.log(`[NotificationService] SMS sent. Results:`, results);
      return { success: true, message: `SMS: ${results.join(', ')}` };
    } catch (err: any) {
      return { success: false, message: `SMS failed: ${err.message}` };
    }
  }

  // ── WhatsApp via Meta Cloud API ─────────────────────────────────────────────
  public async sendWhatsApp(payload: BroadcastPayload, ctx: MessageContext): Promise<{ success: boolean; message: string }> {
    const wa = this.config.whatsapp;
    if (!wa?.phoneNumberId || !wa.accessToken) {
      return { success: false, message: 'WhatsApp Cloud API not configured.' };
    }
    if (!wa.toNumbers || wa.toNumbers.length === 0) {
      return { success: false, message: 'No WhatsApp recipients configured.' };
    }

    try {
      const { body } = composeMessage(ctx);
      const msgBody = (payload.message || body).replace(/\*/g, '*'); // WhatsApp supports *bold*
      const results: string[] = [];

      for (const toNum of wa.toNumbers) {
        // Remove +, spaces, dashes from number
        const cleanNum = toNum.replace(/[^0-9]/g, '');
        const resp = await fetch(
          `https://graph.facebook.com/v20.0/${wa.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${wa.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: cleanNum,
              type: 'text',
              text: { body: msgBody }
            })
          }
        );
        const json: any = await resp.json();
        if (json.messages?.[0]?.id) {
          results.push(`✅ ${toNum}`);
        } else {
          results.push(`❌ ${toNum}: ${json.error?.message || 'Failed'}`);
        }
      }

      console.log(`[NotificationService] WhatsApp sent. Results:`, results);
      return { success: true, message: `WhatsApp: ${results.join(', ')}` };
    } catch (err: any) {
      return { success: false, message: `WhatsApp failed: ${err.message}` };
    }
  }

  /** Generate a wa.me URL for manual Instagram/WhatsApp copy-paste */
  public getWaMeUrl(number: string, message: string): string {
    const clean = number.replace(/[^0-9]/g, '');
    return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  }

  /** Broadcast to all configured channels */
  public async broadcast(
    payload: BroadcastPayload,
    signal: Partial<JournalTradeCall>
  ): Promise<Record<string, { success: boolean; message: string }>> {
    const ctx: MessageContext = {
      action: payload.actionType ?? 'BOOK_PROFIT',
      signal,
      exitPrice: signal.adminExitPrice,
      adminNotes: signal.adminNotes ?? payload.message
    };

    const results: Record<string, { success: boolean; message: string }> = {};

    for (const channel of payload.channels) {
      switch (channel) {
        case 'EMAIL':
          results.EMAIL = await this.sendEmail(payload, ctx);
          break;
        case 'SMS':
          results.SMS = await this.sendSms(payload, ctx);
          break;
        case 'WHATSAPP':
          results.WHATSAPP = await this.sendWhatsApp(payload, ctx);
          break;
        case 'INSTAGRAM':
          // Instagram doesn't support programmatic DMs — return the composed text
          results.INSTAGRAM = { success: true, message: 'Instagram message composed. Copy and post manually.' };
          break;
      }
    }

    return results;
  }
}

export const notificationService = new NotificationService();
