import { Router } from 'express';
import { asyncHandler, requireFields } from './route-utils.js';

export function settingRoutes(repositories) {
  const router = Router();
  const settings = repositories.settings;

  router.get(
    '/',
    asyncHandler((req, res) => {
      res.json({ data: settings.list({ category: req.query.category }) });
    }),
  );

  router.get(
    '/:key',
    asyncHandler((req, res) => {
      const setting = settings.findByKey(req.params.key);
      if (!setting) {
        return res.status(404).json({ error: { code: 'SETTING_NOT_FOUND', message: 'Setting not found' } });
      }
      return res.json({ data: setting });
    }),
  );

  router.put(
    '/:key',
    asyncHandler((req, res) => {
      requireFields(req.body, ['value']);
      res.json({
        data: settings.upsert(req.params.key, {
          value: req.body.value,
          category: req.body.category,
          description: req.body.description,
          is_secret: req.body.is_secret,
        }),
      });
    }),
  );

  router.delete(
    '/:key',
    asyncHandler((req, res) => {
      res.status(settings.delete(req.params.key) ? 204 : 404).send();
    }),
  );

  return router;
}
