async function testNse() {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    try {
        console.log('1. Hitting home page...');
        const homeRes = await fetch('https://www.nseindia.com', {
            headers: {
                'User-Agent': userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });
        const setCookie = homeRes.headers.get('set-cookie');
        console.log('Set Cookie from home:', setCookie ? setCookie.substring(0, 100) + '...' : 'none');
        let cookies = '';
        if (setCookie) {
            cookies = setCookie.split(/,(?=[^;]+;)/).map(c => c.split(';')[0].trim()).join('; ');
        }
        console.log('2. Hitting option chain page...');
        const optRes = await fetch('https://www.nseindia.com/option-chain', {
            headers: {
                'User-Agent': userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.nseindia.com',
                'Cookie': cookies
            }
        });
        const optCookie = optRes.headers.get('set-cookie');
        if (optCookie) {
            const parsed = optCookie.split(/,(?=[^;]+;)/).map(c => c.split(';')[0].trim()).join('; ');
            cookies = cookies ? `${cookies}; ${parsed}` : parsed;
        }
        console.log('3. Fetching NIFTY option chain JSON...');
        const apiRes = await fetch('https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY', {
            headers: {
                'User-Agent': userAgent,
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.nseindia.com/option-chain',
                'Cookie': cookies
            }
        });
        console.log('API Status:', apiRes.status);
        if (apiRes.ok) {
            const data = await apiRes.json();
            console.log('NIFTY Expiry Dates from NSE:', data.records?.expiryDates?.slice(0, 8));
            console.log('Underlying Value:', data.records?.underlyingValue);
            console.log('Timestamp:', data.records?.timestamp);
        }
        else {
            const text = await apiRes.text();
            console.log('Error text:', text.substring(0, 200));
        }
    }
    catch (err) {
        console.error('Error in test:', err);
    }
}
testNse();
export {};
