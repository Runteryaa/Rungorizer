// Pre-configured brand colors and friendly names for popular domains
export interface DomainConfig {
  displayName: string;
  color: string;
  category?: string;
}

export const POPULAR_DOMAINS: Record<string, DomainConfig> = {
  'github.com': { displayName: 'GitHub', color: '#8b5cf6', category: 'Geliştirici' },
  'gitlab.com': { displayName: 'GitLab', color: '#f97316', category: 'Geliştirici' },
  'youtube.com': { displayName: 'YouTube', color: '#ef4444', category: 'Video' },
  'youtu.be': { displayName: 'YouTube', color: '#ef4444', category: 'Video' },
  'twitter.com': { displayName: 'X (Twitter)', color: '#38bdf8', category: 'Sosyal' },
  'x.com': { displayName: 'X', color: '#a1a1aa', category: 'Sosyal' },
  'reddit.com': { displayName: 'Reddit', color: '#f97316', category: 'Topluluk' },
  'medium.com': { displayName: 'Medium', color: '#10b981', category: 'Okuma' },
  'dev.to': { displayName: 'DEV Community', color: '#06b6d4', category: 'Geliştirici' },
  'stackoverflow.com': { displayName: 'Stack Overflow', color: '#f97316', category: 'Geliştirici' },
  'linkedin.com': { displayName: 'LinkedIn', color: '#0284c7', category: 'İş' },
  'instagram.com': { displayName: 'Instagram', color: '#ec4899', category: 'Sosyal' },
  'spotify.com': { displayName: 'Spotify', color: '#22c55e', category: 'Müzik' },
  'figma.com': { displayName: 'Figma', color: '#a855f7', category: 'Tasarım' },
  'notion.so': { displayName: 'Notion', color: '#e4e4e7', category: 'Üretkenlik' },
  'substack.com': { displayName: 'Substack', color: '#f97316', category: 'Bülten' },
  'wikipedia.org': { displayName: 'Wikipedia', color: '#94a3b8', category: 'Referans' },
  'news.ycombinator.com': { displayName: 'Hacker News', color: '#ff6600', category: 'Haber' },
};

// Generates consistent pleasing accent color from any domain string
export function getDomainAccentColor(domain: string): string {
  if (POPULAR_DOMAINS[domain]?.color) {
    return POPULAR_DOMAINS[domain].color;
  }
  const defaultColors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#10b981', // emerald
    '#06b6d4', // cyan
    '#ec4899', // rose
    '#f59e0b', // amber
    '#6366f1', // indigo
    '#14b8a6', // teal
  ];
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % defaultColors.length;
  return defaultColors[index];
}
