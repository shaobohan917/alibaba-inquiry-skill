import { BaseRepository } from './base-repository.js';

export class InquiryRepository extends BaseRepository {
  constructor(db) {
    super(db, 'inquiries', ['metadata']);
  }

  search({ customerId, status, priority, limit = 50, offset = 0 } = {}) {
    const where = [];
    const params = [];

    if (customerId) {
      where.push('customer_id = ?');
      params.push(customerId);
    }

    if (status) {
      where.push('status = ?');
      params.push(status);
    }

    if (priority) {
      where.push('priority = ?');
      params.push(priority);
    }

    const sql = `SELECT * FROM inquiries
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?`;

    return this.db
      .prepare(sql)
      .all(...params, limit, offset)
      .map((row) => this.deserialize(row));
  }
}
