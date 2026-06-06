import { Router } from 'express';
import { verifyToken } from '../../middleware/auth';
import { getWeather, getDaily, getCurrent } from './controller';

const router = Router();

router.use(verifyToken);

// GET /api/weather?lat=&lon=&days=            — full forecast + Gemini AI summary
router.get('/', getWeather);

// GET /api/weather/daily?lat=&lon=&days=      — daily breakdown, no AI (quota-friendly)
router.get('/daily', getDaily);

// GET /api/weather/current?lat=&lon=          — real-time current conditions
router.get('/current', getCurrent);

export default router;
