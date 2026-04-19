import { BaseRepository } from './base-repository.js';

export class CustomerRepository extends BaseRepository {
  constructor(db) {
    super(db, 'customers', ['tags', 'metadata']);
  }

  search({ q, status, limit = 50, offset = 0 } = {}) {
    const where = [];
    const params = [];

    if (q) {
      where.push('(company_name LIKE ? OR contact_name LIKE ? OR email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (status) {
      where.push('status = ?');
      params.push(status);
    }

    const sql = `SELECT * FROM customers
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?`;

    return this.db
      .prepare(sql)
      .all(...params, limit, offset)
      .map((row) => this.deserialize(row));
  }
}
