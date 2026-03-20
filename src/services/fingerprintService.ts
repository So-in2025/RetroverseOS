export interface Fingerprint {
  userAgent: string;
  screenResolution: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  platform: string;
  language: string;
  timezone: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.3; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15'
];

const PLATFORMS = ['Win32', 'MacIntel', 'Linux x86_64', 'iPhone', 'iPad'];
const LANGUAGES = ['en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'pt-BR'];
const TIMEZONES = ['America/New_York', 'Europe/London', 'Europe/Madrid', 'Asia/Tokyo', 'America/Los_Angeles'];

class FingerprintService {
  generateRandom(): Fingerprint {
    const resolutions = ['1920x1080', '1366x768', '1440x900', '1536x864', '2560x1440', '390x844'];
    const memories = [4, 8, 16, 32];
    const cores = [2, 4, 8, 12, 16];

    return {
      userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      screenResolution: resolutions[Math.floor(Math.random() * resolutions.length)],
      hardwareConcurrency: cores[Math.floor(Math.random() * cores.length)],
      deviceMemory: memories[Math.floor(Math.random() * memories.length)],
      platform: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)],
      language: LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)],
      timezone: TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)]
    };
  }

  getHeaders(fingerprint: Fingerprint): Record<string, string> {
    return {
      'User-Agent': fingerprint.userAgent,
      'Accept-Language': fingerprint.language,
      'X-Client-Platform': fingerprint.platform,
      'X-Client-Resolution': fingerprint.screenResolution,
      'X-Client-Timezone': fingerprint.timezone
    };
  }
}

export const fingerprintService = new FingerprintService();
