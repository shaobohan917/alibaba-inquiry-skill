export class SettingRepository {
  constructor(db) {
    this.db = db;
  }

  list({ category } = {}) {
    const rows = category
      ? this.db.prepare('SELECT * FROM settings WHERE category = ? ORDER BY key ASC').all(category)
      : this.db.prepare('SELECT * FROM settings ORDER BY category ASC, key ASC').all();

    return rows.map((row) => this.deserialize(row));
  }

  findByKey(key) {
    const row = this.db.prepare('SELECT * FROM settings WHERE key = ?').get(key);
    return row ? this.deserialize(row) : null;
  }

  upsert(key, payload) {
    const value = JSON.stringify(payload.value);
    this.db
      .prepare(
        `INSERT INTO settings (key, value, category, description, is_secret)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          category = excluded.category,
          description = excluded.description,
          is_secret = excluded.is_secret`,
      )
      .run(
        key,
        value,
        payload.category ?? 'general',
        payload.description ?? null,
        payload.is_secret ? 1 : 0,
      );

    return this.findByKey(key);
  }

  delete(key) {
    const result = this.db.prepare('DELETE FROM settings WHERE key = ?').run(key);
    return result.changes > 0;
  }

  deserialize(row) {
    return {
      ...row,
      value: JSON.parse(row.value),
      is_secret: Boolean(row.is_secret),
    };
  }
}
