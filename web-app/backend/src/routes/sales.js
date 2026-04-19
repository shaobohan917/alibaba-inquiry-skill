import { Router } from 'express';
import { SalesService } from '../services/sales-service.js';
import { asyncHandler, pagination, requireFields } from './route-utils.js';

export function salesRoutes(repositories) {
  const router = Router();
  const sales = new SalesService(repositories);

  router.get(
    '/overview',
    asyncHandler((_req, res) => {
      res.json({ data: sales.getOverview() });
    }),
  );

  router.get(
    '/leads',
    asyncHandler((req, res) => {
      res.json({ data: sales.getLeads(pagination(req.query, 20)) });
    }),
  );

  router.post(
    '/reply-drafts',
    asyncHandler((req, res) => {
      requireFields(req.body, ['message']);
      res.status(201).json({ data: sales.createReplyDraft(req.body) });
    }),
  );

  router.post(
    '/follow-up-tasks',
    asyncHandler((req, res) => {
      requireFields(req.body, ['customerId']);
      res.status(201).json({ data: sales.createFollowUpTask(req.body) });
    }),
  );

  return router;
}
