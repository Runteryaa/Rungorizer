import { LinkRecord } from '../db/schema';

/**
 * Extracts normalized subdomain/hostname from a URL.
 * Examples:
 * - https://m.youtube.com/watch?v=123 -> "m.youtube.com"
 * - https://www.youtube.com/watch?v=123 -> "youtube.com"
 * - https://youtube.com/watch?v=123 -> "youtube.com"
 * - https://music.youtube.com -> "music.youtube.com"
 * - https://gist.github.com/abc -> "gist.github.com"
 */
export function extractSubdomain(rawUrl: string): string {
  if (!rawUrl) return 'diger';
  try {
    let s = rawUrl.trim();
    if (!/^https?:\/\//i.test(s)) {
      s = 'https://' + s;
    }
    const { hostname } = new URL(s);
    let host = hostname.toLowerCase();
    // Normalize www. prefix
    if (host.startsWith('www.')) {
      host = host.substring(4);
    }
    return host || 'diger';
  } catch {
    return 'diger';
  }
}

export interface SubdomainFolderInfo {
  domain: string;
  count: number;
}

/**
 * Aggregates links into distinct subdomain folders with link counts.
 */
export function getSubdomainFolders(links: LinkRecord[]): SubdomainFolderInfo[] {
  const counts: Record<string, number> = {};
  links.forEach((l) => {
    const sub = extractSubdomain(l.clean_url || l.original_url);
    counts[sub] = (counts[sub] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);
}
