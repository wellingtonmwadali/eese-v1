"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeatherForecast = getWeatherForecast;
exports.getDailyForecast = getDailyForecast;
exports.getCurrentConditions = getCurrentConditions;
const axios_1 = __importDefault(require("axios"));
const cache_1 = require("../../services/cache");
const BASE_URL = process.env.WEATHERAI_BASE_URL || 'https://api.weather-ai.co';
const API_KEY = process.env.WEATHERAI_API_KEY;
/** WMO weather interpretation code → human-readable description */
function wmoCodeToDescription(code) {
    const map = {
        '0': 'Clear sky',
        '1': 'Mainly clear',
        '2': 'Partly cloudy',
        '3': 'Overcast',
        '45': 'Foggy',
        '48': 'Icy fog',
        '51': 'Light drizzle',
        '53': 'Moderate drizzle',
        '55': 'Dense drizzle',
        '61': 'Slight rain',
        '63': 'Moderate rain',
        '65': 'Heavy rain',
        '71': 'Slight snow',
        '73': 'Moderate snow',
        '75': 'Heavy snow',
        '77': 'Snow grains',
        '80': 'Slight rain showers',
        '81': 'Moderate rain showers',
        '82': 'Violent rain showers',
        '85': 'Slight snow showers',
        '86': 'Heavy snow showers',
        '95': 'Thunderstorm',
        '96': 'Thunderstorm with hail',
        '99': 'Thunderstorm with heavy hail',
    };
    return map[String(code)] ?? 'Variable conditions';
}
function assessRisk(days) {
    const reasons = [];
    for (const day of days) {
        if (day.precipitation_mm > 10) {
            reasons.push(`Heavy rain expected (${day.precipitation_mm}mm on ${day.date})`);
        }
        else if (day.precipitation_mm > 2) {
            reasons.push(`Rain expected on ${day.date} (${day.precipitation_mm}mm)`);
        }
        if (day.precipitation_probability >= 70) {
            reasons.push(`High rain probability (${day.precipitation_probability}%) on ${day.date}`);
        }
        if (day.wind_kph > 60) {
            reasons.push(`Strong winds (${day.wind_kph} km/h on ${day.date})`);
        }
        else if (day.wind_kph > 40) {
            reasons.push(`Elevated winds (${day.wind_kph} km/h on ${day.date})`);
        }
        if (day.temp_max > 38) {
            reasons.push(`Heatwave risk — ${day.temp_max}°C on ${day.date}`);
        }
        else if (day.temp_max > 33) {
            reasons.push(`High heat — ${day.temp_max}°C on ${day.date}`);
        }
        if (day.uv_index >= 8) {
            reasons.push(`Very high UV index (${day.uv_index.toFixed(1)}) on ${day.date}`);
        }
        if (['Thunderstorm', 'Thunderstorm with hail', 'Thunderstorm with heavy hail'].includes(day.description)) {
            reasons.push(`Thunderstorm forecast on ${day.date}`);
        }
    }
    if (reasons.length === 0)
        return { level: 'low', label: 'Low Risk', color: 'green', reasons: [] };
    if (reasons.length <= 2)
        return { level: 'medium', label: 'Moderate Risk', color: 'yellow', reasons };
    return { level: 'high', label: 'High Risk', color: 'red', reasons };
}
function buildSuggestions(risk, days) {
    if (risk.level === 'low') {
        return ['Weather conditions look great for your event — no significant concerns.'];
    }
    const suggestions = [];
    const hasRain = days.some((d) => d.precipitation_mm > 2 || d.precipitation_probability >= 50);
    const hasHeat = days.some((d) => d.temp_max > 33);
    const hasWind = days.some((d) => d.wind_kph > 40);
    const hasThunderstorm = days.some((d) => ['Thunderstorm', 'Thunderstorm with hail', 'Thunderstorm with heavy hail'].includes(d.description));
    if (hasThunderstorm) {
        suggestions.push('Thunderstorms forecast — strongly consider moving to an indoor venue.');
        suggestions.push('Prepare an emergency evacuation plan for outdoor guests.');
    }
    if (hasRain) {
        suggestions.push('Consider moving the event indoors or providing waterproof canopies.');
        suggestions.push('Schedule outdoor activities in the morning before afternoon rain peaks.');
    }
    if (hasHeat) {
        suggestions.push('Move start time to early morning (7–9 AM) to avoid peak heat hours.');
        suggestions.push('Ensure shaded areas and hydration stations are available for attendees.');
    }
    if (hasWind) {
        suggestions.push('Secure all temporary structures — stages, banners, and tents.');
    }
    if (risk.level === 'high') {
        suggestions.push('High weather risk — strongly consider rescheduling or moving to an indoor venue.');
    }
    return suggestions;
}
/** Generate an AI-style summary when the WeatherAI API doesn't return one */
function generateAiSummary(days, risk) {
    const opening = risk.level === 'low'
        ? 'The forecast looks favorable for your event with no significant weather concerns.'
        : risk.level === 'medium'
            ? 'There are some weather concerns worth noting for your event dates.'
            : 'Significant weather risks have been identified — contingency planning is strongly advised.';
    const reasonText = risk.reasons.length > 0 ? ` Key concerns: ${risk.reasons.join('; ')}.` : '';
    const conditionLines = days
        .map((d) => `${d.date}: ${d.description}, ${d.temp_min}–${d.temp_max}°C, ` +
        `${d.precipitation_mm}mm rain (${d.precipitation_probability}% chance), ` +
        `winds up to ${d.wind_kph} km/h`)
        .join('. ');
    return `${opening}${reasonText} Daily breakdown — ${conditionLines}.`;
}
async function getWeatherForecast(lat, lon, days = 7) {
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)},${days}d`;
    const cached = await (0, cache_1.getCachedWeather)(cacheKey);
    if (cached)
        return cached;
    const response = await axios_1.default.get(`${BASE_URL}/v1/weather`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
        params: { lat, lon, days, ai: true, units: 'metric', lang: 'en' },
        timeout: 10000,
    });
    const raw = response.data;
    // Build date → hourly entries map to derive per-day humidity and UV index
    const hourlyByDate = {};
    for (const h of (raw.hourly ?? [])) {
        const date = String(h.time ?? '').slice(0, 10);
        if (date) {
            if (!hourlyByDate[date])
                hourlyByDate[date] = [];
            hourlyByDate[date].push(h);
        }
    }
    const forecastDays = (raw.daily ?? []).map((d) => {
        const date = String(d.date ?? '');
        const dayHours = hourlyByDate[date] ?? [];
        const maxUv = dayHours.length > 0
            ? Math.max(...dayHours.map((h) => Number(h.uv_index ?? 0)))
            : 0;
        const avgHumidity = dayHours.length > 0
            ? Math.round(dayHours.reduce((s, h) => s + Number(h.humidity ?? 0), 0) / dayHours.length)
            : 0;
        return {
            date,
            temp_min: Number(d.temp_min ?? 0),
            temp_max: Number(d.temp_max ?? 0),
            description: wmoCodeToDescription(String(d.condition_code ?? '')),
            icon: String(d.icon ?? ''),
            humidity: avgHumidity,
            wind_kph: Number(d.wind_max ?? 0),
            precipitation_mm: Number(d.precipitation_sum ?? 0),
            precipitation_probability: Number(d.precipitation_probability ?? 0),
            uv_index: parseFloat(maxUv.toFixed(1)),
        };
    });
    const risk = assessRisk(forecastDays);
    const suggestions = buildSuggestions(risk, forecastDays);
    // Use the Gemini AI summary from WeatherAI if provided; otherwise generate from data
    let aiSummary = raw.ai_summary ?? null;
    if (aiSummary) {
        await (0, cache_1.setCachedAiSummary)(cacheKey, aiSummary);
    }
    else {
        const cachedSummary = await (0, cache_1.getCachedAiSummary)(cacheKey);
        aiSummary = cachedSummary ?? generateAiSummary(forecastDays, risk);
    }
    const loc = (raw.location ?? {});
    const result = {
        location: {
            lat: Number(loc.lat ?? lat),
            lon: Number(loc.lon ?? lon),
            timezone: String(loc.timezone ?? ''),
            country: String(loc.country ?? ''),
        },
        current: raw.current
            ? {
                temperature: Number(raw.current.temperature ?? 0),
                wind_speed: Number(raw.current.wind_speed ?? 0),
                wind_direction: Number(raw.current.wind_direction ?? 0),
                condition: wmoCodeToDescription(String(raw.current.condition_code ?? '')),
                icon: String(raw.current.icon ?? ''),
            }
            : undefined,
        days: forecastDays,
        ai_summary: aiSummary,
        risk,
        suggestions,
    };
    await (0, cache_1.setCachedWeather)(cacheKey, result);
    return result;
}
/**
 * GET /v1/daily — daily forecast only, no AI (preserves AI quota).
 * Used by the dashboard calendar weather strip.
 */
async function getDailyForecast(lat, lon, days = 7) {
    const cacheKey = `daily:${lat.toFixed(4)},${lon.toFixed(4)},${days}d`;
    const cached = await (0, cache_1.getCachedWeather)(cacheKey);
    if (cached)
        return cached;
    const response = await axios_1.default.get(`${BASE_URL}/v1/daily`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
        params: { lat, lon, days, ai: false, units: 'metric' },
        timeout: 10000,
    });
    const raw = response.data;
    // Build date → hourly map for humidity/UV
    const hourlyByDate = {};
    for (const h of (raw.hourly ?? [])) {
        const date = String(h.time ?? '').slice(0, 10);
        if (date) {
            if (!hourlyByDate[date])
                hourlyByDate[date] = [];
            hourlyByDate[date].push(h);
        }
    }
    const forecastDays = (raw.daily ?? []).map((d) => {
        const date = String(d.date ?? '');
        const dayHours = hourlyByDate[date] ?? [];
        const maxUv = dayHours.length > 0 ? Math.max(...dayHours.map((h) => Number(h.uv_index ?? 0))) : 0;
        const avgHumidity = dayHours.length > 0
            ? Math.round(dayHours.reduce((s, h) => s + Number(h.humidity ?? 0), 0) / dayHours.length)
            : 0;
        return {
            date,
            temp_min: Number(d.temp_min ?? 0),
            temp_max: Number(d.temp_max ?? 0),
            description: wmoCodeToDescription(String(d.condition_code ?? '')),
            icon: String(d.icon ?? ''),
            humidity: avgHumidity,
            wind_kph: Number(d.wind_max ?? 0),
            precipitation_mm: Number(d.precipitation_sum ?? 0),
            precipitation_probability: Number(d.precipitation_probability ?? 0),
            uv_index: parseFloat(maxUv.toFixed(1)),
        };
    });
    const loc = (raw.location ?? {});
    const rawCurrent = (raw.current ?? null);
    const result = {
        location: {
            lat: Number(loc.lat ?? lat),
            lon: Number(loc.lon ?? lon),
            timezone: String(loc.timezone ?? ''),
            country: String(loc.country ?? ''),
        },
        current: rawCurrent
            ? {
                temperature: Number(rawCurrent.temperature ?? 0),
                wind_speed: Number(rawCurrent.wind_speed ?? 0),
                wind_direction: Number(rawCurrent.wind_direction ?? 0),
                condition: wmoCodeToDescription(String(rawCurrent.condition_code ?? '')),
                icon: String(rawCurrent.icon ?? ''),
            }
            : undefined,
        days: forecastDays,
    };
    await (0, cache_1.setCachedWeather)(cacheKey, result);
    return result;
}
/**
 * GET /v1/current — real-time current conditions only.
 * Used by the live conditions widget on the dashboard.
 */
async function getCurrentConditions(lat, lon) {
    const cacheKey = `current:${lat.toFixed(4)},${lon.toFixed(4)}`;
    // Short 5-minute TTL for current conditions — use weather cache slot
    const cached = await (0, cache_1.getCachedWeather)(cacheKey);
    if (cached)
        return cached;
    const response = await axios_1.default.get(`${BASE_URL}/v1/current`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
        params: { lat, lon, ai: false, units: 'metric' },
        timeout: 8000,
    });
    const raw = response.data;
    const rawCurrent = (raw.current ?? {});
    const rawHourly = (raw.hourly ?? []);
    // Grab latest hourly entry for feels_like, humidity, uv_index
    const latestHour = rawHourly.find((h) => String(h.time ?? '').slice(0, 13) === new Date().toISOString().slice(0, 13)) ?? rawHourly[0] ?? {};
    const loc = (raw.location ?? {});
    const result = {
        temperature: Number(rawCurrent.temperature ?? 0),
        wind_speed: Number(rawCurrent.wind_speed ?? 0),
        wind_direction: Number(rawCurrent.wind_direction ?? 0),
        condition: wmoCodeToDescription(String(rawCurrent.condition_code ?? '')),
        icon: String(rawCurrent.icon ?? ''),
        feels_like: Number(latestHour.feels_like ?? rawCurrent.temperature ?? 0),
        humidity: Number(latestHour.humidity ?? 0),
        uv_index: Number(latestHour.uv_index ?? 0),
        location: {
            timezone: String(loc.timezone ?? ''),
            country: String(loc.country ?? ''),
        },
    };
    // Cache current conditions for 5 minutes (use weather cache, TTL applied by cache service)
    await (0, cache_1.setCachedWeather)(cacheKey, result);
    return result;
}
//# sourceMappingURL=service.js.map