/**
 * Retry-Utility für Gemini-API-Calls mit Exponential Backoff.
 *
 * Gemini Preview-Modelle (`gemini-3-flash-preview`, `gemini-3.1-flash-lite-preview`)
 * liefern regelmäßig 503 UNAVAILABLE oder 429 RESOURCE_EXHAUSTED bei Kapazitätsengpässen.
 * Diese Utility fängt solche transienten Fehler ab und wiederholt den Aufruf
 * mit wachsenden Wartezeiten (1 s, 2 s, 4 s).
 */

export interface RetryOptions {
  /** Maximale Anzahl Wiederholungen (default 3). */
  maxRetries?: number;
  /** Basis-Delay in ms (default 1000). Delays wachsen als baseDelay * 2^attempt. */
  baseDelayMs?: number;
  /** Callback, um dem UI einen Retry anzuzeigen. */
  onRetry?(attempt: number, error: Error): void;
}

/**
 * Prüft, ob ein Fehler als "transient" (retry-würdig) gilt.
 * Gemini signalisiert Kapazitätsprobleme über 503/UNAVAILABLE und 429/RESOURCE_EXHAUSTED.
 */
export function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toUpperCase();
  return (
    msg.includes('UNAVAILABLE') ||
    msg.includes('503') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('429') ||
    msg.includes('INTERNAL') ||
    msg.includes('DEADLINE_EXCEEDED')
  );
}

/**
 * Führt `fn` aus und wiederholt bei transienten Fehlern (503/429/INTERNAL) mit
 * Exponential Backoff. Nicht-transiente Fehler (400, 401, 403) werfen sofort.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, onRetry } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !isTransientError(err)) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt);
      onRetry?.(attempt + 1, err as Error);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // Unreachable, aber TS braucht es
  throw lastError;
}
