import https from 'https';
import util from '@/lib/util.ts';

export async function refreshToken(oldToken: string): Promise<string> {
  const uuid = util.uuid(false);
  const device_id = util.uuid(false);

  const targetUrl = new URL('https://hailuoai.com/v1/api/user/renewal');
  targetUrl.searchParams.append('device_platform', 'web');
  targetUrl.searchParams.append('app_id', '3001');
  targetUrl.searchParams.append('uuid', uuid);
  targetUrl.searchParams.append('device_id', device_id);
  targetUrl.searchParams.append('version_code', '22200');
  targetUrl.searchParams.append('os_name', 'Windows');
  targetUrl.searchParams.append('browser_name', 'chrome');
  targetUrl.searchParams.append('server_version', '101');
  targetUrl.searchParams.append('device_memory', '8');
  targetUrl.searchParams.append('cpu_core_num', '12');
  targetUrl.searchParams.append('browser_language', 'en');
  targetUrl.searchParams.append('browser_platform', 'Win32');
  targetUrl.searchParams.append('screen_width', '1536');
  targetUrl.searchParams.append('screen_height', '864');
  targetUrl.searchParams.append('unix', Date.now().toString());

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Token': oldToken,
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
      'Accept-Encoding': 'gzip, deflate, br'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(targetUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const responseJson = JSON.parse(data);
          resolve(responseJson.data.token);
        } catch (e) {
          console.log('Error parsing response:', e);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.log('Error refreshing token:', error);
      reject(error);
    });

    // 添加超时处理
    req.setTimeout(10000, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}
