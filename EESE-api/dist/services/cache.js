"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedWeather = getCachedWeather;
exports.setCachedWeather = setCachedWeather;
exports.getCachedAiSummary = getCachedAiSummary;
exports.setCachedAiSummary = setCachedAiSummary;
exports.invalidateCache = invalidateCache;
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new ioredis_1.default(REDIS_URL, {
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
const WEATHER_TTL = 60 * 30; // 30 minutes
const AI_SUMMARY_TTL = 60 * 60 * 6; // 6 hours
async function getCachedWeather(locationKey) {
    const raw = await redis.get(`weather:${locationKey}`);
    return raw ? JSON.parse(raw) : null;
}
async function setCachedWeather(locationKey, data) {
    await redis.set(`weather:${locationKey}`, JSON.stringify(data), 'EX', WEATHER_TTL);
}
async function getCachedAiSummary(eventId) {
    return redis.get(`ai_summary:${eventId}`);
}
async function setCachedAiSummary(eventId, summary) {
    await redis.set(`ai_summary:${eventId}`, summary, 'EX', AI_SUMMARY_TTL);
}
async function invalidateCache(key) {
    await redis.del(key);
}
exports.default = redis;
//# sourceMappingURL=cache.js.map