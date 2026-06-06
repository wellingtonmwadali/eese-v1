import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

// TTLs
const WEATHER_TTL = 60 * 30;       // 30 minutes
const AI_SUMMARY_TTL = 60 * 60 * 6; // 6 hours

export async function getCachedWeather(locationKey: string): Promise<object | null> {
  const raw = await redis.get(`weather:${locationKey}`);
  return raw ? (JSON.parse(raw) as object) : null;
}

export async function setCachedWeather(locationKey: string, data: object): Promise<void> {
  await redis.set(`weather:${locationKey}`, JSON.stringify(data), 'EX', WEATHER_TTL);
}

export async function getCachedAiSummary(eventId: string): Promise<string | null> {
  return redis.get(`ai_summary:${eventId}`);
}

export async function setCachedAiSummary(eventId: string, summary: string): Promise<void> {
  await redis.set(`ai_summary:${eventId}`, summary, 'EX', AI_SUMMARY_TTL);
}

export async function invalidateCache(key: string): Promise<void> {
  await redis.del(key);
}

export default redis;
