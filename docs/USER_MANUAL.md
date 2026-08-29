# Trader's Operational Manual & Playbook

Welcome to the **Live Options OI Surge Radar** User Playbook. This guide is designed to help option buyers and intraday momentum traders extract maximum actionable intelligence from the terminal during live market hours.

---

## 1. 10-Second Morning Setup Routine (09:00 AM IST)

The terminal is designed with persistent token caching, requiring only a fast 10-second authentication each morning:

```
[09:00 AM] -> Open Terminal (http://localhost:5173/)
            -> Click "Connect Fyers" in top bar
            -> Click "Open Fyers Login Page"
            -> Complete PIN / OTP login on Fyers
            -> Copy 'auth_code' from address bar
            -> Paste into box & click "Connect"
            -> Done! Stream active for the entire trading session.
```

---

## 2. Reading the Dashboard Layout

### 2.1 Top Navigation Bar
- **Symbol Switcher**: One-click switching between `NIFTY`, `BANKNIFTY`, `FINNIFTY`, `MIDCPNIFTY`, and heavyweights (`RELIANCE`, `HDFCBANK`, `ICICIBANK`, etc.).
- **Live Spot Ticker**: Displays live spot price, net change, and percentage shift.
- **Data Source Indicator**: Shows active connection (`FYERS_LIVE` or `NSE_LIVE`).
- **Mute / Audio Toggle**: Allows toggling synthesized sound alerts on or off.

---

### 2.2 Interactive Option Chain Heatmap (Left Column)
The heatmap displays strikes arranged symmetrically around the **At-The-Money (ATM)** strike:

| Column | Meaning | Pro Tip |
| :--- | :--- | :--- |
| **Call Total OI** | Cumulative Call contracts | High Call OI acts as a **Resistance Ceiling**. |
| **Call 1m / 5m Δ** | Net OI change in the last 1 & 5 minutes | Rapid positive $\Delta$ indicates aggressive writing or buying. |
| **Call Theta/Hr** | Hourly time decay in ₹ | Avoid holding long options if Theta/Hr $> ₹10/hr$ near expiry. |
| **Call IV%** | Strike Implied Volatility | Highlighted green if cheap ($<12.5\%$), red if expensive ($>18\%$). |
| **Strike Price** | Strike level | Marked with a gold badge at the ATM strike. |
| **Put IV% & Theta** | Put volatility and decay | Symmetrical Put Greeks for immediate comparison. |
| **Put 1m / 5m Δ** | Net Put OI change | Rapid positive $\Delta$ indicates **Support Floor** formation. |
| **Put Total OI** | Cumulative Put contracts | High Put OI acts as institutional support. |

---

### 2.3 AI Trade Guidance Cards (Right Column)

The AI engine continuously extracts the highest-conviction setup for both directions:

#### 🟢 Bullish Momentum Pick (CE)
- **Recommended Strike**: Near-the-money Call option experiencing sustained Long Buildup or Short Covering.
- **Entry Zone**: Price range where institutional risk-to-reward is optimal.
- **Target 1**: Calculated taking session time-of-day decay into account.
- **Stoploss**: Strict threshold. If breached, the terminal sounds an emergency reversal alarm.

#### 🔴 Bearish Breakdown Pick (PE)
- **Recommended Strike**: Near-the-money Put option supported by heavy Call writing and Put buying.
- **Entry Zone & Targets**: Automatically calculated with dynamic Risk:Reward $\ge 1:1.6$.

---

## 3. Interpreting Institutional Radar Signals

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SURGE RADAR SIGNAL GUIDE                               │
├────────────────────────────────┬───────────────────────────────────────────────────────┤
│ 🟢 LONG BUILDUP (+OI, +Price)  │ Institutional buyers aggressively absorbing ask orders.│
│                                │ 👉 Action: Look for Call buying breakout entries.     │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ 🔴 SHORT BUILDUP (+OI, -Price) │ Heavy institutional writing establishing resistance.  │
│                                │ 👉 Action: Look for Put buying or exit long positions.│
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ ⚡ SHORT COVERING (-OI, +Price)│ Trapped option sellers forced to square off at market. │
│                                │ 👉 Action: Fast scalp with trailing stoploss.         │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ ⚠️ LONG UNWINDING (-OI, -Price)│ Long holders liquidating and taking profits.           │
│                                │ 👉 Action: Caution; momentum is fading.               │
└────────────────────────────────┴───────────────────────────────────────────────────────┘
```

---

## 4. Flash Alerts & Notification Types

1. **Strobe Extreme Surge Banner**: Appears at the very top of the screen when an institutional block order ($>5\times$ baseline velocity) is detected. Accompanied by a high-frequency siren.
2. **Target Hit Celebration**: When a recommended pick's Last Traded Price (LTP) touches or exceeds Target 1, a celebration popup with confetti appears, and an arpeggio chime sounds.
3. **Emergency Square-Off Alert**: If market dynamics abruptly reverse and breach the calculated stoploss, a red alert banner urges immediate position review.
4. **Flash News Accordion**: High-priority macroeconomic developments are highlighted with direct sentiment tagging (Bullish / Bearish / Neutral).

---

## 5. Risk Management Commandments for Option Buyers

1. **Never trade against ATM PCR Extremes**: If ATM PCR is $< 0.70$, avoid buying Calls. If ATM PCR is $> 1.40$, avoid buying Puts.
2. **Watch Theta Decay After 02:00 PM**: On weekly expiry days, Theta/hour accelerates non-linearly. Scalp quick targets and avoid holding through consolidations.
3. **Confirm Volume with OI**: Only trade surges that have an institutional surge score $\ge 60$.
