"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeather = getWeather;
exports.getDaily = getDaily;
exports.getCurrent = getCurrent;
const service_1 = require("./service");
async function getWeather(req, res) {
    const { lat, lon, days } = req.query;
    if (!lat || !lon) {
        res.status(400).json({ message: 'lat and lon are required' });
        return;
    }
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    const parsedDays = days ? Math.min(parseInt(days, 10), 7) : 3;
    if (isNaN(parsedLat) || isNaN(parsedLon)) {
        res.status(400).json({ message: 'lat and lon must be valid numbers' });
        return;
    }
    try {
        const forecast = await (0, service_1.getWeatherForecast)(parsedLat, parsedLon, parsedDays);
        res.json(forecast);
    }
    catch (err) {
        console.error('Weather fetch error:', err);
        res.status(502).json({ message: 'Failed to fetch weather data' });
    }
}
/** GET /api/weather/daily?lat=&lon=&days= — daily forecast, no AI (quota-friendly) */
async function getDaily(req, res) {
    const { lat, lon, days } = req.query;
    if (!lat || !lon) {
        res.status(400).json({ message: 'lat and lon are required' });
        return;
    }
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    const parsedDays = days ? Math.min(parseInt(days, 10), 7) : 7;
    if (isNaN(parsedLat) || isNaN(parsedLon)) {
        res.status(400).json({ message: 'lat and lon must be valid numbers' });
        return;
    }
    try {
        const forecast = await (0, service_1.getDailyForecast)(parsedLat, parsedLon, parsedDays);
        res.json(forecast);
    }
    catch (err) {
        console.error('Daily forecast error:', err);
        res.status(502).json({ message: 'Failed to fetch daily forecast' });
    }
}
/** GET /api/weather/current?lat=&lon= — real-time current conditions */
async function getCurrent(req, res) {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
        res.status(400).json({ message: 'lat and lon are required' });
        return;
    }
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    if (isNaN(parsedLat) || isNaN(parsedLon)) {
        res.status(400).json({ message: 'lat and lon must be valid numbers' });
        return;
    }
    try {
        const current = await (0, service_1.getCurrentConditions)(parsedLat, parsedLon);
        res.json(current);
    }
    catch (err) {
        console.error('Current conditions error:', err);
        res.status(502).json({ message: 'Failed to fetch current conditions' });
    }
}
//# sourceMappingURL=controller.js.map