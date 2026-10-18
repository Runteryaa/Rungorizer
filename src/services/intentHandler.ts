import * as Linking from 'expo-linking';
import { extractUrlFromText } from './urlCleaner';

export type LinkReceivedCallback = (url: string) => void | Promise<void>;

let isListening = false;

export function setupIntentListener(callback: LinkReceivedCallback): () => void {
  if (isListening) return () => {};
  isListening = true;

  const handleUrl = (event: { url: string }) => {
    if (!event.url) return;

    // Check if it's a deep link: rungorize://add?url=...
    try {
      const parsed = Linking.parse(event.url);
      if (parsed.queryParams?.url) {
        const extracted = extractUrlFromText(String(parsed.queryParams.url));
        if (extracted) {
          callback(extracted);
          return;
        }
      }
    } catch {
      // not a parsed deep link
    }

    // Direct URL or shared text
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
