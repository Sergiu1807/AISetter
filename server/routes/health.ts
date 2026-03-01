import { Router } from 'express';

const router = Router();

router.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AI Appointment Setter',
    version: '1.0.0',
    runtime: 'railway',
  });
});

export default router;
