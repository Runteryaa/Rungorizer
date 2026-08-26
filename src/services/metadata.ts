import { LinkMetadata } from '../types';

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

async function fetchWithTimeout(url: string, timeout = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractTitle(html: string): string | null {
  const ogTitle = extractMetaContent(html, 'og:title');
  if (ogTitle) return ogTitle;

  const twitterTitle = extractMetaContent(html, 'twitter:title');
  if (twitterTitle) return twitterTitle;

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() ?? null;
}

function extractDescription(html: string): string | null {
  const ogDesc = extractMetaContent(html, 'og:description');
  if (ogDesc) return ogDesc;

  const twitterDesc = extractMetaContent(html, 'twitter:description');
  if (twitterDesc) return twitterDesc;

  return extractMetaContent(html, 'description');
}

function extractOgImage(html: string): string | null {
  const ogImage = extractMetaContent(html, 'og:image');
  if (ogImage) return ogImage;
  return extractMetaContent(html, 'twitter:image');
}

function buildFaviconUrl(url: string, html: string): string {
  const domain = extractDomain(url);
  
  // Try to find favicon link in HTML
  const faviconPatterns = [
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
  ];
  
  for (const pattern of faviconPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const href = match[1];
      if (href.startsWith('http')) return href;
      try {
        const base = new URL(url);
        return new URL(href, base.origin).toString();
      } catch {
        // fall through
      }
    }
  }
  
  // Fallback to Google favicon service
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  const domain = extractDomain(url);
  const defaultFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();

    const title = extractTitle(html);
    const description = extractDescription(html);
    const og_image = extractOgImage(html);
    const favicon = buildFaviconUrl(url, html);

    return {
      title: title ? decodeHtmlEntities(title) : null,
      description: description ? decodeHtmlEntities(description) : null,
      favicon,
      og_image,
    };
  } catch (error) {
    console.warn('Metadata fetch failed for', url, error);
    return {
      title: null,
      description: null,
      favicon: defaultFavicon,
      og_image: null,
    };
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)));
}

export function getDomain(url: string): string {
  return extractDomain(url);
}
