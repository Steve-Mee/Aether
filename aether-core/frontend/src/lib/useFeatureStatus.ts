import { useEffect, useState } from 'react';
import { adminRepository } from '@/lib/data';
import type { FeatureStatus } from './api';

let cachedTruth: Awaited<ReturnType<typeof adminRepository.truthStatus>> | null = null;
let cachePromise: Promise<Awaited<ReturnType<typeof adminRepository.truthStatus>>> | null = null;

function mapRawStatus(raw: string | undefined): FeatureStatus {
  if (raw === 'live' || raw === 'implemented') return 'live';
  if (raw === 'experimental' || raw === 'scaffold') return 'experimental';
  return 'partial';
}

async function loadTruthStatus() {
  if (cachedTruth) return cachedTruth;
  if (!cachePromise) {
    cachePromise = adminRepository.truthStatus().then((doc) => {
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
