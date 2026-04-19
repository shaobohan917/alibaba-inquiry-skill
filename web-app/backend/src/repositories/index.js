import { AdMetricRepository } from './ad-metric-repository.js';
import { CustomerRepository } from './customer-repository.js';
import { InquiryRepository } from './inquiry-repository.js';
import { SettingRepository } from './setting-repository.js';
import { TaskRepository } from './task-repository.js';

export function createRepositories(db) {
  return {
    adMetrics: new AdMetricRepository(db),
    customers: new CustomerRepository(db),
    inquiries: new InquiryRepository(db),
    settings: new SettingRepository(db),
    tasks: new TaskRepository(db),
  };
}
