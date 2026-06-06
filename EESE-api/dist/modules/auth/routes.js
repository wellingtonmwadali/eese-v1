"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const router = (0, express_1.Router)();
router.post('/login', controller_1.login);
router.post('/sso', controller_1.sso);
router.post('/refresh', controller_1.refresh);
router.post('/register', controller_1.register);
exports.default = router;
//# sourceMappingURL=routes.js.map