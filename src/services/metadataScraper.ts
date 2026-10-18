import { parseDomain, ParsedDomainInfo } from './domainParser';
import { cleanUrl } from './urlCleaner';

export interface ScrapedMetadata {
  url: string;
  cleanUrl: string;
  title: string;
  description: string;
  imageUrl: string | null;
  faviconUrl: string;
  domainInfo: ParsedDomainInfo;
  extractedTags?: string[];
}

// Decodes basic HTML entities like &amp;, &quot;, &#39;, &lt;, &gt;
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”');
}

// Extracts content attribute from meta tag with name or property
function extractMeta(html: string, tagNames: string[]): string | null {
  for (const tag of tagNames) {
    // Matches property="..." content="..." or content="..." property="..."
    const regex1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${tag}["'][^>]+content=["']([^"']+)["']`,
      'i'
    );
    const match1 = html.match(regex1);
    if (match1 && match1[1]) return decodeHtmlEntities(match1[1].trim());

    const regex2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${tag}["']`,
      'i'
    );
    const match2 = html.match(regex2);
    if (match2 && match2[1]) return decodeHtmlEntities(match2[1].trim());
  }
  return null;
}

// Fallback to derive readable title from URL path
function fallbackTitleFromUrl(url: string, domainInfo: ParsedDomainInfo): string {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      const cleaned = last.replace(/[-_]/g, ' ').replace(/\.[a-zA-Z0-9]+$/, '');
      if (cleaned.length > 1) {
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    }
  } catch {
    // ignore
  }
  return domainInfo.displayName;
}

/**
 * Extracts hashtags (#tag) and keywords from title, description, and HTML meta tags.
 * Supports Unicode/Turkish characters (ç, ğ, ı, ö, ş, ü, etc.).
 * Returns an array of normalized, lowercase tags (without leading #), max 5 tags.
 */
export function extractTagsFromContent(
  title?: string | null,
  description?: string | null,
  html?: string | null
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  const addTag = (raw: string) => {
    if (!raw) return;
    const clean = raw.trim().replace(/^#+/, '').toLowerCase();
    if (clean.length >= 2 && clean.length <= 30 && !seen.has(clean)) {
      if (/^[\p{L}\p{N}_-]+$/u.test(clean)) {
        seen.add(clean);
        result.push(clean);
      }
    }
  };

  // 1. Extract hashtags from Title
  if (title) {
    const hashtagRegex = /#([\p{L}\p{N}_-]{2,30})/gu;
    const matches = title.matchAll(hashtagRegex);
    for (const match of matches) {
      if (match[1]) addTag(match[1]);
    }
  }

  // 2. Extract hashtags from Description
  if (description) {
    const hashtagRegex = /#([\p{L}\p{N}_-]{2,30})/gu;
    const matches = description.matchAll(hashtagRegex);
    for (const match of matches) {
      if (match[1]) addTag(match[1]);
    }
  }

  // 3. Extract keywords or article:tag from HTML if available
  if (html) {
    const keywordsMatch =
      html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']keywords["']/i);
    if (keywordsMatch && keywordsMatch[1]) {
      const parts = keywordsMatch[1].split(/[,;]/);
      for (const p of parts) {
        addTag(p);
      }
    }

    const articleTagRegex = /<meta[^>]+property=["']article:tag["'][^>]+content=["']([^"']+)["']/gi;
    let articleMatch;
    while ((articleMatch = articleTagRegex.exec(html)) !== null) {
      if (articleMatch[1]) addTag(articleMatch[1]);
    }
  }

  return result.slice(0, 5);
}

/**
 * Extracts YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://music.youtube.com/watch?v=VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    let s = url.trim();
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    const parsed = new URL(s);
    const host = parsed.hostname.toLowerCase();

    // youtu.be/VIDEO_ID
    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const id = parsed.pathname.slice(1).split('/')[0].split('?')[0];
      return id && id.length >= 5 ? id : null;
    }

    if (host.includes('youtube.com')) {
      // /watch?v=VIDEO_ID
      const v = parsed.searchParams.get('v');
      if (v && v.length >= 5) return v;

      // /shorts/VIDEO_ID, /embed/VIDEO_ID, /live/VIDEO_ID, /v/VIDEO_ID
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (
        pathParts.length >= 2 &&
        ['shorts', 'embed', 'live', 'v'].includes(pathParts[0].toLowerCase())
      ) {
        const id = pathParts[1].split('?')[0];
        return id && id.length >= 5 ? id : null;
      }
    }
  } catch {
    // fallback regex below
  }
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i
  );
  return match ? match[1] : null;
}

/**
 * Dedicated metadata scraper for YouTube using official oEmbed and CDN thumbnails.
 */
async function scrapeYouTubeMetadata(
  rawUrl: string,
  sanitizedUrl: string,
  domainInfo: ParsedDomainInfo,
  videoId: string
): Promise<ScrapedMetadata | null> {
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const defaultThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  // 1. Try YouTube official oEmbed API first (fast, reliable, official, bypasses SPA/consent)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;
    const response = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.title) {
        let extractedTags = extractTagsFromContent(data.title, null, null);
        let description = data.author_name
          ? `${data.author_name} • YouTube`
          : `${domainInfo.displayName} üzerinden kaydedildi`;

        // If fewer than 5 tags from title, check if description has hashtags
        if (extractedTags.length < 5) {
          try {
            const htmlRes = await fetch(canonicalUrl, {
              headers: {
                'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.html)',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
              },
            });
            if (htmlRes.ok) {
              const html = await htmlRes.text();
              const ogDesc = extractMeta(html, ['og:description', 'twitter:description', 'description']);
              if (ogDesc) {
                description = ogDesc;
              }
              const moreTags = extractTagsFromContent(data.title, ogDesc, html);
              extractedTags = Array.from(new Set([...extractedTags, ...moreTags])).slice(0, 5);
            }
          } catch {
            // keep current tags and description
          }
        }

        return {
          url: rawUrl,
          cleanUrl: sanitizedUrl,
          title: decodeHtmlEntities(data.title.trim()),
          description,
          imageUrl: data.thumbnail_url || defaultThumbnail,
          faviconUrl: domainInfo.faviconUrl,
          domainInfo,
          extractedTags,
        };
      }
    }
  } catch {
    // proceed to HTML fallback
  }

  // 2. Fallback to HTML scrape with crawler User-Agent
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(canonicalUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.html)',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();
      const ogTitle = extractMeta(html, ['og:title', 'twitter:title']);
      const ogDesc = extractMeta(html, ['og:description', 'twitter:description', 'description']);
      const ogImage = extractMeta(html, ['og:image', 'twitter:image:src', 'twitter:image']);

      let title = ogTitle;
      if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          title = decodeHtmlEntities(titleMatch[1].trim());
          title = title.replace(/\s*-\s*YouTube$/i, '');
        }
      }

      if (title && title.toLowerCase() !== 'youtube') {
        const extractedTags = extractTagsFromContent(title, ogDesc, html);
        return {
          url: rawUrl,
          cleanUrl: sanitizedUrl,
          title: title.trim(),
          description: ogDesc || `${domainInfo.displayName} üzerinden kaydedildi`,
          imageUrl: ogImage || defaultThumbnail,
          faviconUrl: domainInfo.faviconUrl,
          domainInfo,
          extractedTags,
        };
      }
    }
  } catch {
    // proceed to final fallback
  }

  // 3. Guaranteed fallback with high-res video thumbnail
  return {
    url: rawUrl,
    cleanUrl: sanitizedUrl,
    title: domainInfo.displayName,
    description: `${domainInfo.displayName} üzerinden kaydedildi`,
    imageUrl: defaultThumbnail,
    faviconUrl: domainInfo.faviconUrl,
    domainInfo,
    extractedTags: [],
  };
}

