# API & WebSocket Protocol Reference

This document provides a comprehensive technical reference for the REST endpoints and WebSocket protocols exposed by the **OI Radar Server** on port `3001`.

---

## 1. REST API Specification

### Base URL
```
http://localhost:3001/api
```

---

### 1.1 `GET /api/status`
Returns server operational health, active WebSocket client count, data source mode, market open status, and Fyers connection profile.

**Response (`200 OK`):**
```json
{
  "status": "ok",
  "activeConnections": 1,
  "dataSource": "FYERS_LIVE",
  "isMarketOpen": true,
  "fyers": {
    "appId": "KMSSMU5OGR-100",
    "isConnected": true,
    "userName": "YS04036"
  }
}
```

---

### 1.2 `GET /api/symbols`
Returns the list of all pre-configured benchmark indices and Nifty 50 underlying instruments.

**Response (`200 OK`):**
```json
[
  {
    "symbol": "NIFTY",
    "name": "Nifty 50 Index",
    "category": "INDEX",
    "step": 50,
    "lot": 75,
    "defaultRange": 200,
    "fyersSymbol": "NSE:NIFTY50-INDEX",
    "isIndex": true
  },
  {
    "symbol": "BANKNIFTY",
    "name": "Bank Nifty Index",
    "category": "INDEX",
    "step": 100,
    "lot": 30,
    "defaultRange": 500,
    "fyersSymbol": "NSE:NIFTYBANK-INDEX",
    "isIndex": true
  }
]
```

---

### 1.3 `POST /api/symbol/watch`
Instructs the server to actively poll and cache real-time option chain data for a designated symbol.

**Request Body:**
```json
{
  "symbol": "RELIANCE"
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "symbol": "RELIANCE",
  "state": { ... }
}
```

---

### 1.4 `GET /api/surges`
Returns the recent historical array of institutional surge events.

**Query Parameters:**
- `limit` *(optional, number, default: 50)*

**Response (`200 OK`):**
```json
[
  {
    "id": "surge-1724838000-nifty-24500-ce",
    "indexSymbol": "NIFTY",
    "strikePrice": 24500,
    "optionType": "CE",
    "surgeLevel": "EXTREME",
    "surgeScore": 88,
    "buildupType": "LONG_BUILDUP",
    "oiDelta": 345000,
    "oiDeltaPct": 42.5,
    "priceDelta": 18.4,
    "priceDeltaPct": 14.8,
    "ltp": 142.50,
    "volume": 680000,
    "timeFormatted": "10:15:22"
  }
]
```

---

### 1.5 `POST /api/datasource`
Switches the active real-time data provider between Fyers v3 API and official NSE pipelines.

**Request Body:**
```json
{
  "mode": "FYERS_LIVE" // or "NSE_LIVE"
}
```

---

### 1.6 `POST /api/fyers/connect`
Manually sets Fyers API App ID and Access Token.

**Request Body:**
```json
{
  "appId": "KMSSMU5OGR-100",
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "secretKey": "MVADUMZWBM"
}
```

---

### 1.7 `POST /api/fyers/exchange-authcode`
Exchanges the single-use OAuth2 `auth_code` retrieved during morning login for a full-day Access Token.

**Request Body:**
```json
{
  "appId": "KMSSMU5OGR-100",
  "secretKey": "MVADUMZWBM",
  "authCode": "eyJhbGciOiJIUzI1NiIsIn..."
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "userName": "YS04036",
  "message": "Connected successfully as YS04036"
}
```

---

### 1.8 `POST /api/expiry`
Switches the option chain expiry date for a selected symbol.

**Request Body:**
```json
{
  "symbol": "NIFTY",
  "expiry": "2026-09-03"
}
```

---

## 2. WebSocket Streaming Protocol

### Connection URL
```
ws://localhost:3001/ws
```

---

### 2.1 Server-to-Client Messages

#### `INITIAL_STATE`
Dispatched immediately when a client establishes a WebSocket connection.
```json
{
  "type": "INITIAL_STATE",
  "recentSurges": [ ... ],
  "recentNews": [ ... ],
  "dataSource": "FYERS_LIVE",
  "fyersConfig": {
    "appId": "KMSSMU5OGR-100",
    "isConnected": true,
    "userName": "YS04036"
  },
  "isMarketOpen": true,
  "allSymbolsConfig": [ ... ],
  "timestamp": "2026-08-28T10:00:00.000Z"
}
```

#### `INDEX_UPDATE`
Broadcast every 3 seconds (or 15s during NSE fallback) containing complete market snapshots.
```json
{
  "type": "INDEX_UPDATE",
  "symbol": "NIFTY",
  "indexState": {
    "symbol": "NIFTY",
    "spotPrice": 24538.20,
    "spotChange": 142.50,
    "spotPctChange": 0.58,
    "atmStrike": 24550,
    "expiryDate": "2026-09-03",
    "expiryDates": ["2026-09-03", "2026-09-10", "2026-09-24"],
    "pcr": {
      "totalPcr": 1.18,
      "atmPcr": 1.34,
      "atm5Pcr": 1.22,
      "atm10Pcr": 1.15,
      "sentiment": "BULLISH",
      "pcr1mChange": 0.04
    },
    "maxPain": {
      "strike": 24500,
      "distanceFromSpot": -38.20,
      "sentiment": "BULLISH"
    },
    "strikes": [
      {
        "strikePrice": 24550,
        "callOI": 3450000,
        "callOIChange1m": 45000,
        "callLtp": 148.50,
        "callVolume": 1250000,
        "callBuildup": "LONG_BUILDUP",
        "callTheta": -18.40,
        "callThetaPerHour": -2.88,
        "callIv": 13.8,
        "callIvStatus": "FAIR",
        "putOI": 4200000,
        "putOIChange1m": 85000,
        "putLtp": 112.20,
        "putVolume": 980000,
        "putBuildup": "SHORT_BUILDUP",
        "putTheta": -16.20,
        "putThetaPerHour": -2.53,
        "putIv": 14.1,
        "putIvStatus": "FAIR"
      }
    ],
    "recommendedTrades": {
      "bullishPick": {
        "symbol": "NIFTY 24550 CE",
        "strike": 24550,
        "type": "CE",
        "ltp": 148.50,
        "recommendedEntry": "₹148.50 - ₹151.45",
        "stoploss": "₹128.00 (-14%)",
        "target": "₹185.00 (+25%)",
        "riskReward": "1:1.8"
      },
      "bearishPick": {
        "symbol": "NIFTY 24500 PE",
        "strike": 24500,
        "type": "PE",
        "ltp": 95.00,
        "recommendedEntry": "₹95.00 - ₹96.90",
        "stoploss": "₹82.00 (-14%)",
        "target": "₹118.00 (+24%)",
        "riskReward": "1:1.7"
      }
    }
  },
  "newSurges": [ ... ],
  "dataSource": "FYERS_LIVE",
  "isMarketOpen": true,
  "timestamp": "2026-08-28T10:00:03.000Z"
}
```

#### `FLASH_NEWS`
Broadcast immediately when a high-impact news story or regulatory filing arrives.
```json
{
  "type": "FLASH_NEWS",
  "newsItem": {
    "id": "news-1724838020-1",
    "title": "RBI Keeps Repo Rate Unchanged at 6.50%; Stance Maintained",
    "source": "Reuters",
    "summary": "Reserve Bank of India Monetary Policy Committee votes 4-2 to keep benchmark rate unchanged.",
    "sentiment": "BULLISH",
    "category": "MACRO",
    "timestamp": "2026-08-28T10:00:20.000Z",
    "timeFormatted": "10:00 AM"
  }
}
```
