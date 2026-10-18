// Strips marketing tracking parameters and normalizes URLs

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'dclid',
  'igshid',
  'mc_eid',
  'mc_cid',
  '_hsenc',
  '_hsmi',
  'yclid',
  '_openstat',
  'spm',
  'ref',
  'ref_src',
  'ref_url',
  'si', // YouTube share identifier
  's',  // Twitter / X share parameter (e.g. ?s=20)
  't',  // Twitter / X tracking token
]);

export function cleanUrl(rawUrl: string): string {
  if (!rawUrl) return '';

  let trimmed = rawUrl.trim();
  // Ensure protocol
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const searchParams = new URLSearchParams(parsed.search);

    const keysToDelete: string[] = [];
    searchParams.forEach((_, key) => {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => searchParams.delete(key));

    parsed.search = searchParams.toString();

    // Clean hash if empty or just #
    let result = parsed.toString();
    if (result.endsWith('#') || result.endsWith('?')) {
      result = result.slice(0, -1);
    }

    return result;
  } catch {
    // If URL parsing fails, return trimmed original
    return trimmed;
  }
}

// Extracts URL from arbitrary text (e.g. when shared with surrounding text like "Check this post: https://x.com/user/status/123")
export function extractUrlFromText(text: string): string | null {
  if (!text) return null;

  // 1. First look for explicit http:// or https:// URLs
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`]+)/i;
  const match = text.match(urlRegex);
  if (match && match[1]) {
    let matched = match[1];
    // Strip trailing punctuation common in text messages
    while (/[.,!?:;)>\]]$/.test(matched)) {
      matched = matched.slice(0, -1);
    }
    return cleanUrl(matched);
  }

  // 2. Look for domain-style URLs like x.com/..., twitter.com/..., www.example.com/...
  const domainRegex = /((?:www\.|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\/)[^\s<>"{}|\\^`]+)/i;
  const domainMatch = text.match(domainRegex);
  if (domainMatch && domainMatch[1]) {
    let matched = domainMatch[1];
    while (/[.,!?:;)>\]]$/.test(matched)) {
      matched = matched.slice(0, -1);
    }
    return cleanUrl('https://' + matched.replace(/^https?:\/\//i, ''));
  }

  return null;
}
