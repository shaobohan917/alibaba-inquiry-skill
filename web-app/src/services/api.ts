const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');

type QueryValue = string | number | boolean | null | undefined;

interface ApiEnvelope<T> {
  data: T;
}

interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
  };
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const payload = await parseJson<ApiErrorEnvelope>(response);
    throw new ApiError(payload?.error?.message ?? `API request failed with status ${response.status}`, response.status, payload?.error?.code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await parseJson<ApiEnvelope<T>>(response);
  if (!payload) {
    throw new ApiError('API response did not include a JSON body', response.status);
  }
  return payload.data;
}

export function buildQuery(params: Record<string, QueryValue> = {}) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text) as T;
}
