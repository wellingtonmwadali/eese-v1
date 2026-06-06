import { Request, Response } from 'express';
import { getWeatherForecast, getDailyForecast, getCurrentConditions } from './service';

export async function getWeather(req: Request, res: Response): Promise<void> {
  const { lat, lon, days } = req.query as { lat?: string; lon?: string; days?: string };

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
    const forecast = await getWeatherForecast(parsedLat, parsedLon, parsedDays);
    res.json(forecast);
  } catch (err) {
    console.error('Weather fetch error:', err);
    res.status(502).json({ message: 'Failed to fetch weather data' });
  }
}

/** GET /api/weather/daily?lat=&lon=&days= — daily forecast, no AI (quota-friendly) */
export async function getDaily(req: Request, res: Response): Promise<void> {
  const { lat, lon, days } = req.query as { lat?: string; lon?: string; days?: string };
  if (!lat || !lon) { res.status(400).json({ message: 'lat and lon are required' }); return; }
  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);
  const parsedDays = days ? Math.min(parseInt(days, 10), 7) : 7;
  if (isNaN(parsedLat) || isNaN(parsedLon)) { res.status(400).json({ message: 'lat and lon must be valid numbers' }); return; }
  try {
    const forecast = await getDailyForecast(parsedLat, parsedLon, parsedDays);
    res.json(forecast);
  } catch (err) {
    console.error('Daily forecast error:', err);
    res.status(502).json({ message: 'Failed to fetch daily forecast' });
  }
}

/** GET /api/weather/current?lat=&lon= — real-time current conditions */
export async function getCurrent(req: Request, res: Response): Promise<void> {
  const { lat, lon } = req.query as { lat?: string; lon?: string };
  if (!lat || !lon) { res.status(400).json({ message: 'lat and lon are required' }); return; }
  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);
  if (isNaN(parsedLat) || isNaN(parsedLon)) { res.status(400).json({ message: 'lat and lon must be valid numbers' }); return; }
  try {
    const current = await getCurrentConditions(parsedLat, parsedLon);
    res.json(current);
  } catch (err) {
    console.error('Current conditions error:', err);
    res.status(502).json({ message: 'Failed to fetch current conditions' });
  }
}
