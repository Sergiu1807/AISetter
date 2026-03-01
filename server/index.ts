import 'dotenv/config';
import express from 'express';
import { corsMiddleware } from './middleware/cors';
import { webhookRateLimit } from './middleware/rate-limit';

// Route imports
import healthRoutes from './routes/health';
import webhookRoutes from './routes/webhook';
import leadsRoutes from './routes/leads';
import conversationsRoutes from './routes/conversations';
import messagesRoutes from './routes/messages';
import activitiesRoutes from './routes/activities';
import trainingRoutes from './routes/training';
import knowledgeBaseRoutes from './routes/knowledge-base';
import promptRoutes from './routes/prompt';
import usersRoutes from './routes/users';

const app = express();
const PORT = process.env.PORT || 3001;

// Global middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '2mb' }));

// Rate limiting on webhook
app.use('/api/webhook', webhookRateLimit);

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Routes
app.use(healthRoutes);
app.use(webhookRoutes);
app.use(leadsRoutes);
app.use(conversationsRoutes);
app.use(messagesRoutes);
app.use(activitiesRoutes);
app.use(trainingRoutes);
app.use(knowledgeBaseRoutes);
app.use(promptRoutes);
app.use(usersRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[SERVER] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[SERVER] AI Setter API running on port ${PORT}`);
  console.log(`[SERVER] Health check: http://localhost:${PORT}/api/health`);
});
