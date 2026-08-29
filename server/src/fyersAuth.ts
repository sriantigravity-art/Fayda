import crypto from 'crypto';

async function generateAccessToken() {
  const appId = 'KMSSMU5OGR-100';
  const secretKey = 'MVADUMZWBM';
  const authCode = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBfaWQiOiJLTVNTTVU1T0dSIiwidXVpZCI6Ijg3ZDVmM2I2NmYxZTRlN2Y4NDFjYjdlY2M2NDNhNDE2IiwiaXBBZGRyIjoiIiwibm9uY2UiOiIiLCJzY29wZSI6IiIsImRpc3BsYXlfbmFtZSI6IllTMDQwMzYiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiIyYTUwN2Q1ZDI5ZGU5MzIxNmU2M2Q0MjM4ZWQyZDQ3MTY1NDI2Yzc2NTMyOTlmM2E4NjdkMzQxZCIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImF1ZCI6IltcImQ6MVwiLFwiZDoyXCIsXCJ4OjBcIixcIng6MVwiXSIsImV4cCI6MTc4Nzg4NTE1MSwiaWF0IjoxNzg3ODU1MTUxLCJpc3MiOiJhcGkubG9naW4uZnllcnMuaW4iLCJuYmYiOjE3ODc4NTUxNTEsInN1YiI6ImF1dGhfY29kZSJ9.clnt_QjRg4f15mUYDm8ftOG5hfGLjr2eALoeMSK9ib0';

  // Calculate SHA-256 hash of appId:secretKey
  const hash = crypto.createHash('sha256').update(`${appId}:${secretKey}`).digest('hex');
  console.log('AppId Hash:', hash);

  const payload = {
    grant_type: 'authorization_code',
    appIdHash: hash,
    code: authCode
  };

  try {
    const response = await fetch('https://api-t1.fyers.in/api/v3/validate-authcode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const json = await response.json();
    console.log('Fyers Auth Response:', JSON.stringify(json, null, 2));

    if (json.s === 'ok' && json.access_token) {
      console.log('\nSUCCESS! ACCESS TOKEN GENERATED:');
      console.log(json.access_token);

      // Now test profile API with this token
      const profileRes = await fetch('https://api-t1.fyers.in/api/v3/profile', {
        headers: {
          'Authorization': `${appId}:${json.access_token}`
        }
      });
      const profileJson = await profileRes.json();
      console.log('Profile Response:', JSON.stringify(profileJson, null, 2));

      // Test Option Chain API
      const optRes = await fetch('https://api-t1.fyers.in/data/options-chain-v3?symbol=NSE:NIFTY50-INDEX&strikecount=10', {
        headers: {
          'Authorization': `${appId}:${json.access_token}`
        }
      });
      const optJson = await optRes.json();
      console.log('Fyers Option Chain Status:', optJson.s);
      if (optJson.data) {
        console.log('Underlying Value:', optJson.data.underlyingValue || optJson.data.spot_price);
        console.log('Strikes count:', optJson.data.optionsChain?.length);
      }
    }
  } catch (err) {
    console.error('Error generating access token:', err);
  }
}

generateAccessToken();
