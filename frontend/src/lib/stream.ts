/**
 * SSE (Server-Sent Events) consumer for POST-based streaming endpoints.
 *
 * Uses fetch + ReadableStream instead of EventSource because EventSource
 * doesn't support POST requests or custom Authorization headers.
 *
 * Usage:
 *   const result = await consumeSSE('/insights/generate/stream', {
 *     method: 'POST',
 *     body: JSON.stringify({ product_id: 'MX_IND' }),
 *     onToken: (text) => setBuffer(prev => prev + text),
 *     onStatus: (msg) => setStatus(msg),
 *     onResult: (data) => setResult(data),
 *     onError: (msg) => setError(msg),
 *   });
 */

import { getApiBaseUrl } from './api';

export interface SSECallbacks<T = Record<string, unknown>> {
  /** Called when the stream starts (before first event). */
  onStart?: () => void;
  /** Called for each 'status' event. */
  onStatus?: (message: string) => void;
  /** Called for each 'token' event with the incremental text. */
  onToken?: (text: string) => void;
  /** Called once when the final 'result' event arrives with parsed JSON. */
  onResult?: (data: T) => void;
  /** Called for 'error' events. */
  onError?: (message: string) => void;
  /** Called once when the 'done' event arrives (always fires, even on error). */
  onDone?: (meta?: { elapsed_ms?: number }) => void;
}

export interface SSEResult<T = Record<string, unknown>> {
  ok: boolean;
  result?: T;
  error?: string;
  elapsed_ms?: number;
}

/**
 * Consume a POST-based SSE stream from the backend.
 *
 * @param endpoint - API path (e.g. '/insights/generate/stream')
 * @param options  - fetch options (method, body, headers) + SSECallbacks
 * @returns        - Promise that resolves with the final result or error
 */
export async function consumeSSE<T = Record<string, unknown>>(
  endpoint: string,
  options: RequestInit & { callbacks?: SSECallbacks<T> } = {},
): Promise<SSEResult<T>> {
  const { callbacks, ...fetchOptions } = options;
  const { onStart, onToken, onStatus, onResult, onError, onDone } = callbacks ?? {};

  // Get Clerk JWT token
  let token: string | null = null;
  // @ts-ignore - window.Clerk is injected by ClerkProvider
  if (window.Clerk?.session) {
    try {
      // @ts-ignore
      token = await window.Clerk.session.getToken();
    } catch {
      // Proceed without token
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  onStart?.();

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...fetchOptions,
      headers,
    });
  } catch (err) {
    const msg = `Network error: ${err instanceof Error ? err.message : String(err)}`;
    onError?.(msg);
    onDone?.();
    return { ok: false, error: msg };
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    const msg = `HTTP ${response.status}: ${errBody || response.statusText}`;
    onError?.(msg);
    onDone?.();
    return { ok: false, error: msg };
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError?.('Response body is not readable');
    onDone?.();
    return { ok: false, error: 'Response body is not readable' };
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: T | undefined;
  let finalError: string | undefined;
  let elapsedMs: number | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events (separated by double newline)
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? ''; // Keep incomplete last chunk

      for (const raw of events) {
        if (!raw.trim()) continue;

        let eventType = '';
        let eventData = '';

        for (const line of raw.split('\n')) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6);
          }
        }

        if (!eventType || !eventData) continue;

        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(eventData);
        } catch {
          // If JSON parse fails, wrap raw text
          parsed = { text: eventData };
        }

        switch (eventType) {
          case 'status':
            onStatus?.((parsed.message as string) ?? '');
            break;
          case 'token':
            onToken?.((parsed.text as string) ?? '');
            break;
          case 'result':
            finalResult = parsed as T;
            onResult?.(finalResult);
            break;
          case 'error':
            finalError = (parsed.message as string) ?? 'Unknown error';
            onError?.(finalError);
            break;
          case 'done':
            elapsedMs = (parsed.elapsed_ms as number) ?? undefined;
            break;
        }
      }
    }
  } catch (err) {
    const msg = `Stream read error: ${err instanceof Error ? err.message : String(err)}`;
    finalError = msg;
    onError?.(msg);
  } finally {
    reader.releaseLock();
  }

  onDone?.({ elapsed_ms: elapsedMs });

  return {
    ok: !finalError,
    result: finalResult,
    error: finalError,
    elapsed_ms: elapsedMs,
  };
}
