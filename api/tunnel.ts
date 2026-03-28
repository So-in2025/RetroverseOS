import { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'stream';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  const allowedDomains = ['archive.org', 'raw.githubusercontent.com', 'cdn.jsdelivr.net', 'myrient.erista.me', 'github.com', 'wsrv.nl'];
  try {
    const parsedTarget = new URL(url.startsWith('//') ? 'https:' + url : (url.startsWith('http') ? url : 'https://' + url));
    if (!allowedDomains.some(domain => parsedTarget.hostname.endsWith(domain))) {
      console.warn(`[Tunnel] Blocked unauthorized domain: ${parsedTarget.hostname}`);
      return res.status(403).json({ error: 'Domain not allowed' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  let targetUrl = url;
  if (targetUrl.startsWith('//')) targetUrl = 'https:' + targetUrl;
  else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) targetUrl = 'https://' + targetUrl;

  const range = req.headers.range;
  console.log(`[Tunnel] Fetching: ${targetUrl} (Range: ${range || 'none'})`);

  const isArchive = targetUrl.includes('archive.org');
  const maxRetries = isArchive ? 3 : 2; // Reduced for serverless to avoid timeout
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // Vercel Pro timeout is 60s, Hobby is 10s.
    
    try {
      const fetchHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
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
        if (status === 404) return res.status(404).send('Target not found');
        if ([503, 429, 408, 500, 502, 504].includes(status)) {
          throw new Error(`Target returned ${status}`);
        }
        throw new Error(`Target returned ${status}`);
      }

      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      const contentRange = response.headers.get('content-range');
      const acceptRanges = response.headers.get('accept-ranges');
      
      if (contentType) res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (contentRange) res.setHeader('Content-Range', contentRange);
      if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      
      // COOP/COEP for the response itself
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

      if (!response.body) throw new Error('Response body is null');

      // @ts-ignore - response.body is a ReadableStream in Node 18+ fetch
      const reader = response.body.getReader();
      const stream = new Readable({
        async read() {
          try {
            const { done, value } = await reader.read();
            if (done) {
              this.push(null);
            } else {
              this.push(Buffer.from(value));
            }
          } catch (err) {
            this.destroy(err instanceof Error ? err : new Error(String(err)));
          }
        },
        destroy(err, callback) {
          reader.cancel().catch(() => {});
          callback(err);
        }
      });

      // Pipe to response
      stream.pipe(res);

      return new Promise((resolve, reject) => {
        res.on('finish', resolve);
        res.on('error', reject);
        stream.on('error', reject);
      });

    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;
      attempt++;
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      } else {
        break;
      }
    }
  }

  if (!res.writableEnded) {
    res.status(502).send(`Gateway Error: ${lastError?.message}`);
  }
}
