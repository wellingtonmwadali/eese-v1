"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const auth_1 = __importDefault(require("./modules/auth"));
const events_1 = __importDefault(require("./modules/events"));
const weather_1 = __importDefault(require("./modules/weather"));
// Initialise Firebase Admin
if (!firebase_admin_1.default.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
        ? require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        : undefined;
    firebase_admin_1.default.initializeApp({
        credential: serviceAccount
            ? firebase_admin_1.default.credential.cert(serviceAccount)
            : firebase_admin_1.default.credential.applicationDefault(),
    });
}
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/events', events_1.default);
app.use('/api/weather', weather_1.default);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.listen(port, () => {
    console.log(`[EESE-api] Server running on port ${port}`);
});
//# sourceMappingURL=index.js.map