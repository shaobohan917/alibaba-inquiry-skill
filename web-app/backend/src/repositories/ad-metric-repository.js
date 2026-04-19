import { BaseRepository } from './base-repository.js';

export class AdMetricRepository extends BaseRepository {
  constructor(db) {
    super(db, 'ad_metrics', ['metadata']);
  }

  create(payload) {
    return super.create(this.withCalculatedMetrics(payload));
  }

  update(id, payload) {
    const current = this.findById(id);
    if (!current) {
      return null;
    }

    return super.update(id, this.withCalculatedMetrics({ ...current, ...payload }));
  }

  search({ from, to, campaignId, limit = 100, offset = 0 } = {}) {
    const where = [];
    const params = [];

    if (from) {
      where.push('metric_date >= ?');
      params.push(from);
    }

    if (to) {
      where.push('metric_date <= ?');
      params.push(to);
    }

    if (campaignId) {
      where.push('campaign_id = ?');
      params.push(campaignId);
    }

    const sql = `SELECT * FROM ad_metrics
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY metric_date DESC, campaign_name ASC
      LIMIT ? OFFSET ?`;

    return this.db
      .prepare(sql)
      .all(...params, limit, offset)
      .map((row) => this.deserialize(row));
  }

  summary({ from, to } = {}) {
    const where = [];
    const params = [];

    if (from) {
      where.push('metric_date >= ?');
      params.push(from);
    }

    if (to) {
      where.push('metric_date <= ?');
      params.push(to);
    }

    const row = this.db
      .prepare(
        `SELECT
          COALESCE(SUM(impressions), 0) AS impressions,
          COALESCE(SUM(clicks), 0) AS clicks,
          COALESCE(SUM(spend), 0) AS spend,
          COALESCE(SUM(inquiries), 0) AS inquiries,
          COALESCE(SUM(orders), 0) AS orders,
          COALESCE(SUM(revenue), 0) AS revenue
        FROM ad_metrics
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
      )
      .get(...params);

    return this.withCalculatedMetrics(row);
  }

  withCalculatedMetrics(payload) {
    const data = { ...payload };
    const impressions = Number(data.impressions ?? 0);
    const clicks = Number(data.clicks ?? 0);
    const spend = Number(data.spend ?? 0);
    const inquiries = Number(data.inquiries ?? 0);

    if ('impressions' in data || 'clicks' in data) {
      data.ctr = impressions > 0 ? clicks / impressions : 0;
    }

    if ('spend' in data || 'clicks' in data) {
      data.cpc = clicks > 0 ? spend / clicks : 0;
    }

    if ('inquiries' in data || 'clicks' in data) {
      data.conversion_rate = clicks > 0 ? inquiries / clicks : 0;
    }

    return data;
  }
}
