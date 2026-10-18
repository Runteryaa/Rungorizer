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

// Extracts URL from arbitrary text (e.g. when shared with surrounding text like "Check this out: https://example.com")
export function extractUrlFromText(text: string): string | null {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`]+)/i;
  const match = text.match(urlRegex);
  if (match && match[1]) {
    return cleanUrl(match[1]);
  }
  return null;
}
