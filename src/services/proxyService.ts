export interface ProxyNode {
  url: string;
  isAlive: boolean;
  latency: number;
  lastTested: number;
  failCount: number;
}

const PUBLIC_PROXIES = [
  'https://api.allorigins.win/get?url=',
  'https://corsproxy.io/?',
  'https://proxy.cors.sh/',
  'https://thingproxy.freeboard.io/fetch/'
];

class ProxyService {
  private nodes: ProxyNode[] = [];

  constructor() {
    this.nodes = PUBLIC_PROXIES.map(url => ({
      url,
      isAlive: true,
      latency: 0,
      lastTested: 0,
      failCount: 0
    }));
  }

  async getBestProxy(): Promise<ProxyNode | null> {
    const alive = this.nodes.filter(n => n.isAlive && n.failCount < 5);
    if (alive.length === 0) return null;
    
    // Pick one with least fails or random
    return alive[Math.floor(Math.random() * alive.length)];
  }

  async markFailed(url: string) {
    const node = this.nodes.find(n => n.url === url);
    if (node) {
      node.failCount++;
      if (node.failCount >= 5) node.isAlive = false;
    }
  }

  async testAll() {
    for (const node of this.nodes) {
      const start = Date.now();
      try {
        const res = await fetch(node.url + encodeURIComponent('https://www.google.com'), { method: 'HEAD' });
        node.isAlive = res.ok;
        node.latency = Date.now() - start;
        node.lastTested = Date.now();
        if (res.ok) node.failCount = 0;
      } catch {
        node.isAlive = false;
        node.failCount++;
      }
    }
  }

  wrapUrl(targetUrl: string, proxy: ProxyNode): string {
    if (proxy.url.includes('allorigins')) {
      return `${proxy.url}${encodeURIComponent(targetUrl)}`;
    }
    return `${proxy.url}${targetUrl}`;
  }
}

export const proxyService = new ProxyService();
