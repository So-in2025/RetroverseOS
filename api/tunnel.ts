export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const urlObj = new URL(req.url);
  const url = urlObj.searchParams.get('url');
  
  if (!url || typeof url !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  const allowedDomains = [
    'archive.org',
    'githubusercontent.com',
    'raw.githubusercontent.com',
    'github.com',
    'libretro.com',
    'libretro.org',
    'cdn.libretro.com',
    'jsdelivr.net',
    'cdn.jsdelivr.net',
    'bing.net',
    'bing.com',
    'wsrv.nl',
    'weserv.nl',
    'googleusercontent.com'
  ];
  try {
    const parsedTarget = new URL(url.startsWith('//') ? 'https:' + url : (url.startsWith('http') ? url : 'https://' + url));
    if (!allowedDomains.some(domain => parsedTarget.hostname.endsWith(domain))) {
      console.warn(`[Tunnel] Blocked unauthorized domain: ${parsedTarget.hostname}`);
      return new Response(JSON.stringify({ error: 'Domain not allowed' }), { 
        status: 403, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  let targetUrl = url;
  if (targetUrl.startsWith('//')) targetUrl = 'https:' + targetUrl;
  else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) targetUrl = 'https://' + targetUrl;

  const range = req.headers.get('range');
  console.log(`[Tunnel] Fetching: ${targetUrl} (Range: ${range || 'none'})`);

  const isArchive = targetUrl.includes('archive.org');
  const maxRetries = isArchive ? 3 : 2;
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); 
    
    try {
      const fetchHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      };

      if (isArchive) {
        fetchHeaders['Referer'] = 'https://archive.org/';
      }

      if (range) {
        fetchHeaders['Range'] = range;
      }

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: fetchHeaders,
        redirect: 'follow'
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const status = response.status;
        if (status === 404) return new Response('Target not found', { status: 404 });
        
        // Handle 403 specifically: Archive.org might be rate-limiting
        if (status === 403) {
           throw new Error('Forbidden (403)');
        }

        if ([503, 429, 408, 500, 502, 504].includes(status)) {
          throw new Error(`Target returned ${status}`);
        }
        throw new Error(`Target returned ${status}`);
      }

      // Create new headers for the response
      const responseHeaders = new Headers(response.headers);
      
      // Ensure CORS and CORP headers are set for COEP compatibility
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      responseHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
      
      // Remove COOP/COEP from image/binary responses as they are only for documents
      responseHeaders.delete('Cross-Origin-Embedder-Policy');
      responseHeaders.delete('Cross-Origin-Opener-Policy');

      // Return the response directly. The Edge runtime handles streaming automatically.
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;
      attempt++;
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`[Tunnel] Retrying in ${delay}ms... (Attempt ${attempt})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        break;
      }
    }
  }

  return new Response(`Gateway Error: ${lastError?.message}`, { status: 502 });
}
