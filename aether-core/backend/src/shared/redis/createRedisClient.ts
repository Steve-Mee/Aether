import type { RedisClientType } from 'redis';

let sharedClient: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (sharedClient?.isOpen) return sharedClient;

  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        const { createClient } = await import('redis');
        const client = createClient({ url }) as RedisClientType;
        client.on('error', () => undefined);
        if (!client.isOpen) await client.connect();
        sharedClient = client;
        return client;
      } catch {
        sharedClient = null;
        return null;
      } finally {
        connectPromise = null;
      }
    })();
  }

  return connectPromise;
}

export async function disconnectRedisClient(): Promise<void> {
  if (sharedClient?.isOpen) {
    await sharedClient.quit().catch(() => undefined);
  }
  sharedClient = null;
}
