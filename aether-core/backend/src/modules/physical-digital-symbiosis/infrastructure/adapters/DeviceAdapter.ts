import axios from 'axios';
import { assertPhysicalDevicePayload } from '../../../../shared/security/antiAbuseService';

export interface DeviceSyncResult {
  shelfId: string;
  itemsUpdated: number;
  syncedAt: Date;
}

export interface ARSessionResult {
  sessionId: string;
  productId: string;
  adapter: string;
}

export interface PhysicalDeviceAdapter {
  name: string;
  syncShelf(shelfId: string, inventory: unknown[]): Promise<DeviceSyncResult>;
  startARSession(productId: string): Promise<ARSessionResult>;
}

export class MockDeviceAdapter implements PhysicalDeviceAdapter {
  name = 'mock';

  async syncShelf(shelfId: string, inventory: unknown[]): Promise<DeviceSyncResult> {
    assertPhysicalDevicePayload(inventory);
    return {
      shelfId,
      itemsUpdated: inventory.length,
      syncedAt: new Date(),
    };
  }

  async startARSession(productId: string): Promise<ARSessionResult> {
    return {
      sessionId: `ar_mock_${Date.now()}`,
      productId,
      adapter: this.name,
    };
  }
}

export class HttpDeviceAdapter implements PhysicalDeviceAdapter {
  name = 'http';

  constructor(private baseUrl: string) {}

  async syncShelf(shelfId: string, inventory: unknown[]): Promise<DeviceSyncResult> {
    assertPhysicalDevicePayload(inventory);
    const res = await axios.post(`${this.baseUrl}/shelf/sync`, { shelfId, inventory }, { timeout: 10000 });
    return {
      shelfId,
      itemsUpdated: res.data?.itemsUpdated ?? inventory.length,
      syncedAt: new Date(),
    };
  }

  async startARSession(productId: string): Promise<ARSessionResult> {
    const res = await axios.post(`${this.baseUrl}/ar/session`, { productId }, { timeout: 10000 });
    return {
      sessionId: res.data?.sessionId ?? `ar_http_${Date.now()}`,
      productId,
      adapter: this.name,
    };
  }
}

export function getDeviceAdapter(): PhysicalDeviceAdapter {
  const httpUrl = process.env.PHYSICAL_DEVICE_URL;
  if (httpUrl) return new HttpDeviceAdapter(httpUrl);
  return new MockDeviceAdapter();
}

export const deviceAdapter = getDeviceAdapter();
