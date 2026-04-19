import { Router } from 'express';
import { asyncHandler, pagination, parseBody, requireFields } from './route-utils.js';

const fields = [
  'id',
  'alibaba_inquiry_id',
  'customer_id',
  'subject',
  'product_name',
  'quantity',
  'target_price',
  'currency',
  'message',
  'ai_reply',
  'status',
  'priority',
  'received_at',
  'metadata',
];

export function inquiryRoutes(repositories) {
  const router = Router();
  const inquiries = repositories.inquiries;

  router.get(
    '/',
    asyncHandler((req, res) => {
      res.json({
        data: inquiries.search({
          customerId: req.query.customer_id,
          status: req.query.status,
          priority: req.query.priority,
          ...pagination(req.query),
        }),
      });
    }),
  );

  router.get(
    '/:id',
    asyncHandler((req, res) => {
      const inquiry = inquiries.findById(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ error: { code: 'INQUIRY_NOT_FOUND', message: 'Inquiry not found' } });
      }
      return res.json({ data: inquiry });
    }),
  );

  router.post(
    '/',
    asyncHandler((req, res) => {
      requireFields(req.body, ['customer_id', 'subject', 'message']);
      res.status(201).json({ data: inquiries.create(parseBody(req.body, fields)) });
    }),
  );

  router.patch(
    '/:id',
    asyncHandler((req, res) => {
      const inquiry = inquiries.update(req.params.id, parseBody(req.body, fields));
      if (!inquiry) {
        return res.status(404).json({ error: { code: 'INQUIRY_NOT_FOUND', message: 'Inquiry not found' } });
      }
      return res.json({ data: inquiry });
    }),
  );

  router.delete(
    '/:id',
    asyncHandler((req, res) => {
      res.status(inquiries.delete(req.params.id) ? 204 : 404).send();
    }),
  );

  return router;
}
