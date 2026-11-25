import http from 'http';
import app from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { eventBus } from './events/eventBus';

let server: http.Server | null = null;

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();

    server = app.listen(env.PORT, () => {
      logger.info(`Helpdesk API listening on port ${env.PORT} (${env.NODE_ENV})`);
      logger.info(`Swagger docs available at http://localhost:${env.PORT}/api/docs`);
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Received shutdown signal, closing gracefully...');

  if (server) {
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
  }

  await eventBus.flush();
  await disconnectDatabase();
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void bootstrap();
