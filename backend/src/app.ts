import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { createDatabase } from './db/database';
import { createAudienceRouter } from './routes/audienceRoutes';

export function createApp(db?: Database.Database): Express {
  const database = db ?? createDatabase();
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Local diagnostic logging without leaking request payloads or audience membership
  if (process.env.NODE_ENV !== 'test') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - start}ms)`);
      });
      next();
    });
  }

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/v1/audiences', createAudienceRouter(database));

  // Centralized error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Malformed JSON payload',
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected internal error occurred',
      },
    });
  });

  return app;
}

export default createApp();
