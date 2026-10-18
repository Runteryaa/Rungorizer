import * as Linking from 'expo-linking';
import { extractUrlFromText } from './urlCleaner';

export type LinkReceivedCallback = (url: string) => void | Promise<void>;

let isListening = false;
let lastProcessedUrl: string | null = null;
let lastProcessedTime = 0;

export function setupIntentListener(callback: LinkReceivedCallback): () => void {
  if (isListening) return () => {};
  isListening = true;

  const handleUrl = (event: { url: string }) => {
    if (!event.url) return;

    // Deduplicate rapid identical intent triggers (within 1.5 seconds)
    const now = Date.now();
    if (event.url === lastProcessedUrl && now - lastProcessedTime < 1500) {
      return;
    }
    lastProcessedUrl = event.url;
    lastProcessedTime = now;

    // 1. Check if it's a deep link: rungorize://share?text=... or rungorize://add?url=...
    try {
      const parsed = Linking.parse(event.url);
      if (parsed.hostname === 'share' || parsed.path === 'share') {
        // Handled cleanly by src/app/share.tsx screen in Expo Router
        return;
      }

      if (parsed.queryParams?.text) {
        const textParam = String(parsed.queryParams.text);
        let decoded = textParam;
        try {
          decoded = decodeURIComponent(textParam);
        } catch {
          // keep as is
        }
        const extracted = extractUrlFromText(decoded);
        if (extracted) {
          callback(extracted);
          return;
        }
      }

      if (parsed.queryParams?.url) {
        const extracted = extractUrlFromText(String(parsed.queryParams.url));
        if (extracted) {
          callback(extracted);
          return;
        }
      }
    } catch {
      // ignore
    }

    // 2. Direct URL or shared text fallback
    const extracted = extractUrlFromText(event.url);
    if (extracted) {
      callback(extracted);
    }
  };

  // Check initial URL on app cold launch
  Linking.getInitialURL().then((initialUrl) => {
    if (initialUrl) {
      handleUrl({ url: initialUrl });
    }
  });

  const subscription = Linking.addEventListener('url', handleUrl);

  return () => {
    isListening = false;
    subscription.remove();
  };
}
