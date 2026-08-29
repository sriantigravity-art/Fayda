# System Architecture & Technical Specifications

This document outlines the software architecture, data pipelines, state management, and real-time streaming protocols of the **Live Options OI Surge Radar** terminal.

---

## 1. System Overview

```
                                +---------------------------+
                                |  External Data Providers  |
                                |  (Fyers v3 API & NSE)     |
                                +-------------+-------------+
                                              |
                                     HTTP Polling / Sockets
                                              |
                                              v
+-----------------------------------------------------------------------------------------+
|                                    BACKEND SERVER (Node.js)                             |
|                                                                                         |
|  +--------------------+    +--------------------+    +-------------------------------+  |
|  |   Fyers Service    |    |    NSE Service     |    |         News Service          |  |
|  |  (Token & Feed)    |    | (Official Fallback)|    | (Financial Wire & Flash News) |  |
|  +---------+----------+    +---------+----------+    +---------------+---------------+  |
|            |                         |                               |                  |
|            +------------+------------+                               |                  |
|                         |                                            |                  |
|                         v                                            |                  |
|          +------------------------------+                            |                  |
|          |       OIEngine Pipeline      |                            |                  |
|          |  - Snapshot Rolling Deltas   |                            |                  |
|          |  - GreekEngine (BS & IV)     |                            |                  |
|          |  - Buildup Classifier        |                            |                  |
|          |  - Multi-Factor Surge Scorer |                            |                  |
|          |  - Max Pain & Multi-PCR      |                            |                  |
|          |  - AI Dynamic Trade Setups   |                            |                  |
|          +--------------+---------------+                            |                  |
|                         |                                            |                  |
|                         +---------------------+----------------------+                  |
|                                               |                                         |
|                                               v                                         |
|                           +---------------------------------------+                     |
|                           |      WebSocket Server (/ws) :3001     |                     |
|                           |    (Broadcast diffs every 3s/15s)     |                     |
|                           +-------------------+-------------------+                     |
+-----------------------------------------------|-----------------------------------------+
                                                |
                                      Full-Duplex WebSocket
                                                |
+-----------------------------------------------|-----------------------------------------+
|                                               v                                         |
|                                    FRONTEND CLIENT (React 19)                           |
|                                                                                         |
|                       +-----------------------------------------------+                 |
|                       |            MarketContext (State Hub)          |                 |
|                       |   - Reconnection & Message Dispatcher         |                 |
|                       |   - Sound Manager Event Hooks                 |                 |
|                       |   - Target Hit & Stoploss Breach Watchers     |                 |
|                       +-----------------------+-----------------------+                 |
|                                               |                                         |
|        +---------------------+----------------+--------------------+                    |
|        |                     |                |                    |                    |
|        v                     v                v                    v                    |
|  +------------+       +------------+    +-----------+       +-------------+             |
|  | Option     |       | AI Trade   |    | Surge     |       | Web Audio   |             |
|  | Chain      |       | Guidance   |    | Radar     |       | Synthesizer |             |
|  | Heatmap    |       | Cards      |    | Feed      |       | Alerts      |             |
|  +------------+       +------------+    +-----------+       +-------------+             |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Backend Subsystems

### 2.1 OIEngine (`server/src/engine/oiEngine.ts`)
The OIEngine is the central processing orchestrator. For each tick:
1. Maintains a rolling historical buffer (`Map<IndexSymbol, HistoricalMinuteEntry[]>`) tracking strike-by-strike OI, LTP, and volumes over 1-minute and 5-minute rolling windows.
2. Evaluates the ATM strike based on spot price and symbol-specific strike steps.
3. Computes 1m and 5m rolling deltas ($\Delta OI_{1m}, \Delta OI_{5m}, \Delta LTP_{1m}$).
4. Invokes the `GreekEngine` to calculate Implied Volatility ($IV$) and hourly theta decay ($\Theta_{hr}$).
5. Calculates Put-Call Ratios across 4 tiers (Total, ATM, ATM±5, ATM±10).
6. Computes the Max Pain strike using the minimum total option buyer loss equation.
7. Executes the `BuildupClassifier` and `SurgeDetector` on every active strike.
8. Extracts the primary **Bullish CE Pick** and **Bearish PE Pick** with dynamic time-decay-adjusted entry, targets, and stoplosses.

### 2.2 GreekEngine (`server/src/engine/greekEngine.ts`)
1. Implements Abramowitz and Stegun's polynomial approximation of the standard normal cumulative distribution function with precision $\le 7.5 \times 10^{-8}$.
2. Utilizes a bounded **Bisection Algorithm** (22 iterations max) to solve exact Implied Volatility from live market LTPs.
3. Employs analytical partial derivatives for standard Black-Scholes formulas to obtain daily and hourly theta decay metrics.

### 2.3 SurgeDetector (`server/src/engine/surgeDetector.ts`)
Executes real-time multi-factor weighted scoring:
- $40\%$ OI Velocity multiple against baseline
- $20\%$ Volume multiple against baseline
- $20\%$ Premium change magnitude
- $10\%$ PCR change magnitude
- $10\%$ Proximity to At-The-Money (ATM)

### 2.4 Data Ingestion Services (`server/src/services/`)
- **`fyersService.ts`**: Communicates with Fyers v3 API (`/data-rest/v3/quotes` & `/data-rest/v3/optionchain`). Automatically stores and reuses access tokens in `fyersConfig.json` and performs HMAC-SHA256 authorization code exchange.
- **`nseService.ts`**: Fallback service managing session cookies, user-agents, and headers to fetch official NSE derivative option chains directly when Fyers is offline.
- **`newsService.ts`**: Connects to real-time market wires to stream breaking macroeconomic, corporate earnings, and regulatory news.

---

## 3. Frontend Architecture

### 3.1 State Management (`client/src/context/MarketContext.tsx`)
- Centralized React Context managing all WebSocket lifecycle events.
- Handles automated reconnection with backoff timers upon network disconnects.
- Features memoized state dispatches to ensure that only modified visual DOM elements re-render, sustaining 60 FPS performance during high-frequency volatility bursts.

### 3.2 Web Audio Alert Engine (`client/src/utils/audioAlert.ts`)
- Pure Web Audio API implementation that synthesizes waveforms in real-time.
- Creates zero network latency audio alerts without needing external audio asset downloads.
- Generates distinctive audio patterns:
  - **Extreme Alert**: Exponential frequency ramp (880 Hz $\rightarrow$ 1760 Hz).
  - **Strong Alert**: Dual sine wave chord (523.25 Hz & 659.25 Hz).
  - **Target Hit Fanfare**: Arpeggiated sequence (523.25 Hz $\rightarrow$ 659.25 Hz $\rightarrow$ 783.99 Hz $\rightarrow$ 1046.50 Hz).

---

## 4. Scalability & Resilience Patterns

1. **In-Memory Rolling Ring Buffers**: Historical delta comparisons operate in $O(1)$ memory without unbounded growth.
2. **Graceful Failover**: When the primary broker API encounters rate limits or token expiration, the engine automatically flags the connection status and allows one-click switching to official NSE feeds.
3. **Session Persistence**: Encrypted authentication configurations are stored locally on the server host, eliminating repetitive daily logins.
