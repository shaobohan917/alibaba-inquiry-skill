import { apiRequest, buildQuery } from './api';
import { invoke } from '@tauri-apps/api/core';

export interface SalesOverview {
  inquiryCount: number;
  newInquiryCount: number;
  urgentInquiryCount: number;
  highIntentCustomerCount: number;
  followUpTaskCount: number;
  customerCount: number;
}

export interface SalesLead {
  id: string;
  customer: string;
  contactName?: string;
  country?: string;
  intent: '高' | '中' | '低';
  score: number;
  action: string;
  status: string;
  priority: string;
  inquiryCount: number;
  lastContactedAt?: string;
  latestInquiryAt?: string;
}

export interface ReplyDraftRequest {
  message: string;
  customerName?: string;
  productName?: string;
  quantity?: string;
  targetPrice?: string;
  currency?: string;
}

export interface ReplyDraft {
  reply: string;
  intent: '高' | '中' | '低';
  intentScore: number;
  strategy: string;
  nextActions: string[];
  generatedAt: string;
}

export const salesService = {
  getOverview() {
    if (isTauriRuntime()) {
      return invoke<SalesOverview>('get_sales_overview');
    }

    return apiRequest<SalesOverview>('/api/sales/overview');
  },

  getLeads(limit = 20) {
    if (isTauriRuntime()) {
      return invoke<SalesLead[]>('get_sales_leads', { limit });
    }

    return apiRequest<SalesLead[]>(`/api/sales/leads${buildQuery({ limit })}`);
  },

  createReplyDraft(payload: ReplyDraftRequest) {
    if (isTauriRuntime()) {
      return invoke<ReplyDraft>('create_reply_draft', { payload });
    }

    return apiRequest<ReplyDraft>('/api/sales/reply-drafts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
