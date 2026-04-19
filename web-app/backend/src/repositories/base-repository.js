import { randomUUID } from 'node:crypto';

export class BaseRepository {
  constructor(db, tableName, jsonFields = []) {
    this.db = db;
    this.tableName = tableName;
    this.jsonFields = jsonFields;
  }

  list({ limit = 50, offset = 0, orderBy = 'created_at', order = 'DESC' } = {}) {
    const safeOrderBy = this.safeColumn(orderBy);
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const rows = this.db
      .prepare(`SELECT * FROM ${this.tableName} ORDER BY ${safeOrderBy} ${safeOrder} LIMIT ? OFFSET ?`)
      .all(limit, offset);
    return rows.map((row) => this.deserialize(row));
  }

  findById(id) {
    const row = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
    return row ? this.deserialize(row) : null;
  }

  create(payload) {
    const data = this.serialize({ id: payload.id ?? randomUUID(), ...payload });
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    this.db.prepare(sql).run(columns.map((column) => data[column]));
    return this.findById(data.id);
  }

  update(id, payload) {
    const data = this.serialize(payload);
    const columns = Object.keys(data).filter((column) => column !== 'id');

    if (columns.length === 0) {
      return this.findById(id);
    }

    const assignments = columns.map((column) => `${column} = ?`).join(', ');
    const result = this.db
      .prepare(`UPDATE ${this.tableName} SET ${assignments} WHERE id = ?`)
      .run([...columns.map((column) => data[column]), id]);

    return result.changes > 0 ? this.findById(id) : null;
  }

  delete(id) {
    const result = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  serialize(payload) {
    const data = { ...payload };
    for (const field of this.jsonFields) {
      if (field in data && data[field] !== undefined) {
        data[field] = JSON.stringify(data[field] ?? (field === 'tags' ? [] : {}));
      }
    }
    return data;
  }

  deserialize(row) {
    const data = { ...row };
    for (const field of this.jsonFields) {
      if (typeof data[field] === 'string') {
        data[field] = JSON.parse(data[field]);
      }
    }
    return data;
  }

  safeColumn(column) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
      throw new Error(`Unsafe column name: ${column}`);
    }
    return column;
  }
}
