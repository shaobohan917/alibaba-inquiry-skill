import { Router } from 'express';
import { asyncHandler, pagination, parseBody, requireFields } from './route-utils.js';

const fields = [
  'id',
  'alibaba_member_id',
  'company_name',
  'contact_name',
  'email',
  'phone',
  'country',
  'source',
  'status',
  'tags',
  'last_contacted_at',
  'metadata',
];

export function customerRoutes(repositories) {
  const router = Router();
  const customers = repositories.customers;

  router.get(
    '/',
    asyncHandler((req, res) => {
      res.json({
        data: customers.search({
          q: req.query.q,
          status: req.query.status,
          ...pagination(req.query),
        }),
      });
    }),
  );

  router.get(
    '/:id',
    asyncHandler((req, res) => {
      const customer = customers.findById(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' } });
      }
      return res.json({ data: customer });
    }),
  );

  router.post(
    '/',
    asyncHandler((req, res) => {
      requireFields(req.body, ['company_name']);
      res.status(201).json({ data: customers.create(parseBody(req.body, fields)) });
    }),
  );

  router.patch(
    '/:id',
    asyncHandler((req, res) => {
      const customer = customers.update(req.params.id, parseBody(req.body, fields));
      if (!customer) {
        return res.status(404).json({ error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' } });
      }
      return res.json({ data: customer });
    }),
  );

  router.delete(
    '/:id',
    asyncHandler((req, res) => {
      res.status(customers.delete(req.params.id) ? 204 : 404).send();
    }),
  );

  return router;
}
