"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const controller_1 = require("./controller");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
// GET /api/weather?lat=&lon=&days=            — full forecast + Gemini AI summary
router.get('/', controller_1.getWeather);
// GET /api/weather/daily?lat=&lon=&days=      — daily breakdown, no AI (quota-friendly)
router.get('/daily', controller_1.getDaily);
// GET /api/weather/current?lat=&lon=          — real-time current conditions
router.get('/current', controller_1.getCurrent);
exports.default = router;
//# sourceMappingURL=routes.js.map