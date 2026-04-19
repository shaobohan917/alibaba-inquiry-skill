import { Router } from 'express';
import { asyncHandler, pagination, parseBody, requireFields } from './route-utils.js';

const fields = [
  'id',
  'title',
  'description',
  'type',
  'status',
  'priority',
  'assigned_agent',
  'related_customer_id',
  'related_inquiry_id',
  'due_at',
  'completed_at',
  'metadata',
];

export function taskRoutes(repositories) {
  const router = Router();
  const tasks = repositories.tasks;

  router.get(
    '/',
    asyncHandler((req, res) => {
      res.json({
        data: tasks.search({
          status: req.query.status,
          assignedAgent: req.query.assigned_agent,
          type: req.query.type,
          ...pagination(req.query),
        }),
      });
    }),
  );

  router.get(
    '/:id',
    asyncHandler((req, res) => {
      const task = tasks.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } });
      }
      return res.json({ data: task });
    }),
  );

  router.post(
    '/',
    asyncHandler((req, res) => {
      requireFields(req.body, ['title']);
      res.status(201).json({ data: tasks.create(parseBody(req.body, fields)) });
    }),
  );

  router.patch(
    '/:id',
    asyncHandler((req, res) => {
      const task = tasks.update(req.params.id, parseBody(req.body, fields));
      if (!task) {
        return res.status(404).json({ error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } });
      }
      return res.json({ data: task });
    }),
  );

  router.post(
    '/:id/complete',
    asyncHandler((req, res) => {
      const task = tasks.markCompleted(req.params.id);
      if (!task) {
        return res.status(404).json({ error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } });
      }
      return res.json({ data: task });
    }),
  );

  router.delete(
    '/:id',
    asyncHandler((req, res) => {
      res.status(tasks.delete(req.params.id) ? 204 : 404).send();
    }),
  );

  return router;
}
