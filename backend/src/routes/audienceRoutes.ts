import { Router, Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';
import { audiencePreviewSchema } from '../validation/audienceSchema';
import { evaluateAudience } from '../evaluator/audienceEvaluator';

export function createAudienceRouter(db: Database.Database): Router {
  const router = Router();

  router.post('/preview', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parseResult = audiencePreviewSchema.safeParse(req.body);
      if (!parseResult.success) {
        const firstIssue = parseResult.error.issues[0];
        const message =
          firstIssue.path.length > 0
            ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
            : firstIssue.message;

        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message,
          },
        });
        return;
      }

      const { name, asOf, conditions } = parseResult.data;
      const evaluation = evaluateAudience(db, { asOf, conditions });

      res.status(200).json({
        name,
        asOf,
        total: evaluation.total,
        members: evaluation.members,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
