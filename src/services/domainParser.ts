import { POPULAR_DOMAINS, getDomainAccentColor } from '../constants/domains';

export interface ParsedDomainInfo {
  rootDomain: string;
  hostname: string;
  displayName: string;
  accentColor: string;
  faviconUrl: string;
}

// Common two-level ccTLDs (e.g., .co.uk, .com.tr, .gov.tr, .org.uk)
const TWO_LEVEL_TLDS = new Set([
  'co.uk',
  'com.tr',
  'org.tr',
  'edu.tr',
  'gov.tr',
  'net.tr',
  'org.uk',
  'com.au',
  'net.au',
  'co.jp',
  'ne.jp',
  'co.nz',
  'com.br',
]);

// Special domain aliases mapping to canonical parent domain
const DOMAIN_ALIASES: Record<string, string> = {
  'youtu.be': 'youtube.com',
  'm.youtube.com': 'youtube.com',
  'music.youtube.com': 'youtube.com',
  'mobile.twitter.com': 'twitter.com',
  'x.com': 'x.com',
  't.co': 'x.com',
  'old.reddit.com': 'reddit.com',
  'np.reddit.com': 'reddit.com',
  'gist.github.com': 'github.com',
};

export function extractRootDomain(rawUrl: string): string {
  try {
    let urlString = rawUrl.trim();
    if (!/^https?:\/\//i.test(urlString)) {
      urlString = 'https://' + urlString;
    }
    const { hostname } = new URL(urlString);
    const host = hostname.toLowerCase();

    // Check direct alias first
    if (DOMAIN_ALIASES[host]) {
      return DOMAIN_ALIASES[host];
    }

    const parts = host.split('.');
    if (parts.length <= 2) {
      return host;
    }

    // Check if ending matches two-level TLD (e.g. example.co.uk)
    const lastTwo = parts.slice(-2).join('.');
    if (TWO_LEVEL_TLDS.has(lastTwo)) {
      return parts.slice(-3).join('.');
    }

    // Default to last two parts (e.g. docs.github.com -> github.com)
    return parts.slice(-2).join('.');
  } catch {
    return 'other';
  }
}

export function formatDisplayName(domain: string): string {
  if (POPULAR_DOMAINS[domain]?.displayName) {
    return POPULAR_DOMAINS[domain].displayName;
  }
  // Strip TLD (.com, .org, etc.) and capitalize
  const parts = domain.split('.');
  const name = parts[0] || domain;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function getFaviconUrl(domain: string): string {
  // Google's reliable high-res favicon service (128px)
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

export function parseDomain(url: string): ParsedDomainInfo {
  let hostname = '';
  try {
    let urlString = url.trim();
    if (!/^https?:\/\//i.test(urlString)) {
      urlString = 'https://' + urlString;
    }
    hostname = new URL(urlString).hostname.toLowerCase();
  } catch {
    hostname = 'unknown';
  }

  const rootDomain = extractRootDomain(url);
  const displayName = formatDisplayName(rootDomain);
  const accentColor = getDomainAccentColor(rootDomain);
  const faviconUrl = getFaviconUrl(rootDomain);

  return {
    rootDomain,
    hostname,
    displayName,
    accentColor,
    faviconUrl,
  };
}
