import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import authRouter from './modules/auth';
import eventsRouter from './modules/events';
import weatherRouter from './modules/weather';

// Initialise Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : undefined;

  admin.initializeApp({
    credential: serviceAccount
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault(),
  });
}

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^https?:\/\/(.*\.)?localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else if (origin === (process.env.FRONTEND_URL || '')) {
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
