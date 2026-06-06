"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const model_1 = require("../auth/model");
const controller_1 = require("./controller");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.post('/', (0, auth_1.requireRole)(model_1.Role.Planner, model_1.Role.Admin), controller_1.create);
router.get('/', controller_1.list);
router.get('/:id', controller_1.getOne);
router.patch('/:id', controller_1.update);
router.delete('/:id', controller_1.remove);
router.get('/:id/weather', controller_1.refreshWeather);
exports.default = router;
//# sourceMappingURL=routes.js.map