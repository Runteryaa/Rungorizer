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
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(sanitizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 Rungorize/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return defaultResult;
    }

    // Read only first 150KB to keep memory & speed optimal on mobile
    const html = await response.text();
    const headChunk = html.slice(0, 150000);

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

    return {
      url: rawUrl,
      cleanUrl: sanitizedUrl,
      title: title || defaultResult.title,
      description: ogDescription || defaultResult.description,
      imageUrl: imageUrl || null,
      faviconUrl: domainInfo.faviconUrl,
      domainInfo,
    };
  } catch {
    // If request fails (offline, timeout, etc.), return fallback safely
    return defaultResult;
  }
}
