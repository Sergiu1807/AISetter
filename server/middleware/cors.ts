import cors from 'cors';

const allowedOrigins = (process.env.CORS_ORIGIN || 'https://aisetter.iterio.ro')
  .split(',')
  .map(s => s.trim());

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, ManyChat webhooks, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-manychat-signature'],
});
