import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import authRouter from './modules/auth';
import eventsRouter from './modules/events';
import weatherRouter from './modules/weather';

// Initialise Firebase Admin
if (!admin.apps.length) {
  let credential: admin.credential.Credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Production (non-GCP): set the full JSON content as an env variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    credential = admin.credential.cert(serviceAccount);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    // Local dev fallback: point to a local file path
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    credential = admin.credential.cert(serviceAccount);
  } else {
    // GCP-hosted: runtime service account is injected automatically
    credential = admin.credential.applicationDefault();
  }

  admin.initializeApp({ credential });
}

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = new Set([
  process.env.FRONTEND_URL
  
].filter(Boolean) as string[]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^https?:\/\/(.*\.)?localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else if (origin && allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/weather', weatherRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`[EESE-api] Server running on port ${port}`);
});
