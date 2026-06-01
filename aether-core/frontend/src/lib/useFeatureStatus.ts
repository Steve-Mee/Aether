import { useEffect, useState } from 'react';
import { apiFetch, FeatureStatus, TruthStatusDocument } from './api';

let cachedTruth: TruthStatusDocument | null = null;
let cachePromise: Promise<TruthStatusDocument> | null = null;

function mapRawStatus(raw: string | undefined): FeatureStatus {
  if (raw === 'live' || raw === 'implemented') return 'live';
  if (raw === 'experimental' || raw === 'scaffold') return 'experimental';
  return 'partial';
}

async function loadTruthStatus(): Promise<TruthStatusDocument> {
  if (cachedTruth) return cachedTruth;
  if (!cachePromise) {
    cachePromise = apiFetch<TruthStatusDocument>('/api/admin/truth-status').then((doc) => {
      cachedTruth = doc;
      return doc;
    });
  }
  return cachePromise;
}

export function useFeatureStatus(featureKey: string): FeatureStatus | 'loading' {
  const [status, setStatus] = useState<FeatureStatus | 'loading'>('loading');

  useEffect(() => {
    let active = true;
    loadTruthStatus()
      .then((doc) => {
        if (!active) return;
        setStatus(mapRawStatus(doc.features[featureKey]?.status));
      })
      .catch(() => {
        if (active) setStatus('partial');
      });
    return () => {
      active = false;
    };
  }, [featureKey]);

  return status;
}

export function invalidateTruthStatusCache(): void {
  cachedTruth = null;
  cachePromise = null;
}
