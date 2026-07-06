import type { AuthTokens, ErrorResponse, HealthResponse } from '@samishan11/moto-contract';
import { API_URL } from './config';

/**
 * Access token lives in memory only — never persisted. The refresh token is the
 * single persisted secret (see auth/storage.ts). On a cold start the access
 * token is null, the first authed request 401s, and `apiFetch` transparently
 * refreshes using the stored refresh token.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Current in-memory access token (used by the Socket.IO client for its handshake). */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * The auth layer registers this bridge so the API client can refresh tokens and
 * report session expiry without importing the React context (avoids a cycle).
 */
export interface AuthBridge {
  getRefreshToken(): Promise<string | null>;
  /** Called after a successful refresh so the rotated refresh token is persisted. */
  onTokensRefreshed(tokens: AuthTokens): Promise<void>;
  /** Called when refresh is impossible/rejected — the user must re-authenticate. */
  onSessionExpired(): Promise<void>;
}

let bridge: AuthBridge | null = null;

export function configureAuthBridge(b: AuthBridge | null): void {
  bridge = b;
}

/** Normalized API error carrying the contract's error envelope for i18n. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly messageKey: string,
    message?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message ?? code);
    this.name = 'ApiError';
  }
}

/** Single-flight refresh: concurrent 401s share one refresh round-trip. */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!bridge) {
    console.warn('[apiClient] No auth bridge configured, cannot refresh');
    return null;
  }
  if (!refreshInFlight) {
    refreshInFlight = (async (): Promise<string | null> => {
      try {
        const refreshToken = await bridge!.getRefreshToken();
        if (!refreshToken) {
          console.warn('[apiClient] No refresh token available');
          await bridge!.onSessionExpired();
          return null;
        }
        console.log('[apiClient] Attempting refresh with token');
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          console.warn('[apiClient] Refresh failed with status', res.status);
          // Refresh rejected (expired / reuse-detected / revoked) → sign out.
          await bridge!.onSessionExpired();
          return null;
        }
        const tokens = (await res.json()) as AuthTokens;
        console.log('[apiClient] Refresh successful');
        setAccessToken(tokens.accessToken);
        await bridge!.onTokensRefreshed(tokens);
        return tokens.accessToken;
      } catch (error) {
        console.error('[apiClient] Refresh error:', error instanceof Error ? error.message : error);
        await bridge!.onSessionExpired();
        return null;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Force an access-token refresh outside the fetch path — used by the socket
 * layer when a handshake is rejected. Shares the single-flight refresh, so
 * concurrent socket retries and 401ing requests cause one round-trip.
 */
export function refreshAccessTokenNow(): Promise<string | null> {
  return refreshAccessToken();
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Attach the access token and auto-refresh on 401. */
  auth?: boolean;
  /** Internal: prevents infinite refresh→retry loops. */
  _retried?: boolean;
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = opts;

  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth && accessToken) headers.authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !opts._retried) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, { ...opts, _retried: true });
    }
  }

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;

  if (!res.ok) {
    const err = data as ErrorResponse | undefined;
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN',
      err?.messageKey ?? 'errors.unknown',
      err?.message,
      err?.details,
    );
  }

  return data as T;
}

/**
 * Proves the shared-contract pipeline end-to-end: the response is typed by
 * @samishan11/moto-contract, the same source the API validates against. No duplicated types.
 */
export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health/ready');
}
