import { apiFetch } from './api';
import { ragQuery } from './knowledgeApi';

/**
 * WebMCP client module for SupplyMind.
 *
 * WebMCP is a client-side JavaScript API — a page registers tools that a
 * browser-embedded model can call through `navigator.modelContext` /
 * `ModelContext.registerTool()`. This module exposes the four SupplyMind
 * capabilities (see .well-known/agent-card.json) as WebMCP tools backed by
 * the real backend API.
 *
 * Honest-capability note: SupplyMind does NOT expose a remote MCP server
 * (no /mcp endpoints exist). WebMCP is the only machine-interface available,
 * and it only works when the page is loaded in a WebMCP-capable browser
 * context. Tools make authenticated calls via the existing apiFetch layer.
 */

interface WebMCPContext {
  registerTool(tool: unknown): void;
}

type RegisterToolHandler = (tool: unknown) => void;

interface ContextError {
  code: string;
  message: string;
}

interface ToolCall {
  input: Record<string, unknown>;
  signal?: AbortSignal;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (call: ToolCall) => Promise<unknown>;
}

declare global {
  interface Navigator {
    modelContext?: WebMCPContext;
  }
  interface Window {
    ModelContext?: { registerTool?: RegisterToolHandler };
  }
}

/**
 * Resolve the active WebMCP registration surface. Returns null when the page
 * is not running in a WebMCP-capable context.
 */
function resolveWebMCP(): WebMCPContext | null {
  if (typeof navigator !== 'undefined' && navigator.modelContext) {
    return navigator.modelContext;
  }
  if (
    typeof window !== 'undefined' &&
    window.ModelContext &&
    typeof window.ModelContext.registerTool === 'function'
  ) {
    return {
      registerTool: (tool) => window.ModelContext!.registerTool!(tool),
    };
  }
  return null;
}

function asString(input: Record<string, unknown>, key: string): string | undefined {
  const v = input[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function asNumber(input: Record<string, unknown>, key: string, fallback?: number): number | undefined {
  const v = input[key];
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function toError(err: unknown): ContextError {
  if (err instanceof Error) return { code: 'TOOL_ERROR', message: err.message };
  return { code: 'TOOL_ERROR', message: 'Unknown tool error' };
}

const TOOLS: ToolDefinition[] = [
  {
    name: 'rag-query',
    description:
      'Answer a question grounded in the SupplyMind knowledge base (products, forecasting, platform operations). Returns the answer with cited sources.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to answer' },
        product_id: { type: 'string', description: 'Optional product SKU to scope the query' },
      },
      required: ['question'],
    },
    handler: async ({ input }) => {
      const question = asString(input, 'question');
      if (!question) throw new Error('question is required');
      const response = await ragQuery({
        question,
        product_id: asString(input, 'product_id'),
      });
      return {
        answer: response.answer,
        grounded: response.grounded ?? false,
        sources: response.sources ?? [],
      };
    },
  },
  {
    name: 'forecast',
    description:
      'Generate a demand forecast for a product SKU over a horizon in days. Returns monthly summary and forecast points.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product SKU to forecast' },
        horizon_days: { type: 'integer', description: 'Forecast horizon in days (default 90)' },
      },
      required: ['product_id'],
    },
    handler: async ({ input }) => {
      const product_id = asString(input, 'product_id');
      if (!product_id) throw new Error('product_id is required');
      return apiFetch('/forecast/predict', {
        method: 'POST',
        body: JSON.stringify({
          product_id,
          horizon_days: asNumber(input, 'horizon_days', 90),
        }),
      });
    },
  },
  {
    name: 'inventory-optimization',
    description:
      'Fetch inventory optimization recommendations: reorder points, safety stock, ABC/XYZ classification. Optional limit.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'Maximum number of recommendations (default 13)' },
      },
    },
    handler: async ({ input }) => {
      const limit = asNumber(input, 'limit', 13);
      return apiFetch(`/inventory/optimize?limit=${encodeURIComponent(limit)}`);
    },
  },
  {
    name: 'executive-insights',
    description:
      'Generate AI executive insights for a product SKU: executive summary, insights with impact/confidence, and recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product SKU to analyze' },
      },
      required: ['product_id'],
    },
    handler: async ({ input }) => {
      const product_id = asString(input, 'product_id');
      if (!product_id) throw new Error('product_id is required');
      return apiFetch('/insights/generate', {
        method: 'POST',
        body: JSON.stringify({ product_id }),
      });
    },
  },
];

let _registered = false;

/**
 * Register SupplyMind WebMCP tools. Safe to call more than once (idempotent)
 * and silently no-ops when the page is not in a WebMCP-capable context.
 * Returns the number of tools registered, or 0 when unavailable.
 */
export function initWebMCP(): number {
  const mcp = resolveWebMCP();
  if (!mcp || _registered) return _registered ? TOOLS.length : 0;

  try {
    for (const tool of TOOLS) {
      mcp.registerTool({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        handler: (call: ToolCall) => {
          const input = call?.input ?? {};
          return Promise.resolve()
            .then(() => tool.handler({ input, signal: call?.signal }))
            .catch((err) => {
              const e = toError(err);
              throw Object.assign(new Error(e.message), e);
            });
        },
      });
    }
    _registered = true;
    return TOOLS.length;
  } catch {
    return 0;
  }
}
