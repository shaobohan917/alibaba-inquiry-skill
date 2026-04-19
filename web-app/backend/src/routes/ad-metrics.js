import { Router } from 'express';
import { asyncHandler, pagination, parseBody, requireFields } from './route-utils.js';

const fields = [
  'id',
  'metric_date',
  'campaign_id',
  'campaign_name',
  'product_id',
  'impressions',
  'clicks',
  'spend',
  'currency',
  'inquiries',
  'orders',
  'revenue',
  'ctr',
  'cpc',
  'conversion_rate',
  'metadata',
];

export function adMetricRoutes(repositories) {
  const router = Router();
  const adMetrics = repositories.adMetrics;

  router.get(
    '/',
    asyncHandler((req, res) => {
      res.json({
        data: adMetrics.search({
          from: req.query.from,
          to: req.query.to,
          campaignId: req.query.campaign_id,
          ...pagination(req.query, 100),
        }),
      });
    }),
  );

  router.get(
    '/summary',
    asyncHandler((req, res) => {
      res.json({ data: adMetrics.summary({ from: req.query.from, to: req.query.to }) });
    }),
  );

  router.get(
    '/:id',
    asyncHandler((req, res) => {
      const metric = adMetrics.findById(req.params.id);
      if (!metric) {
        return res.status(404).json({ error: { code: 'AD_METRIC_NOT_FOUND', message: 'Ad metric not found' } });
      }
      return res.json({ data: metric });
    }),
  );

  router.post(
    '/',
    asyncHandler((req, res) => {
      requireFields(req.body, ['metric_date', 'campaign_id', 'campaign_name']);
      res.status(201).json({ data: adMetrics.create(parseBody(req.body, fields)) });
    }),
  );

  router.patch(
    '/:id',
    asyncHandler((req, res) => {
      const metric = adMetrics.update(req.params.id, parseBody(req.body, fields));
      if (!metric) {
        return res.status(404).json({ error: { code: 'AD_METRIC_NOT_FOUND', message: 'Ad metric not found' } });
      }
      return res.json({ data: metric });
    }),
  );

  router.delete(
    '/:id',
    asyncHandler((req, res) => {
      res.status(adMetrics.delete(req.params.id) ? 204 : 404).send();
    }),
  );

  return router;
}
