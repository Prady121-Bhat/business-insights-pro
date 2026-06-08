import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';

import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase } from './config/database';
import { globalRateLimiter } from './middleware/rateLimiter.middleware';
import { sanitizeInput, trimStrings } from './middleware/sanitize.middleware';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler.middleware';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import companiesRoutes from './modules/companies/companies.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import customersRoutes from './modules/customers/customers.routes';
import productsRoutes from './modules/products/products.routes';
import forecastingRoutes from './modules/forecasting/forecasting.routes';
import insightsRoutes from './modules/insights/insights.routes';
import reportsRoutes from './modules/reports/reports.routes';
import importsRoutes from './modules/imports/imports.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import settingsRoutes from './modules/settings/settings.routes';
import salesRoutes from './modules/sales/sales.routes';
import expensesRoutes from './modules/expenses/expenses.routes';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

app.use(cors({
  origin: env.isProd ? env.CLIENT_URL : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Id'],
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);
app.use(trimStrings);
app.use(globalRateLimiter);

if (!env.isProd) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/company', companiesRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/customers', customersRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/forecasting', forecastingRoutes);
app.use('/api/v1/insights', insightsRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/imports', importsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/expenses', expensesRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

const start = async (): Promise<void> => {
  await connectDatabase();

  const { schedulerService } = await import('./services/scheduler.service');
  schedulerService.start();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    schedulerService.stop();
    server.close(async () => {
      const { disconnectDatabase } = await import('./config/database');
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err: Error) => {
    logger.error('Unhandled rejection', { error: err.message });
    shutdown('unhandledRejection');
  });
};

start();

export { app };
