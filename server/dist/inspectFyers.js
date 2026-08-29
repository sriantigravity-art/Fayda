"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function inspectFyersData() {
    const appId = 'KMSSMU5OGR-100';
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIiwieDoxIl0sImF0X2hhc2giOiJnQUFBQUFCcWtJTDFZWWhDOUNWanE0Sy1MZS1yZDJETGFmRmxGaHBWclNKWEhSRGZwaE0yd3k1aDBlbUJFeWZicnRpUXBQb0hzdW5UTDZDOWdERF9Hc3NIM053ZGlscENPU0VfanIwaEVGWHRmOEJ5SF8yNERBOD0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiIyYTUwN2Q1ZDI5ZGU5MzIxNmU2M2Q0MjM4ZWQyZDQ3MTY1NDI2Yzc2NTMyOTlmM2E4NjdkMzQxZCIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiWVMwNDAzNiIsImFwcFR5cGUiOjEwMCwiZXhwIjoxNzg3ODc3MDAwLCJpYXQiOjE3ODc4NTU2MDUsImlzcyI6ImFwaS5meWVycy5pbiIsIm5iZiI6MTc4Nzg1NTYwNSwic3ViIjoiYWNjZXNzX3Rva2VuIn0.HY7xaCwvy08Ecg3QuPyqhInOTXtDuRZ2LT8f4IDem04';
    const res = await fetch('https://api-t1.fyers.in/data/options-chain-v3?symbol=NSE:NIFTY50-INDEX&strikecount=5', {
        headers: {
            'Authorization': `${appId}:${token}`
        }
    });
    const json = await res.json();
    console.log('Keys in data:', Object.keys(json.data));
    console.log('Sample optionsChain items (first 2):');
    console.log(JSON.stringify(json.data.optionsChain.slice(0, 2), null, 2));
    console.log('ExpiryData:', json.data.expiryData);
    console.log('Spot price info:', json.data.spot_price, json.data.underlyingValue, json.data.index_price);
    // Also test quotes for spot
    const quoteRes = await fetch('https://api-t1.fyers.in/data/quotes/?symbols=NSE:NIFTY50-INDEX,NSE:NIFTYBANK-INDEX,NSE:FINNIFTY-INDEX,NSE:MIDCPNIFTY-INDEX', {
        headers: {
            'Authorization': `${appId}:${token}`
        }
    });
    const quoteJson = await quoteRes.json();
    console.log('Quotes Response:', JSON.stringify(quoteJson.d?.slice(0, 2), null, 2));
}
inspectFyersData();
