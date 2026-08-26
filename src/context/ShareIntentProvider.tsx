import React, { useEffect } from 'react';
import {
  ShareIntentProvider as ExpoShareIntentProvider,
  useShareIntentContext,
} from 'expo-share-intent';
import { useRouter } from 'expo-router';
import { useDb } from './DbContext';
import { insertLink, updateLinkMetadata } from '../db/database';
import { fetchLinkMetadata, getDomain } from '../services/metadata';

function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const { db } = useDb();
  const router = useRouter();

  useEffect(() => {
    if (!hasShareIntent || !db) return;

    const url = shareIntent?.webUrl ?? shareIntent?.text;
    if (!url || !url.startsWith('http')) return;

    (async () => {
      try {
        const domain = getDomain(url);
        const id = await insertLink(db, { url, domain });
        // Fetch metadata async
        fetchLinkMetadata(url).then((meta) =>
          updateLinkMetadata(db, id, meta)
        );
        resetShareIntent();
        router.push(`/link/${id}`);
      } catch (e) {
        console.warn('Share intent handling error:', e);
        resetShareIntent();
      }
    })();
  }, [hasShareIntent]);

  return null;
}

interface ShareIntentProviderProps {
  children: React.ReactNode;
}

export function ShareIntentProvider({ children }: ShareIntentProviderProps) {
  return (
    <ExpoShareIntentProvider>
      <ShareIntentHandler />
      {children}
    </ExpoShareIntentProvider>
  );
}
