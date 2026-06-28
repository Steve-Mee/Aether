import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeNavigate } from '@/lib/aetherLiveBus';

/** Listens for SPA navigation requests from non-React code (e.g. live-demo toasts). */
export default function NavigationBridge() {
  const navigate = useNavigate();

  useEffect(() => subscribeNavigate((path) => navigate(path)), [navigate]);

  return null;
}
