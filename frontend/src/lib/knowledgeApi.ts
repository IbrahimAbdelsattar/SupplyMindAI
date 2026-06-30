import { apiFetch } from './api';

export interface RagQueryPayload {
  question: string;
  source_type?: string;
  product_id?: string;
  include_operational_context?: boolean;
}

export interface CopilotChatPayload {
  message: string;
  session_id?: string;
  product_id?: string;
  mode?: 'business' | 'technical';
}

export interface SearchPayload {
  query: string;
  source_type?: string;
  product_id?: string;
  match_count?: number;
}

export interface IngestPayload {
  title: string;
  content: string;
  source_type?: 'forecast' | 'inventory' | 'insight' | 'report' | 'mlops' | 'incident' | 'recommendation' | 'general';
  source_id?: string;
  metadata?: Record<string, unknown>;
}

export interface RagResponse {
  answer: string;
  grounded?: boolean;
  sources?: unknown[];
  [key: string]: unknown;
}

export interface CopilotResponse {
  answer: string;
  session_id?: string | null;
  grounded?: boolean;
  sources?: unknown[];
  [key: string]: unknown;
}

type KnowledgeResponse = Record<string, unknown>;

export async function ragQuery(payload: RagQueryPayload) {
  return apiFetch<RagResponse>('/rag/query', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function copilotChat(payload: CopilotChatPayload) {
  return apiFetch<CopilotResponse>('/copilot/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function searchKnowledge(payload: SearchPayload) {
  return apiFetch<KnowledgeResponse>('/knowledge/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function ingestKnowledge(payload: IngestPayload) {
  return apiFetch<KnowledgeResponse>('/knowledge/ingest', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
