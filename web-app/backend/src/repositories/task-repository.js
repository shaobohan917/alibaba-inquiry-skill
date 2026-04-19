import { BaseRepository } from './base-repository.js';

export class TaskRepository extends BaseRepository {
  constructor(db) {
    super(db, 'tasks', ['metadata']);
  }

  search({ status, assignedAgent, type, limit = 50, offset = 0 } = {}) {
    const where = [];
    const params = [];

    if (status) {
      where.push('status = ?');
      params.push(status);
    }

    if (assignedAgent) {
      where.push('assigned_agent = ?');
      params.push(assignedAgent);
    }

    if (type) {
      where.push('type = ?');
      params.push(type);
    }

    const sql = `SELECT * FROM tasks
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        COALESCE(due_at, created_at) ASC
      LIMIT ? OFFSET ?`;

    return this.db
      .prepare(sql)
      .all(...params, limit, offset)
      .map((row) => this.deserialize(row));
  }

  markCompleted(id) {
    return this.update(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  }
}