export async function scrapeMetadata(rawUrl: string): Promise<ScrapedMetadata> {
  const sanitizedUrl = cleanUrl(rawUrl);
  const domainInfo = parseDomain(sanitizedUrl);

  const defaultResult: ScrapedMetadata = {
    url: rawUrl,
    cleanUrl: sanitizedUrl,
    title: fallbackTitleFromUrl(sanitizedUrl, domainInfo),
    description: `${domainInfo.displayName} üzerinden kaydedildi`,
    imageUrl: null,
    faviconUrl: domainInfo.faviconUrl,
    domainInfo,
    extractedTags: [],
  };

  // 1. YouTube specialized extraction
  const ytVideoId = extractYouTubeVideoId(sanitizedUrl);
  if (ytVideoId) {
    const ytResult = await scrapeYouTubeMetadata(rawUrl, sanitizedUrl, domainInfo, ytVideoId);
    if (ytResult) {
      return ytResult;
    }
  }

  // 2. General web page extraction
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    // Social crawler user agent: modern web platforms provide pre-rendered Open Graph tags
    const userAgent = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.html)';

    const response = await fetch(sanitizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return defaultResult;
    }

    // Read full head/body chunk without artificial 150KB cutoff
    const html = await response.text();
    const headChunk = html.slice(0, 1500000);

    // Extract Title
    const ogTitle = extractMeta(headChunk, ['og:title', 'twitter:title']);
    let title = ogTitle;
    if (!title) {
      const titleMatch = headChunk.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = decodeHtmlEntities(titleMatch[1].trim());
      }
    }

    // Extract Description
    const ogDescription = extractMeta(headChunk, [
      'og:description',
      'twitter:description',
      'description',
    ]);

    // Extract Image
    let imageUrl = extractMeta(headChunk, ['og:image', 'twitter:image:src', 'twitter:image']);
    if (imageUrl) {
      // Resolve relative image URLs
      try {
        imageUrl = new URL(imageUrl, sanitizedUrl).toString();
      } catch {
        // keep as is
      }
    }

    // Extract Tags from title, description, and HTML keywords/tags
    const extractedTags = extractTagsFromContent(title, ogDescription, headChunk);

    return {
      url: rawUrl,
      cleanUrl: sanitizedUrl,
      title: title || defaultResult.title,
      description: ogDescription || defaultResult.description,
      imageUrl: imageUrl || null,
      faviconUrl: domainInfo.faviconUrl,
      domainInfo,
      extractedTags,
    };
  } catch {
    // If request fails (offline, timeout, etc.), return fallback safely
    return defaultResult;
  }
}
